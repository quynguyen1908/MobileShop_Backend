import { NestFactory } from '@nestjs/core';
import { VoucherServiceModule } from './voucher-service.module';
import { RabbitMQService } from '@app/contracts/rmq';
import { VoucherEventHandler } from './voucher/voucher-event.handler';

async function bootstrap() {
  const app = await NestFactory.create(VoucherServiceModule);
  app.enableShutdownHooks();
  const rmqService = app.get<RabbitMQService>(RabbitMQService);
  const voucherEventHandler = app.get(VoucherEventHandler);
  app.connectMicroservice(rmqService.voucherServiceOptions);

  try {
    await voucherEventHandler.initSubscriptions();
    console.log('Event subscriptions initialized successfully');
  } catch (error) {
    console.error('Failed to initialize event subscriptions:', error);
  }

  await app.startAllMicroservices();

  console.log('Voucher Service is listening...');
}

void bootstrap().catch((err) => {
  console.error('Failed to start Voucher Service:', err);
  process.exit(1);
});
