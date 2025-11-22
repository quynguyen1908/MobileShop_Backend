import { NestFactory } from '@nestjs/core';
import { UserServiceModule } from './user-service.module';
import { RabbitMQService } from '@app/rabbitmq';
import { UserEventHandler } from './user/user-event.handler';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

async function bootstrap() {
  const app = await NestFactory.create(UserServiceModule, { bufferLogs: true });
  app.enableShutdownHooks();
  const rmqService = app.get<RabbitMQService>(RabbitMQService);
  app.useLogger(app.get(WINSTON_MODULE_NEST_PROVIDER));
  const userEventHandler = app.get(UserEventHandler);

  app.connectMicroservice(rmqService.userServiceOptions);

  try {
    await userEventHandler.initSubscriptions();
    console.log('Event subscriptions initialized successfully');
  } catch (error) {
    console.error('Error initializing event subscriptions:', error);
  }

  await app.startAllMicroservices();
  const port = process.env.USER_SERVICE_PORT || 3002;
  await app.listen(port);
  console.log('User Service is listening...');
}

void bootstrap().catch((err) => {
  console.error('Failed to start User Service:', err);
  process.exit(1);
});
