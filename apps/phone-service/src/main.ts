import { NestFactory } from '@nestjs/core';
import { PhoneServiceModule } from './phone-service.module';
import { RabbitMQService } from '@app/contracts/rmq/rmq.service';

async function bootstrap() {
  const app = await NestFactory.create(PhoneServiceModule);
  const rmqService = app.get<RabbitMQService>(RabbitMQService);

  app.connectMicroservice(rmqService.phoneServiceOptions);

  await app.startAllMicroservices();
  console.log('Phone Service is listening...');
}
void bootstrap().catch((err) => {
  console.error('Failed to start Phone Service:', err);
  process.exit(1);
});
