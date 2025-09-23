import { Module, DynamicModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { RabbitMQService } from './rmq.service';
import { EVENT_PUBLISHER, EVENT_SUBSCRIBER } from '..';
import { RabbitMQClient } from './rmq-client';

@Module({})
export class RabbitMQModule {
    static register(): DynamicModule {
        return {
            module: RabbitMQModule,
            imports: [ConfigModule.forRoot()],
            providers: [
                RabbitMQService,
                RabbitMQClient,
                {
                    provide: EVENT_PUBLISHER,
                    useExisting: RabbitMQClient,
                },
                {
                    provide: EVENT_SUBSCRIBER,
                    useExisting: RabbitMQClient,
                }
            ],
            exports: [RabbitMQService, EVENT_PUBLISHER, EVENT_SUBSCRIBER],
            global: true,
        };
    }
}
