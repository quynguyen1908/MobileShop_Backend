import { Paginated, PagingDto } from '@app/contracts';
import type { User, UserCreateDto, UserFilterDto, UserUpdateDto } from '@app/contracts/user';

// User

export interface IUserService {
    create(userCreateDto: UserCreateDto): Promise<string>;
    get(id: string): Promise<User>;
    update(id: number, data: UserUpdateDto): Promise<void>;
    delete(id: number): Promise<void>;
    list(filter: UserFilterDto, paging: PagingDto): Promise<Paginated<User>>;
}

export interface IUserRepository extends IUserCommandRepository, IUserQueryRepository {}

export interface IUserCommandRepository {
    insert(data: User): Promise<void>;
    update(id: number, data: UserUpdateDto): Promise<void>;
    delete(id: number): Promise<void>;
}

export interface IUserQueryRepository {
    findById(id: number): Promise<User | null>;
    findbyFilter(filter: UserFilterDto): Promise<User | null>;
    list(filter: UserFilterDto, paging: PagingDto): Promise<Paginated<User>>;
    findByIds(ids: number[]): Promise<User[]>;
}