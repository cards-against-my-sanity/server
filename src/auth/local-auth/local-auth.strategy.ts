import { Injectable, UnauthorizedException } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { Strategy } from "passport-local";
import { UsersService } from "src/users/users.service";
import * as argon2 from 'argon2';

@Injectable()
export class LocalAuthStrategy extends PassportStrategy(Strategy) {
    constructor(private readonly usersService: UsersService) {
        super({ usernameField: 'nickname' });
    }

    async validate(username: string, password: string) {
        const user = await this.usersService.findOneByEmail(username);

        if (user && (await argon2.verify(user.hash, password + user.salt))) {
            return user;
        }

        throw new UnauthorizedException();
    }
}