import { NestFactory } from '@nestjs/core';
import { OrderServiceModule } from './order-service.module';
import { RabbitMQService } from '@app/rabbitmq';
import { OrderEventHandler } from './order/order-event.handler';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

async function bootstrap() {
  const app = await NestFactory.create(OrderServiceModule, { bufferLogs: true });
  app.enableShutdownHooks();
  const rmqService = app.get<RabbitMQService>(RabbitMQService);
  const orderEventHandler = app.get(OrderEventHandler);
  app.useLogger(app.get(WINSTON_MODULE_NEST_PROVIDER));
  app.connectMicroservice(rmqService.orderServiceOptions);

  try {
    await orderEventHandler.initSubscriptions();
    console.log('Event subscriptions initialized successfully');
  } catch (error) {
    console.error('Error initializing event subscriptions:', error);
  }

  await app.startAllMicroservices();
  const port = process.env.ORDER_SERVICE_PORT || 3004;
  await app.listen(port);
  console.log('Order Service is listening...');
}
void bootstrap().catch((err) => {
  console.error('Failed to start Order Service:', err);
  process.exit(1);
});
