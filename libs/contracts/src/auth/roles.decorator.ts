import { SetMetadata } from '@nestjs/common';

export enum RoleType {
  ADMIN = 'admin',
  CUSTOMER = 'customer',
  SALES = 'sales',
}

export const ROLES_KEY = 'roles';
export const Roles = (...roles: RoleType[]) => SetMetadata(ROLES_KEY, roles);
