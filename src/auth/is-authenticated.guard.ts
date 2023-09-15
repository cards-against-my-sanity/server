import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import { Request } from "express";
import { Socket } from "socket.io";
import { ObjectUtil } from "src/util/misc/object-util";
import { SocketResponseBuilder } from "src/util/net/socket-response-builder.class";
import UnauthorizedPayload from "src/shared-types/misc/unauthorized.payload";

/**
 * Ensures the presence of a user object on the http request 
 * or websocket connection. Further ensures the user object 
 * contains a session id. Session validity is not checked.
 * That happens elsewhere.
 * 
 * This guard is redundant if there is a permission check,
 * since the permission guard already requires a user object
 * to be present.
 */
@Injectable()
export class IsAuthenticatedGuard implements CanActivate {
    canActivate(context: ExecutionContext): boolean {
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
        
        return ObjectUtil.notUndefOrNull(request.user) 
            && ObjectUtil.notUndefOrNull(request.user?.session_id);
    }

    private canActivateWs(context: ExecutionContext): boolean {
        const socket: Socket = context.switchToWs().getClient();

        const valid = ObjectUtil.notUndefOrNull(socket.session)
            && ObjectUtil.notUndefOrNull(socket.session.user);

        if (!valid) {
            SocketResponseBuilder.start<UnauthorizedPayload>()
                .data({ message: "You must be logged in." })
                .channel("unauthorized")
                .build()
                .emitToClient(socket);
                
            return false;
        }

        return true;
    }
}