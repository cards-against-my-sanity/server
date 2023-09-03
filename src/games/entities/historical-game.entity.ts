import { Deck } from "src/decks/entities/deck.entity";
import { User } from "src/users/entities/user.entity";
import { Column, Entity, ManyToMany, ManyToOne, PrimaryColumn } from "typeorm";

@Entity()
export class HistoricalGame {
    @PrimaryColumn()
    id: string

    @ManyToOne(() => User, {
        eager: true,
        onDelete: 'SET NULL'
    })
    creator: User

    @ManyToOne(() => User, {
        eager: true,
        onDelete: 'SET NULL'
    })
    winner: User

    @ManyToMany(() => User, {
        eager: true,
        onDelete: 'CASCADE'
    })
    players: User[]

    @ManyToMany(() => Deck, {
        eager: true,
        onDelete: 'CASCADE'
    })
    decks: Deck[]

    @Column()
    score_limit: number

    @Column()
    player_limit: number

    @Column()
    spectator_limit: number
}
