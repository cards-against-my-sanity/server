import { IsAlphanumeric, IsEmail, Length } from "class-validator";

export class CreateUserDto {
    @IsAlphanumeric()
    nickname: string;

    @IsEmail()
    email: string;

    @Length(8)
    password: string;
}
