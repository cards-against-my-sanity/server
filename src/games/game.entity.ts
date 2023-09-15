import { Player } from "./player.entity";
import { v4 as uuidv4 } from 'uuid';
import { Deck } from "src/decks/entities/deck.entity";
import { GameStatusCode } from "./game-status-code";
import { EventEmitter } from "stream";
import { Spectator } from "./spectator.entity";
import { GameSettings } from "./game-settings";
import { ArrayShuffler } from "src/util/misc/array-shuffler";
import { PlayerSerializer } from "src/util/serialization/player.serializer";
import { SpectatorSerializer } from "src/util/serialization/spectator.serializer";
import GameIdPayload from "src/shared-types/game/game-id.payload";
import RoundNumberPayload from "src/shared-types/game/component/round-number.payload";
import JudgeIdPayload from "src/shared-types/game/component/judge-id.payload";
import StateTransitionPayload from "src/shared-types/game/component/state-transition.payload";
import PartialPlayerPayload from "src/shared-types/game/player/partial-player.payload";
import IGame from "src/shared-types/game/game.interface";
import IPlayer from "src/shared-types/game/player/player.interface";
import IDeck from "src/shared-types/deck/deck.interface";
import WhiteCardPayload from "src/shared-types/card/white/white-card.payload";
import BlackCardPayload from "src/shared-types/card/black/black-card.payload";
import WhiteCardsPayload from "src/shared-types/card/white/white-cards.payload";
import IWhiteCard from "src/shared-types/card/white/white-card.interface";
import IBlackCard from "src/shared-types/card/black/black-card.interface";
import { GameState } from "src/shared-types/game/game-state.enum";
import { PlayerState } from "src/shared-types/game/player/player-state.enum";
import PlayerPayload from "src/shared-types/game/player/player.payload";
import SpectatorPayload from "src/shared-types/game/spectator/spectator.payload";
import PlayerIdPayload from "src/shared-types/game/player/player-id.payload";
import SpectatorIdPayload from "src/shared-types/game/spectator/spectator-id.payload";
import WhiteCardsMatrixPayload from "src/shared-types/card/white/white-cards-matrix.payload";
import IUser from "src/shared-types/user/user.interface";
import { setTimeout, clearTimeout } from "timers";
import SecondsPayload from "src/shared-types/game/component/seconds.payload";

export class Game extends EventEmitter implements IGame {
    static readonly MINIMUM_PLAYERS = 3;
    static readonly MINIMUM_BLACK_CARDS = 50;
    static readonly MINIMUM_WHITE_CARDS_PER_PLAYER = 20;

    id: string;
    host: Partial<IPlayer>;
    decks: IDeck[] = [];
    settings: GameSettings = new GameSettings();
    state: GameState = GameState.Lobby;
    players: Player[] = [];
    spectators: Spectator[] = [];
    roundNumber: number = 0;

    private readonly availableWhiteCards: IWhiteCard[] = [];
    private readonly playedWhiteCards: Map<Player, IWhiteCard[]> = new Map();
    private readonly discardedWhiteCards: IWhiteCard[] = [];

    private currentBlackCard: IBlackCard;
    private readonly availableBlackCards: IBlackCard[] = [];
    private readonly discardedBlackCards: IBlackCard[] = [];

    private timeoutReference: NodeJS.Timeout | null = null;

    constructor(hostUser: IUser) {
        super();

        this.id = uuidv4();

        this.host = {
            id: hostUser.id,
            nickname: hostUser.nickname
        }

        this.players.push(new Player(hostUser));
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
     * Gets the partial IPlayer representing the game host
     * 
     * @returns the partial IPlayer representing the game host
     */
    getHost(): Partial<IPlayer> {
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

        if (!this.decks.map(d => d.id).includes(deck.id)) {
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
    setCards(blackCards: IBlackCard[], whiteCards: IWhiteCard[]) {
        this.availableBlackCards.length = 0;
        this.discardedBlackCards.length = 0;
        this.availableBlackCards.push(...blackCards);
        ArrayShuffler.shuffle(this.availableBlackCards);

        this.availableWhiteCards.length = 0;
        this.discardedWhiteCards.length = 0;
        this.availableWhiteCards.push(...whiteCards);
        ArrayShuffler.shuffle(this.availableWhiteCards);
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
     *          not in the lobby state and players
     *          are now allowed to join mid game
     * 
     *          MAX_PLAYERS_REACHED: if the game
     *          has too many players
     * 
     *          ACTION_OK: if the player has been 
     *          added
     */
    addPlayer(user: IUser): GameStatusCode {
        if (this.state !== GameState.Lobby && !this.getAllowPlayersToJoinMidGame()) {
            return GameStatusCode.NOT_IN_LOBBY_STATE;
        }

        if (this.players.length + 1 > this.settings.maxPlayers) {
            return GameStatusCode.MAX_PLAYERS_REACHED;
        }

        const player = new Player(user);

        this.players.push(player);

        this.emitPlayerJoinedGame({ player: PlayerSerializer.serialize(player) });

        this.emitSystemMessage(`${user.nickname} has joined the game`);

        return GameStatusCode.ACTION_OK;
    }

    /**
     * Gets a specific player by id
     * @param id the user id of the player to get
     * @returns the player or undefined
     */
    getPlayer(id: string): Player {
        return this.players.find(p => p.id === id);
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
        const idx = this.players.findIndex(p => p.id === id);
        if (idx === -1) {
            return GameStatusCode.NOT_IN_GAME;
        }

        this.emitSystemMessage(`${this.players[idx].nickname} has left the game`);

        if (this.players.length === 1) {
            this.players.splice(0, 1);
        } else {
            const nextPlayerIndex = (idx + 1) % this.players.length;

            if (this.players[idx].state === PlayerState.Judge) {
                this.players[nextPlayerIndex].state = PlayerState.Judge;
            }

            this.players.splice(idx, 1);
        }

        this.emitPlayerLeftGame({ playerId: id });

        if (this.getHost().id === id) {
            this.emitStateTransition({ to: GameState.Abandoned, from: this.state });
            this.state = GameState.Abandoned;
        } else if (this.players.length < Game.MINIMUM_PLAYERS) {
            if (![GameState.Lobby, GameState.Abandoned].includes(this.state)) {
                this.emitSystemMessage("Too many players have left the game. The game will reset.");
                this.resetState();
            }
        }

        if (this.players.length === 0) {
            this.emitGameEmpty();
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
    addSpectator(user: IUser): GameStatusCode {
        if (this.spectators.length + 1 > this.settings.maxSpectators) {
            return GameStatusCode.MAX_SPECTATORS_REACHED;
        }

        const spectator = new Spectator(user);

        this.spectators.push(spectator);

        this.emitSpectatorJoinedGame({ spectator: SpectatorSerializer.serialize(spectator) });

        this.emitSystemMessage(`${user.nickname} has started spectating the game`);

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
        return this.spectators.map(s => s.id).includes(id);
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
        const idx = this.spectators.findIndex(s => s.id === id);
        if (idx === -1) {
            return GameStatusCode.NOT_SPECTATING_GAME;
        }

        this.emitSystemMessage(`${this.spectators[idx].nickname} has stopped spectating the game`);

        this.spectators = this.spectators.filter(s => s.id !== id);

        this.emitSpectatorLeftGame({ spectatorId: id });



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
     * Gets the current round intermission in seconds
     * @returns the round intermission in seconds
     */
    getRoundIntermissionTimer(): number {
        return this.settings.roundIntermissionTimer;
    }

    /**
     * Sets the round intermission in seconds
     * @param seconds the round intermission in seconds
     * @returns ACTION_OK - the round intermission was set
     */
    setRoundIntermissionTimer(seconds: number): GameStatusCode {
        if (seconds < 0) {
            seconds = 0;
        }

        this.settings.roundIntermissionTimer = seconds;
        return GameStatusCode.ACTION_OK;
    }

    /**
     * Gets the current game win intermission in seconds
     * @returns the game win intermission in seconds
     */
    getGameWinIntermissionTimer(): number {
        return this.settings.gameWinIntermissionTimer;
    }

    /**
     * Sets the game win intermission in seconds
     * @param seconds the game win intermission in seconds
     * @returns ACTION_OK - the game win intermission was set
     */
    setGameWinIntermissionTimer(seconds: number): GameStatusCode {
        if (seconds < 0) {
            seconds = 0;
        }

        this.settings.gameWinIntermissionTimer = seconds;
        return GameStatusCode.ACTION_OK;
    }

    /**
     * Gets the current playing timer in seconds
     * @returns the playing timer in seconds
     */
    getPlayingTimer(): number {
        return this.settings.playingTimer;
    }

    /**
     * Sets the playing timer in seconds
     * @param seconds the playing timer in seconds
     * @returns ACTION_OK - the playing timer was set
     */
    setPlayingTimer(seconds: number): GameStatusCode {
        if (seconds < 15) {
            seconds = 15;
        }

        this.settings.playingTimer = seconds;
        return GameStatusCode.ACTION_OK;
    }

    /**
     * Gets the current judging timer in seconds
     * @returns the judging timer in seconds
     */
    getJudgingTimer(): number {
        return this.settings.judgingTimer;
    }

    /**
     * Sets the judging timer in seconds
     * @param seconds the judging timer in seconds
     * @returns ACTION_OK - the judging timer was set
     */
    setJudgingTimer(seconds: number): GameStatusCode {
        if (seconds < 15) {
            seconds = 15;
        }

        this.settings.judgingTimer = seconds;
        return GameStatusCode.ACTION_OK;
    }

    /**
     * Gets whether players are allowed to join mid game
     * @returns true if they are, false otherwise
     */
    getAllowPlayersToJoinMidGame(): boolean {
        return this.settings.allowPlayersToJoinMidGame;
    }

    /**
     * Sets whether players are allowed to join mid game
     * @param allow true if they are, false otherwise
     * @returns ACTION_OK - the setting has been changed
     */
    setAllowPlayersToJoinMidGame(allow: boolean): GameStatusCode {
        this.settings.allowPlayersToJoinMidGame = allow;
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

        this.emitSystemMessage("The game has been started. GLHF!");

        const initialJudgeIdx = Math.floor(Math.random() * (this.players.length - 1));
        this.players[initialJudgeIdx].state = PlayerState.Judge;

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

        this.emitSystemMessage("The game has been stopped by the host.");

        this.resetState();

        return GameStatusCode.ACTION_OK;
    }

    private beginNextRound() {
        this.playedWhiteCards.forEach((cards) => {
            cards.forEach(card => this.discardedWhiteCards.push(card));
        });

        this.playedWhiteCards.clear();

        const judgeIdx = this.rotateJudge();

        this.roundNumber++;

        this.emitSystemMessage(`The next round has begun. This round's judge is ${this.players[judgeIdx].nickname}.`)

        this.emitBeginNextRound({ judgeId: this.players[judgeIdx].id, roundNumber: this.roundNumber });

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
        if (this.state !== GameState.Lobby && this.state !== GameState.Playing && this.state !== GameState.Judging) {
            this.emitIllegalStateTransition({ to: GameState.Dealing, from: this.state });
            this.resetState();
            return;
        }

        this.emitStateTransition({ to: GameState.Dealing, from: this.state });
        this.state = GameState.Dealing;

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

                this.emitDealCardToPlayer({ card: nextWhiteCard, player: { id: player.id } });
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

            this.emitDealBlackCard({ card: nextBlackCard });
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
            this.emitIllegalStateTransition({ from: this.state, to: GameState.Playing });
            this.resetState();
            return;
        }

        this.emitStateTransition({ to: GameState.Playing, from: this.state });
        this.state = GameState.Playing;

        this.players.forEach(p => {
            if (p.state !== PlayerState.Judge) {
                p.needToPlay = true;
            } else {
                p.needToPlay = false;
            }
        });

        this.setGameTimeout(this.getPlayingTimer(), () => {
            this.players.forEach(player => {
                if (player.needToPlay) {
                    this.emitSystemMessage(`${player.nickname} has been kicked from the game for taking too long to play a card.`);
                    this.removePlayer(player.id);
                }
            });

            // if removePlayer threw the game into Reset,
            // the game transitions to Lobby before removePlayer
            // returns
            if (this.state !== GameState.Lobby) {
                this.judgingState();
            }
        });
    }

    /**
     * Plays the given cards on behalf of the player.
     * Removes the cards from the player's deck and adds
     * them to the played cards pile. If this is the
     * last player who needed to play cards, the game
     * moves on to the judging state.
     * 
     * @param id the id of the player who is performing
     *           the action
     * @param cards the cards being played
     * 
     * @returns NOT_IN_PLAYING_STATE: if it is not the
     *          right time for the player to play cards
     * 
     *          NOT_IN_GAME: if the provided player id is
     *          not a player in this game
     * 
     *          IS_THE_JUDGE: if the player is not playing
     *          this round (is currently the judge)
     * 
     *          DO_NOT_NEED_TO_PLAY: if the player is not
     *          marked as needing to play right now
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
    playCards(id: string, cards: string[]): GameStatusCode {
        if (this.state !== GameState.Playing) {
            return GameStatusCode.NOT_IN_PLAYING_STATE;
        }

        const player = this.getPlayer(id);
        if (!player) {
            return GameStatusCode.NOT_IN_GAME;
        }

        if (player.state === PlayerState.Judge) {
            return GameStatusCode.IS_THE_JUDGE;
        }

        if (!player.needToPlay) {
            return GameStatusCode.DO_NOT_NEED_TO_PLAY;
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

        player.needToPlay = false;

        if (this.playedWhiteCards.size === this.getPlayerCount() - 1) {
            this.clearGameTimeout();
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
            this.emitIllegalStateTransition({ from: this.state, to: GameState.Judging });
            this.resetState();
            return;
        }

        this.emitStateTransition({ to: GameState.Judging, from: this.state });

        this.emitCardsToJudge({
            matrix: [...this.playedWhiteCards].map(e => e[1])
        })

        this.state = GameState.Judging;

        this.players.forEach(p => {
            p.needToPlay = p.state === PlayerState.Judge;
        });

        this.setGameTimeout(this.getJudgingTimer(), () => {
            const judge = this.players.find(p => p.state === PlayerState.Judge);
            if (judge) {
                this.emitSystemMessage(`${judge.nickname} has been kicked from the game for taking too long to judge cards.`);
                this.removePlayer(judge.id);

                // if removePlayer threw the game into Reset,
                // the game transitions to Lobby before removePlayer
                // returns
                if (this.state !== GameState.Lobby) {
                    this.returnPlayedCardsToHands();
                    this.beginNextRound();
                }
            }
        });
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
     *          NOT_IN_GAME: if the provided player id is
     *          not a player in this game
     * 
     *          IS_NOT_THE_JUDGE: if the player is not the
     *          judge for this round
     * 
     *          DO_NOT_NEED_TO_PLAY: if the player is not
     *          marked as needing to play right now
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
    judgeCards(id: string, judgedCards: string[]): GameStatusCode {
        if (this.state !== GameState.Judging) {
            return GameStatusCode.NOT_IN_JUDGING_STATE;
        }

        const player = this.getPlayer(id);
        if (!player) {
            return GameStatusCode.NOT_IN_GAME;
        }

        if (player.state !== PlayerState.Judge) {
            return GameStatusCode.IS_NOT_THE_JUDGE;
        }

        if (!player.needToPlay) {
            console.error("Judge tried to play while needToPlay = false. This is probably a bug.");
            return GameStatusCode.DO_NOT_NEED_TO_PLAY;
        }

        if (judgedCards.length < this.currentBlackCard.pick) {
            return GameStatusCode.NOT_ENOUGH_CARDS;
        }

        if (judgedCards.length > this.currentBlackCard.pick) {
            return GameStatusCode.TOO_MANY_CARDS;
        }

        this.clearGameTimeout();

        const winner = [...this.playedWhiteCards].find(
            ([, playedCards]) => playedCards
                .map(c => c.id)
                .every(c => judgedCards.includes(c))
        );

        if (!winner) {
            return GameStatusCode.INVALID_CARDS;
        }

        winner[0].score++;

        this.emitSystemMessage(`${winner[0].nickname} has won the round. One point awarded.`);

        this.emitRoundWinner({
            cards: winner[1],
            player: {
                id: winner[0].id,
                nickname: winner[0].nickname
            }
        });

        if (this.thereIsAGameWinner()) {
            this.winState();
        } else {
            const seconds = this.getRoundIntermissionTimer();
            if (seconds > 0) {
                this.emitSystemMessage(`The next round will begin in ${seconds} seconds.`);
                this.setGameTimeout(seconds, () => this.beginNextRound());
            } else {
                this.beginNextRound();
            }
        }

        return GameStatusCode.ACTION_OK;
    }

    /**
     * Returns any played cards to the hands of those who
     * played them. This happens if a timer lapses. I.e.,
     * the judge does not judge in time.
     */
    private returnPlayedCardsToHands() {
        this.emitSystemMessage("Previously played cards are being returned to hands.");
        
        this.playedWhiteCards.forEach((value, key) => {
            value.forEach(card => {
                key.dealCard(card);
                this.emitDealCardToPlayer({ card, player: key });
            })
        });

        this.playedWhiteCards.clear();
    }

    /**
     * Gets the winner of the game, if any, by pulling the
     * first player that has a score of {@link getMaxScore}.
     * 
     * @returns the winning player or null
     */
    private getGameWinner(): Player {
        return this.players.find(p => p.score === this.settings.maxScore);
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
            this.emitIllegalStateTransition({ from: this.state, to: GameState.Win });
            this.resetState();
            return;
        }

        this.emitStateTransition({ to: GameState.Win, from: this.state });
        this.state = GameState.Win;

        this.emitSystemMessage(`${this.getGameWinner().nickname} has won the game. Congratulations!`);

        const seconds = this.getGameWinIntermissionTimer();
        if (seconds > 0) {
            this.emitSystemMessage(`The game will return to the lobby in ${seconds} seconds.`);
            this.setGameTimeout(seconds, () => this.resetState());
        } else {
            this.resetState();
        }
    }

    /**
     * Reset state: game information is reset and 
     * game moves back to lobby state.
     * 
     * This state is transient and will always move 
     * to the next state.
     */
    private resetState() {
        this.emitStateTransition({
            to: GameState.Reset, from: this.state
        });

        this.clearGameTimeout();

        this.state = GameState.Reset;

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
            p.score = 0;
        });

        ArrayShuffler.shuffle(this.availableWhiteCards);

        this.roundNumber = 0;

        this.emitStateTransition({ to: GameState.Lobby, from: this.state });
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
    private rotateJudge(): number {
        const currentJudgeIdx = this.players.findIndex(p => p.state === PlayerState.Judge);
        if (currentJudgeIdx === -1) {
            this.players[0].state = PlayerState.Judge;
            return 0;
        }

        this.players[currentJudgeIdx].state = PlayerState.Player;

        const nextJudgeIdx = (currentJudgeIdx + 1) % this.players.length;

        this.players[nextJudgeIdx].state = PlayerState.Judge;

        return nextJudgeIdx;
    }

    /**
     * Sets the tracked timeout. If there is already a timeout,
     * that timeout is first cancelled.
     * 
     * @param timeout the time to wait
     * @param action the action to perform after the time to wait
     */
    private setGameTimeout(timeout: number, action: () => void): void {
        if (this.timeoutReference) {
            this.clearGameTimeout();
        }

        this.timeoutReference = setTimeout(action, timeout * 1000);

        this.emitStartTimer({ seconds: timeout });
    }

    /**
     * Clears the tracked timeout, if any.
     */
    private clearGameTimeout(): void {
        if (!this.timeoutReference) {
            return;
        }

        clearTimeout(this.timeoutReference);

        this.emitClearTimer();
    }

    /** Game Events */

    private emitPlayerJoinedGame(payload: PlayerPayload) {
        this.event("playerJoinedGame", payload);
    }

    private emitPlayerLeftGame(payload: PlayerIdPayload) {
        this.event("playerLeftGame", payload);
    }

    private emitGameEmpty() {
        this.event("gameEmpty", {});
    }

    private emitSpectatorJoinedGame(payload: SpectatorPayload) {
        this.event("spectatorJoinedGame", payload);
    }

    private emitSpectatorLeftGame(payload: SpectatorIdPayload) {
        this.event("spectatorLeftGame", payload);
    }

    private emitSystemMessage(content: string) {
        this.event("systemMessage", {
            gameId: this.id,
            content
        });
    }

    private emitBeginNextRound(payload: JudgeIdPayload & RoundNumberPayload) {
        this.event("beginNextRound", payload);
    }

    private emitDealCardToPlayer(payload: WhiteCardPayload & PartialPlayerPayload) {
        this.event("dealCardToPlayer", payload);
    }

    private emitDealBlackCard(payload: BlackCardPayload) {
        this.event("dealBlackCard", payload);
    }

    private emitCardsToJudge(payload: WhiteCardsMatrixPayload) {
        this.event("cardsToJudge", payload);
    }

    private emitRoundWinner(payload: PartialPlayerPayload & WhiteCardsPayload) {
        this.event("roundWinner", payload);
    }

    private emitStartTimer(payload: SecondsPayload) {
        this.event("startTimer", payload);
    }

    private emitClearTimer() {
        this.event("clearTimer", {});
    }

    private emitStateTransition(payload: StateTransitionPayload) {
        this.event("stateTransition", payload);
    }

    private emitIllegalStateTransition(payload: StateTransitionPayload) {
        this.event("illegalStateTransition", payload);
    }

    private event(event: string, payload: any) {
        this.emit(event, { ...payload, gameId: this.id, event });
    }
}