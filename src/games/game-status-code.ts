export class GameStatusCode {
    static readonly ACTION_OK = new GameStatusCode(null);
    static readonly NOT_IN_LOBBY_STATE = new GameStatusCode("The game must be in the lobby state for that action.");
    static readonly NOT_IN_PROGRESS = new GameStatusCode("The game is not in progress. That action has no effect.");
    static readonly NOT_IN_PLAYING_STATE = new GameStatusCode("The game must be in the playing state for that action.");
    static readonly NOT_IN_JUDGING_STATE = new GameStatusCode("The game must be in the judging state for that action.");
    static readonly NOT_ENOUGH_PLAYERS = new GameStatusCode("There are not enough players in the game. Minimum players required is 3.");
    static readonly NOT_ENOUGH_BLACK_CARDS = new GameStatusCode("There are not enough black cards to start the game. There must be at least 50 total black cards.");
    static readonly NOT_ENOUGH_WHITE_CARDS = new GameStatusCode("There are not enough white cards to start the game. There must be at least 20 white cards per player.");
    static readonly UNKNOWN_GAME = new GameStatusCode("The specified game cannot be found.");
    static readonly UNKNOWN_DECK = new GameStatusCode("The specified deck cannot be found.");
    static readonly ALREADY_IN_GAME = new GameStatusCode("You are already playing in a game. You cannot join or spectate another game.");
    static readonly ALREADY_SPECTATING = new GameStatusCode("You are already spectating a game. You cannot join or spectate another game.");
    static readonly NOT_IN_GAME = new GameStatusCode("You are not playing in that game.");
    static readonly NOT_SPECTATING_GAME = new GameStatusCode("You are not spectating that game.");
    static readonly MAX_PLAYERS_REACHED = new GameStatusCode("There are too many players in the game. You cannot join that game.");
    static readonly MAX_SPECTATORS_REACHED = new GameStatusCode("There are too many spectators in the game. You cannot spectate that game.");
    static readonly IS_THE_JUDGE = new GameStatusCode("As the judge for this round, you cannot perform that action.");
    static readonly IS_NOT_THE_JUDGE = new GameStatusCode("You are not the judge for this round. You cannot perform that action.")
    static readonly NOT_ENOUGH_CARDS = new GameStatusCode("You have not played enough cards. Please choose more cards.");
    static readonly TOO_MANY_CARDS = new GameStatusCode("You have tried to play too many cards. Please reduce your cards.");
    static readonly INVALID_CARDS = new GameStatusCode("The cards you specified are not valid.");
    static readonly DECK_ALREADY_ADDED = new GameStatusCode("The specified deck is already in the game.");
    static readonly DECK_NOT_IN_GAME = new GameStatusCode("The specified deck is not in the game.");

    constructor(private readonly message: string) { }

    getMessage() {
        return this.message;
    }
}