import React, { useState, useEffect } from 'react';
import { BaseModal } from './BaseModal';
import { RefreshCw, CheckCircle2, Sparkles, ArrowRight, Download, ExternalLink, AlertCircle, Rocket } from 'lucide-react';

interface UpdateCheckerModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentVersion?: string;
}

interface ReleaseInfo {
  tagName: string;
  name: string;
  body: string;
  publishedAt: string;
  htmlUrl: string;
  downloadUrl?: string;
  downloadName?: string;
}

export const CURRENT_APP_VERSION = 'v1.1.0';
const GITHUB_REPO = 'Phat-471/kt';

export const UpdateCheckerModal: React.FC<UpdateCheckerModalProps> = ({ 
  isOpen, 
  onClose,
  currentVersion = CURRENT_APP_VERSION 
}) => {
  const [isChecking, setIsChecking] = useState(false);
  const [checked, setChecked] = useState(false);
  const [hasNewVersion, setHasNewVersion] = useState(false);
  const [latestRelease, setLatestRelease] = useState<ReleaseInfo | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const checkOnlineRelease = async () => {
    setIsChecking(true);
    setErrorMessage(null);
    try {
      const res = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/releases/latest`, {
        headers: {
          'Accept': 'application/vnd.github.v3+json'
        }
      });

      if (!res.ok) {
        throw new Error(`Không thể kết nối máy chủ GitHub (HTTP ${res.status})`);
      }

      const data = await res.json();
      const tagName: string = data.tag_name || '';
      
      // Tìm file cài đặt .exe trong danh sách assets
      const exeAsset = data.assets?.find((a: any) => a.name?.endsWith('.exe'));
      const zipAsset = data.assets?.find((a: any) => a.name?.endsWith('.zip'));
      const targetAsset = exeAsset || zipAsset;

      const info: ReleaseInfo = {
        tagName,
        name: data.name || tagName,
        body: data.body || '',
        publishedAt: data.published_at ? new Date(data.published_at).toLocaleDateString('vi-VN') : 'Mới nhất',
        htmlUrl: data.html_url || `https://github.com/${GITHUB_REPO}/releases`,
        downloadUrl: targetAsset ? targetAsset.browser_download_url : data.html_url,
        downloadName: targetAsset ? targetAsset.name : 'KeToanCongDoan-Setup.exe'
      };

      setLatestRelease(info);
      setChecked(true);

      // So sánh phiên bản: nếu tag trên mạng khác với tag hiện tại
      const cleanLatest = tagName.replace(/^v/, '').trim();
      const cleanCurrent = currentVersion.replace(/^v/, '').trim();

      if (cleanLatest && cleanCurrent && cleanLatest !== cleanCurrent) {
        setHasNewVersion(true);
      } else {
        setHasNewVersion(false);
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Lỗi khi kiểm tra cập nhật');
      setChecked(true);
    } finally {
      setIsChecking(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      checkOnlineRelease();
    }
  }, [isOpen]);

  const handleDownloadUpdate = () => {
    if (latestRelease?.downloadUrl) {
      window.open(latestRelease.downloadUrl, '_blank');
    }
  };

  return (
    <BaseModal isOpen={isOpen} onClose={onClose} title="Cập Nhật & Phiên Bản Phần Mềm" size="md">
      <div className="space-y-4 text-xs">
        {/* Banner Phiên Bản Hiện Tại */}
        <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200 flex items-center justify-between flex-wrap gap-3">
          <div className="space-y-1">
            <div className="text-[11px] text-blue-700 font-semibold uppercase tracking-wider">Phiên bản đang dùng</div>
            <div className="font-extrabold text-slate-900 text-lg flex items-center gap-2">
              <span>{currentVersion}</span>
              <span className={`px-2 py-0.5 text-[10px] rounded-full font-bold border ${
                hasNewVersion 
                  ? 'bg-amber-100 text-amber-800 border-amber-300' 
                  : 'bg-emerald-100 text-emerald-800 border-emerald-300'
              }`}>
                {hasNewVersion ? 'Có Bản Mới' : 'Mới Nhất'}
              </span>
            </div>
            <div className="text-slate-500 text-[11px]">Hệ thống: Kế Toán Tài Chính Công Đoàn Cơ Sở</div>
          </div>

          <button
            onClick={checkOnlineRelease}
            disabled={isChecking}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold shadow-sm transition-all flex-shrink-0"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isChecking ? 'animate-spin' : ''}`} />
            <span>{isChecking ? 'Đang kiểm tra...' : 'Kiểm Tra Bản Mới'}</span>
          </button>
        </div>

        {/* Thông báo Có Bản Cập Nhật Mới */}
        {hasNewVersion && latestRelease && (
          <div className="p-4 bg-emerald-50 border-2 border-emerald-500 rounded-xl space-y-3 shadow-md animate-in fade-in">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-emerald-600 text-white rounded-lg">
                  <Rocket className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-extrabold text-emerald-950 text-sm flex items-center gap-2">
                    <span>ĐÃ CÓ BẢN CẬP NHẬT MỚI: {latestRelease.tagName}!</span>
                  </div>
                  <div className="text-xs text-emerald-800 font-semibold mt-0.5">
                    {latestRelease.name} • Ngày phát hành: {latestRelease.publishedAt}
                  </div>
                </div>
              </div>
            </div>

            {/* Nội dung điểm mới */}
            <div className="bg-white/90 p-3 rounded-lg border border-emerald-200 text-xs space-y-1 text-slate-800 whitespace-pre-line max-h-40 overflow-y-auto">
              {latestRelease.body || 'Bản nâng cấp tối ưu hóa tính năng, bổ sung tìm kiếm nhanh và sửa nhân viên.'}
            </div>

            {/* Nút Tải Cài Đặt */}
            <div className="flex items-center gap-2 pt-1 flex-wrap">
              <button
                onClick={handleDownloadUpdate}
                className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold shadow-md transition-all text-xs"
              >
                <Download className="w-4 h-4" />
                <span>Tải & Cài Đặt Bản Mới ({latestRelease.tagName})</span>
              </button>

              <a
                href={latestRelease.htmlUrl}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 px-3 py-2 bg-white text-emerald-800 border border-emerald-300 hover:bg-emerald-100 rounded-lg font-semibold text-xs transition-all"
              >
                <span>Xem Trên GitHub</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        )}

        {/* Thông báo Đã Ở Bản Mới Nhất */}
        {checked && !hasNewVersion && !errorMessage && (
          <div className="p-3.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl flex items-center gap-2.5 font-semibold shadow-xs">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
            <div>
              <div>Phần mềm của bạn đang ở phiên bản mới nhất ({currentVersion})!</div>
              <div className="text-[11px] text-emerald-600 font-normal mt-0.5">Hệ thống đã đồng bộ với máy chủ phát hành trực tuyến.</div>
            </div>
          </div>
        )}

        {/* Thông báo Lỗi */}
        {errorMessage && (
          <div className="p-3.5 bg-rose-50 text-rose-800 border border-rose-200 rounded-xl flex items-center gap-2.5 font-semibold">
            <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />
            <div>
              <div>{errorMessage}</div>
              <div className="text-[11px] text-rose-600 font-normal mt-0.5">Vui lòng kiểm tra kết nối mạng Internet của máy tính.</div>
            </div>
          </div>
        )}

        {/* Các Tính Năng Nổi Bật */}
        <div className="space-y-2">
          <div className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-amber-500" />
            <span>Tính Năng Trọng Tâm:</span>
          </div>

          <div className="space-y-2 bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-slate-700">
            <div className="flex items-start gap-2">
              <span className="font-bold text-emerald-600">✓</span>
              <div>
                <strong className="text-slate-900">Tìm Kiếm Nhanh Theo Mã NV:</strong> Ô search thông minh khi lập Phiếu Thu/Chi, gõ mã (01, 15...) tự động chọn ngay.
              </div>
            </div>
            <div className="flex items-start gap-2">
              <span className="font-bold text-emerald-600">✓</span>
              <div>
                <strong className="text-slate-900">Quản Lý & Chỉnh Sửa Nhân Viên:</strong> Chức năng sửa thông tin Mã NV, Họ tên, Tổ CĐ trực tiếp trong Cài Đặt.
              </div>
            </div>
            <div className="flex items-start gap-2">
              <span className="font-bold text-emerald-600">✓</span>
              <div>
                <strong className="text-slate-900">Sắp Xếp & Xuất Excel Đa Chế Độ:</strong> Sắp xếp đa tiêu chí và xuất Excel đẹp chuẩn biểu mẫu cho tất cả phân hệ.
              </div>
            </div>
          </div>
        </div>

        <div className="pt-2 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg transition-all"
          >
            Đóng
          </button>
        </div>
      </div>
    </BaseModal>
  );
};
