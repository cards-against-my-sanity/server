import { PartialType } from '@nestjs/mapped-types';
import IUpdateBlackCardDto from 'src/shared-types/card/black/update-black-card.dto.interface';
import CreateBlackCardDto from './create-black-card.dto';

export class UpdateBlackCardDto extends PartialType(CreateBlackCardDto) implements IUpdateBlackCardDto { }
