export class GameChannel {
    static GAME_BROWSER = "game-browser";
    static GAME_ROOM = (gameId: string): string => `game:${gameId}`;
    static GAME_USER_ROOM = (gameId: string, userId: string): string => `game:${gameId}:user:${userId}`
}