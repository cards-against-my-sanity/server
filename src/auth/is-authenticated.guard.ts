import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import { Request } from "express";
import { Observable } from "rxjs";
import { Socket } from "socket.io";

/**
 * Ensures the presence of a user object on the http request 
 * or websocket connection. Further ensures the user object 
 * contains a session id.
 * 
 * This guard is redundant if there is no permission check,
 * since the permission guard already requires a user object
 * to be present.
 */
@Injectable()
export class IsAuthenticatedGuard implements CanActivate {
    canActivate(context: ExecutionContext): boolean | Promise<boolean> | Observable<boolean> {
        switch (context.getType()) {
            case 'http':
                return this.canActivateHttp(context);
            case 'ws':
                return this.canActivateWs(context);
            default:
                return false;
        }
    }

    private canActivateHttp(context: ExecutionContext): boolean {
        const request: Request = context.switchToHttp().getRequest();
        return !!request.user && !!request.user?.session_id;
    }

    private canActivateWs(context: ExecutionContext): boolean {
        const socket: Socket = context.switchToWs().getClient();
        
        if (!socket?.session?.user || !socket?.session?.id) {
            socket.emit("unauthorized", { message: "You must be logged in." });
            return false;
        }

        return true;
    }
}