import ISpectator from "src/shared-types/game/spectator/spectator.interface";
import { IUser } from "src/shared-types/user/user.interface";

export class Spectator implements ISpectator {
    id: string;
    nickname: string;

    constructor(user: IUser) {
        this.id = user.id;
        this.nickname = user.nickname;
    }
}