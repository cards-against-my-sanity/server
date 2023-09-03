import { IsUUID, Length, Min, Max } from "class-validator";

export class CreateBlackCardDto {
    @IsUUID()
    deck_id: string;

    @Length(6)
    content: string;

    @Min(1) @Max(3)
    pick: number;
}