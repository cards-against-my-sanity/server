import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { LocalAuthModule } from './local-auth/local-auth.module';
import { SessionModule } from 'src/session/session.module';
import { UsersModule } from 'src/users/users.module';
import { AnonAuthModule } from './anon-auth/anon-auth.module';
import { CookieAuthModule } from './cookie-auth/cookie-auth.module';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    PassportModule,
    AnonAuthModule,
    LocalAuthModule,
    CookieAuthModule,
    UsersModule,
    SessionModule,
    ConfigModule
  ],
  controllers: [AuthController]
})
export class AuthModule { }
