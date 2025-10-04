import { Requester } from '@app/contracts';
import {
  Commune,
  Customer,
  CustomerCreateDto,
  CustomerDto,
  Province,
} from '@app/contracts/user';

export interface IUserService {
  // Customer
  createCustomer(data: CustomerCreateDto): Promise<number>;
  getCustomerByUserId(request: Requester): Promise<CustomerDto>;

  // Province
  getAllProvinces(): Promise<Province[]>;

  // District
  getCommunesByProvinceCode(provinceCode: number): Promise<Commune[]>;
}

export interface IUserRepository
  extends IUserCommandRepository,
    IUserQueryRepository {}

export interface IUserCommandRepository {
  // Customer
  insertCustomer(data: Customer): Promise<Customer>;
}

export interface IUserQueryRepository {
  // Customer
  findCustomerByUserId(userId: number): Promise<Customer | null>;

  // Province
  findAllProvinces(): Promise<Province[]>;

  // District
  findCommunesByProvinceCode(provinceCode: number): Promise<Commune[]>;
}
