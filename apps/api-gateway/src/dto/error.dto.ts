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
    TestResponse {
  fallback: boolean;
  message: string;
}
