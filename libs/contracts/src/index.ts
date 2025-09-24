export const AUTH_SERVICE = Symbol('AUTH_SERVICE');
export const USER_SERVICE = Symbol('USER_SERVICE');

export const AUTH_REPOSITORY = Symbol('AUTH_REPOSITORY');
export const USER_REPOSITORY = Symbol('USER_REPOSITORY');
export const ROLE_REPOSITORY = Symbol('ROLE_REPOSITORY');

export const TOKEN_PROVIDER = Symbol('TOKEN_PROVIDER');
export const TOKEN_VALIDATOR = Symbol('TOKEN_VALIDATOR');
export const EVENT_PUBLISHER = Symbol('EVENT_PUBLISHER');
export const EVENT_SUBSCRIBER = Symbol('EVENT_SUBSCRIBER');

export * from './model';
export * from './interface';
export * from './error';