/**
 * XML Parser Worker — Parse file XML Hóa Đơn Điện Tử ở Background Thread
 */

export interface ParsedXMLInvoice {
  fileName: string;
  invoiceNo: string;
  invoiceDate: string;
  sellerName: string;
  sellerTaxCode: string;
  buyerName: string;
  buyerTaxCode: string;
  totalTaxable: number;
  totalVAT: number;
  totalAmount: number;
  itemsCount: number;
}

self.onmessage = async (e: MessageEvent<{ id: string; fileName: string; xmlText: string }>) => {
  const { id, fileName, xmlText } = e.data;
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlText, 'text/xml');

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

    const result: ParsedXMLInvoice = {
      fileName,
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

    self.postMessage({ id, success: true, result });
  } catch (err: any) {
    self.postMessage({ id, success: false, error: err.message || 'Lỗi parse XML' });
  }
};
