import React, { useState } from 'react';
import {
  signXmlInvoiceDocument,
  mockGetActiveCompanyCertificate,
  SignedXMLResult,
  DigitalCertificateInfo,
} from '../../services/digitalSignatureService';
import { auditCertificateHealth, CertificateAuditSummary } from '../../services/certificateManagerService';
import {
  KeyRound,
  ShieldCheck,
  CheckCircle2,
  Zap,
} from 'lucide-react';
import { BaseModal } from './BaseModal';

interface DigitalSigningModalProps {
  isOpen: boolean;
  onClose: () => void;
  rawXmlContent?: string;
  invoiceNo?: string;
}

export const DigitalSigningModal: React.FC<DigitalSigningModalProps> = ({
  isOpen,
  onClose,
  rawXmlContent = '<HDon><DVu>Dịch vụ kế toán</DVu><TongTien>15000000</TongTien></HDon>',
  invoiceNo = 'HD2026-0089',
}) => {
  const [signedResult, setSignedResult] = useState<SignedXMLResult | null>(null);
  const cert: DigitalCertificateInfo = mockGetActiveCompanyCertificate();
  const certHealth: CertificateAuditSummary = auditCertificateHealth(cert);

  const handleExecuteSigning = () => {
    const result = signXmlInvoiceDocument(rawXmlContent, cert);
    setSignedResult(result);
  };

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title="Ký Số Hóa Đơn Điện Tử XML (USB Token / HSM)"
      subtitle={`Mã hóa đơn: ${invoiceNo} | Chuẩn Nghị định 123/2020/NĐ-CP`}
      icon={KeyRound}
      maxWidth="xl"
      footer={
        <div className="w-full flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition-all cursor-pointer"
          >
            Đóng
          </button>

          {!signedResult && (
            <button
              onClick={handleExecuteSigning}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-extrabold transition-all shadow-lg active:scale-95 cursor-pointer flex items-center gap-1.5"
            >
              <Zap className="w-4 h-4 text-amber-300" />
              <span>Ký Số 1-Click Ngay</span>
            </button>
          )}
        </div>
      }
    >
      <div className="space-y-4 text-slate-800 dark:text-slate-200">
        <div className="p-3.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 rounded-xl space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="font-extrabold text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4" />
              <span>Chứng Thư Số Doanh Nghiệp (Chữ Ký Số X.509)</span>
            </span>
            <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">CA: {cert.issuerName.split(' ')[0]}</span>
          </div>

          <div className="space-y-1 text-[11px] text-slate-600 dark:text-slate-300">
            <div>Chủ thể: <strong className="text-slate-900 dark:text-white">{cert.subjectName}</strong></div>
            <div>Số Serial: <code className="text-indigo-600 dark:text-indigo-300 font-mono">{cert.serialNumber}</code></div>
            <div>Thời hạn hiệu lực: <strong className="text-emerald-600 dark:text-emerald-400">{cert.validFrom} ➔ {cert.validTo}</strong> ({cert.daysRemaining} ngày còn lại)</div>
          </div>

          <div className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 p-2 rounded-lg border border-emerald-200 dark:border-emerald-500/20">
            {certHealth.alertMessage}
          </div>
        </div>

        {signedResult ? (
          <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-500/30 rounded-xl space-y-2 text-xs">
            <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 font-extrabold">
              <CheckCircle2 className="w-5 h-5" />
              <span>ĐÃ KÝ SỐ HÓA ĐƠN ĐIỆN TỬ THÀNH CÔNG!</span>
            </div>
            <p className="text-[11px] text-slate-600 dark:text-slate-300">
              Thời điểm ký: <strong className="text-slate-900 dark:text-white">{signedResult.signedAt}</strong> | Mã SHA-256 Digest: <code className="text-amber-600 dark:text-amber-300">{signedResult.signatureHash}</code>
            </p>
            <div className="p-2 bg-slate-100 dark:bg-slate-950 rounded-lg font-mono text-[10px] text-slate-600 dark:text-slate-400 max-h-24 overflow-y-auto custom-scrollbar">
              {signedResult.signedXmlContent}
            </div>
          </div>
        ) : (
          <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl font-mono text-[10px] text-slate-600 dark:text-slate-400 max-h-24 overflow-y-auto custom-scrollbar border border-slate-200 dark:border-slate-800">
            {rawXmlContent}
          </div>
        )}
      </div>
    </BaseModal>
  );
};
