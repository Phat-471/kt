import { NormalizedTransaction } from '../types/accounting';

export interface TaxPolicyAlert {
  id: string;
  policyCode: string;
  title: string;
  effectiveFrom: string;
  summary: string;
  impactLevel: 'CRITICAL' | 'IMPORTANT' | 'INFO';
  appliedRule: string;
}

export const getPostJuly2026TaxPolicies = (transactions: NormalizedTransaction[]): TaxPolicyAlert[] => {
  const alerts: TaxPolicyAlert[] = [];

  const postJulyTxCount = transactions.filter(t => t.date >= '2026-07-01').length;

  if (postJulyTxCount > 0) {
    alerts.push({
      id: 'pol_july_2026_vat',
      policyCode: 'NĐ 72/2024 & Luật GTGT Mới 2026',
      title: 'Chính sách thuế GTGT & Khấu trừ hóa đơn sau 01/07/2026',
      effectiveFrom: '01/07/2026',
      summary: 'Phát hiện chứng từ phát sinh sau ngày 01/07/2026. Áp dụng bảng phân loại nhóm hàng hóa giảm 8% GTGT và quy định bắt buộc chứng từ thanh toán ngân hàng $\\ge 20M$.',
      impactLevel: 'CRITICAL',
      appliedRule: 'Áp dụng cho toàn bộ chứng từ thu/chi từ Q3/2026 trở đi.',
    });
  }

  alerts.push({
    id: 'pol_pit_2026',
    policyCode: 'Nghị quyết 954/2020 & Đề xuất Mới 2026',
    title: 'Mức Giảm Trừ Gia Cảnh Thuế TNCN Mới (15.5M / 5.5M)',
    effectiveFrom: '01/01/2026',
    summary: 'Áp dụng mức giảm trừ gia cảnh bản thân 15.500.000 VNĐ/tháng và 5.500.000 VNĐ/tháng cho mỗi người phụ thuộc khi tính thuế TNCN tiền lương tiền công.',
    impactLevel: 'IMPORTANT',
    appliedRule: 'Tự động tính trừ khi xác định số thuế TNCN khấu trừ tại nguồn.',
  });

  alerts.push({
    id: 'pol_inv_123_2026',
    policyCode: 'Nghị định 123/2020 & TT 78/2021',
    title: 'Ràng buộc thời điểm ký số Hóa đơn điện tử hợp lệ',
    effectiveFrom: 'Khóa sổ 2026',
    summary: 'Thời điểm lập hóa đơn khác thời điểm ký số quá 24h sẽ bị cơ quan thuế rà soát rủi ro về thời điểm ghi nhận doanh nghiệp.',
    impactLevel: 'INFO',
    appliedRule: 'So sánh Ngày lập hóa đơn với Ngày ký chữ ký số XML.',
  });

  return alerts;
};
