import { User } from '@app/contracts/auth';
import {
  LoginResponse,
  LogoutResponse,
  TestResponse,
} from '../auth/auth.interface';
import { PhoneDto } from '@app/contracts/phone/phone.dto';

export interface ServiceError {
  statusCode?: number;
  logMessage?: string;
}

export interface FallbackResponse
  extends LoginResponse,
    LogoutResponse,
    TestResponse,
    User,
    PhoneDto {
  fallback: boolean;
  message: string;
}
