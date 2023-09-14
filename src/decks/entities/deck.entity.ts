import IDeck from "src/shared-types/deck/deck.interface";
import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity()
export class Deck implements IDeck {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    name: string;

    @Column()
    description: string;

    @Column({ default: 999 })
    weight: number;
}
