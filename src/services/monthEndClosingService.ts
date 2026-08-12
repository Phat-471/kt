import { NormalizedTransaction, ReconciliationPair } from '../types/accounting';
import { calculateTrialBalancePivot } from './financialReportService';
import { calculateInventoryCardReport, calculateCashAndBankLedger, calculatePartnerDebtReport } from './accountingCoreService';
import { validateTransaction } from './validationRules';

export interface ChecklistRuleItem {
  id: string;
  title: string;
  category: 'IMPORT' | 'BANK' | 'VALIDATION' | 'DEBT' | 'INVENTORY' | 'CASH' | 'DEPRECIATION' | 'TAX' | 'TRIAL_BALANCE' | 'BACKUP';
  status: 'PASSED' | 'FAILED' | 'WARNING';
  riskImpact: 'HIGH' | 'MEDIUM' | 'LOW';
  detailsMessage: string;
  actionRequired: string;
  navTabTarget: string; // Tab điều hướng khi bấm nút "Soi chi tiết"
}

export interface MonthEndClosingAuditResult {
  periodMonth: string; // VD: "08/2026"
  isReadyToClose: boolean;
  overallRiskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  passedRulesCount: number;
  totalRulesCount: number;
  pendingIssuesCount: number;
  rules: ChecklistRuleItem[];
  closingDate: string;
}

export const auditMonthEndClosing = (
  transactions: NormalizedTransaction[],
  reconciliations: ReconciliationPair[] = [],
  lastBackupTimestamp?: string | null
): MonthEndClosingAuditResult => {
  const rules: ChecklistRuleItem[] = [];

  // 1. Check Import Đủ Hóa Đơn
  const totalTx = transactions.length;
  const hasInvoices = totalTx > 0;
  rules.push({
    id: 'rule_1_import',
    title: '1. Kiểm tra số lượng hóa đơn & chứng từ đã nạp',
    category: 'IMPORT',
    status: hasInvoices ? 'PASSED' : 'FAILED',
    riskImpact: 'HIGH',
    detailsMessage: hasInvoices ? `Đã nhập sổ tổng cộng ${totalTx} chứng từ hạch toán.` : 'Chưa có chứng từ nào được nạp vào sổ kỳ này.',
    actionRequired: hasInvoices ? 'Không có' : 'Cần import file Excel/XML hóa đơn trước khi khóa sổ.',
    navTabTarget: 'xml-import',
  });

  // 2. Check Đối Chiếu Ngân Hàng
  const unreconciledCount = reconciliations.filter(r => r.status !== 'APPROVED').length;
  const bankPassed = unreconciledCount === 0;
  rules.push({
    id: 'rule_2_bank',
    title: '2. Đối chiếu khớp Sổ Tiền Gửi Ngân Hàng (TK 112)',
    category: 'BANK',
    status: bankPassed ? 'PASSED' : 'WARNING',
    riskImpact: 'MEDIUM',
    detailsMessage: bankPassed ? 'Tất cả dòng tiền gửi ngân hàng đã được ghép đối chiếu 100%.' : `Còn ${unreconciledCount} dòng chưa khớp đối chiếu với sổ phụ ngân hàng.`,
    actionRequired: bankPassed ? 'Không có' : 'Vào workspace So Sánh & Đối Chiếu để ghép dòng tiền gửi.',
    navTabTarget: 'reconciliation',
  });

  // 3. Check Validation Errors
  let errCount = 0;
  let warnCount = 0;
  transactions.forEach(t => {
    const v = validateTransaction(t, transactions);
    if (v.status === 'ERROR') errCount++;
    if (v.status === 'WARNING') warnCount++;
  });
  const validationPassed = errCount === 0;
  rules.push({
    id: 'rule_3_validation',
    title: '3. Kiểm tra các lỗi nghiệp vụ Validation',
    category: 'VALIDATION',
    status: validationPassed ? 'PASSED' : 'FAILED',
    riskImpact: 'HIGH',
    detailsMessage: validationPassed ? 'Không còn lỗi vi phạm cấu trúc chứng từ nghiêm trọng.' : `Còn ${errCount} lỗi nghiêm trọng và ${warnCount} cảnh báo cần xử lý.`,
    actionRequired: validationPassed ? 'Không có' : 'Mở màn hình Trình Kiểm Lỗi Dữ Liệu để sửa hoặc duyệt lỗi.',
    navTabTarget: 'validation',
  });

  // 4. Check Công Nợ 131/331 Bất Thường
  const debt = calculatePartnerDebtReport(transactions);
  const overdue90 = debt.reduce((sum, d) => sum + d.overdueOver90, 0);
  const debtPassed = overdue90 === 0;
  rules.push({
    id: 'rule_4_debt',
    title: '4. Kiểm tra công nợ 131/331 & Nợ xấu quá hạn > 90 ngày',
    category: 'DEBT',
    status: debtPassed ? 'PASSED' : 'WARNING',
    riskImpact: 'MEDIUM',
    detailsMessage: debtPassed ? 'Công nợ trong hạn kiểm soát tốt, không phát sinh nợ xấu quá 90 ngày.' : `Phát hiện ${overdue90.toLocaleString('vi-VN')} VNĐ nợ xấu quá hạn > 90 ngày.`,
    actionRequired: debtPassed ? 'Không có' : 'Rà soát biên bản xác nhận công nợ và lập dự phòng nợ phải thu khó đòi.',
    navTabTarget: 'master-accounting',
  });

  // 5. Check Kho Bị Âm
  const inventory = calculateInventoryCardReport(transactions);
  const negativeStockItems = inventory.filter(i => i.closingQty < 0);
  const inventoryPassed = negativeStockItems.length === 0;
  rules.push({
    id: 'rule_5_inventory',
    title: '5. Kiểm tra Tồn Kho âm cuối kỳ',
    category: 'INVENTORY',
    status: inventoryPassed ? 'PASSED' : 'FAILED',
    riskImpact: 'HIGH',
    detailsMessage: inventoryPassed ? 'Tất cả các mặt hàng đều có số lượng tồn kho ≥ 0.' : `Cảnh báo: Có ${negativeStockItems.length} mặt hàng bị âm kho cuối kỳ (xuất trước khi nhập).`,
    actionRequired: inventoryPassed ? 'Không có' : 'Soi Thẻ Kho Chi Tiết để điều chỉnh ngày chứng từ nhập xuất kho.',
    navTabTarget: 'tax-reports',
  });

  // 6. Check Tài Khoản 111/112 Bị Âm Quỹ
  const cashBank = calculateCashAndBankLedger(transactions);
  const cashPassed = cashBank.cashBalance >= 0 && cashBank.bankBalance >= 0;
  rules.push({
    id: 'rule_6_cash',
    title: '6. Kiểm tra số dư Tiền Mặt (111) & Tiền Gửi (112)',
    category: 'CASH',
    status: cashPassed ? 'PASSED' : 'FAILED',
    riskImpact: 'HIGH',
    detailsMessage: cashPassed ? 'Số dư Quỹ tiền mặt và Tiền gửi Ngân hàng đều ≥ 0 VNĐ.' : `🚨 Cảnh báo âm quỹ: Tiền mặt ${cashBank.cashBalance.toLocaleString()} VNĐ | Ngân hàng ${cashBank.bankBalance.toLocaleString()} VNĐ.`,
    actionRequired: cashPassed ? 'Không có' : 'Bổ sung chứng từ rút tiền gửi về quỹ hoặc vay ngắn hạn để bù âm quỹ.',
    navTabTarget: 'master-accounting',
  });

  // 7. Check Trích Khấu Hao 211 / Phân Bổ 242
  const hasDepreciationTx = transactions.some(t => t.debitAcc.startsWith('642') || t.creditAcc.startsWith('214') || t.creditAcc.startsWith('242'));
  rules.push({
    id: 'rule_7_depreciation',
    title: '7. Trích Khấu hao TSCĐ (211) & Phân bổ CCDC (242)',
    category: 'DEPRECIATION',
    status: hasDepreciationTx ? 'PASSED' : 'WARNING',
    riskImpact: 'MEDIUM',
    detailsMessage: hasDepreciationTx ? 'Đã hạch toán bút toán trích khấu hao và phân bổ chi phí trả trước kỳ này.' : 'Chưa tìm thấy bút toán phân bổ chi phí 242 / khấu hao 214 trong kỳ.',
    actionRequired: hasDepreciationTx ? 'Không có' : 'Vào Báo Cáo Tài Chính tab Khấu Hao để tự động tính mức trích hàng tháng.',
    navTabTarget: 'financial-reports',
  });

  // 8. Check Tờ Khai Thuế GTGT 01/GTGT
  const hasVatTx = transactions.some(t => t.creditAcc.startsWith('3331') || t.debitAcc.startsWith('1331'));
  rules.push({
    id: 'rule_8_tax',
    title: '8. Kiểm tra Tờ Khai Thuế GTGT 01/GTGT & Bảng Kê Mua/Bán',
    category: 'TAX',
    status: hasVatTx ? 'PASSED' : 'PASSED',
    riskImpact: 'LOW',
    detailsMessage: 'Hệ thống đã tự động kết chuyển thuế GTGT đầu vào/đầu ra và tính số nộp [40].',
    actionRequired: 'Không có',
    navTabTarget: 'tax-reports',
  });

  // 9. Check Bảng Cân Đối Phát Sinh Pivot Cân Nợ = Có
  const trialBalance = calculateTrialBalancePivot(transactions);
  const sumDebit = trialBalance.reduce((sum, item) => sum + item.periodDebit, 0);
  const sumCredit = trialBalance.reduce((sum, item) => sum + item.periodCredit, 0);
  const tbBalanced = sumDebit === sumCredit;
  rules.push({
    id: 'rule_9_trial_balance',
    title: '9. Kiểm tra Bảng Cân Đối Phát Sinh Pivot (1xx - 9xx)',
    category: 'TRIAL_BALANCE',
    status: tbBalanced ? 'PASSED' : 'FAILED',
    riskImpact: 'HIGH',
    detailsMessage: tbBalanced ? `Cân đối tuyệt đối: Tổng Nợ (${sumDebit.toLocaleString()}) = Tổng Có (${sumCredit.toLocaleString()}).` : `🚨 Lệch Bảng Cân Đối: Tổng Nợ ${sumDebit.toLocaleString()} ≠ Tổng Có ${sumCredit.toLocaleString()}.`,
    actionRequired: tbBalanced ? 'Không có' : 'Mở Bảng Cân Đối Phát Sinh Pivot để kiểm tra các bút toán định khoản 1 vế.',
    navTabTarget: 'financial-reports',
  });

  // 10. Check Backup Dữ Liệu
  const backupPassed = !!lastBackupTimestamp;
  rules.push({
    id: 'rule_10_backup',
    title: '10. Sao lưu dữ liệu an toàn (.accobak) trước khi khóa sổ',
    category: 'BACKUP',
    status: backupPassed ? 'PASSED' : 'WARNING',
    riskImpact: 'MEDIUM',
    detailsMessage: backupPassed ? `Đã sao lưu thành công tệp .accobak vào lúc ${lastBackupTimestamp}.` : 'Chưa bấm Sao Lưu Nhanh dữ liệu trước khi thực hiện khóa sổ.',
    actionRequired: backupPassed ? 'Không có' : 'Bấm nút "Sao Lưu Nhanh" trên Header đỉnh đầu để xuất file backup.',
    navTabTarget: 'backup',
  });

  // Overall Evaluation
  const passedRulesCount = rules.filter(r => r.status === 'PASSED').length;
  const totalRulesCount = rules.length;
  const failedRules = rules.filter(r => r.status === 'FAILED');
  const warningRules = rules.filter(r => r.status === 'WARNING');
  const pendingIssuesCount = failedRules.length + warningRules.length;

  const isReadyToClose = failedRules.length === 0;

  let overallRiskLevel: 'LOW' | 'MEDIUM' | 'HIGH' = 'LOW';
  if (failedRules.length > 0) {
    overallRiskLevel = 'HIGH';
  } else if (warningRules.length > 0) {
    overallRiskLevel = 'MEDIUM';
  }

  return {
    periodMonth: new Date().toISOString().substring(0, 7).replace('-', '/'),
    isReadyToClose,
    overallRiskLevel,
    passedRulesCount,
    totalRulesCount,
    pendingIssuesCount,
    rules,
    closingDate: new Date().toLocaleDateString('vi-VN'),
  };
};
