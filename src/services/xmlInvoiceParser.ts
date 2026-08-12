import { NormalizedTransaction, TransactionType, ValidationStatus } from '../types/accounting';

export interface XMLInvoiceResult {
  transaction: NormalizedTransaction;
  isPurchase: boolean;
}

export function parseXMLInvoice(
  xmlString: string,
  fileName: string,
  clientId: string,
  clientTaxCode: string
): XMLInvoiceResult | null {
  try {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlString, "text/xml");

    // Check for parse errors
    const parseError = xmlDoc.getElementsByTagName("parsererror");
    if (parseError.length > 0) {
      console.error("Lỗi phân tích cú pháp XML:", parseError[0].textContent);
      return null;
    }

    // Lấy thông tin Hóa đơn
    const DLHDon = xmlDoc.getElementsByTagName("DLHDon")[0];
    if (!DLHDon) return null;

    const TTChung = DLHDon.getElementsByTagName("TTChung")[0];
    const NBan = DLHDon.getElementsByTagName("NBan")[0];
    const NMua = DLHDon.getElementsByTagName("NMua")[0];
    const TToan = DLHDon.getElementsByTagName("TToan")[0];

    if (!TTChung || !NBan || !NMua || !TToan) return null;

    // Số hóa đơn, Ngày lập
    const voucherNo = TTChung.getElementsByTagName("SHDon")[0]?.textContent || '';
    const ngayLapStr = TTChung.getElementsByTagName("NLap")[0]?.textContent || '';
    
    // Convert YYYY-MM-DD
    const date = ngayLapStr.substring(0, 10) || new Date().toISOString().substring(0, 10);

    // Thông tin người mua, người bán
    const nBanName = NBan.getElementsByTagName("Ten")[0]?.textContent || '';
    const nBanTaxCode = NBan.getElementsByTagName("MST")[0]?.textContent || '';
    
    const nMuaName = NMua.getElementsByTagName("Ten")[0]?.textContent || '';
    const nMuaTaxCode = NMua.getElementsByTagName("MST")[0]?.textContent || '';

    // Số tiền
    const tongTien = parseFloat(TToan.getElementsByTagName("TgTTTBSo")[0]?.textContent || TToan.getElementsByTagName("TgTToan")[0]?.textContent || '0');
    const tongTienChuaThue = parseFloat(TToan.getElementsByTagName("TgTChuaThue")[0]?.textContent || '0');
    const tongTienThue = parseFloat(TToan.getElementsByTagName("TgTCThue")[0]?.textContent || '0');

    // Determine if Purchase or Sale based on clientTaxCode
    // Nếu MST của Khách hàng trùng với MST người mua -> Mua vào (Expense)
    // Nếu MST của Khách hàng trùng với MST người bán -> Bán ra (Income)
    let isPurchase = true;
    let partnerName = nBanName;
    let partnerTaxCode = nBanTaxCode;
    let type: TransactionType = 'EXPENSE';

    if (clientTaxCode && nBanTaxCode && clientTaxCode === nBanTaxCode) {
      // Công ty là người bán => Hóa đơn Bán ra (Income)
      isPurchase = false;
      partnerName = nMuaName;
      partnerTaxCode = nMuaTaxCode;
      type = 'INCOME';
    }

    const transaction: NormalizedTransaction = {
      id: crypto.randomUUID(),
      clientId,
      sourceFileName: fileName,
      importDate: new Date().toISOString(),
      type,
      date,
      voucherNo,
      description: isPurchase ? `Mua hàng hóa/dịch vụ từ ${partnerName}` : `Bán hàng hóa/dịch vụ cho ${partnerName}`,
      debitAcc: isPurchase ? '331' : '131', // Gợi ý tk công nợ
      creditAcc: isPurchase ? '111' : '511', // Gợi ý tk đối ứng cơ bản
      amount: tongTien,
      partnerName,
      partnerTaxCode,
      rawRow: {
        sellerName: nBanName,
        sellerTax: nBanTaxCode,
        buyerName: nMuaName,
        buyerTax: nMuaTaxCode,
        invoiceDate: ngayLapStr,
        totalBeforeTax: tongTienChuaThue,
        totalTax: tongTienThue
      },
      validationStatus: 'VALID',
      errors: [],
      userApproved: false
    };

    return { transaction, isPurchase };
  } catch (error) {
    console.error("Lỗi khi đọc XML:", error);
    return null;
  }
}
