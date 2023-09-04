export class GameStatusCode {
    static readonly ACTION_OK = new GameStatusCode(null);
    static readonly NOT_IN_LOBBY_STATE = new GameStatusCode("The game must be in the lobby state for that action.");
    static readonly NOT_ENOUGH_PLAYERS = new GameStatusCode("There are not enough players in the game. Minimum players required is 3.");
    static readonly NOT_ENOUGH_BLACK_CARDS = new GameStatusCode("There are not enough black cards to start the game. There must be at least 50 total black cards.");
    static readonly NOT_ENOUGH_WHITE_CARDS = new GameStatusCode("There are not enough white cards to start the game. There must be at least 20 white cards per player.");
    static readonly UNKNOWN_GAME = new GameStatusCode("The specified game cannot be found.");
    static readonly ALREADY_IN_GAME = new GameStatusCode("You are already in a game. You cannot join another one at the same time.");
    static readonly MAX_PLAYERS_REACHED = new GameStatusCode("There are too many players in the game. You cannot join that game.");
    static readonly NOT_IN_GAME = new GameStatusCode("You are not playing in that game.");
    static readonly NOT_SPECTATING_GAME = new GameStatusCode("You are not spectating that game.");

    constructor(private readonly message: string) {}

    getMessage() {
        return this.message;
    }
}