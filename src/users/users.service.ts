import { ConflictException, Injectable } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { Repository } from 'typeorm';
import * as argon2 from 'argon2';
import { UserPermission } from './entities/user-permission.entity';
import { PermissionUtil } from 'src/permission/permission.util';
import { UpdateUserPermissionsDto } from './dto/update-user-permissions.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private usersRepository: Repository<User>,
    @InjectRepository(UserPermission) private userPermissionsRepository: Repository<UserPermission>
  ) {}

  async create(createUserDto: CreateUserDto) {
    const existing = await this.usersRepository.findOneBy({ email: createUserDto.email });
    if (existing != null) {
      throw new ConflictException("email already taken by another user");
    }

    const { randomBytes } = await import('node:crypto');
    const salt = randomBytes(20).toString('hex');

    const hash = await argon2.hash(createUserDto.password + salt);

    const permissions = PermissionUtil.createNewUserPermission();
    this.userPermissionsRepository.save(permissions);

    this.usersRepository.save({
      nickname: createUserDto.nickname,
      email: createUserDto.email,
      hash,
      salt,
      permissions
    });
  }

  findAll() {
    return this.usersRepository.find();
  }

  findOne(id: string) {
    return this.usersRepository.findOneBy({ id });
  }

  findOneByEmail(email: string) {
    return this.usersRepository.findOneBy({ email });
  }

  async update(id: string, updateUserDto: UpdateUserDto) {
    await this.usersRepository.update({ id }, updateUserDto);
  }

  async updatePermissions(id: string, updateUserPermissionsDto: UpdateUserPermissionsDto) {
    await this.userPermissionsRepository.update({ user: { id }}, updateUserPermissionsDto);
  }

  async save(user: User) {
    await this.usersRepository.save([user]);
  }

  async remove(id: string) {
    await this.usersRepository.delete({ id });
  }
}
