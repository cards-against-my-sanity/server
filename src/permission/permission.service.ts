import { Injectable } from "@nestjs/common";
import Permission from "src/shared-types/permission/permission.class";
import IUser from "src/shared-types/user/user.interface";
import { UsersService } from "src/users/users.service";

@Injectable()
export class PermissionService {
    constructor(private readonly usersService: UsersService) { }

    setPermission(user: IUser, permission: Permission): void {
        user.permissions[Permission.getPermissionSetName(permission.getCategory())] |= permission.getValue();
        this.usersService.save(user);
    }

    removePermission(user: IUser, permission: Permission): void {
        user.permissions[Permission.getPermissionSetName(permission.getCategory())] &= ~permission;
        this.usersService.save(user);
    }

    hasPermission(user: IUser, permission: Permission): boolean {
        return Permission.testPermission(user, permission);
    }
}