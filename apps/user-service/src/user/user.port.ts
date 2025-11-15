import { Paginated, PagingDto, Requester } from '@app/contracts';
import {
  Address,
  AddressCreateDto,
  AddressUpdateDto,
  Commune,
  Customer,
  CustomerCreateDto,
  CustomerDto,
  CustomerUpdateDto,
  CustomerUpdateProfileDto,
  Notification,
  NotificationUpdateDto,
  Province,
} from '@app/contracts/user';

export interface IUserService {
  // Customer
  listCustomers(paging: PagingDto): Promise<Paginated<CustomerDto>>;
  getCustomerByUserId(request: Requester): Promise<CustomerDto>;
  getCustomerById(id: number): Promise<Customer>;
  createCustomer(data: CustomerCreateDto): Promise<number>;
  updateCustomer(id: number, data: CustomerUpdateDto): Promise<void>;
  updateCustomerProfile(
    request: Requester,
    data: CustomerUpdateProfileDto,
  ): Promise<void>;

  // Province
  getAllProvinces(): Promise<Province[]>;
  getProvincesByIds(ids: number[]): Promise<Province[]>;

  // Commune
  getCommunesByProvinceCode(provinceCode: number): Promise<Commune[]>;
  getCommunesByIds(ids: number[]): Promise<Commune[]>;

  // Address
  getAddressBooks(request: Requester): Promise<Address[]>;
  addAddressBook(request: Requester, data: AddressCreateDto): Promise<number>;
  updateAddressBook(
    request: Requester,
    addressId: number,
    data: AddressUpdateDto,
  ): Promise<void>;
  deleteAddressBook(request: Requester, addressId: number): Promise<void>;

  // Notification
  getNotifications(request: Requester): Promise<Notification[]>;
  getUnreadNotifications(request: Requester): Promise<Notification[]>;
  readNotifications(
    request: Requester,
    notificationIds: number[],
  ): Promise<void>;
  createNotifications(data: Notification[]): Promise<void>;
}

export interface IUserRepository
  extends IUserCommandRepository,
    IUserQueryRepository {}

export interface IUserCommandRepository {
  // Customer
  insertCustomer(data: Customer): Promise<Customer>;
  updateCustomer(id: number, data: CustomerUpdateDto): Promise<void>;

  // Address
  insertAddress(data: AddressCreateDto): Promise<Address>;
  updateAddress(id: number, data: AddressUpdateDto): Promise<void>;
  updateAddressesByIds(ids: number[], data: AddressUpdateDto): Promise<void>;

  // Notification
  insertNotifications(data: Notification[]): Promise<void>;
  updateNotifications(
    ids: number[],
    data: NotificationUpdateDto,
  ): Promise<void>;
}

export interface IUserQueryRepository {
  // Customer
  listCustomers(paging: PagingDto): Promise<Paginated<Customer>>;
  findCustomerByUserId(userId: number): Promise<Customer | null>;
  findCustomerById(id: number): Promise<Customer | null>;

  // Province
  findAllProvinces(): Promise<Province[]>;
  findProvincesByIds(ids: number[]): Promise<Province[]>;

  // Commune
  findCommunesByProvinceCode(provinceCode: number): Promise<Commune[]>;
  findCommunesByIds(ids: number[]): Promise<Commune[]>;

  // Address
  findAddressesByCustomerId(customerId: number): Promise<Address[]>;

  // Notification
  findNotificationsByIds(ids: number[]): Promise<Notification[]>;
  findNotificationsByUserId(userId: number): Promise<Notification[]>;
  findUnreadNotificationsByUserId(userId: number): Promise<Notification[]>;
}
