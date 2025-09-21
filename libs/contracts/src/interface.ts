import { AppEvent } from "./model";

export interface TokenPayload {
    sub: number;
    role: string;
}

export interface Requester extends TokenPayload {}

export interface ReqWithRequester { requester: Requester; }
export interface ReqWithRequesterOpt { requester?: Requester; }

export interface ITokenProvider {
    generateToken(payload: TokenPayload): Promise<string>;
    verifyToken(token: string): Promise<TokenPayload | null>;
}

export type EventHandler = (msg: string) => void;

export interface IEventPublisher {
  publish<T>(event: AppEvent<T>): Promise<void>;
}