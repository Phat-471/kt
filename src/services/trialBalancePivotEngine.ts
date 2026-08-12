/**
 * Trial Balance Pivot Engine — Bảng Cân Đối Phát Sinh Tài Khoản TT200
 * Tự động tính: Dư Nợ/Dư Có Đầu Kỳ, Phát Sinh Nợ/Có Trong Kỳ, Dư Nợ/Dư Có Cuối Kỳ
 */

import { NormalizedTransaction } from '../types/accounting';

export interface TrialBalanceRow {
  accountCode: string;       // Mã TK (VD: 111, 1111, 112, 131, 331, 511, 642, 911)
  accountName: string;       // Tên TK
  accountLevel: number;      // Cấp TK (1: Cấp chính, 2: Chi tiết)
  parentCode?: string;       // Mã TK cha (VD: 111 cho 1111)
  isHeader?: boolean;
  // Dư đầu kỳ
  openingDebit: number;
  openingCredit: number;
  // Phát sinh trong kỳ
  periodDebit: number;
  periodCredit: number;
  // Dư cuối kỳ
  closingDebit: number;
  closingCredit: number;
}

export interface TrialBalanceReport {
  periodFrom?: string;
  periodTo?: string;
  rows: TrialBalanceRow[];
  totalOpeningDebit: number;
  totalOpeningCredit: number;
  totalPeriodDebit: number;
  totalPeriodCredit: number;
  totalClosingDebit: number;
  totalClosingCredit: number;
  isBalanced: boolean;        // Kiểm tra Cân bằng: Tổng Nợ = Tổng Có
}

// ============================================================
// DANH MỤC TÀI KHOẢN CHUẨN THÔNG TƯ 200/2014
// ============================================================

export const TT200_ACCOUNTS: Array<{ code: string; name: string; level: number; parent?: string; normalBalance: 'DEBIT' | 'CREDIT' | 'BOTH' }> = [
  // Loại 1: Tài sản ngắn hạn
  { code: '111', name: 'Tiền mặt', level: 1, normalBalance: 'DEBIT' },
  { code: '1111', name: 'Tiền Việt Nam', level: 2, parent: '111', normalBalance: 'DEBIT' },
  { code: '1112', name: 'Ngoại tệ', level: 2, parent: '111', normalBalance: 'DEBIT' },
  { code: '112', name: 'Tiền gửi Ngân hàng', level: 1, normalBalance: 'DEBIT' },
  { code: '1121', name: 'Tiền gửi Việt Nam Đồng', level: 2, parent: '112', normalBalance: 'DEBIT' },
  { code: '1122', name: 'Tiền gửi Ngoại tệ', level: 2, parent: '112', normalBalance: 'DEBIT' },
  { code: '131', name: 'Phải thu của khách hàng', level: 1, normalBalance: 'BOTH' },
  { code: '133', name: 'Thuế GTGT được khấu trừ', level: 1, normalBalance: 'DEBIT' },
  { code: '1331', name: 'Thuế GTGT được khấu trừ của HHDV', level: 2, parent: '133', normalBalance: 'DEBIT' },
  { code: '152', name: 'Nguyên liệu, vật liệu', level: 1, normalBalance: 'DEBIT' },
  { code: '156', name: 'Hàng hóa', level: 1, normalBalance: 'DEBIT' },

  // Loại 2: Tài sản dài hạn
  { code: '211', name: 'Tài sản cố định hữu hình', level: 1, normalBalance: 'DEBIT' },
  { code: '214', name: 'Hao mòn tài sản cố định', level: 1, normalBalance: 'CREDIT' },

  // Loại 3: Nợ phải trả
  { code: '331', name: 'Phải trả cho người bán', level: 1, normalBalance: 'BOTH' },
  { code: '333', name: 'Thuế và các khoản phải nộp Nhà nước', level: 1, normalBalance: 'BOTH' },
  { code: '3331', name: 'Thuế giá trị gia tăng phải nộp', level: 2, parent: '333', normalBalance: 'CREDIT' },
  { code: '3335', name: 'Thuế thu nhập cá nhân', level: 2, parent: '333', normalBalance: 'CREDIT' },
  { code: '334', name: 'Phải trả người lao động', level: 1, normalBalance: 'CREDIT' },
  { code: '338', name: 'Phải trả, phải nộp khác (BHXH/BHYT/BHTN)', level: 1, normalBalance: 'CREDIT' },

  // Loại 4: Vốn chủ sở hữu
  { code: '411', name: 'Vốn đầu tư của chủ sở hữu', level: 1, normalBalance: 'CREDIT' },
  { code: '421', name: 'Lợi nhuận sau thuế chưa phân phối', level: 1, normalBalance: 'BOTH' },

  // Loại 5: Doanh thu
  { code: '511', name: 'Doanh thu bán hàng và cung cấp dịch vụ', level: 1, normalBalance: 'CREDIT' },
  { code: '515', name: 'Doanh thu hoạt động tài chính', level: 1, normalBalance: 'CREDIT' },

  // Loại 6: Chi phí sản xuất kinh doanh
  { code: '621', name: 'Chi phí nguyên liệu, vật liệu trực tiếp', level: 1, normalBalance: 'DEBIT' },
  { code: '622', name: 'Chi phí nhân công trực tiếp', level: 1, normalBalance: 'DEBIT' },
  { code: '627', name: 'Chi phí sản xuất chung', level: 1, normalBalance: 'DEBIT' },
  { code: '632', name: 'Giá vốn hàng bán', level: 1, normalBalance: 'DEBIT' },
  { code: '641', name: 'Chi phí bán hàng', level: 1, normalBalance: 'DEBIT' },
  { code: '642', name: 'Chi phí quản lý doanh nghiệp', level: 1, normalBalance: 'DEBIT' },

  // Loại 7 & 8: Thu nhập & chi phí khác
  { code: '711', name: 'Thu nhập khác', level: 1, normalBalance: 'CREDIT' },
  { code: '811', name: 'Chi phí khác', level: 1, normalBalance: 'DEBIT' },

  // Loại 9: Xác định kết quả kinh doanh
  { code: '911', name: 'Xác định kết quả kinh doanh', level: 1, normalBalance: 'BOTH' },
];

// ============================================================
// ENGINE CALCULATION
// ============================================================

export function calculateTrialBalance(
  transactions: NormalizedTransaction[],
  periodFrom?: string,
  periodTo?: string,
  openingBalances: Record<string, { debit: number; credit: number }> = {}
): TrialBalanceReport {

  const filtered = transactions.filter(t => {
    if (periodFrom && t.date < periodFrom) return false;
    if (periodTo && t.date > periodTo) return false;
    return true;
  });

  // Gom phát sinh theo từng TK
  const periodMap: Record<string, { debit: number; credit: number }> = {};

  filtered.forEach(t => {
    if (t.debitAcc) {
      if (!periodMap[t.debitAcc]) periodMap[t.debitAcc] = { debit: 0, credit: 0 };
      periodMap[t.debitAcc].debit += t.amount;
    }
    if (t.creditAcc) {
      if (!periodMap[t.creditAcc]) periodMap[t.creditAcc] = { debit: 0, credit: 0 };
      periodMap[t.creditAcc].credit += t.amount;
    }
  });

  // Lấy tất cả danh mục tài khoản có phát sinh hoặc có dư đầu kỳ hoặc trong danh mục
  const allAccCodes = new Set<string>([
    ...TT200_ACCOUNTS.map(a => a.code),
    ...Object.keys(openingBalances),
    ...Object.keys(periodMap),
  ]);

  const rows: TrialBalanceRow[] = [];

  Array.from(allAccCodes).sort().forEach(code => {
    const accDef = TT200_ACCOUNTS.find(a => a.code === code);
    const opening = openingBalances[code] || { debit: 0, credit: 0 };
    const period = periodMap[code] || { debit: 0, credit: 0 };

    const openingDebit = opening.debit;
    const openingCredit = opening.credit;
    const periodDebit = period.debit;
    const periodCredit = period.credit;

    // Tính Dư Cuối Kỳ theo bản chất TK
    let net = (openingDebit - openingCredit) + (periodDebit - periodCredit);
    let closingDebit = 0;
    let closingCredit = 0;

    if (accDef?.normalBalance === 'CREDIT' || (accDef?.normalBalance === 'BOTH' && net < 0)) {
      closingCredit = Math.abs(net);
    } else {
      closingDebit = Math.max(0, net);
    }

    // Chỉ giữ lại những tài khoản có số dư hoặc phát sinh
    if (openingDebit > 0 || openingCredit > 0 || periodDebit > 0 || periodCredit > 0 || closingDebit > 0 || closingCredit > 0) {
      rows.push({
        accountCode: code,
        accountName: accDef?.name || `Tài khoản ${code}`,
        accountLevel: accDef?.level || 1,
        parentCode: accDef?.parent,
        openingDebit,
        openingCredit,
        periodDebit,
        periodCredit,
        closingDebit,
        closingCredit,
      });
    }
  });

  // Tổng cộng (chỉ tính tài khoản Cấp 1 để tránh cộng đúp tài khoản con)
  const level1Rows = rows.filter(r => r.accountLevel === 1);
  const totalOpeningDebit = level1Rows.reduce((s, r) => s + r.openingDebit, 0);
  const totalOpeningCredit = level1Rows.reduce((s, r) => s + r.openingCredit, 0);
  const totalPeriodDebit = level1Rows.reduce((s, r) => s + r.periodDebit, 0);
  const totalPeriodCredit = level1Rows.reduce((s, r) => s + r.periodCredit, 0);
  const totalClosingDebit = level1Rows.reduce((s, r) => s + r.closingDebit, 0);
  const totalClosingCredit = level1Rows.reduce((s, r) => s + r.closingCredit, 0);

  const isBalanced =
    totalOpeningDebit === totalOpeningCredit &&
    totalPeriodDebit === totalPeriodCredit;

  return {
    periodFrom,
    periodTo,
    rows,
    totalOpeningDebit,
    totalOpeningCredit,
    totalPeriodDebit,
    totalPeriodCredit,
    totalClosingDebit,
    totalClosingCredit,
    isBalanced,
  };
}
