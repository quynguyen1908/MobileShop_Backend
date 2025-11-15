import {
  AUTH_SERVICE,
  EVENT_SUBSCRIBER,
  ORDER_SERVICE,
  PAYMENT_SERVICE,
  PHONE_SERVICE,
  USER_SERVICE,
} from '@app/contracts';
import type { IEventSubscriber } from '@app/contracts';
import { Injectable, Logger, Inject } from '@nestjs/common';
import type { IUserService } from './user.port';
import {
  EVT_AUTH_REGISTERED,
  EVT_AUTH_TEST,
  AuthRegisteredEvent,
  AuthTestEvent,
  AUTH_PATTERN,
} from '@app/contracts/auth';
import { EventJson } from '@app/contracts';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import {
  Notification,
  NotificationType,
  USER_SERVICE_NAME,
} from '@app/contracts/user';
import {
  EVT_ORDER_CREATED,
  EVT_ORDER_UPDATED,
  OrderCreatedEvent,
  OrderUpdatedEvent,
} from '@app/contracts/order/order.event';
import {
  Order,
  ORDER_PATTERN,
  OrderStatus,
  PointConfig,
  PointType,
} from '@app/contracts/order';
import {
  EVT_PAYMENT_CREATED,
  PAYMENT_PATTERN,
  PaymentCreatedEvent,
  PaymentMethod,
  PaymentStatus,
} from '@app/contracts/payment';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import {
  EVT_VOUCHER_CREATED,
  VoucherCreatedEvent,
} from '@app/contracts/voucher/voucher.event';
import { ApplyTo, DiscountType } from '@app/contracts/voucher';
import { formatCurrency } from '@app/contracts/utils';
import {
  Category,
  EVT_INVENTORY_LOW,
  InventoryLowEvent,
  PHONE_PATTERN,
} from '@app/contracts/phone';

interface TypedError {
  message: string;
  stack?: string;
}

@Injectable()
export class UserEventHandler {
  private readonly logger = new Logger(UserEventHandler.name);

  constructor(
    @Inject(EVENT_SUBSCRIBER)
    private readonly eventSubscriber: IEventSubscriber,
    @Inject(USER_SERVICE) private readonly userService: IUserService,
    @Inject(ORDER_SERVICE) private readonly orderServiceClient: ClientProxy,
    @Inject(AUTH_SERVICE) private readonly authServiceClient: ClientProxy,
    @Inject(PHONE_SERVICE) private readonly phoneServiceClient: ClientProxy,
    @Inject(PAYMENT_SERVICE) private readonly paymentServiceClient: ClientProxy,
    private eventEmitter: EventEmitter2,
  ) {
    this.logger.log('UserEventHandler initialized');
    this.eventEmitter.emit('app.ready');
  }

  @OnEvent('app.ready')
  async initSubscriptions(): Promise<void> {
    await this.subscribe();
  }

  async handleAuthRegistered(event: AuthRegisteredEvent): Promise<void> {
    this.logger.log(
      `Handling AuthRegistered event for user ID: ${event.payload.id}`,
    );
    try {
      let dateOfBirth: Date = new Date('1900-01-01T00:00:00Z');

      if (event.payload.dateOfBirth) {
        try {
          if (event.payload.dateOfBirth instanceof Date) {
            dateOfBirth = event.payload.dateOfBirth;
          } else {
            const parsedDate = new Date(event.payload.dateOfBirth);
            if (!isNaN(parsedDate.getTime())) {
              dateOfBirth = parsedDate;
            }
          }
        } catch (dateError) {
          const typedError = dateError as TypedError;
          this.logger.warn(
            `Error parsing dateOfBirth: ${typedError.message}, using undefined`,
          );
        }
      }

      await this.userService.createCustomer({
        userId: event.payload.id,
        firstName: event.payload.firstName,
        lastName: event.payload.lastName,
        dateOfBirth: dateOfBirth,
      });
    } catch (error) {
      const typedError = error as TypedError;
      this.logger.error(`Failed to create customer: ${typedError.message}`);
    }
  }

  async handleOrderCreated(event: OrderCreatedEvent): Promise<void> {
    this.logger.log(
      `Handling OrderCreated event for order ID: ${event.payload.id}`,
    );
    try {
      const customerId = event.payload.customerId;
      if (!customerId) {
        this.logger.log(
          'No customerId associated with this order, skipping point update',
        );
        return;
      }

      const customer = await this.userService.getCustomerById(customerId);
      if (!customer) {
        this.logger.log(
          `Customer with ID ${customerId} not found, skipping point update`,
        );
        return;
      }

      // Create notifications
      const notifications: Notification[] = [];

      // Customer notification
      const customerNotification: Notification = {
        userId: customer.userId,
        title: `Đơn hàng #${event.payload.orderCode} đã được tạo thành công!`,
        message:
          'Nếu bạn chọn thanh toán online, vui lòng hoàn tất thanh toán.',
        isRead: false,
        type: NotificationType.ORDER,
        createdAt: new Date(),
        isDeleted: false,
      };
      notifications.push(customerNotification);

      // Admin notifications
      const adminIds = await firstValueFrom<number[]>(
        this.authServiceClient.send(AUTH_PATTERN.GET_ADMIN_USER_IDS, {}),
      );

      for (const adminId of adminIds) {
        const adminNotification: Notification = {
          userId: adminId,
          title: `Đơn hàng #${event.payload.orderCode} đã được tạo!`,
          message: `Vui lòng kiểm tra và xử lý đơn hàng kịp thời.`,
          isRead: false,
          type: NotificationType.ADMIN,
          createdAt: new Date(),
          isDeleted: false,
        };
        notifications.push(adminNotification);
      }

      await this.userService.createNotifications(notifications);

      // Update customer points based on point transactions in the order
      const pointTransactions = event.payload.pointTransactions;

      if (!pointTransactions || pointTransactions.length === 0) {
        this.logger.log(
          'No point transactions associated with this order, skipping point update',
        );
        return;
      }

      let usedPoints = 0;
      for (const transaction of pointTransactions) {
        if (transaction.type === PointType.REDEEM) {
          usedPoints += transaction.points;
        }
      }

      const newPointsBalance = customer.pointsBalance - usedPoints;

      await this.userService.updateCustomer(customerId, {
        pointsBalance: newPointsBalance,
        updatedAt: new Date(),
      });
    } catch (error) {
      const typedError = error as TypedError;
      this.logger.error(
        `Failed to update customer points: ${typedError.message}`,
      );
    }
  }

  async handleOrderUpdated(event: OrderUpdatedEvent): Promise<void> {
    this.logger.log(
      `Handling OrderUpdated event for order ID: ${event.payload.id}`,
    );
    try {
      const customerId = event.payload.customerId;
      if (!customerId) {
        this.logger.log(
          'No customerId associated with this order, skipping point update',
        );
        return;
      }

      const customer = await this.userService.getCustomerById(customerId);
      if (!customer) {
        this.logger.log(
          `Customer with ID ${customerId} not found, skipping point update`,
        );
        return;
      }

      // Update customer points based on order status and point transactions
      const pointTransactions = event.payload.pointTransactions;
      const status = event.payload.status;

      let isUpdatedPoints = true;

      if (!pointTransactions || pointTransactions.length === 0) {
        this.logger.log(
          'No point transactions associated with this order, skipping point update',
        );
        isUpdatedPoints = false;
      }

      let title: string = '';
      let message: string = '';

      switch (status) {
        case OrderStatus.CANCELED.toString(): {
          if (isUpdatedPoints) {
            let refundedPoints = 0;
            for (const transaction of pointTransactions) {
              if (transaction.type === PointType.REFUND) {
                refundedPoints += transaction.points;
              }
            }

            const newPointsBalance = customer.pointsBalance + refundedPoints;

            await this.userService.updateCustomer(customerId, {
              pointsBalance: newPointsBalance,
              updatedAt: new Date(),
            });
          }

          title = `Đơn hàng #${event.payload.orderCode} đã được hủy.`;
          message =
            'Số điểm được hoàn lại đã được cập nhật vào tài khoản của bạn.';

          break;
        }
        case OrderStatus.PAID.toString(): {
          title = `Đơn hàng #${event.payload.orderCode} đã được thanh toán thành công!`;
          message = 'Đơn hàng của bạn sẽ sớm được xử lý và giao đến bạn.';
          break;
        }
        case OrderStatus.SHIPPED.toString(): {
          title = `Đơn hàng #${event.payload.orderCode} đang được vận chuyển.`;
          message =
            'Bạn có thể theo dõi trạng thái vận chuyển trong mục đơn hàng của mình.';
          break;
        }
        case OrderStatus.DELIVERED.toString(): {
          if (isUpdatedPoints) {
            let earnedPoints = 0;

            if (event.payload.isCodPaid) {
              for (const transaction of pointTransactions) {
                if (transaction.type === PointType.EARN) {
                  earnedPoints += transaction.points;
                }
              }

              const newPointsBalance = customer.pointsBalance + earnedPoints;

              await this.userService.updateCustomer(customerId, {
                pointsBalance: newPointsBalance,
                updatedAt: new Date(),
              });
            }
          }

          title = `Đơn hàng #${event.payload.orderCode} đã được giao thành công!`;
          message =
            'Cảm ơn bạn đã mua hàng tại cửa hàng PHONEHUB của chúng tôi.';
          break;
        }
        default: {
          this.logger.log(
            `Order status is ${status}, no point update required`,
          );
          break;
        }
      }

      // Create notification
      const customerNotification: Notification = {
        userId: customer.userId,
        title: title,
        message: message,
        isRead: false,
        type: NotificationType.ORDER,
        createdAt: new Date(),
        isDeleted: false,
      };

      await this.userService.createNotifications([customerNotification]);
    } catch (error) {
      const typedError = error as TypedError;
      this.logger.error(
        `Failed to handle order updated event: ${typedError.message}`,
      );
    }
  }

  async handlePaymentCreated(event: PaymentCreatedEvent): Promise<void> {
    this.logger.log(
      `Handling PaymentCreated event for payment ID: ${event.payload.id}`,
    );
    try {
      const order = await firstValueFrom<Order>(
        this.orderServiceClient.send(
          ORDER_PATTERN.GET_ORDER_BY_ID,
          event.payload.orderId,
        ),
      );

      if (!order) {
        this.logger.log(
          `Order with ID ${event.payload.orderId} not found, skipping user update`,
        );
        return;
      }

      const customerId = order.customerId;
      if (!customerId) {
        this.logger.log(
          'No customerId associated with this order, skipping user update',
        );
        return;
      }

      const customer = await this.userService.getCustomerById(customerId);
      if (!customer) {
        this.logger.log(
          `Customer with ID ${customerId} not found, skipping user update`,
        );
        return;
      }

      const paymentStatus = event.payload.status;
      if (paymentStatus !== PaymentStatus.COMPLETED.toString()) {
        this.logger.log(
          `Payment status is ${paymentStatus}, not updating points`,
        );
        return;
      }

      const pointConfig = await firstValueFrom<PointConfig>(
        this.orderServiceClient.send(ORDER_PATTERN.GET_POINT_CONFIG, {}),
      );

      if (!pointConfig) {
        this.logger.log('Point configuration not found, skipping point update');
        return;
      }

      const pointsEarned = Math.floor(
        event.payload.amount / pointConfig.earnRate,
      );

      const newPointsBalance = customer.pointsBalance + pointsEarned;

      await this.userService.updateCustomer(customerId, {
        pointsBalance: newPointsBalance,
        updatedAt: new Date(),
      });
    } catch (error) {
      const typedError = error as TypedError;
      this.logger.error(
        `Failed to update customer after payment: ${typedError.message}`,
      );
    }
  }

  async handleVoucherCreated(event: VoucherCreatedEvent): Promise<void> {
    this.logger.log(
      `Handling VoucherCreated event for voucher ID: ${event.payload.id}`,
    );
    try {
      const customerIds = await firstValueFrom<number[]>(
        this.authServiceClient.send(AUTH_PATTERN.GET_CUSTOMER_USER_IDS, {}),
      );

      const notifications: Notification[] = [];

      let methods: PaymentMethod[] = [];
      let categories: Category[] = [];

      if (event.payload.paymentMethods) {
        methods = await firstValueFrom<PaymentMethod[]>(
          this.paymentServiceClient.send(
            PAYMENT_PATTERN.GET_ALL_PAYMENT_METHODS,
            {},
          ),
        );
      }

      if (event.payload.categories && event.payload.categories.length > 0) {
        categories = await firstValueFrom<Category[]>(
          this.phoneServiceClient.send(
            PHONE_PATTERN.GET_CATEGORIES_BY_IDS,
            event.payload.categories,
          ),
        );
      }

      for (const customerId of customerIds) {
        let message = '';

        if (event.payload.discountType === DiscountType.PERCENT.toString()) {
          message = `Giảm đến ${event.payload.discountValue}% tối đa ${formatCurrency(event.payload.maxDiscountValue)}`;
        } else {
          message = `Giảm đến ${formatCurrency(event.payload.discountValue)}`;
        }

        switch (event.payload.appliesTo) {
          case ApplyTo.ALL.toString(): {
            message += ' cho mọi đơn hàng.';
            break;
          }
          case ApplyTo.CATEGORY.toString(): {
            if (
              event.payload.categories &&
              event.payload.categories.length > 0
            ) {
              message += ` cho các đơn hàng có sản phẩm thuộc danh mục: ${categories
                .map((cat) => cat.name)
                .join(', ')}.`;
            }
            break;
          }
          case ApplyTo.PAYMENT_METHOD.toString(): {
            if (event.payload.paymentMethods) {
              const method = methods.find(
                (m) => m.id === event.payload.paymentMethods,
              );
              if (method) {
                message += ` cho các đơn hàng thanh toán qua ${method.name}.`;
              }
            }
            break;
          }
        }

        const notification: Notification = {
          userId: customerId,
          title: `Voucher mới phát hành: ${event.payload.code}`,
          message: message,
          isRead: false,
          type: NotificationType.VOUCHER,
          createdAt: new Date(),
          isDeleted: false,
        };
        notifications.push(notification);
      }

      await this.userService.createNotifications(notifications);
    } catch (error) {
      const typedError = error as TypedError;
      this.logger.error(
        `Failed to handle voucher created event: ${typedError.message}`,
      );
    }
  }

  async handleInventoryLow(event: InventoryLowEvent): Promise<void> {
    this.logger.log(
      `Handling InventoryLow event for variant ID: ${event.payload.variantId}`,
    );
    try {
      const notifications: Notification[] = [];

      // Admin notifications
      const adminIds = await firstValueFrom<number[]>(
        this.authServiceClient.send(AUTH_PATTERN.GET_ADMIN_USER_IDS, {}),
      );

      for (const adminId of adminIds) {
        const adminNotification: Notification = {
          userId: adminId,
          title: `Cảnh báo tồn kho thấp cho biến thể SKU: ${event.payload.sku}`,
          message: `Tồn kho của biến thể SKU ${event.payload.sku} đang ở mức thấp: ${event.payload.stockQuantity}. Vui lòng kiểm tra và bổ sung.`,
          isRead: false,
          type: NotificationType.ADMIN,
          createdAt: new Date(),
          isDeleted: false,
        };
        notifications.push(adminNotification);
      }

      await this.userService.createNotifications(notifications);
    } catch (error) {
      const typedError = error as TypedError;
      this.logger.error(
        `Failed to handle inventory low event: ${typedError.message}`,
      );
    }
  }

  handleAuthTest(event: AuthTestEvent): void {
    this.logger.log(
      `🎉 Successfully received AuthTest event with ID: ${event.id}`,
    );
    this.logger.log(`Message: ${event.payload.message}`);
    this.logger.log(`Timestamp: ${event.payload.timestamp}`);
    this.logger.log(`From sender: ${event.senderId || 'unknown'}`);
  }

  private async subscribe(): Promise<void> {
    this.logger.log('Subscribing to user events...');

    await this.eventSubscriber.subscribe(
      EVT_AUTH_REGISTERED,
      USER_SERVICE_NAME,
      (msg: string): void => {
        void (async () => {
          try {
            this.logger.log(`Received ${EVT_AUTH_REGISTERED} event: ${msg}`);
            const parsedData = JSON.parse(msg) as unknown;
            if (!this.isEventData(parsedData)) {
              throw new Error('Invalid event data format');
            }

            const data: EventJson = parsedData;

            const eventJson: EventJson = {
              eventName: EVT_AUTH_REGISTERED,
              payload: data.payload || {},
              id: data.id,
              occurredAt: data.occurredAt,
              senderId: data.senderId,
              correlationId: data.correlationId,
              version: data.version,
            };
            const event = AuthRegisteredEvent.from(eventJson);
            await this.handleAuthRegistered(event);
          } catch (error) {
            const typedError = error as TypedError;
            this.logger.error(
              `Error processing ${EVT_AUTH_REGISTERED} event: ${typedError.message}`,
              typedError.stack,
            );
          }
        })();
      },
    );

    await this.eventSubscriber.subscribe(
      EVT_AUTH_TEST,
      USER_SERVICE_NAME,
      (msg: string): void => {
        try {
          this.logger.log(`Received ${EVT_AUTH_TEST} event: ${msg}`);
          const parsedData = JSON.parse(msg) as unknown;
          if (!this.isEventData(parsedData)) {
            throw new Error('Invalid event data format');
          }

          const data: EventJson = parsedData;

          const eventJson: EventJson = {
            eventName: EVT_AUTH_TEST,
            payload: data.payload || {},
            id: data.id,
            occurredAt: data.occurredAt,
            senderId: data.senderId,
            correlationId: data.correlationId,
            version: data.version,
          };
          const event = AuthTestEvent.from(eventJson);
          this.handleAuthTest(event);
        } catch (error) {
          const typedError = error as TypedError;
          this.logger.error(
            `Error processing ${EVT_AUTH_TEST} event: ${typedError.message}`,
            typedError.stack,
          );
        }
      },
    );

    await this.eventSubscriber.subscribe(
      EVT_ORDER_CREATED,
      USER_SERVICE_NAME,
      (msg: string): void => {
        void (async () => {
          try {
            this.logger.log(`Received ${EVT_ORDER_CREATED} event: ${msg}`);
            const parsedData = JSON.parse(msg) as EventJson;

            const eventJson: EventJson = {
              eventName: EVT_ORDER_CREATED,
              payload: parsedData.payload || {},
              id: parsedData.id,
              occurredAt: parsedData.occurredAt,
              senderId: parsedData.senderId,
              correlationId: parsedData.correlationId,
              version: parsedData.version,
            };

            const event = OrderCreatedEvent.from(eventJson);
            await this.handleOrderCreated(event);
          } catch (error) {
            const typedError = error as TypedError;
            this.logger.error(
              `Error processing ${EVT_ORDER_CREATED} event: ${typedError.message}`,
              typedError.stack,
            );
          }
        })();
      },
    );

    await this.eventSubscriber.subscribe(
      EVT_ORDER_UPDATED,
      USER_SERVICE_NAME,
      (msg: string): void => {
        void (async () => {
          try {
            this.logger.log(`Received ${EVT_ORDER_UPDATED} event: ${msg}`);
            const parsedData = JSON.parse(msg) as EventJson;

            const eventJson: EventJson = {
              eventName: EVT_ORDER_UPDATED,
              payload: parsedData.payload || {},
              id: parsedData.id,
              occurredAt: parsedData.occurredAt,
              senderId: parsedData.senderId,
              correlationId: parsedData.correlationId,
              version: parsedData.version,
            };

            const event = OrderUpdatedEvent.from(eventJson);
            await this.handleOrderUpdated(event);
          } catch (error) {
            const typedError = error as TypedError;
            this.logger.error(
              `Error processing ${EVT_ORDER_UPDATED} event: ${typedError.message}`,
              typedError.stack,
            );
          }
        })();
      },
    );

    await this.eventSubscriber.subscribe(
      EVT_PAYMENT_CREATED,
      USER_SERVICE_NAME,
      (msg: string): void => {
        void (async () => {
          try {
            this.logger.log(`Received ${EVT_PAYMENT_CREATED} event: ${msg}`);
            const parsedData = JSON.parse(msg) as EventJson;

            const eventJson: EventJson = {
              eventName: EVT_PAYMENT_CREATED,
              payload: parsedData.payload || {},
              id: parsedData.id,
              occurredAt: parsedData.occurredAt,
              senderId: parsedData.senderId,
              correlationId: parsedData.correlationId,
              version: parsedData.version,
            };

            const event = PaymentCreatedEvent.from(eventJson);
            await this.handlePaymentCreated(event);
          } catch (error) {
            const typedError = error as TypedError;
            this.logger.error(
              `Error processing ${EVT_PAYMENT_CREATED} event: ${typedError.message}`,
              typedError.stack,
            );
          }
        })();
      },
    );

    await this.eventSubscriber.subscribe(
      EVT_VOUCHER_CREATED,
      USER_SERVICE_NAME,
      (msg: string): void => {
        void (async () => {
          try {
            this.logger.log(`Received ${EVT_VOUCHER_CREATED} event: ${msg}`);
            const parsedData = JSON.parse(msg) as EventJson;

            const eventJson: EventJson = {
              eventName: EVT_VOUCHER_CREATED,
              payload: parsedData.payload || {},
              id: parsedData.id,
              occurredAt: parsedData.occurredAt,
              senderId: parsedData.senderId,
              correlationId: parsedData.correlationId,
              version: parsedData.version,
            };

            const event = VoucherCreatedEvent.from(eventJson);
            await this.handleVoucherCreated(event);
          } catch (error) {
            const typedError = error as TypedError;
            this.logger.error(
              `Error processing ${EVT_VOUCHER_CREATED} event: ${typedError.message}`,
              typedError.stack,
            );
          }
        })();
      },
    );

    await this.eventSubscriber.subscribe(
      EVT_INVENTORY_LOW,
      USER_SERVICE_NAME,
      (msg: string): void => {
        void (async () => {
          try {
            this.logger.log(`Received ${EVT_INVENTORY_LOW} event: ${msg}`);
            const parsedData = JSON.parse(msg) as EventJson;

            const eventJson: EventJson = {
              eventName: EVT_INVENTORY_LOW,
              payload: parsedData.payload || {},
              id: parsedData.id,
              occurredAt: parsedData.occurredAt,
              senderId: parsedData.senderId,
              correlationId: parsedData.correlationId,
              version: parsedData.version,
            };

            const event = InventoryLowEvent.from(eventJson);
            await this.handleInventoryLow(event);
          } catch (error) {
            const typedError = error as TypedError;
            this.logger.error(
              `Error processing ${EVT_INVENTORY_LOW} event: ${typedError.message}`,
              typedError.stack,
            );
          }
        })();
      },
    );

    this.logger.log('Successfully subscribed to all user events');
  }

  private isEventData(data: unknown): data is EventJson {
    if (!data || typeof data !== 'object') {
      return false;
    }

    const obj = data as Partial<EventJson>;

    return (
      obj.eventName !== undefined &&
      typeof obj.eventName === 'string' &&
      obj.payload !== undefined &&
      typeof obj.payload === 'object'
    );
  }
}
