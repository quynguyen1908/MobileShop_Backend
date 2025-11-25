import { Controller } from '@nestjs/common';
import { VNPayService } from './services/vnpay.service';
import { MessagePattern, Payload } from '@nestjs/microservices';
import type {
  PaymentCreateDto,
  PaymentDto,
  PaymentMethod,
  VNPayCallbackDto,
  VNPayResultDto,
} from '@app/contracts/payment';
import { PAYMENT_PATTERN } from '@app/contracts/payment';
import { Requester } from '@app/contracts';
import { PaymentService } from './services/payment.service';

@Controller()
export class PaymentController {
  constructor(
    private readonly vnPayService: VNPayService,
    private readonly paymentService: PaymentService,
  ) {}

  @MessagePattern(PAYMENT_PATTERN.CREATE_VNPAY_PAYMENT_URL)
  createPaymentUrl(
    @Payload()
    payload: {
      requester: Requester;
      paymentCreateDto: PaymentCreateDto;
    },
  ): Promise<string> {
    const { requester, paymentCreateDto } = payload;
    return this.vnPayService.createPaymentUrl(requester, paymentCreateDto);
  }

  @MessagePattern(PAYMENT_PATTERN.CREATE_MOBILE_VNPAY_PAYMENT_URL)
  createMobilePaymentUrl(
    @Payload()
    payload: {
      requester: Requester;
      orderId: number;
    },
  ): Promise<string> {
    const { requester, orderId } = payload;
    return this.vnPayService.createMobilePaymentUrl(requester, orderId);
  }

  @MessagePattern(PAYMENT_PATTERN.PROCESS_VNPAY_CALLBACK)
  processCallback(data: VNPayCallbackDto): Promise<VNPayResultDto> {
    return this.vnPayService.processCallback(data);
  }

  @MessagePattern(PAYMENT_PATTERN.GET_PAYMENT_BY_ORDER_IDS)
  getPaymentsByOrderIds(@Payload() orderIds: number[]): Promise<PaymentDto[]> {
    return this.paymentService.getPaymentsByOrderIds(orderIds);
  }

  @MessagePattern(PAYMENT_PATTERN.GET_ALL_PAYMENT_METHODS)
  getAllPaymentMethods(): Promise<PaymentMethod[]> {
    return this.paymentService.getAllPaymentMethods();
  }

  @MessagePattern(PAYMENT_PATTERN.CREATE_COD_PAYMENT)
  createCODPayment(
    @Payload()
    payload: {
      requester: Requester;
      orderId: number;
    },
  ): Promise<number> {
    const { requester, orderId } = payload;
    return this.paymentService.createCODPayment(requester, orderId);
  }
}
