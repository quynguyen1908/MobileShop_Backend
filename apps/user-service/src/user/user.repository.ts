import { Injectable } from '@nestjs/common';
import { IUserRepository } from './user.port';
import { UserPrismaService } from '@app/contracts/prisma';
import { Customer, Gender } from '@app/contracts/user';

interface CustomerPrisma {
  id: number;
  userId: number;
  firstName: string;
  lastName: string;
  gender?: string | number;
  dateOfBirth?: Date;
  pointsBalance?: number;
  createdAt: Date;
  updatedAt: Date;
  isDeleted: boolean;
}

@Injectable()
export class UserRepository implements IUserRepository {
  constructor(private prisma: UserPrismaService) {}

  // Customer
  async insertCustomer(data: Customer): Promise<Customer> {
    const prismaService = this.prisma as unknown as {
      customer: {
        create: (params: { data: any }) => Promise<CustomerPrisma>;
      };
    };
    const customer = await prismaService.customer.create({ data });
    return this._toCustomerModel(customer);
  }

  private _toCustomerModel(data: CustomerPrisma): Customer {
    let typedGender: Gender | undefined;

    if (data.gender !== null && data.gender !== undefined) {
      if (typeof data.gender === 'string') {
        const validGenders = Object.values(Gender) as string[];
        if (validGenders.includes(data.gender)) {
          typedGender = data.gender as Gender;
        }
      }
    }

    return {
      id: data.id,
      userId: data.userId,
      firstName: data.firstName,
      lastName: data.lastName,
      dateOfBirth: data.dateOfBirth,
      gender: typedGender,
      pointsBalance: data.pointsBalance ?? 0,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
      isDeleted: data.isDeleted,
    };
  }
}
