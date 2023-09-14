import { Injectable, UnauthorizedException } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { Strategy } from "passport-local";
import { UsersService } from "src/users/users.service";

@Injectable()
export class LocalAuthStrategy extends PassportStrategy(Strategy, 'local') {
    constructor(private readonly usersService: UsersService) {
        super({ usernameField: 'nickname' });
    }

    async validate(username: string, password: string) {
        const user = await this.usersService.findOneByNicknameIfPasswordValid(username, password);
        if (user) {
            return user;
        }

        throw new UnauthorizedException();
    }
}