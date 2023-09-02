import { Exclude } from "class-transformer";
import { Column, Entity, JoinColumn, OneToMany, OneToOne, PrimaryGeneratedColumn } from "typeorm";
import { UserPermission } from "./user-permission.entity";

@Entity()
export class User {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    nickname: string;

    @Column({ unique: true })
    email: string

    @Column()
    @Exclude()
    hash: string;

    @Column()
    @Exclude()
    salt: string;

    @OneToOne(() => UserPermission, (permission) => permission.user, { 
        eager: true,
        onDelete: 'CASCADE'
    })
    permissions: UserPermission
}
