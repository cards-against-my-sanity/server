import { Injectable } from '@nestjs/common';
import { Game } from './game.entity';
import { DecksService } from 'src/decks/decks.service';
import { CardsService } from 'src/cards/cards.service';
import { User } from 'src/users/entities/user.entity';
import { EventEmitter } from 'stream';
import { GameStatusCode } from './game-status-code';

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
    createGame(host: User): Game {
        if (this.getGameHostedBy(host)) {
            return null;
        }

        const game = new Game(host);
        
        game.on('playerJoinedGame', this.forwardEvent);
        game.on('playerLeftGame', this.forwardEvent);
        game.on('spectatorJoinedGame', this.forwardEvent);
        game.on('spectatorLeftGame', this.forwardEvent);
        game.on('gameStarted', this.forwardEvent);
        game.on('beginNextRound', this.forwardEvent);
        game.on('dealCardToPlayer', this.forwardEvent);
        game.on('dealBlackCard', this.forwardEvent);
        game.on('gameWinner', this.forwardEvent);
        game.on('resetWarning', this.forwardEvent);
        game.on('illegalStateTransition', this.forwardEvent);
        game.on('stateTransition', this.forwardEvent);
        
        this.games.push(game);
        return game;
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
    getGameHostedBy(user: User): Game {
        return this.games.find(g => g.getHost().id === user.id);
    }

    /**
     * Attempts to add the deck specified by the given
     * deck id to the game specified by the given game id.
     * 
     * @param gameId the id of the game to add the deck to
     * @param deckId the id of the deck to add to the game
     * @returns true if the deck was added, false if
     *          the game did not exist or the deck did
     *          not exist or the game was not in the
     *          Lobby state or the deck was already added
     *          to the game
     */
    async addDeckToGame(gameId: string, deckId: string): Promise<boolean> {
        const game = this.games.find(g => g.getId() === gameId);
        if (!game) {
            return false;
        }

        const deck = await this.decksService.findOne(deckId);
        if (!deck) {
            return false;
        }

        return game.addDeck(deck);
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
     *          not in the lobby state
     * 
     *          MAX_PLAYERS_REACHED: if the game
     *          has too many players and user is
     *          attempting to join as player
     * 
     *          ACTION_OK: if the player has been added
     */
    addPlayerToGame(gameId: string, user: User): GameStatusCode {
        const game = this.games.find(g => g.getId() === gameId);
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
        const game = this.games.find(g => g.getId() === gameId);
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
    addSpectatorToGame(gameId: string, user: User): GameStatusCode {
        const game = this.games.find(g => g.getId() === gameId);
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
        const game = this.games.find(g => g.getId() === gameId);
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
     * Forwards event onward to the gateway for final
     * handling
     * 
     * @param payload the payload contains the game id
     *                and any other relevant data on a
     *                contextual basis
     */
    private forwardEvent(payload: Record<string, any>) {
        this.emit(payload.name, { ...payload });
    }
}