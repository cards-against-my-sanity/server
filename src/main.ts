import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { InstanceToPlainInterceptor } from './util/interceptor/instance-to-plain.interceptor';
import * as cookieParser from 'cookie-parser';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get<ConfigService>(ConfigService);

  app.useGlobalPipes(new ValidationPipe({ transform: true, transformOptions: { enableImplicitConversion: true } }));
  app.useGlobalInterceptors(new InstanceToPlainInterceptor());

  app.use(cookieParser(config.get<string>("SIGNED_COOKIE_SECRET")));

  app.enableCors({
    origin: 'http://localho.st:3000',
    credentials: true
  });

  await app.listen(parseInt(config.get<string>("HTTP_PORT")) || 3000);
}

bootstrap();