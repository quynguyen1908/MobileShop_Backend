import {
  RegisterDto,
  UserCreateDto,
  User,
  UserUpdateDto,
  UserFilterDto,
  Role,
  LoginDto,
} from '@app/contracts/auth';
import {
  Requester,
  TokenPayload,
  TokenResponse,
} from '@app/contracts/interface';
import { Paginated, PagingDto } from '@app/contracts/model';

// User

export interface IAuthService {
  register(data: RegisterDto): Promise<{ userId: number; tokens: any }>;
  login(data: LoginDto): Promise<{ userId: number; tokens: any }>;
  logout(requester: Requester): Promise<boolean>;
  refreshToken(refreshToken: string): Promise<TokenResponse>;
  validateToken(token: string): Promise<TokenPayload>;
  decodeToken(token: string): TokenPayload | null;

  create(userCreateDto: UserCreateDto): Promise<number>;
  get(id: number): Promise<User>;
  profile(id: number): Promise<Omit<User, 'password'>>;
  update(id: number, data: UserUpdateDto): Promise<void>;
  delete(id: number): Promise<void>;
  list(filter: UserFilterDto, paging: PagingDto): Promise<Paginated<User>>;
}

export interface IAuthRepository
  extends IAuthCommandRepository,
    IAuthQueryRepository {}

export interface IAuthCommandRepository {
  insert(data: User): Promise<User>;
  update(id: number, data: UserUpdateDto): Promise<void>;
  delete(id: number): Promise<void>;
}

export interface IAuthQueryRepository {
  findById(id: number): Promise<User | null>;
  findByFilter(filter: UserFilterDto): Promise<User | null>;
  list(filter: UserFilterDto, paging: PagingDto): Promise<Paginated<User>>;
  findByIds(ids: number[]): Promise<User[]>;
  findExistingUser(filters: {
    username?: string;
    email?: string;
    phone?: string;
  }): Promise<User | null>;
}

// Role

export interface IRoleQueryRepository {
  findById(id: number): Promise<Role | null>;
}
