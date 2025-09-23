import { customerSchema } from "../user";
import { z } from "zod";
import { roleSchema, userSchema } from "./auth.model";

// Auth

export const registerDtoSchema = userSchema.pick({
    username: true,
    email: true,
    password: true,
    phone: true,
    roleId: true,
}).merge(
    customerSchema.pick({
        firstName: true,
        lastName: true,
        dateOfBirth: true,
    })
).required();

export interface RegisterDto extends z.infer<typeof registerDtoSchema> {}

// User

export const userCreateDtoSchema = userSchema.pick({
    username: true,
    password: true,
    phone: true,
    email: true,
    roleId: true,
}).required();

export interface UserCreateDto extends z.infer<typeof userCreateDtoSchema> {}

export const userUpdateDtoSchema = userSchema.pick({
    username: true,
    password: true,
    roleId: true,
    status: true,
}).partial();

export interface UserUpdateDto extends z.infer<typeof userUpdateDtoSchema> {}

export const UserUpdateProfileDtoSchema = userUpdateDtoSchema.omit({
    roleId: true,
    status: true,
}).partial();

export interface UserUpdateProfileDto extends z.infer<typeof UserUpdateProfileDtoSchema> {}

export const userFilterDtoSchema = userSchema.pick({
    username: true,
    phone: true,
    email: true,
    roleId: true,
    status: true,
}).partial();

export interface UserFilterDto extends z.infer<typeof userFilterDtoSchema> {}

// Role

export const roleCreateDtoSchema = roleSchema.pick({
    name: true,
    description: true,
}).required();

export interface RoleCreateDto extends z.infer<typeof roleCreateDtoSchema> {}

export const roleUpdateDtoSchema = roleSchema.pick({
    name: true,
    description: true,
    isDeleted: true,
}).partial();

export interface RoleUpdateDto extends z.infer<typeof roleUpdateDtoSchema> {}