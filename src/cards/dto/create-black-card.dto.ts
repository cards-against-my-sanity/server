import { IsUUID, Length, Min, Max } from "class-validator";
import ICreateBlackCardDto from "src/shared-types/card/black/create-black-card.dto.interface";

export default class CreateBlackCardDto implements ICreateBlackCardDto {
    @IsUUID(4, { each: true })
    deckIds: string[];

    @Length(6)
    content: string;

    @Min(1) @Max(3)
    pick: number;
}