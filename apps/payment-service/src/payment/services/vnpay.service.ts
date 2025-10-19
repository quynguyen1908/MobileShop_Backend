import {
  AppError,
  EVENT_PUBLISHER,
  ORDER_SERVICE,
  PAYMENT_REPOSITORY,
  USER_SERVICE,
  VNPayConfig,
} from '@app/contracts';
import type { IEventPublisher, Requester } from '@app/contracts';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  Payment,
  PAYMENT_SERVICE_NAME,
  PaymentCreatedEvent,
  PaymentStatus,
  PayMethod,
  type PaymentCreateDto,
  type VNPayCallbackDto,
  type VNPayResultDto,
} from '@app/contracts/payment';
import { ClientProxy, RpcException } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { ErrOrderNotFound, Order, ORDER_PATTERN } from '@app/contracts/order';
import crypto from 'crypto';
import moment from 'moment';
import type { IPaymentRepository, IVNPayService } from '../payment.port';
import {
  CustomerDto,
  ErrCustomerNotFound,
  USER_PATTERN,
} from '@app/contracts/user';

@Injectable()
export class VNPayService implements IVNPayService {
  private readonly vnPayConfig: VNPayConfig;
  private readonly logger = new Logger(VNPayService.name);

  constructor(
    private readonly configService: ConfigService,
    @Inject(PAYMENT_REPOSITORY)
    private readonly paymentRepository: IPaymentRepository,
    @Inject(ORDER_SERVICE) private readonly orderServiceClient: ClientProxy,
    @Inject(USER_SERVICE) private readonly userServiceClient: ClientProxy,
    @Inject(EVENT_PUBLISHER) private readonly eventPublisher: IEventPublisher,
  ) {
    this.vnPayConfig = this.configService.get<VNPayConfig>('vnpay') ?? {
      tmnCode: '',
      hashSecret: '',
      apiUrl: '',
      returnUrl: '',
      version: '',
      command: '',
      currCode: '',
    };
  }

  async createPaymentUrl(
    requester: Requester,
    paymentCreateDto: PaymentCreateDto,
  ): Promise<string> {
    try {
      const customer = await firstValueFrom<CustomerDto>(
        this.userServiceClient.send(
          USER_PATTERN.GET_CUSTOMER_BY_USER_ID,
          requester,
        ),
      );

      if (!customer) {
        throw new RpcException(
          AppError.from(ErrCustomerNotFound, 404)
            .withLog('Customer not found for user')
            .toJson(false),
        );
      }

      if (typeof customer.id !== 'number') {
        throw new RpcException(
          AppError.from(ErrCustomerNotFound, 404)
            .withLog('Customer ID is missing')
            .toJson(false),
        );
      }

      const order = await firstValueFrom<Order>(
        this.orderServiceClient.send(
          ORDER_PATTERN.GET_ORDER_BY_ID,
          paymentCreateDto.orderId,
        ),
      );

      if (!order) {
        throw new RpcException(
          AppError.from(ErrOrderNotFound, 404)
            .withLog('Order not found')
            .toJson(false),
        );
      }

      if (typeof order.id !== 'number') {
        throw new RpcException(
          AppError.from(ErrOrderNotFound, 404)
            .withLog('Order ID is missing')
            .toJson(false),
        );
      }

      if (order.customerId !== customer.id) {
        throw new RpcException(
          AppError.from(new Error('Order does not belong to customer'), 403)
            .withLog('Order does not belong to customer')
            .toJson(false),
        );
      }

      const payments = await this.paymentRepository.findPaymentsByOrderId(
        order.id,
      );

      if (payments.length > 0) {
        for (const payment of payments) {
          if (payment.status === PaymentStatus.COMPLETED) {
            throw new RpcException(
              AppError.from(new Error('Order has already been paid'))
                .withLog('Order has already been paid')
                .toJson(false),
            );
          }
        }
      }

      const dateFormat = moment().format('YYYYMMDDHHmmss');
      const vnpParams: Record<string, string> = {
        vnp_Version: this.vnPayConfig.version,
        vnp_Command: this.vnPayConfig.command,
        vnp_TmnCode: this.vnPayConfig.tmnCode,
        vnp_Amount: (order.finalAmount * 100).toString(),
        vnp_CreateDate: dateFormat,
        vnp_CurrCode: this.vnPayConfig.currCode,
        vnp_IpAddr: paymentCreateDto.ipAddress || '13.160.92.202',
        vnp_Locale: 'vn',
        vnp_OrderInfo: `Thanh toan don hang #${order.orderCode}`,
        vnp_OrderType: 'other',
        vnp_ReturnUrl: this.vnPayConfig.returnUrl,
        vnp_ExpireDate: moment().add(15, 'minutes').format('YYYYMMDDHHmmss'),
        vnp_TxnRef: `${order.orderCode}_${Math.random().toString(36).substring(2, 7).toUpperCase()}`,
      };

      const sortedParams = this.sortObject(vnpParams);

      const signData = Object.keys(sortedParams)
        .map((key) => `${key}=${sortedParams[key]}`)
        .join('&');

      const hmac = crypto.createHmac('sha512', this.vnPayConfig.hashSecret);
      const signed = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');

      const vnpUrl = `${this.vnPayConfig.apiUrl}?${signData}&vnp_SecureHash=${signed}`;

      return vnpUrl;
    } catch (error: unknown) {
      this.logger.error(`Failed to create payment URL: ${String(error)}`);
      const typedError =
        error instanceof Error ? error : new Error('Unknown error');

      throw new RpcException(
        AppError.from(
          new Error(`Failed to create payment URL: ${typedError.message}`),
        ).withLog(`Failed to create payment URL: ${typedError.message}`),
      );
    }
  }

  async processCallback(params: VNPayCallbackDto): Promise<VNPayResultDto> {
    const isValid = this.validateCallback(params);

    if (!isValid) {
      return {
        isValid: false,
        isSuccess: false,
        message: 'Invalid signature',
        orderCode: params.vnp_TxnRef,
        amount: parseInt(params.vnp_Amount) / 100,
        transactionId: params.vnp_TransactionNo,
      };
    }

    const isSuccess =
      params.vnp_ResponseCode === '00' && params.vnp_TransactionStatus === '00';

    try {
      const orderCode = params.vnp_TxnRef.split('_')[0];
      this.logger.log(
        `Extracted order code: ${orderCode} from transaction reference: ${params.vnp_TxnRef}`,
      );

      const order = await firstValueFrom<Order>(
        this.orderServiceClient.send(
          ORDER_PATTERN.GET_ORDER_BY_ORDER_CODE,
          orderCode,
        ),
      );

      if (!order) {
        throw new RpcException(
          AppError.from(ErrOrderNotFound, 404)
            .withLog('Order not found')
            .toJson(false),
        );
      }

      if (typeof order.id !== 'number') {
        throw new RpcException(
          AppError.from(ErrOrderNotFound, 404)
            .withLog('Order ID is missing')
            .toJson(false),
        );
      }

      const paymentMethods =
        await this.paymentRepository.findAllPaymentMethods();
      const vnPayMethod = paymentMethods.find(
        (method) => method.code === PayMethod.VNPAY.toString(),
      );

      const payment: Payment = {
        paymentMethodId: vnPayMethod?.id ?? 1,
        orderId: order.id,
        transactionId: params.vnp_TransactionNo,
        status: isSuccess ? PaymentStatus.COMPLETED : PaymentStatus.FAILED,
        amount: parseInt(params.vnp_Amount) / 100,
        payDate: params.vnp_PayDate,
        isDeleted: false,
      };

      const newPayment = await this.paymentRepository.insertPayment(payment);

      const event = PaymentCreatedEvent.create(
        {
          id: newPayment.id!,
          paymentMethodId: payment.paymentMethodId,
          orderId: order.id,
          transactionId: params.vnp_TransactionNo,
          status: payment.status,
          amount: payment.amount,
          payDate: payment.payDate,
        },
        PAYMENT_SERVICE_NAME,
      );

      await this.eventPublisher.publish(event);

      return {
        isValid: true,
        isSuccess,
        message: isSuccess
          ? 'Payment successful'
          : `Payment failed with response code: ${params.vnp_ResponseCode}`,
        orderCode: params.vnp_TxnRef,
        amount: parseInt(params.vnp_Amount) / 100,
        transactionId: params.vnp_TransactionNo,
        paymentId: newPayment.id!,
        payDate: params.vnp_PayDate,
      };
    } catch (error: unknown) {
      this.logger.error(`Failed to process callback: ${String(error)}`);
      const typedError =
        error instanceof Error ? error : new Error('Unknown error');
      throw new RpcException(
        AppError.from(
          new Error(`Failed to process callback: ${typedError.message}`),
        )
          .withLog(`Failed to process callback: ${typedError.message}`)
          .toJson(false),
      );
    }
  }

  private validateCallback(params: VNPayCallbackDto): boolean {
    try {
      const vnpParams = { ...params };
      const secureHash = vnpParams['vnp_SecureHash'];

      delete vnpParams['vnp_SecureHash'];
      delete vnpParams['vnp_SecureHashType'];

      const filteredParams = Object.fromEntries(
        Object.entries(vnpParams).filter(([_, value]) => value !== undefined),
      ) as Record<string, string>;
      const sortedParams = this.sortObject(filteredParams);

      const signData = Object.keys(sortedParams)
        .map((key) => `${key}=${sortedParams[key]}`)
        .join('&');

      const hmac = crypto.createHmac('sha512', this.vnPayConfig.hashSecret);
      const signed = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');

      return secureHash === signed;
    } catch (error: unknown) {
      this.logger.error(`Failed to validate callback: ${String(error)}`);
      return false;
    }
  }

  private sortObject(obj: Record<string, string>) {
    const sorted = {};
    const keys = Object.keys(obj).sort();
    for (const key of keys) {
      sorted[key] = encodeURIComponent(obj[key]).replace(/%20/g, '+');
    }
    return sorted;
  }
}
