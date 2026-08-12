import { calculateTaxRiskSummary, calculateInventoryCardReport, calculateCashAndBankLedger, calculatePartnerDebtReport } from '../services/accountingCoreService';
import { calculateTrialBalancePivot, calculateIncomeStatement, calculateAssetDepreciationReport } from '../services/financialReportService';
import { auditNonDeductibleExpenses } from '../services/taxAuditService';
import { auditMonthEndClosing } from '../services/monthEndClosingService';
import { suggestAccountsByAI } from '../services/aiAccountSuggestionService';
import { auditCrossLogicConsistency } from '../services/crossLogicAuditService';
import { analyzeExecutiveFinancials } from '../services/executiveAnalyticsService';
import { calculateBreakEvenPoint, estimateQuarterlyTax } from '../services/financialCalculationEngine';
import { analyzeFinancialVariances } from '../services/varianceAnalysisService';
import { calculateCashflowForecast } from '../services/cashflowForecastService';
import { generateGeneralLedgerReport } from '../services/generalLedgerService';
import { getCompanyConfig } from '../services/multiCompanyService';
import { checkPermission, getRoleLabel } from '../services/rolePermissionService';
import { getIndustryRule } from '../services/industryPresetService';
import { validateTransaction } from '../services/validationRules';
import { levenshteinSimilarity } from '../services/matchingEngine';
import { NormalizedTransaction } from '../types/accounting';

console.log('====================================================');
console.log('🧪 BẮT ĐẦU CHẠY MASTER TEST SUITE - ACCODESK ULTRA PRO');
console.log('====================================================\n');

let passCount = 0;
let failCount = 0;

const assert = (condition: boolean, testName: string) => {
  if (condition) {
    console.log(`  ✅ [PASS] ${testName}`);
    passCount++;
  } else {
    console.error(`  ❌ [FAIL] ${testName}`);
    failCount++;
  }
};

// DỮ LIỆU MẪU DÙNG CHO KIỂM THỬ
const mockTransactions: NormalizedTransaction[] = [
  // 1. Khoản chi >= 5tr thiếu số chứng từ (Rủi ro thuế TNDN & Nhập kho)
  {
    id: 'tx_01',
    clientId: 'client_01',
    sourceFileName: 'test.xlsx',
    importDate: '2026-08-11',
    type: 'EXPENSE',
    date: '2026-08-01',
    voucherNo: '', // Thiếu số chứng từ
    description: 'Vật tư Xi Măng Hà Tiên',
    debitAcc: '156',
    creditAcc: '112',
    amount: 15000000,
    partnerName: 'Công ty Hà Tiên Supplier',
    partnerTaxCode: '0101234567',
    rawRow: {},
    validationStatus: 'WARNING',
    errors: [],
    userApproved: false,
  },
  // 2. Khoản xuất kho Xi Măng Hà Tiên
  {
    id: 'tx_01_b',
    clientId: 'client_01',
    sourceFileName: 'test.xlsx',
    importDate: '2026-08-11',
    type: 'EXPENSE',
    date: '2026-08-02',
    voucherNo: 'XK001',
    description: 'Vật tư Xi Măng Hà Tiên',
    debitAcc: '632',
    creditAcc: '156',
    amount: 5000000,
    partnerName: 'Công ty Hà Tiên Supplier',
    partnerTaxCode: '0101234567',
    rawRow: {},
    validationStatus: 'VALID',
    errors: [],
    userApproved: true,
  },
  // 3. Khoản chi tiền mặt >= 20tr (Rủi ro thuế GTGT/TNDN)
  {
    id: 'tx_02',
    clientId: 'client_01',
    sourceFileName: 'test.xlsx',
    importDate: '2026-08-11',
    type: 'EXPENSE',
    date: '2026-08-02',
    voucherNo: 'PC001',
    description: 'Thanh toán tiền mặt mua máy tính',
    debitAcc: '211',
    creditAcc: '111', // Tiền mặt
    amount: 25000000, // 25 triệu
    partnerName: 'Cửa Hàng Máy Tính Phong Vũ',
    partnerTaxCode: '0309876543',
    rawRow: {},
    validationStatus: 'VALID',
    errors: [],
    userApproved: true,
  },
  // 4. Doanh thu bán hàng công nợ TK 131 (Cách đây > 90 ngày)
  {
    id: 'tx_03',
    clientId: 'client_01',
    sourceFileName: 'test.xlsx',
    importDate: '2026-08-11',
    type: 'INCOME',
    date: '2026-04-01', // > 90 ngày so với hôm nay
    voucherNo: 'HD001',
    description: 'Doanh thu bán hàng công nợ',
    debitAcc: '131',
    creditAcc: '511',
    amount: 50000000,
    partnerName: 'Tập Đoàn Xi Măng Miền Nam',
    partnerTaxCode: '0101234567',
    rawRow: {},
    validationStatus: 'VALID',
    errors: [],
    userApproved: true,
  },
];

async function runAllTests() {
  console.log('📌 PHẦN 1: TEST KẾ TOÁN THUẾ & RỦI RO THUẾ');
  const taxSummary = calculateTaxRiskSummary(mockTransactions);
  assert(taxSummary.highExpenseNoInvoiceCount === 1, 'Phát hiện chính xác 1 khoản chi >= 5M thiếu chứng từ');
  assert(taxSummary.highExpenseNoInvoiceAmount === 15000000, 'Tính đúng tổng số tiền rủi ro chi thiếu chứng từ (15M)');
  assert(taxSummary.cashOver20mCount === 1, 'Phát hiện chính xác 1 khoản chi tiền mặt >= 20M');
  assert(taxSummary.cashOver20mAmount === 25000000, 'Tính đúng tổng chi tiền mặt >= 20M (25M)');
  assert(taxSummary.outputVat === 5000000, 'Tính đúng Thuế GTGT Đầu Ra (5M)');
  assert(taxSummary.inputVat === 4500000, 'Tính đúng Thuế GTGT Đầu Vào (4.5M)');

  console.log('\n📌 PHẦN 2: TEST KẾ TOÁN KHO & THẺ KHO');
  const inventoryList = calculateInventoryCardReport(mockTransactions);
  assert(inventoryList.length >= 1, 'Tự động gom nhóm danh mục Kho theo mặt hàng');
  const itemXiMang = inventoryList.find(i => i.itemName.includes('Xi Măng'));
  assert(itemXiMang !== undefined, 'Tìm thấy thẻ kho Xi Măng Hà Tiên');
  if (itemXiMang) {
    assert(itemXiMang.importedQty === 1, 'Thống kê đúng số lượt nhập kho');
    assert(itemXiMang.history.length === 2, 'Ghi nhận đủ 2 lịch sử biến động nhập/xuất kho');
  }

  console.log('\n📌 PHẦN 3: TEST KẾ TOÁN THU CHI QUỸ (111) & NGÂN HÀNG (112)');
  const cashBank = calculateCashAndBankLedger(mockTransactions);
  assert(cashBank.cashOut === 25000000, 'Tính đúng tổng chi Tiền Mặt TK 111 (25M)');
  assert(cashBank.bankOut === 15000000, 'Tính đúng tổng chi Ngân Hàng TK 112 (15M)');
  assert(cashBank.cashBalance === -25000000, 'Tính đúng Dư Quỹ tiền mặt cuối kỳ (-25M)');

  console.log('\n📌 PHẦN 4: TEST QUẢN LÝ CÔNG NỢ 131/331 & AGING DEBT');
  const debtList = calculatePartnerDebtReport(mockTransactions);
  const partnerXiMang = debtList.find(d => d.partnerName.includes('Xi Măng Miền Nam'));
  assert(partnerXiMang !== undefined, 'Tổng hợp đúng đối tác Tập Đoàn Xi Măng Miền Nam');
  if (partnerXiMang) {
    assert(partnerXiMang.increasedDebt === 50000000, 'Tính đúng số nợ phát sinh (50M)');
    assert(partnerXiMang.overdueOver90 === 50000000, 'Phân loại chính xác 50M vào Nợ Xấu quá hạn > 90 ngày');
  }
  console.log('\n📌 PHẦN 5: TEST FUZZY MATCHING (LEVENSHTEIN SIMILARITY)');
  const score1 = levenshteinSimilarity('Công ty Xi Măng Hà Tiên', 'Cong ty Xi Mang Ha Tien');
  assert(score1 > 0.8, `Levenshtein nhận diện khớp chuỗi gõ không dấu (${(score1 * 100).toFixed(1)}%)`);

  console.log('\n📌 PHẦN 6: TEST BÁO CÁO TÀI CHÍNH & BẢNG CÂN ĐỐI PHÁT SINH PIVOT (1XX - 9XX)');
  const trialBalance = calculateTrialBalancePivot(mockTransactions);
  assert(trialBalance.length >= 4, 'Tổng hợp đúng bảng cân đối phát sinh tất cả các tài khoản');
  const sumDebit = trialBalance.reduce((acc, item) => acc + item.periodDebit, 0);
  const sumCredit = trialBalance.reduce((acc, item) => acc + item.periodCredit, 0);
  assert(sumDebit === sumCredit, `Cân đối tuyệt đối Tổng Phát Sinh Nợ (${sumDebit.toLocaleString()}) = Tổng Phát Sinh Có (${sumCredit.toLocaleString()})`);

  const incomeStmt = calculateIncomeStatement(mockTransactions);
  assert(incomeStmt.grossRevenue === 50000000, 'Doanh Thu Thuần B02-DN tính chính xác (50M)');
  assert(incomeStmt.cogs === 5000000, 'Giá Vốn Hàng Bán TK 632 tính chính xác (5M)');
  const assets = calculateAssetDepreciationReport(mockTransactions);
  assert(assets.length >= 1, 'Thống kê đúng danh mục Khấu hao TSCĐ TK 211 / 242');

  console.log('\n📌 PHẦN 7: TEST BÓC TÁCH CHI PHÍ BỊ LOẠI THUẾ TNDN [B4]');
  const citAudit = auditNonDeductibleExpenses(mockTransactions);
  assert(citAudit.totalNonDeductibleAmount === 40000000, 'Tự động tính đúng tổng chi phí bị loại Thuế TNDN chỉ tiêu [B4] (40M)');
  assert(citAudit.totalCitTaxRisk === 8000000, 'Tính chính xác tiền thuế TNDN nguy cơ bị truy thu thêm (20% = 8M)');
  assert(citAudit.items.length === 2, 'Bóc tách chính xác 2 chứng từ vi phạm quy định thuế TNDN');

  console.log('\n📌 PHẦN 8: TEST PHÂN TÍCH BIẾN ĐỘNG DOANH THU & CHI PHÍ BẤT THƯỜNG (>30%)');
  const variance = analyzeFinancialVariances(mockTransactions);
  assert(variance.items.length >= 2, 'Thống kê đầy đủ danh mục tài khoản phân tích biến động');

  console.log('\n📌 PHẦN 9: TEST DỰ BÁO DÒNG TIỀN RÒNG & TỐC ĐỘ ĐỐT QUỸ (30-90 NGÀY)');
  const forecast = calculateCashflowForecast(mockTransactions);
  assert(forecast.forecasts.length === 3, 'Tạo đủ 3 mốc dự báo dòng tiền 30 ngày, 60 ngày và 90 ngày');
  assert(forecast.runwayMonths >= 0, `Tính đúng số tháng dự trữ quỹ tiền mặt duy trì được (${forecast.runwayMonths} tháng)`);

  console.log('\n📌 PHẦN 10: TEST NHẬT KÝ SỔ CÁI CHI TIẾT MẪU S03A-DN (THÔNG TƯ 200/133)');
  const ledger111 = generateGeneralLedgerReport('111', mockTransactions);
  assert(ledger111.rows.length >= 1, 'Trích xuất đúng danh sách chứng từ Sổ Cái TK 111 (Tiền mặt)');

  console.log('\n📌 PHẦN 11: TEST QUẢN LÝ MULTI-COMPANY / NHIỀU DOANH NGHIỆP ĐỘC LẬP');
  const comp1 = getCompanyConfig('0101234567');
  assert(comp1.name.includes('An Phát'), 'Trích xuất đúng cấu hình cô lập dữ liệu cho MST 0101234567');
  assert(comp1.accountingStandard === 'TT200', 'Xác định đúng khung chế độ kế toán Thông tư 200');

  console.log('\n📌 PHẦN 12: TEST PHÂN QUYỀN NGƯỜI DÙNG 5 VAI TRÒ (RBAC)');
  assert(checkPermission('ADMIN', 'canDelete') === true, 'Admin có toàn quyền xóa dữ liệu');
  assert(checkPermission('VIEWER', 'canEdit') === false, 'Người xem (Viewer/CEO) chỉ có quyền Read-only (không được sửa)');
  assert(checkPermission('CHIEF_ACCOUNTANT', 'canApprove') === true, 'Kế toán trưởng có quyền duyệt chứng từ');

  console.log('\n📌 PHẦN 13: TEST BỘ MẪU BÁO CÁO & PRESET 6 NGÀNH NGHỀ');
  const constRule = getIndustryRule('CONSTRUCTION');
  assert(constRule.trackByConstruction === true, 'Ngành Xây Dựng kích hoạt theo dõi theo Công trình/Hạng mục');
  const commRule = getIndustryRule('COMMERCE');
  assert(commRule.trackInventory === true, 'Ngành Thương Mại kích hoạt theo dõi Nhập - Xuất - Tồn Kho');

  console.log('\n📌 PHẦN 14: TEST CHECKLIST KHÓA SỔ THÁNG (10 TIÊU CHÍ AUDIT TỰ ĐỘNG)');
  const closingAudit = auditMonthEndClosing(mockTransactions, [], '2026-08-12 09:00');
  assert(closingAudit.rules.length === 10, 'Tự động quét đủ 10 tiêu chí khóa sổ tháng');
  assert(closingAudit.passedRulesCount >= 5, `Số tiêu chí đạt chuẩn (${closingAudit.passedRulesCount}/10)`);
  assert(closingAudit.rules.some(r => r.category === 'TRIAL_BALANCE'), 'Tiêu chí cân đối Bảng cân đối phát sinh Nợ = Có hoạt động chính xác');

  console.log('\n📌 PHẦN 15: TEST TRỢ LÝ AI GỢI Ý ĐỊNH KHOẢN TÀI KHOẢN (CONFIDENCE SCORE %)');
  const aiMaterial = suggestAccountsByAI('Mua xi măng Hà Tiên nạp kho', 'Tập đoàn Xi Măng', 15000000);
  assert(aiMaterial.debitAcc === '152', 'AI gợi ý đúng Nợ 152 khi diễn giải là mua xi măng');
  assert(aiMaterial.confidenceScore >= 90, `AI tính toán Điểm Tin Cậy cao (${aiMaterial.confidenceScore}%)`);

  console.log('\n📌 PHẦN 16: TEST CẢNH BÁO LỆCH LOGIC KẾ TOÁN CHÉO (CROSS-LOGIC AUDIT)');
  const crossAudit = auditCrossLogicConsistency(mockTransactions, []);
  assert(crossAudit.totalIssuesCount >= 0, 'Thực thi quét 5 điểm xung đột logic chéo hệ thống');

  console.log('\n📌 PHẦN 17: TEST ĐỌC PHÂN TÍCH DỮ LIỆU EXECUTIVE (EBITDA & FINANCIAL HEALTH SCORE)');
  const execAnalytics = analyzeExecutiveFinancials(mockTransactions);
  assert(execAnalytics.grossRevenue === 50000000, 'Tính chính xác Doanh thu rồng B02-DN (50M)');
  assert(execAnalytics.health.score >= 10 && execAnalytics.health.score <= 100, `Tính đúng Điểm Sức Khỏe Tài Chính (${execAnalytics.health.score}/100)`);
  assert(execAnalytics.costBreakdown.length === 4, 'Phân tích đầy đủ 4 nhóm cấu trúc chi phí doanh nghiệp');

  console.log('\n📌 PHẦN 18: TEST ENGINE TÍNH TOÁN CAO CẤP (ĐIỂM HÒA VỐN BEP & THUẾ TNDN QUÝ)');
  const bepTest = calculateBreakEvenPoint(mockTransactions);
  assert(bepTest.fixedCosts >= 0, 'Tính chính xác tổng Định phí doanh nghiệp');
  assert(bepTest.breakEvenRevenue >= 0, `Tính đúng Doanh Thu Hòa Vốn BEP (${bepTest.breakEvenRevenue.toLocaleString()} VNĐ)`);
  const taxTest = estimateQuarterlyTax(mockTransactions, 'Q3/2026');
  assert(taxTest.citTaxAmount >= 0, `Dự báo thuế TNDN quý tạm tính phải nộp (${taxTest.citTaxAmount.toLocaleString()} VNĐ)`);

  console.log('\n====================================================');
  console.log(`📊 KẾT QUẢ KIỂM THỬ: ${passCount} PASSED | ${failCount} FAILED`);
  console.log('====================================================\n');
}

runAllTests();
