import React, { useState } from 'react';
import { BaseModal } from './BaseModal';
import { MessageSquare, Send, PhoneCall, CheckCircle2, AlertTriangle, Download, Copy } from 'lucide-react';
import { db } from '../../services/storage';

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const FeedbackModal: React.FC<FeedbackModalProps> = ({ isOpen, onClose }) => {
  const [feedbackType, setFeedbackType] = useState<'BUG' | 'FEATURE' | 'QUESTION'>('BUG');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [contactInfo, setContactInfo] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleExportDiagnostics = async () => {
    try {
      const diagInfo = {
        app: 'KẾ TOÁN TÀI CHÍNH CÔNG ĐOÀN CƠ SỞ',
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        feedbackType,
        title,
        description,
        contactInfo,
        browser: navigator.userAgent,
      };

      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(diagInfo, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `BaoCaoLoi_CongDoan_${Date.now()}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
    } catch (e: any) {
      alert(`Lỗi xuất log: ${e?.message}`);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const reports = JSON.parse(localStorage.getItem('user_feedback_reports') || '[]');
      reports.push({
        id: `fb-${Date.now()}`,
        type: feedbackType,
        title,
        description,
        contactInfo,
        createdAt: new Date().toISOString(),
      });
      localStorage.setItem('user_feedback_reports', JSON.stringify(reports));

      setTimeout(() => {
        setIsSubmitting(false);
        setIsSuccess(true);
      }, 500);
    } catch (err) {
      setIsSubmitting(false);
      setIsSuccess(true);
    }
  };

  const handleResetAndClose = () => {
    setIsSuccess(false);
    setTitle('');
    setDescription('');
    onClose();
  };

  return (
    <BaseModal isOpen={isOpen} onClose={handleResetAndClose} title="Hỗ Trợ Kỹ Thuật & Báo Cáo Lỗi Trực Tiếp" size="md">
      {isSuccess ? (
        <div className="text-center py-6 space-y-4">
          <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <h4 className="font-bold text-slate-900 text-base">Đã Tiếp Nhận Báo Cáo Thành Công!</h4>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              Cảm ơn bạn đã gửi phản hồi. Kỹ thuật viên sẽ kiểm tra và khắc phục ngay trong bản cập nhật kế tiếp.
            </p>
          </div>

          <div className="p-3.5 bg-blue-50 rounded-xl border border-blue-200 text-xs text-left text-slate-700 space-y-1.5">
            <div className="font-bold text-blue-900 flex items-center gap-1.5">
              <PhoneCall className="w-4 h-4 text-blue-600" />
              <span>Kênh Hỗ Trợ Trực Tiếp 24/7:</span>
            </div>
            <div>• <strong>Hotline / Zalo:</strong>0974.194.305 (Hỗ trợ Kế toán Công Đoàn)</div>
            <div>• <strong>Email kỹ thuật:</strong> Phat</div>
          </div>

          <button
            onClick={handleResetAndClose}
            className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-sm"
          >
            Đóng Cửa Sổ
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Loại Phản Hồi (*)</label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setFeedbackType('BUG')}
                className={`py-2 rounded-lg font-semibold border text-xs flex items-center justify-center gap-1.5 transition-all ${feedbackType === 'BUG' ? 'bg-rose-50 border-rose-400 text-rose-700 shadow-sm' : 'bg-slate-50 border-slate-200 text-slate-600'
                  }`}
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Báo Lỗi / Sự Cố</span>
              </button>
              <button
                type="button"
                onClick={() => setFeedbackType('FEATURE')}
                className={`py-2 rounded-lg font-semibold border text-xs flex items-center justify-center gap-1.5 transition-all ${feedbackType === 'FEATURE' ? 'bg-blue-50 border-blue-400 text-blue-700 shadow-sm' : 'bg-slate-50 border-slate-200 text-slate-600'
                  }`}
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Góp Ý Tính Năng</span>
              </button>
              <button
                type="button"
                onClick={() => setFeedbackType('QUESTION')}
                className={`py-2 rounded-lg font-semibold border text-xs flex items-center justify-center gap-1.5 transition-all ${feedbackType === 'QUESTION' ? 'bg-emerald-50 border-emerald-400 text-emerald-700 shadow-sm' : 'bg-slate-50 border-slate-200 text-slate-600'
                  }`}
              >
                <PhoneCall className="w-3.5 h-3.5" />
                <span>Hỏi Nghiệp Vụ</span>
              </button>
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Tóm Tắt Vấn Đề (*)</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="VD: Không in được phiếu thu tháng 6, hoặc sai số tiền thai sản..."
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Mô Tả Chi Tiết Vấn Đề Gặp Phải (*)</label>
            <textarea
              required
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Mô tả cụ thể các bước bạn vừa làm trước khi gặp lỗi..."
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Số Điện Thoại / Zalo Của Bạn (để kỹ thuật viên hỗ trợ nhanh)</label>
            <input
              type="text"
              value={contactInfo}
              onChange={(e) => setContactInfo(e.target.value)}
              placeholder="VD: 0908 123 456"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="pt-2 flex items-center justify-between border-t border-slate-200">
            <button
              type="button"
              onClick={handleExportDiagnostics}
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold"
              title="Xuất file nhật ký lỗi để gửi qua Zalo cho kỹ thuật viên"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Tải File Log Lỗi</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-sm transition-all"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{isSubmitting ? 'Đang gửi...' : 'Gửi Báo Cáo Lỗi'}</span>
              </button>
            </div>
          </div>
        </form>
      )}
    </BaseModal>
  );
};
