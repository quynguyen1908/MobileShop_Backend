import { z } from "zod";

export enum UserStatus {
    ACTIVE = 'active',
    INACTIVE = 'inactive',
    BANNED = 'banned',
    SUSPENDED = 'suspended',
    DELETED = 'deleted',
}

export enum Gender {
  MALE = 'male',
  FEMALE = 'female',
  UNKNOWN = 'unknown',
}

export enum OAuthProvider {
    GOOGLE = 'google',
    FACEBOOK = 'facebook',
}

export enum EmployeePosition {
    MANAGER = 'manager',
    SALE = 'sale',
    WAREHOUSE = 'warehouse',
}

export enum NotificationType {
    INFO = 'info',
    WARNING = 'warning',
    ERROR = 'error',
}

// User

export const ErrUsernameAtLeast3Chars = new Error("Username must be at least 3 characters long");
export const ErrUsernameAtMost30Chars = new Error("Username must be at most 30 characters long");
export const ErrUsernameInvalid = new Error("Username must contain only letters, numbers, and underscores (_)");
export const ErrPasswordAtLeast6Chars = new Error("Password must be at least 6 characters long");
export const ErrPasswordAtMost100Chars = new Error("Password must be at most 100 characters long");
export const ErrPhoneInvalid = new Error("Phone number is not valid");
export const ErrEmailInvalid = new Error("Email is not valid");

export const userSchema = z.object({
    id: z.number().int().positive().optional(),
    username: z
        .string()
        .min(3, ErrUsernameAtLeast3Chars.message)
        .max(30, ErrUsernameAtMost30Chars.message)
        .regex(/^[a-zA-Z0-9_]+$/, ErrUsernameInvalid.message),
    password: z
        .string()
        .min(6, ErrPasswordAtLeast6Chars.message)
        .max(100, ErrPasswordAtMost100Chars.message),
    phone: z
        .string()
        .regex(
            /^(0[2-9][0-9]{8,9})$|^(\+84[2-9][0-9]{8,9})$/, 
            ErrPhoneInvalid.message
        ),
    email: z
        .string()
        .email(ErrEmailInvalid.message),
    roleId: z.number().int().positive(),
    lastChangePass: z.date().optional(),
    status: z.nativeEnum(UserStatus).optional().default(UserStatus.ACTIVE),
    createAt: z.date().optional(),
    updateAt: z.date().optional(),
});

export interface User extends z.infer<typeof userSchema> {}

// Role

export const ErrRoleNameAtLeast3Chars = new Error("Role name must be at least 3 characters long");
export const ErrRoleNameAtMost50Chars = new Error("Role name must be at most 50 characters long");
export const ErrRoleDescriptionAtMost255Chars = new Error("Role description must be at most 255 characters long");

export const roleSchema = z.object({
    id: z.number().int().positive().optional(),
    name: z
        .string()
        .min(3, ErrRoleNameAtLeast3Chars.message)
        .max(50, ErrRoleNameAtMost50Chars.message),
    description: z
        .string()
        .max(255, ErrRoleDescriptionAtMost255Chars.message)
        .optional(),
    createAt: z.date().optional(),
    updateAt: z.date().optional(),
    isDeleted: z.boolean().optional().default(false),
});

export interface Role extends z.infer<typeof roleSchema> {}

// Customer

export const ErrFirstNameAtMost50Chars = new Error("First name must be at most 50 characters long");
export const ErrLastNameAtMost50Chars = new Error("Last name must be at most 50 characters long");

export const customerSchema = z.object({
    id: z.number().int().positive().optional(),
    userId: z.number().int().positive(),
    firstName: z
        .string()
        .max(50, ErrFirstNameAtMost50Chars.message)
        .optional(),
    lastName: z
        .string()
        .max(50, ErrLastNameAtMost50Chars.message)
        .optional(),
    gender: z.nativeEnum(Gender).optional(),
    dateOfBirth: z.date().optional(),
    pointBalance: z.number().int().nonnegative().optional().default(0),
    createAt: z.date().optional(),
    updateAt: z.date().optional(),
    isDeleted: z.boolean().optional().default(false),
});

export interface Customer extends z.infer<typeof customerSchema> {}

// Employee

export const employeeSchema = z.object({
    id: z.number().int().positive().optional(),
    userId: z.number().int().positive(),
    firstName: z
        .string()
        .max(50, ErrFirstNameAtMost50Chars.message)
        .optional(),
    lastName: z
        .string()
        .max(50, ErrLastNameAtMost50Chars.message)
        .optional(),
    gender: z.nativeEnum(Gender).optional(),
    dateOfBirth: z.date().optional(),
    hireDate: z.date().optional(),
    position: z.nativeEnum(EmployeePosition).optional(),
    salary: z.number().nonnegative().optional().default(0),
    createAt: z.date().optional(),
    updateAt: z.date().optional(),
    isDeleted: z.boolean().optional().default(false),
});

export interface Employee extends z.infer<typeof employeeSchema> {}

// OAuth

export const oauthSchema = z.object({
    id: z.number().int().positive().optional(),
    userId: z.number().int().positive(),
    oauthProvider: z.nativeEnum(OAuthProvider),
    oauthId: z.string(),
    createAt: z.date().optional(),
    updateAt: z.date().optional(),
    isDeleted: z.boolean().optional().default(false),
});

export interface OAuth extends z.infer<typeof oauthSchema> {}

// Notification 

export const notificationSchema = z.object({
    id: z.number().int().positive().optional(),
    userId: z.number().int().positive(),
    title: z.string(),
    message: z.string(),
    type: z.nativeEnum(NotificationType).optional().default(NotificationType.INFO),
    isRead: z.boolean().optional().default(false),
    readAt: z.date().optional(),
    createAt: z.date().optional(),
    updateAt: z.date().optional(),
    isDeleted: z.boolean().optional().default(false),
});

export interface Notification extends z.infer<typeof notificationSchema> {}