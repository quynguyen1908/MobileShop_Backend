import { Test, TestingModule } from '@nestjs/testing';
import { PhoneController } from './phone.controller';
import { PhoneService } from './phone.service';
import { createMock } from '@golevelup/ts-jest';
import { SearchService } from '../search/search.service';

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
        {
          provide: SearchService,
          useValue: createMock<SearchService>(),
        },
      ],
    }).compile();

    controller = module.get<PhoneController>(PhoneController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
