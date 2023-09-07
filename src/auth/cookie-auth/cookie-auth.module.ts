import { Module } from "@nestjs/common";
import { SessionModule } from "src/session/session.module";
import { CookieAuthStrategy } from "./cookie-auth.strategy";

@Module({
    imports: [SessionModule],
    providers: [CookieAuthStrategy]
})
export class CookieAuthModule {}