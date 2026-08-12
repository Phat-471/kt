/**
 * eTax XML Generator — Tạo File XML Khai Thuế eTax
 * Chuẩn: Tổng Cục Thuế Việt Nam
 * Mẫu:
 *   - 01/GTGT: Khai thuế GTGT theo quý (Điều 13 TT80/2021)
 *   - 05/KK-TNCN: Khai quyết toán thuế TNCN (Điều 44 TT111/2013)
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

const fmtNum = (n: number) => Math.round(n).toString();
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
}

export interface GTGTFormInput {
  client: Client;
  taxPeriod: { year: number; quarter: 1 | 2 | 3 | 4 };
  outputRows: VATRow[];    // Bảng kê hóa đơn bán ra (Phụ lục 01-1)
  inputRows: VATRow[];     // Bảng kê hóa đơn mua vào (Phụ lục 01-2)
  prevCreditCarryover: number;  // VAT đầu vào còn lại từ kỳ trước
}

export interface PITFormInput {
  client: Client;
  taxYear: number;
  payrollSummary: PayrollSummary;
}

// ============================================================
// GENERATOR 1: Mẫu 01/GTGT — Khai Thuế GTGT
// ============================================================

export function generateGTGTXML(input: GTGTFormInput): string {
  const { client, taxPeriod, outputRows, inputRows, prevCreditCarryover } = input;
  const { year, quarter } = taxPeriod;

  // Tính toán
  const totalOutputTaxable = outputRows.reduce((s, r) => s + r.taxableAmount, 0);
  const totalOutputVAT = outputRows.reduce((s, r) => s + r.vatAmount, 0);
  const totalInputTaxable = inputRows.reduce((s, r) => s + r.taxableAmount, 0);
  const totalInputVAT = inputRows.reduce((s, r) => s + r.vatAmount, 0);
  const creditableInputVAT = totalInputVAT + prevCreditCarryover;
  const vatPayable = Math.max(0, totalOutputVAT - creditableInputVAT);
  const vatRefundable = Math.max(0, creditableInputVAT - totalOutputVAT);

  const periodFrom = `${year}-${String((quarter - 1) * 3 + 1).padStart(2, '0')}-01`;
  const periodTo = new Date(year, quarter * 3, 0).toISOString().slice(0, 10);

  // Phụ lục 01-1: Bảng kê hàng hóa dịch vụ bán ra
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

  // Phụ lục 01-2: Bảng kê hàng hóa dịch vụ mua vào
  const pl012 = inputRows.map((r, i) => `
      <CT_01_2 STT="${i + 1}">
        <NgayHoaDon>${xmlEsc(r.invoiceDate)}</NgayHoaDon>
        <SoHoaDon>${xmlEsc(r.invoiceNo)}</SoHoaDon>
        <TenNguoiBan>${xmlEsc(r.sellerName)}</TenNguoiBan>
        <MaSoThueBen>${xmlEsc(r.sellerTaxCode)}</MaSoThueBen>
        <MoTaHangHoa>${xmlEsc(r.goodsDescription)}</MoTaHangHoa>
        <GiaTriHangHoaDVMuaVao>${fmtNum(r.taxableAmount)}</GiaTriHangHoaDVMuaVao>
        <ThueSuat>${r.vatRate}</ThueSuat>
        <ThuGTGTDuocKhauTru>${fmtNum(r.vatAmount)}</ThuGTGTDuocKhauTru>
      </CT_01_2>`).join('');

  return `<?xml version="1.0" encoding="UTF-8"?>
<HSoKhaiThue xmlns="http://kekhaithue.gdt.gov.vn/schemas">
  <TTinChung>
    <PhanMem>KeToanPro-Offline-v4</PhanMem>
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

  <!-- Tờ khai chính 01/GTGT -->
  <ToKhai_01_GTGT>
    <!-- I. Thuế GTGT còn được khấu trừ kỳ trước chuyển sang -->
    <ThueTNCNConKhauTruChuyenSang>${fmtNum(prevCreditCarryover)}</ThueTNCNConKhauTruChuyenSang>

    <!-- II. Kê khai thuế GTGT hàng hóa dịch vụ bán ra trong kỳ -->
    <TongDoanhSoHHDVBanRa>${fmtNum(totalOutputTaxable)}</TongDoanhSoHHDVBanRa>
    <TongThueTGTGHHDVBanRa>${fmtNum(totalOutputVAT)}</TongThueTGTGHHDVBanRa>

    <!-- III. Thuế GTGT đầu vào được khấu trừ -->
    <TongGiaTriHHDVMuaVao>${fmtNum(totalInputTaxable)}</TongGiaTriHHDVMuaVao>
    <TongThueTGTGMuaVao>${fmtNum(totalInputVAT)}</TongThueTGTGMuaVao>
    <ThueTGTGDuocKhauTruKy>${fmtNum(creditableInputVAT)}</ThueTGTGDuocKhauTruKy>

    <!-- IV. Xác định nghĩa vụ thuế GTGT phải nộp -->
    <ThueTGTGPhaiNop>${fmtNum(vatPayable)}</ThueTGTGPhaiNop>
    <ThueTGTGDuocHoanTra>${fmtNum(vatRefundable)}</ThueTGTGDuocHoanTra>
    <ThueTGTGConDuocKhauTruChuyenKyTiepTheo>${fmtNum(Math.max(0, vatRefundable - 0))}</ThueTGTGConDuocKhauTruChuyenKyTiepTheo>
  </ToKhai_01_GTGT>

  <!-- Phụ lục 01-1: Bảng kê HHDV bán ra -->
  <PhuLuc_01_1>
    <TongDoanhSo>${fmtNum(totalOutputTaxable)}</TongDoanhSo>
    <TongThue>${fmtNum(totalOutputVAT)}</TongThue>
    <ChiTiet>${pl011}
    </ChiTiet>
  </PhuLuc_01_1>

  <!-- Phụ lục 01-2: Bảng kê HHDV mua vào -->
  <PhuLuc_01_2>
    <TongGiaTriMuaVao>${fmtNum(totalInputTaxable)}</TongGiaTriMuaVao>
    <TongThueKhauTru>${fmtNum(totalInputVAT)}</TongThueKhauTru>
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

  // Tổng thu nhập chịu thuế = Tổng gross - miễn thuế (meal ≤ 730k/người)
  const totalTaxableIncome = entries.reduce((s, e) => s + e.assessableIncome, 0);
  // Tổng các khoản giảm trừ
  const totalDeductions = entries.reduce((s, e) => s + e.personalDeduction + e.dependentDeduction, 0);

  // Bảng phụ lục DS nhân viên
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
    <PhanMem>KeToanPro-Offline-v4</PhanMem>
    <NgayLap>${today()}</NgayLap>
    <LoaiTKhai>05/KK-TNCN</LoaiTKhai>
    <KiTinh>NamTinh${taxYear}</KiTinh>
    <NNT>
      <MaSoThue>${xmlEsc(client.taxCode)}</MaSoThue>
      <TenNguoiNop>${xmlEsc(client.name)}</TenNguoiNop>
      <DiaChi>${xmlEsc(client.address)}</DiaChi>
    </NNT>
  </TTinChung>

  <!-- Tờ khai 05/KK-TNCN — Quyết toán thuế TNCN năm ${taxYear} -->
  <ToKhai_05_TNCN>
    <NamTinh>${taxYear}</NamTinh>
    <TongSoNguoiLaoDong>${entries.length}</TongSoNguoiLaoDong>

    <!-- I. Tổng thu nhập chịu thuế -->
    <TongThuNhapChiuThue>${fmtNum(totalTaxableIncome)}</TongThuNhapChiuThue>

    <!-- II. Tổng các khoản giảm trừ -->
    <TongCacKhoanGiamTru>${fmtNum(totalDeductions)}</TongCacKhoanGiamTru>

    <!-- III. Tổng thuế TNCN đã khấu trừ -->
    <TongThueTNCNDaKhauTru>${fmtNum(totalPIT)}</TongThueTNCNDaKhauTru>

    <!-- IV. Tổng thuế TNCN phải nộp -->
    <TongThueTNCNPhaiNop>${fmtNum(totalPIT)}</TongThueTNCNPhaiNop>

    <!-- Tổng lương gross -->
    <TongThuNhapGross>${fmtNum(totalGross)}</TongThuNhapGross>
    <TongLuongThucLinh>${fmtNum(totalNetSalary)}</TongLuongThucLinh>
  </ToKhai_05_TNCN>

  <!-- Phụ lục: Danh sách người nộp thuế -->
  <PhuLuc_DanhSachNNT>
    <TongSo>${entries.length}</TongSo>
    <ChiTiet>${empRows}
    </ChiTiet>
  </PhuLuc_DanhSachNNT>
</HSoKhaiThue>`;
}

// ============================================================
// DOWNLOAD HELPER (browser)
// ============================================================

export function downloadXML(xml: string, filename: string): void {
  const blob = new Blob([xml], { type: 'application/xml;charset=utf-8' });
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
// HELPER: Chuyển NormalizedTransaction → VATRow (bán ra / mua vào)
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
