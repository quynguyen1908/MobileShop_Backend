import { NestFactory } from '@nestjs/core';
import { PaymentServiceModule } from './payment-service.module';
import { RabbitMQService } from '@app/rabbitmq';
import { PaymentEventHandler } from './payment/payment-event.handler';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

async function bootstrap() {
  const app = await NestFactory.create(PaymentServiceModule, { bufferLogs: true });
  app.enableShutdownHooks();
  const rmqService = app.get<RabbitMQService>(RabbitMQService);
  const paymentEventHandler = app.get(PaymentEventHandler);
  app.useLogger(app.get(WINSTON_MODULE_NEST_PROVIDER));
  app.connectMicroservice(rmqService.paymentServiceOptions);

  try {
    await paymentEventHandler.initSubscriptions();
    console.log('Event subscriptions initialized successfully');
  } catch (error) {
    console.error('Error initializing event subscriptions:', error);
  }

  await app.startAllMicroservices();
  const port = process.env.PAYMENT_SERVICE_PORT || 3005;
  await app.listen(port);
  console.log('Payment Service is listening...');
}
void bootstrap().catch((err) => {
  console.error('Failed to start Payment Service:', err);
  process.exit(1);
});
