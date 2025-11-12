import { Injectable } from '@nestjs/common';
import {
  IAuthRepository,
  IOAuthRepository,
  IRoleQueryRepository,
} from './auth.port';
import {
  User,
  UserFilterDto,
  UserStatus,
  UserUpdateDto,
  Role,
  OAuth,
  OAuthProvider,
} from '@app/contracts/auth';
import { PagingDto, Paginated } from '@app/contracts';
import { UserPrismaService } from '@app/contracts/prisma';

interface PrismaUser {
  id: number;
  username: string;
  password: string;
  email: string;
  phone: string;
  roleId: number;
  lastChangePass: Date | null;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  isDeleted: boolean;
}

interface PrismaRole {
  id: number;
  name: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
  isDeleted: boolean;
}

interface PrismaOAuth {
  id: number;
  userId: number;
  oauthProvider: string;
  oauthId: string;
  createdAt: Date;
  updatedAt: Date;
  isDeleted: boolean;
}

@Injectable()
export class AuthRepository implements IAuthRepository {
  constructor(private prisma: UserPrismaService) {}

  async insert(data: Omit<User, 'id'>): Promise<User> {
    const prismaService = this.prisma as unknown as {
      user: {
        create: (params: { data: any }) => Promise<PrismaUser>;
      };
    };

    // Sử dụng kiểu dữ liệu cụ thể
    const user = await prismaService.user.create({ data });
    return this._toModel(user);
  }

  async update(id: number, data: UserUpdateDto): Promise<void> {
    const prismaService = this.prisma as unknown as {
      user: {
        update: (params: {
          where: { id: number };
          data: any;
        }) => Promise<PrismaUser>;
      };
    };
    await prismaService.user.update({ where: { id }, data });
  }

  // Soft delete
  async delete(id: number): Promise<void> {
    const prismaService = this.prisma as unknown as {
      user: {
        update: (params: {
          where: { id: number };
          data: any;
        }) => Promise<PrismaUser>;
      };
    };
    await prismaService.user.update({
      where: { id },
      data: { isDeleted: true },
    });
  }

  async findById(id: number): Promise<User | null> {
    const prismaService = this.prisma as unknown as {
      user: {
        findUnique: (params: { where: any }) => Promise<PrismaUser | null>;
      };
    };
    const user = await prismaService.user.findUnique({
      where: {
        id,
        isDeleted: false,
      },
    });
    return user ? this._toModel(user) : null;
  }

  async findByFilter(filter: UserFilterDto): Promise<User | null> {
    const prismaService = this.prisma as unknown as {
      user: {
        findFirst: (params: { where: any }) => Promise<PrismaUser | null>;
      };
    };
    const user = await prismaService.user.findFirst({
      where: {
        username: filter.username,
        email: filter.email,
        phone: filter.phone,
        roleId: filter.roleId,
        status: {
          equals: filter.status,
        },
        isDeleted: false,
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
      isDeleted: false,
    };
    const prismaService = this.prisma as unknown as {
      user: {
        count: (params: { where: any }) => Promise<number>;
        findMany: (params: {
          where: any;
          take: number;
          skip: number;
          orderBy: any;
        }) => Promise<PrismaUser[]>;
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
        findMany: (params: { where: any }) => Promise<PrismaUser[]>;
      };
    };
    const users = await prismaService.user.findMany({
      where: {
        id: { in: ids },
        isDeleted: false,
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
        findFirst: (params: { where: any }) => Promise<PrismaUser | null>;
      };
    };
    const user = await prismaService.user.findFirst({
      where: {
        OR: conditions,
        isDeleted: false,
      },
    });
    return user ? this._toModel(user) : null;
  }

  private _toModel(data: PrismaUser): User {
    let typedStatus: UserStatus | undefined;
    if (data.status !== null && data.status !== undefined) {
      if (typeof data.status === 'string') {
        const validStatuses = Object.values(UserStatus) as string[];
        if (validStatuses.includes(data.status)) {
          typedStatus = data.status as UserStatus;
        }
      }
    }

    return {
      id: data.id,
      username: data.username,
      password: data.password,
      email: data.email,
      phone: data.phone,
      roleId: data.roleId,
      lastChangePass: data.lastChangePass ?? undefined,
      status: typedStatus!,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
      isDeleted: data.isDeleted,
    };
  }
}

@Injectable()
export class RoleRepository implements IRoleQueryRepository {
  constructor(private prisma: UserPrismaService) {}

  async findById(id: number): Promise<Role | null> {
    const prismaService = this.prisma as unknown as {
      role: {
        findUnique: (params: {
          where: { id: number };
        }) => Promise<PrismaRole | null>;
      };
    };
    const role = await prismaService.role.findUnique({ where: { id } });
    return role ? this._toModel(role) : null;
  }

  async findAll(): Promise<Role[]> {
    const prismaService = this.prisma as unknown as {
      role: {
        findMany: (params: { where: any }) => Promise<PrismaRole[]>;
      };
    };
    const roles = await prismaService.role.findMany({
      where: { isDeleted: false },
    });
    return roles.map((role) => this._toModel(role));
  }

  private _toModel(data: PrismaRole): Role {
    return {
      id: data.id,
      name: data.name,
      description: data.description,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
      isDeleted: data.isDeleted,
    };
  }
}

@Injectable()
export class OAuthRepository implements IOAuthRepository {
  constructor(private prisma: UserPrismaService) {}

  async insert(data: Omit<OAuth, 'id'>): Promise<OAuth> {
    const prismaService = this.prisma as unknown as {
      userOauth: {
        create: (params: { data: any }) => Promise<PrismaOAuth>;
      };
    };

    const oauth = await prismaService.userOauth.create({ data });
    return this._toModel(oauth);
  }

  async findByProviderAndOAuthId(
    provider: OAuthProvider,
    oauthId: string,
  ): Promise<OAuth | null> {
    const prismaService = this.prisma as unknown as {
      userOauth: {
        findFirst: (params: { where: any }) => Promise<PrismaOAuth | null>;
      };
    };
    const oauth = await prismaService.userOauth.findFirst({
      where: {
        oauthProvider: provider as string,
        oauthId: oauthId,
        isDeleted: false,
      },
    });
    return oauth ? this._toModel(oauth) : null;
  }

  private _toModel(data: PrismaOAuth): OAuth {
    let typedProvider: OAuthProvider | undefined;
    if (data.oauthProvider !== null && data.oauthProvider !== undefined) {
      if (typeof data.oauthProvider === 'string') {
        const validProviders = Object.values(OAuthProvider) as string[];
        if (validProviders.includes(data.oauthProvider)) {
          typedProvider = data.oauthProvider as OAuthProvider;
        }
      }
    }
    return {
      id: data.id,
      userId: data.userId,
      oauthProvider: typedProvider!,
      oauthId: data.oauthId,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
      isDeleted: data.isDeleted,
    };
  }
}
