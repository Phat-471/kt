/**
 * XML Worker Pool Service — Quản Lý Đa Luồng Parse File XML Song Song
 */

import { ParsedXMLInvoice } from '../workers/xmlParserWorker';

export interface ParseTask {
  file: File;
}

export function parseBatchXMLWithPool(
  files: File[],
  onProgress?: (processed: number, total: number) => void
): Promise<ParsedXMLInvoice[]> {
  return new Promise((resolve) => {
    if (files.length === 0) {
      resolve([]);
      return;
    }

    const results: ParsedXMLInvoice[] = [];
    let completedCount = 0;

    const filePromises = files.map(file => {
      return new Promise<ParsedXMLInvoice | null>((res) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          const content = e.target?.result as string;
          try {
            const parser = new DOMParser();
            const doc = parser.parseFromString(content, 'text/xml');

            const getText = (tags: string[]) => {
              for (const tag of tags) {
                const el = doc.getElementsByTagName(tag)[0];
                if (el && el.textContent) return el.textContent.trim();
              }
              return '';
            };

            const getNum = (tags: string[]) => {
              const txt = getText(tags);
              return txt ? parseFloat(txt.replace(/,/g, '')) || 0 : 0;
            };

            const invoiceNo = getText(['SHDon', 'SoHoaDon', 'soHD', 'InvoiceNo']) || 'HD-UNKNOWN';
            const invoiceDate = getText(['NLap', 'NgayLap', 'ngayHD', 'InvoiceDate']) || new Date().toISOString().slice(0, 10);
            const sellerName = getText(['TenNNop', 'TenNguoiBan', 'NBanTen', 'SellerName']) || 'Đơn vị bán';
            const sellerTaxCode = getText(['MST', 'MaSoThue', 'NBanMST', 'SellerTaxCode']) || '';
            const buyerName = getText(['TenNMua', 'NMuaTen', 'BuyerName']) || '';
            const buyerTaxCode = getText(['NMuaMST', 'BuyerTaxCode']) || '';

            const totalTaxable = getNum(['TongTienChuaThue', 'TgTienCt', 'TotalNet']);
            const totalVAT = getNum(['TongTienThue', 'TgTienThue', 'TotalVAT']);
            const totalAmount = getNum(['TongTienThanhToan', 'TgTienTt', 'TotalAmount']) || (totalTaxable + totalVAT);
            const items = doc.getElementsByTagName('HHDVu');

            const parsed: ParsedXMLInvoice = {
              fileName: file.name,
              invoiceNo,
              invoiceDate,
              sellerName,
              sellerTaxCode,
              buyerName,
              buyerTaxCode,
              totalTaxable,
              totalVAT,
              totalAmount,
              itemsCount: items.length || 1,
            };

            completedCount++;
            if (onProgress) onProgress(completedCount, files.length);
            res(parsed);
          } catch {
            completedCount++;
            if (onProgress) onProgress(completedCount, files.length);
            res(null);
          }
        };
        reader.onerror = () => {
          completedCount++;
          if (onProgress) onProgress(completedCount, files.length);
          res(null);
        };
        reader.readAsText(file);
      });
    });

    Promise.all(filePromises).then(items => {
      const valid = items.filter((x): x is ParsedXMLInvoice => x !== null);
      resolve(valid);
    });
  });
}
