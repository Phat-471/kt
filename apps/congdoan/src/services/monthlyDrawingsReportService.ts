import * as XLSX from 'xlsx';
import { 
  DrawingItem, 
  DrawingProject, 
  DrawingTransmittal, 
  MonthlyDrawingSummary 
} from '../types/drawings';

/**
 * Tính toán số liệu tổng hợp báo cáo bản vẽ theo tháng
 */
export const calculateMonthlySummary = (
  drawings: DrawingItem[],
  transmittals: DrawingTransmittal[],
  year: number,
  month: number
): MonthlyDrawingSummary => {
  const monthKey = `${year}-${String(month).padStart(2, '0')}`;
  const monthLabel = `Tháng ${String(month).padStart(2, '0')}/${year}`;

  // Lọc các bản vẽ có phát sinh hoặc tạo/sửa trong tháng
  const monthDrawings = drawings.filter(d => {
    const hasRevInMonth = d.revisions.some(r => r.changeDate && r.changeDate.startsWith(monthKey));
    const isCreatedInMonth = d.createdAt && d.createdAt.startsWith(monthKey);
    return hasRevInMonth || isCreatedInMonth;
  });

  const newIssuesCount = monthDrawings.filter(d => d.issueNature === 'NEW_ISSUE').length;
  const revisionsCount = monthDrawings.filter(d => d.issueNature === 'REVISION_MODIFIED').length;
  const variationOrdersCount = monthDrawings.filter(d => d.issueNature === 'VARIATION_ORDER' || d.isVariationOrder).length;
  const totalVariationAmount = monthDrawings.reduce((sum, d) => sum + (d.variationAmount || 0), 0);
  const pendingApprovalsCount = monthDrawings.filter(d => !d.approver || d.status.includes('PENDING')).length;

  const monthTransmittals = transmittals.filter(t => t.issueDate && t.issueDate.startsWith(monthKey));

  return {
    monthKey,
    monthLabel,
    totalDrawingsIssued: monthDrawings.length,
    newIssuesCount,
    revisionsCount,
    variationOrdersCount,
    totalVariationAmount,
    transmittalsCount: monthTransmittals.length,
    pendingApprovalsCount,
  };
};

/**
 * Xuất Báo Cáo Tiến Độ Bản Vẽ & Chi Phí Phát Sinh Tháng ra File Excel
 */
export const exportMonthlyReportToExcel = (
  project: DrawingProject,
  summary: MonthlyDrawingSummary,
  drawingsInMonth: DrawingItem[],
  transmittalsInMonth: DrawingTransmittal[]
) => {
  const wb = XLSX.utils.book_new();

  // Sheet 1: Báo Cáo Tiến Độ & Bản Vẽ Tháng
  const headerData: any[][] = [
    ['CÔNG TY TNHH THIẾT KẾ XÂY DỰNG VÀ THƯƠNG MẠI HƯNG PHÁT'],
    [`BÁO CÁO TỔNG HỢP TIẾN ĐỘ HỒ SƠ BẢN VẼ & PHÁT SINH THIẾT KẾ - ${summary.monthLabel.toUpperCase()}`],
    [],
    [`Dự Án / Công Trình:`, `${project.projectName} [Mã: ${project.projectCode}]`],
    [`Địa Điểm Xây Dựng:`, project.address],
    [`Chủ Đầu Tư:`, project.investorName, `Tổng Thầu:`, project.mainContractorName],
    [`KTS Chủ Trì:`, project.leadArchitect, `KS Kết Cấu:`, project.leadEngineer],
    [`Ngày Lập Báo Cáo:`, new Date().toLocaleDateString('vi-VN')],
    [],
    ['I. TỔNG HỢP CHỈ SỐ HOẠT ĐỘNG THÁNG:'],
    ['Chỉ Số Theo Dõi', 'Số Lượng / Giá Trị', 'Đơn Vị Tính', 'Ghi Chú'],
    ['1. Tổng số bản vẽ phát hành / xử lý trong tháng', summary.totalDrawingsIssued, 'Bản vẽ', 'Bao gồm bản mới & hiệu chỉnh'],
    ['2. Bản vẽ thiết kế mới phát hành (Concept/Phát hành 1)', summary.newIssuesCount, 'Bản vẽ', 'Phát hành đợt 1'],
    ['3. Bản vẽ sửa đổi hiệu chỉnh (Revisions)', summary.revisionsCount, 'Bản vẽ', 'Theo yêu cầu CĐT & hiện trường'],
    ['4. Bản vẽ phát sinh tăng/giảm khối lượng', summary.variationOrdersCount, 'Bản vẽ', 'Ảnh hưởng giá trị dự toán'],
    ['5. Tổng giá trị phát sinh thiết kế trong tháng', summary.totalVariationAmount, 'VNĐ', 'Theo dõi ghi nhận TK 154'],
    ['6. Số đợt bàn giao hồ sơ (Transmittals)', summary.transmittalsCount, 'Đợt bàn giao', 'Đã ký biên bản giao nhận'],
    [],
    ['II. DANH MỤC CHI TIẾT BẢN VẼ XỬ LÝ TRONG THÁNG:'],
    [
      'STT',
      'Số Hiệu',
      'Tên Bản Vẽ',
      'Đơn Vị Phát Hành',
      'Bộ Môn',
      'Giai Đoạn',
      'Tính Chất',
      'Phiên Bản',
      'Khổ Giấy',
      'Tác Giả',
      'Người Duyệt',
      'Giá Trị Phát Sinh (VNĐ)',
      'Nội Dung Hiệu Chỉnh Gần Nhất'
    ]
  ];

  const rowsData: any[][] = drawingsInMonth.map((d, idx) => {
    const latestRev = d.revisions[d.revisions.length - 1];
    return [
      idx + 1,
      d.drawingNumber,
      d.title,
      d.companyName,
      d.discipline === 'ARCHITECTURE' ? 'Kiến Trúc' : d.discipline === 'STRUCTURE' ? 'Kết Cấu' : d.discipline === 'MEP' ? 'Cơ Điện' : 'Chung',
      d.stageType,
      d.issueNature === 'NEW_ISSUE' ? 'Bản Mới' : d.issueNature === 'REVISION_MODIFIED' ? 'Sửa Đổi' : d.issueNature === 'VARIATION_ORDER' ? 'Phát Sinh' : 'Redline',
      d.currentRevision,
      d.sheetSize,
      d.author,
      d.approver || 'Chờ duyệt',
      d.variationAmount || 0,
      latestRev ? latestRev.changeDescription : '---'
    ];
  });

  const totalRow = [
    'TỔNG CỘNG',
    `${drawingsInMonth.length} bản vẽ`,
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    summary.totalVariationAmount,
    ''
  ];

  const fullSheetData = [...headerData, ...rowsData, totalRow];
  const ws1 = XLSX.utils.aoa_to_sheet(fullSheetData);

  ws1['!cols'] = [
    { wch: 6 },
    { wch: 16 },
    { wch: 40 },
    { wch: 28 },
    { wch: 14 },
    { wch: 18 },
    { wch: 16 },
    { wch: 12 },
    { wch: 10 },
    { wch: 20 },
    { wch: 20 },
    { wch: 22 },
    { wch: 45 },
  ];

  XLSX.utils.book_append_sheet(wb, ws1, `BAO_CAO_${summary.monthKey}`);

  // Sheet 2: Danh Sách Biên Bản Bàn Giao Hồ Sơ (Transmittals)
  if (transmittalsInMonth.length > 0) {
    const transmittalHeader: any[][] = [
      ['DANH SÁCH BIÊN BẢN BÀN GIAO HỒ SƠ BẢN VẼ TRONG THÁNG'],
      [],
      ['STT', 'Số Biên Bản', 'Ngày Giao', 'Bên Giao', 'Người Giao', 'Bên Nhận', 'Người Nhận', 'Mục Đích', 'Số Bản Vẽ Giao', 'Trạng Thái', 'Ghi Chú']
    ];

    const transmittalRows: any[][] = transmittalsInMonth.map((t, idx) => [
      idx + 1,
      t.transmittalNo,
      t.issueDate,
      t.senderCompany,
      t.senderPerson,
      t.recipientCompany,
      t.recipientPerson,
      t.purpose === 'FOR_CONSTRUCTION' ? 'Thi Công' : t.purpose === 'FOR_APPROVAL' ? 'Phê Duyệt' : 'Tham Khảo',
      t.drawingItems.length,
      t.status === 'CONFIRMED' ? 'Đã Ký Nhận' : 'Chờ Xác Nhận',
      t.notes || ''
    ]);

    const ws2 = XLSX.utils.aoa_to_sheet([...transmittalHeader, ...transmittalRows]);
    ws2['!cols'] = [
      { wch: 6 }, { wch: 18 }, { wch: 14 }, { wch: 30 }, { wch: 20 }, { wch: 30 }, { wch: 20 }, { wch: 16 }, { wch: 16 }, { wch: 16 }, { wch: 30 }
    ];
    XLSX.utils.book_append_sheet(wb, ws2, 'BIEN_BAN_BAN_GIAO');
  }

  const fileName = `Bao_Cao_Ban_Ve_${summary.monthKey}_${project.projectCode}.xlsx`;
  XLSX.writeFile(wb, fileName);
};

/**
 * Sinh HTML In / Lưu PDF Biên Bản Bàn Giao Hồ Sơ Bản Vẽ (Transmittal Form A4)
 */
export const printTransmittalForm = (
  transmittal: DrawingTransmittal,
  project: DrawingProject
) => {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Trình duyệt đã chặn popup. Vui lòng cho phép mở popup để in biên bản.');
    return;
  }

  const itemsHtml = transmittal.drawingItems.map((item, idx) => `
    <tr style="border-bottom: 1px solid #cbd5e1;">
      <td style="text-align: center; padding: 6px 8px;">${idx + 1}</td>
      <td style="font-family: monospace; font-weight: bold; padding: 6px 8px;">${item.drawingNumber}</td>
      <td style="padding: 6px 8px;">${item.title}</td>
      <td style="text-align: center; font-weight: bold; padding: 6px 8px;">${item.revision}</td>
      <td style="text-align: center; padding: 6px 8px;">${item.sheetSize}</td>
      <td style="text-align: center; font-weight: bold; padding: 6px 8px;">${item.copiesCount} bản</td>
      <td style="text-align: center; padding: 6px 8px;">${item.hasSoftCopy ? 'CAD + PDF' : 'Bản in'}</td>
    </tr>
  `).join('');

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="vi">
    <head>
      <meta charset="utf-8" />
      <title>Biên Bản Giao Nhận Hồ Sơ Bản Vẽ - ${transmittal.transmittalNo}</title>
      <style>
        @page { size: A4 portrait; margin: 15mm 15mm; }
        body { font-family: 'Times New Roman', serif; font-size: 13pt; line-height: 1.4; color: #000; margin: 0; padding: 10px; }
        .header { display: flex; justify-content: space-between; border-bottom: 2px solid #000; padding-bottom: 8px; margin-bottom: 15px; }
        .company-title { font-size: 11pt; font-weight: bold; text-transform: uppercase; }
        .trans-no { font-family: monospace; font-size: 11pt; font-weight: bold; }
        .title { text-align: center; font-size: 16pt; font-weight: bold; text-transform: uppercase; margin: 15px 0 5px 0; }
        .subtitle { text-align: center; font-style: italic; font-size: 11pt; margin-bottom: 15px; }
        .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 15px; background: #f8fafc; padding: 10px; border: 1px solid #cbd5e1; border-radius: 4px; }
        table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 11pt; }
        th { background: #f1f5f9; border: 1px solid #000; padding: 6px 8px; text-align: center; }
        td { border: 1px solid #000; }
        .signatures { display: flex; justify-content: space-between; margin-top: 40px; text-align: center; }
        .sig-block { width: 45%; }
        .sig-title { font-weight: bold; margin-bottom: 60px; }
        @media print {
          body { padding: 0; }
          .no-print { display: none; }
        }
      </style>
    </head>
    <body>
      <div class="no-print" style="margin-bottom: 15px; text-align: right;">
        <button onclick="window.print()" style="padding: 8px 16px; background: #2563eb; color: #fff; font-weight: bold; border: none; border-radius: 6px; cursor: pointer;">🖨️ In Biên Bản / Lưu PDF</button>
      </div>

      <div class="header">
        <div>
          <div class="company-title">CÔNG TY TNHH THIẾT KẾ XÂY DỰNG VÀ THƯƠNG MẠI HƯNG PHÁT</div>
          <div style="font-size: 10pt;">Địa chỉ: 153G Lũy Bán Bích, P. Tân Thới Hòa, Q. Tân Phú, TP. HCM</div>
        </div>
        <div style="text-align: right;">
          <div class="trans-no">Số: ${transmittal.transmittalNo}</div>
          <div style="font-size: 10pt;">Ngày: ${transmittal.issueDate}</div>
        </div>
      </div>

      <div class="title">BIÊN BẢN BÀN GIAO HỒ SƠ BẢN VẼ</div>
      <div class="subtitle">(V/v: Phát hành hồ sơ thiết kế, bản vẽ thi công & bản vẽ sửa đổi)</div>

      <div class="info-grid">
        <div>
          <div><strong>Công Trình:</strong> ${project.projectName}</div>
          <div><strong>Mã Dự Án:</strong> ${project.projectCode}</div>
          <div><strong>Địa Điểm:</strong> ${project.address}</div>
        </div>
        <div>
          <div><strong>Bên Giao (Phát Hành):</strong> ${transmittal.senderCompany} (${transmittal.senderPerson})</div>
          <div><strong>Bên Nhận:</strong> ${transmittal.recipientCompany} (${transmittal.recipientPerson})</div>
          <div><strong>Mục Đích:</strong> ${transmittal.purpose === 'FOR_CONSTRUCTION' ? 'Triển khai thi công tại công trường' : 'Trình duyệt / Thẩm tra'}</div>
        </div>
      </div>

      <div style="font-weight: bold; margin-bottom: 5px;">DANH MỤC HỒ SƠ BẢN VẼ BÀN GIAO:</div>
      <table>
        <thead>
          <tr>
            <th style="width: 40px;">STT</th>
            <th style="width: 100px;">Số Hiệu</th>
            <th>Tên / Tiêu Đề Bản Vẽ</th>
            <th style="width: 70px;">Phiên Bản</th>
            <th style="width: 60px;">Khổ</th>
            <th style="width: 80px;">Số Bản In</th>
            <th style="width: 90px;">Định Dạng</th>
          </tr>
        </thead>
        <tbody>
          ${itemsHtml}
        </tbody>
      </table>

      ${transmittal.notes ? `<div style="margin-top: 10px; font-style: italic;"><strong>Ghi chú:</strong> ${transmittal.notes}</div>` : ''}

      <div style="margin-top: 15px; font-size: 10.5pt;">
        <em>Hai bên xác nhận đã bàn giao đầy đủ số lượng và chất lượng các hồ sơ bản vẽ kỹ thuật nêu trên. Bản vẽ này là căn cứ pháp lý kỹ thuật cao nhất tại hiện trường.</em>
      </div>

      <div class="signatures">
        <div class="sig-block">
          <div class="sig-title">ĐẠI DIỆN BÊN GIAO<br/><span style="font-size: 10pt; font-weight: normal;">(Ký, ghi rõ họ tên & đóng dấu)</span></div>
          <div style="font-weight: bold;">${transmittal.senderPerson}</div>
        </div>
        <div class="sig-block">
          <div class="sig-title">ĐẠI DIỆN BÊN NHẬN<br/><span style="font-size: 10pt; font-weight: normal;">(Ký và ghi rõ họ tên)</span></div>
          <div style="font-weight: bold;">${transmittal.recipientPerson}</div>
        </div>
      </div>
    </body>
    </html>
  `;

  printWindow.document.write(htmlContent);
  printWindow.document.close();
};
