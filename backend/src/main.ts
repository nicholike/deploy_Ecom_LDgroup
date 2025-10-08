import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  console.log('🔧 Starting bootstrap...');
  
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter(),
  );
  
  console.log('✅ App created');

  // Global prefix
  const apiPrefix = process.env.API_PREFIX || '/api/v1';
  app.setGlobalPrefix(apiPrefix);
  console.log('✅ Global prefix set:', apiPrefix);

  // CORS
  console.log('🔧 Setting up CORS...');
  app.enableCors({
    origin: true, // Allow all origins in development
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });
  console.log('✅ CORS enabled');

  // Global validation pipe
  console.log('🔧 Setting up validation pipe...');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );
  console.log('✅ Validation pipe set');

  // Swagger documentation
  console.log('🔧 Setting up Swagger...');
  // TEMPORARY: Disable Swagger due to crash issue
  if (false && process.env.NODE_ENV !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('MLM E-commerce API')
      .setDescription('Multi-Level Marketing E-commerce B2B Platform API Documentation')
      .setVersion('1.0')
      .addBearerAuth()
      .addTag('Authentication', 'User authentication and authorization')
      .addTag('Users', 'User management')
      .addTag('Products', 'Product catalog management')
      .addTag('Orders', 'Order management')
      .addTag('Commissions', 'Commission calculation and management')
      .addTag('Withdrawals', 'Withdrawal requests')
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document, {
      swaggerOptions: {
        persistAuthorization: true,
      },
    });
    console.log('✅ Swagger setup complete');
  }

  const port = process.env.PORT || 3000;
  console.log(`🔧 Starting server on port ${port}...`);
  await app.listen(port, '0.0.0.0');
  console.log('✅ Server listening');

  console.log('');
  console.log('🚀 MLM E-commerce Backend is running!');
  console.log('');
  console.log(`📡 Server: http://localhost:${port}`);
  console.log(`📚 API Docs: http://localhost:${port}/api/docs`);
  console.log(`🔑 API Prefix: ${apiPrefix}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log('');
}

bootstrap().catch((err) => {
  console.error('❌ Failed to start application:');
  console.error(err);
  process.exit(1);
});
