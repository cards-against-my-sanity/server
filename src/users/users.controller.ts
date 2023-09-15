import { Controller, Get, Post, Body, Patch, Delete, Req, UseGuards, Res } from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { HasPermissions } from 'src/permission/permissions.decorator';
import { Request, Response } from 'express';
import { IsAuthenticatedGuard } from 'src/auth/is-authenticated.guard';
import IUser from 'src/shared-types/user/user.interface';
import Permission from 'src/shared-types/permission/permission.class';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) { }

  @Post()
  create(@Body() createUserDto: CreateUserDto): Promise<void> {
    return this.usersService.create(createUserDto);
  }

  @Get()
  @UseGuards(IsAuthenticatedGuard)
  findSelf(@Req() req: Request): Promise<IUser> {
    return this.usersService.findOneById(req.user.id);
  }

  @Patch()
  @HasPermissions(Permission.ChangeUserDetails)
  updateSelf(@Req() req: Request, @Body() updateUserDto: UpdateUserDto): Promise<void> {
    return this.usersService.update(req.user.id, updateUserDto);
  }

  @Delete()
  @UseGuards(IsAuthenticatedGuard)
  removeSelf(@Req() req: Request, @Res({ passthrough: true }) res: Response): void {
    this.usersService.remove(req.user.id);
    res.clearCookie('refresh');
  }
}
