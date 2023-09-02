import { Socket } from "socket.io"

declare module 'socket.io' {
    interface Socket {
        session?: {
            id: string,
            user: {
                id: string,
                nickname: string,
                email: string,
                permissions: {
                    generic_permissions: number,
                    gameplay_permissions: number,
                    contributor_permissions: number,
                    moderator_permissions: number,
                    admin_permissions: number
                }
            }
        }
    }
}