import { Injectable } from '@nestjs/common';
import { Session } from './entities/session.entity';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import IUser from 'src/shared-types/user/user.interface';

@Injectable()
export class SessionService {
    constructor(@InjectRepository(Session) private readonly repo: Repository<Session>) { }

    /**
     * Creates and saves a new session in the database. The created
     * session is returned.
     * 
     * @param ip the ip address to associate with the session
     * @returns the newly created session
     */
    async createSession(user: IUser, ip: string, remember: boolean): Promise<Session> {
        const now = new Date();

        const session = this.repo.create({
            ip,
            user,
            expires: new Date(now.getTime() + (remember ? 604800000 : 86400000))
        });

        await this.repo.save(session);
        return session;
    }

    /**
     * Finds a session in the database by id.
     * 
     * @param id the id of the session to find
     * @returns the session or null
     */
    findOne(id: string): Promise<Session> {
        return this.repo.findOneBy({ id });
    }

    /**
     * Finds all sessions in the database belonging to a user.
     * 
     * @param user_id the id of the session owner
     * @returns the sessions belonging to the user, if any
     */
    findAll(user_id: string): Promise<Session[]> {
        return this.repo.find({ where: { user: { id: user_id } } })
    }

    /**
     * Finds a session in the database by id, updates
     * its expiry value to right now, and then saves it
     * back.
     * 
     * @param id the session id
     */
    async setExpiresNow(id: string): Promise<void> {
        const session = await this.findOne(id);
        if (session) {
            session.expires = new Date();
            this.repo.save(session);
        }
    }
}
