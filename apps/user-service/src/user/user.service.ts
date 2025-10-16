import { Inject, Injectable } from '@nestjs/common';
import type { IUserService, IUserRepository } from './user.port';
import type { IEventPublisher, Requester } from '@app/contracts';
import {
  USER_REPOSITORY,
  EVENT_PUBLISHER,
  AppError,
  AUTH_SERVICE,
} from '@app/contracts';
import {
  Commune,
  Customer,
  CustomerCreateDto,
  CustomerDto,
  customerSchema,
  CustomerUpdateDto,
  Province,
} from '@app/contracts/user';
import { ClientProxy, RpcException } from '@nestjs/microservices';
import { AUTH_PATTERN, User } from '@app/contracts/auth';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class UserService implements IUserService {
  constructor(
    @Inject(USER_REPOSITORY) private readonly userRepository: IUserRepository,
    @Inject(EVENT_PUBLISHER) private readonly eventPublisher: IEventPublisher,
    @Inject(AUTH_SERVICE) private readonly authServiceClient: ClientProxy,
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
      },
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
}
