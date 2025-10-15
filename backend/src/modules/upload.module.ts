import { Module } from '@nestjs/common';
import { UploadController } from '@presentation/http/controllers/upload.controller';

@Module({
  controllers: [UploadController],
})
export class UploadModule {}
