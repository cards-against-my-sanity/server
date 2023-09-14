import { Request } from "express";
import { IUser } from "src/shared-types/user/user.interface";

declare module 'express-serve-static-core' {
    interface Request {
        user: IUser & {
            session_id: string
        }
    }
}