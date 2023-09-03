import { Deck } from "src/decks/entities/deck.entity";
import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from "typeorm";

@Entity()
export class BlackCard {
    @PrimaryGeneratedColumn('uuid')
    id: string

    @Column()
    content: string

    @Column()
    pick: number

    @ManyToOne(() => Deck, {
        onDelete: 'CASCADE'
    })
    deck: Promise<Deck>
}