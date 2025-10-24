export function parseFloatSafe(
  value: string | number | null | undefined,
): number | null {
  if (value === null || value === undefined) return null;

  try {
    if (typeof value === 'number') {
      return isNaN(value) || !isFinite(value) ? null : value;
    }

    const stringValue = String(value).trim();
    const isFloatString = /^-?\d+([.,]\d+)?$/.test(stringValue);

    const result = isFloatString
      ? parseFloat(stringValue.replace(',', '.'))
      : NaN;

    return !isNaN(result) && isFinite(result) ? result : null;
  } catch {
    return null;
  }
}
