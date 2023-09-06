import { Injectable } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { Strategy } from "passport-anonymous";

@Injectable()
export class AnonAuthStrategy extends PassportStrategy(Strategy) {
    constructor() {
        super();
    }
}