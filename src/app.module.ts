import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DecksModule } from './decks/decks.module';
import { CardsModule } from './cards/cards.module';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { APP_GUARD } from '@nestjs/core';
import { PermissionModule } from './permission/permission.module';
import { PermissionsGuard } from './permission/permissions.guard';
import { JwtAccessTokenGuard } from './auth/jwt-access-token/jwt-access-token.guard';
import { AppGateway } from './app.gateway';
import { JwtAccessTokenWithAnonFallbackGuard } from './auth/jwt-access-token/jwt-access-token-with-anon-fallback.guard copy';
import { SessionModule } from './session/session.module';

@Module({
  imports: [
    DecksModule,
    CardsModule,
    UsersModule,
    AuthModule,
    PermissionModule,
    SessionModule,
    ConfigModule.forRoot(),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'mysql',
        host: configService.get<string>('DATABASE_HOST'),
        port: parseInt(configService.get<string>('DATABASE_PORT')),
        username: configService.get<string>('DATABASE_USER'),
        password: configService.get<string>('DATABASE_PASS'),
        database: configService.get<string>('DATABASE_NAME'),
        entities: [__dirname + '/**/*.entity{.ts,.js}'],
        synchronize: true,
      })
    })
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAccessTokenWithAnonFallbackGuard
    },
    {
      provide: APP_GUARD,
      useClass: PermissionsGuard
    },
    AppGateway
  ]
})
export class AppModule {}
