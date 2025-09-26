import { Customer, CustomerCreateDto } from '@app/contracts/user';

export interface IUserService {
  // Customer
  createCustomer(data: CustomerCreateDto): Promise<number>;
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
  findCustomerById(id: number): Promise<Customer | null>;
}
