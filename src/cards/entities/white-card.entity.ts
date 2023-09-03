import { Deck } from "src/decks/entities/deck.entity";
import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from "typeorm";

@Entity()
export class WhiteCard {
    @PrimaryGeneratedColumn('uuid')
    id: string

    @Column()
    content: string

    @ManyToOne(() => Deck, {
        onDelete: 'CASCADE'
    })
    deck: Promise<Deck>
}