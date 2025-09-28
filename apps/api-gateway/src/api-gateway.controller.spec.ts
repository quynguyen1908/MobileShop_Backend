import { Test, TestingModule } from '@nestjs/testing';
import { HealthController } from './api-gateway.controller';
import { CircuitBreakerModule } from './circuit-breaker/circuit-breaker.module';
import { TOKEN_VALIDATOR } from '@app/contracts';

describe('ApiGatewayController', () => {
  let controller: HealthController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [CircuitBreakerModule],
      controllers: [HealthController],
      providers: [
        {
          provide: TOKEN_VALIDATOR,
          useValue: {},
        },
      ],
    }).compile();

    controller = module.get<HealthController>(HealthController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
