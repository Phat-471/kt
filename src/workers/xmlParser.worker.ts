// Web Worker parse XML Hóa Đơn Điện Tử Đa Luồng (>1000 files)

export interface ParsedXmlMessage {
  type: 'PROGRESS' | 'COMPLETE' | 'ERROR' | 'LOG';
  processedCount: number;
  totalCount: number;
  successCount: number;
  errorCount: number;
  skipCount: number;
  currentFileName?: string;
  errorLog?: { fileName: string; reason: string };
  resultItems?: any[];
}

self.onmessage = (event: MessageEvent) => {
  const { files } = event.data;
  if (!files || files.length === 0) {
    self.postMessage({ type: 'COMPLETE', processedCount: 0, totalCount: 0, resultItems: [] });
    return;
  }

  const totalCount = files.length;
  let processedCount = 0;
  let successCount = 0;
  let errorCount = 0;
  let skipCount = 0;
  const resultItems: any[] = [];

  for (let i = 0; i < totalCount; i++) {
    const file = files[i];
    try {
      // Basic fast regex parse XML content without DOM parser overhead inside Worker
      const content = file.content;
      const voucherMatch = content.match(/<(?:shdon|sohd|shd)>([^<]+)<\/(?:shdon|sohd|shd)>/i);
      const dateMatch = content.match(/<(?:tdlap|ngayhd|ngay)>([^<]+)<\/(?:tdlap|ngayhd|ngay)>/i);
      const sellerTaxMatch = content.match(/<(?:mstseller|mstban|mst_nb)>([^<]+)<\/(?:mstseller|mstban|mst_nb)>/i);
      const sellerNameMatch = content.match(/<(?:tenseller|tenban|ten_nb)>([^<]+)<\/(?:tenseller|tenban|ten_nb)>/i);
      const totalAmountMatch = content.match(/<(?:tgttnthanhtien|tongtien|tgtctt)>([^<]+)<\/(?:tgttnthanhtien|tongtien|tgtctt)>/i);

      const amount = totalAmountMatch ? parseFloat(totalAmountMatch[1].replace(/,/g, '')) : 0;

      resultItems.push({
        id: `xml_${i}_${Date.now()}`,
        date: dateMatch ? dateMatch[1].substring(0, 10) : new Date().toISOString().substring(0, 10),
        voucherNo: voucherMatch ? voucherMatch[1] : `HĐ_${i + 1}`,
        description: `Hóa đơn GTGT điện tử - ${sellerNameMatch ? sellerNameMatch[1] : 'Nhà cung cấp'}`,
        debitAcc: '152',
        creditAcc: '331',
        amount: isNaN(amount) ? 0 : amount,
        partnerName: sellerNameMatch ? sellerNameMatch[1] : 'Doanh nghiệp XML',
        partnerTaxCode: sellerTaxMatch ? sellerTaxMatch[1] : '',
        sourceFileName: file.name,
      });

      successCount++;
    } catch (err: any) {
      errorCount++;
      self.postMessage({
        type: 'LOG',
        errorLog: { fileName: file.name, reason: err?.message || 'XML vỡ cấu trúc' },
      });
    }

    processedCount++;

    // Báo tiến trình định kỳ mỗi 50 file hoặc file cuối
    if (processedCount % 50 === 0 || processedCount === totalCount) {
      self.postMessage({
        type: 'PROGRESS',
        processedCount,
        totalCount,
        successCount,
        errorCount,
        skipCount,
        currentFileName: file.name,
      });
    }
  }

  self.postMessage({
    type: 'COMPLETE',
    processedCount,
    totalCount,
    successCount,
    errorCount,
    skipCount,
    resultItems,
  });
};
