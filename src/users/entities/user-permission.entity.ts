import { Column, Entity, OneToOne, PrimaryGeneratedColumn } from "typeorm";
import { User } from "./user.entity";

@Entity()
export class UserPermission {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @OneToOne(() => User, (user) => user.permissions)
    user: User;

    @Column()
    generic_permissions: number;

    @Column({ default: 0 })
    gameplay_permissions: number;

    @Column({ default: 0 })
    contributor_permissions: number;

    @Column({ default: 0 })
    moderator_permissions: number;

    @Column({ default: 0 })
    admin_permissions: number;
}