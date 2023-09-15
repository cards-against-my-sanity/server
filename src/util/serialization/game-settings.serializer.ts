import { GameSettings } from "src/games/game-settings";
import IGameSettings from "src/shared-types/game/game-settings.interface";

export class GameSettingsSerializer {
    static serialize(settings: GameSettings): IGameSettings {
        return {
            maxPlayers: settings.maxPlayers,
            maxSpectators: settings.maxSpectators,
            maxScore: settings.maxScore,
            roundIntermissionTimer: settings.roundIntermissionTimer,
            gameWinIntermissionTimer: settings.gameWinIntermissionTimer,
            playingTimer: settings.playingTimer,
            judgingTimer: settings.judgingTimer,
            allowPlayersToJoinMidGame: settings.allowPlayersToJoinMidGame
        };
    }
}