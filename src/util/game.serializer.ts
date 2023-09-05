import { Game } from "src/games/game.entity";

export class GameSerializer {
    static serializeForGameBrowser(game: Game): Record<string, any> {
        return {
            id: game.getId(),
            host: game.getHost().nickname,
            decks: game.getDecks(),
            state: game.getState(),
            settings: game.getSettings(),
            playerCount: game.getPlayerCount(),
            spectatorCount: game.getSpectatorCount()
        };
    }
}