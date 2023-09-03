import { IsUUID, Length } from "class-validator";

export class CreateWhiteCardDto {
    @IsUUID()
    deck_id: string;

    @Length(6)
    content: string;
}