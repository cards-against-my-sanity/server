import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { InstanceToPlainInterceptor } from './util/interceptor/instance-to-plain.interceptor';
import * as cookieParser from 'cookie-parser';
import { ConfigService } from '@nestjs/config';
import { NestExpressApplication } from '@nestjs/platform-express';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const config = app.get<ConfigService>(ConfigService);

  app.useGlobalPipes(new ValidationPipe({ transform: true, transformOptions: { enableImplicitConversion: true } }));
  app.useGlobalInterceptors(new InstanceToPlainInterceptor());

  app.use(cookieParser(config.get<string>("SIGNED_COOKIE_SECRET")));

  if (config.get<string>("NODE_ENV") === 'production') {
    app.set('trust proxy', 1);
  }

  app.enableCors({
    origin: config.get<string>("CORS_ORIGINS").split('\t'),
    credentials: true
  });

  await app.listen(parseInt(config.get<string>("HTTP_PORT")) || 3000);
}


bootstrap();