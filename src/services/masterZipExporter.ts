import JSZip from 'jszip';
import * as XLSX from 'xlsx';
import { NormalizedTransaction, Client } from '../types/accounting';
import { calculateTrialBalancePivot, calculateIncomeStatement } from './financialReportService';
import { calculateInventoryCardReport, calculatePartnerDebtReport, calculateCashAndBankLedger } from './accountingCoreService';

export const exportMasterAccountingZipPackage = async (
  client: Client | null,
  transactions: NormalizedTransaction[]
): Promise<void> => {
  const zip = new JSZip();
  const clientName = client ? client.name.replace(/[^a-zA-Z0-9_]/g, '_') : 'Doanh_Nghiep';
  const year = client ? client.financialYear : 2026;

  // 1. Bảng Cân Đối Phát Sinh Pivot (1xx - 9xx)
  const trialBalance = calculateTrialBalancePivot(transactions);
  const tbSheetData = trialBalance.map(item => ({
    'Mã TK': item.accountCode,
    'Tên Tài Khoản': item.accountName,
    'Phát Sinh Nợ (VNĐ)': item.periodDebit,
    'Phát Sinh Có (VNĐ)': item.periodCredit,
    'Dư Nợ Cuối Kỳ': item.closingDebit,
    'Dư Có Cuối Kỳ': item.closingCredit,
  }));
  const wb1 = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb1, XLSX.utils.json_to_sheet(tbSheetData), 'Can_Doi_Phat_Sinh');
  const excelBuf1 = XLSX.write(wb1, { bookType: 'xlsx', type: 'array' });
  zip.file(`1_Bang_Can_Doi_Phat_Sinh_1xx_9xx.xlsx`, excelBuf1);

  // 2. Báo Cáo Kết Quả Kinh Doanh P&L (B02-DN)
  const pnl = calculateIncomeStatement(transactions);
  const pnlData = [
    { 'Chỉ tiêu': '1. Doanh thu bán hàng & CCDV (TK 511)', 'Số tiền (VNĐ)': pnl.grossRevenue },
    { 'Chỉ tiêu': '2. Giá vốn hàng bán (TK 632)', 'Số tiền (VNĐ)': pnl.cogs },
    { 'Chỉ tiêu': '3. LỢI NHUẬN GỘP BÁN HÀNG', 'Số tiền (VNĐ)': pnl.grossProfit },
    { 'Chỉ tiêu': '4. Chi phí quản lý doanh nghiệp (TK 642)', 'Số tiền (VNĐ)': pnl.adminExpense },
    { 'Chỉ tiêu': '5. TỔNG LỢI NHUẬN KẾ TOÁN TRƯỚC THUẾ', 'Số tiền (VNĐ)': pnl.profitBeforeTax },
    { 'Chỉ tiêu': '6. Chi phí thuế TNDN hiện hành (20%)', 'Số tiền (VNĐ)': pnl.citTaxExpense },
    { 'Chỉ tiêu': '7. LỢI NHUẬN SAU THUẾ TNDN', 'Số tiền (VNĐ)': pnl.profitAfterTax },
  ];
  const wb2 = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb2, XLSX.utils.json_to_sheet(pnlData), 'KQKD_P&L');
  const excelBuf2 = XLSX.write(wb2, { bookType: 'xlsx', type: 'array' });
  zip.file(`2_Bao_Cao_Ket_Qua_Kinh_Doanh_B02.xlsx`, excelBuf2);

  // 3. Bảng Cân Đối Nhập - Xuất - Tồn Kho
  const inventory = calculateInventoryCardReport(transactions);
  const invData = inventory.map(item => ({
    'Mặt Hàng / Vật Tư': item.itemName,
    'SL Nhập': item.importedQty,
    'SL Xuất': item.exportedQty,
    'SL Tồn Cuối': item.closingQty,
    'Tổng Tiền Nhập (VNĐ)': item.totalImportAmount,
    'Đơn Giá Bình Quân': Math.round(item.avgPrice),
  }));
  const wb3 = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb3, XLSX.utils.json_to_sheet(invData), 'Nhap_Xuat_Ton');
  const excelBuf3 = XLSX.write(wb3, { bookType: 'xlsx', type: 'array' });
  zip.file(`3_Bang_Can_Doi_Kho_Hang.xlsx`, excelBuf3);

  // 4. Bảng Tổng Hợp Công Nợ (131 / 331)
  const debt = calculatePartnerDebtReport(transactions);
  const debtData = debt.map(d => ({
    'Đối Tác': d.partnerName,
    'Mã Số Thuế': d.taxCode || '',
    'Phân Loại': d.type === 'RECEIVABLE_131' ? 'Khách Hàng (131)' : 'Nhà Cung Cấp (331)',
    'Nợ Tăng (VNĐ)': d.increasedDebt,
    'Đã Thanh Toán (VNĐ)': d.decreasedDebt,
    'Dư Nợ Cuối Kỳ': d.closingDebt,
  }));
  const wb4 = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb4, XLSX.utils.json_to_sheet(debtData), 'Cong_No_131_331');
  const excelBuf4 = XLSX.write(wb4, { bookType: 'xlsx', type: 'array' });
  zip.file(`4_Bang_Tong_Hop_Cong_No.xlsx`, excelBuf4);

  // Download Zip Blob
  const zipBlob = await zip.generateAsync({ type: 'blob' });
  const downloadUrl = URL.createObjectURL(zipBlob);
  const link = document.createElement('a');
  link.href = downloadUrl;
  link.download = `Bo_Ho_So_Ke_Toan_${clientName}_${year}.zip`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(downloadUrl);
};
