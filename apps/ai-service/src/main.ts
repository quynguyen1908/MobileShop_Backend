import { NestFactory } from '@nestjs/core';
import { AiServiceModule } from './ai-service.module';
import { ValidationPipe } from '@nestjs/common/pipes/validation.pipe';

async function bootstrap() {
  const app = await NestFactory.create(AiServiceModule);

  app.setGlobalPrefix('api');

  app.enableCors({
    origin: true,
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );

  const port = process.env.AI_SERVICE_PORT || 4000;
  await app.listen(port);
  console.log(`AI Service is running on: http://localhost:${port}`);
}

void bootstrap().catch((err) => {
  console.error('Failed to start AI Service:', err);
  process.exit(1);
});
