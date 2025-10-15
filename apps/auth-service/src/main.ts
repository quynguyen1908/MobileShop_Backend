import { NestFactory } from '@nestjs/core';
import { AuthServiceModule } from './auth-service.module';
import { RabbitMQService } from '@app/contracts/rmq/rmq.service';

async function bootstrap() {
  const app = await NestFactory.create(AuthServiceModule);
  app.enableShutdownHooks();
  const rmqService = app.get<RabbitMQService>(RabbitMQService);

  app.connectMicroservice(rmqService.authServiceOptions);

  await app.startAllMicroservices();
  console.log('Auth Service is listening...');
}
void bootstrap().catch((err) => {
  console.error('Failed to start Auth Service:', err);
  process.exit(1);
});
