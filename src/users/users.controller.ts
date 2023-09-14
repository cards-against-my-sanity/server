import { Controller, Get, Post, Body, Patch, Delete, Req, UseGuards, Res } from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { HasPermissions } from 'src/permission/permissions.decorator';
import { Permission } from 'src/permission/permission.class';
import { Request, Response } from 'express';
import { IsAuthenticatedGuard } from 'src/auth/is-authenticated.guard';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @Get()
  @UseGuards(IsAuthenticatedGuard)
  findSelf(@Req() req: Request) {
    return this.usersService.findOneById(req.user.id);
  }

  @Patch()
  @HasPermissions(Permission.ChangeUserDetails)
  updateSelf(@Req() req: Request, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.update(req.user.id, updateUserDto);
  }

  @Delete()
  @UseGuards(IsAuthenticatedGuard)
  removeSelf(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    this.usersService.remove(req.user.id);
    res.clearCookie('refresh');
  }
}
