import { NestFactory } from '@nestjs/core';
import { OrderServiceModule } from './order-service.module';
import { RabbitMQService } from '@app/contracts/rmq/rmq.service';
import { OrderEventHandler } from './order/order-event.handler';

async function bootstrap() {
  const app = await NestFactory.create(OrderServiceModule);
  app.enableShutdownHooks();
  const rmqService = app.get<RabbitMQService>(RabbitMQService);
  const orderEventHandler = app.get(OrderEventHandler);
  app.connectMicroservice(rmqService.orderServiceOptions);

  try {
    await orderEventHandler.initSubscriptions();
    console.log('Event subscriptions initialized successfully');
  } catch (error) {
    console.error('Error initializing event subscriptions:', error);
  }

  await app.startAllMicroservices();
  console.log('Order Service is listening...');
}
void bootstrap().catch((err) => {
  console.error('Failed to start Order Service:', err);
  process.exit(1);
});
