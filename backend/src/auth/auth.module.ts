import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './jwt.strategy';
import { FirebaseAuthService } from './firebase-auth.service';
import { MailService } from './mail.service';
import { PaymentsModule } from '../payments/payments.module';
import { Phase1AuthController } from './phase1-auth.controller';

@Module({ imports: [ConfigModule, PassportModule, PaymentsModule, JwtModule.registerAsync({ imports: [ConfigModule], inject: [ConfigService], useFactory: (config: ConfigService) => ({ secret: config.get('JWT_ACCESS_SECRET') }) })], controllers: [AuthController, Phase1AuthController], providers: [AuthService, JwtStrategy, FirebaseAuthService, MailService], exports: [AuthService] })
export class AuthModule {}
