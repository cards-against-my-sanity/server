import { Column, Entity, JoinColumn, OneToOne, PrimaryGeneratedColumn } from "typeorm";
import { User } from "./user.entity";
import { Exclude } from "class-transformer";

@Entity()
export class UserPermission {
    @PrimaryGeneratedColumn('uuid')
    @Exclude()
    id: string;

    @JoinColumn()
    @OneToOne(() => User, (user) => user.permissions, { 
        onDelete: 'CASCADE' 
    })
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