import { User } from "src/users/entities/user.entity";
import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from "typeorm";

@Entity()
export class Session {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    ip: string;

    @Column()
    expires: Date;

    @ManyToOne(() => User, { eager: true, onDelete: 'CASCADE' })
    user: User
}
