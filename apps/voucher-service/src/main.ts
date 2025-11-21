import { NestFactory } from '@nestjs/core';
import { VoucherServiceModule } from './voucher-service.module';
import { RabbitMQService } from '@app/rabbitmq';
import { VoucherEventHandler } from './voucher/voucher-event.handler';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

async function bootstrap() {
  const app = await NestFactory.create(VoucherServiceModule, { bufferLogs: true });
  app.enableShutdownHooks();
  const rmqService = app.get<RabbitMQService>(RabbitMQService);
  const voucherEventHandler = app.get(VoucherEventHandler);
  app.useLogger(app.get(WINSTON_MODULE_NEST_PROVIDER));
  app.connectMicroservice(rmqService.voucherServiceOptions);

  try {
    await voucherEventHandler.initSubscriptions();
    console.log('Event subscriptions initialized successfully');
  } catch (error) {
    console.error('Failed to initialize event subscriptions:', error);
  }

  await app.startAllMicroservices();
  const port = process.env.VOUCHER_SERVICE_PORT || 3006;
  await app.listen(port);
  console.log('Voucher Service is listening...');
}

void bootstrap().catch((err) => {
  console.error('Failed to start Voucher Service:', err);
  process.exit(1);
});
