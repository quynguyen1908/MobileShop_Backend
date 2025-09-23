import { z } from "zod";
import { customerSchema, employeeSchema, oauthSchema, notificationSchema } from "./user.model";

// Customer

export const customerCreateDtoSchema = customerSchema.pick({
    firstName: true,
    lastName: true,
    dateOfBirth: true,
    userId: true,
}).required();

export interface CustomerCreateDto extends z.infer<typeof customerCreateDtoSchema> {}

export const customerUpdateDtoSchema = customerSchema.pick({
    firstName: true,
    lastName: true,
    gender: true,
    dateOfBirth: true,
    pointBalance: true,
    isDeleted: true,
}).partial();

export interface CustomerUpdateDto extends z.infer<typeof customerUpdateDtoSchema> {}

// Employee

export const employeeCreateDtoSchema = employeeSchema.pick({
    firstName: true,
    lastName: true,
    gender: true,
    dateOfBirth: true,
    userId: true,
    hireDate: true,
    position: true,
    salary: true,
}).required();

export interface EmployeeCreateDto extends z.infer<typeof employeeCreateDtoSchema> {}

export const employeeUpdateDtoSchema = employeeSchema.pick({
    firstName: true,
    lastName: true,
    gender: true,
    dateOfBirth: true,
    hireDate: true,
    position: true,
    salary: true,
    isDeleted: true,
}).partial();

export interface EmployeeUpdateDto extends z.infer<typeof employeeUpdateDtoSchema> {}

// OAuth

export const oauthCreateDtoSchema = oauthSchema.pick({
    oauthProvider: true,
    oauthId: true,
    userId: true,
}).required();

export interface OAuthCreateDto extends z.infer<typeof oauthCreateDtoSchema> {}

export const oauthUpdateDtoSchema = oauthSchema.pick({
    oauthProvider: true,
    oauthId: true,
    isDeleted: true,
}).partial();

export interface OAuthUpdateDto extends z.infer<typeof oauthUpdateDtoSchema> {}

// Notification

export const notificationCreateDtoSchema = notificationSchema.pick({
    userId: true,
    title: true,
    type: true,
    message: true,
}).required();

export interface NotificationCreateDto extends z.infer<typeof notificationCreateDtoSchema> {}

export const notificationUpdateDtoSchema = notificationSchema.pick({
    type: true,
    isRead: true,
    readAt: true,
    isDeleted: true,
}).partial();

export interface NotificationUpdateDto extends z.infer<typeof notificationUpdateDtoSchema> {}