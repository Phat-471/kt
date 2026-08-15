import { TradeUnionTransaction, TradeUnionCategory, TradeUnionVoucherType, Client } from '../types/accounting';
import { numberToVietnameseWords } from './documentGenerator';
import * as XLSX from 'xlsx';

export function getTradeUnionCategoryLabel(category: TradeUnionCategory): string {
  switch (category) {
    case 'KPCĐ_2_PERCENT':
      return 'Kinh phí công đoàn 2% (DN trích nộp)';
    case 'DOAN_PHI_1_PERCENT':
      return 'Đoàn phí công đoàn 1% (Đoàn viên đóng)';
    case 'KINH_PHI_CAP_TREN':
      return 'Kinh phí CĐ cấp trên cấp về';
    case 'HO_TRO_KHAC':
      return 'Hỗ trợ từ Doanh nghiệp & Tài trợ';
    case 'THAM_HOI_OM_DAU':
      return 'Chi thăm hỏi ốm đau, hiếu hỉ, thai sản';
    case 'QUA_LE_TET':
      return 'Chi quà Tết, 8/3, 20/10, Trung thu, 1/6';
    case 'HOAT_DONG_PHONG_TRAO':
      return 'Chi văn nghệ, thể thao, hội thao, du lịch';
    case 'KHEN_THUONG':
      return 'Chi khen thưởng đoàn viên xuất sắc';
    case 'NOP_CAP_TREN_25':
      return 'Nộp 25% KPCĐ lên Công đoàn cấp trên';
    case 'PHU_CAP_CAN_BO_CD':
      return 'Phụ cấp cán bộ công đoàn & quản lý CĐ';
    case 'CHI_KHAC':
    default:
      return 'Khoản chi công đoàn khác';
  }
}

export function getTradeUnionAccounts(
  category: TradeUnionCategory,
  voucherType: TradeUnionVoucherType,
  paymentMethod: 'CASH' | 'BANK' = 'CASH'
): { debitAcc: string; creditAcc: string } {
  const fundAcc = paymentMethod === 'BANK' ? '1121' : '1111';

  if (voucherType === 'UNION_RECEIPT') {
    switch (category) {
      case 'KPCĐ_2_PERCENT':
        return { debitAcc: fundAcc, creditAcc: '3382' };
      case 'DOAN_PHI_1_PERCENT':
        return { debitAcc: fundAcc, creditAcc: '3382' };
      case 'KINH_PHI_CAP_TREN':
      case 'HO_TRO_KHAC':
      default:
        return { debitAcc: fundAcc, creditAcc: '511' };
    }
  } else {
    switch (category) {
      case 'NOP_CAP_TREN_25':
        return { debitAcc: '3382', creditAcc: fundAcc };
      case 'THAM_HOI_OM_DAU':
      case 'QUA_LE_TET':
      case 'HOAT_DONG_PHONG_TRAO':
      case 'KHEN_THUONG':
      case 'PHU_CAP_CAN_BO_CD':
      case 'CHI_KHAC':
      default:
        return { debitAcc: '6422', creditAcc: fundAcc };
    }
  }
}

export function calculateTradeUnionContribution(
  payrollGrossInsurance: number,
  unionMembersCount: number = 0,
  avgMemberSalary: number = 0
) {
  // 1. Kinh phí công đoàn (2% trên tổng quỹ lương đóng BHXH)
  const kpcdTotal = Math.round(payrollGrossInsurance * 0.02);
  
  // 75% kinh phí để lại CĐ cơ sở chi hoạt động
  const kpcdRetained = Math.round(kpcdTotal * 0.75);
  
  // 25% kinh phí nộp công đoàn cấp trên (Liên đoàn lao động quận/huyện)
  const kpcdPaySuperior = kpcdTotal - kpcdRetained;

  // 2. Đoàn phí công đoàn (1% lương đoàn viên, trần tối đa 10% mức lương cơ sở ~ 234.000 đ)
  const cappedMemberDoanPhi = Math.min(Math.round(avgMemberSalary * 0.01), 234000);
  const doanPhiTotal = unionMembersCount * cappedMemberDoanPhi;

  const totalUnionBudget = kpcdRetained + doanPhiTotal;

  return {
    payrollGrossInsurance,
    unionMembersCount,
    kpcdTotal,
    kpcdRetained,
    kpcdPaySuperior,
    doanPhiTotal,
    totalUnionBudget,
  };
}

export function calculateTradeUnionSummary(transactions: TradeUnionTransaction[]) {
  let totalReceipts = 0;
  let totalPayments = 0;
  let cashBalance = 0;
  let bankBalance = 0;

  const receiptsByCategory: Partial<Record<TradeUnionCategory, number>> = {};
  const paymentsByCategory: Partial<Record<TradeUnionCategory, number>> = {};

  transactions.forEach(tx => {
    if (tx.voucherType === 'UNION_RECEIPT') {
      totalReceipts += tx.amount;
      receiptsByCategory[tx.category] = (receiptsByCategory[tx.category] || 0) + tx.amount;
      if (tx.paymentMethod === 'BANK') bankBalance += tx.amount;
      else cashBalance += tx.amount;
    } else {
      totalPayments += tx.amount;
      paymentsByCategory[tx.category] = (paymentsByCategory[tx.category] || 0) + tx.amount;
      if (tx.paymentMethod === 'BANK') bankBalance -= tx.amount;
      else cashBalance -= tx.amount;
    }
  });

  const netBalance = totalReceipts - totalPayments;

  return {
    totalReceipts,
    totalPayments,
    netBalance,
    cashBalance,
    bankBalance,
    receiptCount: transactions.filter(t => t.voucherType === 'UNION_RECEIPT').length,
    paymentCount: transactions.filter(t => t.voucherType === 'UNION_PAYMENT').length,
    receiptsByCategory,
    paymentsByCategory,
  };
}

/** Chuẩn hóa Unicode NFC */
function nfc(str: string | undefined | null): string {
  if (!str) return '';
  return str.normalize('NFC');
}

export function generateUnionVoucherHTML(tx: TradeUnionTransaction, client: Client | null): string {
  const isReceipt = tx.voucherType === 'UNION_RECEIPT';
  const voucherTitle = isReceipt ? 'PHIẾU THU CÔNG ĐOÀN' : 'PHIẾU CHI CÔNG ĐOÀN';
  const formCode = isReceipt ? 'Mẫu số C40-HD' : 'Mẫu số C41-HD';
  const accounts = getTradeUnionAccounts(tx.category, tx.voucherType, tx.paymentMethod);

  const clientName = client?.name || 'CÔNG ĐOÀN CƠ SỞ DOANH NGHIỆP';
  const clientTaxCode = client?.taxCode || '---';
  const clientAddress = client?.address || '---';

  const dateObj = new Date(tx.date);
  const day = dateObj.getDate();
  const month = dateObj.getMonth() + 1;
  const year = dateObj.getFullYear();
  const dateString = `Ngày ${day < 10 ? '0' + day : day} tháng ${month < 10 ? '0' + month : month} năm ${year}`;

  const amountInWords = numberToVietnameseWords(tx.amount);

  return `
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <title>${voucherTitle} - ${tx.voucherNo}</title>
  <style>
    @page { size: A4 portrait; margin: 20mm; }
    body {
      font-family: 'Times New Roman', Times, serif;
      font-size: 13pt;
      line-height: 1.4;
      color: #000;
      margin: 0;
      padding: 0;
    }
    .header-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 15px;
    }
    .header-table td {
      vertical-align: top;
    }
    .union-title {
      font-weight: bold;
      text-transform: uppercase;
      font-size: 11pt;
    }
    .form-code {
      text-align: right;
      font-size: 10pt;
      font-style: italic;
    }
    .title-section {
      text-align: center;
      margin: 20px 0 15px 0;
    }
    .main-title {
      font-size: 17pt;
      font-weight: bold;
      letter-spacing: 0.5px;
      margin: 0;
      text-transform: uppercase;
    }
    .voucher-date {
      font-style: italic;
      font-size: 11pt;
      margin-top: 5px;
    }
    .voucher-no {
      text-align: center;
      font-size: 11pt;
      font-weight: bold;
      margin-top: 2px;
    }
    .acc-box {
      text-align: right;
      font-size: 11pt;
      margin-top: -30px;
      margin-bottom: 15px;
    }
    .content-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 20px;
    }
    .content-table td {
      padding: 5px 0;
      vertical-align: top;
    }
    .label {
      width: 190px;
      white-space: nowrap;
    }
    .dots {
      border-bottom: 1px dotted #555;
      display: inline-block;
      width: 100%;
      min-height: 18px;
    }
    .amount-highlight {
      font-weight: bold;
      font-size: 14pt;
    }
    .signatures-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 25px;
      page-break-inside: avoid;
    }
    .signatures-table td {
      text-align: center;
      vertical-align: top;
      width: 25%;
      font-size: 11pt;
    }
    .sign-role {
      font-weight: bold;
      margin-bottom: 5px;
    }
    .sign-note {
      font-style: italic;
      font-size: 9.5pt;
      color: #444;
    }
    .sign-space {
      height: 70px;
    }
    .sign-name {
      font-weight: bold;
    }
    @media print {
      body { -webkit-print-color-adjust: exact; }
    }
  </style>
</head>
<body>
  <table class="header-table">
    <tr>
      <td style="width: 60%;">
        <div class="union-title">CÔNG ĐOÀN VIỆT NAM</div>
        <div style="font-weight: bold; font-size: 10.5pt;">CÔNG ĐOÀN CƠ SỞ: ${nfc(clientName)}</div>
        <div style="font-size: 10pt;">Địa chỉ: ${nfc(clientAddress)}</div>
        <div style="font-size: 10pt;">Mã số thuế: ${nfc(clientTaxCode)}</div>
      </td>
      <td style="width: 40%;" class="form-code">
        <strong>${formCode}</strong><br>
        (Ban hành theo Quyết định số 1908/QĐ-TLĐ<br>của Tổng Liên đoàn Lao động VN)
      </td>
    </tr>
  </table>

  <div class="title-section">
    <h1 class="main-title">${voucherTitle}</h1>
    <div class="voucher-date">${dateString}</div>
    <div class="voucher-no">Số: ${nfc(tx.voucherNo)}</div>
  </div>

  <div class="acc-box">
    <div>Nợ: <strong>${accounts.debitAcc}</strong></div>
    <div>Có: <strong>${accounts.creditAcc}</strong></div>
  </div>

  <table class="content-table">
    <tr>
      <td class="label">${isReceipt ? 'Họ và tên người nộp tiền:' : 'Họ và tên người nhận tiền:'}</td>
      <td style="font-weight: bold;">${nfc(tx.personName)}</td>
    </tr>
    <tr>
      <td class="label">Bộ phận / Tổ công đoàn:</td>
      <td>${nfc(tx.department || 'Ban Chấp Hành Công Đoàn Cơ Sở')}</td>
    </tr>
    <tr>
      <td class="label">${isReceipt ? 'Lý do nộp:' : 'Lý do chi:'}</td>
      <td>${nfc(tx.reason)} (${getTradeUnionCategoryLabel(tx.category)})</td>
    </tr>
    <tr>
      <td class="label">Số tiền:</td>
      <td class="amount-highlight">${tx.amount.toLocaleString('vi-VN')} VNĐ</td>
    </tr>
    <tr>
      <td class="label">Bằng chữ:</td>
      <td style="font-style: italic; font-weight: 600;">${amountInWords}</td>
    </tr>
    <tr>
      <td class="label">Hình thức:</td>
      <td>${tx.paymentMethod === 'BANK' ? 'Chuyển khoản Ngân hàng (TK 1121)' : 'Tiền mặt tại quỹ (TK 1111)'}</td>
    </tr>
    <tr>
      <td class="label">Kèm theo:</td>
      <td>${nfc(tx.attachedDocs || '01')} chứng từ gốc hợp lệ</td>
    </tr>
  </table>

  <table class="signatures-table">
    <tr>
      <td>
        <div class="sign-role">Chủ tịch CĐ / Thủ trưởng</div>
        <div class="sign-note">(Ký, họ tên, đóng dấu)</div>
        <div class="sign-space"></div>
        <div class="sign-name">....................................</div>
      </td>
      <td>
        <div class="sign-role">Kế toán Công đoàn</div>
        <div class="sign-note">(Ký, họ tên)</div>
        <div class="sign-space"></div>
        <div class="sign-name">....................................</div>
      </td>
      <td>
        <div class="sign-role">${isReceipt ? 'Người nộp tiền' : 'Người nhận tiền'}</div>
        <div class="sign-note">(Ký, họ tên)</div>
        <div class="sign-space"></div>
        <div class="sign-name">${nfc(tx.personName)}</div>
      </td>
      <td>
        <div class="sign-role">Thủ quỹ Công đoàn</div>
        <div class="sign-note">(Ký, họ tên)</div>
        <div class="sign-space"></div>
        <div class="sign-name">....................................</div>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}

export function exportUnionFinancialReportToExcel(
  transactions: TradeUnionTransaction[],
  client: Client | null,
  year: number
): void {
  const wb = XLSX.utils.book_new();

  // Sheet 1: Danh sách chi tiết các phiếu thu/chi công đoàn
  const rows = transactions.map((t, index) => {
    const isReceipt = t.voucherType === 'UNION_RECEIPT';
    const accs = getTradeUnionAccounts(t.category, t.voucherType, t.paymentMethod);

    return {
      'STT': index + 1,
      'Loại Phiếu': isReceipt ? 'Phiếu Thu (C40-HD)' : 'Phiếu Chi (C41-HD)',
      'Số Chứng Từ': t.voucherNo,
      'Ngày Lập': t.date,
      'Khoản Mục Thu/Chi': getTradeUnionCategoryLabel(t.category),
      'Người Nộp / Nhận': t.personName,
      'Tổ Công Đoàn / Bộ Phận': t.department || 'CĐCS',
      'Lý Do Nội Dung': t.reason,
      'TK Nợ': accs.debitAcc,
      'TK Có': accs.creditAcc,
      'Thu (VND)': isReceipt ? t.amount : 0,
      'Chi (VND)': !isReceipt ? t.amount : 0,
      'Hình Thức': t.paymentMethod === 'BANK' ? 'Chuyển khoản' : 'Tiền mặt',
      'Chứng Từ Kèm Theo': t.attachedDocs || '',
      'Ghi Chú': t.notes || '',
    };
  });

  const ws = XLSX.utils.json_to_sheet(rows);
  ws['!cols'] = [
    { wch: 6 },
    { wch: 20 },
    { wch: 18 },
    { wch: 14 },
    { wch: 36 },
    { wch: 24 },
    { wch: 22 },
    { wch: 38 },
    { wch: 10 },
    { wch: 10 },
    { wch: 18 },
    { wch: 18 },
    { wch: 15 },
    { wch: 18 },
    { wch: 20 },
  ];

  XLSX.utils.book_append_sheet(wb, ws, `So_Quy_Cong_Doan_${year}`);

  // Sheet 2: Báo cáo tổng hợp quyết toán tài chính công đoàn (Mẫu B07-CĐ)
  const summary = calculateTradeUnionSummary(transactions);
  const summaryRows = [
    { 'Chỉ Tiêu Quyết Toán Tài Chính Công Đoàn': 'I. TỔNG THU KINH PHÍ & ĐOÀN PHÍ CÔNG ĐOÀN', 'Số Tiền (VND)': summary.totalReceipts },
    { 'Chỉ Tiêu Quyết Toán Tài Chính Công Đoàn': '  1. Kinh phí công đoàn 2% do DN trích nộp', 'Số Tiền (VND)': summary.receiptsByCategory['KPCĐ_2_PERCENT'] || 0 },
    { 'Chỉ Tiêu Quyết Toán Tài Chính Công Đoàn': '  2. Đoàn phí công đoàn 1% do đoàn viên đóng', 'Số Tiền (VND)': summary.receiptsByCategory['DOAN_PHI_1_PERCENT'] || 0 },
    { 'Chỉ Tiêu Quyết Toán Tài Chính Công Đoàn': '  3. Kinh phí CĐ cấp trên cấp về', 'Số Tiền (VND)': summary.receiptsByCategory['KINH_PHI_CAP_TREN'] || 0 },
    { 'Chỉ Tiêu Quyết Toán Tài Chính Công Đoàn': '  4. Doanh nghiệp và nhà tài trợ hỗ trợ', 'Số Tiền (VND)': summary.receiptsByCategory['HO_TRO_KHAC'] || 0 },
    { 'Chỉ Tiêu Quyết Toán Tài Chính Công Đoàn': 'II. TỔNG CHI HOẠT ĐỘNG CÔNG ĐOÀN', 'Số Tiền (VND)': summary.totalPayments },
    { 'Chỉ Tiêu Quyết Toán Tài Chính Công Đoàn': '  1. Chi chăm lo, thăm hỏi ốm đau, hiếu hỉ, thai sản', 'Số Tiền (VND)': summary.paymentsByCategory['THAM_HOI_OM_DAU'] || 0 },
    { 'Chỉ Tiêu Quyết Toán Tài Chính Công Đoàn': '  2. Chi quà Tết, 8/3, 20/10, Trung thu, 1/6', 'Số Tiền (VND)': summary.paymentsByCategory['QUA_LE_TET'] || 0 },
    { 'Chỉ Tiêu Quyết Toán Tài Chính Công Đoàn': '  3. Chi hoạt động văn hóa, hội thao, phong trào, du lịch', 'Số Tiền (VND)': summary.paymentsByCategory['HOAT_DONG_PHONG_TRAO'] || 0 },
    { 'Chỉ Tiêu Quyết Toán Tài Chính Công Đoàn': '  4. Chi khen thưởng đoàn viên xuất sắc', 'Số Tiền (VND)': summary.paymentsByCategory['KHEN_THUONG'] || 0 },
    { 'Chỉ Tiêu Quyết Toán Tài Chính Công Đoàn': '  5. Chi nộp 25% KPCĐ lên Công đoàn cấp trên', 'Số Tiền (VND)': summary.paymentsByCategory['NOP_CAP_TREN_25'] || 0 },
    { 'Chỉ Tiêu Quyết Toán Tài Chính Công Đoàn': '  6. Phụ cấp trách nhiệm cán bộ công đoàn & quản lý', 'Số Tiền (VND)': summary.paymentsByCategory['PHU_CAP_CAN_BO_CD'] || 0 },
    { 'Chỉ Tiêu Quyết Toán Tài Chính Công Đoàn': '  7. Các khoản chi khác', 'Số Tiền (VND)': summary.paymentsByCategory['CHI_KHAC'] || 0 },
    { 'Chỉ Tiêu Quyết Toán Tài Chính Công Đoàn': 'III. SỐ DƯ QUỸ CÔNG ĐOÀN CÒN LẠI CUỐI KỲ', 'Số Tiền (VND)': summary.netBalance },
    { 'Chỉ Tiêu Quyết Toán Tài Chính Công Đoàn': '  - Tiền mặt tại quỹ (TK 1111)', 'Số Tiền (VND)': summary.cashBalance },
    { 'Chỉ Tiêu Quyết Toán Tài Chính Công Đoàn': '  - Tiền gửi ngân hàng (TK 1121)', 'Số Tiền (VND)': summary.bankBalance },
  ];

  const wsSummary = XLSX.utils.json_to_sheet(summaryRows);
  wsSummary['!cols'] = [{ wch: 55 }, { wch: 22 }];
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Bao_Cao_Quyet_Toan_B07_CD');

  const safeName = (client?.name || 'Cong_Doan').replace(/[^a-zA-Z0-9_-]/g, '_');
  XLSX.writeFile(wb, `Bao_Cao_Thu_Chi_Cong_Doan_${safeName}_${year}.xlsx`);
}
