import { PartialType } from '@nestjs/mapped-types';
import CreateWhiteCardDto from './create-white-card.dto';
import IUpdateWhiteCardDto from 'src/shared-types/card/white/update-white-card.dto.interface';

export class UpdateWhiteCardDto extends PartialType(CreateWhiteCardDto) implements IUpdateWhiteCardDto { }
