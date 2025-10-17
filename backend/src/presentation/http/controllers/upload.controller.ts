import { Controller, Post, UseGuards, HttpException, HttpStatus, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiConsumes, ApiBearerAuth } from '@nestjs/swagger';
import { extname, join } from 'path';
import { existsSync, mkdirSync, createWriteStream } from 'fs';
import { pipeline } from 'stream/promises';
import type { FastifyRequest } from 'fastify';
import type { MultipartFile } from '@fastify/multipart';
import { JwtAuthGuard } from '@shared/guards/jwt-auth.guard';
import { RolesGuard } from '@shared/guards/roles.guard';
import { Roles } from '@shared/decorators/roles.decorator';
import { UserRole } from '@shared/constants/user-roles.constant';

// Ensure upload directory exists
const uploadDir = join(process.cwd(), 'uploads', 'products');
if (!existsSync(uploadDir)) {
  mkdirSync(uploadDir, { recursive: true });
}

const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

@ApiTags('Upload')
@Controller('upload')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class UploadController {
  @Post('product-image')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Upload product image (Admin only)' })
  @ApiConsumes('multipart/form-data')
  @ApiResponse({ status: 201, description: 'Image uploaded successfully' })
  async uploadProductImage(@Req() req: FastifyRequest) {
    const reqWithMultipart = req as FastifyRequest & { isMultipart?: () => boolean; file?: () => Promise<MultipartFile | undefined> };
    
    if (!reqWithMultipart.isMultipart || !reqWithMultipart.isMultipart()) {
      throw new HttpException('Request is not multipart', HttpStatus.BAD_REQUEST);
    }

    const file = await reqWithMultipart.file?.();

    if (!file) {
      throw new HttpException('No file uploaded', HttpStatus.BAD_REQUEST);
    }

    const stream = file.file;

    if (!allowedMimes.includes(file.mimetype)) {
      stream.resume();
      throw new HttpException(
        `Invalid file type. Only ${allowedMimes.join(', ')} are allowed`,
        HttpStatus.BAD_REQUEST,
      );
    }

    if ((stream as any).truncated) {
      stream.resume();
      throw new HttpException('File too large. Max size: 5MB', HttpStatus.BAD_REQUEST);
    }

    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const rawExt = extname(file.filename || '');
    const fallbackExt = file.mimetype ? `.${file.mimetype.split('/').pop()}` : '';
    const extension = rawExt || fallbackExt || '.jpg';
    const filename = `product-${uniqueSuffix}${extension}`;
    const filePath = join(uploadDir, filename);

    let uploadedSize = 0;
    stream.on('data', (chunk: Buffer) => {
      uploadedSize += chunk.length;
    });

    try {
      await pipeline(stream, createWriteStream(filePath));
    } catch (error) {
      console.error('Failed to store uploaded file:', error);
      throw new HttpException('Failed to save uploaded file', HttpStatus.INTERNAL_SERVER_ERROR);
    }

    // Return relative path that can be served
    const imageUrl = `/uploads/products/${filename}`;

    return {
      message: 'Image uploaded successfully',
      filename,
      originalName: file.filename,
      size: uploadedSize,
      mimeType: file.mimetype,
      url: imageUrl,
    };
  }
}
