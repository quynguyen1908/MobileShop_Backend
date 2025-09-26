export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface LoginResponse {
  userId: number;
  tokens: AuthTokens;
}

export interface LogoutResponse {
  success: boolean;
  message?: string;
}

export interface TestResponse {
  message: string;
  timestamp: string;
}
