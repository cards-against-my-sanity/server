import { Game } from "src/games/game.entity";

export class GameSerializer {
    static serializeForGameBrowser(game: Game): Record<string, any> {
        return {
            id: game.getId(),
            host: {
                id: game.getHost().id,
                nickname: game.getHost().nickname,
            },
            decks: game.getDecks(),
            state: game.getState(),
            settings: game.getSettings(),
            players: game.getPlayers().map(p => ({ id: p.getUser().id, nickname: p.getUser().nickname })),
            spectators: game.getSpectators().map(s => ({ id: s.getUser().id, nickname: s.getUser().nickname })),
            roundNumber: game.getRoundNumber()
        };
    }
}