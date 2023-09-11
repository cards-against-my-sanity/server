import { IsUUID, Length, Min, Max } from "class-validator";

export class CreateBlackCardDto {
    @IsUUID(4, {each: true})
    deck_ids: string[];

    @Length(6)
    content: string;

    @Min(1) @Max(3)
    pick: number;
}