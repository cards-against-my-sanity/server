import { OnGatewayConnection, OnGatewayDisconnect, WebSocketGateway } from "@nestjs/websockets";
import { Socket } from "socket.io";
import { AuthService } from "./auth/auth.service";
import { SessionService } from "./session/session.service";
import { SchedulerRegistry } from "@nestjs/schedule";
import { Session } from "./session/entities/session.entity";

@WebSocketGateway()
export class AppGateway implements OnGatewayConnection, OnGatewayDisconnect {    
    constructor (
        private readonly authService: AuthService,
        private readonly sessionService: SessionService,
        private readonly schedulerRegistry: SchedulerRegistry
    ) {}

    async handleConnection(client: Socket) {
        if (!client.handshake.query || !client.handshake.query.token) {
            client.emit("connection_status", { state: "open", type: "guest" });
            return;
        }

        const payload = await this.authService.verifyAccessToken(client.handshake.query.token);
        if (!payload || !payload.id) {
            client.emit("connection_status", { status: "closed", message: "Access token malformed or expired." });
            client.disconnect(true);
            return;
        }

        const session = await this.getSessionById(client, payload.id);
        if (!session) {
            return;
        }

        // reauthorize the connection every 5 minutes automatically
        this.schedulerRegistry.addInterval(
            `ws-reauth:${session.id}`,
            setInterval(async () => {
                if (!(await this.getSessionById(client, session.id))) {
                    client.emit("connection_status", { status: "closed", message: "Session expired or was revoked."});
                    client.disconnect(true);
                    return;
                }
            }, 5 * 60 * 1000)
        );

        client.session = {
            id: session.id,
            user: session.user
        };

        client.emit("connection_status", { status: "open", type: "user" })
    }

    async handleDisconnect(client: Socket) {
        if (!client.session) {
            return;
        }

        const { id } = client.session;

        if (this.schedulerRegistry.doesExist('interval', `ws-reauth:${id}`)) {
            this.schedulerRegistry.deleteInterval(`ws-reauth:${id}`);
        }
    }

    private async getSessionById(client: Socket, id: string): Promise<Session> {
        const session = await this.sessionService.findOne(id);
        if (!session) {
            client.emit("connection_status", { status: "closed", message: "Session expired or revoked. Please log in again."});
            client.disconnect(true);
            return null;
        }

        return session;
    }
}
