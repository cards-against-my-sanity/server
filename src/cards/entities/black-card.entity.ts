import { Deck } from "src/decks/entities/deck.entity";
import IBlackCard from "src/shared-types/card/black/black-card.interface";
import { Column, Entity, JoinTable, ManyToMany, PrimaryGeneratedColumn } from "typeorm";

@Entity()
export class BlackCard implements IBlackCard {
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