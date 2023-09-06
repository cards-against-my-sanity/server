import { Module } from "@nestjs/common";
import { AnonAuthStrategy } from "./anon-auth.stategy";

@Module({
    providers: [ AnonAuthStrategy ]
})
export class AnonAuthModule {}