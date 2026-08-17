import { 
  calculateTradeUnionContribution,
  calculateTradeUnionSummary,
  generateUnionVoucherHTML,
  generateSettlementB07HTML,
  generateCashBookHTML,
  generateBankBookHTML,
  syncContributionPeriodToTransactions,
  syncEventGiftToTransaction,
  computeSettlementReportB07
} from '../services/tradeUnionService';
import { TradeUnionTransaction, TradeUnionContributionPeriod, TradeUnionEventGiftList } from '../types/accounting';

function assert(condition: boolean, msg: string) {
  if (!condition) {
    console.error(`❌ [FAIL] ${msg}`);
    process.exit(1);
  }
  console.log(`  ✅ [PASS] ${msg}`);
}

console.log('🚀 BẮT ĐẦU KIỂM THỬ ỨNG DỤNG CÔNG ĐOÀN ĐỘC LẬP (apps/congdoan)...');

// Test 1: Tính toán KPCĐ & Đoàn phí
const calc = calculateTradeUnionContribution(100000000, 20, 5000000, 0.005, 0.75, 0.70);
assert(calc.kpcdTotal === 2000000, 'Test 1.1: Tính đúng 2% KPCĐ (100tr x 2% = 2,000,000 đ)');
assert(calc.kpcdRetained === 1500000, 'Test 1.2: Tính đúng 75% KPCĐ giữ lại CĐCS = 1,500,000 đ');
assert(calc.kpcdPaySuperior === 500000, 'Test 1.3: Tính đúng 25% KPCĐ nộp cấp trên = 500,000 đ');
assert(calc.doanPhiTotal === 500000, 'Test 1.4: Tính đúng 0.5% Đoàn phí của 20 người = 500,000 đ');
assert(calc.doanPhiRetained === 350000, 'Test 1.5: Tính đúng 70% Đoàn phí giữ lại CĐCS = 350,000 đ');
assert(calc.doanPhiPaySuperior === 150000, 'Test 1.6: Tính đúng 30% Đoàn phí nộp cấp trên = 150,000 đ');
assert(calc.totalUnionBudget === 1850000, 'Test 1.7: Tổng quỹ CĐCS được giữ lại = 1,500,000 + 350,000 = 1,850,000 đ');
assert(calc.totalPayableSuperior === 650000, 'Test 1.8: Tổng phải nộp cấp trên = 500,000 + 150,000 = 650,000 đ');

// Test 2: Đồng bộ Bảng trích nộp
const period: TradeUnionContributionPeriod = {
  periodKey: '012026',
  periodLabel: 'Tháng 01/2026',
  year: 2026,
  totalEmployees: 10,
  totalMembers: 10,
  totalInsuranceSalary: 57000000,
  totalKpcd: 1140000,
  totalKpcdRetained: 855000,
  totalKpcdSuperior: 285000,
  totalDoanPhi: 285000,
  totalDoanPhiRetained: 199500,
  totalDoanPhiSuperior: 85500,
  netPayableToSuperior: 370500,
  members: [],
};
const syncedTxs = syncContributionPeriodToTransactions(period, 'client-01');
assert(syncedTxs.length === 2, 'Test 2.1: Đồng bộ sinh đủ 2 chứng từ (Thu ĐP & UNC nộp cấp trên)');
assert(syncedTxs[0].amount === 199500, 'Test 2.2: Phiếu thu đoàn phí = 199,500 đ');
assert(syncedTxs[1].amount === 370500, 'Test 2.3: UNC nộp cấp trên = 370,500 đ');

// Test 3: Đồng bộ Quà Tết
const gift: TradeUnionEventGiftList = {
  eventKey: 'tet_2026',
  eventName: 'Tết Nguyên Đán 2026',
  year: 2026,
  giftPerPerson: 1000000,
  totalPersons: 20,
  totalAmount: 20000000,
  beneficiaries: [],
};
const giftTx = syncEventGiftToTransaction(gift, 'client-01');
assert(giftTx.voucherType === 'UNION_PAYMENT', 'Test 3.1: Sinh Phiếu Chi quà');
assert(giftTx.amount === 20000000, 'Test 3.2: Số tiền quà khớp 20,000,000 đ');

// Test 4: Tổng hợp Quyết toán B07
const allTxs: TradeUnionTransaction[] = [
  ...syncedTxs,
  giftTx,
  {
    id: 'tx-1',
    clientId: 'client-01',
    voucherType: 'UNION_RECEIPT',
    voucherNo: 'PT01',
    date: '2026-01-15',
    category: 'KPCĐ_2_PERCENT',
    personName: 'DN đóng',
    reason: 'KPCĐ 2%',
    amount: 10000000,
    paymentMethod: 'BANK',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
];
const b07 = computeSettlementReportB07(allTxs, null, 2026);
assert(b07.items.length === 14, 'Test 4.1: Báo cáo B07 có đủ 14 chỉ tiêu mục lục');
assert(b07.items.find(i => i.code === 20)?.settledAmount === 10199500, 'Test 4.2: Tổng thu Mã 20 khớp chính xác');

// Test 5: Sinh mẫu in HTML
const htmlVoucher = generateUnionVoucherHTML(allTxs[0], null);
assert(htmlVoucher.includes('PHIẾU THU') && htmlVoucher.includes('C40-BB'), 'Test 5.1: HTML Phiếu Thu có tiêu đề chuẩn C40-BB');
const htmlB07 = generateSettlementB07HTML(b07, null);
assert(htmlB07.includes('B07-TLĐ'), 'Test 5.2: HTML Quyết toán B07 có mã biểu mẫu B07-TLĐ');
const htmlCash = generateCashBookHTML(allTxs, null, 2026);
assert(htmlCash.includes('S11H'), 'Test 5.3: HTML Sổ Quỹ TM có mẫu S11H');
const htmlBank = generateBankBookHTML(allTxs, null, 2026);
assert(htmlBank.includes('S12-H'), 'Test 5.4: HTML Sổ NH có mẫu S12-H');

// Test 6: Báo Cáo Tháng (Nghỉ thai sản / Đi làm), Báo Cáo Quý & Bảng Tổng Hợp Năm TC
import { 
  recalculateMemberContribution, 
  recalculateContributionPeriod,
  generateQuarterlyContributionPeriod,
  generateYearSummaryTC,
  generateContributionReportHTML,
  generateYearSummaryTCHTML
} from '../services/tradeUnionService';

// Test 6.1: Nhân viên đi làm bình thường
const activeMem = recalculateMemberContribution({
  fullName: 'Trần Minh Thắng',
  insuranceSalary: 5700000,
  status: 'ACTIVE'
});
assert(activeMem.kpcdRetainedAmount === 85500, 'Test 6.1: KPCĐ giữ 75% của 5.7tr = 85,500 đ');
assert(activeMem.kpcdSuperiorAmount === 28500, 'Test 6.2: KPCĐ nộp 25% của 5.7tr = 28,500 đ');
assert(activeMem.doanPhiRetainedAmount === 19950, 'Test 6.3: Đoàn phí giữ 70% (0.5%) = 19,950 đ');
assert(activeMem.doanPhiSuperiorAmount === 8550, 'Test 6.4: Đoàn phí nộp 30% (0.5%) = 8,550 đ');
assert(activeMem.totalAmount === 142500, 'Test 6.5: Tổng trích nộp = 142,500 đ (2.5% của 5.7tr)');

// Test 6.2: Nhân viên nghỉ thai sản
const matMem = recalculateMemberContribution({
  fullName: 'Sử Ngọc Quế',
  insuranceSalary: 5700000,
  status: 'MATERNITY'
});
assert(matMem.insuranceSalary === 0 && matMem.totalAmount === 0, 'Test 6.6: Nghỉ thai sản chuyển lương về 0 và mức trích = 0 đ');
assert(matMem.notes === 'Nghỉ thai sản', 'Test 6.7: Tự động điền ghi chú "Nghỉ thai sản"');

// Test 6.3: Tính toán bảng tháng có nhân viên thai sản
const month6Period = recalculateContributionPeriod({
  periodKey: '062026',
  periodLabel: 'Tháng 06/2026',
  year: 2026,
  month: 6,
  members: [activeMem, matMem],
});
assert(month6Period.totalInsuranceSalary === 5700000, 'Test 6.8: Quỹ lương tháng 6 khớp 5,700,000 đ');
assert(month6Period.totalEmployees === 2 && month6Period.totalMembers === 1, 'Test 6.9: Số lao động = 2, số đoàn viên đóng = 1');

// Test 6.4: Tự động gom Quý 1
const month1 = recalculateContributionPeriod({ periodKey: '012026', periodLabel: 'Tháng 01/2026', year: 2026, month: 1, members: [activeMem] });
const month2 = recalculateContributionPeriod({ periodKey: '022026', periodLabel: 'Tháng 02/2026', year: 2026, month: 2, members: [activeMem] });
const month3 = recalculateContributionPeriod({ periodKey: '032026', periodLabel: 'Tháng 03/2026', year: 2026, month: 3, members: [activeMem] });
const q1 = generateQuarterlyContributionPeriod(1, 2026, [month1, month2, month3]);
assert(q1.totalInsuranceSalary === 17100000, 'Test 6.10: Quý 1 quỹ lương lũy kế 3 tháng = 17,100,000 đ');
assert(q1.members[0].totalAmount === 427500, 'Test 6.11: Tổng trích nộp quý 1 của 1 người = 427,500 đ (142.5k x 3)');

// Test 6.5: Bảng Tổng Hợp Năm (Sheet TC)
const yearTC = generateYearSummaryTC(2026, [month1, month2, month3, month6Period]);
assert(yearTC.monthlyRows.length === 12, 'Test 6.12: Bảng TC có đủ 12 dòng tháng');
assert(yearTC.totalInsuranceSalaryFund === 22800000, 'Test 6.13: Tổng quỹ lương năm khớp 22,800,000 đ');

// Test 6.6: HTML Report Month & TC
const htmlMonth = generateContributionReportHTML(month6Period);
assert(htmlMonth.includes('THÁNG 06/2026') && htmlMonth.includes('Tổng 2% KPCĐ'), 'Test 6.14: HTML Báo cáo tháng có đủ tiêu đề và dòng đỏ');
const htmlTC = generateYearSummaryTCHTML(yearTC);
assert(htmlTC.includes('BẢNG TÍNH KINH PHÍ, ĐOÀN PHÍ CÔNG ĐOÀN NĂM 2026'), 'Test 6.15: HTML Sheet TC có đúng tiêu đề biểu mẫu chuẩn');

console.log('\n🎉 TẤT CẢ 30/30 BÀI TEST CỦA ỨNG DỤNG CÔNG ĐOÀN ĐỘC LẬP ĐÃ VƯỢT QUA 100%!');

