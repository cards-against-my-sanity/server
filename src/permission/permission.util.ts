import { UserPermission } from "src/users/entities/user-permission.entity";
import { Permission } from "./permission.class";
import { PermissionCategory } from "src/permission/permission-category.enum";

export class PermissionUtil {
    static createNewUserPermission(): UserPermission {
        const permissionObj = new UserPermission();
        const permissions = [            
            Permission.ViewPublicGameHistory, Permission.ViewDecks, Permission.ViewDeck, Permission.ViewCards, 
            Permission.ViewCard, Permission.JoinGame, Permission.CreateGame, Permission.ChangeGameSettings, 
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