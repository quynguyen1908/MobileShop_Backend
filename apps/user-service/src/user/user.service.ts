import { Inject, Injectable } from '@nestjs/common';
import type { IUserService, IUserRepository } from './user.port';
import type { IEventPublisher } from '@app/contracts';
import { USER_REPOSITORY, EVENT_PUBLISHER } from '@app/contracts';
import { Customer, CustomerCreateDto, customerSchema } from '@app/contracts/user';

@Injectable()
export class UserService implements IUserService {
  constructor(
    @Inject(USER_REPOSITORY) private readonly userRepository: IUserRepository,
    @Inject(EVENT_PUBLISHER) private readonly eventPublisher: IEventPublisher,
  ) {}

  async createCustomer(customerCreateDto: CustomerCreateDto): Promise<number> {
    const data = customerSchema.parse(customerCreateDto);

    const customer: Customer = {
      userId: data.userId,
      firstName: data.firstName,
      lastName: data.lastName,
      dateOfBirth: data.dateOfBirth,
      pointsBalance: 0,
      isDeleted: false,
    }

    const createdCustomer = await this.userRepository.insertCustomer(customer);
    return createdCustomer.id!;
  }
}
