import { Injectable } from '@nestjs/common';
import { IUserRepository } from './user.port';
import { UserPrismaService } from '@app/contracts/prisma';
import { Commune, Customer, Gender, Province } from '@app/contracts/user';

interface PrismaCustomer {
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

interface PrismaProvince {
  id: number;
  code: number;
  name: string;
  divisionType: string;
  codename: string;
  phoneCode: number;
}

interface PrismaCommune {
  id: number;
  code: number;
  name: string;
  divisionType: string;
  codename: string;
  provinceCode: number;
}

@Injectable()
export class UserRepository implements IUserRepository {
  constructor(private prisma: UserPrismaService) {}

  // Customer

  async insertCustomer(data: Customer): Promise<Customer> {
    const prismaService = this.prisma as unknown as {
      customer: {
        create: (params: { data: any }) => Promise<PrismaCustomer>;
      };
    };
    const customer = await prismaService.customer.create({ data });
    return this._toCustomerModel(customer);
  }

  async findCustomerByUserId(userId: number): Promise<Customer | null> {
    const prismaService = this.prisma as unknown as {
      customer: {
        findFirst: (params: {
          where: { userId: number; isDeleted: boolean };
        }) => Promise<PrismaCustomer | null>;
      };
    };
    const customer = await prismaService.customer.findFirst({
      where: { userId, isDeleted: false },
    });
    if (!customer) return null;
    return this._toCustomerModel(customer);
  }

  // Province

  async findAllProvinces(): Promise<Province[]> {
    const prismaService = this.prisma as unknown as {
      province: {
        findMany: () => Promise<PrismaProvince[]>;
      };
    };
    const provinces = await prismaService.province.findMany();
    return provinces.map((province) => this._toProvinceModel(province));
  }

  async findProvincesByIds(ids: number[]): Promise<Province[]> {
    const prismaService = this.prisma as unknown as {
      province: {
        findMany: (params: {
          where: { id: { in: number[] } };
        }) => Promise<PrismaProvince[]>;
      };
    };
    const provinces = await prismaService.province.findMany({
      where: { id: { in: ids } },
    });
    return provinces.map((province) => this._toProvinceModel(province));
  }

  // Commune

  async findCommunesByProvinceCode(provinceCode: number): Promise<Commune[]> {
    const prismaService = this.prisma as unknown as {
      commune: {
        findMany: (params: {
          where: { provinceCode: number };
        }) => Promise<PrismaCommune[]>;
      };
    };
    const communes = await prismaService.commune.findMany({
      where: { provinceCode },
    });
    return communes.map((commune) => this._toCommuneModel(commune));
  }

  async findCommunesByIds(ids: number[]): Promise<Commune[]> {
    const prismaService = this.prisma as unknown as {
      commune: {
        findMany: (params: {
          where: { id: { in: number[] } };
        }) => Promise<PrismaCommune[]>;
      };
    };
    const communes = await prismaService.commune.findMany({
      where: { id: { in: ids } },
    });
    return communes.map((commune) => this._toCommuneModel(commune));
  }

  private _toCustomerModel(data: PrismaCustomer): Customer {
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

  private _toProvinceModel(data: PrismaProvince): Province {
    return {
      id: data.id,
      code: data.code,
      name: data.name,
      divisionType: data.divisionType,
      codename: data.codename,
      phoneCode: data.phoneCode,
    };
  }

  private _toCommuneModel(data: PrismaCommune): Commune {
    return {
      id: data.id,
      code: data.code,
      name: data.name,
      divisionType: data.divisionType,
      codename: data.codename,
      provinceCode: data.provinceCode,
    };
  }
}
