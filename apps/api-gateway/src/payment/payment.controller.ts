import { PAYMENT_SERVICE } from '@app/contracts';
import type { ReqWithRequester } from '@app/contracts';
import {
  Body,
  Controller,
  Get,
  HttpStatus,
  Inject,
  Logger,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CircuitBreakerService } from '../circuit-breaker/circuit-breaker.service';
import { RemoteAuthGuard } from '@app/contracts/auth';
import { PAYMENT_PATTERN, PAYMENT_SERVICE_NAME } from '@app/contracts/payment';
import type {
  PaymentCreateDto,
  PaymentMethod,
  VNPayCallbackDto,
  VNPayResultDto,
} from '@app/contracts/payment';
import { FallbackResponse, ServiceError } from '../dto/error.dto';
import { ApiResponseDto } from '../dto/response.dto';
import { formatError } from '../utils/error';
import type { Response } from 'express';
import { isFallbackResponse } from '../utils/fallback';
import { firstValueFrom } from 'rxjs';
import { ConfigService } from '@nestjs/config';

@ApiTags('Payments')
@Controller('v1/payments')
export class PaymentController {
  private readonly logger = new Logger(PaymentController.name);

  constructor(
    @Inject(PAYMENT_SERVICE) private readonly paymentServiceClient: ClientProxy,
    private readonly circuitBreakerService: CircuitBreakerService,
    private readonly configService: ConfigService,
  ) {}

  @Post('cod')
  @UseGuards(RemoteAuthGuard)
  @ApiOperation({ summary: 'Create COD payment (requires authentication)' })
  @ApiBody({
    description: 'COD payment creation data',
    schema: {
      type: 'object',
      properties: {
        orderId: { type: 'number', example: 1 },
      },
      required: ['orderId'],
    },
  })
  @ApiResponse({
    status: 200,
    description: 'COD payment created successfully',
    content: {
      'application/json': {
        example: {
          statusCode: 200,
          message: 'COD payment created successfully',
          data: {
            paymentId: 1,
          },
        },
      },
    },
  })
  async createCODPayment(
    @Req() req: ReqWithRequester,
    @Body() body: { orderId: number },
    @Res() res: Response,
  ) {
    try {
      const requester = req.requester;
      const result = await this.circuitBreakerService.sendRequest<
        number | FallbackResponse
      >(
        this.paymentServiceClient,
        PAYMENT_SERVICE_NAME,
        PAYMENT_PATTERN.CREATE_COD_PAYMENT,
        { requester, orderId: body.orderId },
        () => {
          return {
            fallback: true,
            message: 'Payment service is temporary unavailable',
          } as FallbackResponse;
        },
        { timeout: 10000 },
      );

      this.logger.log(
        'Payment service response:',
        JSON.stringify(result, null, 2),
      );

      if (isFallbackResponse(result)) {
        const fallbackResponse = new ApiResponseDto(
          HttpStatus.SERVICE_UNAVAILABLE,
          result.message,
        );
        return res
          .status(HttpStatus.SERVICE_UNAVAILABLE)
          .json(fallbackResponse);
      } else {
        const response = new ApiResponseDto(
          HttpStatus.OK,
          'COD payment created successfully',
          { paymentId: result },
        );
        return res.status(HttpStatus.OK).json(response);
      }
    } catch (error: unknown) {
      const typedError = error as ServiceError;
      const statusCode = typedError.statusCode || HttpStatus.BAD_REQUEST;
      const errorMessage = typedError.logMessage || 'Create COD payment failed';

      const errorResponse = new ApiResponseDto(
        statusCode,
        errorMessage,
        null,
        formatError(error),
      );
      return res.status(statusCode).json(errorResponse);
    }
  }

  @Post('vnpay/create')
  @UseGuards(RemoteAuthGuard)
  @ApiOperation({
    summary: 'Create VNPay payment URL (requires authentication)',
  })
  @ApiBody({
    description: 'Payment creation data',
    schema: {
      type: 'object',
      properties: {
        paymentMethodId: { type: 'number', example: 1 },
        orderId: { type: 'number', example: 1 },
        ipAddress: { type: 'string', example: '192.168.1.1' },
      },
      required: ['paymentMethodId', 'orderId'],
    },
  })
  @ApiResponse({
    status: 200,
    description: 'VNPay URL created successfully',
    content: {
      'application/json': {
        example: {
          statusCode: 200,
          message: 'VNPay URL created successfully',
          data: {
            paymentUrl: 'https://vnpay.vn/paymentv2/vpcpay.html?...',
          },
        },
      },
    },
  })
  async createVNPayPayment(
    @Req() req: ReqWithRequester,
    @Body() body: PaymentCreateDto,
    @Res() res: Response,
  ) {
    try {
      const requester = req.requester;
      const result = await this.circuitBreakerService.sendRequest<
        string | FallbackResponse
      >(
        this.paymentServiceClient,
        PAYMENT_SERVICE_NAME,
        PAYMENT_PATTERN.CREATE_VNPAY_PAYMENT_URL,
        { requester, paymentCreateDto: body },
        () => {
          return {
            fallback: true,
            message: 'Payment service is temporary unavailable',
          } as FallbackResponse;
        },
        { timeout: 10000 },
      );

      this.logger.log(
        'Payment service response:',
        JSON.stringify(result, null, 2),
      );

      if (isFallbackResponse(result)) {
        const fallbackResponse = new ApiResponseDto(
          HttpStatus.SERVICE_UNAVAILABLE,
          result.message,
        );
        return res
          .status(HttpStatus.SERVICE_UNAVAILABLE)
          .json(fallbackResponse);
      } else {
        const response = new ApiResponseDto(
          HttpStatus.OK,
          'VNPay URL created successfully',
          { paymentUrl: result },
        );
        return res.status(HttpStatus.OK).json(response);
      }
    } catch (error: unknown) {
      const typedError = error as ServiceError;
      const statusCode = typedError.statusCode || HttpStatus.BAD_REQUEST;
      const errorMessage =
        typedError.logMessage || 'Create VNPay payment URL failed';

      const errorResponse = new ApiResponseDto(
        statusCode,
        errorMessage,
        null,
        formatError(error),
      );
      return res.status(statusCode).json(errorResponse);
    }
  }

  @Get('vnpay/callback')
  @ApiOperation({
    summary: 'VNPay payment callback',
    description: `Endpoint to handle VNPay payment gateway callbacks
    Change VNPAY_RETURN_URL in environment variables to <your-https-url>/v1/payments/vnpay/callback (Can use ngrok for local testing)
    Change FRONTEND_PAYMENT_RESULT_URL in environment variables to your frontend payment result page URL.`,
  })
  @ApiResponse({
    status: 302,
    description:
      'Redirects to frontend payment result page with payment outcome parameters',
    headers: {
      Location: {
        description:
          'URL of the frontend payment result page with query parameters indicating payment outcome',
        schema: {
          type: 'string',
          example:
            'http://localhost:4200/payment/result?orderId=1&isValid=true&isSuccess=true&message=Payment+successful&orderCode=PH1710257334_ZY4PY&transactionId=15209085&amount=42234000&paymentId=2&payDate=20251018172119',
        },
      },
    },
  })
  async vnPayCallback(@Query() params: VNPayCallbackDto, @Res() res: Response) {
    try {
      const result = await firstValueFrom<VNPayResultDto>(
        this.paymentServiceClient.send(
          PAYMENT_PATTERN.PROCESS_VNPAY_CALLBACK,
          params,
        ),
      );

      const frontendPaymentResultUrl = new URL(
        this.configService.get<string>('FRONTEND_PAYMENT_RESULT_URL', ''),
      );

      frontendPaymentResultUrl.searchParams.append(
        'orderId',
        result.orderId.toString(),
      );

      frontendPaymentResultUrl.searchParams.append(
        'isValid',
        result.isValid.toString(),
      );
      frontendPaymentResultUrl.searchParams.append(
        'isSuccess',
        result.isSuccess.toString(),
      );
      frontendPaymentResultUrl.searchParams.append('message', result.message);
      frontendPaymentResultUrl.searchParams.append(
        'orderCode',
        result.orderCode,
      );
      frontendPaymentResultUrl.searchParams.append(
        'transactionId',
        result.transactionId,
      );
      frontendPaymentResultUrl.searchParams.append(
        'amount',
        result.amount.toString(),
      );
      if (result.paymentId)
        frontendPaymentResultUrl.searchParams.append(
          'paymentId',
          result.paymentId.toString(),
        );
      if (result.payDate)
        frontendPaymentResultUrl.searchParams.append('payDate', result.payDate);

      return res.redirect(frontendPaymentResultUrl.toString());
    } catch (error: unknown) {
      const typedError = error as ServiceError;
      const errorMessage =
        typedError.logMessage || 'VNPay callback processing failed';

      const frontendPaymentResultUrl = new URL(
        this.configService.get<string>('FRONTEND_PAYMENT_RESULT_URL', ''),
      );
      frontendPaymentResultUrl.searchParams.append('message', errorMessage);

      return res.redirect(frontendPaymentResultUrl.toString());
    }
  }

  @Get('methods')
  @ApiOperation({ summary: 'Get all payment methods' })
  async getAllPaymentMethods(@Res() res: Response) {
    try {
      const result = await this.circuitBreakerService.sendRequest<
        PaymentMethod[] | FallbackResponse
      >(
        this.paymentServiceClient,
        PAYMENT_SERVICE_NAME,
        PAYMENT_PATTERN.GET_ALL_PAYMENT_METHODS,
        {},
        () => {
          return {
            fallback: true,
            message: 'Payment service is temporary unavailable',
          } as FallbackResponse;
        },
        { timeout: 10000 },
      );

      this.logger.log(
        'Payment service response:',
        JSON.stringify(result, null, 2),
      );

      if (isFallbackResponse(result)) {
        const fallbackResponse = new ApiResponseDto(
          HttpStatus.SERVICE_UNAVAILABLE,
          result.message,
        );
        return res
          .status(HttpStatus.SERVICE_UNAVAILABLE)
          .json(fallbackResponse);
      } else {
        const response = new ApiResponseDto(
          HttpStatus.OK,
          'Payment methods retrieved successfully',
          result,
        );
        return res.status(HttpStatus.OK).json(response);
      }
    } catch (error: unknown) {
      const typedError = error as ServiceError;
      const statusCode = typedError.statusCode || HttpStatus.BAD_REQUEST;
      const errorMessage =
        typedError.logMessage || 'Getting payment methods failed';

      const errorResponse = new ApiResponseDto(
        statusCode,
        errorMessage,
        null,
        formatError(error),
      );
      return res.status(statusCode).json(errorResponse);
    }
  }
}
