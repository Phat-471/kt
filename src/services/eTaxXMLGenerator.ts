/**
 * eTax XML Generator — Tạo File XML Khai Thuế eTax
 * Chuẩn: Tổng Cục Thuế Việt Nam (Thông tư 80/2021/TT-BTC & Ứng dụng HTKK)
 * Mẫu:
 *   - 01/GTGT: Khai thuế GTGT theo quý (Đi kèm Phụ lục 01-1/GTGT & 01-2/GTGT)
 *   - 05/KK-TNCN: Khai quyết toán thuế TNCN
 */

import { NormalizedTransaction, Client } from '../types/accounting';
import { PayrollSummary } from './payrollService';

// ============================================================
// HELPERS
// ============================================================

const xmlEsc = (s: string | number | undefined | null): string => {
  if (s === undefined || s === null) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
};

const fmtNum = (n: number) => Math.round(n || 0).toString();
const today = () => new Date().toISOString().slice(0, 10);

// ============================================================
// TYPES
// ============================================================

export interface VATRow {
  invoiceDate: string;
  invoiceNo: string;
  sellerName: string;
  sellerTaxCode: string;
  goodsDescription: string;
  taxableAmount: number;   // Doanh số chưa thuế
  vatAmount: number;       // Thuế GTGT
  vatRate: 0 | 5 | 8 | 10;
  isDeductibleAll?: boolean; // Dùng riêng cho HHDV chịu thuế (100% khấu trừ)
}

export interface GTGTFormInput {
  client: { name: string; taxCode: string; address?: string; id?: string };
  taxPeriod: { year: number; quarter: 1 | 2 | 3 | 4 };
  outputRows: VATRow[];    // Bảng kê hóa đơn bán ra (Phụ lục 01-1)
  inputRows: VATRow[];     // Bảng kê hóa đơn mua vào (Phụ lục 01-2)
  prevCreditCarryover: number;  // VAT đầu vào còn lại từ kỳ trước [CT22]
}

export interface PITFormInput {
  client: { name: string; taxCode: string; address?: string; id?: string };
  taxYear: number;
  payrollSummary: PayrollSummary;
}

export interface TNDNFormInput {
  client: { name: string; taxCode: string; address?: string; id?: string };
  taxPeriod: { year: number; quarter: 1 | 2 | 3 | 4 };
  revenue: number;                  // [CT21] Doanh thu phát sinh trong kỳ
  expenses: number;                 // [CT22] Chi phí phát sinh trong kỳ
  accountingProfit?: number;        // [CT23] Lợi nhuận kế toán trước thuế
  nonDeductibleExpenses?: number;   // [CT24] Điều chỉnh tăng: Chi phí không được trừ (B4)
  taxExemptIncome?: number;         // [CT25] Điều chỉnh giảm: Thu nhập miễn thuế
  taxLossCarryforward?: number;     // [CT27] Lỗ chuyển từ kỳ trước
  taxRate?: number;                 // [CT29] Thuế suất TNDN (%) (mặc định 20%)
  taxPrepaid?: number;              // [CT31] Thuế TNDN đã tạm nộp các kỳ trước
}

export interface XMLValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

// ============================================================
// GENERATOR 1: Mẫu 01/GTGT — Khai Thuế GTGT Chuẩn HTKK
// ============================================================

export function generateGTGTXML(input: GTGTFormInput): string {
  const { client, taxPeriod, outputRows, inputRows, prevCreditCarryover } = input;
  const { year, quarter } = taxPeriod;

  // 1. Phân loại Bán ra (Phụ lục 01-1) theo thuế suất
  const out0 = outputRows.filter(r => r.vatRate === 0);
  const out5 = outputRows.filter(r => r.vatRate === 5);
  const out8 = outputRows.filter(r => r.vatRate === 8);
  const out10 = outputRows.filter(r => r.vatRate === 10);

  const ct26 = 0; // HHDV không chịu thuế
  const ct29 = out0.reduce((s, r) => s + r.taxableAmount, 0); // Thuế suất 0%
  const ct30 = out5.reduce((s, r) => s + r.taxableAmount, 0); // Thuế suất 5%
  const ct31 = out5.reduce((s, r) => s + r.vatAmount, 0);
  const ct32a = out8.reduce((s, r) => s + r.taxableAmount, 0); // Thuế suất 8%
  const ct33a = out8.reduce((s, r) => s + r.vatAmount, 0);
  const ct32 = out10.reduce((s, r) => s + r.taxableAmount, 0); // Thuế suất 10%
  const ct33 = out10.reduce((s, r) => s + r.vatAmount, 0);

  const ct27 = ct29 + ct30 + ct32a + ct32; // Tổng doanh thu bán ra chịu thuế
  const ct28 = ct31 + ct33a + ct33;       // Tổng thuế GTGT bán ra
  const ct24 = outputRows.reduce((s, r) => s + r.taxableAmount, 0) + ct26;
  const ct25 = ct28;

  // 2. Mua vào (Phụ lục 01-2)
  const ct23 = inputRows.reduce((s, r) => s + r.taxableAmount, 0);
  const ct24_in = inputRows.reduce((s, r) => s + r.vatAmount, 0);
  const ct25_in = ct24_in; // Thuế GTGT mua vào được khấu trừ

  // 3. Nghĩa vụ thuế
  const ct22 = prevCreditCarryover;
  const ct36 = ct25_in + ct22; // Tổng thuế GTGT được khấu trừ kỳ này
  const ct40 = Math.max(0, ct28 - ct36); // Thuế GTGT còn phải nộp
  const ct41 = 0; // Thuế đề nghị hoàn
  const ct43 = Math.max(0, ct36 - ct28); // Thuế GTGT còn được khấu trừ chuyển kỳ sau

  const periodFrom = `${year}-${String((quarter - 1) * 3 + 1).padStart(2, '0')}-01`;
  const periodTo = new Date(year, quarter * 3, 0).toISOString().slice(0, 10);

  // Phụ lục 01-1 XML detail
  const pl011 = outputRows.map((r, i) => `
      <CT_01_1 STT="${i + 1}">
        <NgayHoaDon>${xmlEsc(r.invoiceDate)}</NgayHoaDon>
        <SoHoaDon>${xmlEsc(r.invoiceNo)}</SoHoaDon>
        <TenNguoiMua>${xmlEsc(r.sellerName)}</TenNguoiMua>
        <MaSoThueNguoiMua>${xmlEsc(r.sellerTaxCode)}</MaSoThueNguoiMua>
        <MoTaHangHoaDichVu>${xmlEsc(r.goodsDescription)}</MoTaHangHoaDichVu>
        <DoanhSoKhongThue>0</DoanhSoKhongThue>
        <DoanhSoChiuThue>${fmtNum(r.taxableAmount)}</DoanhSoChiuThue>
        <ThueSuat>${r.vatRate}</ThueSuat>
        <ThuGTGT>${fmtNum(r.vatAmount)}</ThuGTGT>
      </CT_01_1>`).join('');

  // Phụ lục 01-2 XML detail
  const pl012 = inputRows.map((r, i) => `
      <CT_01_2 STT="${i + 1}">
        <NgayHoaDon>${xmlEsc(r.invoiceDate)}</NgayHoaDon>
        <SoHoaDon>${xmlEsc(r.invoiceNo)}</SoHoaDon>
        <TenNguoiBan>${xmlEsc(r.sellerName)}</TenNguoiBan>
        <MaSoThueNguoiBan>${xmlEsc(r.sellerTaxCode)}</MaSoThueNguoiBan>
        <MoTaHangHoa>${xmlEsc(r.goodsDescription)}</MoTaHangHoa>
        <GiaTriHangHoaDVMuaVao>${fmtNum(r.taxableAmount)}</GiaTriHangHoaDVMuaVao>
        <ThueSuat>${r.vatRate}</ThueSuat>
        <ThuGTGTDuocKhauTru>${fmtNum(r.vatAmount)}</ThuGTGTDuocKhauTru>
      </CT_01_2>`).join('');

  return `<?xml version="1.0" encoding="UTF-8"?>
<HSoKhaiThue xmlns="http://kekhaithue.gdt.gov.vn/schemas">
  <TTinChung>
    <PhanMem>AccoDesk-Ultra-Pro-v4</PhanMem>
    <NgayLap>${today()}</NgayLap>
    <LoaiTKhai>01/GTGT</LoaiTKhai>
    <KiTinh>${year}Q${quarter}</KiTinh>
    <TuNgay>${periodFrom}</TuNgay>
    <DenNgay>${periodTo}</DenNgay>
    <NNT>
      <MaSoThue>${xmlEsc(client.taxCode)}</MaSoThue>
      <TenNguoiNop>${xmlEsc(client.name)}</TenNguoiNop>
      <DiaChi>${xmlEsc(client.address)}</DiaChi>
    </NNT>
  </TTinChung>

  <!-- Tờ khai chính 01/GTGT theo Thông tư 80/2021/TT-BTC -->
  <ToKhai_01_GTGT>
    <CT21>0</CT21>
    <CT22>${fmtNum(ct22)}</CT22>
    <CT23>${fmtNum(ct23)}</CT23>
    <CT24>${fmtNum(ct24_in)}</CT24>
    <CT25>${fmtNum(ct25_in)}</CT25>
    <CT26>${fmtNum(ct26)}</CT26>
    <CT27>${fmtNum(ct27)}</CT27>
    <CT28>${fmtNum(ct28)}</CT28>
    <CT29>${fmtNum(ct29)}</CT29>
    <CT30>${fmtNum(ct30)}</CT30>
    <CT31>${fmtNum(ct31)}</CT31>
    <CT32a>${fmtNum(ct32a)}</CT32a>
    <CT33a>${fmtNum(ct33a)}</CT33a>
    <CT32>${fmtNum(ct32)}</CT32>
    <CT33>${fmtNum(ct33)}</CT33>
    <CT40>${fmtNum(ct40)}</CT40>
    <CT41>${fmtNum(ct41)}</CT41>
    <CT43>${fmtNum(ct43)}</CT43>
  </ToKhai_01_GTGT>

  <!-- Phụ lục 01-1: Bảng kê HHDV bán ra -->
  <PhuLuc_01_1>
    <TongDoanhSo>${fmtNum(ct24)}</TongDoanhSo>
    <TongThue>${fmtNum(ct28)}</TongThue>
    <ChiTiet>${pl011}
    </ChiTiet>
  </PhuLuc_01_1>

  <!-- Phụ lục 01-2: Bảng kê HHDV mua vào -->
  <PhuLuc_01_2>
    <TongGiaTriMuaVao>${fmtNum(ct23)}</TongGiaTriMuaVao>
    <TongThueKhauTru>${fmtNum(ct25_in)}</TongThueKhauTru>
    <ChiTiet>${pl012}
    </ChiTiet>
  </PhuLuc_01_2>
</HSoKhaiThue>`;
}

// ============================================================
// GENERATOR 2: Mẫu 05/KK-TNCN — Khai Quyết Toán TNCN
// ============================================================

export function generatePITXML(input: PITFormInput): string {
  const { client, taxYear, payrollSummary } = input;
  const { entries, totalGross, totalPIT, totalNetSalary } = payrollSummary;

  const totalTaxableIncome = entries.reduce((s, e) => s + e.assessableIncome, 0);
  const totalDeductions = entries.reduce((s, e) => s + e.personalDeduction + e.dependentDeduction, 0);

  const empRows = entries.map((e, i) => `
      <NguoiNopThue STT="${i + 1}">
        <HoTen>${xmlEsc(e.employeeName)}</HoTen>
        <MaSoThue>${xmlEsc(e.taxCode)}</MaSoThue>
        <ThuNhapChiuThue>${fmtNum(e.assessableIncome)}</ThuNhapChiuThue>
        <CacKhoanGiamTru>${fmtNum(e.personalDeduction + e.dependentDeduction)}</CacKhoanGiamTru>
        <ThuNhapTinhThue>${fmtNum(Math.max(0, e.assessableIncome - e.personalDeduction - e.dependentDeduction))}</ThuNhapTinhThue>
        <ThueTNCNPhaiKhauTru>${fmtNum(e.pitAmount)}</ThueTNCNPhaiKhauTru>
        <ThueTNCNDaKhauTru>${fmtNum(e.pitAmount)}</ThueTNCNDaKhauTru>
        <SoNguoiPhuThuoc>${e.dependentsCount || 0}</SoNguoiPhuThuoc>
      </NguoiNopThue>`).join('');

  return `<?xml version="1.0" encoding="UTF-8"?>
<HSoKhaiThue xmlns="http://kekhaithue.gdt.gov.vn/schemas">
  <TTinChung>
    <PhanMem>AccoDesk-Ultra-Pro-v4</PhanMem>
    <NgayLap>${today()}</NgayLap>
    <LoaiTKhai>05/KK-TNCN</LoaiTKhai>
    <KiTinh>NamTinh${taxYear}</KiTinh>
    <NNT>
      <MaSoThue>${xmlEsc(client.taxCode)}</MaSoThue>
      <TenNguoiNop>${xmlEsc(client.name)}</TenNguoiNop>
      <DiaChi>${xmlEsc(client.address)}</DiaChi>
    </NNT>
  </TTinChung>

  <ToKhai_05_TNCN>
    <NamTinh>${taxYear}</NamTinh>
    <TongSoNguoiLaoDong>${entries.length}</TongSoNguoiLaoDong>
    <TongThuNhapChiuThue>${fmtNum(totalTaxableIncome)}</TongThuNhapChiuThue>
    <TongCacKhoanGiamTru>${fmtNum(totalDeductions)}</TongCacKhoanGiamTru>
    <TongThueTNCNDaKhauTru>${fmtNum(totalPIT)}</TongThueTNCNDaKhauTru>
    <TongThueTNCNPhaiNop>${fmtNum(totalPIT)}</TongThueTNCNPhaiNop>
    <TongThuNhapGross>${fmtNum(totalGross)}</TongThuNhapGross>
    <TongLuongThucLinh>${fmtNum(totalNetSalary)}</TongLuongThucLinh>
  </ToKhai_05_TNCN>

  <PhuLuc_DanhSachNNT>
    <TongSo>${entries.length}</TongSo>
    <ChiTiet>${empRows}
    </ChiTiet>
  </PhuLuc_DanhSachNNT>
</HSoKhaiThue>`;
}

// ============================================================
// GENERATOR 3: Mẫu 01/TNDN (01A/TNDN) — Khai TNDN Tạm Tính Quý
// ============================================================

export function generateTNDNXML(input: TNDNFormInput): string {
  const {
    client,
    taxPeriod,
    revenue,
    expenses,
    accountingProfit,
    nonDeductibleExpenses = 0,
    taxExemptIncome = 0,
    taxLossCarryforward = 0,
    taxRate = 20,
    taxPrepaid = 0,
  } = input;
  const { year, quarter } = taxPeriod;

  // Tính toán các chỉ tiêu theo Thông tư 80/2021/TT-BTC & HTKK
  const ct21 = Math.round(revenue || 0);
  const ct22 = Math.round(expenses || 0);
  const ct23 = accountingProfit !== undefined ? Math.round(accountingProfit) : (ct21 - ct22);
  const ct24 = Math.round(nonDeductibleExpenses || 0);
  const ct25 = Math.round(taxExemptIncome || 0);
  const ct26 = ct23 + ct24 - ct25; // Thu nhập chịu thuế
  const ct27 = Math.round(taxLossCarryforward || 0);
  const ct28 = Math.max(0, ct26 - ct27); // Thu nhập tính thuế
  const ct29 = taxRate; // Thuế suất (%)
  const ct30 = Math.round(ct28 * (ct29 / 100)); // Thuế TNDN phát sinh
  const ct31 = Math.round(taxPrepaid || 0); // Đã tạm nộp các kỳ trước
  const ct32 = Math.max(0, ct30 - ct31); // Còn phải nộp kỳ này

  const periodFrom = `${year}-${String((quarter - 1) * 3 + 1).padStart(2, '0')}-01`;
  const periodTo = new Date(year, quarter * 3, 0).toISOString().slice(0, 10);

  return `<?xml version="1.0" encoding="UTF-8"?>
<HSoKhaiThue xmlns="http://kekhaithue.gdt.gov.vn/schemas">
  <TTinChung>
    <PhanMem>AccoDesk-Ultra-Pro-v4</PhanMem>
    <NgayLap>${today()}</NgayLap>
    <LoaiTKhai>01/TNDN</LoaiTKhai>
    <KiTinh>${year}Q${quarter}</KiTinh>
    <TuNgay>${periodFrom}</TuNgay>
    <DenNgay>${periodTo}</DenNgay>
    <NNT>
      <MaSoThue>${xmlEsc(client.taxCode)}</MaSoThue>
      <TenNguoiNop>${xmlEsc(client.name)}</TenNguoiNop>
      <DiaChi>${xmlEsc(client.address)}</DiaChi>
    </NNT>
  </TTinChung>

  <!-- Tờ khai thuế TNDN tạm tính theo Thông tư 80/2021/TT-BTC -->
  <ToKhai_01_TNDN>
    <CT21>${fmtNum(ct21)}</CT21>
    <CT22>${fmtNum(ct22)}</CT22>
    <CT23>${fmtNum(ct23)}</CT23>
    <CT24>${fmtNum(ct24)}</CT24>
    <CT25>${fmtNum(ct25)}</CT25>
    <CT26>${fmtNum(ct26)}</CT26>
    <CT27>${fmtNum(ct27)}</CT27>
    <CT28>${fmtNum(ct28)}</CT28>
    <CT29>${ct29}</CT29>
    <CT30>${fmtNum(ct30)}</CT30>
    <CT31>${fmtNum(ct31)}</CT31>
    <CT32>${fmtNum(ct32)}</CT32>
  </ToKhai_01_TNDN>
</HSoKhaiThue>`;
}

// ============================================================
// VALIDATOR HELPER FOR HTKK ETAX XML
// ============================================================

export function validateHTKKXML(xml: string): XMLValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!xml || xml.trim().length === 0) {
    errors.push('File XML rỗng.');
    return { isValid: false, errors, warnings };
  }

  if (!xml.includes('<HSoKhaiThue')) {
    errors.push('Thiếu thẻ gốc <HSoKhaiThue>');
  }

  if (!xml.includes('<TTinChung>')) {
    errors.push('Thiếu thẻ <TTinChung> thông tin chung tờ khai');
  }

  if (!xml.includes('<MaSoThue>')) {
    errors.push('Thiếu Mã số thuế người nộp thuế <MaSoThue>');
  }

  if (xml.includes('01/GTGT')) {
    if (!xml.includes('<ToKhai_01_GTGT>')) {
      errors.push('Thiếu thẻ nội dung chính <ToKhai_01_GTGT>');
    }
    if (!xml.includes('<CT22>')) {
      warnings.push('Chưa tìm thấy thẻ chỉ tiêu [22] khấu trừ kỳ trước.');
    }
  }

  if (xml.includes('01/TNDN') || xml.includes('01A/TNDN')) {
    if (!xml.includes('<ToKhai_01_TNDN>')) {
      errors.push('Thiếu thẻ nội dung chính <ToKhai_01_TNDN>');
    }
    if (!xml.includes('<CT21>')) {
      warnings.push('Chưa tìm thấy thẻ chỉ tiêu [21] doanh thu phát sinh.');
    }
    if (!xml.includes('<CT30>')) {
      warnings.push('Chưa tìm thấy thẻ chỉ tiêu [30] thuế TNDN phát sinh.');
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

// ============================================================
// DOWNLOAD HELPER (browser)
// ============================================================

export function downloadXML(xml: string, filename: string): void {
  // Thêm UTF-8 BOM để HTKK Windows nhận dạng chính xác tiếng Việt có dấu
  const blob = new Blob(['\uFEFF' + xml], { type: 'application/xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ============================================================
// HELPER: Chuyển NormalizedTransaction → VATRow
// ============================================================

export function txsToVATRows(
  txs: NormalizedTransaction[],
  type: 'OUTPUT' | 'INPUT',
  vatRate: 0 | 5 | 8 | 10 = 10,
): VATRow[] {
  const vatAcc = type === 'OUTPUT' ? '3331' : '133';
  return txs
    .filter(t => t.debitAcc?.startsWith(vatAcc) || t.creditAcc?.startsWith(vatAcc))
    .map(t => {
      const vatAmt = t.amount;
      const taxable = Math.round(vatAmt / (vatRate / 100));
      return {
        invoiceDate: t.date,
        invoiceNo: t.voucherNo,
        sellerName: t.partnerName || '',
        sellerTaxCode: t.partnerTaxCode || '',
        goodsDescription: t.description,
        taxableAmount: taxable,
        vatAmount: vatAmt,
        vatRate,
      };
    });
}
