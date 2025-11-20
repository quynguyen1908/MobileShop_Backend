import { NestFactory } from '@nestjs/core';
import { PhoneServiceModule } from './phone-service.module';
import { RabbitMQService } from '@app/rabbitmq';
import { PhoneEventHandler } from './phone/phone-event.handler';

async function bootstrap() {
  const app = await NestFactory.create(PhoneServiceModule);
  app.enableShutdownHooks();
  const rmqService = app.get<RabbitMQService>(RabbitMQService);
  const phoneEventHandler = app.get(PhoneEventHandler);
  app.connectMicroservice(rmqService.phoneServiceOptions);

  try {
    await phoneEventHandler.initSubscriptions();
    console.log('Event subscriptions initialized successfully');
  } catch (error) {
    console.error('Error initializing event subscriptions:', error);
  }

  await app.startAllMicroservices();
  const port = process.env.PHONE_SERVICE_PORT || 3003;
  await app.listen(port);
  console.log('Phone Service is listening...');
}
void bootstrap().catch((err) => {
  console.error('Failed to start Phone Service:', err);
  process.exit(1);
});
