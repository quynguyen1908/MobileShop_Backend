import { Injectable } from '@nestjs/common';
import { IAuthRepository, IRoleQueryRepository } from './auth.port';
import {
  User,
  UserFilterDto,
  UserStatus,
  UserUpdateDto,
  Role,
} from '@app/contracts/auth';
import { PagingDto, Paginated } from '@app/contracts';
import { UserPrismaService } from '@app/contracts/prisma';
import { Role as RolePrisma, User as UserPrisma } from '.prisma/client/user';

@Injectable()
export class AuthRepository implements IAuthRepository {
  constructor(private prisma: UserPrismaService) {}

  async insert(data: User): Promise<User> {
    const prismaService = this.prisma as unknown as {
      user: {
        create: (params: { data: any }) => Promise<UserPrisma>;
      };
    };
    const user = await prismaService.user.create({ data });
    return this._toModel(user);
  }

  async update(id: number, data: UserUpdateDto): Promise<void> {
    const prismaService = this.prisma as unknown as {
      user: {
        update: (params: { where: { id: number }; data: any }) => Promise<UserPrisma>;
      };
    };
    await prismaService.user.update({ where: { id }, data });
  }

  // Hard delete
  // async delete(id: number): Promise<void> {
  //   const prismaService = this.prisma as unknown as {
  //     user: {
  //       delete: (params: { where: { id: number } }) => Promise<UserPrisma>;
  //     };
  //   };
  //   await prismaService.user.delete({ where: { id } });
  // }

  // Soft delete
  async delete(id: number): Promise<void> {
    const prismaService = this.prisma as unknown as {
      user: {
        update: (params: { where: { id: number }; data: any }) => Promise<UserPrisma>;
      };
    };
    await prismaService.user.update({
      where: { id },
      data: { status: UserStatus.DELETED },
    });
  }

  async findById(id: number): Promise<User | null> {
    const prismaService = this.prisma as unknown as {
      user: {
        findUnique: (params: { where: { id: number } }) => Promise<UserPrisma | null>;
      };
    };
    const user = await prismaService.user.findUnique({ where: { id } });
    return user ? this._toModel(user) : null;
  }

  async findByFilter(filter: UserFilterDto): Promise<User | null> {
    const prismaService = this.prisma as unknown as {
      user: {
        findFirst: (params: { where: any }) => Promise<UserPrisma | null>;
      };
    };
    const user = await prismaService.user.findFirst({
      where: {
        ...filter,
        status: { not: UserStatus.DELETED },
      },
    });
    return user ? this._toModel(user) : null;
  }

  async list(
    filter: UserFilterDto,
    paging: PagingDto,
  ): Promise<Paginated<User>> {
    const skip = (paging.page - 1) * paging.limit;
    const whereCondition = {
      ...filter,
      status: { not: UserStatus.DELETED },
    };
    const prismaService = this.prisma as unknown as {
      user: {
        count: (params: { where: any }) => Promise<number>;
        findMany: (params: { 
          where: any; 
          take: number; 
          skip: number; 
          orderBy: any 
        }) => Promise<UserPrisma[]>;
      };
    };
    const total = await prismaService.user.count({ where: whereCondition });
    const data = await prismaService.user.findMany({
      where: whereCondition,
      take: paging.limit,
      skip,
      orderBy: { id: 'asc' },
    });

    return {
      data: data.map((user) => this._toModel(user)),
      paging,
      total,
    };
  }

  async findByIds(ids: number[]): Promise<User[]> {
    const prismaService = this.prisma as unknown as {
      user: {
        findMany: (params: { where: any }) => Promise<UserPrisma[]>;
      };
    };
    const users = await prismaService.user.findMany({
      where: {
        id: { in: ids },
        status: { not: UserStatus.DELETED },
      },
    });
    return users.map((user) => this._toModel(user));
  }

  async findExistingUser(filters: {
    username?: string;
    email?: string;
    phone?: string;
  }): Promise<User | null> {
    const conditions: any[] = [];
    if (filters.username) conditions.push({ username: filters.username });
    if (filters.email) conditions.push({ email: filters.email });
    if (filters.phone) conditions.push({ phone: filters.phone });
    const prismaService = this.prisma as unknown as {
      user: {
        findFirst: (params: { where: any }) => Promise<UserPrisma | null>;
      };
    };
    const user = await prismaService.user.findFirst({
      where: {
        OR: conditions,
        status: { not: UserStatus.DELETED },
      },
    });
    return user ? this._toModel(user) : null;
  }

  private _toModel(data: UserPrisma): User {
    const typedData = data as unknown as {
      status: unknown;
      [key: string]: unknown;
    };
    return { ...data, status: typedData.status as UserStatus } as User;
  }
}

@Injectable()
export class RoleRepository implements IRoleQueryRepository {
  constructor(private prisma: UserPrismaService) {}

  async findById(id: number): Promise<Role | null> {
    const prismaService = this.prisma as unknown as {
      role: {
        findUnique: (params: { where: { id: number } }) => Promise<RolePrisma | null>;
      };
    };
    const role = await prismaService.role.findUnique({ where: { id } });
    return role ? this._toModel(role) : null;
  }

  private _toModel(data: RolePrisma): Role {
    return { ...data } as Role;
  }
}
