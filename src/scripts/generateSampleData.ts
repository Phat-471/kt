import * as fs from 'fs';
import * as path from 'path';
import * as XLSX from 'xlsx';

const SAMPLE_DIR = path.resolve(process.cwd(), 'sample_data');
const XML_DIR = path.join(SAMPLE_DIR, '04_Hoa_Don_Dien_Tu_XML_TT78');

if (!fs.existsSync(SAMPLE_DIR)) {
  fs.mkdirSync(SAMPLE_DIR, { recursive: true });
}
if (!fs.existsSync(XML_DIR)) {
  fs.mkdirSync(XML_DIR, { recursive: true });
}

console.log('🚀 Bắt đầu tạo bộ dữ liệu mẫu kiểm thử toàn diện cho AccoDesk Ultra Pro...');

// =========================================================================
// 1. FILE EXCEL SỔ NHẬT KÝ CHUNG (Để test Import Excel, Sổ sách, BCTC, Thuế)
// =========================================================================
const journalData = [
  {
    'Ngày CT': '2026-07-05',
    'Số CT': 'PT001',
    'Diễn giải': 'Thu tiền bán hàng đợt 1 HĐ01 - Công ty Xây Dựng Nam Á',
    'TK Nợ': '1111',
    'TK Có': '5111',
    'Số tiền': 150000000,
    'Tên đối tác': 'Công ty CP Xây Dựng Nam Á',
    'MST đối tác': '0108889999',
    'Loại': 'THU_TIEN',
  },
  {
    'Ngày CT': '2026-07-05',
    'Số CT': 'HDO-001',
    'Diễn giải': 'Thuế GTGT đầu ra 10% HĐ01 Nam Á',
    'TK Nợ': '1111',
    'TK Có': '33311',
    'Số tiền': 15000000,
    'Tên đối tác': 'Công ty CP Xây Dựng Nam Á',
    'MST đối tác': '0108889999',
    'Loại': 'THU_TIEN',
  },
  {
    'Ngày CT': '2026-07-10',
    'Số CT': 'UNC001',
    'Diễn giải': 'Chuyển khoản mua Xi măng Hà Tiên phục vụ công trình HĐ01',
    'TK Nợ': '1541',
    'TK Có': '1121',
    'Số tiền': 45000000,
    'Tên đối tác': 'Công ty Xi Măng Hà Tiên',
    'MST đối tác': '0301234567',
    'Loại': 'CHI_TIEN',
  },
  {
    'Ngày CT': '2026-07-10',
    'Số CT': 'HDV-102',
    'Diễn giải': 'Thuế GTGT đầu vào mua xi măng 10%',
    'TK Nợ': '1331',
    'TK Có': '1121',
    'Số tiền': 4500000,
    'Tên đối tác': 'Công ty Xi Măng Hà Tiên',
    'MST đối tác': '0301234567',
    'Loại': 'CHI_TIEN',
  },
  {
    'Ngày CT': '2026-07-15',
    'Số CT': 'PC002',
    'Diễn giải': 'Chi tiền mặt thanh toán tiền nhân công trực tiếp HĐ01',
    'TK Nợ': '1542',
    'TK Có': '1111',
    'Số tiền': 18000000,
    'Tên đối tác': 'Đội thi công số 1',
    'MST đối tác': '',
    'Loại': 'CHI_TIEN',
  },
  {
    'Ngày CT': '2026-07-20',
    'Số CT': 'UNC002',
    'Diễn giải': 'Thu tiền chuyển khoản bán thiết bị văn phòng',
    'TK Nợ': '1121',
    'TK Có': '5112',
    'Số tiền': 85000000,
    'Tên đối tác': 'Tập Đoàn Công Nghệ Phúc Thịnh',
    'MST đối tác': '0106677889',
    'Loại': 'THU_TIEN',
  },
  {
    'Ngày CT': '2026-07-20',
    'Số CT': 'HDO-002',
    'Diễn giải': 'Thuế GTGT đầu ra 8% thiết bị',
    'TK Nợ': '1121',
    'TK Có': '33311',
    'Số tiền': 6800000,
    'Tên đối tác': 'Tập Đoàn Công Nghệ Phúc Thịnh',
    'MST đối tác': '0106677889',
    'Loại': 'THU_TIEN',
  },
  {
    'Ngày CT': '2026-07-25',
    'Số CT': 'PKH01',
    'Diễn giải': 'Trích khấu hao TSCĐ tháng 07/2026 máy xúc CAT',
    'TK Nợ': '1543',
    'TK Có': '2141',
    'Số tiền': 5000000,
    'Tên đối tác': 'Nội bộ',
    'MST đối tác': '',
    'Loại': 'KHAC',
  },
  {
    'Ngày CT': '2026-07-28',
    'Số CT': '', // Cố tình để trống Số CT để test cảnh báo [B4] khoản chi >= 5M thiếu hóa đơn
    'Diễn giải': 'Chi mua vật tư lẻ ngoài chợ không lấy hóa đơn',
    'TK Nợ': '6422',
    'TK Có': '1111',
    'Số tiền': 7500000,
    'Tên đối tác': 'Cửa hàng vật liệu tư nhân',
    'MST đối tác': '',
    'Loại': 'CHI_TIEN',
  },
  {
    'Ngày CT': '2026-07-29',
    'Số CT': 'PC009',
    'Diễn giải': 'Chi tiền mặt mua máy photocopy văn phòng vượt trần tiền mặt',
    'TK Nợ': '2111',
    'TK Có': '1111', // Cố tình chi tiền mặt >= 20M để test cảnh báo [B4] thanh toán tiền mặt
    'Số tiền': 26000000,
    'Tên đối tác': 'Công ty Thiết Bị Văn Phòng Hải Hà',
    'MST đối tác': '0105556667',
    'Loại': 'CHI_TIEN',
  },
  {
    'Ngày CT': '2026-07-30',
    'Số CT': 'PC010',
    'Diễn giải': 'Mua hàng hóa từ nhà cung cấp có rủi ro bỏ trốn',
    'TK Nợ': '1561',
    'TK Có': '1121',
    'Số tiền': 30000000,
    'Tên đối tác': 'Công ty TNHH Ma Trận Việt', // Cố tình dùng MST rủi ro trong CSDL
    'MST đối tác': '0109999888',
    'Loại': 'CHI_TIEN',
  },
  {
    'Ngày CT': '2026-07-31',
    'Số CT': 'PL007',
    'Diễn giải': 'Hạch toán chi phí lương tháng 07/2026 nhân viên văn phòng',
    'TK Nợ': '6422',
    'TK Có': '3341',
    'Số tiền': 35000000,
    'Tên đối tác': 'Nhân viên công ty',
    'MST đối tác': '',
    'Loại': 'CHI_TIEN',
  },
];

const wsJournal = XLSX.utils.json_to_sheet(journalData);
const wbJournal = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wbJournal, wsJournal, 'Nhat_Ky_Chung');
const journalPath = path.join(SAMPLE_DIR, '01_So_Nhat_Ky_Chung_2026.xlsx');
XLSX.writeFile(wbJournal, journalPath);
console.log(`✅ [1/5] Đã tạo file: ${journalPath}`);

// =========================================================================
// 2. FILE EXCEL SAO KÊ NGÂN HÀNG (Để test Phân hệ Đối Chiếu Sao Kê - Reconcile)
// =========================================================================
const bankData = [
  {
    'Ngày GD': '2026-07-10',
    'Số giao dịch / Mã bút toán': 'FT261918829910',
    'Nội dung giao dịch (Description)': 'CONG TY AN PHAT chuyen tien thanh toan mua xi mang Ha Tien HD01',
    'Số tiền ghi Nợ (Rút ra)': 49500000, // 45M + 4.5M VAT = 49.5M (Khớp hoàn hảo với UNC001 + HDV-102)
    'Số tiền ghi Có (Nhận vào)': 0,
    'Số dư sau GD': 150500000,
    'Tài khoản đối ứng': '0301234567',
  },
  {
    'Ngày GD': '2026-07-20',
    'Số giao dịch / Mã bút toán': 'FT262019938821',
    'Nội dung giao dịch (Description)': 'TAP DOAN PHUC THINH chuyen tien mua thiet bi van phong HD02',
    'Số tiền ghi Nợ (Rút ra)': 0,
    'Số tiền ghi Có (Nhận vào)': 91800000, // 85M + 6.8M VAT = 91.8M (Khớp hoàn hảo UNC002 + HDO-002)
    'Số dư sau GD': 242300000,
    'Tài khoản đối ứng': '0106677889',
  },
  {
    'Ngày GD': '2026-07-30',
    'Số giao dịch / Mã bút toán': 'FT262118833912',
    'Nội dung giao dịch (Description)': 'Chuyen tien mua hang hoa Ma Tran Viet',
    'Số tiền ghi Nợ (Rút ra)': 30000000,
    'Số tiền ghi Có (Nhận vào)': 0,
    'Số dư sau GD': 212300000,
    'Tài khoản đối ứng': '0109999888',
  },
  {
    'Ngày GD': '2026-07-31',
    'Số giao dịch / Mã bút toán': 'FT262129994811',
    'Nội dung giao dịch (Description)': 'Phi duy tri tai khoan doanh nghiep thang 07/2026',
    'Số tiền ghi Nợ (Rút ra)': 55000, // Khoản phí ngân hàng chưa hạch toán trên sổ kế toán -> Test phát hiện lệch
    'Số tiền ghi Có (Nhận vào)': 0,
    'Số dư sau GD': 212245000,
    'Tài khoản đối ứng': 'VCB-FEE',
  },
];

const wsBank = XLSX.utils.json_to_sheet(bankData);
const wbBank = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wbBank, wsBank, 'Sao_Ke_VCB');
const bankPath = path.join(SAMPLE_DIR, '02_Sao_Ke_Ngan_Hang_VCB_Q3_2026.xlsx');
XLSX.writeFile(wbBank, bankPath);
console.log(`✅ [2/5] Đã tạo file: ${bankPath}`);

// =========================================================================
// 3. FILE EXCEL BẢNG KÊ HÓA ĐƠN MUA VÀO & BÁN RA (Test Thuế GTGT)
// =========================================================================
const vatSalesData = [
  {
    'Ký hiệu mẫu số': '1',
    'Ký hiệu HĐ': '1C26TBB',
    'Số HĐ': '0001234',
    'Ngày HĐ': '2026-07-05',
    'Tên người mua': 'Công ty CP Xây Dựng Nam Á',
    'MST người mua': '0108889999',
    'Doanh số chưa thuế': 150000000,
    'Thuế suất': '10%',
    'Tiền thuế GTGT': 15000000,
  },
  {
    'Ký hiệu mẫu số': '1',
    'Ký hiệu HĐ': '1C26TBB',
    'Số HĐ': '0001235',
    'Ngày HĐ': '2026-07-20',
    'Tên người mua': 'Tập Đoàn Công Nghệ Phúc Thịnh',
    'MST người mua': '0106677889',
    'Doanh số chưa thuế': 85000000,
    'Thuế suất': '8%',
    'Tiền thuế GTGT': 6800000,
  },
];

const vatPurchaseData = [
  {
    'Ký hiệu mẫu số': '1',
    'Ký hiệu HĐ': '1C26THT',
    'Số HĐ': '0005678',
    'Ngày HĐ': '2026-07-10',
    'Tên người bán': 'Công ty Xi Măng Hà Tiên',
    'MST người bán': '0301234567',
    'Giá trị mua chưa thuế': 45000000,
    'Thuế suất': '10%',
    'Tiền thuế GTGT': 4500000,
  },
  {
    'Ký hiệu mẫu số': '1',
    'Ký hiệu HĐ': '1C26TMV',
    'Số HĐ': '0009999',
    'Ngày HĐ': '2026-07-30',
    'Tên người bán': 'Công ty TNHH Ma Trận Việt',
    'MST người bán': '0109999888',
    'Giá trị mua chưa thuế': 30000000,
    'Thuế suất': '10%',
    'Tiền thuế GTGT': 3000000,
  },
];

const wbVat = XLSX.utils.book_new();
const wsVatSales = XLSX.utils.json_to_sheet(vatSalesData);
const wsVatPurchase = XLSX.utils.json_to_sheet(vatPurchaseData);
XLSX.utils.book_append_sheet(wbVat, wsVatSales, 'PL01-1_BanRa');
XLSX.utils.book_append_sheet(wbVat, wsVatPurchase, 'PL01-2_MuaVao');
const vatPath = path.join(SAMPLE_DIR, '03_Bang_Ke_Mua_Vao_Ban_Ra.xlsx');
XLSX.writeFile(wbVat, vatPath);
console.log(`✅ [3/5] Đã tạo file: ${vatPath}`);

// =========================================================================
// 4. CÁC FILE HÓA ĐƠN ĐIỆN TỬ XML CHUẨN THÔNG TƯ 78 / NGHỊ ĐỊNH 123
// =========================================================================
const xmlOut = `<?xml version="1.0" encoding="UTF-8"?>
<HDon>
  <DLHDon Id="HD0001234">
    <TTChung>
      <PBan>2.0.0</PBan>
      <THDon>Hóa đơn giá trị gia tăng</THDon>
      <KHMSHDon>1</KHMSHDon>
      <KHHDon>1C26TBB</KHHDon>
      <SHDon>0001234</SHDon>
      <NLap>2026-07-05</NLap>
      <DVTTe>VND</DVTTe>
      <TGia>1</TGia>
      <HTTToan>TM/CK</HTTToan>
    </TTChung>
    <NDHDon>
      <NBan>
        <Ten>CÔNG TY TNHH ĐẦU TƯ &amp; PHÁT TRIỂN AN PHÁT</Ten>
        <MST>0101234567</MST>
        <DChi>Số 123 Đường Láng, Đống Đa, Hà Nội</DChi>
      </NBan>
      <NMua>
        <Ten>CÔNG TY CP XÂY DỰNG NAM Á</Ten>
        <MST>0108889999</MST>
        <DChi>Quận Cầu Giấy, Hà Nội</DChi>
      </NMua>
      <DSHHDVu>
        <HHDVu>
          <STT>1</STT>
          <THHDVu>Thi công xây dựng công trình HĐ01 giai đoạn 1</THHDVu>
          <DVTinh>Gói</DVTinh>
          <SLuong>1</SLuong>
          <DGia>150000000</DGia>
          <Tien>150000000</Tien>
          <TSuat>10%</TSuat>
        </HHDVu>
      </DSHHDVu>
      <TToan>
        <TgTCThue>150000000</TgTCThue>
        <TgTThue>15000000</TgTThue>
        <TgTTTBSo>165000000</TgTTTBSo>
        <TgTTTBChu>Một trăm sáu mươi lăm triệu đồng chẵn</TgTTTBChu>
      </TToan>
    </NDHDon>
  </DLHDon>
  <DSCKS>
    <NBan>
      <Signature xmlns="http://www.w3.org/2000/09/xmldsig#">
        <SignedInfo>
          <CanonicalizationMethod Algorithm="http://www.w3.org/TR/2001/REC-xml-c14n-20010315"/>
          <SignatureMethod Algorithm="http://www.w3.org/2000/09/xmldsig#rsa-sha1"/>
          <Reference URI="#HD0001234">
            <DigestMethod Algorithm="http://www.w3.org/2000/09/xmldsig#sha1"/>
            <DigestValue>dGVzdFNpZ25hdHVyZVBhc3NlZDEwMA==</DigestValue>
          </Reference>
        </SignedInfo>
        <SignatureValue>dGVzdFNpZ25hdHVyZVBhc3NlZDEwMA==</SignatureValue>
      </Signature>
    </NBan>
  </DSCKS>
</HDon>`;

const xmlIn = `<?xml version="1.0" encoding="UTF-8"?>
<HDon>
  <DLHDon Id="HD0005678">
    <TTChung>
      <PBan>2.0.0</PBan>
      <THDon>Hóa đơn giá trị gia tăng</THDon>
      <KHMSHDon>1</KHMSHDon>
      <KHHDon>1C26THT</KHHDon>
      <SHDon>0005678</SHDon>
      <NLap>2026-07-10</NLap>
      <DVTTe>VND</DVTTe>
      <TGia>1</TGia>
      <HTTToan>CK</HTTToan>
    </TTChung>
    <NDHDon>
      <NBan>
        <Ten>CÔNG TY XI MĂNG HÀ TIÊN</Ten>
        <MST>0301234567</MST>
        <DChi>TP. Hồ Chí Minh</DChi>
      </NBan>
      <NMua>
        <Ten>CÔNG TY TNHH ĐẦU TƯ &amp; PHÁT TRIỂN AN PHÁT</Ten>
        <MST>0101234567</MST>
        <DChi>Số 123 Đường Láng, Đống Đa, Hà Nội</DChi>
      </NMua>
      <DSHHDVu>
        <HHDVu>
          <STT>1</STT>
          <THHDVu>Xi măng PCB40 Hà Tiên bao 50kg</THHDVu>
          <DVTinh>Tấn</DVTinh>
          <SLuong>30</SLuong>
          <DGia>1500000</DGia>
          <Tien>45000000</Tien>
          <TSuat>10%</TSuat>
        </HHDVu>
      </DSHHDVu>
      <TToan>
        <TgTCThue>45000000</TgTCThue>
        <TgTThue>4500000</TgTThue>
        <TgTTTBSo>49500000</TgTTTBSo>
        <TgTTTBChu>Bốn mươi chín triệu năm trăm nghìn đồng chẵn</TgTTTBChu>
      </TToan>
    </NDHDon>
  </DLHDon>
</HDon>`;

const xmlRisky = `<?xml version="1.0" encoding="UTF-8"?>
<HDon>
  <DLHDon Id="HD0009999">
    <TTChung>
      <PBan>2.0.0</PBan>
      <THDon>Hóa đơn giá trị gia tăng</THDon>
      <KHMSHDon>1</KHMSHDon>
      <KHHDon>1C26TMV</KHHDon>
      <SHDon>0009999</SHDon>
      <NLap>2026-07-30</NLap>
      <DVTTe>VND</DVTTe>
      <TGia>1</TGia>
      <HTTToan>CK</HTTToan>
    </TTChung>
    <NDHDon>
      <NBan>
        <Ten>CÔNG TY TNHH MA TRẬN VIỆT</Ten>
        <MST>0109999888</MST>
        <DChi>Hà Nội</DChi>
      </NBan>
      <NMua>
        <Ten>CÔNG TY TNHH ĐẦU TƯ &amp; PHÁT TRIỂN AN PHÁT</Ten>
        <MST>0101234567</MST>
        <DChi>Hà Nội</DChi>
      </NMua>
      <DSHHDVu>
        <HHDVu>
          <STT>1</STT>
          <THHDVu>Vật liệu xây dựng tổng hợp</THHDVu>
          <DVTinh>Lô</DVTinh>
          <SLuong>1</SLuong>
          <DGia>30000000</DGia>
          <Tien>30000000</Tien>
          <TSuat>10%</TSuat>
        </HHDVu>
      </DSHHDVu>
      <TToan>
        <TgTCThue>30000000</TgTCThue>
        <TgTThue>3000000</TgTThue>
        <TgTTTBSo>33000000</TgTTTBSo>
        <TgTTTBChu>Ba mươi ba triệu đồng</TgTTTBChu>
      </TToan>
    </NDHDon>
  </DLHDon>
</HDon>`;

fs.writeFileSync(path.join(XML_DIR, 'HDDT_DauRa_0001234.xml'), xmlOut, 'utf-8');
fs.writeFileSync(path.join(XML_DIR, 'HDDT_DauVao_0005678.xml'), xmlIn, 'utf-8');
fs.writeFileSync(path.join(XML_DIR, 'HDDT_DauVao_0009999_RuiRo.xml'), xmlRisky, 'utf-8');
console.log(`✅ [4/5] Đã tạo 3 file Hóa đơn điện tử XML TT78 trong: ${XML_DIR}`);

// =========================================================================
// 5. TỆP SAO LƯU DỮ LIỆU ĐẦY ĐỦ (Test Khôi phục / Restore)
// =========================================================================
const fullBackupData = {
  version: '2.0.0',
  exportDate: new Date().toISOString(),
  clients: [
    {
      id: 'c_anphat',
      name: 'Công ty TNHH Đầu Tư & Phát Triển An Phát',
      taxCode: '0101234567',
      address: 'Số 123 Đường Láng, Đống Đa, Hà Nội',
      accountingStandard: 'TT200',
      industryPreset: 'CONSTRUCTION',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-08-14T00:00:00.000Z',
    },
    {
      id: 'c_saoviet',
      name: 'Công ty CP Thương Mại Sao Việt',
      taxCode: '0301234567',
      address: 'Quận 1, TP. Hồ Chí Minh',
      accountingStandard: 'TT133',
      industryPreset: 'COMMERCE',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-08-14T00:00:00.000Z',
    },
    {
      id: 'c_phucloc',
      name: 'Hộ Kinh Doanh Dịch Vụ Phúc Lộc',
      taxCode: '8012345678',
      address: 'Hải Châu, Đà Nẵng',
      accountingStandard: 'TT88_HKD',
      industryPreset: 'SERVICE',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-08-14T00:00:00.000Z',
    },
  ],
  transactions: journalData.map((d, i) => ({
    id: `tx_sample_${i + 1}`,
    clientId: 'c_anphat',
    sourceFileName: '01_So_Nhat_Ky_Chung_2026.xlsx',
    importDate: '2026-08-14',
    type: d['Loại'] === 'THU_TIEN' ? 'INCOME' : 'EXPENSE',
    date: d['Ngày CT'],
    voucherNo: d['Số CT'],
    description: d['Diễn giải'],
    debitAcc: d['TK Nợ'],
    creditAcc: d['TK Có'],
    amount: d['Số tiền'],
    partnerName: d['Tên đối tác'],
    partnerTaxCode: d['MST đối tác'],
    rawRow: d,
    validationStatus: !d['Số CT'] || (d['Số tiền'] >= 20000000 && d['TK Có'] === '1111') ? 'INVALID' : 'VALID',
    errors: !d['Số CT'] ? ['Thiếu số chứng từ'] : [],
    userApproved: true,
  })),
  reconciliations: [],
  mappingTemplates: [],
  auditLogs: [],
};

const backupPath = path.join(SAMPLE_DIR, '05_AccoDesk_MasterBackup_FullData.accobak');
fs.writeFileSync(backupPath, JSON.stringify(fullBackupData, null, 2), 'utf-8');
console.log(`✅ [5/5] Đã tạo tệp sao lưu chuẩn: ${backupPath}`);

// =========================================================================
// 6. HƯỚNG DẪN KIỂM THỬ TỪNG TÍNH NĂNG (README)
// =========================================================================
const readmeContent = `# BỘ DỮ LIỆU MẪU KIỂM THỬ TOÀN DIỆN ACCODESK ULTRA PRO

Thư mục này chứa đầy đủ các file dữ liệu chuẩn để kiểm thử 100% tính năng của hệ thống.

---

## 📂 Danh Sách Các Tệp Mẫu:

### 1. \`01_So_Nhat_Ky_Chung_2026.xlsx\` (Sổ Kế Toán & Thuế)
- **Tính năng dùng để test**:
  - **Menu 2: Import & Ánh Xạ Excel**: Nạp tệp Excel này vào phần mềm.
  - **Menu 1: Báo Cáo Tài Chính (B01, B02, B03, B09)** & Cân Đối Phát Sinh Pivot.
  - **Menu 3: Bộ 4 Sổ Nhật Ký Đặc Biệt (TT200)**: Xem tự động phân loại Mua hàng (S04a), Bán hàng (S04b), Thu tiền (S04c), Chi tiền (S04d).
  - **Menu 3: Giá Thành Hợp Đồng**: Tập hợp chi phí HĐ01 (1541, 1542, 1543).
  - **Menu 5: Kiểm Lỗi Dữ Liệu**: Phát hiện tự động khoản chi thiếu hóa đơn, chi tiền mặt $\\ge 20M$, đối tác rủi ro \`0109999888\`.
  - **Menu 3: Khai Thuế eTax 01/TNDN**: Bấm **"Chi tiết & Sửa [B4]"** để sửa và cập nhật tờ khai.

---

### 2. \`02_Sao_Ke_Ngan_Hang_VCB_Q3_2026.xlsx\` (Sao Kê Ngân Hàng)
- **Tính năng dùng để test**:
  - **Menu 2: Import & Ánh Xạ Excel** (chọn loại tệp: Sao kê ngân hàng).
  - **Menu 5: So Sánh & Đối Chiếu Ngân Hàng (Reconciliation)**:
    - Kiểm tra tính năng **Tự động ghép cặp (Auto-Match)**: Khớp tự động khoản 49.5M (Xi măng Hà Tiên) và 91.8M (Phúc Thịnh).
    - Phát hiện giao dịch phí ngân hàng 55.000 đ chưa hạch toán trên sổ sách.

---

### 3. \`03_Bang_Ke_Mua_Vao_Ban_Ra.xlsx\` (Bảng Kê Hóa Đơn GTGT)
- **Tính năng dùng để test**:
  - **Menu 3: Khai Thuế eTax (Tab 01/GTGT)**: Đối chiếu bảng kê mua vào (PL01-2) và bán ra (PL01-1).
  - Xuất tờ khai XML và Excel nộp Cổng Thuế eTax / HTKK.

---

### 4. \`04_Hoa_Don_Dien_Tu_XML_TT78/\` (Hóa Đơn XML Thông Tư 78)
- **Tính năng dùng để test**:
  - **Menu 2: Đọc Hóa Đơn XML (TT78)**: Kéo thả các file XML vào để hệ thống:
    - Bóc tách tự động: Mã hóa đơn, người bán, người mua, danh mục hàng hóa, thuế suất.
    - Kiểm tra chữ ký số điện tử \`<ds:Signature>\`.
    - Tự động sinh bút toán định khoản Nợ/Có.

---

### 5. \`05_AccoDesk_MasterBackup_FullData.accobak\` (Tệp Sao Lưu Toàn Diện)
- **Tính năng dùng để test**:
  - **Menu 6: Sao Lưu & Khôi Phục**: Bấm "Chọn Tệp Sao Lưu Để Phục Hồi" -> Nạp tệp này để lập tức có sẵn 3 công ty mẫu (An Phát, Sao Việt, Phúc Lộc) cùng toàn bộ chứng từ sẵn sàng sử dụng.
`;

fs.writeFileSync(path.join(SAMPLE_DIR, 'README_HUONG_DAN_TEST.md'), readmeContent, 'utf-8');
console.log(`✅ Đã tạo hướng dẫn chi tiết tại: ${path.join(SAMPLE_DIR, 'README_HUONG_DAN_TEST.md')}`);
console.log('🎉 Hoàn tất 100% bộ dữ liệu mẫu kiểm thử!');
