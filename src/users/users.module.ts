import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { UserPermission } from './entities/user-permission.entity';
import { UserSerializer } from './user-serializer.util';
import { AuthModule } from 'src/auth/auth.module';
import { SessionModule } from 'src/session/session.module';

@Module({
  imports: [TypeOrmModule.forFeature([User, UserPermission])],
  controllers: [UsersController],
  providers: [UsersService, UserSerializer],
  exports: [UsersService]
})
export class UsersModule {}
