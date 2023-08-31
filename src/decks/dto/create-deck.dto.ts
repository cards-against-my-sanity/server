import { IsAlphanumeric, IsEnum, IsOptional, Length, Max, Min } from "class-validator";

export class CreateDeckDto {
    @IsAlphanumeric()
    @Length(3, 32)
    name: string;
    
    @IsAlphanumeric()
    @Length(16, 256)
    description: string;
}