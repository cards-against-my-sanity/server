import { Injectable } from '@nestjs/common';
import { InjectRedis } from '@songkeys/nestjs-redis';
import { Redis } from 'ioredis';
import { HistoricalGame } from './entities/historical-game.entity';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';

@Injectable()
export class GamesService {
    constructor(
        @InjectRedis("games") private readonly redis: Redis,
        @InjectRepository(HistoricalGame) private readonly historicalRepo: Repository<HistoricalGame>
    ) {}

    
}
