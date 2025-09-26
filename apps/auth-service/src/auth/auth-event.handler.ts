import { AUTH_SERVICE, EVENT_SUBSCRIBER } from '@app/contracts';
import type { IEventSubscriber } from '@app/contracts';
import { Injectable, OnModuleInit, Logger, Inject } from '@nestjs/common';
import type { IAuthService } from './auth.port';

@Injectable()
export class AuthEventHandler implements OnModuleInit {
  private readonly logger = new Logger(AuthEventHandler.name);

  constructor(
    @Inject(EVENT_SUBSCRIBER)
    private readonly eventSubscriber: IEventSubscriber,
    @Inject(AUTH_SERVICE) private readonly authService: IAuthService,
  ) {}

  async onModuleInit() {
    await this.subscribe();
  }

  private async subscribe() {}
}
