import { z } from 'zod';
import {
  customerSchema,
  employeeSchema,
  oauthSchema,
  notificationSchema,
} from './user.model';

// Customer

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

// OAuth

export const oauthCreateDtoSchema = oauthSchema
  .pick({
    oauthProvider: true,
    oauthId: true,
    userId: true,
  })
  .required();

export type OAuthCreateDto = z.infer<typeof oauthCreateDtoSchema>;

export const oauthUpdateDtoSchema = oauthSchema
  .pick({
    oauthProvider: true,
    oauthId: true,
    isDeleted: true,
  })
  .partial();

export type OAuthUpdateDto = z.infer<typeof oauthUpdateDtoSchema>;

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
