import { z } from 'zod';

export enum Gender {
  MALE = 'male',
  FEMALE = 'female',
  UNKNOWN = 'unknown',
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

// Customer

export const ErrFirstNameAtMost50Chars = new Error(
  'First name must be at most 50 characters long',
);
export const ErrLastNameAtMost50Chars = new Error(
  'Last name must be at most 50 characters long',
);

export const customerSchema = z.object({
  id: z.number().int().positive().optional(),
  userId: z.number().int().positive(),
  firstName: z.string().max(50, ErrFirstNameAtMost50Chars.message).optional(),
  lastName: z.string().max(50, ErrLastNameAtMost50Chars.message).optional(),
  gender: z.nativeEnum(Gender).optional(),
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
  gender: z.nativeEnum(Gender).optional(),
  dateOfBirth: z.date().optional(),
  hireDate: z.date().optional(),
  position: z.nativeEnum(EmployeePosition).optional(),
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
  type: z
    .nativeEnum(NotificationType)
    .optional()
    .default(NotificationType.INFO),
  isRead: z.boolean().optional().default(false),
  readAt: z.date().optional(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
  isDeleted: z.boolean().optional().default(false),
});

export type Notification = z.infer<typeof notificationSchema>;
