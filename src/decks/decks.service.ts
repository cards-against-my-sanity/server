import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Deck } from './entities/deck.entity';
import { CreateDeckDto } from './dto/create-deck.dto';
import { UpdateDeckDto } from './dto/update-deck.dto';
import { Repository } from 'typeorm';

@Injectable()
export class DecksService {
  constructor(@InjectRepository(Deck) private decksRepository: Repository<Deck>) {}

  create(createDeckDto: CreateDeckDto) {
    this.decksRepository.create(createDeckDto)
  }

  findAll() {
    return this.decksRepository.find()
  }

  findOne(id: string) {
    return this.decksRepository.findBy({ id })
  }

  async update(id: string, updateDeckDto: UpdateDeckDto) {
    await this.decksRepository.update({ id }, updateDeckDto)
  }

  async remove(id: string) {
    await this.decksRepository.delete({ id })
  }
}
