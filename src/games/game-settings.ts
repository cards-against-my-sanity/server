import IGameSettings from "src/shared-types/game/game-settings.interface";

export class GameSettings implements IGameSettings {
    maxPlayers: number = 10;
    maxSpectators: number = 10;
    maxScore: number = 7;
    roundIntermissionSeconds: number = 8;
    gameWinIntermissionSeconds: number = 10;
    allowPlayersToJoinMidGame: boolean = false;
}