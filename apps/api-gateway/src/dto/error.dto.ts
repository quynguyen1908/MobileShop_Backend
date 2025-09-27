import { User } from '@app/contracts/auth';
import {
  LoginResponse,
  LogoutResponse,
  TestResponse,
} from '../auth/auth.interface';

export interface ServiceError {
  status?: number;
  message?: string;
}

export interface FallbackResponse
  extends LoginResponse,
    LogoutResponse,
    TestResponse,
    User {
  fallback: boolean;
  message: string;
}
