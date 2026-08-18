import { NormalizedTransaction } from '../types/accounting';

export interface AdjustmentEntryResult {
  originalTransactionId: string;
  adjustmentType: 'POSITIVE_ADDITION' | 'RED_NEGATIVE_REVERSAL' | 'REPLACEMENT_VOUCHER';
  adjustedTransaction: NormalizedTransaction;
  note: string;
}

export const createAdjustmentEntry = (
  originalTx: NormalizedTransaction,
  newAmount: number,
  newDescription?: string,
  adjustmentMethod: 'POSITIVE_ADDITION' | 'RED_NEGATIVE_REVERSAL' | 'REPLACEMENT_VOUCHER' = 'RED_NEGATIVE_REVERSAL'
): AdjustmentEntryResult => {
  const timestamp = new Date().toISOString();
  const adjVoucherNo = `DC-${originalTx.voucherNo || originalTx.id.substring(0, 6)}`;

  let adjustedTx: NormalizedTransaction;
  let note = '';

  if (adjustmentMethod === 'RED_NEGATIVE_REVERSAL') {
    // Phương pháp Ghi đỏ (Số âm) đảo ngược nghiệp vụ sai + lập dòng mới bổ sung
    const diffAmount = newAmount - originalTx.amount;
    adjustedTx = {
      ...originalTx,
      id: `adj_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      voucherNo: adjVoucherNo,
      amount: diffAmount,
      description: newDescription || `[ĐIỀU CHỈNH GHI ĐỎ] ${originalTx.description} (Sai lệch ${diffAmount.toLocaleString()} VNĐ)`,
      date: timestamp.split('T')[0],
    };
    note = `Đã lập chứng từ điều chỉnh ghi đỏ Còn ${diffAmount.toLocaleString()} VNĐ cho chứng từ gốc ${originalTx.voucherNo}.`;
  } else if (adjustmentMethod === 'POSITIVE_ADDITION') {
    // Ghi bổ sung giá trị thiếu
    const additionAmount = Math.max(0, newAmount - originalTx.amount);
    adjustedTx = {
      ...originalTx,
      id: `adj_add_${Date.now()}`,
      voucherNo: adjVoucherNo,
      amount: additionAmount,
      description: newDescription || `[ĐIỀU CHỈNH GHI BỔ SUNG] ${originalTx.description}`,
      date: timestamp.split('T')[0],
    };
    note = `Đã lập chứng từ ghi bổ sung ${additionAmount.toLocaleString()} VNĐ.`;
  } else {
    // Chứng từ thay thế toàn bộ
    adjustedTx = {
      ...originalTx,
      id: `adj_rep_${Date.now()}`,
      voucherNo: adjVoucherNo,
      amount: newAmount,
      description: newDescription || `[CHỨNG TỪ THAY THẾ] Thay thế chứng từ ${originalTx.voucherNo}`,
      date: timestamp.split('T')[0],
    };
    note = `Đã tạo chứng từ thay thế chính thức cho chứng từ gốc ${originalTx.voucherNo}.`;
  }

  return {
    originalTransactionId: originalTx.id,
    adjustmentType: adjustmentMethod,
    adjustedTransaction: adjustedTx,
    note,
  };
};
