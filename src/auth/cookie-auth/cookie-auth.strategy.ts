import { Injectable, UnauthorizedException } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { Request } from "express";
import { Strategy } from "passport-custom";
import { SessionService } from "src/session/session.service";

@Injectable()
export class CookieAuthStrategy extends PassportStrategy(Strategy, 'cookie') {
    constructor(private readonly sessionService: SessionService) {
        super();
    }

    async validate(req: Request) {
        if (!req.signedCookies || !req.signedCookies.sid) {
            return;
        }

        const session = await this.sessionService.findOne(req.signedCookies.sid);
        if (!session) {
            throw new UnauthorizedException("Session invalid, expired, or revoked.");
        }

        return {
            ...session.user,
            session_id: session.id
        }
    }
}