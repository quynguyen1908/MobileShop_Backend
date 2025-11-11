import { Inject, Injectable } from '@nestjs/common';
import type { IUserService, IUserRepository } from './user.port';
import type { IEventPublisher, Requester } from '@app/contracts';
import {
  USER_REPOSITORY,
  EVENT_PUBLISHER,
  AppError,
  AUTH_SERVICE,
  ORDER_SERVICE,
} from '@app/contracts';
import {
  Address,
  AddressCreateDto,
  AddressUpdateDto,
  Commune,
  Customer,
  CustomerCreateDto,
  CustomerDto,
  customerSchema,
  CustomerUpdateDto,
  CustomerUpdateProfileDto,
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

  async getCustomerById(id: number): Promise<Customer> {
    const customer = await this.userRepository.findCustomerById(id);
    if (!customer) {
      throw new RpcException(
        AppError.from(new Error('Customer not found'))
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
        AppError.from(new Error('Customer not found'))
          .withLog('Customer not found')
          .toJson(false),
      );
    }

    const user = await firstValueFrom<User>(
      this.authServiceClient.send(AUTH_PATTERN.GET_USER, request.sub),
    );
    if (!user) {
      throw new RpcException(
        AppError.from(new Error('User not found'))
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

  async updateCustomer(id: number, data: CustomerUpdateDto): Promise<void> {
    const customer = await this.userRepository.findCustomerById(id);
    if (!customer) {
      throw new RpcException(
        AppError.from(new Error('Customer not found'))
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
        AppError.from(new Error('User not found'))
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
        AppError.from(new Error('Customer not found'))
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

  async getAddressBooks(request: Requester): Promise<Address[]> {
    const customer = await this.userRepository.findCustomerByUserId(
      request.sub,
    );
    if (!customer) {
      throw new RpcException(
        AppError.from(new Error('Customer not found'))
          .withLog('Customer not found')
          .toJson(false),
      );
    }

    return this.userRepository.findAddressesByCustomerId(customer.id!);
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
        AppError.from(new Error('Customer not found'))
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
        AppError.from(new Error('Customer not found'))
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
        AppError.from(new Error('Address not found'))
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
        AppError.from(new Error('Customer not found'))
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
        AppError.from(new Error('Address not found'))
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
}
