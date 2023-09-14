import { PartialType } from '@nestjs/mapped-types';
import { CreateUserDto } from './create-user.dto';
import IUpdateUserDto from 'src/shared-types/user/update-user.dto.interface';

export class UpdateUserDto extends PartialType(CreateUserDto) implements IUpdateUserDto { }
