import { ConflictException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Deck } from './entities/deck.entity';
import { CreateDeckDto } from './dto/create-deck.dto';
import { UpdateDeckDto } from './dto/update-deck.dto';
import { Repository } from 'typeorm';
import IDeck from 'src/shared-types/deck/deck.interface';

@Injectable()
export class DecksService {
  constructor(@InjectRepository(Deck) private readonly decksRepository: Repository<Deck>) { }

  async create(createDeckDto: CreateDeckDto): Promise<void> {
    const existing = await this.decksRepository.findOneBy({ name: createDeckDto.name });
    if (existing != null) {
      throw new ConflictException("deck already exists");
    }

    this.decksRepository.save(createDeckDto)
  }

  findAll(): Promise<IDeck[]> {
    return this.decksRepository.find({ order: { weight: 'asc', name: 'asc' } })
  }

  findOne(id: string): Promise<IDeck> {
    return this.decksRepository.findOneBy({ id })
  }

  async update(id: string, updateDeckDto: UpdateDeckDto): Promise<void> {
    if (updateDeckDto.name) {
      const existing = await this.decksRepository.findOneBy({ name: updateDeckDto.name });
      if (existing != null) {
        throw new ConflictException("deck already exists");
      }
    }

    await this.decksRepository.update({ id }, updateDeckDto)
  }

  remove(id: string): void {
    this.decksRepository.delete({ id })
  }
}
