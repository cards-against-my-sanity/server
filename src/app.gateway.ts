import { OnGatewayConnection, WebSocketGateway } from "@nestjs/websockets";
import { Socket } from "socket.io";
import { AuthService } from "./auth/auth.service";
import { UsersService } from "./users/users.service";
import { SessionService } from "./session/session.service";

@WebSocketGateway()
export class AppGateway implements OnGatewayConnection {    
    constructor (
        private readonly authService: AuthService,
        private readonly sessionService: SessionService,
        private readonly usersService: UsersService
    ) {}

    async handleConnection(client: Socket) {
        if (!client.handshake.query || !client.handshake.query.token) {
            client.emit("connection_status", { status: "guest", message: "Logged in as guest." });
            return;
        }

        const payload = await this.authService.verifyAccessToken(client.handshake.query.token);
        if (!payload || !payload.id) {
            client.emit("connection_status", { status: "fail", message: "Access token malformed or expired." });
            client.disconnect(true);
            return;
        }

        const session = await this.sessionService.findOne(payload.id);
        if (!session) {
            client.emit("connection_status", { status: "fail", message: "Session expired or revoked. Please log in again."});
            client.disconnect(true);
            return;
        }

        client.handshake.auth.user = session.user;
        client.emit("connection_status", { status: "user", message: "Logged in successfully." })
    }
}
