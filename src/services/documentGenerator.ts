import { VoucherTemplateData } from '../types/accounting';

const defaultUnits = ['', 'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín'];

function readGroup(group: string): string {
  let read = '';
  const hundred = parseInt(group[0]);
  const ten = parseInt(group[1]);
  const unit = parseInt(group[2]);

  if (hundred === 0 && ten === 0 && unit === 0) return '';

  if (hundred !== 0 || ten !== 0 || unit !== 0) {
    read += defaultUnits[hundred] + ' trăm ';
    if (ten === 0 && unit !== 0) read += 'lẻ ';
  }

  if (ten !== 0 && ten !== 1) {
    read += defaultUnits[ten] + ' mươi ';
    if (ten === 0 && unit !== 0) read += 'lẻ ';
  }

  if (ten === 1) read += 'mười ';

  switch (unit) {
    case 1:
      if (ten !== 0 && ten !== 1) read += 'mốt';
      else read += defaultUnits[unit];
      break;
    case 5:
      if (ten === 0) read += defaultUnits[unit];
      else read += 'lăm';
      break;
    default:
      if (unit !== 0) read += defaultUnits[unit];
      break;
  }
  return read.trim();
}

export function numberToVietnameseWords(amount: number): string {
  if (!amount || amount === 0) return 'Không đồng';
  if (amount < 0) return 'Am ' + numberToVietnameseWords(Math.abs(amount));

  let str = Math.floor(amount).toString();
  let result = '';

  while (str.length % 3 !== 0) {
    str = '0' + str;
  }

  const groups = [];
  for (let i = 0; i < str.length; i += 3) {
    groups.push(str.substring(i, i + 3));
  }

  const scales = ['', 'ngàn', 'triệu', 'tỷ', 'ngàn tỷ', 'triệu tỷ'];
  const n = groups.length;

  for (let i = 0; i < n; i++) {
    const gRead = readGroup(groups[i]);
    if (gRead !== '') {
      result += gRead + ' ' + scales[n - 1 - i] + ' ';
    }
  }

  result = result.trim() + ' đồng';
  return result.charAt(0).toUpperCase() + result.slice(1);
}

/** Chuẩn hóa chuỗi về Unicode NFC để tránh lỗi dấu tiếng Việt bị tách rời (NFD) */
function nfc(str: string | undefined | null): string {
  if (!str) return '';
  return str.normalize('NFC');
}

export function generateVoucherHTML(data: VoucherTemplateData): string {
  const isReceipt = data.voucherType === 'PHIEU_THU';
  const title = isReceipt ? 'PHIẾU THU' : data.voucherType === 'PHIEU_CHI' ? 'PHIẾU CHI' : data.voucherType === 'DE_NGHI_THANH_TOAN' ? 'GIẤY ĐỀ NGHỊ THANH TOÁN' : 'BIÊN BẢN ĐỐI CHIẾU CÔNG NỢ';
  const subTitle = isReceipt ? 'Mẫu số 01 - TT' : data.voucherType === 'PHIEU_CHI' ? 'Mẫu số 02 - TT' : '';

  // Chuẩn hóa NFC cho tất cả dữ liệu đầu vào
  const d = {
    companyName: nfc(data.companyName) || 'CÔNG TY TNHH HÀNG HẢI LẠC VIỆT',
    companyAddress: nfc(data.companyAddress) || 'Số 123 Đường Cầu Giấy, Hà Nội',
    companyTaxCode: nfc(data.companyTaxCode) || '0101234567',
    voucherNo: nfc(data.voucherNo),
    dateStr: nfc(data.dateStr) || 'Ngày ..... tháng ..... năm 2026',
    personName: nfc(data.personName) || '.............................................',
    address: nfc(data.address) || '.............................................',
    reason: nfc(data.reason) || '.............................................',
    debitAcc: nfc(data.debitAcc) || '1111',
    creditAcc: nfc(data.creditAcc) || '131',
    attachedDocs: nfc(data.attachedDocs) || '01',
    amountInWords: nfc(data.amountInWords) || '.............................................',
    amount: data.amount,
  };

  return `
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
  <meta charset="UTF-8">
  <title>${title} - ${data.voucherNo}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:ital,wght@0,400;0,500;0,700;1,400;1,700&display=swap');
    body {
      font-family: 'Be Vietnam Pro', 'Times New Roman', 'Arial Unicode MS', serif;
      font-size: 14px; line-height: 1.6; color: #000; padding: 20px;
    }
    .header { display: flex; justify-content: space-between; margin-bottom: 20px; }
    .company-name { font-weight: bold; text-transform: uppercase; font-size: 15px; }
    .title-box { text-align: center; margin: 20px 0; }
    .title-main { font-size: 22px; font-weight: bold; text-transform: uppercase; margin: 0; }
    .title-sub { font-style: italic; font-size: 13px; }
    .info-row { margin-bottom: 8px; display: flex; }
    .info-label { min-width: 170px; }
    .info-val { font-weight: 500; border-bottom: 1px dotted #888; flex: 1; }
    .signatures { display: flex; justify-content: space-between; margin-top: 40px; text-align: center; }
    .sig-block { width: 22%; }
    .sig-title { font-weight: bold; }
    .sig-sub { font-style: italic; font-size: 12px; }
    .sig-space { height: 70px; }
    @media print {
      body { padding: 0; }
    }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="company-name">${d.companyName}</div>
      <div>Địa chỉ: ${d.companyAddress}</div>
      <div>MST: ${d.companyTaxCode}</div>
    </div>
    <div style="text-align: right;">
      <div style="font-weight: bold;">${subTitle}</div>
      <div style="font-size: 12px; font-style: italic;">(Ban hành theo Thông tư 200/2014/TT-BTC)</div>
      <div style="margin-top: 6px;">Quyển số: .........</div>
      <div>Nợ: <strong>${d.debitAcc}</strong> | Có: <strong>${d.creditAcc}</strong></div>
    </div>
  </div>

  <div class="title-box">
    <h1 class="title-main">${title}</h1>
    <div class="title-sub">${d.dateStr}</div>
    <div>Số: <strong>${d.voucherNo}</strong></div>
  </div>

  <div style="margin: 20px 0;">
    <div class="info-row">
      <span class="info-label">${isReceipt ? 'Họ và tên người nộp tiền' : 'Họ và tên người nhận tiền'}:</span>
      <span class="info-val">${d.personName}</span>
    </div>
    <div class="info-row">
      <span class="info-label">Địa chỉ:</span>
      <span class="info-val">${d.address}</span>
    </div>
    <div class="info-row">
      <span class="info-label">Lý do ${isReceipt ? 'nộp' : 'chi'}:</span>
      <span class="info-val">${d.reason}</span>
    </div>
    <div class="info-row">
      <span class="info-label">Số tiền:</span>
      <span class="info-val"><strong>${d.amount ? d.amount.toLocaleString('vi-VN') + ' VNĐ' : '.................'}</strong></span>
    </div>
    <div class="info-row">
      <span class="info-label">Viết bằng chữ:</span>
      <span class="info-val" style="font-style: italic; font-weight: bold;">${d.amountInWords}</span>
    </div>
    <div class="info-row">
      <span class="info-label">Kèm theo:</span>
      <span class="info-val">${d.attachedDocs} chứng từ gốc</span>
    </div>
  </div>

  <div class="signatures">
    <div class="sig-block">
      <div class="sig-title">Giám đốc</div>
      <div class="sig-sub">(Ký, họ tên, đóng dấu)</div>
      <div class="sig-space"></div>
    </div>
    <div class="sig-block">
      <div class="sig-title">Kế toán trưởng</div>
      <div class="sig-sub">(Ký, họ tên)</div>
      <div class="sig-space"></div>
    </div>
    <div class="sig-block">
      <div class="sig-title">Người lập phiếu</div>
      <div class="sig-sub">(Ký, họ tên)</div>
      <div class="sig-space"></div>
    </div>
    <div class="sig-block">
      <div class="sig-title">${isReceipt ? 'Người nộp tiền' : 'Người nhận tiền'}</div>
      <div class="sig-sub">(Ký, họ tên)</div>
      <div class="sig-space"></div>
    </div>
    <div class="sig-block">
      <div class="sig-title">Thủ quỹ</div>
      <div class="sig-sub">(Ký, họ tên)</div>
      <div class="sig-space"></div>
    </div>
  </div>
</body>
</html>
  `;
}
