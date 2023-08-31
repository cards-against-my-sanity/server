import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { SessionService } from 'src/session/session.service';
import { User } from 'src/users/entities/user.entity';
import { UsersService } from 'src/users/users.service';

@Injectable()
export class AuthService {
    constructor(
        private readonly usersService: UsersService,
        private readonly sessionService: SessionService,
        @Inject("JwtAccessTokenService") private readonly accessTokenService: JwtService,
        @Inject("JwtRefreshTokenService") private readonly refreshTokenService: JwtService
    ) {}

    async startSession(userId: string, ip: string) {
        const user = await this.usersService.findOne(userId);
        const session = await this.sessionService.createSession(user, ip)

        const payload = { sub: session.id }

        return {
            access_token: await this.accessTokenService.signAsync(payload),
            refresh_token: await this.refreshTokenService.signAsync(payload)
        };
    }

    endSession(sessionId: string) {
        this.sessionService.removeSession(sessionId);
    }

    async refreshTokens(sessionId: string) {
        const payload = { sub: sessionId };

        return {
            access_token: await this.accessTokenService.signAsync(payload),
            refresh_token: await this.refreshTokenService.signAsync(payload)
        }
    }

    async verifyAccessToken(token: string | string[]): Promise<Partial<User>> {
        let actual_token: string;
        if (Array.isArray(token)) {
            actual_token = token[0];
        } else {
            actual_token = token;
        }

        try {
            const verified = await this.accessTokenService.verifyAsync(actual_token);
        
            if (verified) {
                return { id: verified.sub }
            } else {
                return null
            }
        } catch (ex) {
            return null
        }
    }
}
