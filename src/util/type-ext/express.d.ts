import { Request } from "express";

declare module 'express-serve-static-core' {
    interface Request {
        user?: {
            id: string,
            nickname: string,
            email: string,
            permissions: {
                generic_permissions: number,
                gameplay_permissions: number,
                contributor_permissions: number,
                moderator_permissions: number,
                admin_permissions: number
            },
            session_id: string
        }
    }
}