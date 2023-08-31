import { IsString, Length } from "class-validator";

export class CreateDeckDto {
    @Length(3, 32)
    name: string;
    
    @Length(16, 256)
    description: string;
}