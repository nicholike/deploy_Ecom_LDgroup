import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_INTERCEPTOR, APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { UserModule } from './modules/user.module';
import { AuthModule } from './modules/auth.module';
import { ProductModule } from './modules/product.module';
import { CategoryModule } from './modules/category.module';
import { CartModule } from './modules/cart.module';
import { OrderModule } from './modules/order.module';
import { CommissionModule } from './modules/commission.module';
import { WalletModule } from './modules/wallet.module';
import { UploadModule } from './modules/upload.module';
import { DashboardModule } from './modules/dashboard.module';
import { SettingsModule } from './modules/settings.module';
import { NotificationModule } from './modules/notification.module';
import { PaymentModule } from './modules/payment.module';
import { HealthModule } from './modules/health.module';
import { PrismaService } from './infrastructure/database/prisma.service';
import { HttpExceptionFilter } from './shared/filters/http-exception.filter';
import { TransformInterceptor } from './shared/interceptors/transform.interceptor';
import { JwtAuthGuard } from './shared/guards/jwt-auth.guard';
import jwtConfig from './infrastructure/config/jwt.config';
import { validate } from './infrastructure/config/env.validation';

@Module({
  imports: [
    // Configuration with validation
    ConfigModule.forRoot({
      isGlobal: true,
      load: [jwtConfig],
      envFilePath: ['.env.local', '.env'],
      validate, // ✅ Validate environment variables at startup
    }),

    // Rate limiting
    ThrottlerModule.forRoot([{
      ttl: 60000, // 60 seconds
      limit: 100,  // 100 requests per 60 seconds per IP
    }]),

    // Cron jobs / Scheduled tasks
    ScheduleModule.forRoot(),

    // Feature modules
    AuthModule,
    UserModule,
    ProductModule,
    CategoryModule,
    CartModule,
    OrderModule,
    WalletModule,
    CommissionModule,
    PaymentModule,
    UploadModule,
    DashboardModule,
    SettingsModule,
    NotificationModule,
    HealthModule,
  ],
  providers: [
    PrismaService,
    // Global exception filter
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
    // Global response transformer
    {
      provide: APP_INTERCEPTOR,
      useClass: TransformInterceptor,
    },
    // Global auth guard (can be overridden with @Public() decorator)
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    // Global rate limiting guard (can be overridden with @SkipThrottle() or @Throttle())
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
