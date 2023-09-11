import { Deck } from "src/decks/entities/deck.entity";
import { Column, Entity, JoinTable, ManyToMany, ManyToOne, PrimaryGeneratedColumn } from "typeorm";

@Entity()
export class WhiteCard {
    @PrimaryGeneratedColumn('uuid')
    id: string

    @Column()
    content: string

    @ManyToMany(() => Deck, {
        onDelete: 'CASCADE'
    })
    @JoinTable()
    decks: Promise<Deck[]>
}