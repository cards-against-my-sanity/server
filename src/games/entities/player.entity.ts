import { User } from "src/users/entities/user.entity";
import { PlayerState } from "../player-state.enum";

export class Player {
    private state: PlayerState;

    constructor(private readonly user: User) {
        this.state = PlayerState.Player;
    }

    getUser(): User {
        return this.user;
    }

    getState(): PlayerState {
        return this.state;
    }

    setState(state: PlayerState): void {
        this.state = state;
    }
}