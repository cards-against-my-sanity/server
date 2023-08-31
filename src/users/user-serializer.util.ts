import { Injectable } from "@nestjs/common";
import { PassportSerializer } from "@nestjs/passport";
import { User } from "./entities/user.entity";
import { UsersService } from "./users.service";

@Injectable()
export class UserSerializer extends PassportSerializer {
    constructor(private readonly usersService: UsersService) {
        super();
    }

    serializeUser(user: User, done: Function) {
        return done(null, {
            id: user.id,
            nickname: user.nickname,
            permissions: {
                generic: user.permissions.generic_permissions,
                gameplay: user.permissions.gameplay_permissions,
                contributor: user.permissions.contributor_permissions,
                moderator: user.permissions.moderator_permissions,
                admin: user.permissions.admin_permissions
            }
        })
    }

    deserializeUser(payload: Partial<User>, done: Function) {
        const user = this.usersService.findOne(payload.id!);
        if (!user) {
            return done(new Error("failed to deserialize user"), null);
        } else {
            return done(null, user);
        }
    }
}