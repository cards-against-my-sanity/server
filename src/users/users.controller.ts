import { Controller, Get, Post, Body, Patch, Param, Delete, Req, UseGuards, Res } from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { HasPermissions } from 'src/permission/permissions.decorator';
import { Permission } from 'src/permission/permission.class';
import { JwtAccessTokenGuard } from 'src/auth/jwt-access-token/jwt-access-token.guard';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @Get()
  @UseGuards(JwtAccessTokenGuard)
  findSelf(@Req() req) {
    return this.usersService.findOne(req.user.id);
  }

  @Patch()
  @UseGuards(JwtAccessTokenGuard)
  @HasPermissions(Permission.ChangeUserDetails)
  updateSelf(@Req() req, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.update(req.user.id, updateUserDto);
  }

  @Delete()
  @UseGuards(JwtAccessTokenGuard)
  removeSelf(@Req() req, @Res({ passthrough: true }) res) {
    this.usersService.remove(req.user.id);
    res.clearCookie('refresh');
  }
}
