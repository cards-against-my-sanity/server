import { Injectable } from "@nestjs/common";
import { PermissionCategory } from "src/permission/permission-category.enum";
import { Permission } from "./permission.class";
import { UsersService } from "src/users/users.service";
import { IUser } from "src/shared-types/user/user.interface";

@Injectable()
export class PermissionService {
    constructor(private readonly usersService: UsersService) { }

    setPermission(user: IUser, permission: Permission): void {
        user.permissions[PermissionService.getPermissionSetName(permission.getCategory())] |= permission.getValue();
        this.usersService.save(user);
    }

    removePermission(user: IUser, permission: Permission): void {
        user.permissions[PermissionService.getPermissionSetName(permission.getCategory())] &= ~permission;
        this.usersService.save(user);
    }

    hasPermission(user: IUser, permission: Permission): boolean {
        return (user.permissions[PermissionService.getPermissionSetName(permission.getCategory())] & permission.getValue())
            === permission.getValue();
    }

    private static getPermissionSetName(category: PermissionCategory): string {
        switch (category) {
            case PermissionCategory.Generic:
                return "generic_permissions";
            case PermissionCategory.Gameplay:
                return "gameplay_permissions";
            case PermissionCategory.Contributor:
                return "contributor_permissions";
            case PermissionCategory.Moderator:
                return "moderator_permissions";
            case PermissionCategory.Admin:
                return "admin_permissions";
        }
    }
}