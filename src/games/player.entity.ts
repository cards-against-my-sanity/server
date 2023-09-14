import IPlayer from "src/shared-types/game/player/player.interface";
import { IUser } from "src/shared-types/user/user.interface";
import IWhiteCard from "src/shared-types/card/white/white-card.interface";
import { PlayerState } from "src/shared-types/game/player/player-state.enum";

export class Player implements IPlayer {
    id: string;
    nickname: string;
    state: PlayerState;
    score: number;
    needToPlay: boolean;
    private hand: IWhiteCard[];

    constructor(user: IUser) {
        this.id = user.id;
        this.nickname = user.nickname;
        this.state = PlayerState.Player;
        this.score = 0;
        this.needToPlay = false;
        this.hand = [];
    }

    getHand(): IWhiteCard[] {
        return this.hand;
    }

    removeCardsFromHand(cardIds: string[]): IWhiteCard[] {
        const cards = this.hand.filter(c => cardIds.includes(c.id));
        this.hand = this.hand.filter(c => !cardIds.includes(c.id));
        return cards;
    }

    setHand(cards: IWhiteCard[]) {
        this.hand = cards;
    }

    dealCards(cards: IWhiteCard[]) {
        cards.forEach(card => this.dealCard(card));
    }

    dealCard(card: IWhiteCard) {
        this.hand.push(card);
    }

    clearHand() {
        this.hand.length = 0;
    }
}