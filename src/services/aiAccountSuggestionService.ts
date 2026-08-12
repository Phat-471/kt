import { NormalizedTransaction } from '../types/accounting';

export interface AIAccountSuggestion {
  debitAcc: string;
  creditAcc: string;
  confidenceScore: number; // 0 - 100%
  reasoning: string;
  categoryTag: 'MATERIAL' | 'SERVICE' | 'REVENUE' | 'TAX' | 'ASSET' | 'SALARY' | 'OTHER';
}

export const suggestAccountsByAI = (
  description: string,
  partnerName: string = '',
  amount: number = 0
): AIAccountSuggestion => {
  const desc = (description || '').toLowerCase();
  const partner = (partnerName || '').toLowerCase();

  // Rule 1: Vật tư / Nguyên vật liệu / Hàng hóa
  if (desc.includes('xi măng') || desc.includes('cát') || desc.includes('thép') || desc.includes('gạch') || desc.includes('vật tư') || desc.includes('nhập kho')) {
    return {
      debitAcc: '152',
      creditAcc: amount >= 20000000 ? '331' : '1111',
      confidenceScore: 96,
      reasoning: 'Diễn giải chứa từ khóa vật tư/nguyên vật liệu xây dựng → Tự động gợi ý Nợ 152 (Nguyên liệu, vật liệu).',
      categoryTag: 'MATERIAL',
    };
  }

  // Rule 2: Công cụ dụng cụ / Thiết bị nhỏ
  if (desc.includes('máy in') || desc.includes('laptop') || desc.includes('điện thoại') || desc.includes('ccdc') || desc.includes('dụng cụ')) {
    return {
      debitAcc: '153',
      creditAcc: amount >= 20000000 ? '331' : '1121',
      confidenceScore: 92,
      reasoning: 'Ghi nhận thiết bị dụng cụ làm việc → Gợi ý Nợ 153 / Phân bổ TK 242.',
      categoryTag: 'ASSET',
    };
  }

  // Rule 3: Chi phí dịch vụ mua ngoài (Điện, Nước, Internet, Rent)
  if (desc.includes('điện') || desc.includes('nước') || desc.includes('internet') || desc.includes('thuê nhà') || desc.includes('dịch vụ') || desc.includes('tư vấn')) {
    return {
      debitAcc: '6427',
      creditAcc: '1121',
      confidenceScore: 94,
      reasoning: 'Chi phí dịch vụ mua ngoài quản lý doanh nghiệp → Gợi ý Nợ 6427 (Chi phí dịch vụ mua ngoài).',
      categoryTag: 'SERVICE',
    };
  }

  // Rule 4: Doanh thu bán hàng & Cung cấp dịch vụ
  if (desc.includes('bán hàng') || desc.includes('doanh thu') || desc.includes('thanh toán hợp đồng') || desc.includes('xuất hóa đơn')) {
    return {
      debitAcc: '131',
      creditAcc: '5111',
      confidenceScore: 98,
      reasoning: 'Chứng từ ghi nhận doanh thu bán hàng & cung cấp dịch vụ → Gợi ý Nợ 131 / Có 5111.',
      categoryTag: 'REVENUE',
    };
  }

  // Rule 5: Lương nhân viên & BHYT/BHXH
  if (desc.includes('lương') || desc.includes('tạm ứng lương') || desc.includes('bhxh') || desc.includes('bhyt')) {
    return {
      debitAcc: '6422',
      creditAcc: '334',
      confidenceScore: 95,
      reasoning: 'Chi phí tiền lương & BHXH nhân viên quản lý → Gợi ý Nợ 6422 / Có 334.',
      categoryTag: 'SALARY',
    };
  }

  // Default fallback recommendation
  return {
    debitAcc: '6428',
    creditAcc: '1111',
    confidenceScore: 75,
    reasoning: 'Nghiệp vụ chi phí bằng tiền mặt thông thường → Gợi ý Nợ 6428 (Chi phí bằng tiền khác) / Có 1111.',
    categoryTag: 'OTHER',
  };
};

export const batchApplyAISuggestions = (transactions: NormalizedTransaction[]): NormalizedTransaction[] => {
  return transactions.map((t) => {
    if (!t.debitAcc || t.debitAcc === '152' || t.debitAcc === '642') {
      const ai = suggestAccountsByAI(t.description, t.partnerName, t.amount);
      return {
        ...t,
        debitAcc: ai.debitAcc,
        creditAcc: ai.creditAcc,
      };
    }
    return t;
  });
};
