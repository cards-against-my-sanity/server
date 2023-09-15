import { Exclude } from "class-transformer";
import { Column, Entity, JoinColumn, OneToMany, OneToOne, PrimaryGeneratedColumn } from "typeorm";
import { UserPermission } from "./user-permission.entity";
import IUser from "src/shared-types/user/user.interface";

@Entity()
export class User implements IUser {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ unique: true })
    nickname: string;

    @Column({ nullable: true })
    email: string

    @Column()
    @Exclude()
    hash: string;

    @Column()
    @Exclude()
    salt: string;

    @OneToOne(() => UserPermission, permissions => permissions.user, {
        eager: true,
        onDelete: 'CASCADE'
    })
    permissions: UserPermission
}
