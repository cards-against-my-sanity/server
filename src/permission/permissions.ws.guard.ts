import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Permission } from 'src/permission/permission.class';
import { PERMISSIONS_KEY } from './permissions.decorator';
import { PermissionService } from 'src/permission/permission.service';
import { PermissionUtil } from './permission.util';
import { Socket } from 'socket.io';

@Injectable()
export class PermissionsWebsocketGuard implements CanActivate {
  constructor(private reflector: Reflector, private permissionService: PermissionService) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.getAllAndOverride<Permission[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredPermissions) {
      return true;
    }

    const client = context.switchToWs().getClient<Socket>();

    const { user } = client.handshake.auth;
    if (!user) {
      // user is a guest / anonymous
      if (!requiredPermissions.every(permission => PermissionUtil.GuestPermissions.includes(permission))) {
        client.emit("unauthorized", { message: "Action unauthorized for guests. Try logging in." });
        return false;
      }

    } else {
      // user is logged in
      if (!requiredPermissions.every(permission => this.permissionService.hasPermission(user, permission))) {
        client.emit("unauthorized", { message: "Action unauthorized for your permission level. Ask an admin for help." });
        return false;
      }
    }

    return true;
  }
}