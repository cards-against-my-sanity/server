import { Game } from "src/games/game.entity";

export class GameSerializer {
    static serializeForGameBrowser(game: Game): Record<string, any> {
        return {
            id: game.getId(),
            host: game.getHost().nickname,
            decks: game.getDecks(),
            playerCount: game.getPlayerCount(),
            maxPlayers: game.getMaxPlayers(),
            spectatorCount: game.getSpectatorCount(),
            maxSpectators: game.getMaxSpectators(),
            state: game.getState()
        };
    }
}