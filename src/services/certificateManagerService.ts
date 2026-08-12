import { DigitalCertificateInfo, mockGetActiveCompanyCertificate } from './digitalSignatureService';

export interface CertificateAuditSummary {
  certificate: DigitalCertificateInfo;
  isReadyForSigning: boolean;
  alertMessage: string;
  recommendationAction: string;
}

export const auditCertificateHealth = (
  cert: DigitalCertificateInfo = mockGetActiveCompanyCertificate()
): CertificateAuditSummary => {
  if (cert.daysRemaining <= 0) {
    return {
      certificate: cert,
      isReadyForSigning: false,
      alertMessage: `❌ CHỨNG THƯ SỐ ĐÃ HẾT HẠN TỪ NGÀY ${cert.validTo}!`,
      recommendationAction: 'Liên hệ nhà cung cấp CA (Viettel/VNPT/BKAV) để gia hạn chữ ký số ngay lập tức.',
    };
  }

  if (cert.daysRemaining <= 30) {
    return {
      certificate: cert,
      isReadyForSigning: true,
      alertMessage: `⚠️ CHỨNG THƯ SỐ SẮP HẾT HẠN TRONG ${cert.daysRemaining} NGÀY TỚI (Hạn: ${cert.validTo}).`,
      recommendationAction: 'Chuẩn bị làm thủ tục gia hạn chữ ký số để tránh gián đoạn phát hành Hóa đơn điện tử.',
    };
  }

  return {
    certificate: cert,
    isReadyForSigning: true,
    alertMessage: `✅ Chữ ký số hợp lệ. Thời hạn còn lại: ${cert.daysRemaining} ngày (Đến ngày ${cert.validTo}).`,
    recommendationAction: 'Chữ ký số hoạt động ổn định.',
  };
};
