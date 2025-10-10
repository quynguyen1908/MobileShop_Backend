import { NestFactory } from '@nestjs/core';
import { AiServiceModule } from './ai-service.module';
import { ValidationPipe } from '@nestjs/common/pipes/validation.pipe';
import { DocumentBuilder } from '@nestjs/swagger/dist/document-builder';
import { SwaggerModule } from '@nestjs/swagger/dist/swagger-module';

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

  const config = new DocumentBuilder()
    .setTitle('AI Service API')
    .setDescription('The AI Service API description')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/v1/docs', app, document);

  const port = process.env.AI_SERVICE_PORT || 4000;
  await app.listen(port);
  console.log(`AI Service is running on: http://localhost:${port}`);
  console.log(`Swagger documentation: http://localhost:${port}/api/v1/docs`);
}

void bootstrap().catch((err) => {
  console.error('Failed to start AI Service:', err);
  process.exit(1);
});
