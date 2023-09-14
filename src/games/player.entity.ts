import IPlayer from "src/shared-types/game/player/player.interface";
import { User } from "src/users/entities/user.entity";
import { PlayerState } from "../../../cams-types/game/player/player-state.enum";
import { WhiteCard } from "src/cards/entities/white-card.entity";

export class Player implements IPlayer {
    id: string;
    nickname: string;
    state: PlayerState;
    score: number;
    private hand: WhiteCard[];

    constructor(user: User) {
        this.id = user.id;
        this.nickname = user.nickname;
        this.state = PlayerState.Player;
        this.score = 0;
        this.hand = [];
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