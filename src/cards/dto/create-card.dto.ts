import { Type } from "class-transformer";
import { IsEnum, IsNumber, IsString, IsUUID, Length, Max, Min } from "class-validator";
import { CardType } from "src/cards/card-type.enum";

export class CreateCardDto {
    @IsEnum(CardType)
    card_type: CardType;

    @Length(6)
    content: string;

    @Min(0) @Max(2)
    num_answers: number;

    @IsUUID()
    deck_id: string;
}