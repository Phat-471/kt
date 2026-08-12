import { NormalizedTransaction } from '../types/accounting';

export interface DataAnomalyIssue {
  id: string;
  transactionId: string;
  voucherNo: string;
  severity: 'HIGH_RISK' | 'WARNING' | 'INFO';
  anomalyType: 'ZERO_TYPO' | 'REVERSED_ACCOUNTS' | 'INVALID_DATE' | 'DUPLICATE_AMOUNT';
  title: string;
  description: string;
  suggestedFix: string;
  originalAmount: number;
}

export const detectDataAnomalies = (transactions: NormalizedTransaction[]): DataAnomalyIssue[] => {
  const anomalies: DataAnomalyIssue[] = [];

  // Tính số tiền trung bình của bộ dữ liệu để phát hiện lỗi gõ thừa số 0
  const totalAmt = transactions.reduce((sum, t) => sum + t.amount, 0);
  const avgAmount = transactions.length > 0 ? totalAmt / transactions.length : 10000000;

  transactions.forEach(t => {
    // 1. Phát hiện gõ thừa/thiếu số 0 (Gấp 10x hoặc 100x số tiền trung bình)
    if (t.amount > avgAmount * 15 && t.amount >= 100000000) {
      anomalies.push({
        id: `anom_zero_${t.id}`,
        transactionId: t.id,
        voucherNo: t.voucherNo || t.id.substring(0, 6),
        severity: 'HIGH_RISK',
        anomalyType: 'ZERO_TYPO',
        title: 'Cảnh báo gõ thừa số 0 (Số tiền đột biến)',
        description: `Số tiền ${t.amount.toLocaleString()} VNĐ cao bất thường gấp ${Math.round(t.amount / avgAmount)} lần bình quân. Có thể kế toán đã nhập thừa số 0.`,
        suggestedFix: `Kiểm tra lại hóa đơn xem có phải là ${(t.amount / 10).toLocaleString()} VNĐ hay không.`,
        originalAmount: t.amount,
      });
    }

    // 2. Phát hiện ngược chiều Nợ/Có (VD: Doanh thu nhưng hạch toán Nợ 511)
    if (t.debitAcc.startsWith('511') || t.debitAcc.startsWith('711')) {
      anomalies.push({
        id: `anom_rev_${t.id}`,
        transactionId: t.id,
        voucherNo: t.voucherNo || t.id.substring(0, 6),
        severity: 'HIGH_RISK',
        anomalyType: 'REVERSED_ACCOUNTS',
        title: 'Hạch toán ngược chiều Nợ / Có tài khoản Doanh thu',
        description: `Tài khoản Doanh thu ${t.debitAcc} được ghi Nợ bất hợp lý trong chứng từ diễn giải: "${t.description}".`,
        suggestedFix: `Đổi lại: Có TK ${t.debitAcc} và Nợ TK 111/112/131.`,
        originalAmount: t.amount,
      });
    }

    // 3. Phát hiện ngày chứng từ bất hợp lý (Năm tương lai > 2030 hoặc quá khứ < 2010)
    const year = new Date(t.date).getFullYear();
    if (year > 2030 || year < 2010) {
      anomalies.push({
        id: `anom_date_${t.id}`,
        transactionId: t.id,
        voucherNo: t.voucherNo || t.id.substring(0, 6),
        severity: 'WARNING',
        anomalyType: 'INVALID_DATE',
        title: 'Ngày chứng từ bất hợp lý',
        description: `Ngày chứng từ ${t.date} rơi vào năm ${year} sai lệch so với niên độ kế toán hiện tại.`,
        suggestedFix: 'Sửa lại ngày chứng từ theo đúng hóa đơn thực tế.',
        originalAmount: t.amount,
      });
    }
  });

  return anomalies;
};
