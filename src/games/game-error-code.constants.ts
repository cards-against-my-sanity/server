export class GameErrorCode {
    static readonly NOT_IN_LOBBY_STATE = new GameErrorCode("The game must be in the lobby state for that action.");
    static readonly NOT_ENOUGH_PLAYERS = new GameErrorCode("There are not enough players in the game. Minimum players required is 3.");
    static readonly NOT_ENOUGH_BLACK_CARDS = new GameErrorCode("There are not enough black cards to start the game. There must be at least 50 total black cards.");
    static readonly NOT_ENOUGH_WHITE_CARDS = new GameErrorCode("There are not enough white cards to start the game. There must be at least 20 white cards per player.");

    constructor(private readonly message: string) {}

    getMessage() {
        return this.message;
    }
}