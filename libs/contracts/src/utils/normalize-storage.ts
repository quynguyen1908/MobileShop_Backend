export function normalizeStorage(info: string): number | null {
  if (!info) return null;

  const lower = info.toLowerCase().trim();
  // Lấy số
  const value = parseFloat(lower);

  if (isNaN(value)) return null;

  // Nếu có TB -> đổi thành GB
  if (lower.includes('tb')) {
    return value * 1024; // 1 TB = 1024 GB
  }

  // Mặc định là GB
  return value;
}
