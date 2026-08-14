import { NormalizedTransaction } from '../types/accounting';

export interface DataAnomalyIssue {
  id: string;
  transactionId: string;
  voucherNo: string;
  severity: 'HIGH_RISK' | 'WARNING' | 'INFO';
  anomalyType: 'ZERO_TYPO' | 'REVERSED_ACCOUNTS' | 'INVALID_DATE' | 'DUPLICATE_AMOUNT' | 'ZSCORE_OUTLIER';
  title: string;
  description: string;
  suggestedFix: string;
  originalAmount: number;
  zScore?: number;
}

/**
 * Tính Z-score cho một tập các số
 */
function calculateZScore(amounts: number[]): { mean: number; stdev: number } {
  if (amounts.length === 0) return { mean: 0, stdev: 0 };
  const sum = amounts.reduce((a, b) => a + b, 0);
  const mean = sum / amounts.length;
  const variance = amounts.reduce((sq, val) => sq + Math.pow(val - mean, 2), 0) / amounts.length;
  const stdev = Math.sqrt(variance);
  return { mean, stdev };
}

export const detectDataAnomalies = (transactions: NormalizedTransaction[]): DataAnomalyIssue[] => {
  const anomalies: DataAnomalyIssue[] = [];
  if (!transactions || transactions.length === 0) return anomalies;

  // Tính Z-Score trên toàn bộ tập giá trị tiền
  const amounts = transactions.map(t => t.amount);
  const { mean, stdev } = calculateZScore(amounts);

  transactions.forEach(t => {
    // 1. Z-Score Outlier Detection (Z > 2.5 nghĩa là chênh lệch cực lớn so với phân phối chuẩn)
    if (stdev > 0) {
      const zScore = (t.amount - mean) / stdev;
      if (zScore > 2.5 && t.amount > 50000000) {
        anomalies.push({
          id: `anom_zscore_${t.id}`,
          transactionId: t.id,
          voucherNo: t.voucherNo || t.id.substring(0, 6),
          severity: 'HIGH_RISK',
          anomalyType: 'ZSCORE_OUTLIER',
          title: 'Phát hiện dị biệt Z-score (Số tiền đột biến)',
          description: `Số tiền ${t.amount.toLocaleString()} VNĐ có Z-Score = ${zScore.toFixed(2)} (vượt ngưỡng 2.50σ so với trung bình ${Math.round(mean).toLocaleString()} VNĐ).`,
          suggestedFix: 'Kiểm tra lại xem đây là giao dịch đặc biệt hay gõ nhầm số liệu.',
          originalAmount: t.amount,
          zScore: Number(zScore.toFixed(2)),
        });
      }
    }

    // 2. Phát hiện gõ thừa/thiếu số 0 (Gấp 15x số tiền trung bình)
    if (t.amount > mean * 15 && t.amount >= 100000000) {
      // Tránh trùng lặp nếu đã có Z-score outlier
      const exists = anomalies.some(a => a.transactionId === t.id && a.anomalyType === 'ZSCORE_OUTLIER');
      if (!exists) {
        anomalies.push({
          id: `anom_zero_${t.id}`,
          transactionId: t.id,
          voucherNo: t.voucherNo || t.id.substring(0, 6),
          severity: 'HIGH_RISK',
          anomalyType: 'ZERO_TYPO',
          title: 'Cảnh báo gõ thừa số 0',
          description: `Số tiền ${t.amount.toLocaleString()} VNĐ cao bất thường gấp ${Math.round(t.amount / Math.max(mean, 1))} lần bình quân. Có thể kế toán đã nhập thừa số 0.`,
          suggestedFix: `Kiểm tra lại hóa đơn xem có phải là ${(t.amount / 10).toLocaleString()} VNĐ hay không.`,
          originalAmount: t.amount,
        });
      }
    }

    // 3. Phát hiện ngược chiều Nợ/Có (VD: Doanh thu nhưng hạch toán Nợ 511)
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

    // 4. Phát hiện ngày chứng từ bất hợp lý (Năm tương lai > 2030 hoặc quá khứ < 2010)
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
