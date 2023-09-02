import { Deck } from "src/decks/entities/deck.entity";
import { CardType } from "src/cards/card-type.enum";
import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from "typeorm";

@Entity()
export class Card {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    card_type: CardType;

    @Column()
    content: string;

    @Column()
    num_answers: number;

    @ManyToOne(() => Deck, {
        onDelete: 'CASCADE'
    })
    deck: Promise<Deck>;
}
