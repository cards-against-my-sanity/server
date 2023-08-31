import { Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";
import { Request } from "express";
import { ExtractJwt, Strategy } from "passport-jwt";
import { SessionService } from "src/session/session.service";

interface RefreshTokenSchema {
    sub: string
}

@Injectable()
export class JwtRefreshTokenStrategy extends PassportStrategy(Strategy, 'jwt-refresh-token') {
    constructor(
        private readonly configService: ConfigService,
        private readonly sessionService: SessionService
    ) {
        super({
            jwtFromRequest: function (req: Request) {
                let token = null;
                if (req && req.signedCookies && req.signedCookies.refresh) {
                    token = req.signedCookies.refresh;
                }
                return token;
            },
            ignoreExpiration: false,
            secretOrKey: configService.get<string>("JWT_REFRESH_SECRET")
        });
    }

    async validate(payload: RefreshTokenSchema) {
        const session = await this.sessionService.findOne(payload.sub);
        if (!session) {
            throw new UnauthorizedException("Session expired or revoked.");
        }

        return { id: payload.sub }
    }
}