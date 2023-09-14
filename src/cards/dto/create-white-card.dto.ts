import { IsUUID, Length } from "class-validator";

export class CreateWhiteCardDto {
    @IsUUID(4, { each: true })
    deck_ids: string[];

    @Length(6)
    content: string;
}