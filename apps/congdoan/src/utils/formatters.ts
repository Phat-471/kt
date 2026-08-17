export function formatNumber(value: number | null | undefined): string {
  if (value === null || value === undefined || isNaN(value)) return '0';
  return Math.round(value).toLocaleString('vi-VN');
}
