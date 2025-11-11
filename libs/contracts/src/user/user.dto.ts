import { z } from 'zod';
import {
  addressSchema,
  customerSchema,
  employeeSchema,
  notificationSchema,
} from './user.model';
import { userSchema } from '../auth/auth.model';
import { pointHistoryDtoSchema } from '../order/order.dto';

// Customer

export const customerDtoSchema = customerSchema
  .omit({
    userId: true,
  })
  .extend({
    user: userSchema.omit({
      password: true,
      roleId: true,
      status: true,
      lastChangePass: true,
      createdAt: true,
      updatedAt: true,
      isDeleted: true,
    }),
    pointHistory: pointHistoryDtoSchema.array().optional(),
  });

export type CustomerDto = z.infer<typeof customerDtoSchema>;

export const customerCreateDtoSchema = customerSchema
  .pick({
    firstName: true,
    lastName: true,
    dateOfBirth: true,
    userId: true,
  })
  .required();

export type CustomerCreateDto = z.infer<typeof customerCreateDtoSchema>;

export const customerUpdateDtoSchema = customerSchema
  .pick({
    firstName: true,
    lastName: true,
    gender: true,
    dateOfBirth: true,
    pointsBalance: true,
    updatedAt: true,
    isDeleted: true,
  })
  .partial();

export type CustomerUpdateDto = z.infer<typeof customerUpdateDtoSchema>;

export const CustomerUpdateProfileDtoSchema = customerSchema
  .pick({
    gender: true,
    firstName: true,
    lastName: true,
  })
  .extend({
    username: userSchema.shape.username.optional(),
  });

export type CustomerUpdateProfileDto = z.infer<
  typeof CustomerUpdateProfileDtoSchema
>;

// Employee

export const employeeCreateDtoSchema = employeeSchema
  .pick({
    firstName: true,
    lastName: true,
    gender: true,
    dateOfBirth: true,
    userId: true,
    hireDate: true,
    position: true,
    salary: true,
  })
  .required();

export type EmployeeCreateDto = z.infer<typeof employeeCreateDtoSchema>;

export const employeeUpdateDtoSchema = employeeSchema
  .pick({
    firstName: true,
    lastName: true,
    gender: true,
    dateOfBirth: true,
    hireDate: true,
    position: true,
    salary: true,
    isDeleted: true,
  })
  .partial();

export type EmployeeUpdateDto = z.infer<typeof employeeUpdateDtoSchema>;

// Notification

export const notificationCreateDtoSchema = notificationSchema
  .pick({
    userId: true,
    title: true,
    type: true,
    message: true,
  })
  .required();

export type NotificationCreateDto = z.infer<typeof notificationCreateDtoSchema>;

export const notificationUpdateDtoSchema = notificationSchema
  .pick({
    type: true,
    isRead: true,
    readAt: true,
    isDeleted: true,
  })
  .partial();

export type NotificationUpdateDto = z.infer<typeof notificationUpdateDtoSchema>;

// Address

export const addressCreateDtoSchema = addressSchema
  .pick({
    recipientName: true,
    recipientPhone: true,
    street: true,
    provinceId: true,
    communeId: true,
  })
  .required()
  .extend({
    customerId: addressSchema.shape.customerId.optional(),
    postalCode: addressSchema.shape.postalCode,
    isDefault: addressSchema.shape.isDefault,
  });

export type AddressCreateDto = z.infer<typeof addressCreateDtoSchema>;

export const addressUpdateDtoSchema = addressSchema
  .omit({
    id: true,
    customerId: true,
    createdAt: true,
  })
  .partial();

export type AddressUpdateDto = z.infer<typeof addressUpdateDtoSchema>;
