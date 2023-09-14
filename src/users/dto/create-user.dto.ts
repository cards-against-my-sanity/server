import { IsAlphanumeric, IsEmail, IsOptional, Length } from "class-validator";
import ICreateUserDto from "src/shared-types/user/create-user.dto.interface";

export class CreateUserDto implements ICreateUserDto {
    @IsAlphanumeric()
    nickname: string;

    @IsEmail()
    @IsOptional()
    email?: string;

    @Length(8)
    password: string;
}
