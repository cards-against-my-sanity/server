import { User } from "src/users/entities/user.entity";
import { PlayerState } from "./player-state.enum";
import { WhiteCard } from "src/cards/entities/white-card.entity";

export class Player {
    private state: PlayerState;
    private score: number;
    private hand: WhiteCard[];

    constructor(private readonly user: User) {
        this.state = PlayerState.Player;
        this.score = 0;
        this.hand = [];
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

    getScore(): number {
        return this.score;
    }

    incrementScore() {
        this.score++;
    }

    setScore(score: number) {
        this.score = score;
    }

    getHand(): WhiteCard[] {
        return this.hand;
    }

    removeCardsFromHand(cardIds: string[]): WhiteCard[] {
        const cards = this.hand.filter(c => cardIds.includes(c.id));
        this.hand = this.hand.filter(c => !cardIds.includes(c.id));
        return cards;
    }

    setHand(cards: WhiteCard[]) {
        this.hand = cards;
    }

    dealCards(cards: WhiteCard[]) {
        cards.forEach(card => this.dealCard(card));
    }

    dealCard(card: WhiteCard) {
        this.hand.push(card);
    }

    clearHand() {
        this.hand.length = 0;
    }
}