import { Player } from "src/games/player.entity";
import IPlayer from "src/shared-types/game/player/player.interface";

export class PlayerSerializer {
    static serialize(player: Player): IPlayer {
        return {
            id: player.id,
            nickname: player.nickname,
            state: player.state,
            score: player.score
        };
    }
}