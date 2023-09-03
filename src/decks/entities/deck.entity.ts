import { User } from "src/users/entities/user.entity";
import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from "typeorm";

@Entity()
export class Deck {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @ManyToOne(() => User, {
        onDelete: 'SET NULL'
    })
    created_by: Promise<User>;

    @Column()
    name: string;

    @Column()
    description: string;
}
