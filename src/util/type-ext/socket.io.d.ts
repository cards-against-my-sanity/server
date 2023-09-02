import { Socket } from "socket.io"
import { User } from "src/users/entities/user.entity"

declare module 'socket.io' {
    interface Socket {
        session?: {
            id: string,
            user: User
        }
    }
}