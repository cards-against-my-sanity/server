import { User } from "src/users/entities/user.entity";
import { GameState } from "../game-state.enum";
import { Player } from "./player.entity";
import { PlayerState } from "../player-state.enum";

export class Game {
    private state: GameState;
    private players: Player[];

    constructor(private readonly host: User) {
        this.state = GameState.Lobby;
        this.players = [];
    }

    /**
     * Lobby state: waits for game host to send start game event
     * Upon start game event, transition to dealing state.
     */
    lobbyState() {
        // TODO: write lobby
        this.state = GameState.Dealing;
    }

    /**
     * Dealing state: game automatically deals cards to all players,
     * then moves to playing state.
     */
    dealingState() {
        // TODO: write dealing
        this.state = GameState.Playing;
    }

    /**
     * Playing state: all users must play white cards for the current
     * black card. Once all have played, game moves to judging state
     */
    playingState() {
        // TODO: write playing
        this.state = GameState.Judging;
    }

    /**
     * Judging state: judge must choose the white card(s) that win the
     * round. Once the judge chooses, points are calculated. If a player
     * has won the round (reached max points), then the game moves to
     * the win state. Otherwise, game moves back to dealing state.
     */
    judgingState() {
        // TODO: write judging; fork in road
        // next state either Win, or back to Dealing
        this.state = GameState.Win;
    }

    /**
     * Win state: winner of the round is declared, game is saved to
     * historical repository, game moves to reset state.
     */
    winState() {
        // TODO: write win
        this.state = GameState.Reset;
    }

    /**
     * Reset state: game information is reset and game moves back to 
     * lobby state.
     */
    resetState() {
        // TODO: write reset
        this.state = GameState.Lobby;
    }

    /**
     * Adds a user to this game as a player
     * @param user the user to add
     * @returns false if the game is not accepting players (not in lobby state),
     *          true otherwise
     */
    addPlayer(user: User): boolean {
        if (this.state !== GameState.Lobby) {
            return false;
        }

        this.players.push(new Player(user));
        return true;
    }

    /**
     * Remove a player from the game by user id
     * If the removed player is the current judge, 
     * the next player in index order becomes the judge.
     * 
     * @param id the id of the user to remove
     * @returns false if the user with that id is not in the game,
     *          true otherwise
     */
    removePlayer(id: string): boolean {
        const idx = this.players.findIndex(p => p.getUser().id === id);
        if (idx === -1) {
            return false;
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

        return true;
    }
}