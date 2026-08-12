import { NormalizedTransaction } from '../types/accounting';

export interface VarianceItem {
  accountCode: string;
  accountName: string;
  currentPeriodAmount: number;
  previousPeriodAmount: number;
  varianceAmount: number; // Mức chênh lệch tuyệt đối
  variancePercent: number; // % Tăng/Giảm
  riskLevel: 'NORMAL' | 'WARNING' | 'ALERT'; // ALERT nếu tăng/giảm bất thường > 30%
  recommendation: string;
}

export interface VarianceAnalysisResult {
  totalRevenueCurrent: number;
  totalRevenuePrev: number;
  revenueVariancePercent: number;
  totalExpenseCurrent: number;
  totalExpensePrev: number;
  expenseVariancePercent: number;
  abnormalItemsCount: number;
  items: VarianceItem[];
}

export const analyzeFinancialVariances = (transactions: NormalizedTransaction[]): VarianceAnalysisResult => {
  // Demo phân tách kỳ hiện tại vs kỳ trước dựa trên nửa đầu/sau niên độ hoặc phân bổ thời gian
  const sorted = [...transactions].sort((a, b) => a.date.localeCompare(b.date));
  const midPoint = Math.floor(sorted.length / 2);

  const prevPeriod = sorted.slice(0, midPoint);
  const currentPeriod = sorted.slice(midPoint);

  const getAccountTotals = (txs: NormalizedTransaction[]) => {
    const map = new Map<string, number>();
    txs.forEach((t) => {
      const acc = t.debitAcc || t.creditAcc || 'UNKNOWN';
      map.set(acc, (map.get(acc) || 0) + t.amount);
    });
    return map;
  };

  const currentMap = getAccountTotals(currentPeriod);
  const prevMap = getAccountTotals(prevPeriod);

  const allAccounts = Array.from(new Set([...currentMap.keys(), ...prevMap.keys()]));
  const items: VarianceItem[] = [];

  let abnormalItemsCount = 0;
  let totalRevenueCurrent = 0;
  let totalRevenuePrev = 0;
  let totalExpenseCurrent = 0;
  let totalExpensePrev = 0;

  allAccounts.forEach((acc) => {
    const curVal = currentMap.get(acc) || 0;
    const prevVal = prevMap.get(acc) || 0;
    const diff = curVal - prevVal;
    const pct = prevVal > 0 ? (diff / prevVal) * 100 : curVal > 0 ? 100 : 0;

    let riskLevel: VarianceItem['riskLevel'] = 'NORMAL';
    let recommendation = 'Biến động bình thường nằm trong ngưỡng kiểm soát.';

    if (Math.abs(pct) >= 30 && (curVal >= 10000000 || prevVal >= 10000000)) {
      riskLevel = 'ALERT';
      abnormalItemsCount++;
      recommendation = `🚨 Cảnh báo: Biến động ${pct > 0 ? 'tăng' : 'giảm'} ${Math.abs(pct).toFixed(1)}% vượt ngưỡng 30%. Cần kiểm tra hóa đơn & giải trình lý do biến động.`;
    } else if (Math.abs(pct) >= 15) {
      riskLevel = 'WARNING';
      recommendation = `Cảnh báo nhẹ: Biến động ${pct > 0 ? 'tăng' : 'giảm'} ${Math.abs(pct).toFixed(1)}%.`;
    }

    if (acc.startsWith('511')) {
      totalRevenueCurrent += curVal;
      totalRevenuePrev += prevVal;
    } else if (acc.startsWith('632') || acc.startsWith('641') || acc.startsWith('642')) {
      totalExpenseCurrent += curVal;
      totalExpensePrev += prevVal;
    }

    items.push({
      accountCode: acc,
      accountName: acc.startsWith('511') ? 'Doanh Thu Bán Hàng' : acc.startsWith('632') ? 'Giá Vốn Hàng Bán' : acc.startsWith('642') ? 'Chi Phí Quản Lý DN' : 'Tài Khoản Kế Toán',
      currentPeriodAmount: curVal,
      previousPeriodAmount: prevVal,
      varianceAmount: diff,
      variancePercent: pct,
      riskLevel,
      recommendation,
    });
  });

  const revDiff = totalRevenueCurrent - totalRevenuePrev;
  const revPct = totalRevenuePrev > 0 ? (revDiff / totalRevenuePrev) * 100 : 0;
  const expDiff = totalExpenseCurrent - totalExpensePrev;
  const expPct = totalExpensePrev > 0 ? (expDiff / totalExpensePrev) * 100 : 0;

  return {
    totalRevenueCurrent,
    totalRevenuePrev,
    revenueVariancePercent: revPct,
    totalExpenseCurrent,
    totalExpensePrev,
    expenseVariancePercent: expPct,
    abnormalItemsCount,
    items,
  };
};
