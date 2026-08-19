import * as XLSX from 'xlsx';
import { DrawingVariationOrder, DrawingProject } from '../types/drawings';
import { formatNumber } from '../utils/formatters';

export interface VariationSummaryStats {
  totalVOs: number;
  approvedVOs: number;
  submittedVOs: number;
  draftVOs: number;
  totalVariationAmount: number;
  approvedVariationAmount: number;
  pendingVariationAmount: number;
  contractValue: number;
  variationRatioPercent: number;
}

/**
 * Tính toán các chỉ số tổng hợp phát sinh (VO) cho dự án
 */
export function calculateVariationSummaryStats(
  vos: DrawingVariationOrder[], 
  contractValue: number = 0
): VariationSummaryStats {
  const totalVOs = vos.length;
  let approvedVOs = 0;
  let submittedVOs = 0;
  let draftVOs = 0;
  let totalVariationAmount = 0;
  let approvedVariationAmount = 0;
  let pendingVariationAmount = 0;

  for (const vo of vos) {
    totalVariationAmount += vo.totalAmount;
    if (vo.status === 'APPROVED' || vo.status === 'BILLED') {
      approvedVOs++;
      approvedVariationAmount += vo.totalAmount;
    } else if (vo.status === 'SUBMITTED') {
      submittedVOs++;
      pendingVariationAmount += vo.totalAmount;
    } else if (vo.status === 'DRAFT') {
      draftVOs++;
      pendingVariationAmount += vo.totalAmount;
    }
  }

  const variationRatioPercent = contractValue > 0 
    ? Number(((totalVariationAmount / contractValue) * 100).toFixed(2)) 
    : 0;

  return {
    totalVOs,
    approvedVOs,
    submittedVOs,
    draftVOs,
    totalVariationAmount,
    approvedVariationAmount,
    pendingVariationAmount,
    contractValue,
    variationRatioPercent
  };
}

/**
 * Sinh HTML Biên Bản Thỏa Thuận & Xác Nhận Chi Phí Phát Sinh Thiết Kế / Thi Công Ký 3 Bên
 */
export function generateVariationAgreementHTML(
  vo: DrawingVariationOrder, 
  project?: DrawingProject
): string {
  const dateObj = new Date(vo.issueDate || Date.now());
  const day = String(dateObj.getDate()).padStart(2, '0');
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const year = dateObj.getFullYear();

  const projectName = project?.projectName || vo.projectName || 'Công Trình Biệt Thự Phố Tân Phú';
  const projectCode = project?.projectCode || 'CT-2026-HP01';
  const projectAddress = project?.address || '153G Lũy Bán Bích, P. Tân Thới Hòa, Q. Tân Phú, TP. HCM';
  const investorName = project?.investorName || 'CÔNG TY CỔ PHẦN ĐẦU TƯ ĐỊA ỐC TÂN PHÚ';

  return `
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <title>Biên Bản Thỏa Thuận Phát Sinh - ${vo.voNumber}</title>
  <style>
    @page { size: A4 portrait; margin: 15mm 20mm; }
    body {
      font-family: "Times New Roman", Times, serif;
      font-size: 13pt;
      line-height: 1.4;
      color: #111827;
      margin: 0;
      padding: 0;
    }
    .header-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 20px;
    }
    .header-table td {
      vertical-align: top;
      padding: 0;
    }
    .text-center { text-align: center; }
    .text-right { text-align: right; }
    .bold { font-weight: bold; }
    .italic { font-style: italic; }
    .doc-title {
      font-size: 15pt;
      font-weight: bold;
      text-transform: uppercase;
      margin: 15px 0 5px 0;
    }
    .doc-sub {
      font-size: 11pt;
      font-style: italic;
      margin-bottom: 15px;
    }
    .meta-box {
      background-color: #f9fafb;
      border: 1px solid #e5e7eb;
      border-radius: 4px;
      padding: 10px 14px;
      margin-bottom: 15px;
      font-size: 12pt;
    }
    .meta-box table { width: 100%; border-collapse: collapse; }
    .meta-box td { padding: 3px 0; vertical-align: top; }
    .content-table {
      width: 100%;
      border-collapse: collapse;
      margin: 15px 0;
      font-size: 12pt;
    }
    .content-table th, .content-table td {
      border: 1px solid #374151;
      padding: 6px 8px;
    }
    .content-table th {
      background-color: #f3f4f6;
      font-weight: bold;
      text-align: center;
    }
    .sign-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 30px;
      page-break-inside: avoid;
    }
    .sign-table td {
      width: 33.33%;
      text-align: center;
      vertical-align: top;
      padding: 0 10px;
    }
    .sign-title { font-weight: bold; font-size: 12pt; text-transform: uppercase; margin-bottom: 4px; }
    .sign-sub { font-size: 10pt; font-style: italic; color: #4b5563; }
    .sign-space { height: 75px; }
    .sign-name { font-weight: bold; font-size: 12pt; }
    .alert-badge {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 10pt;
      font-weight: bold;
      border: 1px solid #3b82f6;
      color: #1d4ed8;
      background: #eff6ff;
    }
    @media print {
      body { -webkit-print-color-adjust: exact; }
    }
  </style>
</head>
<body>

  <!-- TIÊU NGỮ VÀ MÃ BIÊN BẢN -->
  <table class="header-table">
    <tr>
      <td style="width: 45%; text-align: left;">
        <div class="bold" style="font-size: 11pt; text-transform: uppercase;">CÔNG TY TNHH THIẾT KẾ XÂY DỰNG & TM HƯNG PHÁT</div>
        <div style="font-size: 10pt;">Dự Án: <b>${projectName}</b></div>
        <div style="font-size: 10pt;">Mã DA: <b>${projectCode}</b></div>
      </td>
      <td style="width: 55%; text-align: center;">
        <div class="bold" style="font-size: 12pt;">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</div>
        <div class="bold" style="font-size: 11pt;">Độc lập - Tự do - Hạnh phúc</div>
        <div style="font-size: 10pt; margin-top: 3px;">----------------------</div>
        <div class="italic" style="font-size: 11pt; margin-top: 4px;">TP. Hồ Chí Minh, ngày ${day} tháng ${month} năm ${year}</div>
      </td>
    </tr>
  </table>

  <div class="text-center">
    <div class="doc-title">BIÊN BẢN THỎA THUẬN VÀ XÁC NHẬN CHI PHÍ PHÁT SINH</div>
    <div class="doc-sub">Số: <b>${vo.voNumber}</b> (Đợt phát sinh ngoài hợp đồng gốc)</div>
  </div>

  <!-- CĂN CỨ PHÁP LÝ -->
  <div style="font-size: 11pt; margin-bottom: 12px; line-height: 1.5;">
    <div class="italic">- Căn cứ Hợp đồng thi công xây dựng / thiết kế công trình số <b>HĐ-${projectCode}</b>;</div>
    <div class="italic">- Căn cứ Nhật ký công trình và thực tế triển khai thi công tại địa chỉ: <b>${projectAddress}</b>;</div>
    <div class="italic">- Căn cứ văn bản đề xuất: <b>${vo.legalBasis}</b>.</div>
  </div>

  <!-- THÔNG TIN 3 BÊN -->
  <div class="meta-box">
    <table>
      <tr>
        <td style="width: 25%; font-weight: bold;">ĐẠI DIỆN CHỦ ĐẦU TƯ (BÊN A):</td>
        <td><b>${investorName}</b></td>
      </tr>
      <tr>
        <td style="font-weight: bold;">ĐẠI DIỆN NHÀ THẦU (BÊN B):</td>
        <td><b>CÔNG TY TNHH THIẾT KẾ XÂY DỰNG VÀ THƯƠNG MẠI HƯNG PHÁT</b></td>
      </tr>
      <tr>
        <td style="font-weight: bold;">ĐƠN VỊ TƯ VẤN GIÁM SÁT (BÊN C):</td>
        <td><b>CÔNG TY TƯ VẤN THẨM TRA & GIÁM SÁT SÀI GÒN (TVGS)</b></td>
      </tr>
    </table>
  </div>

  <!-- NỘI DUNG PHÁT SINH -->
  <div style="margin-top: 10px;">
    <div class="bold" style="font-size: 12pt; text-transform: uppercase; margin-bottom: 4px;">
      I. NỘI DUNG VÀ NGUYÊN NHÂN PHÁT SINH:
    </div>
    <div style="text-align: justify; margin-bottom: 10px; font-size: 12pt;">
      <b>1. Tên hạng mục phát sinh:</b> ${vo.title}
    </div>
    <div style="text-align: justify; margin-bottom: 10px; font-size: 12pt;">
      <b>2. Nguyên nhân & Đơn vị yêu cầu:</b> ${
        vo.reasonCategory === 'CLIENT_REQUEST' ? 'Theo yêu cầu điều chỉnh công năng/vật liệu từ Chủ Đầu Tư' :
        vo.reasonCategory === 'SITE_CONFLICT' ? 'Xử lý xung đột chướng ngại vật ngầm & bất khả kháng tại hiện trường' :
        vo.reasonCategory === 'TECHNICAL_OPTIMIZATION' ? 'Tối ưu hóa giải pháp kết cấu & an toàn chịu lực công trình' :
        'Tuân thủ quy chuẩn xây dựng & an toàn PCCC'
      } (${vo.requestedBy}).
    </div>
  </div>

  <!-- BẢNG CHI TIẾT KHỐI LƯỢNG & ĐƠN GIÁ -->
  <div>
    <div class="bold" style="font-size: 12pt; text-transform: uppercase; margin-bottom: 6px;">
      II. BẢNG CHI TIẾT BẢN VẼ VÀ CHI PHÍ PHÁT SINH:
    </div>
    <table class="content-table">
      <thead>
        <tr>
          <th style="width: 5%;">STT</th>
          <th style="width: 14%;">Số Hiệu Bản Vẽ</th>
          <th style="width: 36%;">Nội Dung Điều Chỉnh / Bổ Sung</th>
          <th style="width: 15%;">Đợt Rev</th>
          <th style="width: 30%;">Giá Trị Phát Sinh (VNĐ)</th>
        </tr>
      </thead>
      <tbody>
        ${vo.items.map((item, idx) => `
          <tr>
            <td class="text-center">${idx + 1}</td>
            <td class="bold text-center">${item.drawingNumber}</td>
            <td>
              <div class="bold">${item.title}</div>
              <div style="font-size: 10.5pt; color: #374151; margin-top: 2px;">${item.description}</div>
            </td>
            <td class="text-center bold">${item.revision}</td>
            <td class="text-right bold">${formatNumber(item.amount)} đ</td>
          </tr>
        `).join('')}
        <tr>
          <td colspan="4" class="text-right bold" style="background-color: #f9fafb;">CỘNG CHI PHÍ TRƯỚC THUẾ:</td>
          <td class="text-right bold" style="background-color: #f9fafb; font-size: 12pt;">${formatNumber(vo.totalAmount)} đ</td>
        </tr>
        <tr>
          <td colspan="4" class="text-right italic">Thuế GTGT (${vo.vatRate}%):</td>
          <td class="text-right italic">${formatNumber(vo.vatAmount)} đ</td>
        </tr>
        <tr style="background-color: #eff6ff;">
          <td colspan="4" class="text-right bold" style="color: #1e3a8a; font-size: 12.5pt;">TỔNG CỘNG THANH TOÁN (BAO GỒM VAT):</td>
          <td class="text-right bold" style="color: #1e3a8a; font-size: 12.5pt;">${formatNumber(vo.totalWithVat)} đ</td>
        </tr>
      </tbody>
    </table>
  </div>

  <!-- ĐIỀU KHOẢN TIẾN ĐỘ & THANH TOÁN -->
  <div style="margin-top: 10px; font-size: 11.5pt;">
    <div class="bold" style="text-transform: uppercase; margin-bottom: 4px;">III. ĐIỀU KHOẢN THỎA THUẬN VÀ TIẾN ĐỘ:</div>
    <div>1. <b>Thời gian điều chỉnh tiến độ:</b> ${vo.timeExtensionDays > 0 ? `Được gia hạn thêm <b>${vo.timeExtensionDays} ngày</b> vào tiến độ tổng thể của hợp đồng.` : 'Không làm thay đổi tiến độ bàn giao công trình.'}</div>
    <div>2. <b>Phương thức thanh toán:</b> Giá trị phát sinh trên sẽ được nghiệm thu và cộng dồn vào hồ sơ quyết toán giai đoạn tiếp theo của hợp đồng.</div>
    <div>3. Biên bản này được lập thành 03 (ba) bản có giá trị pháp lý như nhau, mỗi bên giữ 01 bản để làm căn cứ thực hiện và quyết toán.</div>
  </div>

  <!-- CHỮ KÝ 3 BÊN -->
  <table class="sign-table">
    <tr>
      <td>
        <div class="sign-title">ĐẠI DIỆN CHỦ ĐẦU TƯ</div>
        <div class="sign-sub">(Ký, ghi rõ họ tên và đóng dấu)</div>
        <div class="sign-space"></div>
        <div class="sign-name">${vo.signedByInvestor || 'Trần Minh Thắng'}</div>
      </td>
      <td>
        <div class="sign-title">TƯ VẤN GIÁM SÁT</div>
        <div class="sign-sub">(Ký và ghi rõ họ tên)</div>
        <div class="sign-space"></div>
        <div class="sign-name">${vo.signedByConsultant || 'KS. Đặng Quốc Bảo'}</div>
      </td>
      <td>
        <div class="sign-title">ĐẠI DIỆN NHÀ THẦU</div>
        <div class="sign-sub">(KTS Chủ trì / Giám đốc)</div>
        <div class="sign-space"></div>
        <div class="sign-name">${vo.signedByContractor || 'KTS. Lê Hoàng Sỹ'}</div>
      </td>
    </tr>
  </table>

</body>
</html>
  `;
}

/**
 * Mở cửa sổ in ấn trực tiếp hoặc lưu file PDF Biên Bản Thỏa Thuận Phát Sinh
 */
export function printVariationAgreement(
  vo: DrawingVariationOrder, 
  project?: DrawingProject
): void {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Trình duyệt đã chặn popup. Vui lòng cho phép popup để in biên bản.');
    return;
  }

  const html = generateVariationAgreementHTML(vo, project);
  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();

  setTimeout(() => {
    printWindow.focus();
    printWindow.print();
  }, 350);
}

/**
 * Xuất file Excel Bảng Tổng Hợp Khối Lượng & Chi Phí Phát Sinh Dự Án Chuẩn Nghiệm Thu
 */
export function exportVariationOrdersToExcel(
  vos: DrawingVariationOrder[], 
  projectName: string = 'Dự Án'
): void {
  const rows: any[] = [];

  // Tiêu đề
  rows.push(['BẢNG TỔNG HỢP CHI PHÍ & KHỐI LƯỢNG PHÁT SINH THIẾT KẾ / THI CÔNG']);
  rows.push([`DỰ ÁN: ${projectName.toUpperCase()}`]);
  rows.push([`Ngày xuất báo cáo: ${new Date().toLocaleDateString('vi-VN')}`]);
  rows.push([]); // Dòng trống

  // Header bảng
  rows.push([
    'STT',
    'Mã Số VO',
    'Ngày Phát Sinh',
    'Tên Hạng Mục Phát Sinh',
    'Nguyên Nhân',
    'Căn Cứ Pháp Lý',
    'Số Bản Vẽ Kèm Theo',
    'Chi Phí Trước Thuế (VNĐ)',
    'VAT (%)',
    'Tiền VAT (VNĐ)',
    'Tổng Cộng Sau Thuế (VNĐ)',
    'Gia Hạn (Ngày)',
    'Trạng Thái Ký Duyệt'
  ]);

  let totalBeforeVat = 0;
  let totalVat = 0;
  let grandTotal = 0;

  vos.forEach((vo, idx) => {
    totalBeforeVat += vo.totalAmount;
    totalVat += vo.vatAmount;
    grandTotal += vo.totalWithVat;

    const statusText = 
      vo.status === 'APPROVED' ? 'Đã Ký Duyệt (Chính Thức)' :
      vo.status === 'SUBMITTED' ? 'Đã Trình (Chờ CĐT/TVGS Ký)' :
      vo.status === 'BILLED' ? 'Đã Quyết Toán' :
      vo.status === 'REJECTED' ? 'Bị Từ Chối' : 'Dự Thảo';

    const reasonText = 
      vo.reasonCategory === 'CLIENT_REQUEST' ? 'Chủ Đầu Tư Đổi Ý' :
      vo.reasonCategory === 'SITE_CONFLICT' ? 'Hiện Trường Xung Đột' :
      vo.reasonCategory === 'TECHNICAL_OPTIMIZATION' ? 'Tối Ưu Kỹ Thuật' : 'Quy Chuẩn Xây Dựng';

    rows.push([
      idx + 1,
      vo.voNumber,
      vo.issueDate,
      vo.title,
      reasonText,
      vo.legalBasis,
      vo.items.map(i => i.drawingNumber).join(', '),
      vo.totalAmount,
      `${vo.vatRate}%`,
      vo.vatAmount,
      vo.totalWithVat,
      vo.timeExtensionDays,
      statusText
    ]);
  });

  // Dòng Tổng Cộng
  rows.push([]);
  rows.push([
    'TỔNG CỘNG TOÀN BỘ PHÁT SINH DỰ ÁN',
    '', '', '', '', '', '',
    totalBeforeVat,
    '',
    totalVat,
    grandTotal,
    '',
    ''
  ]);

  const worksheet = XLSX.utils.aoa_to_sheet(rows);

  // Set độ rộng cột
  worksheet['!cols'] = [
    { wch: 6 },  // STT
    { wch: 15 }, // Mã VO
    { wch: 14 }, // Ngày
    { wch: 45 }, // Tên hạng mục
    { wch: 22 }, // Nguyên nhân
    { wch: 35 }, // Căn cứ
    { wch: 25 }, // Bản vẽ kèm
    { wch: 22 }, // Trước thuế
    { wch: 10 }, // VAT %
    { wch: 18 }, // Tiền VAT
    { wch: 24 }, // Sau thuế
    { wch: 14 }, // Gia hạn
    { wch: 26 }, // Trạng thái
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Bang_Phat_Sinh_VO');

  const cleanName = projectName.replace(/[^a-zA-Z0-9_-]/g, '_');
  XLSX.writeFile(workbook, `Bang_Chi_Phi_Phat_Sinh_VO_${cleanName}.xlsx`);
}
