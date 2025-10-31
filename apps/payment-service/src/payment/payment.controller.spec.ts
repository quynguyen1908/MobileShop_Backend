import { Test, TestingModule } from '@nestjs/testing';
import { PaymentController } from './payment.controller';
import { VNPayService } from './services/vnpay.service';
import { createMock } from '@golevelup/ts-jest';
import { PaymentService } from './services/payment.service';

describe('PaymentController', () => {
  let controller: PaymentController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PaymentController],
      providers: [
        {
          provide: VNPayService,
          useValue: createMock<VNPayService>(),
        },
        {
          provide: PaymentService,
          useValue: createMock<PaymentService>(),
        },
      ],
    }).compile();

    controller = module.get<PaymentController>(PaymentController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
