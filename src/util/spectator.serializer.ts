import { Spectator } from "src/games/spectator.entity";

export class SpectatorSerializer {
    static serialize(spectator: Spectator): Record<string, any> {
        return {
            id: spectator.getUser().id,
            nickname: spectator.getUser().nickname
        };
    }
}