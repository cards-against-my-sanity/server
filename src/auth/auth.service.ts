import { Injectable } from '@nestjs/common';
import { SessionService } from 'src/session/session.service';
import { User } from 'src/users/entities/user.entity';
import { UsersService } from 'src/users/users.service';

@Injectable()
export class AuthService {
    constructor(
        private readonly usersService: UsersService,
        private readonly sessionService: SessionService
    ) {}

    async startSession(user: User, ip: string): Promise<string> {
        const session = await this.sessionService.createSession(user, ip)
        return session.id;
    }

    async validateSession(sessionId: string) {
        const session = await this.sessionService.findOne(sessionId);
        return !!session;
    }

    endSession(sessionId: string) {
        this.sessionService.removeSession(sessionId);
    }
}
