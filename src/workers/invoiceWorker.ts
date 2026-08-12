import { parseXMLInvoice } from '../services/xmlInvoiceParser';

let isPaused = false;
let isCancelled = false;

self.onmessage = (e: MessageEvent) => {
  const { type, files, clientId, clientTaxCode } = e.data;

  if (type === 'PAUSE') {
    isPaused = true;
    return;
  }
  if (type === 'RESUME') {
    isPaused = false;
    return;
  }
  if (type === 'CANCEL') {
    isCancelled = true;
    return;
  }

  if (type === 'START') {
    isPaused = false;
    isCancelled = false;

    const processFiles = async () => {
      const results = [];
      const total = files.length;
      let successCount = 0;
      let errorCount = 0;

      for (let i = 0; i < total; i++) {
        if (isCancelled) {
          self.postMessage({ type: 'CANCELLED', results });
          return;
        }

        while (isPaused) {
          await new Promise((resolve) => setTimeout(resolve, 300));
        }

        const group = files[i];
        if (group.xmlText && group.xmlName) {
          try {
            const result = parseXMLInvoice(group.xmlText, group.xmlName, clientId, clientTaxCode);
            if (result && result.transaction) {
              if (group.pdfPath) {
                result.transaction.rawRow.pdfPath = group.pdfPath;
                result.transaction.rawRow.hasPdf = true;
              }
              results.push({
                xmlName: group.xmlName,
                transaction: result.transaction,
                status: 'SUCCESS',
              });
              successCount++;
            } else {
              results.push({
                xmlName: group.xmlName,
                transaction: null,
                status: 'ERROR',
                errorMessage: 'Không thể đọc được dữ liệu hóa đơn chuẩn TT78',
              });
              errorCount++;
            }
          } catch (error: any) {
            results.push({
              xmlName: group.xmlName,
              transaction: null,
              status: 'ERROR',
              errorMessage: error?.message || 'Lỗi định dạng file XML',
            });
            errorCount++;
          }
        }

        // Send progress report back to UI
        if ((i + 1) % 10 === 0 || i + 1 === total) {
          self.postMessage({
            type: 'PROGRESS',
            current: i + 1,
            total,
            successCount,
            errorCount,
            currentFileName: group.xmlName || group.pdfName,
          });
        }
      }

      self.postMessage({ type: 'DONE', results });
    };

    processFiles();
  }
};
