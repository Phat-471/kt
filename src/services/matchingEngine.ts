import { NormalizedTransaction, ReconciliationPair } from '../types/accounting';

export interface SuggestionResult {
  voucher: NormalizedTransaction;
  statement: NormalizedTransaction;
  matchScore: number;
  reasons: string[];
}

// Memory Cache cho Levenshtein Similarity
const levCache = new Map<string, number>();

// Thuật toán Levenshtein Distance tính độ tương đồng chuỗi (có Memoization)
export function levenshteinSimilarity(s1: string, s2: string): number {
  if (!s1 || !s2) return 0;
  const str1 = s1.toLowerCase().trim();
  const str2 = s2.toLowerCase().trim();
  if (str1 === str2) return 1;

  const cacheKey = str1.length <= str2.length ? `${str1}::${str2}` : `${str2}::${str1}`;
  if (levCache.has(cacheKey)) {
    return levCache.get(cacheKey)!;
  }

  const len1 = str1.length;
  const len2 = str2.length;

  // Nếu Còn độ dài quá lớn, similarity chắc chắn < 0.5 -> bỏ qua tính toán ma trận
  if (Math.abs(len1 - len2) / Math.max(len1, len2) > 0.5) {
    levCache.set(cacheKey, 0);
    return 0;
  }

  const matrix: number[][] = [];
  for (let i = 0; i <= len1; i++) matrix[i] = [i];
  for (let j = 0; j <= len2; j++) matrix[0][j] = j;

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
  const sim = maxLen === 0 ? 1 : 1 - distance / maxLen;

  // Giới hạn cache tối đa 5000 phần tử để tránh tràn bộ nhớ
  if (levCache.size > 5000) {
    levCache.clear();
  }
  levCache.set(cacheKey, sim);
  return sim;
}

/**
 * Fast Jaccard Token Similarity (O(n) word match)
 */
export function jaccardSimilarity(s1: string, s2: string): number {
  if (!s1 || !s2) return 0;
  const words1 = new Set(s1.toLowerCase().split(/\s+/).filter(w => w.length > 1));
  const words2 = new Set(s2.toLowerCase().split(/\s+/).filter(w => w.length > 1));

  if (words1.size === 0 || words2.size === 0) return 0;

  let intersection = 0;
  for (const w of words1) {
    if (words2.has(w)) intersection++;
  }

  const union = words1.size + words2.size - intersection;
  return union === 0 ? 0 : intersection / union;
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

  // Fast pre-index available statements by amount range bucket (bucket size = 100k)
  const statementBuckets = new Map<number, NormalizedTransaction[]>();
  for (const s of availableStatements) {
    const bucketKey = Math.floor(s.amount / 100000);
    let list = statementBuckets.get(bucketKey);
    if (!list) {
      list = [];
      statementBuckets.set(bucketKey, list);
    }
    list.push(s);
  }

  const suggestions: SuggestionResult[] = [];

  for (const v of availableVouchers) {
    let bestMatch: SuggestionResult | null = null;

    // Lấy các statement trong dải số tiền gần kề (+/- 1 bucket)
    const vBucket = Math.floor(v.amount / 100000);
    const candidateStatements: NormalizedTransaction[] = [
      ...(statementBuckets.get(vBucket - 1) || []),
      ...(statementBuckets.get(vBucket) || []),
      ...(statementBuckets.get(vBucket + 1) || []),
    ];

    // Nếu không tìm thấy candidate theo bucket số tiền (ví dụ lệch nhiều), fallback về toàn bộ
    const targetStatements = candidateStatements.length > 0 ? candidateStatements : availableStatements;

    for (const s of targetStatements) {
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

      // Fast Jaccard / Levenshtein matching cho Tên Đối Tác
      if (v.partnerName && sDesc) {
        const pNameLower = v.partnerName.toLowerCase();
        if (sDesc.includes(pNameLower)) {
          score += 15;
          reasons.push(`Khớp chính xác tên đối tác (${v.partnerName})`);
        } else {
          // Thử Jaccard trước
          const jaccardSim = jaccardSimilarity(v.partnerName, sDesc);
          if (jaccardSim >= 0.5) {
            score += Math.round(jaccardSim * 15);
            reasons.push(`Tên đối tác tương đồng từ ngữ (${Math.round(jaccardSim * 100)}%)`);
          } else {
            const sim = levenshteinSimilarity(v.partnerName, sDesc);
            if (sim >= 0.6) {
              score += Math.round(sim * 15);
              reasons.push(`Tên đối tác tương đồng mờ (${Math.round(sim * 100)}%)`);
            }
          }
        }
      }

      // Matching cho Diễn Giải
      if (vDesc && sDesc) {
        const descSim = jaccardSimilarity(vDesc, sDesc);
        if (descSim >= 0.4) {
          score += Math.round(descSim * 15);
          reasons.push(`Nội dung diễn giải tương đồng (${Math.round(descSim * 100)}%)`);
        } else {
          const sim = levenshteinSimilarity(vDesc, sDesc);
          if (sim >= 0.5) {
            score += Math.round(sim * 15);
            reasons.push(`Nội dung diễn giải tương đồng mờ (${Math.round(sim * 100)}%)`);
          }
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
