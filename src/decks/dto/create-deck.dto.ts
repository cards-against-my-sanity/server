import { IsNumber, IsOptional, Length } from "class-validator";
import ICreateDeckDto from "src/shared-types/deck/create-deck.dto.interface";

export class CreateDeckDto implements ICreateDeckDto {
    @Length(3, 32)
    name: string;

    @Length(16, 256)
    description: string;

    @IsOptional()
    @IsNumber()
    weight: number;
}