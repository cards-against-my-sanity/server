import { IsAlphanumeric, IsEmail, IsOptional, Length } from "class-validator";

export class CreateUserDto {
    @IsAlphanumeric()
    nickname: string;

    @IsEmail()
    @IsOptional()
    email?: string;

    @Length(8)
    password: string;
}
