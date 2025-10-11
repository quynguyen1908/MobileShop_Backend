import { AppEvent } from './model';

export interface TokenPayload {
  sub: number;
  username: string;
  email?: string;
  role: string;
  iat?: number;
  jti?: string;
}

export interface TokenResponse {
  accessToken: string;
  refreshToken?: string;
  expiresIn: number;
}

export type Requester = TokenPayload;

export interface ReqWithRequester {
  requester: Requester;
}
export interface ReqWithRequesterOpt {
  requester?: Requester;
}

export interface ITokenProvider {
  generateTokens(payload: TokenPayload): Promise<TokenResponse>;
  generateAccessToken(payload: TokenPayload): string;
  verifyAccessToken(token: string): TokenPayload | null;
  verifyRefreshToken(token: string): Promise<TokenPayload | null>;
  refreshAccessToken(refreshToken: string): Promise<TokenResponse>;
  invalidateToken(userId: number, tokenId?: string): Promise<void>;
  decodeToken(token: string): TokenPayload | null;
}

export type TokenValidationResult = {
  payload: TokenPayload | null;
  error?: Error;
  isValid: boolean;
};

export interface ITokenValidator {
  validate(token: string): Promise<TokenValidationResult>;
}

export type EventHandler = (msg: string) => void;

export interface IEventPublisher {
  publish<T>(event: AppEvent<T>): Promise<void>;
}

export interface IEventSubscriber {
  subscribe(
    topic: string,
    serviceName: string,
    handler: EventHandler,
  ): Promise<void>;
}

export interface OpenAIConfig {
  apiKey: string;
  chatModel: string;
  embeddingModel: string;
}

export interface VectorMetadata {
  id: string;
  source: string;
  title?: string;
  url?: string;
  tags?: string[];
  createdAt?: Date;

  [key: string]: string | string[] | Date | number | undefined;
}

export type AgentContent = {
  role: 'Human' | 'Assistant';
  content: string;
  isPartial?: boolean;
};
