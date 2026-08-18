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
  RotateCcw,
  History,
  ShieldCheck
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

export const CURRENT_APP_VERSION = 'v1.3.1';
const GITHUB_REPO = 'Phat-471/kt';

declare global {
  interface Window {
    electronAPI?: {
      getAppVersion?: () => Promise<string>;
      startDownloadUpdate?: (url: string) => Promise<{ success: boolean; filePath?: string; error?: string }>;
      onDownloadProgress?: (callback: (data: { percent: number; receivedBytes: number; totalBytes: number }) => void) => () => void;
      installUpdate?: (options?: { silent?: boolean }) => Promise<{ success: boolean; error?: string }>;
      rollbackVersion?: (targetVersion: string) => Promise<{ success: boolean; error?: string }>;
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
  const [activeTab, setActiveTab] = useState<'UPDATE' | 'ROLLBACK'>('UPDATE');
  const [activeVersion, setActiveVersion] = useState<string>(propVersion || CURRENT_APP_VERSION);
  const [isChecking, setIsChecking] = useState(false);
  const [checked, setChecked] = useState(false);
  const [hasNewVersion, setHasNewVersion] = useState(false);
  const [latestRelease, setLatestRelease] = useState<ReleaseInfo | null>(null);
  const [allReleases, setAllReleases] = useState<ReleaseInfo[]>([]);
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

  // Rollback Action State
  const [rollbackTarget, setRollbackTarget] = useState<string | null>(null);
  const [isRollingBack, setIsRollingBack] = useState(false);

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
      // 1. Tải danh sách tất cả các releases để phục vụ rollback
      const resList = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/releases`, {
        headers: { 'Accept': 'application/vnd.github.v3+json' }
      });

      if (!resList.ok) {
        throw new Error(`Không thể kết nối máy chủ GitHub (HTTP ${resList.status})`);
      }

      const listData = await resList.json();
      if (Array.isArray(listData) && listData.length > 0) {
        const formattedList: ReleaseInfo[] = listData.map((data: any) => {
          const exeAsset = data.assets?.find((a: any) => a.name?.endsWith('.exe'));
          return {
            tagName: data.tag_name || '',
            name: data.name || data.tag_name || '',
            body: data.body || '',
            publishedAt: data.published_at ? new Date(data.published_at).toLocaleDateString('vi-VN') : 'Đã phát hành',
            htmlUrl: data.html_url || `https://github.com/${GITHUB_REPO}/releases`,
            downloadUrl: exeAsset ? exeAsset.browser_download_url : data.html_url,
            downloadName: exeAsset ? exeAsset.name : 'KeToanCongDoan-Setup.exe',
            sizeBytes: exeAsset ? exeAsset.size : 0
          };
        });

        setAllReleases(formattedList);

        // Bản mới nhất là phần tử đầu tiên
        const latest = formattedList[0];
        setLatestRelease(latest);
        setChecked(true);

        const cleanLatest = latest.tagName.replace(/^v/, '').trim();
        const cleanCurrent = activeVersion.replace(/^v/, '').trim();

        if (cleanLatest && cleanCurrent && cleanLatest !== cleanCurrent) {
          setHasNewVersion(true);
        } else {
          setHasNewVersion(false);
        }
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
      if (cleanup) cleanup();
    };
  }, []);

  const handleStartAutoUpdate = async () => {
    if (!latestRelease?.downloadUrl) return;

    if (!window.electronAPI?.startDownloadUpdate) {
      window.open(latestRelease.htmlUrl, '_blank');
      return;
    }

    setIsDownloading(true);
    setErrorMessage(null);

    try {
      const res = await window.electronAPI.startDownloadUpdate(latestRelease.downloadUrl);
      if (res.success) {
        setIsDownloading(false);
        setIsReadyToInstall(true);
        startAutoInstallCountdown();
      } else {
        throw new Error(res.error || 'Tải bộ cài thất bại');
      }
    } catch (err: any) {
      setIsDownloading(false);
      setErrorMessage(`Lỗi tải cập nhật: ${err?.message || 'Không xác định'}. Bạn có thể tải thủ công hoặc bấm Khôi Phục.`);
    }
  };

  const startAutoInstallCountdown = () => {
    let timeLeft = 3;
    setCountdown(timeLeft);
    const timer = setInterval(() => {
      timeLeft -= 1;
      setCountdown(timeLeft);
      if (timeLeft <= 0) {
        clearInterval(timer);
        handleExecuteInstall();
      }
    }, 1000);
  };

  const handleExecuteInstall = async () => {
    if (!window.electronAPI?.installUpdate) return;
    setIsInstalling(true);
    try {
      const res = await window.electronAPI.installUpdate({ silent: true });
      if (!res.success) {
        throw new Error(res.error);
      }
    } catch (err: any) {
      setIsInstalling(false);
      setErrorMessage(`Lỗi thực thi cài đặt: ${err?.message}`);
    }
  };

  // Xử lý Rollback về phiên bản cũ
  const handleExecuteRollback = async (targetTag: string) => {
    if (!window.confirm(`Bạn có chắc chắn muốn quay về (Rollback) phiên bản ${targetTag} không? Ứng dụng sẽ tự động cài đè phiên bản này.`)) {
      return;
    }

    setRollbackTarget(targetTag);
    setIsRollingBack(true);
    setErrorMessage(null);

    try {
      if (window.electronAPI?.rollbackVersion) {
        const res = await window.electronAPI.rollbackVersion(targetTag);
        if (!res.success) {
          throw new Error(res.error);
        }
      } else {
        window.open(`https://github.com/${GITHUB_REPO}/releases/tag/${targetTag}`, '_blank');
        setIsRollingBack(false);
      }
    } catch (err: any) {
      setIsRollingBack(false);
      setErrorMessage(`Lỗi khi khôi phục bản ${targetTag}: ${err?.message}`);
    }
  };

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title="Trung Tâm Cập Nhật & Khôi Phục Hệ Thống (Safe Update & Rollback)"
      size="md"
    >
      <div className="space-y-4 text-xs">
        {/* Tab chuyển đổi: Cập Nhật Mới vs Lịch Sử Khôi Phục Rollback */}
        <div className="flex border-b border-slate-200 gap-2 pb-1">
          <button
            onClick={() => setActiveTab('UPDATE')}
            className={`flex items-center gap-1.5 px-3 py-2 font-bold rounded-lg transition-all ${
              activeTab === 'UPDATE'
                ? 'bg-blue-50 text-blue-700 border border-blue-200 shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Sparkles className="w-4 h-4 text-blue-600" />
            <span>Nâng Cấp Phiên Bản</span>
          </button>
          <button
            onClick={() => setActiveTab('ROLLBACK')}
            className={`flex items-center gap-1.5 px-3 py-2 font-bold rounded-lg transition-all ${
              activeTab === 'ROLLBACK'
                ? 'bg-amber-50 text-amber-800 border border-amber-200 shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <RotateCcw className="w-4 h-4 text-amber-600" />
            <span>Quay Về Bản Cũ (Rollback)</span>
          </button>
        </div>

        {/* Khung Thông Tin Phiên Bản Hiện Tại */}
        <div className="p-3.5 bg-gradient-to-r from-blue-50/70 to-indigo-50/50 rounded-xl border border-blue-100 flex items-center justify-between flex-wrap gap-2">
          <div>
            <div className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Phiên Bản Đang Dùng</div>
            <div className="text-base font-extrabold text-blue-900 flex items-center gap-2 mt-0.5">
              <span>{activeVersion}</span>
              <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] rounded-full font-bold">
                {hasNewVersion ? 'Có Bản Mới' : 'Mới Nhất'}
              </span>
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">Hệ thống: Kế Toán Tài Chính Công Đoàn Cơ Sở</div>
          </div>

          <button
            onClick={checkOnlineRelease}
            disabled={isChecking || isDownloading || isRollingBack}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold shadow-sm transition-all text-xs disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isChecking ? 'animate-spin' : ''}`} />
            <span>{isChecking ? 'Đang kiểm tra...' : 'Kiểm Tra Bản Mới'}</span>
          </button>
        </div>

        {/* TAB 1: CẬP NHẬT PHIÊN BẢN */}
        {activeTab === 'UPDATE' && (
          <div className="space-y-4">
            {/* Khi có bản mới */}
            {checked && hasNewVersion && latestRelease && (
              <div className="p-4 bg-emerald-50/70 rounded-xl border border-emerald-200 space-y-3">
                <div className="flex items-start justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-emerald-600 text-white rounded-lg shadow-sm">
                      <Rocket className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="font-bold text-emerald-900 text-sm flex items-center gap-2">
                        <span>Đã có phiên bản mới: {latestRelease.tagName}</span>
                        <span className="text-[10px] bg-emerald-200 text-emerald-800 px-2 py-0.5 rounded-full font-semibold">Khuyên Dùng</span>
                      </div>
                      <div className="text-[11px] text-emerald-700 mt-0.5">
                        Phát hành ngày: {latestRelease.publishedAt}
                      </div>
                    </div>
                  </div>
                </div>

                {latestRelease.body && (
                  <div className="p-3 bg-white/90 rounded-lg border border-emerald-200/80 text-slate-700 space-y-1 text-xs whitespace-pre-line max-h-36 overflow-y-auto">
                    <div className="font-bold text-slate-800 text-[11px]">Nội dung cập nhật:</div>
                    {latestRelease.body}
                  </div>
                )}

                {/* Thanh Tiến Trình Tải */}
                {isDownloading && (
                  <div className="space-y-1.5 p-3 bg-white rounded-lg border border-emerald-200">
                    <div className="flex justify-between items-center text-[11px] font-bold text-slate-700">
                      <span className="flex items-center gap-1.5">
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-600" />
                        Đang tải bản cập nhật...
                      </span>
                      <span>{downloadProgress.percent}% ({downloadProgress.receivedMB} MB / {downloadProgress.totalMB} MB)</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-emerald-600 h-2 rounded-full transition-all duration-200"
                        style={{ width: `${downloadProgress.percent}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Đếm ngược cài đặt */}
                {isReadyToInstall && (
                  <div className="p-3 bg-emerald-100 rounded-lg border border-emerald-300 flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-emerald-700 flex-shrink-0" />
                    <div className="text-xs text-emerald-800">
                      Ứng dụng sẽ tự đóng, nâng cấp âm thầm và mở lại phiên bản <strong>{latestRelease.tagName}</strong> trong <strong>{countdown ?? 1}s</strong>.
                    </div>
                  </div>
                )}

                {/* Các Nút Thao Tác Cập Nhật */}
                {!isDownloading && !isReadyToInstall && (
                  <div className="flex items-center gap-2.5 pt-1 flex-wrap">
                    <button
                      onClick={handleStartAutoUpdate}
                      className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-sm transition-all text-xs"
                    >
                      <Zap className="w-4 h-4 text-amber-300 fill-amber-300" />
                      <span>Tự Động Cập Nhật Ngay ({latestRelease.tagName})</span>
                    </button>
                    <a
                      href={latestRelease.htmlUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1 px-3 py-2 bg-white text-emerald-800 border border-emerald-300 hover:bg-emerald-100 rounded-xl font-semibold text-xs"
                    >
                      <span>Xem Chi Tiết</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                )}
              </div>
            )}

            {/* Thông báo Đã Ở Bản Mới Nhất */}
            {checked && !hasNewVersion && !errorMessage && (
              <div className="p-3.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl flex items-center gap-2.5 font-semibold">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                <div>
                  <div>Phần mềm của bạn đang ở phiên bản mới nhất ({activeVersion})!</div>
                  <div className="text-[11px] text-emerald-600 font-normal mt-0.5">Hệ thống đã đồng bộ với kho phát hành GitHub trực tuyến.</div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: KHÔI PHỤC & ROLLBACK PHIÊN BẢN CŨ */}
        {activeTab === 'ROLLBACK' && (
          <div className="space-y-3">
            <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 flex items-start gap-2.5">
              <ShieldCheck className="w-5 h-5 text-amber-700 flex-shrink-0 mt-0.5" />
              <div className="text-amber-900">
                <div className="font-bold">Tính Năng Khôi Phục An Toàn (Safe Rollback)</div>
                <div className="text-[11px] text-amber-800 mt-0.5">
                  Nếu bản cập nhật mới nhất phát sinh lỗi không mong muốn, bạn có thể bấm <strong>"Khôi Phục Bản Này"</strong> để hạ cấp về phiên bản ổn định trước đó. Dữ liệu kế toán trong máy bạn được bảo toàn 100%.
                </div>
              </div>
            </div>

            {/* Tiến trình rollback */}
            {isRollingBack && (
              <div className="p-3.5 bg-white rounded-xl border border-amber-300 space-y-2">
                <div className="flex justify-between items-center text-xs font-bold text-amber-900">
                  <span className="flex items-center gap-1.5">
                    <Loader2 className="w-4 h-4 animate-spin text-amber-600" />
                    Đang hạ cấp về phiên bản {rollbackTarget}...
                  </span>
                  <span>{downloadProgress.percent}%</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-amber-600 h-2 rounded-full transition-all duration-200"
                    style={{ width: `${downloadProgress.percent}%` }}
                  />
                </div>
                <p className="text-[10px] text-slate-500">Ứng dụng sẽ tự động khởi động lại sau khi nạp bản cũ.</p>
              </div>
            )}

            {/* Danh sách các bản phát hành có thể Rollback */}
            <div className="rounded-xl border border-slate-200 overflow-hidden divide-y divide-slate-100">
              {allReleases.length === 0 ? (
                <div className="p-6 text-center text-slate-400">
                  <History className="w-8 h-8 mx-auto mb-1 text-slate-300" />
                  <p>Đang tải danh sách các bản phát hành từ máy chủ...</p>
                </div>
              ) : (
                allReleases.map(rel => {
                  const isCurrent = rel.tagName === activeVersion;
                  return (
                    <div key={rel.tagName} className="p-3 bg-white hover:bg-slate-50 flex items-center justify-between gap-3">
                      <div>
                        <div className="font-bold text-slate-800 flex items-center gap-1.5">
                          <span>{rel.tagName}</span>
                          {isCurrent && (
                            <span className="px-2 py-0.2 bg-blue-100 text-blue-800 text-[10px] rounded-full font-bold">
                              Đang dùng
                            </span>
                          )}
                          <span className="text-[10px] text-slate-400 font-normal">({rel.publishedAt})</span>
                        </div>
                        <div className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">{rel.name}</div>
                      </div>

                      <div className="flex items-center gap-2">
                        {!isCurrent && (
                          <button
                            disabled={isRollingBack}
                            onClick={() => handleExecuteRollback(rel.tagName)}
                            className="flex items-center gap-1 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold text-[11px] shadow-xs transition-all disabled:opacity-50"
                          >
                            <RotateCcw className="w-3 h-3" />
                            <span>Khôi Phục Bản Này</span>
                          </button>
                        )}
                        <a
                          href={rel.htmlUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="p-1.5 text-slate-400 hover:text-slate-700 rounded hover:bg-slate-200"
                          title="Xem trên GitHub"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* Thông báo Lỗi */}
        {errorMessage && (
          <div className="p-3 bg-rose-50 text-rose-800 border border-rose-200 rounded-xl flex items-center gap-2 font-semibold">
            <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
            <div className="text-xs">{errorMessage}</div>
          </div>
        )}

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
