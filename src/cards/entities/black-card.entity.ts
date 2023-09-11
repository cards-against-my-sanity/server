import { Deck } from "src/decks/entities/deck.entity";
import { Column, Entity, JoinTable, ManyToMany, PrimaryGeneratedColumn } from "typeorm";

@Entity()
export class BlackCard {
    @PrimaryGeneratedColumn('uuid')
    id: string

    @Column()
    content: string

    @Column()
    pick: number

    @ManyToMany(() => Deck, {
        onDelete: 'CASCADE'
    })
    @JoinTable()
    decks: Promise<Deck[]>
}