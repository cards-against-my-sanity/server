import { Server } from "socket.io";
import { Socket } from "socket.io/dist/socket";

export default class SocketResponse<T> {
    private status: "ok" | "error" = "ok";
    private message: string | null = null;
    private data: T | null = null;
    private channel: string | null = null;

    constructor() { }

    setStatus(status: "ok" | "error"): void {
        this.status = status;
    }

    setMessage(message: string): void {
        this.message = message;
    }

    setData(data: T): void {
        this.data = data;
    }

    setChannel(channel: string): void {
        this.channel = channel;
    }

    emitToClient(client: Socket) {
        if (!this.channel) {
            throw new Error("Cannot emit to client. Channel is null.")
        }

        client.emit(this.channel, this);
    }

    emitToRoom(server: Server, room: string) {
        this.emitToRooms(server, [room]);
    }

    emitToRooms(server: Server, rooms: string[]) {
        if (!this.channel) {
            throw new Error("Cannot emit to room. Channel is null.")
        }

        server.to(rooms).emit(this.channel, this);
    }

    toJSON() {
        return {
            status: this.status,
            message: this.message,
            data: this.data
        }
    }
}