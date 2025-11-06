export const AUTH_SERVICE = Symbol('AUTH_SERVICE');
export const USER_SERVICE = Symbol('USER_SERVICE');
export const PHONE_SERVICE = Symbol('PHONE_SERVICE');
export const ORDER_SERVICE = Symbol('ORDER_SERVICE');
export const PAYMENT_SERVICE = Symbol('PAYMENT_SERVICE');
export const VOUCHER_SERVICE = Symbol('VOUCHER_SERVICE');

export const AUTH_REPOSITORY = Symbol('AUTH_REPOSITORY');
export const USER_REPOSITORY = Symbol('USER_REPOSITORY');
export const ROLE_REPOSITORY = Symbol('ROLE_REPOSITORY');
export const OAUTH_REPOSITORY = Symbol('OAUTH_REPOSITORY');
export const PHONE_REPOSITORY = Symbol('PHONE_REPOSITORY');
export const ORDER_REPOSITORY = Symbol('ORDER_REPOSITORY');
export const PAYMENT_REPOSITORY = Symbol('PAYMENT_REPOSITORY');
export const VOUCHER_REPOSITORY = Symbol('VOUCHER_REPOSITORY');
export const RETRIEVAL_REPOSITORY = Symbol('RETRIEVAL_REPOSITORY');

export const TOKEN_PROVIDER = Symbol('TOKEN_PROVIDER');
export const TOKEN_VALIDATOR = Symbol('TOKEN_VALIDATOR');
export const EVENT_PUBLISHER = Symbol('EVENT_PUBLISHER');
export const EVENT_SUBSCRIBER = Symbol('EVENT_SUBSCRIBER');

export const OPENAI_EMBEDDINGS = Symbol('OPENAI_EMBEDDINGS');
export const OPENAI_CHAT_MODEL = Symbol('OPENAI_CHAT_MODEL');
export const AGENT_EXECUTOR = Symbol('AGENT_EXECUTOR');
export const AGENT_TOOLS = Symbol('AGENT_TOOLS');

export * from './model';
export * from './interface';
export * from './error';
