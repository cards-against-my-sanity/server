import { User } from "src/users/entities/user.entity";
import { PlayerState } from "./player-state.enum";
import { WhiteCard } from "src/cards/entities/white-card.entity";

export class Player {
    private state: PlayerState;
    private cards: WhiteCard[];

    constructor(private readonly user: User) {
        this.state = PlayerState.Player;
        this.cards = [];
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

    getHand(): WhiteCard[] {
        return this.cards;
    }

    setHand(cards: WhiteCard[]) {
        this.cards = cards;
    }

    dealCard(card: WhiteCard) {
        this.cards.push(card);
    }

    clearHand() {
        this.cards.length = 0;
    }
}