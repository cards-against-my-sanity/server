import ISpectator from "src/shared-types/game/spectator/spectator.interface";
import { User } from "src/users/entities/user.entity";

export class Spectator implements ISpectator {
    id: string;
    nickname: string;

    constructor(user: User) {
        this.id = user.id;
        this.nickname = user.nickname;
    }
}