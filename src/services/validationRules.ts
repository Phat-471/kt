import { NormalizedTransaction, ValidationErrorItem, ValidationStatus } from '../types/accounting';
import { checkRiskyTaxpayer } from './riskyTaxpayerDatabase';

export function isValidTaxCode(taxCode: string): boolean {
  if (!taxCode) return true; // Optional field, skip if empty
  const cleaned = taxCode.trim().replace(/[^0-9-]/g, '');
  if (cleaned.length === 10 && /^\d{10}$/.test(cleaned)) return true;
  if (cleaned.length === 13 || (cleaned.length === 14 && cleaned.includes('-'))) {
    return /^\d{10}-?\d{3}$/.test(cleaned);
  }
  return false;
}

export function isValidProvincePrefix(taxCode: string): boolean {
  if (!taxCode) return true;
  const digits = taxCode.replace(/[^0-9]/g, '');
  if (digits.length < 2) return false;
  const prefix = parseInt(digits.substring(0, 2), 10);
  return prefix >= 1 && prefix <= 96;
}
export function parseNumericValue(val: any): number {
  if (val === undefined || val === null) return 0;
  if (typeof val === 'number') return val;
  const str = String(val).trim();
  if (str.includes(',') && str.includes('.')) {
    if (str.indexOf(',') < str.indexOf('.')) {
      return parseFloat(str.replace(/,/g, '')) || 0;
    } else {
      return parseFloat(str.replace(/\./g, '').replace(/,/g, '.')) || 0;
    }
  }
  if (str.includes(',')) {
    if (str.split(',')[1]?.length === 2) {
      return parseFloat(str.replace(/,/g, '.')) || 0;
    }
    return parseFloat(str.replace(/,/g, '')) || 0;
  }
  if (str.includes('.')) {
    if (str.split('.')[1]?.length === 3) {
      return parseFloat(str.replace(/\./g, '')) || 0;
    }
    return parseFloat(str) || 0;
  }
  return parseFloat(str) || 0;
}

// Validation Hash Cache Memoization cho >10.000 dòng chứng từ
const validationCache = new Map<string, { status: ValidationStatus; errors: ValidationErrorItem[] }>();
let lastTxsSignature = '';

function computeTxsSignature(txs: NormalizedTransaction[]): string {
  let score = txs.length;
  for (let i = 0; i < txs.length; i++) {
    const t = txs[i];
    score += t.amount + (t.voucherNo ? t.voucherNo.length : 0) + (t.userApproved ? 1 : 0);
  }
  return String(score);
}

function hashTransaction(tx: NormalizedTransaction): string {
  return `${tx.id}_${tx.date}_${tx.voucherNo}_${tx.partnerTaxCode}_${tx.amount}_${tx.debitAcc}_${tx.creditAcc}_${tx.description}`;
}

export function clearValidationCache(): void {
  validationCache.clear();
  lastTxsSignature = '';
}

export function validateTransaction(
  tx: NormalizedTransaction,
  allExistingTxs: NormalizedTransaction[] = []
): { status: ValidationStatus; errors: ValidationErrorItem[] } {
  // 0. Check Memoization Cache
  const currentSig = computeTxsSignature(allExistingTxs);
  if (currentSig !== lastTxsSignature) {
    clearValidationCache();
    lastTxsSignature = currentSig;
  }

  const txHash = hashTransaction(tx);
  // Nếu số lượng chứng từ lớn (>500), dùng cache trừ khi có kiểm tra xung đột trùng số HĐ chéo
  if (allExistingTxs.length > 500 && validationCache.has(txHash)) {
    return validationCache.get(txHash)!;
  }

  const errors: ValidationErrorItem[] = [];

  // Rule 1: Check Date
  if (!tx.date || tx.date.trim() === '') {
    errors.push({
      field: 'date',
      code: 'ERR_MISSING_DATE',
      message: 'Thiếu ngày chứng từ',
      severity: 'ERROR',
    });
  } else if (!/^\d{4}-\d{2}-\d{2}$/.test(tx.date)) {
    errors.push({
      field: 'date',
      code: 'ERR_INVALID_DATE',
      message: 'Định dạng ngày không hợp lệ (cần YYYY-MM-DD)',
      severity: 'ERROR',
    });
  } else {
    const txDate = new Date(tx.date);
    const today = new Date();
    if (txDate > today) {
      errors.push({
        field: 'date',
        code: 'WARN_FUTURE_DATE',
        message: 'Ngày chứng từ nằm ở tương lai',
        severity: 'WARNING',
      });
    }
  }

  // Rule 2: Check Voucher Number
  if (!tx.voucherNo || tx.voucherNo.trim() === '') {
    errors.push({
      field: 'voucherNo',
      code: 'ERR_MISSING_VOUCHER',
      message: 'Thiếu số chứng từ / số hoá đơn',
      severity: 'ERROR',
    });
  }

  // Rule 3: Check Amount
  if (tx.amount === undefined || tx.amount === null || isNaN(tx.amount)) {
    errors.push({
      field: 'amount',
      code: 'ERR_INVALID_AMOUNT',
      message: 'Số tiền không phải là số hợp lệ',
      severity: 'ERROR',
    });
  } else if (tx.amount <= 0) {
    errors.push({
      field: 'amount',
      code: 'ERR_ZERO_AMOUNT',
      message: 'Số tiền phải lớn hơn 0',
      severity: 'ERROR',
    });
  }

  // Rule 4: Check Double Entry Accounts
  if (tx.type !== 'BANK_STMT') {
    if (!tx.debitAcc && !tx.creditAcc) {
      errors.push({
        field: 'debitAcc',
        code: 'ERR_MISSING_ACC',
        message: 'Thiếu cả Tài khoản Nợ và Tài khoản Có',
        severity: 'ERROR',
      });
    } else if (tx.debitAcc && tx.creditAcc && tx.debitAcc === tx.creditAcc) {
      errors.push({
        field: 'debitAcc',
        code: 'ERR_SAME_ACC',
        message: 'Tài khoản Nợ không được trùng với Tài khoản Có',
        severity: 'ERROR',
      });
    }

    if (tx.debitAcc && !/^[1-9]\d{2,5}$/.test(tx.debitAcc)) {
      errors.push({
        field: 'debitAcc',
        code: 'WARN_ACC_FORMAT',
        message: 'Mã Tài khoản Nợ có vẻ không đúng chuẩn kế toán (VD: 111, 112, 131...)',
        severity: 'WARNING',
      });
    }
    if (tx.creditAcc && !/^[1-9]\d{2,5}$/.test(tx.creditAcc)) {
      errors.push({
        field: 'creditAcc',
        code: 'WARN_ACC_FORMAT',
        message: 'Mã Tài khoản Có có vẻ không đúng chuẩn kế toán (VD: 111, 112, 131...)',
        severity: 'WARNING',
      });
    }
  }

  // Rule 5: Check Partner Tax Code
  if (tx.partnerTaxCode) {
    if (!isValidTaxCode(tx.partnerTaxCode)) {
      errors.push({
        field: 'partnerTaxCode',
        code: 'ERR_INVALID_TAX_CODE',
        message: 'Mã số thuế đối tác không hợp lệ (cần 10 hoặc 13 số)',
        severity: 'ERROR',
      });
    } else {
      // Province prefix check (01 - 96)
      if (!isValidProvincePrefix(tx.partnerTaxCode)) {
        errors.push({
          field: 'partnerTaxCode',
          code: 'WARN_INVALID_PROVINCE_PREFIX',
          message: 'Cảnh báo MST: 2 chữ số đầu mã số thuế không nằm trong dải mã tỉnh/thành phố hợp lệ (01–96)',
          severity: 'WARNING',
        });
      }

      // Smart Warning: Fake tax codes often have consecutive same numbers (e.g., 9999999999)
      const cleanedTaxCode = tx.partnerTaxCode.replace(/[^0-9]/g, '');
      if (/^(\d)\1{9}$/.test(cleanedTaxCode)) {
        errors.push({
          field: 'partnerTaxCode',
          code: 'WARN_FAKE_TAX_CODE',
          message: 'Cảnh báo thông minh: Mã số thuế có dấu hiệu là MST ảo (chứa các số giống nhau liên tiếp)',
          severity: 'WARNING',
        });
      }

      // Rule 11: AI Smart Tax Alert — Tra cứu MST thuộc danh sách Doanh nghiệp Rủi ro / Bỏ trốn / Tạm ngừng
      const riskyInfo = checkRiskyTaxpayer(cleanedTaxCode);
      if (riskyInfo) {
        errors.push({
          field: 'partnerTaxCode',
          code: 'ERR_RISKY_TAXPAYER',
          message: `🚨 CẢNH BÁO THUẾ: Đối tác ${riskyInfo.name} (MST: ${riskyInfo.taxCode}) thuộc danh sách RỦI RO THUẾ (${riskyInfo.reason} - ${riskyInfo.announcementRef || ''})`,
          severity: 'ERROR',
        });
      }

      // Check partner name conflict across transactions for the same MST
      if (tx.partnerName && tx.partnerName.trim() && allExistingTxs.length > 0) {
        const currentMst = cleanedTaxCode;
        const currentPartnerName = tx.partnerName.trim().toLowerCase();
        const conflictingTx = allExistingTxs.find(other => {
          if (!other.partnerTaxCode || other.id === tx.id) return false;
          const otherMst = other.partnerTaxCode.replace(/[^0-9]/g, '');
          if (otherMst !== currentMst) return false;
          if (!other.partnerName || !other.partnerName.trim()) return false;
          const otherPartnerName = other.partnerName.trim().toLowerCase();
          return (
            otherPartnerName !== currentPartnerName &&
            !otherPartnerName.includes(currentPartnerName) &&
            !currentPartnerName.includes(otherPartnerName)
          );
        });

        if (conflictingTx) {
          errors.push({
            field: 'partnerTaxCode',
            code: 'WARN_PARTNER_NAME_MISMATCH',
            message: `Cảnh báo xung đột đối tác: Cùng MST (${tx.partnerTaxCode}) nhưng tên đối tác khác với '${conflictingTx.partnerName}' trong giao dịch nạp trước đó`,
            severity: 'WARNING',
          });
        }
      }
    }
  }

  // Rule 6: Check Description
  if (!tx.description || tx.description.trim().length < 3) {
    errors.push({
      field: 'description',
      code: 'WARN_SHORT_DESC',
      message: 'Diễn giải quá ngắn hoặc bị trống',
      severity: 'WARNING',
    });
  }

  // Feature 4: Cross-File Duplicate Detection
  if (tx.voucherNo && tx.amount > 0 && allExistingTxs.length > 0) {
    const vNoClean = tx.voucherNo.trim().toLowerCase();
    const crossDup = allExistingTxs.find(e => 
      e.id !== tx.id &&
      e.sourceFileName !== tx.sourceFileName &&
      e.voucherNo.trim().toLowerCase() === vNoClean &&
      Math.abs(e.amount - tx.amount) === 0 &&
      (e.date === tx.date || (e.partnerTaxCode && e.partnerTaxCode === tx.partnerTaxCode))
    );

    if (crossDup) {
      errors.push({
        field: 'voucherNo',
        code: 'WARN_CROSS_FILE_DUPLICATE',
        message: `Cảnh báo trùng dữ liệu: Số CT ${tx.voucherNo} đã tồn tại trong file '${crossDup.sourceFileName}' nạp trước đó (Ngày ${crossDup.date}, ${crossDup.amount.toLocaleString('vi-VN')} đ)`,
        severity: 'WARNING',
      });
    }
  }



  // Feature 5: Smart Validation - Check Tax variance
  if (tx.rawRow && tx.rawRow.totalBeforeTax !== undefined && tx.rawRow.totalTax !== undefined) {
    const totalBeforeTax = parseNumericValue(tx.rawRow.totalBeforeTax);
    const totalTax = parseNumericValue(tx.rawRow.totalTax);
    const totalAmount = tx.amount;
    
    // Tổng trước thuế + Thuế phải khớp với Tổng thanh toán (cho phép lệch 10đ làm tròn)
    if (totalBeforeTax > 0 && totalTax > 0 && Math.abs((totalBeforeTax + totalTax) - totalAmount) > 10) {
      errors.push({
        field: 'amount',
        code: 'WARN_TAX_MATH_MISMATCH',
        message: `Cảnh báo thông minh: Logic số tiền không khớp. (Trước thuế: ${totalBeforeTax.toLocaleString('vi-VN')} + Thuế: ${totalTax.toLocaleString('vi-VN')} ≠ Tổng: ${totalAmount.toLocaleString('vi-VN')})`,
        severity: 'WARNING',
      });
    }

    // Feature 6: Kiểm tra thuế suất 8% / 10% tường minh
    if (!isNaN(totalBeforeTax) && totalBeforeTax > 0 && !isNaN(totalTax) && totalTax > 0) {
      const taxRate = totalTax / totalBeforeTax;
      const taxPercent = Math.round(taxRate * 1000) / 10; // làm tròn 1 chữ số thập phân
      
      // Các mức thuế GTGT phổ biến tại Việt Nam
      const validRates = [0, 5, 8, 10];
      const isValidRate = validRates.some(r => Math.abs(taxPercent - r) < 0.5);
      
      if (!isValidRate) {
        errors.push({
          field: 'amount',
          code: 'WARN_INVALID_TAX_RATE',
          message: `Cảnh báo: Thuế suất tính được là ${taxPercent}% — không thuộc các mức chuẩn GTGT (0%, 5%, 8%, 10%). Cần kiểm tra lại.`,
          severity: 'WARNING',
        });
      } else if (taxPercent === 8) {
        // Thuế suất 8% là ưu đãi giảm (theo NĐ 15/2022 và gia hạn) — ghi chú để theo dõi
        errors.push({
          field: 'amount',
          code: 'INFO_TAX_RATE_8',
          message: `Thông tin: Áp dụng thuế suất GTGT 8% (ưu đãi giảm thuế). Đảm bảo hàng hóa/dịch vụ thuộc danh mục được giảm thuế.`,
          severity: 'WARNING',
        });
      }
    }
  }

  // Rule 8: Outlier Detection — Giao dịch bất thường (> trung bình ±3σ)
  if (tx.amount > 0 && allExistingTxs.length >= 5) {
    const sameTxType = allExistingTxs.filter(e => e.type === tx.type && e.amount > 0);
    if (sameTxType.length >= 5) {
      const mean = sameTxType.reduce((sum, e) => sum + e.amount, 0) / sameTxType.length;
      const variance = sameTxType.reduce((sum, e) => sum + Math.pow(e.amount - mean, 2), 0) / sameTxType.length;
      const stdDev = Math.sqrt(variance);
      if (stdDev > 0 && Math.abs(tx.amount - mean) > 3 * stdDev) {
        errors.push({
          field: 'amount',
          code: 'WARN_OUTLIER_AMOUNT',
          message: `Cảnh báo bất thường: Số tiền ${tx.amount.toLocaleString('vi-VN')} đ vượt ngưỡng ±3σ so với trung bình ${Math.round(mean).toLocaleString('vi-VN')} đ (loại ${tx.type})`,
          severity: 'WARNING',
        });
      }
    }
  }

  // Rule 9: Gap Detection — Kiểm tra nhảy số chứng từ
  if (tx.voucherNo && allExistingTxs.length > 0) {
    const voucherMatch = tx.voucherNo.match(/(\d+)$/);
    if (voucherMatch) {
      const currentNum = parseInt(voucherMatch[1], 10);
      const prefix = tx.voucherNo.slice(0, tx.voucherNo.length - voucherMatch[1].length);
      
      // Tìm số CT gần nhất trong cùng series prefix
      const seriesNums = allExistingTxs
        .filter(e => e.id !== tx.id && e.voucherNo && e.voucherNo.startsWith(prefix))
        .map(e => {
          const m = e.voucherNo.match(/(\d+)$/);
          return m ? parseInt(m[1], 10) : -1;
        })
        .filter(n => n >= 0)
        .sort((a, b) => a - b);

      if (seriesNums.length >= 2) {
        const expectedPrev = currentNum - 1;
        const expectedNext = currentNum + 1;
        const hasPrev = seriesNums.includes(expectedPrev);
        const hasNext = seriesNums.includes(expectedNext);
        const existsInSeries = seriesNums.includes(currentNum);

        if (!hasPrev && !hasNext && !existsInSeries && currentNum > seriesNums[0] && currentNum < seriesNums[seriesNums.length - 1]) {
          errors.push({
            field: 'voucherNo',
            code: 'WARN_VOUCHER_GAP',
            message: `Cảnh báo: Số chứng từ '${tx.voucherNo}' có thể bị nhảy số. Chuỗi '${prefix}' hiện có ${seriesNums.length} số từ ${seriesNums[0]}→${seriesNums[seriesNums.length - 1]}`,
            severity: 'WARNING',
          });
        }
      }
    }
  }

  // Rule 10: Kiểm soát chi ≥ 5.000.000 VNĐ thiếu hóa đơn GTGT (Nguy cơ bị loại chi phí thuế TNDN)
  if (tx.type === 'EXPENSE' && tx.amount >= 5000000) {
    const hasVoucherNo = tx.voucherNo && tx.voucherNo.trim().length > 0 && !tx.voucherNo.toLowerCase().includes('trống');
    const hasTaxCode = tx.partnerTaxCode && tx.partnerTaxCode.trim().length >= 10;
    const hasInvoiceDetail = tx.rawRow && (tx.rawRow['Số hóa đơn'] || tx.rawRow['SoHD'] || tx.rawRow['Mẫu số'] || tx.sourceFileName.endsWith('.xml'));

    if (!hasVoucherNo && !hasInvoiceDetail) {
      errors.push({
        field: 'amount',
        code: 'WARN_HIGH_EXPENSE_NO_INVOICE',
        message: `🚨 Nguy cơ bị loại chi phí thuế TNDN: Khoản chi ${tx.amount.toLocaleString('vi-VN')} đ (≥5tr) không có Số Hóa Đơn / Tệp XML hợp lệ.`,
        severity: 'WARNING',
      });
    }
  }

  // Rule 12: Cảnh báo thanh toán tiền mặt ≥ 20.000.000 VNĐ (Nguy cơ bị loại Thuế GTGT khấu trừ & Chi phí TNDN)
  if ((tx.type === 'EXPENSE' || tx.debitAcc?.startsWith('133') || tx.debitAcc?.startsWith('152') || tx.debitAcc?.startsWith('156') || tx.debitAcc?.startsWith('642')) && tx.amount >= 20000000) {
    const isCashPayment = tx.creditAcc?.startsWith('111') || tx.description.toLowerCase().includes('tiền mặt') || tx.description.toLowerCase().includes('phiếu chi');
    if (isCashPayment) {
      errors.push({
        field: 'amount',
        code: 'ERR_CASH_PAYMENT_OVER_20M',
        message: `🚨 NGUY CƠ BỊ LOẠI THUẾ GTGT & CHI PHÍ TNDN: Chứng từ mua hàng/chi phí ${tx.amount.toLocaleString('vi-VN')} đ (≥20M) thanh toán bằng tiền mặt (TK 111). Theo Luật Thuế GTGT & NĐ 72/2024, bắt buộc phải có chứng từ thanh toán qua ngân hàng (TK 112).`,
        severity: 'WARNING',
      });
    }
  }

  // Determine overall status
  let status: ValidationStatus = 'VALID';
  if (errors.some(e => e.severity === 'ERROR')) {
    status = 'ERROR';
  } else if (errors.some(e => e.severity === 'WARNING')) {
    status = 'WARNING';
  }

  // Save to Memoization Cache
  const result = { status, errors };
  validationCache.set(txHash, result);

  return result;
}


