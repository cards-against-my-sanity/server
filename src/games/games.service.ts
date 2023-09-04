import { Injectable } from '@nestjs/common';
import { Game } from './game.entity';
import { DecksService } from 'src/decks/decks.service';
import { CardsService } from 'src/cards/cards.service';
import { User } from 'src/users/entities/user.entity';
import { EventEmitter } from 'stream';

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
     * @returns the id of the created game or null if the user is
     *          already hosting a game
     */
    createGame(host: User): string {
        if (this.getGameHostedBy(host)) {
            return null;
        }

        const game = new Game(host);

        this.games.push(game);

        return game.getId();
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
     * by the given game id.
     * 
     * @param gameId the id of the game to add the user to
     * @param user the user to add to the game
     * @returns true if the player has been added, false if
     *          the player is already in a game or if the
     *          game does not exist or if the game is not
     *          accepting players, or if the game already
     *          has the maximum amount of players.
     */
    addPlayerToGame(gameId: string, user: User): boolean {
        if (this.games.some(g => g.hasPlayer(user.id))) {
            return false;
        }

        const game = this.games.find(g => g.getId() === gameId);
        if (!game) {
            return false;
        }
        
        return game.addPlayer(user);
    }

    /**
     * Attempts to remove the user specified by the given user id
     * from the game specified by the given game id.
     * 
     * @param gameId the id of the game to remove the user from
     * @param userId the id of the user to remove from the game
     * @return true if the player has been removed, false if
     *         the player was not in the game or if the game
     *         did not exist
     */
    removePlayerFromGame(gameId: string, userId: string): boolean {
        const game = this.games.find(g => g.getId() === gameId);
        if (!game) {
            return false;
        }

        return game.removePlayer(userId);
    }

    /**
     * Removes the game specified by the given id
     * 
     * @param id the id of the game to remove
     */
    removeGame(id: string) {
        this.games = this.games.filter(g => g.getId() !== id);
    }
}