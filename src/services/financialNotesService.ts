/**
 * Financial Notes Service — Thuyết Minh Báo Cáo Tài Chính (Mẫu B09-DN)
 * Theo Thông tư 200/2014/TT-BTC
 *
 * Tự động sinh các chỉ tiêu thuyết minh chính:
 * - I.   Đặc điểm hoạt động của doanh nghiệp
 * - II.  Chính sách kế toán áp dụng
 * - III. Thông tin bổ sung cho Bảng CĐKT (B01)
 * - IV.  Thông tin bổ sung cho Báo cáo KQKD (B02)
 * - V.   Thông tin bổ sung cho Báo cáo LCTT (B03)
 */

import { NormalizedTransaction } from '../types/accounting';
import { BalanceSheetReport } from './balanceSheetService';
import { IncomeStatementReport } from './financialReportService';
import { CashFlowStatementReport } from './cashFlowStatementService';

// ============================================================
// INTERFACES
// ============================================================

export interface FinancialNoteSection {
  sectionCode: string;     // VD: I, II, III, V.01, V.02
  title: string;
  content: string;         // Nội dung mô tả
  tableData?: FinancialNoteTableRow[];
  isEditable?: boolean;    // Cho phép kế toán sửa nội dung
}

export interface FinancialNoteTableRow {
  label: string;
  endOfPeriod: number;
  beginOfYear: number;
}

export interface FinancialNotesReport {
  companyName?: string;
  taxCode?: string;
  address?: string;
  periodLabel?: string;
  generatedAt: string;
  sections: FinancialNoteSection[];
}

// ============================================================
// HELPER: Tính số dư theo TK prefix
// ============================================================

function debitBalance(txs: NormalizedTransaction[], prefix: string): number {
  const d = txs.filter(t => t.debitAcc.startsWith(prefix)).reduce((s, t) => s + t.amount, 0);
  const c = txs.filter(t => t.creditAcc.startsWith(prefix)).reduce((s, t) => s + t.amount, 0);
  return d - c;
}

function creditBalance(txs: NormalizedTransaction[], prefix: string): number {
  const c = txs.filter(t => t.creditAcc.startsWith(prefix)).reduce((s, t) => s + t.amount, 0);
  const d = txs.filter(t => t.debitAcc.startsWith(prefix)).reduce((s, t) => s + t.amount, 0);
  return c - d;
}

// ============================================================
// MAIN ENGINE
// ============================================================

export function generateFinancialNotes(
  transactions: NormalizedTransaction[],
  balanceSheet?: BalanceSheetReport,
  incomeStatement?: IncomeStatementReport,
  cashFlowStatement?: CashFlowStatementReport,
  companyInfo?: {
    name?: string;
    taxCode?: string;
    address?: string;
    industry?: string;
    accountingFramework?: string;
    financialYear?: string;
  },
  periodLabel?: string,
): FinancialNotesReport {

  const fmt = (n: number) => n.toLocaleString('vi-VN');
  const framework = companyInfo?.accountingFramework || 'Thông tư 200/2014/TT-BTC';
  const now = new Date().toISOString();

  const sections: FinancialNoteSection[] = [];

  // ============================================================
  // I. ĐẶC ĐIỂM HOẠT ĐỘNG CỦA DOANH NGHIỆP
  // ============================================================
  sections.push({
    sectionCode: 'I',
    title: 'I. Đặc điểm hoạt động của doanh nghiệp',
    content: [
      `- Tên doanh nghiệp: ${companyInfo?.name || '(Chưa cập nhật)'}`,
      `- Mã số thuế: ${companyInfo?.taxCode || '(Chưa cập nhật)'}`,
      `- Địa chỉ: ${companyInfo?.address || '(Chưa cập nhật)'}`,
      `- Ngành nghề kinh doanh: ${companyInfo?.industry || 'Thương mại - Dịch vụ'}`,
      `- Hình thức sở hữu vốn: Tư nhân / Cổ phần`,
      `- Niên độ kế toán: ${companyInfo?.financialYear || 'Từ 01/01 đến 31/12'}`,
    ].join('\n'),
    isEditable: true,
  });

  // ============================================================
  // II. CHÍNH SÁCH KẾ TOÁN ÁP DỤNG
  // ============================================================
  sections.push({
    sectionCode: 'II',
    title: 'II. Chính sách kế toán áp dụng',
    content: [
      `- Chế độ kế toán áp dụng: ${framework}`,
      '- Đơn vị tiền tệ sử dụng trong kế toán: Việt Nam Đồng (VND)',
      '- Hình thức kế toán: Nhật ký chung',
      '- Phương pháp kế toán hàng tồn kho: Kê khai thường xuyên',
      '- Phương pháp tính giá hàng tồn kho xuất kho: Bình quân gia quyền cuối kỳ',
      '- Phương pháp khấu hao TSCĐ: Đường thẳng (Thông tư 45/2013/TT-BTC)',
      '- Phương pháp tính thuế GTGT: Khấu trừ',
      '- Kỳ kế toán: Theo năm dương lịch (01/01 - 31/12)',
    ].join('\n'),
    isEditable: true,
  });

  // ============================================================
  // III. THÔNG TIN BỔ SUNG CHO BẢNG CÂN ĐỐI KẾ TOÁN (B01)
  // ============================================================

  // III.1 Tiền và tương đương tiền
  const cash111 = debitBalance(transactions, '111');
  const cash112 = debitBalance(transactions, '112');

  sections.push({
    sectionCode: 'III.01',
    title: 'III.01. Tiền và các khoản tương đương tiền',
    content: `Chi tiết số dư tiền mặt và tiền gửi ngân hàng cuối kỳ.`,
    tableData: [
      { label: 'Tiền mặt (TK 111)', endOfPeriod: cash111, beginOfYear: 0 },
      { label: 'Tiền gửi Ngân hàng (TK 112)', endOfPeriod: cash112, beginOfYear: 0 },
      { label: 'Cộng', endOfPeriod: cash111 + cash112, beginOfYear: 0 },
    ],
  });

  // III.2 Phải thu khách hàng
  const receivable131 = debitBalance(transactions, '131');
  const prepaid141 = debitBalance(transactions, '141');

  sections.push({
    sectionCode: 'III.02',
    title: 'III.02. Các khoản phải thu',
    content: `Chi tiết các khoản phải thu ngắn hạn.`,
    tableData: [
      { label: 'Phải thu khách hàng (TK 131)', endOfPeriod: receivable131, beginOfYear: 0 },
      { label: 'Tạm ứng (TK 141)', endOfPeriod: prepaid141, beginOfYear: 0 },
      { label: 'Cộng', endOfPeriod: receivable131 + prepaid141, beginOfYear: 0 },
    ],
  });

  // III.3 Hàng tồn kho
  const inventory152 = debitBalance(transactions, '152');
  const inventory156 = debitBalance(transactions, '156');

  sections.push({
    sectionCode: 'III.03',
    title: 'III.03. Hàng tồn kho',
    content: `Chi tiết hàng tồn kho cuối kỳ.`,
    tableData: [
      { label: 'Nguyên liệu, vật liệu (TK 152)', endOfPeriod: inventory152, beginOfYear: 0 },
      { label: 'Hàng hóa (TK 156)', endOfPeriod: inventory156, beginOfYear: 0 },
      { label: 'Cộng', endOfPeriod: inventory152 + inventory156, beginOfYear: 0 },
    ],
  });

  // III.4 TSCĐ
  const fixedAssets211 = debitBalance(transactions, '211');
  const depreciation214 = creditBalance(transactions, '214');

  sections.push({
    sectionCode: 'III.04',
    title: 'III.04. Tài sản cố định hữu hình',
    content: `Chi tiết nguyên giá, hao mòn lũy kế và giá trị còn lại TSCĐ.`,
    tableData: [
      { label: 'Nguyên giá (TK 211)', endOfPeriod: fixedAssets211, beginOfYear: 0 },
      { label: 'Hao mòn lũy kế (TK 214)', endOfPeriod: -depreciation214, beginOfYear: 0 },
      { label: 'Giá trị còn lại', endOfPeriod: fixedAssets211 - depreciation214, beginOfYear: 0 },
    ],
  });

  // III.5 Phải trả
  const payable331 = creditBalance(transactions, '331');
  const taxPayable333 = creditBalance(transactions, '333');
  const employeePayable334 = creditBalance(transactions, '334');
  const insurancePayable338 = creditBalance(transactions, '338');

  sections.push({
    sectionCode: 'III.05',
    title: 'III.05. Các khoản phải trả',
    content: `Chi tiết các khoản nợ phải trả ngắn hạn.`,
    tableData: [
      { label: 'Phải trả người bán (TK 331)', endOfPeriod: payable331, beginOfYear: 0 },
      { label: 'Thuế phải nộp Nhà nước (TK 333)', endOfPeriod: taxPayable333, beginOfYear: 0 },
      { label: 'Phải trả người lao động (TK 334)', endOfPeriod: employeePayable334, beginOfYear: 0 },
      { label: 'BHXH, BHYT, BHTN phải nộp (TK 338)', endOfPeriod: insurancePayable338, beginOfYear: 0 },
      { label: 'Cộng', endOfPeriod: payable331 + taxPayable333 + employeePayable334 + insurancePayable338, beginOfYear: 0 },
    ],
  });

  // III.6 Vốn chủ sở hữu
  const capital411 = creditBalance(transactions, '411');
  const retained421 = creditBalance(transactions, '421');

  sections.push({
    sectionCode: 'III.06',
    title: 'III.06. Vốn chủ sở hữu',
    content: `Chi tiết vốn chủ sở hữu cuối kỳ.`,
    tableData: [
      { label: 'Vốn đầu tư của chủ sở hữu (TK 411)', endOfPeriod: capital411, beginOfYear: 0 },
      { label: 'Lợi nhuận sau thuế chưa phân phối (TK 421)', endOfPeriod: retained421, beginOfYear: 0 },
      { label: 'Cộng vốn chủ sở hữu', endOfPeriod: capital411 + retained421, beginOfYear: 0 },
    ],
  });

  // ============================================================
  // IV. THÔNG TIN BỔ SUNG CHO BÁO CÁO KQKD (B02)
  // ============================================================

  if (incomeStatement) {
    sections.push({
      sectionCode: 'IV',
      title: 'IV. Thông tin bổ sung cho Báo cáo Kết quả Kinh doanh',
      content: [
        `- Doanh thu thuần: ${fmt(incomeStatement.netRevenue)} VND`,
        `- Giá vốn hàng bán: ${fmt(incomeStatement.cogs)} VND`,
        `- Lợi nhuận gộp: ${fmt(incomeStatement.grossProfit)} VND`,
        `- Chi phí quản lý doanh nghiệp: ${fmt(incomeStatement.adminExpense)} VND`,
        `- Lợi nhuận trước thuế: ${fmt(incomeStatement.profitBeforeTax)} VND`,
        `- Chi phí thuế TNDN (20%): ${fmt(incomeStatement.citTaxExpense)} VND`,
        `- Lợi nhuận sau thuế: ${fmt(incomeStatement.profitAfterTax)} VND`,
      ].join('\n'),
    });
  }

  // ============================================================
  // V. THÔNG TIN BỔ SUNG CHO BÁO CÁO LCTT (B03)
  // ============================================================

  if (cashFlowStatement) {
    sections.push({
      sectionCode: 'V',
      title: 'V. Thông tin bổ sung cho Báo cáo Lưu chuyển Tiền tệ',
      content: [
        `- Lưu chuyển tiền từ HĐKD: ${fmt(cashFlowStatement.netCashFromOperating)} VND`,
        `- Lưu chuyển tiền từ HĐĐT: ${fmt(cashFlowStatement.netCashFromInvesting)} VND`,
        `- Lưu chuyển tiền từ HĐTC: ${fmt(cashFlowStatement.netCashFromFinancing)} VND`,
        `- Tiền đầu kỳ: ${fmt(cashFlowStatement.cashBeginning)} VND`,
        `- Tiền cuối kỳ: ${fmt(cashFlowStatement.cashEnding)} VND`,
        `- Đối chiếu tiền cuối kỳ với B01-DN: ${cashFlowStatement.isReconciled ? '✅ Khớp' : '⚠️ Lệch — cần kiểm tra lại'}`,
      ].join('\n'),
    });
  }

  // ============================================================
  // VI. THÔNG TIN KHÁC
  // ============================================================
  
  const totalTxCount = transactions.length;
  const uniquePartners = new Set(transactions.map(t => t.partnerTaxCode).filter(Boolean)).size;

  sections.push({
    sectionCode: 'VI',
    title: 'VI. Thông tin bổ sung khác',
    content: [
      `- Tổng số bút toán trong kỳ: ${totalTxCount.toLocaleString('vi-VN')}`,
      `- Số đối tác giao dịch: ${uniquePartners}`,
      `- Phần mềm kế toán: AccoDesk — Trợ Lý Kế Toán Desktop`,
      `- Ngày lập báo cáo: ${new Date().toLocaleDateString('vi-VN')}`,
    ].join('\n'),
    isEditable: true,
  });

  return {
    companyName: companyInfo?.name,
    taxCode: companyInfo?.taxCode,
    address: companyInfo?.address,
    periodLabel,
    generatedAt: now,
    sections,
  };
}
