import { Inject, Injectable } from '@nestjs/common';
import type { IUserService, IUserRepository } from './user.port';
import type {
  IEventPublisher,
  Paginated,
  PagingDto,
  Requester,
} from '@app/contracts';
import {
  USER_REPOSITORY,
  AppError,
  AUTH_SERVICE,
  ORDER_SERVICE,
} from '@app/contracts';
import { EVENT_PUBLISHER } from '@app/rabbitmq';
import {
  AddressCreateDto,
  AddressDto,
  AddressUpdateDto,
  Commune,
  Customer,
  CustomerCreateDto,
  CustomerDto,
  customerSchema,
  CustomerUpdateDto,
  CustomerUpdateProfileDto,
  ErrCommuneNotFound,
  ErrProvinceNotFound,
  Notification,
  NotificationUpdateDto,
  Province,
} from '@app/contracts/user';
import { ClientProxy, RpcException } from '@nestjs/microservices';
import { AUTH_PATTERN, User } from '@app/contracts/auth';
import { firstValueFrom } from 'rxjs';
import { ORDER_PATTERN, PointHistoryDto } from '@app/contracts/order';

@Injectable()
export class UserService implements IUserService {
  constructor(
    @Inject(USER_REPOSITORY) private readonly userRepository: IUserRepository,
    @Inject(EVENT_PUBLISHER) private readonly eventPublisher: IEventPublisher,
    @Inject(AUTH_SERVICE) private readonly authServiceClient: ClientProxy,
    @Inject(ORDER_SERVICE) private readonly orderServiceClient: ClientProxy,
  ) {}

  // Customer

  async listCustomers(paging: PagingDto): Promise<Paginated<CustomerDto>> {
    const paginatedCustomers = await this.userRepository.listCustomers(paging);

    if (!paginatedCustomers.data || paginatedCustomers.data.length === 0) {
      return {
        data: [],
        paging: paginatedCustomers.paging,
        total: paginatedCustomers.total,
      };
    }

    const users = await firstValueFrom<User[]>(
      this.authServiceClient.send(
        AUTH_PATTERN.GET_USERS_BY_IDS,
        paginatedCustomers.data.map((c) => c.userId),
      ),
    );

    const customerDtos: CustomerDto[] = paginatedCustomers.data.map(
      (customer) => {
        const user = users.find((u) => u.id === customer.userId);

        if (!user) {
          throw new RpcException(
            AppError.from(new Error('User not found'), 404)
              .withLog('User not found for customer id ' + customer.id)
              .toJson(false),
          );
        }

        const customerDto: CustomerDto = {
          id: customer.id,
          firstName: customer.firstName,
          lastName: customer.lastName,
          gender: customer.gender,
          dateOfBirth: customer.dateOfBirth,
          pointsBalance: customer.pointsBalance,
          user: {
            id: user.id,
            username: user.username,
            email: user.email,
            phone: user.phone,
            status: user.status,
            lastChangePass: user.lastChangePass,
          },
          createdAt: customer.createdAt,
          updatedAt: customer.updatedAt,
          isDeleted: customer.isDeleted,
        };

        return customerDto;
      },
    );

    return {
      data: customerDtos,
      paging: paginatedCustomers.paging,
      total: paginatedCustomers.total,
    };
  }

  async getCustomerById(id: number): Promise<Customer> {
    const customer = await this.userRepository.findCustomerById(id);
    if (!customer) {
      throw new RpcException(
        AppError.from(new Error('Customer not found'), 404)
          .withLog('Customer not found')
          .toJson(false),
      );
    }

    return customer;
  }

  async getCustomerByUserId(request: Requester): Promise<CustomerDto> {
    const customer = await this.userRepository.findCustomerByUserId(
      request.sub,
    );
    if (!customer) {
      throw new RpcException(
        AppError.from(new Error('Customer not found'), 404)
          .withLog('Customer not found')
          .toJson(false),
      );
    }

    return this.toCustomerDto(customer);
  }

  async getCustomersByIds(ids: number[]): Promise<CustomerDto[]> {
    const customers = await this.userRepository.findCustomersByIds(ids);

    const users = await firstValueFrom<User[]>(
      this.authServiceClient.send(AUTH_PATTERN.GET_USERS_BY_IDS, customers.map(c => c.userId)),
    );
    if (!users || users.length === 0) {
      throw new RpcException(
        AppError.from(new Error('User not found'), 404)
          .withLog('User not found')
          .toJson(false),
      );
    }

    const customerDtos: CustomerDto[] = customers.map((customer) => {
      const user = users.find((u) => u.id === customer.userId);

      if (!user) {
        throw new RpcException(
          AppError.from(new Error('User not found'), 404)
            .withLog('User not found for customer id ' + customer.id)
            .toJson(false),
        );
      }

      const customerDto: CustomerDto = {
        id: customer.id,
        firstName: customer.firstName,
        lastName: customer.lastName,
        gender: customer.gender,
        dateOfBirth: customer.dateOfBirth,
        pointsBalance: customer.pointsBalance,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          phone: user.phone,
          status: user.status,
          lastChangePass: user.lastChangePass,
        },
        createdAt: customer.createdAt,
        updatedAt: customer.updatedAt,
        isDeleted: customer.isDeleted,
      };
      return customerDto;
    });


    return customerDtos;
  }

  async createCustomer(customerCreateDto: CustomerCreateDto): Promise<number> {
    const data = customerSchema.parse(customerCreateDto);

    const customer: Customer = {
      userId: data.userId,
      firstName: data.firstName,
      lastName: data.lastName,
      dateOfBirth: data.dateOfBirth,
      pointsBalance: 0,
      isDeleted: false,
    };

    const createdCustomer = await this.userRepository.insertCustomer(customer);
    return createdCustomer.id!;
  }

  async updateCustomer(id: number, data: CustomerUpdateDto): Promise<void> {
    const customer = await this.userRepository.findCustomerById(id);
    if (!customer) {
      throw new RpcException(
        AppError.from(new Error('Customer not found'), 404)
          .withLog('Customer not found')
          .toJson(false),
      );
    }

    await this.userRepository.updateCustomer(id, data);
  }

  async updateCustomerProfile(
    request: Requester,
    data: CustomerUpdateProfileDto,
  ): Promise<void> {
    const user = await firstValueFrom<User>(
      this.authServiceClient.send(AUTH_PATTERN.GET_USER, request.sub),
    );
    if (!user) {
      throw new RpcException(
        AppError.from(new Error('User not found'), 404)
          .withLog('User not found')
          .toJson(false),
      );
    }

    if (data.username) {
      await firstValueFrom<void>(
        this.authServiceClient.send(AUTH_PATTERN.UPDATE_PROFILE, {
          id: user.id,
          data: { username: data.username },
        }),
      );
    }

    const customer = await this.userRepository.findCustomerByUserId(
      request.sub,
    );
    if (!customer) {
      throw new RpcException(
        AppError.from(new Error('Customer not found'), 404)
          .withLog('Customer not found')
          .toJson(false),
      );
    }

    const customerUpdateData: CustomerUpdateDto = {
      gender: data.gender,
      firstName: data.firstName,
      lastName: data.lastName,
      updatedAt: new Date(),
    };

    await this.userRepository.updateCustomer(customer.id!, customerUpdateData);
  }

  // Province

  async getAllProvinces(): Promise<Province[]> {
    return this.userRepository.findAllProvinces();
  }

  async getProvincesByIds(ids: number[]): Promise<Province[]> {
    return this.userRepository.findProvincesByIds(ids);
  }

  // Commune

  async getCommunesByProvinceCode(provinceCode: number): Promise<Commune[]> {
    return this.userRepository.findCommunesByProvinceCode(provinceCode);
  }

  async getCommunesByIds(ids: number[]): Promise<Commune[]> {
    return this.userRepository.findCommunesByIds(ids);
  }

  // Address

  async getAddressBooks(request: Requester): Promise<AddressDto[]> {
    const customer = await this.userRepository.findCustomerByUserId(
      request.sub,
    );
    if (!customer) {
      throw new RpcException(
        AppError.from(new Error('Customer not found'), 404)
          .withLog('Customer not found')
          .toJson(false),
      );
    }

    const addresses = await this.userRepository.findAddressesByCustomerId(customer.id!);

    const provinceIds = Array.from(new Set(addresses.map(addr => addr.provinceId)));
    const provinces = await this.userRepository.findProvincesByIds(provinceIds);

    const communeIds = Array.from(new Set(addresses.map(addr => addr.communeId)));
    const communes = await this.userRepository.findCommunesByIds(communeIds);

    const addressDtos: AddressDto[] = addresses.map(addr => {
      const commune = communes.find((c) => c.id === addr.communeId);
      if (!commune) {
        throw new RpcException(
          AppError.from(ErrCommuneNotFound, 404)
            .withLog('Commune not found for order')
            .toJson(false),
        );
      }

      const province = provinces.find((p) => p.id === addr.provinceId);
      if (!province) {
        throw new RpcException(
          AppError.from(ErrProvinceNotFound, 404)
            .withLog('Province not found for order')
            .toJson(false),
        );
      }

      return {
        id: addr.id,
        customerId: addr.customerId,
        recipientName: addr.recipientName,
        recipientPhone: addr.recipientPhone,
        street: addr.street,
        postalCode: addr.postalCode,
        isDefault: addr.isDefault,
        commune: {
          id: commune.id,
          code: commune.code,
          name: commune.name,
          divisionType: commune.divisionType,
          codename: commune.codename,
          provinceCode: commune.provinceCode,
        },
        province: {
          id: province.id,
          code: province.code,
          name: province.name,
          divisionType: province.divisionType,
          codename: province.codename,
          phoneCode: province.phoneCode,
        },
      };
    });

    return addressDtos;
  }

  async addAddressBook(
    request: Requester,
    data: AddressCreateDto,
  ): Promise<number> {
    const customer = await this.userRepository.findCustomerByUserId(
      request.sub,
    );
    if (!customer) {
      throw new RpcException(
        AppError.from(new Error('Customer not found'), 404)
          .withLog('Customer not found')
          .toJson(false),
      );
    }

    const addressData: AddressCreateDto = {
      customerId: customer.id!,
      recipientName: data.recipientName,
      recipientPhone: data.recipientPhone,
      street: data.street,
      provinceId: data.provinceId,
      communeId: data.communeId,
      isDefault: data.isDefault,
      postalCode: data.postalCode || '700000',
    };

    const address = await this.userRepository.insertAddress(addressData);

    if (data.isDefault) {
      const addresses = await this.userRepository.findAddressesByCustomerId(
        customer.id!,
      );

      const addressIds = addresses
        .filter((addr) => addr.id !== address.id && addr.isDefault)
        .map((addr) => addr.id!);

      await this.userRepository.updateAddressesByIds(addressIds, {
        isDefault: false,
        updatedAt: new Date(),
      });
    }

    return address.id!;
  }

  async updateAddressBook(
    request: Requester,
    addressId: number,
    data: AddressUpdateDto,
  ): Promise<void> {
    const customer = await this.userRepository.findCustomerByUserId(
      request.sub,
    );
    if (!customer) {
      throw new RpcException(
        AppError.from(new Error('Customer not found'), 404)
          .withLog('Customer not found')
          .toJson(false),
      );
    }

    const addresses = await this.userRepository.findAddressesByCustomerId(
      customer.id!,
    );
    const address = addresses.find((addr) => addr.id === addressId);
    if (!address) {
      throw new RpcException(
        AppError.from(new Error('Address not found'), 404)
          .withLog('Address not found')
          .toJson(false),
      );
    }

    const updateData: AddressUpdateDto = {
      recipientName: data.recipientName,
      recipientPhone: data.recipientPhone,
      street: data.street,
      provinceId: data.provinceId,
      communeId: data.communeId,
      isDefault: data.isDefault,
      postalCode: data.postalCode,
      updatedAt: new Date(),
    };

    await this.userRepository.updateAddress(addressId, updateData);

    if (data.isDefault) {
      const addressIds = addresses
        .filter((addr) => addr.id !== address.id && addr.isDefault)
        .map((addr) => addr.id!);

      await this.userRepository.updateAddressesByIds(addressIds, {
        isDefault: false,
        updatedAt: new Date(),
      });
    }
  }

  async deleteAddressBook(
    request: Requester,
    addressId: number,
  ): Promise<void> {
    const customer = await this.userRepository.findCustomerByUserId(
      request.sub,
    );
    if (!customer) {
      throw new RpcException(
        AppError.from(new Error('Customer not found'), 404)
          .withLog('Customer not found')
          .toJson(false),
      );
    }

    const addresses = await this.userRepository.findAddressesByCustomerId(
      customer.id!,
    );
    const address = addresses.find((addr) => addr.id === addressId);
    if (!address) {
      throw new RpcException(
        AppError.from(new Error('Address not found'), 404)
          .withLog('Address not found')
          .toJson(false),
      );
    }

    const updateData: AddressUpdateDto = {
      isDeleted: true,
      updatedAt: new Date(),
    };

    await this.userRepository.updateAddress(addressId, updateData);

    if (address.isDefault && addresses.length > 1) {
      const otherAddresses = addresses.filter(
        (addr) => addr.id !== addressId && !addr.isDeleted,
      );
      if (otherAddresses.length > 0) {
        const newDefaultAddress = otherAddresses[0];
        await this.userRepository.updateAddress(newDefaultAddress.id!, {
          isDefault: true,
          updatedAt: new Date(),
        });
      }
    }
  }

  // Notification

  async getNotifications(request: Requester): Promise<Notification[]> {
    const notifications = await this.userRepository.findNotificationsByUserId(
      request.sub,
    );

    if (!notifications || notifications.length === 0) {
      return [];
    }

    return notifications;
  }

  async getUnreadNotifications(request: Requester): Promise<Notification[]> {
    const notifications =
      await this.userRepository.findUnreadNotificationsByUserId(request.sub);

    if (!notifications || notifications.length === 0) {
      return [];
    }

    return notifications;
  }

  async createNotifications(data: Notification[]): Promise<void> {
    await this.userRepository.insertNotifications(data);
  }

  async readNotifications(
    request: Requester,
    notificationIds: number[],
  ): Promise<void> {
    const notifications =
      await this.userRepository.findNotificationsByIds(notificationIds);
    if (!notifications || notifications.length === 0) {
      throw new RpcException(
        AppError.from(new Error('Notification not found'), 404)
          .withLog('Notification not found')
          .toJson(false),
      );
    }

    const unauthorized = notifications.filter((n) => n.userId !== request.sub);
    if (unauthorized.length > 0) {
      throw new RpcException(
        AppError.from(new Error('Forbidden'), 403)
          .withLog(
            'User not authorized to read notifications: ' +
              unauthorized.map((n) => n.id).join(', '),
          )
          .toJson(false),
      );
    }

    const data: NotificationUpdateDto = {
      isRead: true,
      readAt: new Date(),
      updatedAt: new Date(),
    };
    await this.userRepository.updateNotifications(notificationIds, data);
  }

  private async toCustomerDto(customer: Customer): Promise<CustomerDto> {
    const user = await firstValueFrom<User>(
      this.authServiceClient.send(AUTH_PATTERN.GET_USER, customer.userId),
    );
    if (!user) {
      throw new RpcException(
        AppError.from(new Error('User not found'), 404)
          .withLog('User not found')
          .toJson(false),
      );
    }

    const pointHistory = await firstValueFrom<PointHistoryDto[]>(
      this.orderServiceClient.send(
        ORDER_PATTERN.GET_POINT_TRANSACTIONS_BY_CUSTOMER_ID,
        customer.id,
      ),
    );

    const customerDto: CustomerDto = {
      id: customer.id,
      firstName: customer.firstName,
      lastName: customer.lastName,
      gender: customer.gender,
      dateOfBirth: customer.dateOfBirth,
      pointsBalance: customer.pointsBalance,
      pointHistory: pointHistory,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        phone: user.phone,
      },
      createdAt: customer.createdAt,
      updatedAt: customer.updatedAt,
      isDeleted: customer.isDeleted,
    };

    return customerDto;
  }
}
