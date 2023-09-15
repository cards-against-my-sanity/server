import { Injectable } from '@nestjs/common';
import { Game } from './game.entity';
import { DecksService } from 'src/decks/decks.service';
import { EventEmitter } from 'stream';
import { GameStatusCode } from './game-status-code';
import { CardsService } from 'src/cards/cards.service';
import GameIdPayload from 'src/shared-types/game/game-id.payload';
import IUser from 'src/shared-types/user/user.interface';

@Injectable()
export class GamesService extends EventEmitter {
    private games: Game[] = [];

    constructor(
        private readonly decksService: DecksService,
        private readonly cardsService: CardsService
    ) {
        super();
    }

    /**
     * Create a new game hosted by the specified user ID.
     * 
     * @param host the user id of the host
     * 
     * @returns the created game or null if the user is
     *          already hosting a game
     */
    createGame(host: IUser): Game {
        if (this.getGameHostedBy(host)) {
            return null;
        }

        const game = new Game(host);

        game.on('playerJoinedGame', this.forwardEvent.bind(this));
        game.on('playerLeftGame', this.forwardEvent.bind(this));
        game.on('gameEmpty', this.handleGameEmpty.bind(this));
        game.on('spectatorJoinedGame', this.forwardEvent.bind(this));
        game.on('spectatorLeftGame', this.forwardEvent.bind(this));
        game.on('systemMessage', this.forwardEvent.bind(this));
        game.on('beginNextRound', this.forwardEvent.bind(this));
        game.on('dealCardToPlayer', this.forwardEvent.bind(this));
        game.on('dealBlackCard', this.forwardEvent.bind(this));
        game.on('cardsToJudge', this.forwardEvent.bind(this));
        game.on('roundWinner', this.forwardEvent.bind(this));
        game.on('stateTransition', this.forwardEvent.bind(this));
        game.on('illegalStateTransition', this.forwardEvent.bind(this));

        this.games.push(game);
        return game;
    }

    /**
     * Attempts to start the game specified by the given
     * id. Loads the cards for the decks that have been
     * added to the game.
     * 
     * @param id the game id to start
     * 
     * @returns UNKNOWN_GAME: if the game could not be found.
     * 
     *          NOT_IN_LOBBY_STATE: if the game is not in the lobby state
     * 
     *          NOT_ENOUGH_PLAYERS: if there are not at least 3 players
     * 
     *          NOT_ENOUGH_BLACK_CARDS: if there are not at least 50 black cards
     * 
     *          NOT_ENOUGH_WHITE_CARDS: if there are not at least 20 * PlayerCount white cards
     * 
     *          ACTION_OK: if the game has been started
     */
    async startGame(id: string): Promise<GameStatusCode> {
        const game = this.getGame(id);
        if (!game) {
            return GameStatusCode.UNKNOWN_GAME;
        }

        const { black, white } = (await Promise.all(game.getDecks()
            .map(async (deck) => ({
                black: await this.cardsService.findAllBlackCardsInDeck(deck.id),
                white: await this.cardsService.findAllWhiteCardsInDeck(deck.id)
            }))))
            .reduce((acc, cur) => ({
                black: acc.black.concat(cur.black),
                white: acc.white.concat(cur.white)
            }), { black: [], white: [] });

        game.setCards(black, white);

        return game.start();
    }

    /**
     * Gets the currently hosted game IDs
     * 
     * @returns the game IDs
     */
    getGames() {
        return this.games.slice();
    }

    /**
     * Gets the game specified by the given id
     * 
     * @param id the id of the game to get
     * @returns the game specified by the given id
     */
    getGame(id: string) {
        return this.games.find(g => g.getId() === id);
    }

    /**
     * Gets the Game, if any, hosted by the given User
     * 
     * @param user the User hosting the game
     * @returns the Game hosted by the User if any
     */
    getGameHostedBy(user: IUser): Game {
        return this.games.find(g => g.getHost().id === user.id);
    }

    /**
     * Gets the Game, if any, that has the given User as a player
     * 
     * @param user the User playing the game
     * @returns the Game the User is playing
     */
    getGameWithPlayer(user: IUser): Game {
        return this.games.find(g => g.hasPlayer(user.id));
    }

    /**
     * Gets the Game, if any, that has the given User as a spectator
     * 
     * @param user the User spectating the game
     * @returns the Game the User is spectating
     */
    getGameWithSpectator(user: IUser): Game {
        return this.games.find(g => g.hasSpectator(user.id));
    }

    /**
     * Gets the Game, if any, that has the given User as a player
     * or spectator
     * 
     * @param user the User playing or spectating the game
     * @returns the Game the User is playing or spectating
     */
    getGameWithPlayerOrSpectator(user: IUser): Game {
        return this.games.find(g => g.hasPlayer(user.id) || g.hasSpectator(user.id));
    }

    /**
     * Attempts to add the deck specified by the given
     * deck id to the game specified by the given game id.
     * 
     * @param gameId the id of the game to add the deck to
     * @param deckId the id of the deck to add to the game
     * 
     * @returns UNKNOWN_GAME: if the game could not be found
     * 
     *          UNKNOWN_DECK: if the deck could not be found
     * 
     *          NOT_IN_LOBBY_STATE: if the game is not in
     *          the lobby state
     * 
     *          DECK_ALREADY_ADDED: if the deck was already
     *          added to this game
     * 
     *          ACTION_OK: if the deck was added successfully
     */
    async addDeckToGame(gameId: string, deckId: string): Promise<GameStatusCode> {
        const game = this.getGame(gameId);
        if (!game) {
            return GameStatusCode.UNKNOWN_GAME;
        }

        const deck = await this.decksService.findOne(deckId);
        if (!deck) {
            return GameStatusCode.UNKNOWN_DECK;
        }

        return game.addDeck(deck);
    }

    /**
     * Attempts to remove the deck specified by the given
     * deck id to the game specified by the given game id.
     * 
     * @param gameId the id of the game to add the deck to
     * @param deckId the id of the deck to add to the game
     * 
     * @returns UNKNOWN_GAME: if the game could not be found
     * 
     *          UNKNOWN_DECK: if the deck could not be found
     * 
     *          NOT_IN_LOBBY_STATE: if the game is not in
     *          the lobby state
     * 
     *          DECK_NOT_IN_GAME: if the deck was already
     *          added to this game
     * 
     *          ACTION_OK: if the deck was removed successfully
     */
    async removeDeckFromGame(gameId: string, deckId: string): Promise<GameStatusCode> {
        const game = this.getGame(gameId);
        if (!game) {
            return GameStatusCode.UNKNOWN_GAME;
        }

        const deck = await this.decksService.findOne(deckId);
        if (!deck) {
            return GameStatusCode.UNKNOWN_DECK;
        }

        return game.removeDeck(deck);
    }

    /**
     * Attempts to add the given user to the game specified
     * by the given game id as a player.
     * 
     * @param gameId the id of the game to add the user to
     * @param user the user to add to the game
     * 
     * @returns UNKNOWN_GAME: if the game does not exist
     * 
     *          ALREADY_IN_GAME: if the user is already
     *          playing in a game.
     * 
     *          ALREADY_SPECTATING: if the user is already
     *          spectating a game.
     *
     *          NOT_IN_LOBBY_STATE: if the game is
     *          not in the lobby state and players are
     *          not allowed to join mid game
     * 
     *          MAX_PLAYERS_REACHED: if the game
     *          has too many players and user is
     *          attempting to join as player
     * 
     *          ACTION_OK: if the player has been added
     */
    addPlayerToGame(gameId: string, user: IUser): GameStatusCode {
        const game = this.getGame(gameId)
        if (!game) {
            return GameStatusCode.UNKNOWN_GAME;
        }

        if (this.games.some(g => g.hasPlayer(user.id))) {
            return GameStatusCode.ALREADY_IN_GAME;
        }

        if (this.games.some(g => g.hasSpectator(user.id))) {
            return GameStatusCode.ALREADY_SPECTATING;
        }

        return game.addPlayer(user);
    }

    /**
     * Attempts to remove the user specified by the given user id,
     * as player, from the game specified by the given game id.
     * 
     * @param gameId the id of the game to remove the user from
     * @param userId the id of the user to remove from the game
     * 
     * @returns UNKNOWN_GAME: if the game does not
     *          exist
     *          
     *          NOT_IN_GAME: if the user is not playing
     *          the game
     * 
     *          ACTION_OK: if the user has been
     *          removed as player
     */
    removePlayerFromGame(gameId: string, userId: string): GameStatusCode {
        const game = this.getGame(gameId);
        if (!game) {
            return GameStatusCode.UNKNOWN_GAME;
        }

        return game.removePlayer(userId);
    }

    /**
     * Attempts to add the given user to the game specified
     * by the given game id as a spectator.
     * 
     * @param gameId the id of the game to add the user to
     * @param user the user to add to the game
     * 
     * @returns UNKNOWN_GAME: if the game does not exist
     * 
     *          ALREADY_IN_GAME: if the user is already
     *          playing in a game.
     * 
     *          ALREADY_SPECTATING: if the user is already
     *          spectating a game.
     * 
     *          MAX_SPECTATORS_REACHED: if the game
     *          has too many spectators.
     * 
     *          ACTION_OK: if the player has been added
     */
    addSpectatorToGame(gameId: string, user: IUser): GameStatusCode {
        const game = this.getGame(gameId);
        if (!game) {
            return GameStatusCode.UNKNOWN_GAME;
        }

        if (this.games.some(g => g.hasSpectator(user.id))) {
            return GameStatusCode.ALREADY_SPECTATING;
        }

        if (this.games.some(g => g.hasPlayer(user.id))) {
            return GameStatusCode.ALREADY_IN_GAME;
        }

        return game.addSpectator(user);
    }

    /**
     * Attempts to remove the user specified by the given user id,
     * as spectator, from the game specified by the given game id.
     * 
     * @param gameId the id of the game to remove the user from
     * @param userId the id of the user to remove from the game
     * 
     * @returns UNKNOWN_GAME: if the game does not
     *          exist
     *          
     *          NOT_SPECTATING_GAME: if the user is not playing
     *          the game
     * 
     *          ACTION_OK: if the user has been
     *          removed as player
     */
    removeSpectatorFromGame(gameId: string, userId: string): GameStatusCode {
        const game = this.getGame(gameId);
        if (!game) {
            return GameStatusCode.UNKNOWN_GAME;
        }

        return game.removeSpectator(userId);
    }

    /**
     * Removes the game specified by the given id
     * 
     * @param id the id of the game to remove
     */
    removeGame(id: string) {
        this.games = this.games.filter(g => g.getId() !== id);
    }

    /**
     * When a game emits that it is empty, the game is
     * removed by the service and then the service forwards
     * the 'gameRemoved' event.
     * 
     * @param payload the game empty payload
     */
    private handleGameEmpty(payload: GameIdPayload) {
        this.removeGame(payload.gameId);
        this.forwardEvent({ ...payload, name: 'gameRemoved' });
    }

    /**
     * Forwards event onward to the gateway for final
     * handling
     * 
     * @param payload the payload contains the game id
     *                and any other relevant data on a
     *                contextual basis
     */
    private forwardEvent(payload: Record<string, any>) {
        this.emit(payload.event, { ...payload });
    }
}