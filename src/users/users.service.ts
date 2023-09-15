import { ConflictException, Injectable } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { Repository } from 'typeorm';
import * as argon2 from 'argon2';
import { UserPermission } from './entities/user-permission.entity';
import { PermissionUtil } from 'src/permission/permission.util';
import IUser from 'src/shared-types/user/user.interface';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private usersRepository: Repository<User>,
    @InjectRepository(UserPermission) private userPermissionsRepository: Repository<UserPermission>
  ) { }

  async create(createUserDto: CreateUserDto): Promise<void> {
    const existing = await this.findOneByNickname(createUserDto.nickname);
    if (existing != null) {
      throw new ConflictException("nickname already taken by another user");
    }

    const { salt, hash } = await this.hash(createUserDto.password);

    const permissions = await this.userPermissionsRepository.save(
      PermissionUtil.createNewUserPermission()
    );

    await this.usersRepository.save({
      nickname: createUserDto.nickname,
      email: createUserDto.email,
      hash,
      salt,
      permissions
    });
  }

  findAll(): Promise<IUser[]> {
    return this.usersRepository.find();
  }

  findOneById(id: string): Promise<IUser> {
    return this.usersRepository.findOneBy({ id });
  }

  findOneByNickname(nickname: string): Promise<IUser> {
    return this.usersRepository.findOneBy({ nickname });
  }

  async findOneByNicknameIfPasswordValid(nickname: string, password: string): Promise<IUser> {
    const user = await this.usersRepository.findOneBy({ nickname });
    return user && (await argon2.verify(user.hash, password + user.salt)) ? user : null;
  }

  async update(id: string, updateUserDto: UpdateUserDto): Promise<void> {
    const current = await this.findOneById(id);

    if (updateUserDto.nickname) {
      current.nickname = updateUserDto.nickname;
    }

    if (updateUserDto.email) {
      // TODO: email verification
      current.email = updateUserDto.email;
    }

    if (updateUserDto.password) {
      const { salt, hash } = await this.hash(updateUserDto.password);
      await this.usersRepository.save({
        ...current,
        salt,
        hash
      });
    } else {
      await this.usersRepository.save(current);
    }
  }

  save(user: IUser): void {
    this.usersRepository.save(user);
  }

  remove(id: string): void {
    this.usersRepository.delete({ id });
  }

  private async hash(password: string): Promise<{ salt: string, hash: string }> {
    const { randomBytes } = await import('node:crypto');
    const salt = randomBytes(20).toString('hex');
    const hash = await argon2.hash(password + salt);

    return { salt, hash };
  }
}
