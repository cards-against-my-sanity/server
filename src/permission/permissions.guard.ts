import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Permission } from 'src/permission/permission.class';
import { PERMISSIONS_KEY } from './permissions.decorator';
import { PermissionService } from 'src/permission/permission.service';
import { PermissionUtil } from './permission.util';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector, private permissionService: PermissionService) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.getAllAndOverride<Permission[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredPermissions) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();
    if (!user) {
      // user is a guest / anonymous
      return requiredPermissions.every(permission => PermissionUtil.GuestPermissions.includes(permission));
    } else {
      // user is logged in
      return requiredPermissions.every(permission => this.permissionService.hasPermission(user, permission));
    }
  }
}