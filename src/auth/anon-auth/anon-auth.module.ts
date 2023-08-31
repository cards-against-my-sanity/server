import { Module } from "@nestjs/common";
import { AnonAuthStrategy } from "./anon-auth.strategy";

@Module({
    providers: [AnonAuthStrategy]
})
export class AnonAuthModule {}