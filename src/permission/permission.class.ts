import { PermissionCategory } from "./permission-category.enum";

export class Permission {
    // generic permissions
    static readonly AllGeneric = new Permission(PermissionCategory.Generic, 0x7FFFFFFF);
    static readonly ReportContent = new Permission(PermissionCategory.Generic, 1 << 0);
    static readonly ViewPublicGameHistory = new Permission(PermissionCategory.Generic, 1 << 1);
    static readonly ViewAllGameHistory = new Permission(PermissionCategory.Generic, 1 << 2);
    static readonly ChangeUserDetails = new Permission(PermissionCategory.Generic, 1 << 3);
    static readonly ViewDecks = new Permission(PermissionCategory.Generic, 1 << 4);
    static readonly ViewDeck = new Permission(PermissionCategory.Generic, 1 << 5);
    static readonly ViewCards = new Permission(PermissionCategory.Generic, 1 << 6);
    static readonly ViewCard = new Permission(PermissionCategory.Gameplay, 1 << 7);

    // gameplay permissions
    static readonly AllGameplay = new Permission(PermissionCategory.Gameplay, 0x7FFFFFFF);
    static readonly ViewGames = new Permission(PermissionCategory.Gameplay, 1 << 0);
    static readonly ViewGame = new Permission(PermissionCategory.Gameplay, 1 << 1);
    static readonly JoinGame = new Permission(PermissionCategory.Gameplay, 1 << 2);
    static readonly CreateGame = new Permission(PermissionCategory.Gameplay, 1 << 3);
    static readonly ChangeGameSettings = new Permission(PermissionCategory.Gameplay, 1 << 4);
    static readonly InviteToGame = new Permission(PermissionCategory.Gameplay, 1 << 5);
    static readonly StartGame = new Permission(PermissionCategory.Gameplay, 1 << 6);
    static readonly StopGame = new Permission(PermissionCategory.Gameplay, 1 << 7);
    static readonly KickUserFromGame = new Permission(PermissionCategory.Gameplay, 1 << 8);
    static readonly SendChat = new Permission(PermissionCategory.Gameplay, 1 << 9);
    static readonly UseCustomWriteIn = new Permission(PermissionCategory.Gameplay, 1 << 10);

    // contributor permissions
    static readonly AllContributor = new Permission(PermissionCategory.Contributor, 0x7FFFFFFF);
    static readonly CreateDeck = new Permission(PermissionCategory.Contributor, 1 << 0);
    static readonly UpdateDeck = new Permission(PermissionCategory.Contributor, 1 << 1);
    static readonly DeleteDeck = new Permission(PermissionCategory.Contributor, 1 << 2);
    static readonly CreateCard = new Permission(PermissionCategory.Contributor, 1 << 3);
    static readonly UpdateCard = new Permission(PermissionCategory.Contributor, 1 << 4);
    static readonly DeleteCard = new Permission(PermissionCategory.Contributor, 1 << 5);

    // moderator permissions
    static readonly AllModerator = new Permission(PermissionCategory.Moderator, 0x7FFFFFFF);
    static readonly WarnUser = new Permission(PermissionCategory.Moderator, 1 << 0);
    static readonly MuteUser = new Permission(PermissionCategory.Moderator, 1 << 1);
    static readonly BanUser = new Permission(PermissionCategory.Moderator, 1 << 2);
    static readonly ViewUserGameHistory = new Permission(PermissionCategory.Moderator, 1 << 3);
    static readonly ViewUserChatHistory = new Permission(PermissionCategory.Moderator, 1 << 4);

    // admin permissions
    static readonly AllAdmin = new Permission(PermissionCategory.Admin, 0x7FFFFFFF);
    static readonly ViewUsers = new Permission(PermissionCategory.Admin, 1 << 0);
    static readonly ViewUser = new Permission(PermissionCategory.Admin, 1 << 1);
    static readonly UpdateUser = new Permission(PermissionCategory.Admin, 1 << 2);
    static readonly DeleteUser = new Permission(PermissionCategory.Admin, 1 << 3);
    static readonly ViewUserSessions = new Permission(PermissionCategory.Admin, 1 << 4);
    static readonly LogOutUserEverywhere = new Permission(PermissionCategory.Admin, 1 << 5);
    static readonly ViewUserAuditLog = new Permission(PermissionCategory.Admin, 1 << 6);
    static readonly UpdateUserPermissions = new Permission(PermissionCategory.Admin, 1 << 7);

    // implementation
    private readonly category: PermissionCategory;
    private readonly value: number;

    constructor(category: PermissionCategory, value: number) {
        this.category = category;
        this.value = value;
    }

    getCategory(): PermissionCategory {
        return this.category;
    }

    getValue(): number {
        return this.value;
    }
}