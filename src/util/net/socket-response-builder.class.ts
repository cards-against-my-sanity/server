import { GameStatusCode } from "src/games/game-status-code";
import SocketResponse from "src/types/socket-response.class";

export class SocketResponseBuilder<T> {
    private socketResponse: SocketResponse<T>;

    private constructor() {
        this.socketResponse = new SocketResponse();
    }

    static start<T>(): SocketResponseBuilder<T> {
        return new SocketResponseBuilder<T>();
    }

    static error<T>(message: string): SocketResponse<T> {
        return new SocketResponseBuilder<T>()
            .status('error')
            .message(message)
            .build();
    }

    useGameStatusCode(code: GameStatusCode): SocketResponseBuilder<T> {
        if (code !== GameStatusCode.ACTION_OK) {
            return this.status("error").message(code.getMessage());
        } else {
            return this.status("ok");
        }
    }

    status(status: "ok" | "error"): SocketResponseBuilder<T> {
        this.socketResponse.setStatus(status);
        return this;
    }

    message(message: string): SocketResponseBuilder<T> {
        this.socketResponse.setMessage(message);
        return this;
    }

    data(data: T): SocketResponseBuilder<T> {
        this.socketResponse.setData(data);
        return this;
    }

    channel(channel: string): SocketResponseBuilder<T> {
        this.socketResponse.setChannel(channel);
        return this;
    }

    build(): SocketResponse<T> {
        return this.socketResponse;
    }
}