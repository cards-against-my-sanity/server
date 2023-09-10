import { GameState } from "./game-state.enum";
import { Player } from "./player.entity";
import { PlayerState } from "./player-state.enum";
import { v4 as uuidv4 } from 'uuid';
import { WhiteCard } from "src/cards/entities/white-card.entity";
import { BlackCard } from "src/cards/entities/black-card.entity";
import { Deck } from "src/decks/entities/deck.entity";
import { GameStatusCode } from "./game-status-code";
import { EventEmitter } from "stream";
import { User } from "src/users/entities/user.entity";
import { Spectator } from "./spectator.entity";
import { GameSettings } from "./game_settings";
import { ArrayShuffler } from "src/util/array-shuffler";

export class Game extends EventEmitter {
    static readonly MINIMUM_PLAYERS = 3;
    static readonly MINIMUM_BLACK_CARDS = 50;
    static readonly MINIMUM_WHITE_CARDS_PER_PLAYER = 20;

    private readonly id: string;

    private decks: Deck[] = [];

    private readonly availableWhiteCards: WhiteCard[] = [];                     // available to draw
    private readonly playedWhiteCards: Map<Player, WhiteCard[]> = new Map();    // played this round (ephemeral)
    private readonly discardedWhiteCards: WhiteCard[] = [];                     // have already been played in a prior round

    private currentBlackCard: BlackCard;                                        // now playing
    private readonly availableBlackCards: BlackCard[] = [];                     // available to draw
    private readonly discardedBlackCards: BlackCard[] = [];                     // have already been played

    private readonly settings: GameSettings = new GameSettings();

    private state: GameState = GameState.Lobby;
    private players: Player[] = [];
    private spectators: Spectator[] = [];
    private roundNumber: number = 0;

    constructor(
        private host: User
    ) {
        super();
        this.id = uuidv4();
        this.players.push(new Player(host));
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
     * 
     * @returns NOT_IN_LOBBY_STATE: if the game is not in
     *          the lobby state
     * 
     *          DECK_ALREADY_ADDED: if the deck was already
     *          added to this game
     * 
     *          ACTION_OK: if the deck was added successfully
     */
    addDeck(deck: Deck): GameStatusCode {
        if (this.state !== GameState.Lobby) {
            return GameStatusCode.NOT_IN_LOBBY_STATE;
        }

        if (this.decks.some(d => d.id === deck.id)) {
            return GameStatusCode.DECK_ALREADY_ADDED;
        }

        this.decks.push(deck);

        return GameStatusCode.ACTION_OK;
    }

    /**
     * Removes a deck from the game. Returns true if the
     * deck has been removed. Returns false if the game
     * is not accepting deck removals (i.e., not in lobby
     * state) or if the deck was not already in the game.
     * 
     * @param deckId the id of the deck to add to the game
     * 
     * @returns NOT_IN_LOBBY_STATE: if the game is not in
     *          the lobby state
     * 
     *          DECK_NOT_IN_GAME: if the deck was already
     *          added to this game
     * 
     *          ACTION_OK: if the deck was removed successfully
     */
    removeDeck(deck: Deck): GameStatusCode {
        if (this.state !== GameState.Lobby) {
            return GameStatusCode.NOT_IN_LOBBY_STATE;
        }

        if (this.decks.some(d => d.id !== deck.id)) {
            return GameStatusCode.DECK_NOT_IN_GAME;
        }

        this.decks = this.decks.filter(d => d.id !== deck.id);
        return GameStatusCode.ACTION_OK;
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
        this.discardedBlackCards.length = 0;
        this.availableBlackCards.push(...blackCards);

        this.availableWhiteCards.length = 0;
        this.discardedWhiteCards.length = 0;
        this.availableWhiteCards.push(...whiteCards);
    }

    /**
     * Gets the black cards available to play in this game.
     * 
     * @returns the black cards available
     */
    getAvailableBlackCards() {
        return this.discardedBlackCards;
    }

    /**
     * Gets the black cards that have already been dealt in this game.
     * 
     * @returns the black cards already dealt
     */
    getDiscardedBlackCards() {
        return this.discardedBlackCards;
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
    getDiscardedWhiteCards() {
        return this.discardedWhiteCards;
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

        if (this.players.length + 1 > this.settings.maxPlayers) {
            return GameStatusCode.MAX_PLAYERS_REACHED;
        }

        this.players.push(new Player(user));

        this.event('playerJoinedGame', { userId: user.id, nickname: user.nickname });
        return GameStatusCode.ACTION_OK;
    }

    /**
     * Gets a specific player by id
     * @param id the user id of the player to get
     * @returns the plaeyr or undefined
     */
    getPlayer(id: string): Player {
        return this.players.find(p => p.getUser().id === id);
    }

    /**
     * Gets the players in the game
     * @returns the players in the game
     */
    getPlayers(): Player[] {
        return this.players.slice();
    }

    /**
     * Returns whether the given player is a member of this game
     * 
     * @param id the id of the User to check
     */
    hasPlayer(id: string): boolean {
        return this.getPlayer(id) !== undefined;
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
            this.event('stateTransition', { to: GameState.Abandoned });
        }

        this.event('playerLeftGame', { userId: id })

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
        if (this.spectators.length + 1 > this.settings.maxSpectators) {
            return GameStatusCode.MAX_SPECTATORS_REACHED;
        }

        this.spectators.push(new Spectator(user));

        this.event('spectatorJoinedGame', { userId: user.id, nickname: user.nickname });
        return GameStatusCode.ACTION_OK;
    }

    /**
     * Gets the spectators in the game
     * @returns the spectators in the game
     */
    getSpectators(): Spectator[] {
        return this.spectators.slice();
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

        this.event('spectatorLeftGame', { userId: id });
        return GameStatusCode.ACTION_OK;
    }

    /**
     * Gets the current round number of the
     * game.
     * 
     * @returns the current round number
     */
    getRoundNumber(): number {
        return this.roundNumber;
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
     * Gets whether settings can be changed.
     * Settings can only be changed when game
     * state is Lobby.
     * 
     * @returns true if game state is Lobby, 
     *          otherwise false
     */
    canChangeSettings(): boolean {
        return this.state === GameState.Lobby;
    }

    /**
     * Gets the max score of the game. If this
     * score is reached, the game ends.
     * 
     * @returns the max score of the game
     */
    getMaxScore() {
        return this.settings.maxScore;
    }

    /**
     * Sets the new max score for the game.
     * 
     * @param maxScore the new max score
     */
    setMaxScore(maxScore: number): GameStatusCode {
        if (this.state !== GameState.Lobby) {
            return GameStatusCode.NOT_IN_LOBBY_STATE;
        }

        this.settings.maxScore = maxScore;
        return GameStatusCode.ACTION_OK;
    }

    /**
     * Gets the max players for this game.
     * 
     * @returns the max players for this game
     */
    getMaxPlayers() {
        return this.settings.maxPlayers;
    }

    /**
     * Sets the max players for this game.
     * 
     * @param maxPlayers the new max players
     */
    setMaxPlayers(maxPlayers: number): GameStatusCode {
        if (this.state !== GameState.Lobby) {
            return GameStatusCode.NOT_IN_LOBBY_STATE;
        }

        this.settings.maxPlayers = maxPlayers;
        return GameStatusCode.ACTION_OK;
    }

    /**
     * Gets the max spectators for this game.
     * 
     * @returns the max spectators for this game
     */
    getMaxSpectators() {
        return this.settings.maxSpectators;
    }

    /**
     * Set the max spectators for this game.
     * 
     * @param maxSpectators the new max spectators
     */
    setMaxSpectators(maxSpectators: number): GameStatusCode {
        if (this.state !== GameState.Lobby) {
            return GameStatusCode.NOT_IN_LOBBY_STATE;
        }

        this.settings.maxSpectators = maxSpectators;
        return GameStatusCode.ACTION_OK;
    }

    /**
     * Gets the game settings object
     * @returns the game settings
     */
    getSettings(): GameSettings {
        return this.settings;
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
     * 
     * @returns NOT_IN_LOBBY_STATE: if the game is not in the lobby state
     * 
     *          NOT_ENOUGH_PLAYERS: if there are not at least 3 players
     * 
     *          NOT_ENOUGH_BLACK_CARDS: if there are not at least 50 black cards
     * 
     *          NOT_ENOUGH_WHITE_CARDS: if there are not at least 20 * PlayerCount white cards
     * 
     *          ACTION_OK: if the game has been started
     */
    start(): GameStatusCode {
        if (this.state !== GameState.Lobby) {
            return GameStatusCode.NOT_IN_LOBBY_STATE;
        }

        if (this.players.length < Game.MINIMUM_PLAYERS) {
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

        this.beginNextRound();

        return GameStatusCode.ACTION_OK;
    }

    /**
     * Stops the game by forcing it into the reset state.
     * The game will flow through reset back into the
     * lobby state.
     * 
     * @returns NOT_IN_PROGRESS: if the game is already in 
     *          the lobby state
     * 
     *          ACTION_OK: if the game has been forced into
     *          the reset state
     */
    stop(): GameStatusCode {
        if (this.state === GameState.Lobby) {
            return GameStatusCode.NOT_IN_PROGRESS;
        }

        this.resetState();
        return GameStatusCode.ACTION_OK;
    }

    private beginNextRound() {
        this.playedWhiteCards.forEach((cards) => {
            cards.forEach(card => this.discardedWhiteCards.push(card));
        });

        this.playedWhiteCards.clear();

        this.rotateJudge();

        this.roundNumber++;

        this.event("beginNextRound", { round: this.roundNumber });

        this.dealingState();
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
    private dealingState() {
        if (this.state !== GameState.Lobby && this.state !== GameState.Judging) {
            this.event("illegalStateTransition", { from: this.state, to: GameState.Dealing });
            this.resetState();
            return;
        }

        this.state = GameState.Dealing;
        this.event("stateTransition", { to: GameState.Dealing });

        // discard last round's white cards (if any)
        this.playedWhiteCards.forEach((cards) => this.discardedWhiteCards.push(...cards));
        this.playedWhiteCards.clear();

        // discard last round's black card (if any)
        if (this.currentBlackCard) {
            this.discardedBlackCards.push(this.currentBlackCard);
            this.currentBlackCard = null;
        }

        // deal white cards to all players until everyone has 10 cards
        this.players.forEach(player => {
            while (player.getHand().length < 10) {
                const nextWhiteCard = this.availableWhiteCards.shift();

                if (!nextWhiteCard) {
                    this.availableWhiteCards.push(...this.discardedWhiteCards);
                    this.discardedWhiteCards.length = 0;
                    ArrayShuffler.shuffle(this.availableWhiteCards);
                    continue;
                }

                player.dealCard(nextWhiteCard);
                this.event("dealCardToPlayer", { userId: player.getUser().id, card: nextWhiteCard });
            }
        });

        // deal new black card
        while (!this.currentBlackCard) {
            const nextBlackCard = this.availableBlackCards.shift();

            if (!nextBlackCard) {
                this.availableBlackCards.push(...this.discardedBlackCards);
                this.discardedBlackCards.length = 0;
                ArrayShuffler.shuffle(this.availableBlackCards);
                continue;
            }

            this.currentBlackCard = nextBlackCard;
            this.event("dealBlackCard", { card: nextBlackCard });
        }

        this.playingState();
    }

    /**
     * Playing state: all users must play white cards 
     * for the current black card. Once all have played, 
     * game moves to judging state.
     * 
     * Returns true if state processing succeeded and 
     * the game has moved to the next state. False otherwise.
     */
    private playingState() {
        if (this.state !== GameState.Dealing) {
            this.event("illegalStateTransition", { from: this.state, to: GameState.Playing });
            this.resetState();
            return;
        }

        this.state = GameState.Playing;
        this.event("stateTransition", { to: GameState.Playing });

        // And now we wait for players to play.
    }

    /**
     * Plays the given cards on behalf of the player.
     * Removes the cards from the player's deck and adds
     * them to the played cards pile. If this is the
     * last player who needed to play cards, the game
     * moves on to the judging state.
     * 
     * @param player the player who has played cards
     * @param cards the cards being played
     * 
     * @returns NOT_IN_PLAYING_STATE: if it is not the
     *          right time for the player to play cards
     * 
     *          IS_THE_JUDGE: if the player is not playing
     *          this round (is currently the judge)
     * 
     *          NOT_ENOUGH_CARDS: if the player is playing
     *          fewer cards than the current black card's
     *          "pick" value
     * 
     *          TOO_MANY_CARDS: if the player is playing
     *          more cards than the current black card's
     *          "pick" value
     * 
     *          INVALID_CARDS: if the cards are not in the
     *          player's hand (tried to play random cards)
     * 
     *          ACTION_OK: if the cards have been played
     */
    playCards(player: Player, cards: string[]): GameStatusCode {
        if (this.state !== GameState.Playing) {
            return GameStatusCode.NOT_IN_PLAYING_STATE;
        }

        if (player.getState() === PlayerState.Judge) {
            return GameStatusCode.IS_THE_JUDGE;
        }
        
        if (cards.length < this.currentBlackCard.pick) {
            return GameStatusCode.NOT_ENOUGH_CARDS;
        }

        if (cards.length > this.currentBlackCard.pick) {
            return GameStatusCode.TOO_MANY_CARDS;
        }

        if (!cards.every(card => player.getHand().map(c => c.id).includes(card))) {
            return GameStatusCode.INVALID_CARDS;
        }

        this.playedWhiteCards.set(player, player.removeCardsFromHand(cards));

        if (this.playedWhiteCards.size === this.getPlayerCount()) {
            this.judgingState();
        }

        return GameStatusCode.ACTION_OK;
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
    private judgingState() {
        if (this.state !== GameState.Playing) {
            this.event("illegalStateTransition", { from: this.state, to: GameState.Judging });
            this.resetState();
            return;
        }

        this.state = GameState.Judging;
        this.event("stateTransition", { to: GameState.Judging });

        // And now we wait for the judge to...judge.
    }
    
    /**
     * Judges the given cards to be the winning cards of the round.
     * Performs a reverse lookup to identify the winning player and
     * then increments their score. The game then evaluates if there
     * is a winner (max score reached) or if a new round shall begin.
     * If there is a winner, the game transitions to Win state.
     * Otherwise, the game cleans up and transitions to Dealing state.
     * 
     * @param judgedCards the cards that have been judged
     * 
     * @returns NOT_IN_JUDGING_STATE: if it is not the 
     *          right time for the player to judge cards
     * 
     *          IS_NOT_THE_JUDGE: if the player is not the
     *          judge for this round
     * 
     *          NOT_ENOUGH_CARDS: if the player is judging
     *          fewer cards than the current black card's
     *          "pick" value
     * 
     *          TOO_MANY_CARDS: if the player is judging
     *          more cards than the current black card's
     *          "pick" value
     * 
     *          INVALID_CARDS: if the cards are not in the
     *          played cards pile.
     * 
     *          ACTION_OK: if the cards have been played
     */
    judgeCards(player: Player, judgedCards: string[]): GameStatusCode {
        if (this.state !== GameState.Judging) {
            return GameStatusCode.NOT_IN_JUDGING_STATE;
        }

        if (player.getState() !== PlayerState.Judge) {
            return GameStatusCode.IS_NOT_THE_JUDGE;
        }

        if (judgedCards.length < this.currentBlackCard.pick) {
            return GameStatusCode.NOT_ENOUGH_CARDS;
        }

        if (judgedCards.length > this.currentBlackCard.pick) {
            return GameStatusCode.TOO_MANY_CARDS;
        }

        const winner = [...this.playedWhiteCards].find(
            ([, playedCards]) => playedCards
                .map(c => c.id)
                .every(c => judgedCards.includes(c))
        );

        if (!winner) {
            return GameStatusCode.INVALID_CARDS;
        }

        winner[0].incrementScore();

        this.event('roundWinner', { 
            userId: winner[0].getUser().id, 
            nickname: winner[0].getUser().nickname,
            winningCards: winner[1]
        })

        if (this.thereIsAGameWinner()) {
            this.winState();
        } else {
            this.dealingState();
        }

        return GameStatusCode.ACTION_OK;
    }

    /**
     * Gets the winner of the game, if any, by pulling the
     * first player that has a score of {@link getMaxScore}.
     * 
     * @returns the winning player or null
     */
    private getGameWinner(): Player {
        return this.players.find(p => p.getScore() === this.settings.maxScore);
    }

    /**
     * Determines if there is a winning player based on the
     * return value of {@link getGameWinner}.
     * 
     * @returns true or false
     */
    private thereIsAGameWinner(): boolean {
        return !!this.getGameWinner();
    }

    /**
     * Win state: winner of the round is declared, 
     * game is saved to historical repository, game 
     * moves to reset state.
     * 
     * This state is transient and will always move 
     * to the next state.
     */
    private winState() {
        if (this.state !== GameState.Judging) {
            this.event("illegalStateTransition", { from: this.state, to: GameState.Win });
            this.resetState();
            return;
        }

        this.state = GameState.Win;
        this.event("stateTransition", { to: GameState.Win });

        const winner = this.getGameWinner();
        this.event("gameWinner", { userId: winner.getUser().id, nickname: winner.getUser().nickname });

        this.event("resetWarning", { resetInSeconds: 15 });

        setTimeout(() => this.resetState, 15000);
    }

    /**
     * Reset state: game information is reset and 
     * game moves back to lobby state.
     * 
     * This state is transient and will always move 
     * to the next state.
     */
    private resetState() {
        this.state = GameState.Reset;
        this.event("stateTransition", { to: GameState.Reset });

        if (this.currentBlackCard) {
            this.availableBlackCards.push(this.currentBlackCard);
            this.currentBlackCard = undefined;
        }

        this.discardedBlackCards.forEach(c => this.availableBlackCards.push(c));
        this.discardedBlackCards.length = 0;

        ArrayShuffler.shuffle(this.availableBlackCards);

        this.playedWhiteCards.forEach(c => c.forEach(c2 => this.availableWhiteCards.push(c2)));
        this.playedWhiteCards.clear();

        this.discardedWhiteCards.forEach(c => this.availableWhiteCards.push(c));
        this.discardedWhiteCards.length = 0;

        this.players.forEach(p => {
            p.getHand().forEach(c => this.availableWhiteCards.push(c));
            p.clearHand();
            p.setScore(0);
        });

        ArrayShuffler.shuffle(this.availableWhiteCards);

        this.roundNumber = 0;

        this.state = GameState.Lobby;
        this.event("stateTransition", { to: GameState.Lobby });
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
    private rotateJudge(): void {
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
            this.emit(name, { ...payload, name, gameId: this.id });
        } else {
            this.emit(name, { name, gameId: this.id });
        }
    }
}