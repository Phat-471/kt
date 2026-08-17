import React, { useState, useEffect } from 'react';
import { BaseModal } from './BaseModal';
import { 
  RefreshCw, 
  CheckCircle2, 
  Sparkles, 
  Download, 
  ExternalLink, 
  AlertCircle, 
  Rocket, 
  Zap,
  CheckCircle,
  Loader2,
  HardDrive
} from 'lucide-react';

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
  sizeBytes?: number;
}

export const CURRENT_APP_VERSION = 'v1.2.0';
const GITHUB_REPO = 'Phat-471/kt';

declare global {
  interface Window {
    electronAPI?: {
      getAppVersion?: () => Promise<string>;
      startDownloadUpdate?: (url: string) => Promise<{ success: boolean; filePath?: string; error?: string }>;
      onDownloadProgress?: (callback: (data: { percent: number; receivedBytes: number; totalBytes: number }) => void) => () => void;
      installUpdate?: (options?: { silent?: boolean }) => Promise<{ success: boolean; error?: string }>;
      onNavigate?: (callback: (tab: string) => void) => void;
      onOpenModal?: (callback: (modal: string) => void) => void;
    };
  }
}

export const UpdateCheckerModal: React.FC<UpdateCheckerModalProps> = ({ 
  isOpen, 
  onClose,
  currentVersion: propVersion
}) => {
  const [activeVersion, setActiveVersion] = useState<string>(propVersion || CURRENT_APP_VERSION);
  const [isChecking, setIsChecking] = useState(false);
  const [checked, setChecked] = useState(false);
  const [hasNewVersion, setHasNewVersion] = useState(false);
  const [latestRelease, setLatestRelease] = useState<ReleaseInfo | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Download & Install State
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState<{
    percent: number;
    receivedMB: string;
    totalMB: string;
  }>({ percent: 0, receivedMB: '0', totalMB: '0' });
  const [isReadyToInstall, setIsReadyToInstall] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);

  // Lấy phiên bản từ electron nếu có
  useEffect(() => {
    if (window.electronAPI?.getAppVersion) {
      window.electronAPI.getAppVersion().then(ver => {
        if (ver) setActiveVersion(`v${ver}`);
      }).catch(() => {});
    }
  }, []);

  const checkOnlineRelease = async () => {
    setIsChecking(true);
    setErrorMessage(null);
    setIsDownloading(false);
    setIsReadyToInstall(false);
    setIsInstalling(false);
    setCountdown(null);

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
        downloadName: targetAsset ? targetAsset.name : 'KeToanCongDoan-Setup.exe',
        sizeBytes: targetAsset ? targetAsset.size : 0
      };

      setLatestRelease(info);
      setChecked(true);

      // So sánh phiên bản: nếu tag trên mạng khác với tag hiện tại
      const cleanLatest = tagName.replace(/^v/, '').trim();
      const cleanCurrent = activeVersion.replace(/^v/, '').trim();

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

  // Đăng ký lắng nghe tiến trình tải từ Electron Main
  useEffect(() => {
    if (!window.electronAPI?.onDownloadProgress) return;

    const cleanup = window.electronAPI.onDownloadProgress((data) => {
      const receivedMB = (data.receivedBytes / (1024 * 1024)).toFixed(1);
      const totalMB = data.totalBytes > 0 ? (data.totalBytes / (1024 * 1024)).toFixed(1) : '---';
      setDownloadProgress({
        percent: data.percent || 0,
        receivedMB,
        totalMB
      });
    });

    return () => {
      cleanup();
    };
  }, []);

  // Xử lý tự động tải ngầm và hiển thị thanh tiến trình
  const handleStartAutoUpdate = async () => {
    if (!latestRelease?.downloadUrl) return;

    // Nếu chạy trong môi trường Electron Desktop App
    if (window.electronAPI?.startDownloadUpdate) {
      setIsDownloading(true);
      setErrorMessage(null);

      const result = await window.electronAPI.startDownloadUpdate(latestRelease.downloadUrl);
      
      if (result.success) {
        setIsDownloading(false);
        setIsReadyToInstall(true);
        setDownloadProgress({ percent: 100, receivedMB: 'Xong', totalMB: 'Xong' });

        // Đếm ngược 3 giây rồi tự động cài đặt
        let timer = 3;
        setCountdown(timer);
        const interval = setInterval(() => {
          timer -= 1;
          if (timer <= 0) {
            clearInterval(interval);
            handleExecuteInstall();
          } else {
            setCountdown(timer);
          }
        }, 1000);
      } else {
        setIsDownloading(false);
        setErrorMessage(result.error || 'Tải bản cập nhật thất bại.');
      }
    } else {
      // Fallback: Mở link tải trực tiếp trên trình duyệt
      window.open(latestRelease.downloadUrl, '_blank');
    }
  };

  const handleExecuteInstall = async () => {
    setIsInstalling(true);
    if (window.electronAPI?.installUpdate) {
      await window.electronAPI.installUpdate({ silent: false });
    }
  };

  return (
    <BaseModal isOpen={isOpen} onClose={onClose} title="Cập Nhật & Nâng Cấp Phần Mềm Tự Động" size="md">
      <div className="space-y-4 text-xs">
        {/* Banner Phiên Bản Hiện Tại */}
        <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200 flex items-center justify-between flex-wrap gap-3">
          <div className="space-y-1">
            <div className="text-[11px] text-blue-700 font-semibold uppercase tracking-wider">Phiên bản đang dùng</div>
            <div className="font-extrabold text-slate-900 text-lg flex items-center gap-2">
              <span>{activeVersion}</span>
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
            disabled={isChecking || isDownloading || isInstalling}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg font-bold shadow-sm transition-all flex-shrink-0"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isChecking ? 'animate-spin' : ''}`} />
            <span>{isChecking ? 'Đang kiểm tra...' : 'Kiểm Tra Bản Mới'}</span>
          </button>
        </div>

        {/* Khung Thông Báo Có Bản Cập Nhật Mới */}
        {hasNewVersion && latestRelease && (
          <div className="p-4 bg-emerald-50 border-2 border-emerald-500 rounded-xl space-y-3.5 shadow-md animate-in fade-in">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-emerald-600 text-white rounded-xl shadow-sm">
                  <Rocket className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-extrabold text-emerald-950 text-sm flex items-center gap-2">
                    <span>ĐÃ CÓ BẢN CẬP NHẬT MỚI: {latestRelease.tagName}!</span>
                  </div>
                  <div className="text-xs text-emerald-800 font-medium mt-0.5">
                    {latestRelease.name} • Ngày phát hành: {latestRelease.publishedAt}
                  </div>
                </div>
              </div>
            </div>

            {/* Nội dung điểm mới (Changelog) */}
            <div className="bg-white/90 p-3.5 rounded-xl border border-emerald-200 text-xs space-y-1.5 text-slate-800 whitespace-pre-line max-h-36 overflow-y-auto leading-relaxed shadow-inner">
              {latestRelease.body || 'Bản nâng cấp tối ưu hóa hiệu năng, cập nhật tính năng mới và các biểu mẫu chuẩn.'}
            </div>

            {/* Trạng thái Đang Tải (Progress Bar) */}
            {isDownloading && (
              <div className="bg-white p-3.5 rounded-xl border border-emerald-300 space-y-2.5 shadow-sm">
                <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                  <div className="flex items-center gap-2 text-emerald-700">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Đang tự động tải bản cập nhật {latestRelease.tagName}...</span>
                  </div>
                  <div className="font-mono text-emerald-800 text-sm">
                    {downloadProgress.percent}%
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="w-full bg-slate-100 rounded-full h-3.5 overflow-hidden p-0.5 border border-slate-200">
                  <div 
                    className="bg-gradient-to-r from-emerald-500 to-teal-600 h-full rounded-full transition-all duration-300 shadow-sm relative overflow-hidden"
                    style={{ width: `${Math.max(downloadProgress.percent, 3)}%` }}
                  >
                    <div className="absolute inset-0 bg-white/20 animate-pulse" />
                  </div>
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-500">
                  <span>Dung lượng đã tải: <strong className="text-slate-800">{downloadProgress.receivedMB} MB</strong> / {downloadProgress.totalMB} MB</span>
                  <span className="text-emerald-700 font-semibold">Tự động cài đặt sau khi hoàn tất</span>
                </div>
              </div>
            )}

            {/* Trạng thái Đã Tải Xong & Đang Tiến Hành Cài Đặt */}
            {isReadyToInstall && (
              <div className="bg-emerald-100/80 p-3.5 rounded-xl border border-emerald-400 space-y-2">
                <div className="flex items-center gap-2 text-emerald-900 font-bold text-xs">
                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                  <span>Đã tải xong bản cài đặt! Đang chuẩn bị cập nhật...</span>
                </div>
                <div className="text-xs text-emerald-800">
                  Ứng dụng sẽ tự động đóng và tiến hành cài đặt bản {latestRelease.tagName} trong <strong>{countdown ?? 1}s</strong>.
                </div>
              </div>
            )}

            {/* Các Nút Thao Tác Cập Nhật */}
            {!isDownloading && !isReadyToInstall && (
              <div className="flex items-center gap-2.5 pt-1 flex-wrap">
                <button
                  onClick={handleStartAutoUpdate}
                  className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-md hover:shadow-lg transition-all text-xs active:scale-95"
                >
                  <Zap className="w-4 h-4 text-amber-300 fill-amber-300" />
                  <span>Tự Động Cập Nhật Ngay ({latestRelease.tagName})</span>
                </button>

                <a
                  href={latestRelease.htmlUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1.5 px-3 py-2 bg-white text-emerald-800 border border-emerald-300 hover:bg-emerald-100 rounded-xl font-semibold text-xs transition-all shadow-xs"
                >
                  <span>Xem Chi Tiết</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            )}

            {isReadyToInstall && (
              <div className="flex items-center gap-2 pt-1">
                <button
                  onClick={handleExecuteInstall}
                  disabled={isInstalling}
                  className="flex items-center gap-2 px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl font-bold shadow-md transition-all text-xs"
                >
                  <HardDrive className="w-4 h-4" />
                  <span>{isInstalling ? 'Đang khởi động cài đặt...' : 'Cài Đặt Ngay'}</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* Thông báo Đã Ở Bản Mới Nhất */}
        {checked && !hasNewVersion && !errorMessage && (
          <div className="p-3.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl flex items-center gap-2.5 font-semibold shadow-xs">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
            <div>
              <div>Phần mềm của bạn đang ở phiên bản mới nhất ({activeVersion})!</div>
              <div className="text-[11px] text-emerald-600 font-normal mt-0.5">Hệ thống đã đồng bộ với kho phát hành GitHub trực tuyến.</div>
            </div>
          </div>
        )}

        {/* Thông báo Lỗi Kết Nối */}
        {errorMessage && (
          <div className="p-3.5 bg-rose-50 text-rose-800 border border-rose-200 rounded-xl flex items-center gap-2.5 font-semibold">
            <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />
            <div>
              <div>{errorMessage}</div>
              <div className="text-[11px] text-rose-600 font-normal mt-0.5">Vui lòng kiểm tra kết nối mạng Internet của máy tính.</div>
            </div>
          </div>
        )}

        {/* Tính Năng Nổi Bật */}
        <div className="space-y-2">
          <div className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-amber-500" />
            <span>Tính Năng Trọng Tâm:</span>
          </div>

          <div className="space-y-2 bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-slate-700">
            <div className="flex items-start gap-2">
              <span className="font-bold text-emerald-600">✓</span>
              <div>
                <strong className="text-slate-900">Tự Động Nâng Cấp 1 Chạm:</strong> Tự tải ngầm và cài đặt phiên bản mới nhất ngay trong ứng dụng, có thanh tiến trình % trực quan.
              </div>
            </div>
            <div className="flex items-start gap-2">
              <span className="font-bold text-emerald-600">✓</span>
              <div>
                <strong className="text-slate-900">Tìm Kiếm Nhanh Mã NV:</strong> Tự động lọc và điền nhanh thông tin đoàn viên khi lập Phiếu Thu / Chi.
              </div>
            </div>
            <div className="flex items-start gap-2">
              <span className="font-bold text-emerald-600">✓</span>
              <div>
                <strong className="text-slate-900">Chỉnh Sửa Đoàn Viên & Xuất Excel Đẹp:</strong> Hỗ trợ sửa nhân viên và xuất Excel chuyên nghiệp đa tùy chọn.
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
