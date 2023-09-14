import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Permission } from 'src/permission/permission.class';
import { PERMISSIONS_KEY } from './permissions.decorator';
import { PermissionService } from 'src/permission/permission.service';
import { Socket } from 'socket.io';
import { Request } from 'express';
import { IUser } from 'src/shared-types/user/user.interface';

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
    const request: Request = context.switchToHttp().getRequest();
    return this.testUser(request.user, requiredPermissions);
  }

  private canActivateWs(context: ExecutionContext, requiredPermissions: Permission[]): boolean {
    const socket: Socket = context.switchToWs().getClient();
    if (!this.testUser(socket.session?.user, requiredPermissions)) {
      socket.emit("unauthorized", { message: "You are not permitted to perform that action." });
      return false;
    }

    return true;
  }

  private testUser(user: IUser, perms: Permission[]): boolean {
    return !user ? false : perms.every(permission => this.permissionService.hasPermission(user, permission));
  }
}