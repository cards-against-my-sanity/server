import { GameState } from "./game-state.enum";
import { Player } from "./player.entity";
import { PlayerState } from "./player-state.enum";
import { v4 as uuidv4 } from 'uuid';
import { WhiteCard } from "src/cards/entities/white-card.entity";
import { BlackCard } from "src/cards/entities/black-card.entity";
import { Deck } from "src/decks/entities/deck.entity";
import { GameStatusCode } from "./game-status-code.constants";
import { EventEmitter } from "stream";
import { User } from "src/users/entities/user.entity";
import { Spectator } from "./spectator.entity";

export class Game extends EventEmitter {
    static readonly MINIMUM_BLACK_CARDS = 50;
    static readonly MINIMUM_WHITE_CARDS_PER_PLAYER = 20;

    private readonly id: string;
    private readonly decks: Deck[];
    private readonly availableWhiteCards: WhiteCard[];
    private readonly dealtWhiteCards: WhiteCard[];
    private readonly availableBlackCards: BlackCard[];
    private readonly dealtBlackCards: BlackCard[];
    private players: Player[];
    private spectators: Spectator[];
    private state: GameState;
    private maxScore: number = 6;
    private maxPlayers: number = 10;
    private maxSpectators: number = 10;

    constructor(
        private host: User
    ) {
        super();

        this.id = uuidv4();

        this.players = [
            new Player(host)
        ];
    }

    /**
     * Gets the id of this game
     * 
     * @returns the id of the game
     */
    getId(): string {
        return this.id;
    }

    /**
     * Gets the User representing the game host
     * 
     * @returns the user representing the game host
     */
    getHost(): User {
        return this.host;
    }

    /**
     * Adds a deck to the game. Returns true if the
     * deck has been added. Returns false if the game
     * is not accepting new decks (i.e., not in lobby
     * state) or if the deck was already added to the 
     * game.
     * 
     * @param deckId the id of the deck to add to the game
     */
    addDeck(deck: Deck): boolean {
        if (this.state !== GameState.Lobby) {
            return false;
        }

        if (this.decks.some(d => d.id === deck.id)) {
            return false;
        }

        this.decks.push(deck);
        return true;
    }

    /**
     * Clears all decks from this game, starting from 0.
     * 
     * Also clears the black and white cards from the 
     * game as a side effect.
     */
    private clearDecks() {
        this.decks.length = 0;
        this.availableBlackCards.length = 0;
        this.dealtBlackCards.length = 0;
        this.availableWhiteCards.length = 0;
        this.dealtWhiteCards.length = 0;

        this.event('decksCleared');
    }

    /**
     * Gets the decks that have been added to the game.
     * 
     * @returns the decks in the game
     */
    getDecks(): Deck[] {
        return this.decks;
    }

    /**
     * Sets the cards available to play in this game.
     * The game service sets the cards available to play
     * based on the decks that have been added to the game.
     * 
     * @param blackCards the black cards to add
     * @param whiteCards the white cards to add
     */
    setCards(blackCards: BlackCard[], whiteCards: WhiteCard[]) {
        this.availableBlackCards.length = 0;
        this.dealtBlackCards.length = 0;
        this.availableBlackCards.push(...blackCards);
        
        this.availableWhiteCards.length = 0;
        this.dealtWhiteCards.length = 0;
        this.availableWhiteCards.push(...whiteCards);
    }

    /**
     * Gets the black cards available to play in this game.
     * 
     * @returns the black cards available
     */
    getAvailableBlackCards() {
        return this.availableBlackCards;
    }

    /**
     * Gets the black cards that have already been dealt in this game.
     * 
     * @returns the black cards already dealt
     */
    getDealtBlackCards() {
        return this.dealtBlackCards;
    }

    /**
     * Gets the white cards available to play in this game.
     * 
     * @returns the white cards available
     */
    getAvailableWhiteCards() {
        return this.availableWhiteCards;
    }

    /**
     * Gets the black cards that have already been dealt in this game.
     * 
     * @returns the black cards already dealt
     */
    getDealtWhiteCards() {
        return this.dealtWhiteCards;
    }

    /**
     * Adds a user to this game as a player by id
     * 
     * Fires playerJoinedGame event.
     * 
     * @param id the id of the user to add
     * 
     * @returns NOT_IN_LOBBY_STATE: if the game is
     *          not in the lobby state
     * 
     *          MAX_PLAYERS_REACHED: if the game
     *          has too many players
     * 
     *          ACTION_OK: if the player has been 
     *          added
     */
    addPlayer(user: User): GameStatusCode {
        if (this.state !== GameState.Lobby) {
            return GameStatusCode.NOT_IN_LOBBY_STATE;
        }

        if (this.players.length + 1 > this.maxPlayers) {
            return GameStatusCode.MAX_PLAYERS_REACHED;
        }

        this.players.push(new Player(user));

        this.event('playerJoinedGame');
        return null;
    }

    /**
     * Returns whether the given player is a member of this game
     * 
     * @param id the id of the User to check
     */
    hasPlayer(id: string): boolean {
        return this.players.map(p => p.getUser().id).includes(id);
    }

    /**
     * Returns the number of players currently in the game
     */
    getPlayerCount(): number {
        return this.players.length;
    }

    /**
     * Remove a player from the game by user id. If 
     * the removed player is the current judge, the 
     * next player in index order becomes the judge.
     * 
     * Fires hostLeftGame or playerLeftGame event.
     * 
     * @param id the id of the user to remove
     * 
     * @returns NOT_IN_GAME: if the player is not
     *          in the game
     * 
     *          ACTION_OK: if the player has been
     *          removed
     */
    removePlayer(id: string): GameStatusCode {
        const idx = this.players.findIndex(p => p.getUser().id === id);
        if (idx === -1) {
            return GameStatusCode.NOT_IN_GAME;
        }

        if (this.players.length === 1) {
            this.players.splice(0, 1);
        } else {
            const nextPlayerIndex = (idx + 1) % this.players.length;
            
            if (this.players[idx].getState() === PlayerState.Judge) {
                this.players[nextPlayerIndex].setState(PlayerState.Judge);
            }
            
            this.players.splice(idx, 1);
        }

        if (this.getHost().id === id) {
            this.state = GameState.Abandoned;
            this.event('hostLeftGame');
        } else {
            this.event('playerLeftGame')
        }

        return GameStatusCode.ACTION_OK;
    }

    /**
     * Adds a user to this game as a spectator by id
     * 
     * Fires spectatorJoinedGame event.
     * 
     * @param id the id of the user to add
     * @returns MAX_SPECTATORS_REACHED: if the game
     *          has too many spectators
     * 
     *          ACTION_OK: if the spectator has been
     *          added
     */
    addSpectator(user: User): GameStatusCode {
        if (this.spectators.length + 1 > this.maxSpectators) {
            return GameStatusCode.MAX_SPECTATORS_REACHED;
        }

        this.spectators.push(new Spectator(user));

        this.event('spectatorJoinedGame');
        return GameStatusCode.ACTION_OK;
    }

    /**
     * Returns whether the given player is a member of this game
     * 
     * @param id the id of the User to check
     */
    hasSpectator(id: string): boolean {
        return this.spectators.map(s => s.getUser().id).includes(id);
    }

    /**
     * Returns the number of specators currently spectating
     * the game
     */
    getSpectatorCount(): number {
        return this.spectators.length;
    }

    /**
     * Remove a spectator from the game by user id.
     * 
     * Fires spectatorLeftGame event.
     * 
     * @param id the id of the user to remove
     * 
     * @returns NOT_SPECTATING_GAME: if the user is
     *          not spectating the game
     * 
     *          ACTION_OK: if the spectator has been
     *          removed
     */
    removeSpectator(id: string): GameStatusCode {
        const idx = this.spectators.findIndex(s => s.getUser().id === id);
        if (idx === -1) {
            return GameStatusCode.NOT_SPECTATING_GAME;
        }

        this.spectators = this.spectators.filter(s => s.getUser().id !== id);

        this.event('spectatorLeftGame');
        return GameStatusCode.ACTION_OK;
    }

    /**
     * Gets the current game state.
     * 
     * @returns the current game state
     */
    getState() {
        return this.state;
    }

    /**
     * Sets the current game state.
     * 
     * Fires gameStateChanged event.
     * 
     * @param state the new game state
     */
    setState(state: GameState) {
        this.state = state;
        this.event('gameStateChanged', { state });
    }

    /**
     * Gets the max score of the game. If this
     * score is reached, the game ends.
     * 
     * @returns the max score of the game
     */
    getMaxScore() {
        return this.maxScore;
    }

    /**
     * Sets the new max score for the game.
     * 
     * @param maxScore the new max score
     */
    setMaxScore(maxScore: number) {
        this.maxScore = Math.floor(maxScore);
    }

    /**
     * Gets the max players for this game.
     * 
     * @returns the max players for this game
     */
    getMaxPlayers() {
        return this.maxPlayers;
    }

    /**
     * Sets the max players for this game.
     * 
     * @param maxPlayers the new max players
     */
    setMaxPlayers(maxPlayers: number) {
        this.maxPlayers = Math.floor(maxPlayers);
    }

    /**
     * Gets the max spectators for this game.
     * 
     * @returns the max spectators for this game
     */
    getMaxSpectators() {
        return this.maxSpectators;
    }

    /**
     * Set the max spectators for this game.
     * 
     * @param maxSpectators the new max spectators
     */
    setMaxSpectators(maxSpectators: number) {
        this.maxSpectators = Math.floor(maxSpectators);
    }

    /**
     * Starts the game. Returns true if the game was started.
     * Returns false if the game-start requirements are not met.
     * 
     * Transitions game from Lobby state to Dealing state.
     *
     * Fires gameStarted event.
     * 
     * Game-start requirements:
     * - Game is in Lobby state.
     * - Game has at least three players.
     * - Selected decks provide at least {@link MINIMUM_BLACK_CARDS} black cards 
     *   and {@link MINIMUM_WHITE_CARDS_PER_PLAYER} white cards per player.
     */
    start(): GameStatusCode {
        if (this.state !== GameState.Lobby) {
            return GameStatusCode.NOT_IN_LOBBY_STATE;
        }

        if (this.players.length < 3) {
            return GameStatusCode.NOT_ENOUGH_PLAYERS;
        }

        if (this.availableBlackCards.length < Game.MINIMUM_BLACK_CARDS) {
            return GameStatusCode.NOT_ENOUGH_BLACK_CARDS;
        }

        if (this.availableWhiteCards.length < (Game.MINIMUM_WHITE_CARDS_PER_PLAYER * this.players.length)) {
            return GameStatusCode.NOT_ENOUGH_WHITE_CARDS;
        }

        const initialJudgeIdx = Math.floor(Math.random() * (this.players.length - 1));
        this.players[initialJudgeIdx].setState(PlayerState.Judge);

        this.event('gameStarted');

        this.state = GameState.Dealing;
        this.dealingState();

        return null;
    }

    /**
     * Dealing state: game automatically deals cards 
     * to all players, then moves to playing state.
     * 
     * Returns true if state processing succeeded and 
     * the game has moved to the next state. False otherwise.
     * 
     * Transitions game from Dealing state to Playing state.
     */
    dealingState() {
        // TODO: write dealing
        this.state = GameState.Playing;
    }

    /**
     * Playing state: all users must play white cards 
     * for the current black card. Once all have played, 
     * game moves to judging state.
     * 
     * Returns true if state processing succeeded and 
     * the game has moved to the next state. False otherwise.
     */
    playingState() {
        this.rotateJudge();

        // TODO: write playing
        this.state = GameState.Judging;
    }

    /**
     * Judging state: judge must choose the white 
     * card(s) that win the round. Once the judge 
     * chooses, points are calculated. If a player
     * has won the round (reached max points), then 
     * the game moves to the win state. Otherwise, 
     * game moves back to dealing state.
     * 
     * Returns true if state processing succeeded and 
     * the game has moved to the next state. False otherwise.
     */
    judgingState() {
        // TODO: write judging; fork in road
        // next state either Win, or back to Dealing
        this.state = GameState.Win;
    }

    /**
     * Win state: winner of the round is declared, 
     * game is saved to historical repository, game 
     * moves to reset state.
     * 
     * This state is transient and will always move 
     * to the next state.
     */
    winState() {
        // TODO: write win
        this.state = GameState.Reset;
    }

    /**
     * Reset state: game information is reset and 
     * game moves back to lobby state.
     * 
     * This state is transient and will always move 
     * to the next state.
     */
    resetState() {
        // TODO: write reset
        this.state = GameState.Lobby;
    }

    /**
     * Rotates the current judge. If nobody is the 
     * judge (i.e., at game start), then the first 
     * player in the game (i.e., the host) is the 
     * first judge. Otherwise, the judge proceeds 
     * sequentially and via modular arithmetic.
     * That is, if there are 3 players, the judge 
     * will proceed from 0->1->2->0.
     * 
     * If the current game state is not Playing, 
     * no action occurs.
     */
    rotateJudge(): void {
        if (this.state !== GameState.Playing) {
            return;
        }

        const currentJudgeIdx = this.players.findIndex(p => p.getState() === PlayerState.Judge);
        if (currentJudgeIdx === -1) {
            this.players[0].setState(PlayerState.Judge);
        }

        this.players[currentJudgeIdx].setState(PlayerState.Player);
        this.players[(currentJudgeIdx + 1) % this.players.length].setState(PlayerState.Judge);
    }

    /**
     * Emits the named event with this game's ID as payload.
     * 
     * @param name the name of the event
     */
    private event(name: string, payload?: Record<string, any>) {
        if (payload) {
            this.emit(name, { ...payload, name, id: this.id });
        } else {
            this.emit(name, { name, id: this.id });
        }
    }
}