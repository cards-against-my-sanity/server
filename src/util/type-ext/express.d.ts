import { Request } from "express";
import { User } from "src/users/entities/user.entity";

declare module 'express-serve-static-core' {
    interface Request {
        user: User & {
            session_id: string
        }
    }
}