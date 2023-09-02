import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity()
export class Deck {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    name: string;

    @Column()
    description: string;
}
