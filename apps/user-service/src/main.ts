import { NestFactory } from '@nestjs/core';
import { UserServiceModule } from './user-service.module';
import { RabbitMQService } from '@app/contracts/rmq';
import { UserEventHandler } from './user/user-event.handler';

async function bootstrap() {
  const app = await NestFactory.create(UserServiceModule);
  app.enableShutdownHooks();
  const rmqService = app.get<RabbitMQService>(RabbitMQService);

  const userEventHandler = app.get(UserEventHandler);

  app.connectMicroservice(rmqService.userServiceOptions);

  try {
    await userEventHandler.initSubscriptions();
    console.log('Event subscriptions initialized successfully');
  } catch (error) {
    console.error('Error initializing event subscriptions:', error);
  }

  await app.startAllMicroservices();

  console.log('User Service is listening...');
}

void bootstrap().catch((err) => {
  console.error('Failed to start User Service:', err);
  process.exit(1);
});
