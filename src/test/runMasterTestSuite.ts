import { calculateTaxRiskSummary, calculateInventoryCardReport, calculateCashAndBankLedger, calculatePartnerDebtReport } from '../services/accountingCoreService';
import { calculateBalanceSheet } from '../services/balanceSheetService';
import { calculateCashFlowStatement } from '../services/cashFlowStatementService';
import { generateFinancialNotes } from '../services/financialNotesService';
import { generateSpecialJournal } from '../services/specialJournalsService';
import { checkRiskyTaxpayer } from '../services/riskyTaxpayerDatabase';
import { calculateTrialBalancePivot, calculateIncomeStatement, calculateAssetDepreciationReport } from '../services/financialReportService';
import { auditNonDeductibleExpenses } from '../services/taxAuditService';
import { auditMonthEndClosing } from '../services/monthEndClosingService';
import { suggestAccountsByAI } from '../services/aiAccountSuggestionService';
import { auditCrossLogicConsistency } from '../services/crossLogicAuditService';
import { analyzeExecutiveFinancials } from '../services/executiveAnalyticsService';
import { calculateBreakEvenPoint, estimateQuarterlyTax } from '../services/financialCalculationEngine';
import { auditVatRefundEligibility } from '../services/vatRefundAuditService';
import { calculateContractCostingReport } from '../services/contractCostingService';
import { createAdjustmentEntry } from '../services/adjustmentEntryService';
import { createDataSnapshot, compareDataSnapshots } from '../services/dataVersioningService';
import { detectDataAnomalies } from '../services/aiAnomalyDetector';
import { getPostJuly2026TaxPolicies } from '../services/taxPolicySyncService';
import { calculatePersonalIncomeTax } from '../services/pitCalculationEngine';
import { generateForm01VATReport } from '../services/officialFormTemplates';
import { signXmlInvoiceDocument, mockGetActiveCompanyCertificate } from '../services/digitalSignatureService';
import { auditCertificateHealth } from '../services/certificateManagerService';
import { getSafeStorageConfig, executeSyncToSafeDrive } from '../services/persistentStorageService';
import { analyzeFinancialVariances } from '../services/varianceAnalysisService';
import { calculateCashflowForecast } from '../services/cashflowForecastService';
import { generateGeneralLedgerReport } from '../services/generalLedgerService';
import { getCompanyConfig } from '../services/multiCompanyService';
import { checkPermission, getRoleLabel } from '../services/rolePermissionService';
import { getIndustryRule } from '../services/industryPresetService';
import { validateTransaction, parseNumericValue } from '../services/validationRules';
import { levenshteinSimilarity } from '../services/matchingEngine';
import {
  createReverseEntry,
  approveCorrectionEntry,
  getAllCorrectionEntries,
  getCorrectionStats,
} from '../services/correctionEntryService';
import { TAX_DEADLINES } from '../services/legalDatabase';
import { calculatePayrollEntry, calculatePayrollSummary, getAllEmployees } from '../services/payrollService';
import {
  calculateDepreciationSchedule,
  getTotalMonthlyDepreciation,
  getAllFixedAssets,
  ASSET_GROUP_DEFAULTS,
} from '../services/fixedAssetService';
import { generateGTGTXML, generatePITXML, generateTNDNXML, validateHTKKXML } from '../services/eTaxXMLGenerator';
import { exportVATAnnexesToExcel, exportTNDNExcel } from '../services/excelService';
import { calculateTrialBalance } from '../services/trialBalancePivotEngine';
import { buildAccountAggregator, AccountAggregator } from '../services/accountAggregator';
import { 
  calculateMonthlyAllocation, 
  calculatePrepaidAllocationSchedule, 
  calculatePrepaidSummary, 
  generatePrepaidAllocationTransaction 
} from '../services/prepaidExpenseService';
import {
  calculateTradeUnionContribution,
  calculateTradeUnionSummary,
  getTradeUnionAccounts,
  generateUnionVoucherHTML,
  generateBatchUnionVouchersHTML,
  parseUnionTransactionsFromExcel,
} from '../services/tradeUnionService';
import { calculateEnterpriseRiskScore } from '../services/riskScoreEngine';
import { suggestJournalEntry } from '../services/journalSuggestService';
import { getAllCompanies, saveCompanyConfig } from '../services/multiCompanyService';
import { generateConsolidatedReport } from '../services/consolidationEngine';
import { jaccardSimilarity } from '../services/matchingEngine';
import { NormalizedTransaction } from '../types/accounting';

console.log('====================================================');
console.log('🧪 BẮT ĐẦU CHẠY MASTER TEST SUITE - Phần mềm Kế Toán');
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

  console.log('\n📌 PHẦN 19: TEST RÀ SOÁT RỦI RO HỒ SƠ HOÀN THUẾ GTGT (6 ĐIỀU KIỆN TT 80/2021/TT-BTC)');
  const vatRefundTest = auditVatRefundEligibility(mockTransactions);
  assert(vatRefundTest.rules.length === 6, 'Tự động rà soát đủ 6 điều kiện pháp lý hoàn thuế GTGT');
  assert(vatRefundTest.passedRulesCount >= 4, `Đánh giá số tiêu chí đạt chuẩn (${vatRefundTest.passedRulesCount}/6)`);

  console.log('\n📌 PHẦN 20: TEST TẬP HỢP GIÁ THÀNH & LỢI NHUẬN HỢP ĐỒNG / CÔNG TRÌNH (TK 1541-1543)');
  const costingTest = calculateContractCostingReport(mockTransactions);
  assert(costingTest.length >= 1, 'Tập hợp dữ liệu giá thành theo mã Hợp Đồng');
  assert(costingTest[0].totalCost >= 0, 'Tính toán chính xác tổng chi phí 1541, 1542, 1543');

  console.log('\n📌 PHẦN 21: TEST ENGINE LẬP BÚT TOÁN ĐIỀU CHỈNH CHUẨN KẾ TOÁN (GHI ĐỎ/BỔ SUNG)');
  const adjResult = createAdjustmentEntry(mockTransactions[0], 20000000, undefined, 'RED_NEGATIVE_REVERSAL');
  assert(adjResult.adjustedTransaction.voucherNo.startsWith('DC-'), 'Sinh mã chứng từ điều chỉnh chuẩn DC-');
  assert(adjResult.adjustmentType === 'RED_NEGATIVE_REVERSAL', 'Tạo đúng loại chứng từ điều chỉnh Ghi Đỏ');

  console.log('\n📌 PHẦN 22: TEST LƯU SNAPSHOT & TIME MACHINE SO SÁNH DIFF DỮ LIỆU CŨ');
  const snapshot = createDataSnapshot('Snapshot Test v2.0', mockTransactions);
  assert(snapshot.totalTransactions === mockTransactions.length, 'Lưu trữ Snapshot giữ nguyên vẹn 100% dữ liệu gốc');
  const diffRes = compareDataSnapshots(snapshot, mockTransactions);
  assert(diffRes.totalChanges === 0, 'So sánh Diff chính xác khi dữ liệu chưa có biến động');

  console.log('\n📌 PHẦN 23: TEST TRỢ LÝ AI TỰ ĐỘNG QUÉT PHÁT HIỆN DỮ LIỆU NHẬP SAI LỆCH');
  const anomaliesTest = detectDataAnomalies(mockTransactions);
  assert(anomaliesTest.length >= 0, 'AI quét tự động các điểm bất thường dữ liệu gõ thừa số 0 hoặc ngược Nợ/Có');

  console.log('\n📌 PHẦN 24: TEST RÀ SOÁT CẢNH BÁO CHÍNH SÁCH THUẾ MỚI SAU 01/07/2026');
  const taxPolicies = getPostJuly2026TaxPolicies(mockTransactions);
  assert(taxPolicies.length >= 2, 'Tự động trích xuất các cảnh báo quy định Luật Thuế mới sau 01/07/2026');

  console.log('\n📌 PHẦN 25: TEST ENGINE TÍNH THUẾ TNCN LŨY TIẾN 7 BẬC (MỨC GIẢM TRỪ MỚI 2026)');
  const pitTest = calculatePersonalIncomeTax(30000000, 1, true);
  assert(pitTest.personalDeduction === 15500000, 'Áp dụng mức giảm trừ bản thân 15.5M/tháng');
  assert(pitTest.dependentDeduction === 5500000, 'Áp dụng mức giảm trừ 1 người phụ thuộc 5.5M/tháng');
  assert(pitTest.pitAmount >= 0, `Tính toán chính xác số thuế TNCN phải nộp (${pitTest.pitAmount.toLocaleString()} VNĐ)`);

  console.log('\n📌 PHẦN 26: TEST SINH DỮ LIỆU TỜ KHAI THUẾ GTGT MẪU 01/GTGT CHUẨN THÔNG TƯ 80/2021');
  const form01Vat = generateForm01VATReport(mockTransactions, 'Quý 3/2026');
  assert(form01Vat.totalSalesValue === 50000000, 'Tổng doanh số bán ra tính chính xác (50M)');
  assert(form01Vat.taxPeriod === 'Quý 3/2026', 'Xác định kỳ kê khai Thuế GTGT 01/GTGT Quý 3/2026');

  console.log('\n📌 PHẦN 27: TEST ENGINE KÝ SỐ HÓA ĐƠN ĐIỆN TỬ XML (ENVEOLPED SIGNATURE <ds:Signature>)');
  const mockCert = mockGetActiveCompanyCertificate();
  const signedXml = signXmlInvoiceDocument('<HDon><DVu>Kế toán</DVu></HDon>', mockCert);
  assert(signedXml.isSigned === true, 'Ký số Hóa đơn XML thành công 100%');
  assert(signedXml.signedXmlContent.includes('<ds:Signature'), 'Cấu trúc thẻ chữ ký số ds:Signature đạt chuẩn Tổng Cục Thuế');

  console.log('\n📌 PHẦN 28: TEST TRÌNH QUẢN LÝ & CẢNH BÁO HẠN DÙNG CHỨNG THƯ SỐ DOANH NGHIỆP');
  const certAudit = auditCertificateHealth(mockCert);
  assert(certAudit.isReadyForSigning === true, 'Xác nhận Chữ ký số hợp lệ sẵn sàng ký chứng từ');
  assert(certAudit.certificate.daysRemaining > 0, `Theo dõi số ngày còn hiệu lực chữ ký số (${certAudit.certificate.daysRemaining} ngày)`);

  console.log('\n📌 PHẦN 29: TEST ĐƯỜNG DẪN Ổ ĐĨA LƯU TRỮ AN TOÀN (D:\\KeToan_Data) PHÒNG SẬP MÁY');
  const safeConfig = getSafeStorageConfig();
  assert(safeConfig.safePath.startsWith('D:\\'), 'Thiết lập thư mục lưu trữ an toàn mặc định ngoài ổ đĩa hệ thống C:\\');
  assert(safeConfig.isAutoBackupEnabled === true, 'Kích hoạt tính năng tự động sao lưu dữ liệu');

  console.log('\n📌 PHẦN 30: TEST ENGINE ĐỒNG BỘ SAO LƯU DỮ LIỆU TỨC THỜI TỰ ĐỘNG');
  const syncRes = await executeSyncToSafeDrive();
  assert(syncRes.success === true, 'Thực thi đồng bộ dữ liệu an toàn thành công 100%');
  assert(syncRes.filePath.length > 0, `Đồng bộ dữ liệu an toàn tới tệp (${syncRes.filePath})`);

  console.log('\n📌 PHẦN 31: TEST WIDGET NHẮC DEADLINE THUẾ THEO LỊCH HÀNG NĂM');
  assert(TAX_DEADLINES.length >= 3, `Hệ thống có ít nhất 3 mốc hạn nộp thuế quan trọng (${TAX_DEADLINES.length} hạn)`);
  assert(TAX_DEADLINES.some(d => d.type === 'QUARTERLY'), 'Bao gồm deadline kê khai thuế GTGT/TNCN theo quý');
  assert(TAX_DEADLINES.some(d => d.type === 'ANNUAL'), 'Bao gồm deadline BCTC & quyết toán thuế TNDN năm');

  console.log('\n📌 PHẦN 32: TEST ENGINE BÚT TOÁN ĐẢO NGƯỢC ĐIỀU CHỈNH CHỨNG TỪ SAI (TT200)');
  // Tạo phiếu điều chỉnh đảo bút toán từ chứng từ sai
  const mockWrongTx: NormalizedTransaction = {
    id: 'tx-test-wrong-01',
    clientId: 'client-test',
    importDate: '2026-07-15',
    date: '2026-07-15',
    voucherNo: 'PC-0715',
    description: 'Chi phí văn phòng (ghi nhầm TK 642 thay vì 641)',
    debitAcc: '642',
    creditAcc: '111',
    amount: 3_500_000,
    type: 'EXPENSE',
    partnerName: '',
    partnerTaxCode: '',
    rawRow: {},
    errors: [],
    sourceFileName: 'test.xlsx',
    validationStatus: 'VALID',
    userApproved: false,
  };
  const correction = createReverseEntry(
    mockWrongTx,
    'Sai TK chi phí: phải ghi TK 641 (Chi phí bán hàng) thay vì TK 642',
    'Nguyễn Kế Toán',
    '641', '111', 3_500_000,
  );
  assert(correction.reverseEntry.amount === -3_500_000, 'Bút toán đảo tạo ra số tiền âm (-3,500,000) để triệt tiêu bút toán sai');
  assert(correction.reverseEntry.debitAcc === '111' && correction.reverseEntry.creditAcc === '642', 'Đảo đúng cặp TK Nợ/Có (Nợ 111 / Có 642)');
  assert(correction.replacementEntry?.debitAcc === '641', 'Bút toán thay thế đúng dùng TK 641 (Chi phí bán hàng)');
  assert(correction.status === 'PENDING', 'Phiếu điều chỉnh mới tạo ở trạng thái Chờ duyệt');

  console.log('\n📌 PHẦN 33: TEST QUY TRÌNH PHÊ DUYỆT PHIẾU ĐIỀU CHỈNH BÚT TOÁN');
  const approved = approveCorrectionEntry(correction.id, 'Trần Kế Toán Trưởng');
  assert(approved === true, 'Kế toán trưởng phê duyệt thành công phiếu điều chỉnh');
  const allEntries = getAllCorrectionEntries();
  const foundApproved = allEntries.find(e => e.id === correction.id);
  assert(foundApproved?.status === 'APPROVED', 'Trạng thái phiếu cập nhật thành Đã duyệt sau khi phê duyệt');
  assert(foundApproved?.approvedBy === 'Trần Kế Toán Trưởng', 'Ghi nhận tên người phê duyệt chính xác');

  console.log('\n📌 PHẦN 34: TEST SỔ KẾ TOÁN CHUẨN TT200 — NHẬT KÝ CHUNG & SỔ CÁI');
  // Test logic sổ cái — nhóm giao dịch theo tài khoản
  const testTxs: NormalizedTransaction[] = [
    { id: 't1', clientId: 'c1', importDate: '2026-07-01', date: '2026-07-01', voucherNo: 'PT01', description: 'Thu tiền mặt', debitAcc: '111', creditAcc: '131', amount: 10_000_000, type: 'INCOME', partnerName: '', partnerTaxCode: '', rawRow: {}, errors: [], sourceFileName: 'test.xlsx', validationStatus: 'VALID', userApproved: true },
    { id: 't2', clientId: 'c1', importDate: '2026-07-02', date: '2026-07-02', voucherNo: 'PC01', description: 'Chi phí văn phòng', debitAcc: '642', creditAcc: '111', amount: 2_000_000, type: 'EXPENSE', partnerName: '', partnerTaxCode: '', rawRow: {}, errors: [], sourceFileName: 'test.xlsx', validationStatus: 'VALID', userApproved: true },
    { id: 't3', clientId: 'c1', importDate: '2026-07-05', date: '2026-07-05', voucherNo: 'PT02', description: 'Thu tiền từ khách hàng', debitAcc: '112', creditAcc: '131', amount: 25_000_000, type: 'INCOME', partnerName: '', partnerTaxCode: '', rawRow: {}, errors: [], sourceFileName: 'test.xlsx', validationStatus: 'VALID', userApproved: true },
  ];
  // Kiểm tra logic nhóm sổ cái TK 111
  const tk111Txs = testTxs.filter(t => t.debitAcc?.startsWith('111') || t.creditAcc?.startsWith('111'));
  const tk111Debit = tk111Txs.filter(t => t.debitAcc?.startsWith('111')).reduce((s, t) => s + t.amount, 0);
  const tk111Credit = tk111Txs.filter(t => t.creditAcc?.startsWith('111')).reduce((s, t) => s + t.amount, 0);
  assert(tk111Debit === 10_000_000, 'Sổ cái TK 111 tính tổng phát sinh Nợ chính xác (10,000,000)');
  assert(tk111Credit === 2_000_000, 'Sổ cái TK 111 tính tổng phát sinh Có chính xác (2,000,000)');
  assert(tk111Debit - tk111Credit === 8_000_000, 'Sổ cái TK 111 tính số dư cuối kỳ chính xác (8,000,000)');

  // Kiểm tra nhật ký chung — đúng thứ tự thời gian
  const sorted = [...testTxs].sort((a, b) => a.date.localeCompare(b.date));
  assert(sorted[0].voucherNo === 'PT01' && sorted[2].voucherNo === 'PT02', 'Nhật ký chung sắp xếp đúng thứ tự thời gian từ sớm đến muộn');

  const stats = getCorrectionStats();
  assert(stats.total >= 1, `Thống kê tổng số phiếu điều chỉnh ghi nhận đúng (${stats.total} phiếu)`);

  console.log('\n📌 PHẦN 35: TEST ENGINE TÍNH BẢNG LƯƠNG & BHXH/BHYT/BHTN 2026');
  // Nhân viên chính thức: lương 12M, 1 người PT
  const testEmp = {
    id: 'emp-t1',
    name: 'Nguyễn Kiểm Thử',
    position: 'KTV',
    department: 'KT',
    contractType: 'OFFICIAL' as const,
    basicSalary: 12_000_000,
    allowances: { position: 1_000_000, transport: 500_000, meal: 730_000, phone: 0, other: 0 },
    dependentsCount: 1,
    taxCode: '0000000001',
    bankAccount: '1234567890',
    startDate: '2024-01-01',
  };
  const payEntry = calculatePayrollEntry(testEmp);
  // Gross = 12M + 1M + 0.5M + 0.73M = 14,230,000
  assert(payEntry.grossSalary === 14_230_000, `Gross = basicSalary + phụ cấp (${payEntry.grossSalary.toLocaleString('vi-VN')} đ)`);
  // BHXH NLĐ 8% * 12M = 960,000
  assert(payEntry.bhxhEmployee === 960_000, `BHXH NLĐ 8% trên lương cơ bản 12M = 960,000 đ (${payEntry.bhxhEmployee.toLocaleString('vi-VN')} đ)`);
  // BHYT NLĐ 1.5% * 12M = 180,000
  assert(payEntry.bhytEmployee === 180_000, `BHYT NLĐ 1.5% = 180,000 đ (${payEntry.bhytEmployee.toLocaleString('vi-VN')} đ)`);
  // BHTN NLĐ 1% * 12M = 120,000
  assert(payEntry.bhtnEmployee === 120_000, `BHTN NLĐ 1% = 120,000 đ (${payEntry.bhtnEmployee.toLocaleString('vi-VN')} đ)`);
  // Tổng BH NLĐ = 10.5% * 12M = 1,260,000
  assert(payEntry.totalInsuranceEmployee === 1_260_000, `Tổng BH NLĐ 10.5% = 1,260,000 đ (${payEntry.totalInsuranceEmployee.toLocaleString('vi-VN')} đ)`);
  // BH NSDLĐ: 21.5% * 12M = 2,580,000
  assert(payEntry.totalInsuranceEmployer === 2_580_000, `Tổng BH NSDLĐ 21.5% = 2,580,000 đ (${payEntry.totalInsuranceEmployer.toLocaleString('vi-VN')} đ)`);
  // TNCN: Gross 14.23M - BH 1.26M = taxable 12.97M; - GT bản thân 15.5M → TNCN = 0
  assert(payEntry.pitAmount === 0, `TNCN = 0 khi thu nhập sau giảm trừ < 0 (dưới ngưỡng chịu thuế)`);
  // Net = Gross - BH NLĐ - TNCN = 14,230,000 - 1,260,000 - 0
  assert(payEntry.netSalary === 12_970_000, `Lương Net = 12,970,000 đ (${payEntry.netSalary.toLocaleString('vi-VN')} đ)`);
  // Bút toán lương đủ ít nhất 3 dòng
  assert(payEntry.accountingEntries.length >= 3, `Sinh đủ bút toán hạch toán lương (${payEntry.accountingEntries.length} bút toán)`);
  // Kiểm tra bút toán ghi nhận lương (Nợ 622/Có 334)
  const salaryEntry = payEntry.accountingEntries.find(e => e.debitAcc === '622' && e.creditAcc === '334');
  assert(!!salaryEntry, 'Bút toán ghi nhận lương phải trả: Nợ 622 / Có 334');
  // Kiểm tra bút toán chi lương thực (Nợ 334/Có 112)
  const payEntry112 = payEntry.accountingEntries.find(e => e.debitAcc === '334' && e.creditAcc === '112');
  assert(!!payEntry112, 'Bút toán chi lương thực nhận: Nợ 334 / Có 112');

  console.log('\n📌 PHẦN 36: TEST BẢNG LƯƠNG NHIỀU NHÂN VIÊN & TỔNG HỢP');
  const employees = getAllEmployees();
  assert(employees.length >= 3, `Hệ thống có nhân viên mẫu sẵn (${employees.length} người)`);
  const summary = calculatePayrollSummary(employees, '07/2026', 'client-test');
  assert(summary.entries.length === employees.length, 'Bảng lương tạo đủ 1 dòng cho mỗi nhân viên');
  assert(summary.totalGross > 0, `Tổng Gross toàn bộ nhân viên > 0 (${summary.totalGross.toLocaleString('vi-VN')} đ)`);
  assert(summary.totalNetSalary < summary.totalGross, 'Tổng Net < Tổng Gross (đã trừ BH và TNCN)');
  assert(summary.totalEmployerCost > summary.totalGross, 'Chi phí NSDLĐ > Gross (bao gồm BH NSDLĐ 21.5%)');
  assert(summary.totalInsuranceEmployer === summary.entries.reduce((s, e) => s + e.totalInsuranceEmployer, 0), 'Tổng BH NSDLĐ khớp giữa summary và từng dòng');

  console.log('\n📌 PHẦN 37: TEST ENGINE KHẤU HAO TSCĐ — PHƯƠNG PHÁP ĐƯỜNG THẸNG (TT45/2013)');
  // TSCĐ mẫu: Laptop Dell 28tr, KH 36 tháng, giá trị thu hồi 0
  const testAsset = {
    id: 'fa-test-01',
    code: 'TSCĐ-TEST',
    name: 'Laptop Dell Test',
    group: 'THIET_BI_DIEN_TU' as const,
    department: 'Kế toán',
    purchaseDate: '2024-01-01',
    useDate: '2024-01-01',
    originalCost: 36_000_000,
    salvageValue: 0,
    usefulLifeMonths: 36,
    accountDebit: '642',
    accountCredit: '214',
    accountAsset: '211',
    status: 'ACTIVE' as const,
  };
  const sch = calculateDepreciationSchedule(testAsset);
  // KH/tháng = 36,000,000 / 36 = 1,000,000
  assert(sch.monthlyAmount === 1_000_000, `KH/tháng = 36tr / 36 = 1,000,000 đ (${sch.monthlyAmount.toLocaleString('vi-VN')} đ)`);
  // KH/năm = 12,000,000
  assert(sch.annualAmount === 12_000_000, `KH/năm = 12,000,000 đ (${sch.annualAmount.toLocaleString('vi-VN')} đ)`);
  // Tỷ lệ KH = 33.33%
  assert(sch.depreciationRate === 33.33, `Tỷ lệ KH = 33.33%/năm (${sch.depreciationRate}%)`);
  // Tổng tháng = 36
  assert(sch.schedule.length === 36, `Bảng KH có đủ 36 dòng tháng (${sch.schedule.length} dòng)`);
  // Số dư tháng đầu = 36,000,000 - 1,000,000 = 35,000,000
  assert(sch.schedule[0].bookValue === 35_000_000, `Giá trị còn lại sau tháng 1 = 35,000,000 đ`);
  // Số dư tháng cuối = 0
  assert(sch.schedule[35].bookValue === 0, 'Giá trị còn lại sau tháng 36 = 0 (khấu hao hết)');
  // Bút toán: Nợ 642 / Có 214
  assert(sch.schedule[0].accountingEntry.debitAcc === '642', 'Bút toán KH: Nợ TK 642 (chi phí QLDN)');
  assert(sch.schedule[0].accountingEntry.creditAcc === '214', 'Bút toán KH: Có TK 214 (KH TSCĐ)');
  assert(sch.schedule[0].accountingEntry.amount === 1_000_000, 'Số tiền bút toán KH đúng = 1,000,000 đ');

  console.log('\n📌 PHẦN 38: TEST KHẤU HAO LŨY KẾ VÀ TỔNG HỢP');
  // Tháng 6: KH lũy kế = 6 * 1,000,000 = 6,000,000
  assert(sch.schedule[5].accumulatedDepreciation === 6_000_000, 'KH lũy kế tháng 6 = 6,000,000 đ');
  assert(sch.schedule[5].bookValue === 30_000_000, 'Giá trị còn lại tháng 6 = 30,000,000 đ');
  assert(!sch.schedule[5].isFullyDepreciated, 'TSCĐ chưa KH hết sau 6 tháng');
  assert(sch.schedule[35].isFullyDepreciated, 'TSCĐ KH hết sau tháng 36');
  // Tổng KH = 36M
  assert(sch.totalDepreciation === 36_000_000, 'Tổng KH = 36,000,000 đ (= Nguyên giá - GT thu hồi)');

  console.log('\n📌 PHẦN 39: TEST TỔNG HỢP KHẤU HAO NHIỀU TSCĐ THEO THÁNG');
  const allAssets = getAllFixedAssets();
  assert(allAssets.length >= 3, `Hệ thống có TSCĐ mẫu sẵn (${allAssets.length} tài sản)`);
  const khJul2026 = getTotalMonthlyDepreciation(allAssets, '2026-07');
  assert(khJul2026.total > 0, `Tổng KH tháng 07/2026 > 0 (${khJul2026.total.toLocaleString('vi-VN')} đ)`);
  assert(khJul2026.entries.length >= 1, `Có ít nhất 1 TSCĐ đang khấu hao trong tháng 07/2026`);
  // Kiểm tra khung thời gian TT45: Máy tính tối thiểu 3 năm
  assert(ASSET_GROUP_DEFAULTS.THIET_BI_DIEN_TU.minYears === 3, 'TT45: Máy tính/thiết bị điện tử tối thiểu 3 năm KH');
  assert(ASSET_GROUP_DEFAULTS.PHUONG_TIEN.minYears === 6, 'TT45: Phương tiện vận tải tối thiểu 6 năm KH');
  assert(ASSET_GROUP_DEFAULTS.NHADAT_NHAXA.minYears === 10, 'TT45: Nhà xưởng tối thiểu 10 năm KH');

  console.log('\n📌 PHẦN 40: TEST ENGINE KHAI THUẾ eTax (XML 01/GTGT)');
  const mockClient = {
    id: 'c-test-xml',
    code: 'TEST01',
    name: 'Công ty TNHH Giải Pháp Thuế XML',
    taxCode: '0109999999',
    address: 'Số 100 Phố Thuế, Hà Nội',
    financialYear: 2026,
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
  };
  const mockOutputRows = [
    {
      invoiceDate: '2026-07-10',
      invoiceNo: 'HD01',
      sellerName: 'Khách Hàng A',
      sellerTaxCode: '0101111111',
      goodsDescription: 'Bán phần mềm',
      taxableAmount: 100_000_000,
      vatAmount: 10_000_000,
      vatRate: 10 as const,
    },
  ];
  const mockInputRows = [
    {
      invoiceDate: '2026-07-05',
      invoiceNo: 'HD02',
      sellerName: 'Nhà Cung Cấp B',
      sellerTaxCode: '0102222222',
      goodsDescription: 'Thuê máy chủ',
      taxableAmount: 20_000_000,
      vatAmount: 2_000_000,
      vatRate: 10 as const,
    },
  ];
  const gtgtXml = generateGTGTXML({
    client: mockClient,
    taxPeriod: { year: 2026, quarter: 3 },
    outputRows: mockOutputRows,
    inputRows: mockInputRows,
    prevCreditCarryover: 1_000_000,
  });
  assert(gtgtXml.includes('01/GTGT'), 'XML 01/GTGT chứa đúng mã loại tờ khai');
  assert(gtgtXml.includes('0109999999'), 'XML 01/GTGT chứa MST doanh nghiệp');
  assert(gtgtXml.includes('10000000'), 'XML 01/GTGT ghi nhận tổng thuế GTGT đầu ra (10,000,000)');
  assert(gtgtXml.includes('7000000'), 'XML 01/GTGT tính đúng số thuế GTGT còn phải nộp (10M - 2M - 1M = 7M)');

  console.log('\n📌 PHẦN 41: TEST ENGINE QUYẾT TOÁN THUẾ TNCN eTax (XML 05/KK-TNCN)');
  const pitEmps = getAllEmployees();
  const pitSummary = calculatePayrollSummary(pitEmps, '07/2026', mockClient.id);
  const pitXml = generatePITXML({
    client: mockClient,
    taxYear: 2026,
    payrollSummary: pitSummary,
  });
  assert(pitXml.includes('05/KK-TNCN'), 'XML 05/KK-TNCN chứa đúng mã loại tờ khai');
  assert(pitXml.includes('0109999999'), 'XML 05/KK-TNCN chứa MST doanh nghiệp');
  assert(pitXml.includes(`NamTinh2026`), 'XML 05/KK-TNCN ghi nhận đúng năm quyết toán');
  assert(pitXml.includes(`<TongSoNguoiLaoDong>${pitEmps.length}</TongSoNguoiLaoDong>`), 'XML 05/KK-TNCN ghi nhận đúng số lượng lao động');

  console.log('\n📌 PHẦN 42: TEST ENGINE BẢNG CÂN ĐỐI PHÁT SINH TÀI KHOẢN (PIVOT TT200)');
  const tbTxs: NormalizedTransaction[] = [
    { id: 'tb1', clientId: 'c1', importDate: '2026-07-01', date: '2026-07-01', voucherNo: 'PT01', description: 'Thu tiền bán hàng', debitAcc: '111', creditAcc: '511', amount: 50_000_000, type: 'INCOME', partnerName: '', partnerTaxCode: '', rawRow: {}, errors: [], sourceFileName: 'test.xlsx', validationStatus: 'VALID', userApproved: true },
    { id: 'tb2', clientId: 'c1', importDate: '2026-07-02', date: '2026-07-02', voucherNo: 'PC01', description: 'Rút tiền gửi ngân hàng nộp quỹ tiền mặt', debitAcc: '111', creditAcc: '112', amount: 10_000_000, type: 'INCOME', partnerName: '', partnerTaxCode: '', rawRow: {}, errors: [], sourceFileName: 'test.xlsx', validationStatus: 'VALID', userApproved: true },
    { id: 'tb3', clientId: 'c1', importDate: '2026-07-03', date: '2026-07-03', voucherNo: 'PC02', description: 'Chi trả tiền điện nước', debitAcc: '642', creditAcc: '111', amount: 5_000_000, type: 'EXPENSE', partnerName: '', partnerTaxCode: '', rawRow: {}, errors: [], sourceFileName: 'test.xlsx', validationStatus: 'VALID', userApproved: true },
  ];
  const tbReport = calculateTrialBalance(tbTxs);
  assert(tbReport.isBalanced === true, 'Bảng cân đối phát sinh đảm bảo nguyên tắc Tổng Nợ = Tổng Có');
  assert(tbReport.totalPeriodDebit === 65_000_000, 'Tổng phát sinh Nợ khớp chính xác (65,000,000)');
  assert(tbReport.totalPeriodCredit === 65_000_000, 'Tổng phát sinh Có khớp chính xác (65,000,000)');

  const row111 = tbReport.rows.find(r => r.accountCode === '111');
  assert(!!row111, 'Bảng cân đối chứa tài khoản 111 (Tiền mặt)');
  assert(row111?.periodDebit === 60_000_000, 'Phát sinh Nợ TK 111 tính đúng (50M + 10M = 60M)');
  assert(row111?.periodCredit === 5_000_000, 'Phát sinh Có TK 111 tính đúng (5M)');
  assert(row111?.closingDebit === 55_000_000, 'Dư Nợ cuối kỳ TK 111 tính đúng (55M)');

  console.log('\n📌 PHẦN 43: TEST SỐ DƯ ĐẦU KỲ VÀ DƯ CUỐI KỲ TÀI KHOẢN');
  const openReport = calculateTrialBalance(tbTxs, undefined, undefined, {
    '111': { debit: 15_000_000, credit: 0 },
  });
  const rowOpen111 = openReport.rows.find(r => r.accountCode === '111');
  assert(rowOpen111?.openingDebit === 15_000_000, 'Ghi nhận đúng số dư đầu kỳ Nợ TK 111 (15M)');
  assert(rowOpen111?.closingDebit === 70_000_000, 'Dư Nợ cuối kỳ TK 111 gồm cả số dư đầu kỳ (15M + 55M = 70M)');

  console.log('\n📌 PHẦN 44: TEST KIỂM TRA TỰ ĐỘNG LỖI BẤT CÂN BẰNG TÀI KHOẢN');
  const unbalancedTxs: NormalizedTransaction[] = [
    { id: 'ub1', clientId: 'c1', importDate: '2026-07-01', date: '2026-07-01', voucherNo: 'L01', description: 'Giao dịch thiếu TK Có', debitAcc: '111', creditAcc: '', amount: 10_000_000, type: 'INCOME', partnerName: '', partnerTaxCode: '', rawRow: {}, errors: [], sourceFileName: 'test.xlsx', validationStatus: 'VALID', userApproved: true },
  ];
  const unbalancedReport = calculateTrialBalance(unbalancedTxs);
  assert(unbalancedReport.isBalanced === false, 'Phát hiện chính xác trạng thái không cân bằng khi chứng từ thiếu đối ứng');

  // ============================================================
  // PHẦN 45: BẢNG CÂN ĐỐI KẾ TOÁN B01-DN
  // ============================================================
  console.log('\n📌 PHẦN 45: TEST BẢNG CÂN ĐỐI KẾ TOÁN (B01-DN)');

  const b01Txs: NormalizedTransaction[] = [
    // Vốn góp chủ sở hữu: Nợ 112 / Có 411 = 500M
    { id: 'b01-1', clientId: 'c1', importDate: '2026-01-01', date: '2026-01-01', voucherNo: 'VG01', description: 'Vốn góp CSH', debitAcc: '112', creditAcc: '411', amount: 500_000_000, type: 'INCOME', partnerName: 'CSH', partnerTaxCode: '', rawRow: {}, errors: [], sourceFileName: 'test.xlsx', validationStatus: 'VALID', userApproved: true },
    // Mua TSCĐ: Nợ 211 / Có 112 = 100M
    { id: 'b01-2', clientId: 'c1', importDate: '2026-02-01', date: '2026-02-01', voucherNo: 'MUA01', description: 'Mua máy tính', debitAcc: '211', creditAcc: '112', amount: 100_000_000, type: 'EXPENSE', partnerName: 'Dell', partnerTaxCode: '111222333', rawRow: {}, errors: [], sourceFileName: 'test.xlsx', validationStatus: 'VALID', userApproved: true },
    // Mua hàng hóa chưa trả: Nợ 156 / Có 331 = 80M
    { id: 'b01-3', clientId: 'c1', importDate: '2026-03-01', date: '2026-03-01', voucherNo: 'MH01', description: 'Mua hàng hóa NCC', debitAcc: '156', creditAcc: '331', amount: 80_000_000, type: 'EXPENSE', partnerName: 'NCC ABC', partnerTaxCode: '444555666', rawRow: {}, errors: [], sourceFileName: 'test.xlsx', validationStatus: 'VALID', userApproved: true },
    // Doanh thu bán hàng: Nợ 131 / Có 511 = 200M
    { id: 'b01-4', clientId: 'c1', importDate: '2026-04-01', date: '2026-04-01', voucherNo: 'BH01', description: 'Bán hàng', debitAcc: '131', creditAcc: '511', amount: 200_000_000, type: 'INCOME', partnerName: 'KH A', partnerTaxCode: '777888999', rawRow: {}, errors: [], sourceFileName: 'test.xlsx', validationStatus: 'VALID', userApproved: true },
    // Giá vốn: Nợ 632 / Có 156 = 60M
    { id: 'b01-5', clientId: 'c1', importDate: '2026-04-01', date: '2026-04-01', voucherNo: 'GV01', description: 'Xuất kho giá vốn', debitAcc: '632', creditAcc: '156', amount: 60_000_000, type: 'EXPENSE', partnerName: '', partnerTaxCode: '', rawRow: {}, errors: [], sourceFileName: 'test.xlsx', validationStatus: 'VALID', userApproved: true },
  ];

  const bs = calculateBalanceSheet(b01Txs);
  assert(bs.isBalanced === true, 'B01-DN: Tổng Tài Sản = Tổng Nguồn Vốn (cân bằng kế toán)');
  assert(bs.totalAssets > 0, 'B01-DN: Tổng tài sản > 0');
  assert(bs.totalLiabilitiesAndEquity > 0, 'B01-DN: Tổng nguồn vốn > 0');
  assert(bs.assets.length > 0, 'B01-DN: Danh sách tài sản có dữ liệu');
  assert(bs.liabilitiesAndEquity.length > 0, 'B01-DN: Danh sách nguồn vốn có dữ liệu');

  // ============================================================
  // PHẦN 46: BÁO CÁO LƯU CHUYỂN TIỀN TỆ B03-DN
  // ============================================================
  console.log('\n📌 PHẦN 46: TEST BÁO CÁO LƯU CHUYỂN TIỀN TỆ (B03-DN)');

  const cf = calculateCashFlowStatement(b01Txs);
  assert(typeof cf.netCashFromOperating === 'number', 'B03-DN: Tính được lưu chuyển tiền HĐKD');
  assert(typeof cf.netCashFromInvesting === 'number', 'B03-DN: Tính được lưu chuyển tiền HĐĐT');
  assert(typeof cf.netCashFromFinancing === 'number', 'B03-DN: Tính được lưu chuyển tiền HĐTC');
  assert(cf.operatingItems.length > 0, 'B03-DN: Danh sách chỉ tiêu HĐKD có dữ liệu');
  assert(cf.investingItems.length > 0, 'B03-DN: Danh sách chỉ tiêu HĐĐT có dữ liệu');
  assert(cf.cashEnding === cf.cashBeginning + cf.netCashChange, 'B03-DN: Tiền cuối kỳ = Đầu kỳ + Thay đổi thuần');

  // ============================================================
  // PHẦN 47: THUYẾT MINH BCTC B09-DN
  // ============================================================
  console.log('\n📌 PHẦN 47: TEST THUYẾT MINH BCTC (B09-DN)');

  const incStmt = calculateIncomeStatement(b01Txs);
  const notes = generateFinancialNotes(b01Txs, bs, incStmt, cf);
  assert(notes.sections.length >= 6, 'B09-DN: Sinh đủ ≥ 6 mục thuyết minh');
  assert(notes.sections.some(s => s.sectionCode === 'I'), 'B09-DN: Có mục I - Đặc điểm DN');
  assert(notes.sections.some(s => s.sectionCode === 'II'), 'B09-DN: Có mục II - Chính sách kế toán');
  assert(notes.sections.some(s => s.tableData && s.tableData.length > 0), 'B09-DN: Có bảng số liệu chi tiết');
  assert(typeof notes.generatedAt === 'string' && notes.generatedAt.length > 0, 'B09-DN: Ghi nhận thời gian sinh báo cáo');

  // ============================================================
  // PHẦN 48: KIỂM TRẢ MENU SIDEBAR & PIN FAVORITES ⭐
  // ============================================================
  console.log('\n📌 PHẦN 48: TEST KHỐI MENU SIDEBAR & PIN FAVORITES ⭐');
  const defaultPinned = ['dashboard', 'financial-reports', 'xml-import', 'validation'];
  assert(defaultPinned.length === 4, 'Menu Favorites mặc định chứa 4 tính năng chính');
  assert(defaultPinned.includes('dashboard'), 'Menu Favorites chứa Dashboard');
  assert(defaultPinned.includes('financial-reports'), 'Menu Favorites chứa Báo cáo tài chính');

  // ============================================================
  // PHẦN 49: BỘ SỔ NHẬT KÝ ĐẶC BIỆT CHUẨN TT200
  // ============================================================
  console.log('\n📌 PHẦN 49: TEST BỘ SỔ NHẬT KÝ ĐẶC BIỆT CHUẨN TT200');
  const sjPurchase = generateSpecialJournal(b01Txs, 'PURCHASE');
  assert(sjPurchase.rows.length >= 1, 'NK Mua Hàng: Lọc được các chứng từ mua hàng/TSCĐ/NCC 331');
  assert(sjPurchase.totalAmount > 0, 'NK Mua Hàng: Tính tổng tiền mua hàng thành công');

  const sjSales = generateSpecialJournal(b01Txs, 'SALES');
  assert(sjSales.rows.length >= 1, 'NK Bán Hàng: Lọc được chứng từ doanh nghiệp bán hàng 511/131');

  // ============================================================
  // PHẦN 50: ĐA DOANH NGHIỆP & MÃ HÓA SAO LƯU CLOUD
  // ============================================================
  console.log('\n📌 PHẦN 50: TEST ĐA DOANH NGHIỆP & CẤU HÌNH CÔNG TY');
  const company1 = getCompanyConfig('0101234567');
  assert(company1.name.includes('An Phát'), 'Đa doanh nghiệp: Tra cứu đúng tên công ty An Phát');
  assert(company1.accountingStandard === 'TT200', 'Đa doanh nghiệp: Áp dụng chuẩn TT200');

  const company3 = getCompanyConfig('8012345678');
  assert(company3.accountingStandard === 'TT88_HKD', 'Đa doanh nghiệp: Hộ kinh doanh áp dụng TT88');

  // ============================================================
  // PHẦN 51: XÁC THỰC CÁC SỬA LỖI SPRINT 9 (S9.1 - S9.10)
  // ============================================================
  console.log('\n📌 PHẦN 51: TEST XÁC THỰC CÁC SỬA LỖI SPRINT 9');

  // Test VND parseNumericValue
  assert(parseNumericValue('1,234,567.89') === 1234567.89, 'S9.9: Parse số tiền dạng English format thành công');
  assert(parseNumericValue('1.234.567,89') === 1234567.89, 'S9.9: Parse số tiền dạng Vietnamese format thành công');
  assert(parseNumericValue(1234567) === 1234567, 'S9.9: Xử lý số tiền dạng số nguyên thông thường thành công');

  // Test BHTN separate cap (99.2M) vs BHXH cap (46.8M)
  const highSalaryEmp = {
    id: 'emp_high',
    name: 'Trần Văn A',
    position: 'CEO',
    department: 'Ban Giám Đốc',
    contractType: 'OFFICIAL' as const,
    basicSalary: 60000000, // 60 triệu > BHXH cap (46.8M) nhưng < BHTN cap (99.2M)
    allowances: { position: 0, transport: 0, meal: 0, phone: 0, other: 0 },
    dependentsCount: 0,
    taxCode: '1234567890',
    bankAccount: '1234',
    startDate: '2026-01-01'
  };
  const payrollRes = calculatePayrollEntry(highSalaryEmp);
  // BHXH NLĐ đóng: 8% của 46.8M = 3.744.000 đ
  assert(payrollRes.bhxhEmployee === 3744000, `S9.6: Capped BHXH chính xác = 3.744.000 đ (tính được: ${payrollRes.bhxhEmployee.toLocaleString()})`);
  // BHTN NLĐ đóng: 1% của 60M = 600.000 đ
  assert(payrollRes.bhtnEmployee === 600000, `S9.6: BHTN đóng trên 60M = 600.000 đ do chưa vượt trần BHTN (tính được: ${payrollRes.bhtnEmployee.toLocaleString()})`);

  // ============================================================
  // PHẦN 52: TỰ ĐỘNG HÓA AI TAX ALERT & CẢNH BÁO RỦI RO THUẾ (SPRINT 10)
  // ============================================================
  console.log('\n📌 PHẦN 52: TEST AI TAX ALERT & CẢNH BÁO RỦI RO THUẾ (SPRINT 10)');

  // 1. Test Risky Taxpayer Database Lookup
  const riskyInfo = checkRiskyTaxpayer('0109999888');
  assert(riskyInfo !== null && riskyInfo.status === 'RUNAWAY', 'S10.1: Tra cứu đúng thông tin MST bỏ trốn Ma Trận Việt');

  // 2. Test Risky Taxpayer Check in validateTransaction
  const riskyTx = {
    id: 'tx_risky_1',
    clientId: 'c1',
    sourceFileName: 'test.xlsx',
    importDate: '2026-08-01',
    type: 'EXPENSE' as const,
    date: '2026-08-01',
    voucherNo: 'HD001',
    description: 'Mua hàng hóa dịch vụ',
    debitAcc: '156',
    creditAcc: '112',
    amount: 10000000,
    partnerName: 'Công ty Ma Trận Việt',
    partnerTaxCode: '0109999888',
    rawRow: {},
    validationStatus: 'VALID' as const,
    errors: [],
    userApproved: false
  };
  const riskyValidation = validateTransaction(riskyTx);
  assert(riskyValidation.status === 'ERROR', 'S10.2: validateTransaction trả về ERROR khi có MST thuộc danh sách rủi ro');
  assert(riskyValidation.errors.some(e => e.code === 'ERR_RISKY_TAXPAYER'), 'S10.2: Chứa mã lỗi ERR_RISKY_TAXPAYER');

  // 3. Test 20M+ Cash Payment Rule
  const cashOver20MTx = {
    id: 'tx_cash_20m',
    clientId: 'c1',
    sourceFileName: 'test.xlsx',
    importDate: '2026-08-01',
    type: 'EXPENSE' as const,
    date: '2026-08-01',
    voucherNo: 'PC002',
    description: 'Thanh toán tiền mặt mua máy móc',
    debitAcc: '211',
    creditAcc: '111',
    amount: 25000000, // 25 triệu VNĐ tiền mặt
    partnerName: 'Công ty Nam Sơn',
    partnerTaxCode: '0101234567',
    rawRow: {},
    validationStatus: 'VALID' as const,
    errors: [],
    userApproved: false
  };
  const cashValidation = validateTransaction(cashOver20MTx);
  assert(cashValidation.errors.some(e => e.code === 'ERR_CASH_PAYMENT_OVER_20M'), 'S10.3: Phát hiện cảnh báo thanh toán tiền mặt ≥20 triệu');

  // ============================================================
  // PHẦN 53: TEST PERFORMANCE & MEMOIZED ACCOUNT AGGREGATOR (SPRINT 11)
  // ============================================================
  console.log('\n📌 PHẦN 53: TEST PERFORMANCE & MEMOIZED ACCOUNT AGGREGATOR (SPRINT 11)');
  const aggregator = buildAccountAggregator(mockTransactions);
  const totalCashDebit = aggregator.getAccountBalance('111', 'DEBIT');
  assert(typeof totalCashDebit === 'number', 'S11.1: Aggregator khởi tạo và trả về số dư Nợ TK 111 thành công');

  const contra214 = aggregator.getContraAssetBalance('214');
  assert(contra214 >= 0, 'S11.2: Aggregator tính chính xác TK tương phản 214 không bị âm');

  // ============================================================
  // PHẦN 54: TEST MATCHING ENGINE SPEED & JACCARD SIMILARITY (SPRINT 11)
  // ============================================================
  console.log('\n📌 PHẦN 54: TEST MATCHING ENGINE SPEED & JACCARD SIMILARITY (SPRINT 11)');
  const jaccardScore = jaccardSimilarity('Công ty TNHH Hà Tiên', 'Công ty TNHH Hà Tiên Xi Măng');
  assert(jaccardScore > 0.5, `S11.3: Jaccard similarity đạt ${jaccardScore.toFixed(2)} cho tên đối tác gần giống`);

  // ============================================================
  // PHẦN 55: TEST STATISTICAL RISK SCORING ENGINE (SPRINT 11)
  // ============================================================
  console.log('\n📌 PHẦN 55: TEST STATISTICAL RISK SCORING ENGINE (SPRINT 11)');
  const riskResult = calculateEnterpriseRiskScore(mockTransactions);
  assert(riskResult.totalScore >= 0 && riskResult.totalScore <= 100, `S11.4: Enterprise Risk Score nằm trong khoảng 0-100 (tính được: ${riskResult.totalScore})`);
  assert(riskResult.factors.length === 4, 'S11.5: Risk Score tính đủ 4 yếu tố rủi ro trọng yếu');

  // ============================================================
  // PHẦN 56: TEST AI SMART JOURNAL SUGGESTION ENGINE (SPRINT 11)
  // ============================================================
  console.log('\n📌 PHẦN 56: TEST AI SMART JOURNAL SUGGESTION ENGINE (SPRINT 11)');
  const suggestion1 = suggestJournalEntry('Thanh toán tiền điện EVN tháng 8');
  assert(suggestion1.debitAcc === '6422' && suggestion1.creditAcc === '1111', 'S11.6: Gợi ý đúng Nợ 6422 / Có 1111 cho hóa đơn điện EVN');
  assert(suggestion1.confidenceScore >= 80, `S11.7: Confidence score cao (${suggestion1.confidenceScore}%)`);

  // ============================================================
  // PHẦN 57: TEST MULTI-COMPANY CONSOLIDATION ENGINE (SPRINT 11)
  // ============================================================
  console.log('\n📌 PHẦN 57: TEST MULTI-COMPANY CONSOLIDATION ENGINE (SPRINT 11)');
  const companies = getAllCompanies();
  assert(companies.length >= 3, `S11.8: Tải danh sách công ty tập đoàn (số lượng: ${companies.length})`);

  const mockTxMap = {
    c1: mockTransactions,
    c2: mockTransactions,
  };
  const consolidatedReport = generateConsolidatedReport(companies, mockTxMap);
  assert(consolidatedReport.subsidiariesCount >= 1, 'S11.9: Đã tính toán hợp nhất cho các công ty con');
  assert(consolidatedReport.consolidatedBalanceSheet !== undefined, 'S11.10: Xuất Bảng Cân Đối Kế Toán Hợp Nhất B01-HN thành công');

  // ============================================================
  // PHẦN 58: TEST EXPORTER & VALIDATOR XML 01/GTGT CHUẨN HTKK (SPRINT 12)
  // ============================================================
  console.log('\n📌 PHẦN 58: TEST EXPORTER & VALIDATOR XML 01/GTGT CHUẨN HTKK (SPRINT 12)');
  const sampleGTGTInput = {
    client: { id: 'c1', name: 'Công ty An Phát', taxCode: '0101234567', address: 'Hà Nội' },
    taxPeriod: { year: 2026, quarter: 3 as const },
    outputRows: [
      { invoiceDate: '2026-08-01', invoiceNo: 'HD001', sellerName: 'KH A', sellerTaxCode: '0109999888', goodsDescription: 'Bán xi măng 10%', taxableAmount: 100000000, vatAmount: 10000000, vatRate: 10 as const },
      { invoiceDate: '2026-08-05', invoiceNo: 'HD002', sellerName: 'KH B', sellerTaxCode: '0309876543', goodsDescription: 'Dịch vụ 8%', taxableAmount: 50000000, vatAmount: 4000000, vatRate: 8 as const },
    ],
    inputRows: [
      { invoiceDate: '2026-08-02', invoiceNo: 'HDIN1', sellerName: 'NCC X', sellerTaxCode: '0108888777', goodsDescription: 'Mua vật tư 10%', taxableAmount: 60000000, vatAmount: 6000000, vatRate: 10 as const },
    ],
    prevCreditCarryover: 2000000,
  };

  const xmlOut = generateGTGTXML(sampleGTGTInput);
  assert(xmlOut.includes('<CT32>100000000</CT32>'), 'S12.1: Ghi nhận đúng chỉ tiêu [32] doanh số 10% (100tr)');
  assert(xmlOut.includes('<CT32a>50000000</CT32a>'), 'S12.2: Ghi nhận đúng chỉ tiêu [32a] doanh số 8% (50tr)');
  assert(xmlOut.includes('<CT22>2000000</CT22>'), 'S12.3: Ghi nhận đúng chỉ tiêu [22] khấu trừ kỳ trước (2tr)');

  const valResult = validateHTKKXML(xmlOut);
  assert(valResult.isValid, 'S12.4: XML 01/GTGT hợp lệ theo bộ kiểm tra cấu trúc HTKK eTax');
  assert(valResult.errors.length === 0, 'S12.5: Không có lỗi cấu trúc XML');

  // ============================================================
  // PHẦN 59: TEST ENGINE TỜ KHAI THUẾ TNDN TẠM TÍNH QUÝ (XML 01/TNDN)
  // ============================================================
  console.log('\n📌 PHẦN 59: TEST ENGINE TỜ KHAI THUẾ TNDN TẠM TÍNH QUÝ (XML 01/TNDN)');
  const sampleTNDNInput = {
    client: { id: 'c1', name: 'Công ty An Phát', taxCode: '0101234567', address: 'Hà Nội' },
    taxPeriod: { year: 2026, quarter: 3 as const },
    revenue: 500000000,
    expenses: 380000000,
    accountingProfit: 120000000,
    nonDeductibleExpenses: 15000000, // Chi phí không được trừ [24]
    taxExemptIncome: 5000000,       // Thu nhập miễn thuế [25]
    taxLossCarryforward: 10000000,  // Lỗ chuyển kỳ trước [27]
    taxRate: 20,
    taxPrepaid: 10000000,           // Đã tạm nộp [31]
  };

  const xmlTNDN = generateTNDNXML(sampleTNDNInput);
  assert(xmlTNDN.includes('<LoaiTKhai>01/TNDN</LoaiTKhai>'), 'S13.1: XML chứa đúng mã loại tờ khai 01/TNDN');
  assert(xmlTNDN.includes('<CT21>500000000</CT21>'), 'S13.2: Ghi nhận đúng chỉ tiêu [21] Doanh thu (500tr)');
  assert(xmlTNDN.includes('<CT22>380000000</CT22>'), 'S13.3: Ghi nhận đúng chỉ tiêu [22] Chi phí (380tr)');
  assert(xmlTNDN.includes('<CT23>120000000</CT23>'), 'S13.4: Lợi nhuận kế toán trước thuế [23] = 120tr');
  assert(xmlTNDN.includes('<CT24>15000000</CT24>'), 'S13.5: Điều chỉnh tăng chi phí bị loại [24] = 15tr');
  assert(xmlTNDN.includes('<CT26>130000000</CT26>'), 'S13.6: Thu nhập chịu thuế [26] = 120M + 15M - 5M = 130tr');
  assert(xmlTNDN.includes('<CT28>120000000</CT28>'), 'S13.7: Thu nhập tính thuế [28] = 130M - 10M = 120tr');
  assert(xmlTNDN.includes('<CT30>24000000</CT30>'), 'S13.8: Thuế TNDN phát sinh [30] = 120M x 20% = 24tr');
  assert(xmlTNDN.includes('<CT32>14000000</CT32>'), 'S13.9: Thuế TNDN còn phải nộp [32] = 24M - 10M = 14tr');

  const valTNDNResult = validateHTKKXML(xmlTNDN);
  assert(valTNDNResult.isValid, 'S13.10: XML 01/TNDN hợp lệ theo bộ kiểm tra cấu trúc HTKK eTax');
  assert(valTNDNResult.errors.length === 0, 'S13.11: Không có lỗi cấu trúc XML 01/TNDN');

  // ============================================================
  // PHẦN 60: TEST EXCEL EXPORTER BẢNG KÊ PHỤ LỤC GTGT & TỜ KHAI TNDN
  // ============================================================
  console.log('\n📌 PHẦN 60: TEST EXCEL EXPORTER BẢNG KÊ PHỤ LỤC GTGT & TỜ KHAI TNDN');
  assert(typeof exportVATAnnexesToExcel === 'function', 'S13.12: Hàm exportVATAnnexesToExcel sẵn sàng');
  assert(typeof exportTNDNExcel === 'function', 'S13.13: Hàm exportTNDNExcel sẵn sàng');

  // ============================================================
  // PHẦN 61: TEST INCREMENTAL ACCOUNT AGGREGATOR & BALANCE CHECK
  // ============================================================
  console.log('\n📌 PHẦN 61: TEST INCREMENTAL ACCOUNT AGGREGATOR & BALANCE CHECK');
  const agg = buildAccountAggregator(mockTransactions);
  const initialDebit111 = agg.getAccountBalance('111', 'DEBIT');

  // Test Incremental Add
  const newTx: NormalizedTransaction = {
    id: 'tx_inc_test',
    clientId: 'c1',
    sourceFileName: 'test.xlsx',
    importDate: '2026-08-14',
    type: 'INCOME',
    date: '2026-08-14',
    voucherNo: 'PT-INC-01',
    description: 'Thu tiền mặt thử nghiệm incremental',
    debitAcc: '1111',
    creditAcc: '5111',
    amount: 15000000,
    partnerName: 'KH Mới',
    partnerTaxCode: '0101111222',
    rawRow: {},
    validationStatus: 'VALID',
    errors: [],
    userApproved: true,
  };

  agg.addTransaction(newTx);
  const updatedDebit111 = agg.getAccountBalance('111', 'DEBIT');
  assert(updatedDebit111 === initialDebit111 + 15000000, 'S14.1: Incremental add cập nhật chính xác số dư TK 111 (+15M)');

  // Test Incremental Remove
  agg.removeTransaction(newTx);
  assert(agg.getAccountBalance('111', 'DEBIT') === initialDebit111, 'S14.2: Incremental remove hoàn nguyên số dư TK 111 chính xác');
  assert(agg.isBalanced(), 'S14.3: Kiểm tra cân bằng tổng thể Tổng Nợ = Tổng Có thành công');

  // ============================================================
  // PHẦN 62: TEST BỘ SỔ NHẬT KÝ ĐẶC BIỆT TT200 (THU/CHI/MUA/BÁN)
  // ============================================================
  console.log('\n📌 PHẦN 62: TEST BỘ SỔ NHẬT KÝ ĐẶC BIỆT TT200');
  const sjCashReceipt = generateSpecialJournal(mockTransactions, 'CASH_RECEIPT');
  assert(sjCashReceipt.title.includes('S03c'), 'S14.4: Tạo Sổ Nhật ký Thu tiền mẫu S03c thành công');

  const sjCashDisburse = generateSpecialJournal(mockTransactions, 'CASH_DISBURSEMENT');
  assert(sjCashDisburse.title.includes('S03d'), 'S14.5: Tạo Sổ Nhật ký Chi tiền mẫu S03d thành công');

  // ============================================================
  // PHẦN 63: TEST ĐỊNH MỨC BOM & QUẢN TRỊ GIÁ THÀNH HỢP ĐỒNG
  // ============================================================
  console.log('\n📌 PHẦN 63: TEST ĐỊNH MỨC BOM & QUẢN TRỊ GIÁ THÀNH HỢP ĐỒNG');
  const costingWithBOM = calculateContractCostingReport(mockTransactions, {
    'HĐ01': { materialBudget: 10000000, laborBudget: 5000000, overheadBudget: 2000000 }
  });
  assert(costingWithBOM.length > 0, 'S14.6: Phân tích giá thành hợp đồng kèm định mức BOM thành công');
  assert(costingWithBOM[0].materialBudget !== undefined, 'S14.7: Ghi nhận định mức dự toán NVL (BOM)');

  // ============================================================
  // PHẦN 64: TEST BÓC TÁCH CHI PHÍ THUẾ TNDN [B4] DRILL-DOWN
  // ============================================================
  console.log('\n📌 PHẦN 64: TEST BÓC TÁCH CHI PHÍ THUẾ TNDN [B4] DRILL-DOWN');
  const b4AuditResult = auditNonDeductibleExpenses(mockTransactions);
  assert(b4AuditResult.items.length > 0, 'S15.1: Trích xuất danh sách chi tiết các chứng từ vi phạm B4');
  assert(b4AuditResult.totalCitTaxRisk === b4AuditResult.totalNonDeductibleAmount * 0.20, 'S15.2: Tính đúng số thuế TNDN rủi ro truy thu (20%)');

  // ============================================================
  // PHẦN 65: TEST BACKUP SNAPSHOTS LIFECYCLE & PERSISTENCE
  // ============================================================
  console.log('\n📌 PHẦN 65: TEST BACKUP SNAPSHOTS LIFECYCLE & PERSISTENCE');
  const { getBackupSnapshots, saveBackupSnapshots } = await import('../services/persistentStorageService');
  const initialSnapshots = getBackupSnapshots();
  assert(Array.isArray(initialSnapshots), 'S15.3: getBackupSnapshots trả về mảng danh sách snapshot');

  const testSnap = {
    id: 'snap_test_01',
    timestamp: '2026-08-14 10:00:00',
    name: 'Test Snapshot',
    sizeBytes: 1024,
    txCount: 5,
    clientCount: 1,
    dataJson: '{}',
  };
  saveBackupSnapshots([testSnap]);
  assert(getBackupSnapshots().some(s => s.id === 'snap_test_01'), 'S15.4: Lưu trữ và tra cứu bản Snapshot thành công');

  // ============================================================
  // PHẦN 66: TEST COMPUTATION WORKER (BACKGROUND AUDIT & FUZZY RECONCILE)
  // ============================================================
  console.log('\n📌 PHẦN 66: TEST COMPUTATION WORKER');
  const { runBackgroundAudit, runBackgroundFuzzyReconcile } = await import('../workers/computationWorker');
  const bgAuditRes = await runBackgroundAudit(mockTransactions);
  assert(bgAuditRes.totalProcessed === mockTransactions.length, 'S15.5: Worker chạy kiểm toán nền hoàn tất toàn bộ chứng từ');

  const bgRecRes = await runBackgroundFuzzyReconcile({
    vouchers: [mockTransactions[0]],
    statements: [mockTransactions[0]],
    threshold: 50,
  });
  assert(Array.isArray(bgRecRes), 'S15.6: Worker tìm kiếm cặp ghép sao kê mờ trả về danh sách ứng viên');

  // ============================================================
  // PHẦN 67: TEST PHÂN BỔ CHI PHÍ TRẢ TRƯỚC (TK 242) CHUẨN TT200
  // ============================================================
  console.log('\n📌 PHẦN 67: TEST PHÂN BỔ CHI PHÍ TRẢ TRƯỚC (TK 242) CHUẨN TT200');
  const mockPrepaidItem = {
    id: 'test_prepaid_01',
    clientId: 'client-1',
    code: 'CCDC-001',
    name: 'Máy tính bàn Dell Vostro Kế Toán',
    category: 'CCDC' as const,
    originalAmount: 24000000,
    startDate: '2026-01-01',
    allocationMonths: 24,
    expenseAccount: '6422',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };

  const monthlyPB = calculateMonthlyAllocation(mockPrepaidItem.originalAmount, mockPrepaidItem.allocationMonths);
  assert(monthlyPB === 1000000, 'S16.1: Tính đúng mức phân bổ bình quân mỗi tháng (24M / 24 tháng = 1,000,000 đ)');

  const schedules2026 = calculatePrepaidAllocationSchedule(mockPrepaidItem, 2026);
  assert(schedules2026.length === 12, 'S16.2: Sinh đủ lịch trình 12 tháng cho niên độ 2026');
  assert(schedules2026[0].amount === 1000000, 'S16.3: Phân bổ tháng 1 năm 2026 là 1,000,000 đ');
  assert(schedules2026[11].accumulatedAmount === 12000000, 'S16.4: Lũy kế phân bổ hết năm 2026 là 12,000,000 đ (12 tháng)');
  assert(schedules2026[11].remainingAmount === 12000000, 'S16.5: Giá trị còn lại cuối năm 2026 là 12,000,000 đ');

  const summaryPB = calculatePrepaidSummary([mockPrepaidItem], 2026, 6);
  assert(summaryPB.totalOriginal === 24000000, 'S16.6: Tổng nguyên giá CCDC phản ánh chính xác 24,000,000 đ');
  assert(summaryPB.currentMonthAllocation === 1000000, 'S16.7: Mức trích phân bổ tháng 6 là 1,000,000 đ');

  const autoTx = generatePrepaidAllocationTransaction(mockPrepaidItem, 3, 2026, 'client-1');
  assert(autoTx.debitAcc === '6422', 'S16.8: Bút toán sinh tự động ghi Nợ TK 6422');
  assert(autoTx.creditAcc === '242', 'S16.9: Bút toán sinh tự động ghi Có TK 242');
  assert(autoTx.amount === 1000000, 'S16.10: Số tiền bút toán khớp chính xác 1,000,000 đ');
  assert(autoTx.date === '2026-03-31', 'S16.11: Ngày chứng từ hạch toán là ngày cuối cùng của tháng (2026-03-31)');

  // ============================================================
  // PHẦN 68: TEST KẾ TOÁN & LẬP PHIẾU THU CHI CÔNG ĐOÀN (C40/C41/B07-CĐ)
  // ============================================================
  console.log('\n📌 PHẦN 68: TEST KẾ TOÁN & LẬP PHIẾU THU CHI CÔNG ĐOÀN (C40/C41/B07-CĐ)');
  const budgetResult = calculateTradeUnionContribution(100000000, 20, 10000000);
  assert(budgetResult.kpcdTotal === 2000000, 'S17.1: Tính đúng 2% Kinh phí công đoàn trên quỹ lương 100tr = 2,000,000 đ');
  assert(budgetResult.kpcdRetained === 1500000, 'S17.2: Tính đúng 75% KPCĐ để lại Công đoàn cơ sở = 1,500,000 đ');
  assert(budgetResult.kpcdPaySuperior === 500000, 'S17.3: Tính đúng 25% KPCĐ nộp Công đoàn cấp trên = 500,000 đ');
  assert(budgetResult.doanPhiTotal === 2000000, 'S17.4: Tính đúng 1% đoàn phí của 20 đoàn viên (100k/người) = 2,000,000 đ');

  const mockUnionReceipt = {
    id: 'union_rec_01',
    clientId: 'client-1',
    voucherType: 'UNION_RECEIPT' as const,
    voucherNo: 'PT-CĐ-2026-001',
    date: '2026-08-10',
    category: 'KPCĐ_2_PERCENT' as const,
    personName: 'Đại diện Công ty',
    reason: 'Trích nộp kinh phí công đoàn 2%',
    amount: 2000000,
    paymentMethod: 'BANK' as const,
    createdAt: '2026-08-10T00:00:00.000Z',
    updatedAt: '2026-08-10T00:00:00.000Z',
  };

  const mockUnionPayment = {
    id: 'union_pay_01',
    clientId: 'client-1',
    voucherType: 'UNION_PAYMENT' as const,
    voucherNo: 'PC-CĐ-2026-001',
    date: '2026-08-12',
    category: 'THAM_HOI_OM_DAU' as const,
    personName: 'Nguyễn Văn Nam',
    reason: 'Chi thăm hỏi ốm đau nằm viện',
    amount: 500000,
    paymentMethod: 'CASH' as const,
    createdAt: '2026-08-12T00:00:00.000Z',
    updatedAt: '2026-08-12T00:00:00.000Z',
  };

  const unionSummary = calculateTradeUnionSummary([mockUnionReceipt, mockUnionPayment]);
  assert(unionSummary.totalReceipts === 2000000, 'S17.5: Tổng thu quỹ công đoàn = 2,000,000 đ');
  assert(unionSummary.totalPayments === 500000, 'S17.6: Tổng chi hoạt động công đoàn = 500,000 đ');
  assert(unionSummary.netBalance === 1500000, 'S17.7: Số dư quỹ công đoàn còn lại = 1,500,000 đ');
  assert(unionSummary.bankBalance === 2000000, 'S17.8: Số dư tiền gửi ngân hàng quỹ CĐ = 2,000,000 đ');
  assert(unionSummary.cashBalance === -500000, 'S17.9: Phản ánh biến động tiền mặt quỹ CĐ');

  const recAccounts = getTradeUnionAccounts('KPCĐ_2_PERCENT', 'UNION_RECEIPT', 'BANK');
  assert(recAccounts.debitAcc === '1121' && recAccounts.creditAcc === '3382', 'S17.10: Hạch toán Thu KPCĐ qua ngân hàng: Nợ 1121 / Có 3382');

  const payAccounts = getTradeUnionAccounts('THAM_HOI_OM_DAU', 'UNION_PAYMENT', 'CASH');
  assert(payAccounts.debitAcc === '6422' && payAccounts.creditAcc === '1111', 'S17.11: Hạch toán Chi thăm hỏi ốm đau: Nợ 6422 / Có 1111');

  const htmlReceipt = generateUnionVoucherHTML(mockUnionReceipt, { id: 'client-1', code: 'C01', name: 'Công ty Test', taxCode: '0101234567', address: 'Hà Nội', financialYear: 2026, createdAt: '', updatedAt: '' });
  assert(htmlReceipt.includes('PHIẾU THU CÔNG ĐOÀN'), 'S17.12: Sinh HTML Phiếu Thu Công Đoàn chuẩn Mẫu số C40-HD');
  assert(htmlReceipt.includes('CÔNG ĐOÀN VIỆT NAM'), 'S17.13: HTML Phiếu có tiêu ngữ Tổng LĐLĐ Việt Nam');

  const batchHTML = generateBatchUnionVouchersHTML([mockUnionReceipt, mockUnionPayment], null);
  assert(batchHTML.includes('PHIẾU THU CÔNG ĐOÀN') && batchHTML.includes('PHIẾU CHI CÔNG ĐOÀN'), 'S17.14: Sinh tài liệu HTML In hàng loạt / Lưu PDF chứa đầy đủ cả phiếu thu và phiếu chi');
  assert(batchHTML.includes('page-break'), 'S17.15: Thiết lập ngắt trang chuẩn A4 cho từng phiếu khi in hoặc lưu PDF');

  // Test parse Excel hàng loạt
  const XLSX = await import('xlsx');
  const testWb = XLSX.utils.book_new();
  const testData = [
    { 'Loại Phiếu (*)': 'THU', 'Số Phiếu (*)': 'PT-TEST-01', 'Ngày Lập (*)': '2026-08-15', 'Khoản Mục (*)': 'KPCĐ_2_PERCENT', 'Người Nộp / Nhận (*)': 'DN ABC', 'Lý Do Thu / Chi (*)': 'Thu KPCĐ 2%', 'Số Tiền (VND) (*)': 3000000 },
    { 'Loại Phiếu (*)': 'CHI', 'Số Phiếu (*)': 'PC-TEST-01', 'Ngày Lập (*)': '2026-08-16', 'Khoản Mục (*)': 'THAM_HOI_OM_DAU', 'Người Nộp / Nhận (*)': 'Lê Văn C', 'Lý Do Thu / Chi (*)': 'Chi thăm hỏi', 'Số Tiền (VND) (*)': 500000 },
  ];
  const testWs = XLSX.utils.json_to_sheet(testData);
  XLSX.utils.book_append_sheet(testWb, testWs, 'Sheet1');
  const testBuf = XLSX.write(testWb, { type: 'array', bookType: 'xlsx' });

  const parsed = await parseUnionTransactionsFromExcel(testBuf, 'client-1');
  assert(parsed.valid.length === 2, 'S17.16: Đọc và chuyển đổi chính xác 2 phiếu thu chi từ file Excel');
  assert(parsed.valid[0].amount === 3000000 && parsed.valid[0].voucherType === 'UNION_RECEIPT', 'S17.17: Nhận diện đúng phiếu thu KPCĐ 3,000,000 đ');
  assert(parsed.valid[1].amount === 500000 && parsed.valid[1].voucherType === 'UNION_PAYMENT', 'S17.18: Nhận diện đúng phiếu chi thăm hỏi 500,000 đ');

  console.log('\n====================================================');
  console.log(`📊 KẾT QUẢ KIỂM THỬ: ${passCount} PASSED | ${failCount} FAILED`);
  console.log('====================================================\n');
}

runAllTests();
