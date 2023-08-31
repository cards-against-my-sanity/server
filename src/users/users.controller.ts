import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateUserPermissionsDto } from './dto/update-user-permissions.dto';
import { HasPermissions } from 'src/permission/permissions.decorator';
import { Permission } from 'src/permission/permission.class';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @Get()
  @HasPermissions(Permission.ViewUsers)
  findAll() {
    return this.usersService.findAll();
  }

  @Get(':id')
  @HasPermissions(Permission.ViewUser)
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Patch(':id')
  @HasPermissions(Permission.UpdateUser) // TODO: users can partially update themselves
  update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.update(id, updateUserDto);
  }

  @Patch('permissions/:id')
  @HasPermissions(Permission.UpdateUserPermissions)
  updatePermissions(@Param('id') id: string, @Body() updateUserPermissionsDto: UpdateUserPermissionsDto) {
    return this.usersService.updatePermissions(id, updateUserPermissionsDto);
  }

  @Delete(':id')
  @HasPermissions(Permission.DeleteUser) // TODO: users can delete themselves
  remove(@Param(':id') id: string) {
    return this.usersService.remove(id);
  }
}
