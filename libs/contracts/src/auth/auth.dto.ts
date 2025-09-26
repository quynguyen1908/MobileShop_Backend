import { customerSchema } from '../user';
import { z } from 'zod';
import { roleSchema, userSchema } from './auth.model';

// Auth

export const registerDtoSchema = userSchema
  .pick({
    username: true,
    email: true,
    password: true,
    phone: true,
    roleId: true,
  })
  .merge(
    customerSchema.pick({
      firstName: true,
      lastName: true,
      dateOfBirth: true,
    }),
  )
  .required();

export type RegisterDto = z.infer<typeof registerDtoSchema>;

export const loginDtoSchema = userSchema
  .pick({
    username: true,
    password: true,
  })
  .required();

export type LoginDto = z.infer<typeof loginDtoSchema>;

// User

export const userCreateDtoSchema = userSchema
  .pick({
    username: true,
    password: true,
    phone: true,
    email: true,
    roleId: true,
  })
  .required();

export type UserCreateDto = z.infer<typeof userCreateDtoSchema>;

export const userUpdateDtoSchema = userSchema
  .pick({
    username: true,
    password: true,
    roleId: true,
    status: true,
  })
  .partial();

export type UserUpdateDto = z.infer<typeof userUpdateDtoSchema>;

export const UserUpdateProfileDtoSchema = userUpdateDtoSchema
  .omit({
    roleId: true,
    status: true,
  })
  .partial();

export type UserUpdateProfileDto = z.infer<typeof UserUpdateProfileDtoSchema>;

export const userFilterDtoSchema = userSchema
  .pick({
    username: true,
    phone: true,
    email: true,
    roleId: true,
    status: true,
  })
  .partial();

export type UserFilterDto = z.infer<typeof userFilterDtoSchema>;

// Role

export const roleCreateDtoSchema = roleSchema
  .pick({
    name: true,
    description: true,
  })
  .required();

export type RoleCreateDto = z.infer<typeof roleCreateDtoSchema>;

export const roleUpdateDtoSchema = roleSchema
  .pick({
    name: true,
    description: true,
    isDeleted: true,
  })
  .partial();

export type RoleUpdateDto = z.infer<typeof roleUpdateDtoSchema>;
