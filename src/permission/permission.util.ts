import { PermissionCategory } from "src/shared-types/permission/permission-category.enum";
import Permission from "src/shared-types/permission/permission.class";
import { UserPermission } from "src/users/entities/user-permission.entity";

export class PermissionUtil {
    static createNewUserPermission(): UserPermission {
        const permissionObj = new UserPermission();
        const permissions = [
            Permission.ViewPublicGameHistory, Permission.JoinGame, Permission.CreateGame, Permission.ChangeGameSettings,
            Permission.InviteToGame, Permission.StartGame, Permission.StopGame, Permission.KickUserFromGame,
            Permission.ReportContent, Permission.ChangeUserDetails, Permission.SendChat, Permission.UseCustomWriteIn
        ];

        permissions.forEach(permission => {
            switch (permission.getCategory()) {
                case PermissionCategory.Generic:
                    permissionObj.generic_permissions |= permission.getValue();
                    break;
                case PermissionCategory.Gameplay:
                    permissionObj.gameplay_permissions |= permission.getValue();
                    break;
                case PermissionCategory.Contributor:
                    permissionObj.contributor_permissions |= permission.getValue();
                    break;
                case PermissionCategory.Moderator:
                    permissionObj.moderator_permissions |= permission.getValue();
                    break;
                case PermissionCategory.Admin:
                    permissionObj.admin_permissions |= permission.getValue();
                    break;
            }
        });

        return permissionObj;
    }
}