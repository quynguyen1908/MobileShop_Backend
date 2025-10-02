import { Test, TestingModule } from '@nestjs/testing';
import { PhoneController } from './phone.controller';
import { PhoneService } from './phone.service';
import { createMock } from '@golevelup/ts-jest';

describe('PhoneController', () => {
  let controller: PhoneController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PhoneController],
      providers: [
        {
          provide: PhoneService,
          useValue: createMock<PhoneService>(),
        },
      ],
    }).compile();

    controller = module.get<PhoneController>(PhoneController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
