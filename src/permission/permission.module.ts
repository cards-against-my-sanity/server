import { Module } from '@nestjs/common';
import { PermissionService } from './permission.service';
import { UsersModule } from 'src/users/users.module';

@Module({
    imports: [UsersModule],
    providers: [PermissionService],
    exports: [PermissionService]
})
export class PermissionModule {}