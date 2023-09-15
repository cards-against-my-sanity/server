import IGameSettings from "src/shared-types/game/game-settings.interface";

export class GameSettings implements IGameSettings {
    maxPlayers: number = 10;
    maxSpectators: number = 10;
    maxScore: number = 7;
    roundIntermissionTimer: number = 8;
    gameWinIntermissionTimer: number = 10;
    playingTimer: number = 120;
    judgingTimer: number = 90;
    allowPlayersToJoinMidGame: boolean = false;
}