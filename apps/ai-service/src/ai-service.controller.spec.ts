import { Test, TestingModule } from '@nestjs/testing';
import { AiServiceHealthController } from './ai-service.controller';

describe('AiServiceHealthController', () => {
  let controller: AiServiceHealthController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AiServiceHealthController],
      providers: [],
    }).compile();

    controller = module.get<AiServiceHealthController>(
      AiServiceHealthController,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
