import { NestFactory } from '@nestjs/core';
import { OrderServiceModule } from './order-service.module';
import { RabbitMQService } from '@app/contracts/rmq/rmq.service';

async function bootstrap() {
  const app = await NestFactory.create(OrderServiceModule);
  const rmqService = app.get<RabbitMQService>(RabbitMQService);

  app.connectMicroservice(rmqService.orderServiceOptions);

  await app.startAllMicroservices();
  console.log('Order Service is listening...');
}
void bootstrap().catch((err) => {
  console.error('Failed to start Order Service:', err);
  process.exit(1);
});
