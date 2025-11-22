import { NestFactory } from '@nestjs/core';
import { AiServiceModule } from './ai-service.module';
import { ValidationPipe } from '@nestjs/common/pipes/validation.pipe';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

async function bootstrap() {
  const app = await NestFactory.create(AiServiceModule, { bufferLogs: true });
  app.enableShutdownHooks();
  app.setGlobalPrefix('api');

  app.enableCors({
    origin: true,
    credentials: true,
  });

  app.useLogger(app.get(WINSTON_MODULE_NEST_PROVIDER));

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
