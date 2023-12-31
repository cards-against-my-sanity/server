import { Column, Entity, JoinColumn, OneToOne, PrimaryGeneratedColumn } from "typeorm";
import { User } from "./user.entity";
import { Exclude } from "class-transformer";
import IUserPermission from "src/shared-types/user/user-permission.interface";

@Entity()
export class UserPermission implements IUserPermission {
    @PrimaryGeneratedColumn('uuid')
    @Exclude()
    id: string;

    @OneToOne(() => User, (user) => user.permissions, {
        onDelete: 'CASCADE'
    })
    @JoinColumn()
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