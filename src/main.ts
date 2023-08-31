import { NestFactory, Reflector } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { InstanceToPlainInterceptor } from './util/instance-to-plain.interceptor';
import * as cookieParser from 'cookie-parser';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get<ConfigService>(ConfigService);

  app.useGlobalPipes(new ValidationPipe());
  app.useGlobalInterceptors(new InstanceToPlainInterceptor());
  app.use(cookieParser(config.get<string>("SIGNED_COOKIE_SECRET")));
  
  await app.listen(3000);
}

bootstrap();