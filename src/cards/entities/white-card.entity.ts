import { Deck } from "src/decks/entities/deck.entity";
import IWhiteCard from "src/shared-types/card/white-card.interface";
import { Column, Entity, JoinTable, ManyToMany, PrimaryGeneratedColumn } from "typeorm";

@Entity()
export class WhiteCard implements IWhiteCard {
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