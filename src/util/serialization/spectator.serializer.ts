import { Spectator } from "src/games/spectator.entity";
import ISpectator from "src/shared-types/game/spectator/spectator.interface";

export class SpectatorSerializer {
    static serialize(spectator: Spectator): ISpectator {
        return {
            id: spectator.id,
            nickname: spectator.nickname
        };
    }
}