import { NestFactory } from '@nestjs/core';
import { UserServiceModule } from './user-service.module';
import { RabbitMQService } from '@app/contracts/rmq';

async function bootstrap() {
  const app = await NestFactory.create(UserServiceModule);
  const rmqService = app.get<RabbitMQService>(RabbitMQService);

  app.connectMicroservice(rmqService.userServiceOptions);
  
  await app.startAllMicroservices();
  console.log('User Service is listening...');
}
bootstrap();