import { NormalizedTransaction, ReconciliationPair } from '../types/accounting';

export interface SuggestionResult {
  voucher: NormalizedTransaction;
  statement: NormalizedTransaction;
  matchScore: number;
  reasons: string[];
}

// Thuật toán Levenshtein Distance tính độ tương đồng chuỗi
export function levenshteinSimilarity(s1: string, s2: string): number {
  if (!s1 || !s2) return 0;
  const str1 = s1.toLowerCase().trim();
  const str2 = s2.toLowerCase().trim();
  if (str1 === str2) return 1;

  const len1 = str1.length;
  const len2 = str2.length;
  const matrix: number[][] = [];

  for (let i = 0; i <= len1; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= len2; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }

  const distance = matrix[len1][len2];
  const maxLen = Math.max(len1, len2);
  return maxLen === 0 ? 1 : 1 - distance / maxLen;
}

export function findMatchingSuggestions(
  vouchers: NormalizedTransaction[],
  statements: NormalizedTransaction[],
  existingMatches: ReconciliationPair[]
): SuggestionResult[] {
  const matchedVoucherIds = new Set(existingMatches.map(m => m.voucherId));
  const matchedStatementIds = new Set(existingMatches.map(m => m.statementId));

  const availableVouchers = vouchers.filter(v => !matchedVoucherIds.has(v.id));
  const availableStatements = statements.filter(s => !matchedStatementIds.has(s.id));

  const suggestions: SuggestionResult[] = [];

  for (const v of availableVouchers) {
    let bestMatch: SuggestionResult | null = null;

    for (const s of availableStatements) {
      let score = 0;
      const reasons: string[] = [];

      // 1. Amount Comparison
      const diffAmount = Math.abs(v.amount - s.amount);
      if (diffAmount === 0) {
        score += 50;
        reasons.push('Số tiền khớp 100% (' + v.amount.toLocaleString('vi-VN') + ' đ)');
      } else if (diffAmount <= 50000) { // Small fee offset
        score += 35;
        reasons.push(`Số tiền lệch nhỏ (${diffAmount.toLocaleString('vi-VN')} đ - phí NH?)`);
      } else if (diffAmount / Math.max(v.amount, 1) < 0.05) {
        score += 20;
        reasons.push(`Số tiền lệch dưới 5%`);
      }

      // 2. Date Comparison
      if (v.date && s.date) {
        const dV = new Date(v.date).getTime();
        const dS = new Date(s.date).getTime();
        const dayDiff = Math.abs(dV - dS) / (1000 * 3600 * 24);

        if (dayDiff === 0) {
          score += 30;
          reasons.push('Cùng ngày chứng từ (' + v.date + ')');
        } else if (dayDiff <= 3) {
          score += 20;
          reasons.push(`Ngày lệch ${Math.round(dayDiff)} ngày`);
        } else if (dayDiff <= 7) {
          score += 10;
          reasons.push(`Ngày lệch ${Math.round(dayDiff)} ngày`);
        }
      }

      // 3. Voucher Number & Description Matching (Fuzzy Text Search)
      const vNo = v.voucherNo ? v.voucherNo.trim().toLowerCase() : '';
      const sDesc = s.description ? s.description.trim().toLowerCase() : '';
      const vDesc = v.description ? v.description.trim().toLowerCase() : '';

      if (vNo && vNo.length >= 3 && sDesc.includes(vNo)) {
        score += 20;
        reasons.push(`Trùng số chứng từ (${v.voucherNo}) trong nội dung sao kê`);
      }

      // Fuzzy matching cho Tên Đối Tác
      if (v.partnerName && sDesc) {
        if (sDesc.includes(v.partnerName.toLowerCase())) {
          score += 15;
          reasons.push(`Khớp chính xác tên đối tác (${v.partnerName})`);
        } else {
          const sim = levenshteinSimilarity(v.partnerName, sDesc);
          if (sim >= 0.6) {
            score += Math.round(sim * 15);
            reasons.push(`Tên đối tác tương đồng mờ (${Math.round(sim * 100)}%)`);
          }
        }
      }

      // Fuzzy matching cho Diễn Giải
      if (vDesc && sDesc) {
        const descSim = levenshteinSimilarity(vDesc, sDesc);
        if (descSim >= 0.5) {
          score += Math.round(descSim * 15);
          reasons.push(`Nội dung diễn giải tương đồng mờ (${Math.round(descSim * 100)}%)`);
        }
      }

      // Filter candidates with minimum threshold score (>= 45%)
      if (score >= 45) {
        if (!bestMatch || score > bestMatch.matchScore) {
          bestMatch = {
            voucher: v,
            statement: s,
            matchScore: Math.min(score, 100),
            reasons,
          };
        }
      }
    }

    if (bestMatch) {
      suggestions.push(bestMatch);
    }
  }

  // Sort by highest match score first
  return suggestions.sort((a, b) => b.matchScore - a.matchScore);
}
