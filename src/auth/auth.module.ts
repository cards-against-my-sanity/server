import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { JwtAccessTokenModule } from './jwt-access-token/jwt-access-token.module';
import { JwtRefreshTokenModule } from './jwt-refresh-token/jwt-refresh-token.module';
import { LocalAuthModule } from './local-auth/local-auth.module';
import { AnonAuthModule } from './anon-auth/anon-auth.module';
import { SessionModule } from 'src/session/session.module';
import { UsersModule } from 'src/users/users.module';

@Module({
  imports: [
    PassportModule,
    AnonAuthModule,
    LocalAuthModule,
    JwtAccessTokenModule,
    JwtRefreshTokenModule,
    UsersModule,
    SessionModule
  ],
  controllers: [AuthController],
  providers: [AuthService],
  exports: [AuthService]
})
export class AuthModule {}
