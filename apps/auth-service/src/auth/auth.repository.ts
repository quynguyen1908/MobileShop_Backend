import { Injectable } from "@nestjs/common";
import { IAuthRepository, IRoleQueryRepository } from "./auth.port";
import { User, UserFilterDto, UserStatus, UserUpdateDto, Role } from "@app/contracts/auth";
import { PagingDto, Paginated } from "@app/contracts";
import { UserPrismaService } from "@app/contracts/prisma";
import { Role as RolePrisma, User as UserPrisma } from ".prisma/client/user";

@Injectable()
export class AuthRepository implements IAuthRepository {
    constructor(private prisma: UserPrismaService) {}

    async insert(data: User): Promise<User> {
        const user = await this.prisma.user.create({ data });
        return this._toModel(user);
    }

    async update(id: number, data: UserUpdateDto): Promise<void> {
        await this.prisma.user.update({ where: { id }, data });
    }

    // Hard delete
    // async delete(id: number): Promise<void> {
    //     await this.prisma.user.delete({ where: { id } });
    // }

    // Soft delete
    async delete(id: number): Promise<void> {
        await this.prisma.user.update({
            where: { id },
            data: { status: UserStatus.DELETED },
        });
    }

    async findById(id: number): Promise<User | null> {
        const user = await this.prisma.user.findUnique({ where: { id } });
        return user ? this._toModel(user) : null;
    }

    async findByFilter(filter: UserFilterDto): Promise<User | null> {
        const user = await this.prisma.user.findFirst({
            where: {
                ...filter,
                status: { not: UserStatus.DELETED }
            }
        });
        return user ? this._toModel(user) : null;
    }

    async list(filter: UserFilterDto, paging: PagingDto): Promise<Paginated<User>> {
        const skip = (paging.page - 1) * paging.limit;
        const whereCondition = {
            ...filter,
            status: { not: UserStatus.DELETED }
        };
        const total = await this.prisma.user.count({ where: whereCondition });
        const data = await this.prisma.user.findMany({
            where: whereCondition,
            take: paging.limit,
            skip,
            orderBy: { id: 'asc' },
        });

        return {
            data: data.map(user => this._toModel(user)),
            paging,
            total,
        };
    }

    async findByIds(ids: number[]): Promise<User[]> {
        const users = await this.prisma.user.findMany({
            where: {
                id: { in: ids },
                status: { not: UserStatus.DELETED }
            }
        });
        return users.map(user => this._toModel(user));
    }

    async findExistingUser(filters: { username?: string; email?: string; phone?: string; }): Promise<User | null> {
        const conditions: any[] = [];
        if (filters.username) conditions.push({ username: filters.username });
        if (filters.email) conditions.push({ email: filters.email });
        if (filters.phone) conditions.push({ phone: filters.phone });
        const user = await this.prisma.user.findFirst({
            where: {
                OR: conditions,
                status: { not: UserStatus.DELETED }
            }
        });
        return user ? this._toModel(user) : null;
    }

    private _toModel(data: UserPrisma): User {
        return { ...data, status: data.status as UserStatus} as User;
    }
}

@Injectable()
export class RoleRepository implements IRoleQueryRepository {
    constructor(private prisma: UserPrismaService) {}

    async findById(id: number): Promise<Role | null> {
        const role = await this.prisma.role.findUnique({ where: { id } });
        return role ? this._toModel(role) : null;
    }

    private _toModel(data: RolePrisma): Role {
        return { ...data } as Role;
    }
}