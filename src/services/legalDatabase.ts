export interface LegalDocument {
  id: string;
  code: string; // VD: "TT 200/2014/TT-BTC"
  title: string;
  category: 'THUE_GTGT' | 'THUE_TNDN' | 'HOA_DON' | 'CHEDO_KETOAN' | 'PHAT_HANH_CHINH';
  effectiveDate: string;
  summary: string;
  keyPoints: string[];
  content: string;
}

export interface TaxDeadline {
  id: string;
  title: string;
  deadline: string; // YYYY-MM-DD
  type: 'MONTHLY' | 'QUARTERLY' | 'ANNUAL';
  description: string;
}

export interface AccountGuide {
  code: string; // VD: "111"
  name: string;
  type: 'TAI_SAN' | 'NO_PHAI_TRA' | 'VON_CSH' | 'DOANH_THU' | 'CHI_PHI';
  description: string;
  debitRules: string;
  creditRules: string;
  commonPairs: string[]; // Các cặp TK đối ứng phổ biến
}

// 1. Cơ sở dữ liệu văn bản pháp luật kế toán & thuế mới nhất
export const LEGAL_DOCUMENTS: LegalDocument[] = [
  {
    id: 'doc-nd72-2024',
    code: 'Nghị định 72/2024/NĐ-CP',
    title: 'Quy định chính sách giảm thuế giá trị gia tăng (GTGT) 8%',
    category: 'THUE_GTGT',
    effectiveDate: '01/07/2024 - 31/12/2024 (và gia hạn 2025-2026)',
    summary: 'Giảm 2% thuế suất thuế GTGT đối với các nhóm hàng hóa, dịch vụ đang áp dụng mức thuế suất 10% (xuống còn 8%).',
    keyPoints: [
      'Áp dụng cho hàng hóa, dịch vụ đang chịu thuế 10% xuống 8%.',
      'Ngoại trừ các nhóm: Viễn thông, Tài chính - Ngân hàng, Chứng khoán, Bất động sản, Kim loại, Sản phẩm khai khoáng, Hàng hóa chịu thuế TTĐB.',
      'Cơ sở kinh doanh lập hóa đơn riêng cho hàng hóa, dịch vụ được giảm thuế 8%.',
    ],
    content: 'Nghị định này quy định việc giảm thuế GTGT từ 10% xuống 8% áp dụng thống nhất tại các khâu nhập khẩu, sản xuất, gia công, kinh doanh thương mại...',
  },
  {
    id: 'doc-nd123-2020',
    code: 'Nghị định 123/2020/NĐ-CP',
    title: 'Quy định về hóa đơn, chứng từ điện tử',
    category: 'HOA_DON',
    effectiveDate: '01/07/2022',
    summary: 'Quy định bắt buộc áp dụng hóa đơn điện tử cho 100% doanh nghiệp, tổ chức kinh tế, hộ kinh doanh.',
    keyPoints: [
      'Thời điểm lập hóa đơn bán hàng hóa là thời điểm chuyển giao quyền sở hữu hoặc quyền sử dụng.',
      'Thời điểm lập hóa đơn cung cấp dịch vụ là thời điểm hoàn thành việc cung cấp dịch vụ.',
      'Xử lý hóa đơn có sai sót: Lập hóa đơn điều chỉnh hoặc hóa đơn thay thế.',
      'Hóa đơn điện tử khởi tạo từ máy tính tiền có kết nối chuyển dữ liệu với cơ quan thuế.',
    ],
    content: 'Nghị định 123/2020/NĐ-CP quy định chi tiết về việc quản lý, sử dụng hóa đơn điện tử, chứng từ điện tử...',
  },
  {
    id: 'doc-tt78-2021',
    code: 'Thông tư 78/2021/TT-BTC',
    title: 'Hướng dẫn thực hiện một số điều của Luật Quản lý thuế và Nghị định 123/2020/NĐ-CP',
    category: 'HOA_DON',
    effectiveDate: '01/07/2022',
    summary: 'Hướng dẫn chi tiết về ký hiệu hóa đơn, giải thích mẫu hóa đơn, ủy nhiệm lập hóa đơn.',
    keyPoints: [
      'Ký hiệu mẫu số hóa đơn điện tử là 1 chữ số có giá trị là 1, 2, 3, 4, 5, 6.',
      'Ký hiệu hóa đơn điện tử gồm 6 ký tự (VD: C24TAA).',
      'Xử lý hóa đơn điện tử đã gửi cơ quan thuế có sai sót.',
    ],
    content: 'Thông tư 78/2021/TT-BTC hướng dẫn chi tiết quy trình đăng ký sử dụng hóa đơn điện tử...',
  },
  {
    id: 'doc-tt200-2014',
    code: 'Thông tư 200/2014/TT-BTC',
    title: 'Hướng dẫn Chế độ kế toán Doanh nghiệp',
    category: 'CHEDO_KETOAN',
    effectiveDate: '01/01/2015',
    summary: 'Chế độ kế toán áp dụng cho các doanh nghiệp thuộc mọi lĩnh vực, mọi thành phần kinh tế.',
    keyPoints: [
      'Hệ thống tài khoản kế toán từ loại 1 đến loại 9.',
      'Hệ thống Báo cáo tài chính năm: Cân đối kế toán (B01-DN), Kết quả KD (B02-DN), Lưu chuyển tiền tệ (B03-DN), Thuyết minh (B09-DN).',
      'Nguyên tắc kế toán dồn tích, nhất quán, thận trọng.',
    ],
    content: 'Ban hành hệ thống tài khoản kế toán doanh nghiệp và phương pháp hạch toán...',
  },
  {
    id: 'doc-nd125-2020',
    code: 'Nghị định 125/2020/NĐ-CP',
    title: 'Quy định xử phạt vi phạm hành chính về thuế, hóa đơn',
    category: 'PHAT_HANH_CHINH',
    effectiveDate: '05/12/2020',
    summary: 'Mức phạt tiền đối với các hành vi chậm nộp hồ sơ khai thuế, lập hóa đơn sai thời điểm, mất hóa đơn.',
    keyPoints: [
      'Chậm nộp hồ sơ khai thuế từ 1-5 ngày: Cảnh báo hoặc phạt 2 - 5 triệu đồng.',
      'Chậm nộp hồ sơ khai thuế quá 90 ngày: Phạt từ 15 - 25 triệu đồng.',
      'Lập hóa đơn không đúng thời điểm: Phạt từ 3 - 8 triệu đồng.',
      'Làm mất, cháy, hỏng hóa đơn: Phạt từ 4 - 8 triệu đồng.',
    ],
    content: 'Quy định chi tiết các khung hình phạt vi phạm hành chính về hóa đơn và nghĩa vụ nộp thuế...',
  },
];

// 2. Lịch đếm ngược thời hạn nộp tờ khai thuế Quý / Tháng
export const TAX_DEADLINES: TaxDeadline[] = [
  {
    id: 'dl-q1-2026',
    title: 'Nộp Tờ khai thuế GTGT & TNCN Quý 1/2026',
    deadline: '2026-05-04', // 30/04 trùng lễ -> dời đầu tháng 5
    type: 'QUARTERLY',
    description: 'Hạn nộp Tờ khai thuế GTGT, TNCN tạm tính Quý 1/2026 và tiền thuế phát sinh.',
  },
  {
    id: 'dl-q2-2026',
    title: 'Nộp Tờ khai thuế GTGT & TNCN Quý 2/2026',
    deadline: '2026-07-31',
    type: 'QUARTERLY',
    description: 'Hạn nộp Tờ khai thuế GTGT, TNCN tạm tính Quý 2/2026.',
  },
  {
    id: 'dl-q3-2026',
    title: 'Nộp Tờ khai thuế GTGT & TNCN Quý 3/2026',
    deadline: '2026-11-02',
    type: 'QUARTERLY',
    description: 'Hạn nộp Tờ khai thuế GTGT, TNCN tạm tính Quý 3/2026.',
  },
  {
    id: 'dl-bftc-2025',
    title: 'Nộp Báo cáo Tài chính & Quyết toán thuế 2025',
    deadline: '2026-03-31',
    type: 'ANNUAL',
    description: 'Hạn nộp BCTC năm 2025, Quyết toán thuế TNDN và Quyết toán thuế TNCN năm 2025.',
  },
];

// 3. Tra cứu nhanh danh mục tài khoản & Quy tắc định khoản
export const ACCOUNT_GUIDES: AccountGuide[] = [
  {
    code: '111',
    name: 'Tiền mặt',
    type: 'TAI_SAN',
    description: 'Phản ánh tình hình thu, chi, tồn quỹ tiền mặt tại quỹ của doanh nghiệp.',
    debitRules: 'Các khoản tiền mặt nhập quỹ; Tiền mặt thừa phát sinh.',
    creditRules: 'Các khoản tiền mặt xuất quỹ; Tiền mặt thiếu phát sinh.',
    commonPairs: ['Nợ 111 / Có 511 (Bán hàng thu tiền mặt)', 'Nợ 111 / Có 131 (Thu nợ KH)', 'Nợ 642 / Có 111 (Chi phí quản lý gia công)'],
  },
  {
    code: '112',
    name: 'Tiền gửi Ngân hàng',
    type: 'TAI_SAN',
    description: 'Phản ánh số tiền hiện có và tình hình biến động tăng, giảm tiền gửi của doanh nghiệp tại Ngân hàng.',
    debitRules: 'Gửi tiền vào Ngân hàng; Khách hàng chuyển khoản thanh toán.',
    creditRules: 'Rút tiền gửi Ngân hàng; Rút tiền trả nợ người bán, nộp thuế.',
    commonPairs: ['Nợ 112 / Có 131 (KH chuyển khoản)', 'Nợ 331 / Có 112 (Chuyển khoản trả nhà cấp)', 'Nợ 112 / Có 111 (Nộp tiền mặt vào NH)'],
  },
  {
    code: '131',
    name: 'Phải thu của khách hàng',
    type: 'TAI_SAN',
    description: 'Phản ánh các khoản nợ phải thu và tình hình thanh toán các khoản nợ phải thu của doanh nghiệp với khách hàng.',
    debitRules: 'Số tiền phải thu của khách hàng phát sinh khi bán sản phẩm, dịch vụ.',
    creditRules: 'Số tiền khách hàng đã trả nợ; Số tiền ứng trước của khách hàng.',
    commonPairs: ['Nợ 131 / Có 511, 3331 (Bán hàng chưa thu tiền)', 'Nợ 112 / Có 131 (Thu nợ KH chuyển khoản)'],
  },
  {
    code: '331',
    name: 'Phải trả cho người bán',
    type: 'NO_PHAI_TRA',
    description: 'Phản ánh tình hình thanh toán các khoản nợ phải trả cho người bán vật tư, hàng hóa, người cung cấp dịch vụ.',
    debitRules: 'Số tiền đã trả cho người bán; Số tiền ứng trước cho người bán.',
    creditRules: 'Số tiền phải trả cho người bán phát sinh khi mua vật tư, hàng hóa, dịch vụ.',
    commonPairs: ['Nợ 152, 1331 / Có 331 (Mua vật tư chưa trả tiền)', 'Nợ 331 / Có 112 (Thanh toán nợ người bán)'],
  },
  {
    code: '511',
    name: 'Doanh thu bán hàng và cung cấp dịch vụ',
    type: 'DOANH_THU',
    description: 'Phản ánh doanh thu bán hàng hóa, thành phẩm và cung cấp dịch vụ của doanh nghiệp.',
    debitRules: 'Kết chuyển doanh thu thuần sang TK 911 để xác định kết quả kinh doanh.',
    creditRules: 'Doanh thu bán hàng và cung cấp dịch vụ thực hiện trong kỳ.',
    commonPairs: ['Nợ 111, 112, 131 / Có 511 (Ghi nhận doanh thu bán hàng)'],
  },
  {
    code: '642',
    name: 'Chi phí quản lý doanh nghiệp',
    type: 'CHI_PHI',
    description: 'Phản ánh các chi phí quản lý chung của doanh nghiệp bao gồm chi phí nhân viên, vật liệu văn phòng, khấu hao TSCĐ...',
    debitRules: 'Các chi phí quản lý doanh nghiệp thực tế phát sinh trong kỳ.',
    creditRules: 'Kết chuyển chi phí quản lý doanh nghiệp vào TK 911.',
    commonPairs: ['Nợ 642, 1331 / Có 111, 112, 331 (Chi phí văn phòng, dịch vụ mua ngoài)'],
  },
];
