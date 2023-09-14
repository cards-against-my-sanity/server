import { Injectable } from '@nestjs/common';
import { SessionService } from 'src/session/session.service';
import { IUser } from 'src/shared-types/user/user.interface';
import { UsersService } from 'src/users/users.service';

@Injectable()
export class AuthService {
    constructor(
        private readonly usersService: UsersService,
        private readonly sessionService: SessionService
    ) { }

    async startSession(user: IUser, ip: string): Promise<string> {
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
