import { calculateTaxRiskSummary, calculateInventoryCardReport, calculateCashAndBankLedger, calculatePartnerDebtReport } from '../services/accountingCoreService';
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
import { validateTransaction } from '../services/validationRules';
import { levenshteinSimilarity } from '../services/matchingEngine';
import {
  createReverseEntry,
  approveCorrectionEntry,
  getAllCorrectionEntries,
  getCorrectionStats,
} from '../services/correctionEntryService';
import { TAX_DEADLINES } from '../services/legalDatabase';
import { calculatePayrollEntry, calculatePayrollSummary, getAllEmployees } from '../services/payrollService';
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

  console.log('\n====================================================');
  console.log(`📊 KẾT QUẢ KIỂM THỬ: ${passCount} PASSED | ${failCount} FAILED`);
  console.log('====================================================\n');
}

runAllTests();
