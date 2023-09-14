import { Socket } from "socket.io"
import { IUser } from "src/shared-types/user/user.interface"

declare module 'socket.io' {
    interface Socket {
        session: {
            id: string,
            user: IUser
        }
    }
}