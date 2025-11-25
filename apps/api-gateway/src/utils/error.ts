import { HttpException } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';

interface ErrorDetail {
  message: string;
}

type ErrorWithResponse = {
  response?: {
    message?: string | string[];
    error?: string;
    statusCode?: number;
  };
  errors?: unknown[];
  logMessage?: string;
  stack?: string;
};

export function formatError(error: unknown): ErrorDetail[] {
  const typedError = error as ErrorWithResponse;

  if (error instanceof HttpException || error instanceof RpcException) {
    const response = typedError.response;
    if (response) {
      if (Array.isArray(response.message)) {
        return response.message.map((msg) => ({ message: msg }));
      }
      return [{ message: response.message || 'Unknown error' }];
    }
  }

  if (typedError.errors && Array.isArray(typedError.errors)) {
    return typedError.errors.map((err) => {
      const errObj = err as { message?: string };
      return {
        message:
          typeof errObj.message === 'string' ? errObj.message : 'Unknown error',
      };
    });
  }

  if (
    error &&
    typeof error === 'object' &&
    'message' in error &&
    typeof (error as { message: unknown }).message === 'string'
  ) {
    const rawMessage = (error as { message: string }).message;

    try {
      const parsedError: unknown = JSON.parse(rawMessage);

      if (
        typeof parsedError === 'object' &&
        parsedError !== null &&
        'message' in parsedError &&
        typeof (parsedError as { message?: unknown }).message === 'string'
      ) {
        return [{ message: (parsedError as { message: string }).message }];
      }
    } catch (e) {
      console.error('Failed to parse error message as JSON:', e);
    }

    return [{ message: rawMessage }];
  }

  const errorMessage =
    typeof typedError.logMessage === 'string'
      ? typedError.logMessage
      : 'Unknown error';

  return [{ message: errorMessage }];
}
