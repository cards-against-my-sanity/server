import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { JwtModule, JwtService } from "@nestjs/jwt";
import { JwtRefreshTokenStrategy } from "./jwt-refresh-token.strategy";
import { SessionModule } from "src/session/session.module";

@Module({
    imports: [
        ConfigModule,
        SessionModule,
        JwtModule.registerAsync({
            imports: [ConfigModule],
            inject: [ConfigService],
            useFactory: async (configService: ConfigService) => ({
              secret: configService.get<string>('JWT_REFRESH_SECRET'),
              signOptions: {
                expiresIn: '1w'
              }
            })
        })
    ],
    providers: [
        {
            provide: 'JwtRefreshTokenService',
            useExisting: JwtService
        },
        JwtRefreshTokenStrategy
    ],
    exports: ['JwtRefreshTokenService']
})
export class JwtRefreshTokenModule {}