import { Module } from "@nestjs/common";
import { LocalAuthStrategy } from "./local-auth.strategy";
import { UsersModule } from "src/users/users.module";

@Module({
    imports: [UsersModule],
    providers: [LocalAuthStrategy]
})
export class LocalAuthModule {}