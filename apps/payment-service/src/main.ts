import { NestFactory } from '@nestjs/core';
import { PaymentServiceModule } from './payment-service.module';
import { RabbitMQService } from '@app/contracts/rmq';

async function bootstrap() {
  const app = await NestFactory.create(PaymentServiceModule);
  app.enableShutdownHooks();
  const rmqService = app.get<RabbitMQService>(RabbitMQService);

  app.connectMicroservice(rmqService.paymentServiceOptions);

  await app.startAllMicroservices();
  console.log('Payment Service is listening...');
}
void bootstrap().catch((err) => {
  console.error('Failed to start Payment Service:', err);
  process.exit(1);
});
