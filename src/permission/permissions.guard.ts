import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from './permissions.decorator';
import { PermissionService } from 'src/permission/permission.service';
import { Socket } from 'socket.io';
import { SocketResponseBuilder } from 'src/util/net/socket-response-builder.class';
import UnauthorizedPayload from 'src/shared-types/misc/unauthorized.payload';
import { ObjectUtil } from 'src/util/misc/object-util';
import Permission from 'src/shared-types/permission/permission.class';
import IUser from 'src/shared-types/user/user.interface';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector, private permissionService: PermissionService) { }

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.getAllAndOverride<Permission[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredPermissions) {
      return true;
    }

    switch (context.getType()) {
      case 'http':
        return this.canActivateHttp(context, requiredPermissions);
      case 'ws':
        return this.canActivateWs(context, requiredPermissions);
      default:
        return false;
    }
  }

  private canActivateHttp(context: ExecutionContext, requiredPermissions: Permission[]): boolean {
    return this.testUser(context.switchToHttp().getRequest().user, requiredPermissions);
  }

  private canActivateWs(context: ExecutionContext, requiredPermissions: Permission[]): boolean {
    const socket: Socket = context.switchToWs().getClient();

    if (!this.testUser(socket.session?.user, requiredPermissions)) {
      SocketResponseBuilder.start<UnauthorizedPayload>()
        .data({ message: "You are not permitted to perform that action." })
        .channel("unauthorized")
        .build()
        .emitToClient(socket);

      return false;
    }

    return true;
  }

  private testUser(user: IUser, requiredPermissions: Permission[]): boolean {
    if (!ObjectUtil.notUndefOrNull(user)) {
      return false;
    }

    return requiredPermissions.every(permission => {
      return this.permissionService.hasPermission(user, permission)
    });
  }
}