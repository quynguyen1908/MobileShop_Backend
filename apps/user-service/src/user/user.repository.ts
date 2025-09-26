import { Injectable } from '@nestjs/common';
import { IUserRepository } from './user.port';
import { UserPrismaService } from '@app/contracts/prisma';
import { Customer, Gender } from '@app/contracts/user';
import { Customer as CustomerPrisma } from '.prisma/client/user';

@Injectable()
export class UserRepository implements IUserRepository {
  constructor(private prisma: UserPrismaService) {}

  // Customer
  async insertCustomer(data: Customer): Promise<Customer> {
    const customer = await this.prisma.customer.create({ data });
    return this._toModel(customer);
  }

  private _toModel(data: CustomerPrisma): Customer {
    return { ...data, gender: data.gender as Gender } as Customer;
  }
}
