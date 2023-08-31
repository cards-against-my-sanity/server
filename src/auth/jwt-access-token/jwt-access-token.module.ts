import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { JwtModule, JwtService } from "@nestjs/jwt";
import { UsersModule } from "src/users/users.module";
import { JwtAccessTokenBearerStrategy } from "./jwt-access-token.strategy";
import { SessionModule } from "src/session/session.module";

@Module({
    imports: [
        ConfigModule,
        SessionModule,
        UsersModule,
        JwtModule.registerAsync({
            imports: [ConfigModule],
            inject: [ConfigService],
            useFactory: async (configService: ConfigService) => ({
              secret: configService.get<string>('JWT_ACCESS_SECRET'),
              signOptions: {
                expiresIn: '3m'
              }
            })
        })
    ],
    providers: [
        {
            provide: 'JwtAccessTokenService',
            useExisting: JwtService
        },
        JwtAccessTokenBearerStrategy
    ],
    exports: ['JwtAccessTokenService']
})
export class JwtAccessTokenModule {}