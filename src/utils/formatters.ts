export function formatCurrency(amount: number | null | undefined, includeSymbol: boolean = false): string {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return includeSymbol ? '0 ₫' : '0';
  }
  const formatted = Math.round(amount).toLocaleString('vi-VN');
  return includeSymbol ? `${formatted} ₫` : formatted;
}

export function formatNumber(value: number | null | undefined): string {
  if (value === null || value === undefined || isNaN(value)) {
    return '0';
  }
  return value.toLocaleString('vi-VN');
}

export function formatPercent(rate: number | null | undefined): string {
  if (rate === null || rate === undefined || isNaN(rate)) {
    return '0%';
  }
  return `${rate.toLocaleString('vi-VN')}%`;
}

export function formatDateVN(dateStr: string | null | undefined): string {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    const [year, month, day] = parts;
    return `${day}/${month}/${year}`;
  }
  return dateStr;
}

export function formatTaxCode(taxCode: string | null | undefined): string {
  if (!taxCode) return '';
  const clean = taxCode.trim();
  if (clean.length === 13 && !clean.includes('-')) {
    return `${clean.slice(0, 10)}-${clean.slice(10)}`;
  }
  return clean;
}
