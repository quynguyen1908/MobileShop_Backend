import { NestFactory } from '@nestjs/core';
import { AuthServiceModule } from './auth-service.module';
import { RabbitMQService } from '@app/rabbitmq';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

async function bootstrap() {
  const app = await NestFactory.create(AuthServiceModule, { bufferLogs: true });
  app.enableShutdownHooks();
  const rmqService = app.get<RabbitMQService>(RabbitMQService);

  app.connectMicroservice(rmqService.authServiceOptions);
  app.useLogger(app.get(WINSTON_MODULE_NEST_PROVIDER));

  await app.startAllMicroservices();
  const port = process.env.AUTH_SERVICE_PORT || 3001;
  await app.listen(port);
  console.log('Auth Service is listening...');
}
void bootstrap().catch((err) => {
  console.error('Failed to start Auth Service:', err);
  process.exit(1);
});
