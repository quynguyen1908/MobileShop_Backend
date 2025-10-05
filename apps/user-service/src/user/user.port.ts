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
  getProvincesByIds(ids: number[]): Promise<Province[]>;

  // Commune
  getCommunesByProvinceCode(provinceCode: number): Promise<Commune[]>;
  getCommunesByIds(ids: number[]): Promise<Commune[]>;
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
  findProvincesByIds(ids: number[]): Promise<Province[]>;

  // Commune
  findCommunesByProvinceCode(provinceCode: number): Promise<Commune[]>;
  findCommunesByIds(ids: number[]): Promise<Commune[]>;
}
