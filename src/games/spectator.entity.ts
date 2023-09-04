import { User } from "src/users/entities/user.entity";

export class Spectator {
    constructor(private readonly user: User) {}

    getUser(): User {
        return this.user;
    }
}