/**
 * Correction Entry Service - Bút toán điều chỉnh & đảo bút toán
 * Tuân thủ nguyên tắc: Không xóa, chỉ điều chỉnh bằng bút toán âm (reverse entry)
 * Theo chuẩn kế toán Thông tư 200/2014/TT-BTC
 */

import { NormalizedTransaction } from '../types/accounting';

export interface CorrectionEntry {
  id: string;
  originalTxId: string;       // ID chứng từ gốc bị sai
  originalTxDate: string;
  originalVoucherNo: string;
  correctionType: 'REVERSE' | 'ADJUST_AMOUNT' | 'ADJUST_ACCOUNT' | 'ADJUST_DATE';
  reason: string;             // Lý do điều chỉnh bắt buộc nhập
  correctedBy: string;        // Người lập phiếu điều chỉnh
  correctedAt: string;        // Ngày lập phiếu điều chỉnh (ISO)
  // Bút toán đảo (âm)
  reverseEntry: {
    debitAcc: string;
    creditAcc: string;
    amount: number;           // Số âm để đảo
    description: string;
  };
  // Bút toán đúng thay thế (nếu có)
  replacementEntry?: {
    debitAcc: string;
    creditAcc: string;
    amount: number;
    description: string;
  };
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  approvedBy?: string;
  approvedAt?: string;
}

const STORAGE_KEY = 'accodesk_correction_entries';

// In-memory store fallback cho môi trường Node.js (test suite CLI)
const _memStore: CorrectionEntry[] = [];

/** Lấy toàn bộ danh sách phiếu điều chỉnh */
export function getAllCorrectionEntries(): CorrectionEntry[] {
  try {
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
      return [..._memStore];
    }
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [..._memStore];
  }
}

/** Lưu danh sách phiếu điều chỉnh */
function saveEntries(entries: CorrectionEntry[]): void {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
    // Node.js: cập nhật in-memory store
    _memStore.length = 0;
    _memStore.push(...entries);
    return;
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

/** Tạo phiếu điều chỉnh đảo bút toán từ chứng từ sai */
export function createReverseEntry(
  originalTx: NormalizedTransaction,
  reason: string,
  correctedBy: string,
  replacementDebit?: string,
  replacementCredit?: string,
  replacementAmount?: number,
): CorrectionEntry {
  const entries = getAllCorrectionEntries();

  const correction: CorrectionEntry = {
    id: `corr-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    originalTxId: originalTx.id,
    originalTxDate: originalTx.date,
    originalVoucherNo: originalTx.voucherNo,
    correctionType: replacementDebit ? 'ADJUST_ACCOUNT' : 'REVERSE',
    reason,
    correctedBy,
    correctedAt: new Date().toISOString(),
    reverseEntry: {
      debitAcc: originalTx.creditAcc || '',   // Đảo Nợ/Có
      creditAcc: originalTx.debitAcc || '',
      amount: -Math.abs(originalTx.amount),   // Số âm để đảo
      description: `[ĐẢO BÚT TOÁN] ${originalTx.description} | Lý do: ${reason}`,
    },
    status: 'PENDING',
  };

  // Thêm bút toán thay thế nếu có
  if (replacementDebit && replacementCredit && replacementAmount) {
    correction.replacementEntry = {
      debitAcc: replacementDebit,
      creditAcc: replacementCredit,
      amount: replacementAmount,
      description: `[BÚT TOÁN ĐÚNG] ${originalTx.description}`,
    };
  }

  entries.push(correction);
  saveEntries(entries);
  return correction;
}

/** Phê duyệt phiếu điều chỉnh */
export function approveCorrectionEntry(id: string, approvedBy: string): boolean {
  const entries = getAllCorrectionEntries();
  const idx = entries.findIndex(e => e.id === id);
  if (idx === -1) return false;
  entries[idx].status = 'APPROVED';
  entries[idx].approvedBy = approvedBy;
  entries[idx].approvedAt = new Date().toISOString();
  saveEntries(entries);
  return true;
}

/** Từ chối phiếu điều chỉnh */
export function rejectCorrectionEntry(id: string): boolean {
  const entries = getAllCorrectionEntries();
  const idx = entries.findIndex(e => e.id === id);
  if (idx === -1) return false;
  entries[idx].status = 'REJECTED';
  saveEntries(entries);
  return true;
}

/** Lấy lịch sử điều chỉnh của một chứng từ cụ thể */
export function getCorrectionHistoryForTx(txId: string): CorrectionEntry[] {
  return getAllCorrectionEntries().filter(e => e.originalTxId === txId);
}

/** Thống kê tổng hợp */
export function getCorrectionStats() {
  const entries = getAllCorrectionEntries();
  return {
    total: entries.length,
    pending: entries.filter(e => e.status === 'PENDING').length,
    approved: entries.filter(e => e.status === 'APPROVED').length,
    rejected: entries.filter(e => e.status === 'REJECTED').length,
  };
}
