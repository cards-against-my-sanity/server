import { GameSettings } from "src/games/game_settings";

export class GameSettingsSerializer {
    static serialize(settings: GameSettings): Record<string, any> {
        return {
            maxPlayers: settings.maxPlayers,
            maxSpectators: settings.maxSpectators,
            maxScore: settings.maxScore,
            roundIntermissionSeconds: settings.roundIntermissionSeconds,
            gameWinIntermissionSeconds: settings.gameWinIntermissionSeconds,
            allowPlayersToJoinMidGame: settings.allowPlayersToJoinMidGame,
            hasPassword: settings.password != ""
        };
    }
}