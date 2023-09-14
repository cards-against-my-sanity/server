import { GameSettings } from "src/games/game-settings";
import IGameSettings from "src/shared-types/game/game-settings.interface";

export class GameSettingsSerializer {
    static serialize(settings: GameSettings): IGameSettings {
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