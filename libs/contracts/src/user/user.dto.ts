import { z } from 'zod';
import {
  customerSchema,
  employeeSchema,
  notificationSchema,
} from './user.model';
import { userSchema } from '../auth/auth.model';

// Customer

export const customerDtoSchema = customerSchema
  .omit({
    userId: true,
    createdAt: true,
    updatedAt: true,
    isDeleted: true,
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
    pointBalance: true,
    isDeleted: true,
  })
  .partial();

export type CustomerUpdateDto = z.infer<typeof customerUpdateDtoSchema>;

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
