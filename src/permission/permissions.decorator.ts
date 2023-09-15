import { SetMetadata } from "@nestjs/common";
import Permission from "src/shared-types/permission/permission.class";

export const PERMISSIONS_KEY = 'role';
export const HasPermissions = (...permissions: Permission[]) => SetMetadata(PERMISSIONS_KEY, permissions);