import { Customer, CustomerCreateDto } from '@app/contracts/user';

export interface IUserService {
  // Customer
  createCustomer(data: CustomerCreateDto): Promise<number>;
}

export interface IUserRepository {
  // Customer
  insertCustomer(data: Customer): Promise<Customer>;
}
