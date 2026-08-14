import { NormalizedTransaction } from '../types/accounting';

export interface JournalSuggestion {
  debitAcc: string;
  creditAcc: string;
  debitAccName: string;
  creditAccName: string;
  confidenceScore: number; // 0 - 100
  explanation: string;
  category: string;
}

interface PatternRule {
  keywords: string[];
  debitAcc: string;
  debitName: string;
  creditAcc: string;
  creditName: string;
  category: string;
  explanation: string;
}

const COMMON_PATTERNS: PatternRule[] = [
  {
    keywords: ['tiền điện', 'điện lực', 'evn', 'chi phí điện'],
    debitAcc: '6422',
    debitName: 'Chi phí điện nước QLDN',
    creditAcc: '1111',
    creditName: 'Tiền mặt',
    category: 'CHI_PHI_VAN_PHONG',
    explanation: 'Hạch toán chi phí điện thoại/điện nước quản lý doanh nghiệp.',
  },
  {
    keywords: ['tiền nước', 'cấp nước', 'nước sạch'],
    debitAcc: '6422',
    debitName: 'Chi phí điện nước QLDN',
    creditAcc: '1111',
    creditName: 'Tiền mặt',
    category: 'CHI_PHI_VAN_PHONG',
    explanation: 'Hạch toán chi phí nước sinh hoạt văn phòng.',
  },
  {
    keywords: ['cước viễn thông', 'internet', 'vnpt', 'viettel', 'fpt', 'điện thoại'],
    debitAcc: '6428',
    debitName: 'Chi phí dịch vụ mua ngoài khác',
    creditAcc: '1121',
    creditName: 'Tiền gửi ngân hàng',
    category: 'CHI_PHI_DICH_VU',
    explanation: 'Hạch toán cước internet/viễn thông thanh toán qua chuyển khoản.',
  },
  {
    keywords: ['thuê nhà', 'thuê văn phòng', 'mặt bằng'],
    debitAcc: '6427',
    debitName: 'Chi phí dịch vụ mua ngoài (Thuê nhà)',
    creditAcc: '1121',
    creditName: 'Tiền gửi ngân hàng',
    category: 'THUE_MAT_BANG',
    explanation: 'Hạch toán chi phí thuê văn phòng làm việc.',
  },
  {
    keywords: ['tạm ứng lương', 'thanh toán lương', 'chuyển khoản lương', 'lương tháng'],
    debitAcc: '334',
    debitName: 'Phải trả người lao động',
    creditAcc: '1121',
    creditName: 'Tiền gửi ngân hàng',
    category: 'THANH_TOAN_LUONG',
    explanation: 'Chi trả lương hoặc tạm ứng lương cho công nhân viên.',
  },
  {
    keywords: ['rút tiền mặt', 'nộp tiền vào tài khoản', 'rút quỹ'],
    debitAcc: '1111',
    debitName: 'Tiền mặt',
    creditAcc: '1121',
    creditName: 'Tiền gửi ngân hàng',
    category: 'DIEU_CHUYEN_NOI_BO',
    explanation: 'Rút tiền gửi ngân hàng về nhập quỹ tiền mặt.',
  },
  {
    keywords: ['mua văn phòng phẩm', 'giấy in', 'bút', 'vpp'],
    debitAcc: '6422',
    debitName: 'Chi phí vật liệu văn phòng',
    creditAcc: '1111',
    creditName: 'Tiền mặt',
    category: 'VPP',
    explanation: 'Mua văn phòng phẩm dùng ngay cho quản lý.',
  },
  {
    keywords: ['tiếp khách', 'nhà hàng', 'ăn uống', 'lễ tân'],
    debitAcc: '6428',
    debitName: 'Chi phí tiếp khách, hội nghị',
    creditAcc: '1111',
    creditName: 'Tiền mặt',
    category: 'CHI_PHI_KHAC',
    explanation: 'Chi phí tiếp khách phục vụ hoạt động SXKD.',
  },
  {
    keywords: ['mua hàng hóa', 'nhập kho hàng', 'tiền hàng'],
    debitAcc: '1561',
    debitName: 'Hàng hóa mua vào',
    creditAcc: '331',
    creditName: 'Phải trả cho người bán',
    category: 'MUA_HANG',
    explanation: 'Nhập kho hàng hóa chưa thanh toán hoặc thanh toán sau.',
  },
  {
    keywords: ['bán hàng', 'doanh thu', 'xuất hóa đơn'],
    debitAcc: '131',
    debitName: 'Phải thu của khách hàng',
    creditAcc: '5111',
    creditName: 'Doanh thu bán hàng hóa',
    category: 'DOANH_THU',
    explanation: 'Ghi nhận doanh thu bán hàng hóa chưa thu tiền.',
  },
];

export function suggestJournalEntry(
  description: string,
  partnerName?: string,
  historyTransactions: NormalizedTransaction[] = []
): JournalSuggestion {
  const text = `${description} ${partnerName || ''}`.toLowerCase().trim();

  // 1. Phân tích lịch sử chứng từ để tìm giao dịch tương tự nhất
  if (historyTransactions.length > 0) {
    let bestHistoryMatch: NormalizedTransaction | null = null;
    let maxMatchWords = 0;

    const inputWords = new Set(text.split(/\s+/).filter(w => w.length > 1));

    for (const t of historyTransactions) {
      const hText = `${t.description || ''} ${t.partnerName || ''}`.toLowerCase();
      const hWords = hText.split(/\s+/).filter(w => w.length > 1);
      
      let common = 0;
      for (const hw of hWords) {
        if (inputWords.has(hw)) common++;
      }

      if (common > maxMatchWords && common >= 2) {
        maxMatchWords = common;
        bestHistoryMatch = t;
      }
    }

    if (bestHistoryMatch && bestHistoryMatch.debitAcc && bestHistoryMatch.creditAcc) {
      return {
        debitAcc: bestHistoryMatch.debitAcc,
        creditAcc: bestHistoryMatch.creditAcc,
        debitAccName: `TK ${bestHistoryMatch.debitAcc}`,
        creditAccName: `TK ${bestHistoryMatch.creditAcc}`,
        confidenceScore: Math.min(95, 60 + maxMatchWords * 10),
        explanation: `Học từ chứng từ lịch sử gần nhất (${bestHistoryMatch.voucherNo || bestHistoryMatch.date})`,
        category: 'HISTORY_LEARNED',
      };
    }
  }

  // 2. Rule matching dựa trên từ khóa mẫu
  for (const rule of COMMON_PATTERNS) {
    for (const kw of rule.keywords) {
      if (text.includes(kw)) {
        return {
          debitAcc: rule.debitAcc,
          creditAcc: rule.creditAcc,
          debitAccName: rule.debitName,
          creditAccName: rule.creditName,
          confidenceScore: 85,
          explanation: rule.explanation,
          category: rule.category,
        };
      }
    }
  }

  // 3. Fallback mặc định
  const isIncome = text.includes('thu') || text.includes('nhận') || text.includes('bán');
  if (isIncome) {
    return {
      debitAcc: '1121',
      creditAcc: '5111',
      debitAccName: 'Tiền gửi ngân hàng',
      creditAccName: 'Doanh thu bán hàng',
      confidenceScore: 50,
      explanation: 'Dự đoán mặc định cho giao dịch thu tiền / bán hàng.',
      category: 'DEFAULT_INCOME',
    };
  }

  return {
    debitAcc: '6428',
    creditAcc: '1111',
    debitAccName: 'Chi phí bằng tiền khác',
    creditAccName: 'Tiền mặt',
    confidenceScore: 40,
    explanation: 'Dự đoán mặc định cho chi phí phát sinh bằng tiền mặt.',
    category: 'DEFAULT_EXPENSE',
  };
}
