import { z } from 'zod';

export enum UserStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  BANNED = 'banned',
  SUSPENDED = 'suspended',
  DELETED = 'deleted',
}

// User

export const ErrUsernameAtLeast3Chars = new Error(
  'Username must be at least 3 characters long',
);
export const ErrUsernameAtMost30Chars = new Error(
  'Username must be at most 30 characters long',
);
export const ErrUsernameInvalid = new Error(
  'Username must contain only letters, numbers, and underscores (_)',
);
export const ErrPasswordAtLeast6Chars = new Error(
  'Password must be at least 6 characters long',
);
export const ErrPasswordAtMost100Chars = new Error(
  'Password must be at most 100 characters long',
);
export const ErrPhoneInvalid = new Error('Phone number is not valid');
export const ErrEmailInvalid = new Error('Email is not valid');
export const ErrUsernameAlreadyExists = new Error('Username already exists');
export const ErrPhoneAlreadyExists = new Error('Phone number already exists');
export const ErrEmailAlreadyExists = new Error('Email already exists');
export const ErrUserNotFound = new Error('User not found');
export const ErrInvalidUsernameAndPassword = new Error(
  'Invalid username and password',
);
export const ErrUserInactivated = new Error('User is inactivated or banned');

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
      ErrPhoneInvalid.message,
    ),
  email: z.string().email(ErrEmailInvalid.message),
  roleId: z.number().int().positive(),
  lastChangePass: z.date().optional(),
  status: z.nativeEnum(UserStatus).optional().default(UserStatus.ACTIVE),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

export type User = z.infer<typeof userSchema>;

// Role

export const ErrRoleNameAtLeast3Chars = new Error(
  'Role name must be at least 3 characters long',
);
export const ErrRoleNameAtMost50Chars = new Error(
  'Role name must be at most 50 characters long',
);
export const ErrRoleDescriptionAtMost255Chars = new Error(
  'Role description must be at most 255 characters long',
);

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
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
  isDeleted: z.boolean().optional().default(false),
});

export type Role = z.infer<typeof roleSchema>;
