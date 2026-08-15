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

/**
 * Sinh tài liệu HTML In Hàng Loạt / Xuất PDF Hàng Loạt cho nhiều phiếu thu chi công đoàn cùng lúc
 */
export function generateBatchUnionVouchersHTML(
  transactions: TradeUnionTransaction[],
  client: Client | null
): string {
  const clientName = client?.name || 'CÔNG ĐOÀN CƠ SỞ DOANH NGHIỆP';
  const clientTaxCode = client?.taxCode || '---';
  const clientAddress = client?.address || '---';

  const vouchersContent = transactions.map((tx, idx) => {
    const isReceipt = tx.voucherType === 'UNION_RECEIPT';
    const voucherTitle = isReceipt ? 'PHIẾU THU CÔNG ĐOÀN' : 'PHIẾU CHI CÔNG ĐOÀN';
    const formCode = isReceipt ? 'Mẫu số C40-HD' : 'Mẫu số C41-HD';
    const accounts = getTradeUnionAccounts(tx.category, tx.voucherType, tx.paymentMethod);

    const dateObj = new Date(tx.date);
    const day = dateObj.getDate();
    const month = dateObj.getMonth() + 1;
    const year = dateObj.getFullYear();
    const dateString = `Ngày ${day < 10 ? '0' + day : day} tháng ${month < 10 ? '0' + month : month} năm ${year}`;
    const amountInWords = numberToVietnameseWords(tx.amount);

    return `
      <div class="voucher-page ${idx < transactions.length - 1 ? 'page-break' : ''}">
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
      </div>
    `;
  }).join('\n');

  return `
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <title>In Hàng Loạt Phiếu Công Đoàn (${transactions.length} chứng từ)</title>
  <style>
    @page { size: A4 portrait; margin: 15mm 20mm; }
    body {
      font-family: 'Times New Roman', Times, serif;
      font-size: 13pt;
      line-height: 1.4;
      color: #000;
      margin: 0;
      padding: 0;
    }
    .voucher-page {
      padding: 10px 0;
      box-sizing: border-box;
    }
    .page-break {
      page-break-after: always;
      break-after: page;
    }
    .header-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 12px;
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
      margin: 15px 0 10px 0;
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
      margin-top: 4px;
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
      margin-top: -25px;
      margin-bottom: 12px;
    }
    .content-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 18px;
    }
    .content-table td {
      padding: 5px 0;
      vertical-align: top;
    }
    .label {
      width: 190px;
      white-space: nowrap;
    }
    .amount-highlight {
      font-weight: bold;
      font-size: 14pt;
    }
    .signatures-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 20px;
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
      margin-bottom: 4px;
    }
    .sign-note {
      font-style: italic;
      font-size: 9.5pt;
      color: #444;
    }
    .sign-space {
      height: 65px;
    }
    .sign-name {
      font-weight: bold;
    }
    @media print {
      body { -webkit-print-color-adjust: exact; }
      .page-break { page-break-after: always; break-after: page; }
    }
  </style>
</head>
<body>
  ${vouchersContent}
</body>
</html>
  `;
}

/**
 * Tải file Excel mẫu để người dùng điền và import hàng loạt
 */
export function downloadUnionExcelTemplate(): void {
  const wb = XLSX.utils.book_new();

  const sampleRows = [
    {
      'Loại Phiếu (*)': 'THU',
      'Số Phiếu (*)': 'PT-CĐ-2026-001',
      'Ngày Lập (*)': '2026-08-15',
      'Khoản Mục (*)': 'KPCĐ_2_PERCENT',
      'Người Nộp / Nhận (*)': 'Đại diện Doanh nghiệp',
      'Tổ Công Đoàn / Bộ Phận': 'Phòng Kế Toán',
      'Lý Do Thu / Chi (*)': 'Nộp kinh phí công đoàn 2% Tháng 8/2026',
      'Số Tiền (VND) (*)': 5000000,
      'Hình Thức': 'CK',
      'Chứng Từ Kèm Theo': '01 Bảng lương',
      'Ghi Chú': '75% giữ lại CĐCS, 25% nộp cấp trên',
    },
    {
      'Loại Phiếu (*)': 'THU',
      'Số Phiếu (*)': 'PT-CĐ-2026-002',
      'Ngày Lập (*)': '2026-08-15',
      'Khoản Mục (*)': 'DOAN_PHI_1_PERCENT',
      'Người Nộp / Nhận (*)': 'Đại diện 20 đoàn viên',
      'Tổ Công Đoàn / Bộ Phận': 'Ban Chấp Hành CĐCS',
      'Lý Do Thu / Chi (*)': 'Thu đoàn phí công đoàn 1% Tháng 8/2026',
      'Số Tiền (VND) (*)': 2000000,
      'Hình Thức': 'TM',
      'Chứng Từ Kèm Theo': 'Danh sách thu đoàn phí',
      'Ghi Chú': '',
    },
    {
      'Loại Phiếu (*)': 'CHI',
      'Số Phiếu (*)': 'PC-CĐ-2026-001',
      'Ngày Lập (*)': '2026-08-18',
      'Khoản Mục (*)': 'THAM_HOI_OM_DAU',
      'Người Nộp / Nhận (*)': 'Nguyễn Văn Nam',
      'Tổ Công Đoàn / Bộ Phận': 'Tổ CĐ Phân xưởng 1',
      'Lý Do Thu / Chi (*)': 'Chi tiền thăm hỏi nằm viện phẫu thuật',
      'Số Tiền (VND) (*)': 1000000,
      'Hình Thức': 'TM',
      'Chứng Từ Kèm Theo': 'Giấy ra viện & Đơn đề nghị',
      'Ghi Chú': 'Quyết định trợ cấp số 05/QĐ-CĐ',
    },
    {
      'Loại Phiếu (*)': 'CHI',
      'Số Phiếu (*)': 'PC-CĐ-2026-002',
      'Ngày Lập (*)': '2026-08-20',
      'Khoản Mục (*)': 'QUA_LE_TET',
      'Người Nộp / Nhận (*)': 'Trần Thị Hằng',
      'Tổ Công Đoàn / Bộ Phận': 'Tổ CĐ Văn Phòng',
      'Lý Do Thu / Chi (*)': 'Chi mua quà Tết Trung thu cho con em đoàn viên',
      'Số Tiền (VND) (*)': 3500000,
      'Hình Thức': 'CK',
      'Chứng Từ Kèm Theo': 'Hóa đơn VAT & Danh sách nhận quà',
      'Ghi Chú': '',
    },
    {
      'Loại Phiếu (*)': 'CHI',
      'Số Phiếu (*)': 'PC-CĐ-2026-003',
      'Ngày Lập (*)': '2026-08-25',
      'Khoản Mục (*)': 'NOP_CAP_TREN_25',
      'Người Nộp / Nhận (*)': 'Liên đoàn Lao động Quận/Huyện',
      'Tổ Công Đoàn / Bộ Phận': 'Kế toán CĐCS',
      'Lý Do Thu / Chi (*)': 'Nộp 25% kinh phí công đoàn lên CĐ cấp trên',
      'Số Tiền (VND) (*)': 1250000,
      'Hình Thức': 'CK',
      'Chứng Từ Kèm Theo': 'Giấy nộp tiền vào NSNN/LĐLĐ',
      'Ghi Chú': '',
    },
  ];

  const ws = XLSX.utils.json_to_sheet(sampleRows);
  ws['!cols'] = [
    { wch: 16 },
    { wch: 18 },
    { wch: 14 },
    { wch: 24 },
    { wch: 26 },
    { wch: 24 },
    { wch: 45 },
    { wch: 18 },
    { wch: 14 },
    { wch: 30 },
    { wch: 35 },
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'Mau_Nhap_Thu_Chi_CĐ');

  // Sheet 2: Danh mục mã khoản mục hướng dẫn
  const guideRows = [
    { 'Mã Khoản Mục': 'KPCĐ_2_PERCENT', 'Tên Khoản Mục': 'Kinh phí công đoàn 2% (Doanh nghiệp đóng)', 'Loại': 'THU' },
    { 'Mã Khoản Mục': 'DOAN_PHI_1_PERCENT', 'Tên Khoản Mục': 'Đoàn phí công đoàn 1% (Đoàn viên đóng)', 'Loại': 'THU' },
    { 'Mã Khoản Mục': 'KINH_PHI_CAP_TREN', 'Tên Khoản Mục': 'Kinh phí CĐ cấp trên cấp về', 'Loại': 'THU' },
    { 'Mã Khoản Mục': 'HO_TRO_KHAC', 'Tên Khoản Mục': 'Hỗ trợ từ Doanh nghiệp & Nhà tài trợ', 'Loại': 'THU' },
    { 'Mã Khoản Mục': 'THAM_HOI_OM_DAU', 'Tên Khoản Mục': 'Chi thăm hỏi ốm đau, hiếu hỉ, thai sản, trợ cấp', 'Loại': 'CHI' },
    { 'Mã Khoản Mục': 'QUA_LE_TET', 'Tên Khoản Mục': 'Chi quà Tết, 8/3, 20/10, Trung thu, 1/6', 'Loại': 'CHI' },
    { 'Mã Khoản Mục': 'HOAT_DONG_PHONG_TRAO', 'Tên Khoản Mục': 'Chi văn nghệ, thể thao, hội thao, du lịch đoàn viên', 'Loại': 'CHI' },
    { 'Mã Khoản Mục': 'KHEN_THUONG', 'Tên Khoản Mục': 'Chi khen thưởng đoàn viên xuất sắc', 'Loại': 'CHI' },
    { 'Mã Khoản Mục': 'NOP_CAP_TREN_25', 'Tên Khoản Mục': 'Nộp 25% KPCĐ lên Công đoàn cấp trên', 'Loại': 'CHI' },
    { 'Mã Khoản Mục': 'PHU_CAP_CAN_BO_CD', 'Tên Khoản Mục': 'Phụ cấp cán bộ công đoàn & quản lý CĐ', 'Loại': 'CHI' },
    { 'Mã Khoản Mục': 'CHI_KHAC', 'Tên Khoản Mục': 'Khoản chi công đoàn khác', 'Loại': 'CHI' },
  ];
  const wsGuide = XLSX.utils.json_to_sheet(guideRows);
  wsGuide['!cols'] = [{ wch: 25 }, { wch: 48 }, { wch: 10 }];
  XLSX.utils.book_append_sheet(wb, wsGuide, 'Huong_Dan_Ma_Khoan_Muc');

  XLSX.writeFile(wb, 'Mau_Nhap_Thu_Chi_Cong_Doan_Hang_Loat.xlsx');
}

/**
 * Đọc file Excel dữ liệu đầu vào và chuyển đổi thành danh sách TradeUnionTransaction
 */
export async function parseUnionTransactionsFromExcel(
  fileBuffer: ArrayBuffer,
  clientId: string
): Promise<{ valid: TradeUnionTransaction[]; errors: string[] }> {
  const wb = XLSX.read(fileBuffer, { type: 'array' });
  const sheetName = wb.SheetNames[0];
  const ws = wb.Sheets[sheetName];
  const rawRows: any[] = XLSX.utils.sheet_to_json(ws);

  const valid: TradeUnionTransaction[] = [];
  const errors: string[] = [];

  const now = new Date().toISOString();

  rawRows.forEach((row, index) => {
    const rowNum = index + 2; // Dòng 1 là tiêu đề
    
    // Đọc trường với nhiều cách viết hoa thường
    const typeRaw = (row['Loại Phiếu (*)'] || row['Loại Phiếu'] || row['Loai Phieu'] || row['Type'] || '').toString().trim().toUpperCase();
    const voucherNo = (row['Số Phiếu (*)'] || row['Số Phiếu'] || row['So Phieu'] || row['Số Chứng Từ'] || row['VoucherNo'] || '').toString().trim();
    let dateStr = (row['Ngày Lập (*)'] || row['Ngày Lập'] || row['Ngay Lap'] || row['Date'] || '').toString().trim();
    const categoryRaw = (row['Khoản Mục (*)'] || row['Khoản Mục'] || row['Khoan Muc'] || row['Category'] || '').toString().trim();
    const personName = (row['Người Nộp / Nhận (*)'] || row['Người Nộp / Nhận'] || row['Nguoi Nop / Nhan'] || row['Họ Tên'] || row['PersonName'] || '').toString().trim();
    const department = (row['Tổ Công Đoàn / Bộ Phận'] || row['Bộ Phận'] || row['Department'] || '').toString().trim();
    const reason = (row['Lý Do Thu / Chi (*)'] || row['Lý Do'] || row['Ly Do'] || row['Reason'] || '').toString().trim();
    const amountRaw = row['Số Tiền (VND) (*)'] || row['Số Tiền'] || row['So Tien'] || row['Amount'] || 0;
    const methodRaw = (row['Hình Thức'] || row['Hinh Thuc'] || row['PaymentMethod'] || '').toString().trim().toUpperCase();
    const attachedDocs = (row['Chứng Từ Kèm Theo'] || row['Kèm Theo'] || '').toString().trim();
    const notes = (row['Ghi Chú'] || row['Ghi chu'] || row['Notes'] || '').toString().trim();

    const amount = Number(String(amountRaw).replace(/[^0-9.-]+/g, ''));

    // Kiểm tra hợp lệ
    if (!personName) {
      errors.push(`Dòng ${rowNum}: Thiếu họ tên người nộp/nhận`);
      return;
    }
    if (isNaN(amount) || amount <= 0) {
      errors.push(`Dòng ${rowNum}: Số tiền không hợp lệ (${amountRaw})`);
      return;
    }

    // Nhận diện loại phiếu
    let voucherType: TradeUnionVoucherType = 'UNION_RECEIPT';
    if (typeRaw.includes('CHI') || typeRaw === 'PAYMENT' || typeRaw === 'PC') {
      voucherType = 'UNION_PAYMENT';
    } else if (typeRaw.includes('THU') || typeRaw === 'RECEIPT' || typeRaw === 'PT') {
      voucherType = 'UNION_RECEIPT';
    } else {
      // Tự đoán theo khoản mục hoặc từ khóa lý do
      if (reason.toLowerCase().includes('chi') || categoryRaw.startsWith('THAM_HOI') || categoryRaw.startsWith('QUA_') || categoryRaw.startsWith('NOP_')) {
        voucherType = 'UNION_PAYMENT';
      }
    }

    // Nhận diện ngày
    if (!dateStr || dateStr.length < 8) {
      dateStr = new Date().toISOString().slice(0, 10);
    } else if (dateStr.includes('/')) {
      const parts = dateStr.split('/');
      if (parts.length === 3) {
        // DD/MM/YYYY -> YYYY-MM-DD
        if (parts[2].length === 4) {
          dateStr = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
        }
      }
    }

    // Nhận diện Khoản mục
    let category: TradeUnionCategory = voucherType === 'UNION_RECEIPT' ? 'KPCĐ_2_PERCENT' : 'THAM_HOI_OM_DAU';
    const catUpper = categoryRaw.toUpperCase();
    if (catUpper.includes('KPCĐ') || catUpper.includes('2%') || catUpper === 'KPCD_2_PERCENT') category = 'KPCĐ_2_PERCENT';
    else if (catUpper.includes('DOAN_PHI') || catUpper.includes('1%') || catUpper.includes('ĐOÀN PHÍ')) category = 'DOAN_PHI_1_PERCENT';
    else if (catUpper.includes('CAP_TREN') || catUpper.includes('CẤP TRÊN CẤP')) category = 'KINH_PHI_CAP_TREN';
    else if (catUpper.includes('HO_TRO') || catUpper.includes('HỖ TRỢ') || catUpper.includes('TÀI TRỢ')) category = 'HO_TRO_KHAC';
    else if (catUpper.includes('THAM_HOI') || catUpper.includes('ỐM ĐAU') || catUpper.includes('HIẾU HỈ') || catUpper.includes('THAI SẢN')) category = 'THAM_HOI_OM_DAU';
    else if (catUpper.includes('QUA_') || catUpper.includes('QUÀ') || catUpper.includes('TẾT') || catUpper.includes('TRUNG THU') || catUpper.includes('8/3')) category = 'QUA_LE_TET';
    else if (catUpper.includes('PHONG_TRAO') || catUpper.includes('VĂN NGHỆ') || catUpper.includes('THỂ THAO') || catUpper.includes('DU LỊCH')) category = 'HOAT_DONG_PHONG_TRAO';
    else if (catUpper.includes('KHEN_THUONG') || catUpper.includes('KHEN THƯỞNG')) category = 'KHEN_THUONG';
    else if (catUpper.includes('NOP_CAP_TREN') || catUpper.includes('NỘP 25%') || catUpper.includes('NỘP CẤP TRÊN')) category = 'NOP_CAP_TREN_25';
    else if (catUpper.includes('PHU_CAP') || catUpper.includes('CÁN BỘ')) category = 'PHU_CAP_CAN_BO_CD';
    else if (catUpper.includes('CHI_KHAC') || catUpper.includes('KHÁC')) category = 'CHI_KHAC';

    // Nhận diện Hình thức
    const paymentMethod: 'CASH' | 'BANK' = (methodRaw.includes('CK') || methodRaw.includes('BANK') || methodRaw.includes('NGÂN HÀNG') || methodRaw.includes('CHUYỂN KHOẢN')) ? 'BANK' : 'CASH';

    // Số phiếu tự sinh nếu chưa có
    const finalVoucherNo = voucherNo || `${voucherType === 'UNION_RECEIPT' ? 'PT-CĐ' : 'PC-CĐ'}-${dateStr.slice(0, 4)}-${String(valid.length + 1).padStart(3, '0')}`;

    valid.push({
      id: `union-${Date.now()}-${valid.length}-${Math.random().toString(36).substring(2, 6)}`,
      clientId: clientId || 'default-client',
      voucherType,
      voucherNo: finalVoucherNo,
      date: dateStr,
      category,
      personName,
      department: department || 'Ban Chấp Hành CĐCS',
      reason: reason || (voucherType === 'UNION_RECEIPT' ? 'Thu kinh phí công đoàn' : 'Chi hoạt động công đoàn'),
      amount,
      paymentMethod,
      attachedDocs: attachedDocs || '01',
      notes,
      createdAt: now,
      updatedAt: now,
    });
  });

  return { valid, errors };
}

