import { z } from 'zod';

export enum Gender {
  MALE = 'male',
  FEMALE = 'female',
  UNKNOWN = 'unknown',
}

export enum EmployeePosition {
  MANAGER = 'manager',
  SALE = 'sale',
}

export enum NotificationType {
  ORDER = 'order',
  VOUCHER = 'voucher',
  ADMIN = 'admin',
}

// Customer

export const ErrFirstNameAtMost50Chars = new Error(
  'First name must be at most 50 characters long',
);
export const ErrLastNameAtMost50Chars = new Error(
  'Last name must be at most 50 characters long',
);
export const ErrCustomerNotFound = new Error('Customer not found');

export const customerSchema = z.object({
  id: z.number().int().positive().optional(),
  userId: z.number().int().positive(),
  firstName: z.string().max(50, ErrFirstNameAtMost50Chars.message).optional(),
  lastName: z.string().max(50, ErrLastNameAtMost50Chars.message).optional(),
  gender: z.enum(Gender).optional(),
  dateOfBirth: z
    .union([
      z.string().refine((val) => !isNaN(new Date(val).getTime()), {
        message:
          "Invalid date string format. Use ISO format (e.g. '2023-01-15T00:00:00.000Z')",
      }),
      z.date(),
      z.undefined(),
    ])
    .transform((val) => {
      if (val === undefined || val === null) return undefined;
      if (val instanceof Date) return val;

      try {
        const date = new Date(val);
        return isNaN(date.getTime()) ? undefined : date;
      } catch (_) {
        return undefined;
      }
    })
    .optional(),
  pointsBalance: z.number().int().nonnegative().optional().default(0),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
  isDeleted: z.boolean().optional().default(false),
});

export type Customer = z.infer<typeof customerSchema>;

// Employee

export const employeeSchema = z.object({
  id: z.number().int().positive().optional(),
  userId: z.number().int().positive(),
  firstName: z.string().max(50, ErrFirstNameAtMost50Chars.message).optional(),
  lastName: z.string().max(50, ErrLastNameAtMost50Chars.message).optional(),
  gender: z.enum(Gender).optional(),
  dateOfBirth: z.date().optional(),
  hireDate: z.date().optional(),
  position: z.enum(EmployeePosition).optional(),
  salary: z.number().nonnegative().optional().default(0),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
  isDeleted: z.boolean().optional().default(false),
});

export type Employee = z.infer<typeof employeeSchema>;

// Notification

export const notificationSchema = z.object({
  id: z.number().int().positive().optional(),
  userId: z.number().int().positive(),
  title: z.string(),
  message: z.string(),
  type: z.enum(NotificationType).optional(),
  isRead: z.boolean().optional().default(false),
  readAt: z.date().optional(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
  isDeleted: z.boolean().optional().default(false),
});

export type Notification = z.infer<typeof notificationSchema>;

// Commune

export const ErrCommuneNotFound = new Error('Commune not found');

export const communeSchema = z.object({
  id: z.number().int().positive().optional(),
  code: z.number().int().positive(),
  name: z.string(),
  divisionType: z.string(),
  codename: z.string(),
  provinceCode: z.number().int().positive(),
});

export type Commune = z.infer<typeof communeSchema>;

// Province

export const ErrProvinceNotFound = new Error('Province not found');

export const provinceSchema = z.object({
  id: z.number().int().positive().optional(),
  code: z.number().int().positive(),
  name: z.string(),
  divisionType: z.string(),
  codename: z.string(),
  phoneCode: z.number().int().positive(),
});

export type Province = z.infer<typeof provinceSchema>;

// Address

export const addressSchema = z.object({
  id: z.number().int().positive().optional(),
  customerId: z.number().int().positive(),
  recipientName: z.string(),
  recipientPhone: z.string(),
  street: z.string(),
  communeId: z.number().int().positive(),
  provinceId: z.number().int().positive(),
  postalCode: z.string().optional(),
  isDefault: z.boolean().optional().default(false),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
  isDeleted: z.boolean().optional().default(false),
});

export type Address = z.infer<typeof addressSchema>;
