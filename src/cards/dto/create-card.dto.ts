import { IsAlphanumeric, IsEnum, IsOptional, Max, Min } from "class-validator";
import { CardType } from "src/cards/card-type.enum";

export class CreateCardDto {
    @IsEnum(CardType)
    card_type: CardType;

    @IsAlphanumeric()
    content: string;

    @IsOptional()
    @Min(0) @Max(2)
    num_answers?: number;
}