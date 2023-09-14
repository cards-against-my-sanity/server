import { Game } from "src/games/game.entity";
import { PlayerSerializer } from "./player.serializer";
import { SpectatorSerializer } from "./spectator.serializer";
import { GameSettingsSerializer } from "./game-settings.serializer";
import IGame from "src/shared-types/game/game.interface";

export class GameSerializer {
    static serialize(game: Game): IGame {
        return {
            id: game.getId(),
            host: { id: game.getHost().id, nickname: game.getHost().nickname },
            decks: game.getDecks(),
            state: game.getState(),
            settings: GameSettingsSerializer.serialize(game.getSettings()),
            players: game.getPlayers().map(p => PlayerSerializer.serialize(p)),
            spectators: game.getSpectators().map(s => SpectatorSerializer.serialize(s)),
            roundNumber: game.getRoundNumber()
        }
    }
}