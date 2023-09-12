import { Player } from "src/games/player.entity";

export class PlayerSerializer {
    static serialize(player: Player): Record<string, any> {
        return {
            id: player.getUser().id,
            nickname: player.getUser().nickname,
            state: player.getState(),
            score: player.getScore()
        };
    }
}