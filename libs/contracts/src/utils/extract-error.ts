import { AxiosError } from 'axios';

function hasMessageField(obj: unknown): obj is { message: string } {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'message' in obj &&
    typeof (obj as { message: unknown }).message === 'string'
  );
}

export function extractErrorMessage(error: unknown): string {
  if (error instanceof AxiosError) {
    const responseData: unknown = error.response?.data;

    if (hasMessageField(responseData)) {
      return responseData.message;
    }

    return error.message ?? 'Axios error without message';
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'Unknown error';
}
