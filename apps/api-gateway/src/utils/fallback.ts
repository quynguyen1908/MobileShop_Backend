import { FallbackResponse } from '../dto/error.dto';

export function isFallbackResponse(
  result: unknown,
): result is FallbackResponse {
  return (
    typeof result === 'object' &&
    result !== null &&
    'fallback' in result &&
    (result as FallbackResponse).fallback === true
  );
}
