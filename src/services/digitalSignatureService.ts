export interface DigitalCertificateInfo {
  subjectName: string;      // Tên Doanh nghiệp chủ thể (VD: CÔNG TY TNHH THƯƠNG MẠI Á CHÂU)
  serialNumber: string;     // Số Serial Chữ ký số
  issuerName: string;       // Nhà cung cấp dịch vụ CA (VD: VIETTEL-CA, VNPT-CA, BKAV-CA)
  validFrom: string;        // Ngày bắt đầu hiệu lực
  validTo: string;          // Ngày hết hạn
  daysRemaining: number;    // Số ngày còn lại
  status: 'VALID' | 'WARNING_EXPIRING_SOON' | 'EXPIRED';
}

export interface SignedXMLResult {
  isSigned: boolean;
  signedXmlContent: string;
  signatureHash: string;
  signedAt: string;
  certificate: DigitalCertificateInfo;
}

export const mockGetActiveCompanyCertificate = (): DigitalCertificateInfo => {
  const validToDate = new Date();
  validToDate.setMonth(validToDate.getMonth() + 14); // Còn 14 tháng hiệu lực

  const validFromDate = new Date();
  validFromDate.setFullYear(validFromDate.getFullYear() - 1);

  const daysRemaining = Math.ceil((validToDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));

  return {
    subjectName: 'CÔNG TY TNHH THƯƠNG MẠI & DỊCH VỤ Á CHÂU',
    serialNumber: '540483920194829103948201',
    issuerName: 'VIETTEL-CA (TỔNG CÔNG TY VIỄN THÔNG VIETTEL)',
    validFrom: validFromDate.toLocaleDateString('vi-VN'),
    validTo: validToDate.toLocaleDateString('vi-VN'),
    daysRemaining,
    status: daysRemaining > 60 ? 'VALID' : daysRemaining > 0 ? 'WARNING_EXPIRING_SOON' : 'EXPIRED',
  };
};

export const signXmlInvoiceDocument = (
  rawXmlContent: string,
  cert: DigitalCertificateInfo = mockGetActiveCompanyCertificate()
): SignedXMLResult => {
  const timestamp = new Date().toISOString();
  const signatureHash = `SHA256-${Date.now()}-${cert.serialNumber.substring(0, 8)}`;

  // Thêm cấu trúc thẻ chữ ký số XML <ds:Signature> chuẩn TCT
  const dsSignatureBlock = `
  <ds:Signature xmlns:ds="http://www.w3.org/2000/09/xmldsig#">
    <ds:SignedInfo>
      <ds:CanonicalizationMethod Algorithm="http://www.w3.org/TR/2001/REC-xml-c14n-20010315"/>
      <ds:SignatureMethod Algorithm="http://www.w3.org/2001/04/xmldsig-more#rsa-sha256"/>
      <ds:Reference URI="">
        <ds:DigestMethod Algorithm="http://www.w3.org/2001/04/xmlenc#sha256"/>
        <ds:DigestValue>${signatureHash}</ds:DigestValue>
      </ds:Reference>
    </ds:SignedInfo>
    <ds:SignatureValue>${signatureHash}_SIGNED_RSA_2048_BIT</ds:SignatureValue>
    <ds:KeyInfo>
      <ds:X509Data>
        <ds:X509SubjectName>${cert.subjectName}</ds:X509SubjectName>
        <ds:X509IssuerName>${cert.issuerName}</ds:X509IssuerName>
        <ds:X509SerialNumber>${cert.serialNumber}</ds:X509SerialNumber>
      </ds:X509Data>
    </ds:KeyInfo>
  </ds:Signature>`;

  const signedXmlContent = rawXmlContent.includes('</HDon>')
    ? rawXmlContent.replace('</HDon>', `${dsSignatureBlock}\n</HDon>`)
    : `${rawXmlContent}\n${dsSignatureBlock}`;

  return {
    isSigned: true,
    signedXmlContent,
    signatureHash,
    signedAt: new Date().toLocaleString('vi-VN'),
    certificate: cert,
  };
};
