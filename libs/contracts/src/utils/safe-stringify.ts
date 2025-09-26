export function safeStringify(value: unknown): string {
  if (value === undefined) {
    return '';
  }

  if (value === null) {
    return '';
  }

  if (typeof value === 'string') {
    return value;
  }

  if (
    typeof value === 'number' ||
    typeof value === 'boolean' ||
    typeof value === 'bigint'
  ) {
    return String(value);
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (typeof value === 'object') {
    try {
      return JSON.stringify(value);
    } catch (_) {
      return '[Complex Object]';
    }
  }

  if (typeof value === 'function') {
    return '[Function]';
  }

  if (typeof value === 'symbol') {
    return value.toString();
  }

  return '[Unknown Type]';
}
