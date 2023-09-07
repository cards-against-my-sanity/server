import { OnGatewayConnection, OnGatewayDisconnect, WebSocketGateway, WsException } from "@nestjs/websockets";
import { Socket } from "socket.io";
import { SessionService } from "./session/session.service";
import { SchedulerRegistry } from "@nestjs/schedule";
import { Session } from "./session/entities/session.entity";
import * as cookieParser from 'cookie-parser';
import { ConfigService } from "@nestjs/config";

@WebSocketGateway()
export class AppGateway implements OnGatewayConnection, OnGatewayDisconnect {
    constructor (
        private readonly sessionService: SessionService,
        private readonly schedulerRegistry: SchedulerRegistry,
        private readonly configService: ConfigService
    ) {}

    async handleConnection(client: Socket) {
        const rawCookies: { [key: string]: string } = {};

        decodeURIComponent(client.handshake.headers.cookie)
            .split(";")
            .map(rawCookie => {
                const keyVal = rawCookie.split("=");
                return { key: keyVal[0], val: keyVal[1] }
            })
            .forEach(rawCookie => rawCookies[rawCookie.key] = rawCookie.val);

        const signedCookies = cookieParser.signedCookies(
            rawCookies, 
            this.configService.get<string>("SIGNED_COOKIE_SECRET")
        );

        if (!signedCookies.sid) {
            client.emit("connection_status", { state: "open", type: "guest" });
            return;
        }

        const session = await this.getSessionById(client, signedCookies.sid);
        if (!session) {
            client.emit("connection_status", { status: "closed", message: "Session expired or was revoked."});
            client.disconnect(true);
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

        client.emit("connection_status", { status: "open", type: "user" });
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

    private async getSessionById(client: Socket, id: string | string[]): Promise<Session> {
        let actual_id: string;
        if (Array.isArray(id)) {
            actual_id = id[0];
        } else {
            actual_id = id;
        }

        const session = await this.sessionService.findOne(actual_id);
        if (!session) {
            client.emit("connection_status", { status: "closed", message: "Session expired or revoked. Please log in again."});
            client.disconnect(true);
            return null;
        }

        return session;
    }
}
