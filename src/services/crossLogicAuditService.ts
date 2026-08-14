import { NormalizedTransaction, ReconciliationPair } from '../types/accounting';
import { calculateTrialBalancePivot, calculateIncomeStatement, calculateAssetDepreciationReport } from './financialReportService';
import { calculateInventoryCardReport, calculateCashAndBankLedger, calculatePartnerDebtReport } from './accountingCoreService';

export interface CrossLogicIssue {
  id: string;
  title: string;
  moduleA: string; // VD: "Sổ Cái P&L (TK 511)"
  moduleB: string; // VD: "Tờ Khai Thuế GTGT [28]"
  varianceAmount: number;
  severity: 'CRITICAL' | 'WARNING' | 'INFO';
  description: string;
  recommendation: string;
}

export interface CrossLogicAuditSummary {
  totalIssuesCount: number;
  criticalCount: number;
  warningCount: number;
  issues: CrossLogicIssue[];
  auditTimestamp: string;
}

export const auditCrossLogicConsistency = (
  transactions: NormalizedTransaction[],
  reconciliations: ReconciliationPair[] = []
): CrossLogicAuditSummary => {
  const issues: CrossLogicIssue[] = [];

  // 1. Kiểm tra Lệch Doanh Thu P&L (TK 511) vs Tờ Khai Thuế GTGT
  const incomeStmt = calculateIncomeStatement(transactions);
  const vatRevenue = transactions
    .filter(t => t.type === 'INCOME' || t.creditAcc?.startsWith('511'))
    .reduce((sum, t) => sum + t.amount, 0);

  const revDiff = Math.abs(incomeStmt.grossRevenue - vatRevenue);
  if (revDiff > 1000) {
    issues.push({
      id: 'cross_1_revenue',
      title: 'Chênh lệch Doanh Thu P&L (TK 511) so với Tổng Doanh Thu Bảng Kê Thuế GTGT',
      moduleA: `Doanh thu B02-DN: ${incomeStmt.grossRevenue.toLocaleString()} VNĐ`,
      moduleB: `Doanh thu Bảng Kê Thuế: ${vatRevenue.toLocaleString()} VNĐ`,
      varianceAmount: revDiff,
      severity: 'CRITICAL',
      description: `Phát hiện chênh lệch ${revDiff.toLocaleString()} VNĐ giữa Doanh thu hạch toán P&L và Doanh thu trên bảng kê hóa đơn bán ra.`,
      recommendation: 'Kiểm tra các hóa đơn bán ra chưa hạch toán vào tài khoản 511 hoặc các khoản giảm trừ doanh thu (521).',
    });
  }

  // 2. Kiểm tra Lệch Giá Vốn (TK 632) vs Nhập - Xuất - Tồn Kho
  const cogsLedger = incomeStmt.cogs;
  const inventoryReport = calculateInventoryCardReport(transactions);
  const cogsInventory = inventoryReport.reduce((sum, item) => sum + item.totalExportAmount, 0);

  const cogsDiff = Math.abs(cogsLedger - cogsInventory);
  if (cogsDiff > 1000) {
    issues.push({
      id: 'cross_2_cogs',
      title: 'Chênh lệch Giá Vốn Hàng Bán (TK 632) so với Tổng Giá Trị Xuất Kho',
      moduleA: `Giá vốn Sổ Cái 632: ${cogsLedger.toLocaleString()} VNĐ`,
      moduleB: `Tổng xuất Bảng Nhập Xuất Tồn: ${cogsInventory.toLocaleString()} VNĐ`,
      varianceAmount: cogsDiff,
      severity: 'CRITICAL',
      description: `Phát hiện chênh lệch ${cogsDiff.toLocaleString()} VNĐ giữa Nợ TK 632 trên Sổ Cái và Giá trị xuất kho trên Thẻ Kho.`,
      recommendation: 'Rà soát các phiếu xuất kho chưa hạch toán bút toán Nợ 632 / Có 156, 155.',
    });
  }

  // 3. Kiểm tra Lệch Khấu Hao (TK 214/242) P&L vs Bảng Tính Khấu Hao TSCĐ
  const assetsReport = calculateAssetDepreciationReport(transactions);
  const expectedMonthlyDep = assetsReport.reduce((sum, item) => sum + item.monthlyAmount, 0);
  const actualDepTx = transactions
    .filter(t => t.creditAcc?.startsWith('214') || t.creditAcc?.startsWith('242'))
    .reduce((sum, t) => sum + t.amount, 0);

  const depDiff = Math.abs(expectedMonthlyDep - actualDepTx);
  if (depDiff > 1000 && expectedMonthlyDep > 0) {
    issues.push({
      id: 'cross_3_depreciation',
      title: 'Chênh lệch Chi Phí Khấu Hao (214/242) hạch toán so với Bảng Tính Khấu Hao TSCĐ',
      moduleA: `Khấu hao Bảng Tính: ${expectedMonthlyDep.toLocaleString()} VNĐ`,
      moduleB: `Khấu hao Đã Hạch Toán: ${actualDepTx.toLocaleString()} VNĐ`,
      varianceAmount: depDiff,
      severity: 'WARNING',
      description: `Chi phí trích khấu hao thực tế trong kỳ lệch ${depDiff.toLocaleString()} VNĐ so với mức tính toán trên Bảng Khấu hao TSCĐ.`,
      recommendation: 'Chạy lại tính năng tự động trích khấu hao hàng tháng để bù bút toán chênh lệch.',
    });
  }

  // 4. Kiểm tra Lệch Số Dư Tiền Gửi Ngân Hàng (112) vs Sổ Phụ Ngân Hàng
  const cashBank = calculateCashAndBankLedger(transactions);
  const pendingReconciliationCount = reconciliations.filter(r => r.status !== 'APPROVED').length;

  if (pendingReconciliationCount > 0) {
    issues.push({
      id: 'cross_4_bank',
      title: 'Chênh lệch Tiền Gửi Ngân Hàng (TK 112) giữa Sổ Tiền Gửi và Sổ Phụ Ngân Hàng',
      moduleA: `Dư Sổ Tiền Gửi 112: ${cashBank.bankBalance.toLocaleString()} VNĐ`,
      moduleB: `Số giao dịch chưa duyệt đối chiếu: ${pendingReconciliationCount} dòng`,
      varianceAmount: pendingReconciliationCount,
      severity: 'WARNING',
      description: `Còn tổng cộng ${pendingReconciliationCount} giao dịch tiền gửi chưa được ghép khớp đối chiếu với Sổ Phụ.`,
      recommendation: 'Mở workspace So Sánh & Đối Chiếu Ngân Hàng để tự động ghép dòng tiền còn tồn lại.',
    });
  }

  // 5. Kiểm tra Lệch Công Nợ (TK 131/331) Sổ Cái vs Bảng Tổng Hợp Công Nợ Đối Tác
  const partnerDebt = calculatePartnerDebtReport(transactions);
  const totalPartnerDebt = partnerDebt.reduce((sum, p) => sum + p.closingDebt, 0);
  const tbPivot = calculateTrialBalancePivot(transactions);
  const item131 = tbPivot.find(p => p.accountCode === '131');
  const tbDebt131 = item131 ? item131.closingDebit - item131.closingCredit : 0;

  const debtDiff = Math.abs(totalPartnerDebt - tbDebt131);
  if (debtDiff > 1000 && tbDebt131 > 0) {
    issues.push({
      id: 'cross_5_debt',
      title: 'Chênh lệch Công Nợ (TK 131) giữa Sổ Cái và Bảng Tổng Hợp Công Nợ Theo Đối Tác',
      moduleA: `Dư TK 131 Bảng Cân Đối: ${tbDebt131.toLocaleString()} VNĐ`,
      moduleB: `Tổng Nợ Bảng Đối Tác: ${totalPartnerDebt.toLocaleString()} VNĐ`,
      varianceAmount: debtDiff,
      severity: 'CRITICAL',
      description: `Tổng số dư công nợ chi tiết theo đối tác lệch ${debtDiff.toLocaleString()} VNĐ so với số dư tài khoản 131 trên Sổ Cái.`,
      recommendation: 'Rà soát lại các chứng từ hạch toán Nợ/Có TK 131 bị bỏ trống mã đối tác.',
    });
  }

  const criticalCount = issues.filter(i => i.severity === 'CRITICAL').length;
  const warningCount = issues.filter(i => i.severity === 'WARNING').length;

  return {
    totalIssuesCount: issues.length,
    criticalCount,
    warningCount,
    issues,
    auditTimestamp: new Date().toLocaleString('vi-VN'),
  };
};
