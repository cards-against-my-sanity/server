import { IsUUID, Length } from "class-validator";
import ICreateWhiteCardDto from "src/shared-types/card/white/create-white-card.dto.interface";

export default class CreateWhiteCardDto implements ICreateWhiteCardDto {
    @IsUUID(4, { each: true })
    deckIds: string[];

    @Length(6)
    content: string;
}