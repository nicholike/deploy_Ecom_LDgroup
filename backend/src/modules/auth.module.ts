import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthController } from '@presentation/http/controllers/auth.controller';
import { AuthService } from '@infrastructure/services/auth/auth.service';
import { JwtStrategy } from '@infrastructure/services/auth/jwt.strategy';
import { UserModule } from './user.module';
import { PasswordResetTokenRepository } from '@infrastructure/database/repositories/password-reset-token.repository';

@Module({
  imports: [
    UserModule,
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('jwt.secret'),
        signOptions: {
          expiresIn: configService.get<string>('jwt.expiresIn'),
        },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtStrategy,
    {
      provide: 'IPasswordResetTokenRepository',
      useClass: PasswordResetTokenRepository,
    },
  ],
  exports: [AuthService],
})
export class AuthModule {}
