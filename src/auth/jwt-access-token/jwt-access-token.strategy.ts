import { Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { SessionService } from "src/session/session.service";
import { UsersService } from "src/users/users.service";

interface AccessTokenSchema {
    sub: string
}

@Injectable()
export class JwtAccessTokenBearerStrategy extends PassportStrategy(Strategy, 'jwt-access-token') {
    constructor(
        private readonly configService: ConfigService,
        private readonly sessionService: SessionService,
        private readonly usersService: UsersService
    ) {
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKey: configService.get<string>("JWT_ACCESS_SECRET")
        });
    }

    async validate(payload: AccessTokenSchema) {
        const session = await this.sessionService.findOne(payload.sub);
        if (!session) {
            throw new UnauthorizedException("Session expired or revoked.");
        }
    
        return {
            ...session.user,
            sessionId: session.id
        }
    }
}