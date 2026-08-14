# ROADMAP DỰ ÁN - AccoDesk Ultra Pro

*AccoDesk Ultra Pro - Trợ Lý Kế Toán Desktop Offline, tập trung vào bảo mật, hiệu năng và giao diện hiện đại.*

## Giai đoạn 1: Nền Tảng (Đã hoàn thành)
- [x] Thiết lập kiến trúc Electron + React + Vite + Dexie.js
- [x] Hệ thống UI/UX cơ bản (Light Mode / Dark Mode) sử dụng TailwindCSS
- [x] Quản lý Database Local (IndexedDB)
- [x] Giao diện Sidebar, Dashboard, và định tuyến cơ bản

## Giai đoạn 2: Quản Lý Khách Hàng & Import Cơ Bản (Đã hoàn thành)
- [x] Module Quản lý thông tin Khách hàng / Job
- [x] Import dữ liệu Excel (Bảng kê mua vào, bán ra, sổ ngân hàng)
- [x] Trích xuất dữ liệu, chuẩn hóa thông tin (NormalizedTransaction)

## Giai đoạn 3: Tính Năng Nâng Cao - Đọc Hóa Đơn (Đã hoàn thành)
- [x] Phân tích cú pháp XML Hóa đơn chuẩn TT78/ND123
- [x] Giao diện Drag & Drop / Quét thư mục XML
- [x] Đính kèm file PDF tự động nếu có cùng tên gốc với XML
- [x] Hệ thống thông báo lỗi/thành công chi tiết từng file

## Giai đoạn 4: Kiểm Lỗi, Đối Chiếu & Audit Log (Đã hoàn thành)
- [x] Phát hiện hóa đơn trùng lặp (Duplicate Detection)
- [x] Đối chiếu giữa Sao kê Ngân hàng và Sổ sách Kế toán
- [x] Hệ thống Audit Log (Lưu vết thao tác)
- [x] Cảnh báo thông minh: MST prefix 01-96, xung đột đối tác, thuế GTGT 8/10%, Outlier ±3σ, Gap Detection

## Giai đoạn 5: Xuất Báo Cáo & In Ấn & BI (Đã hoàn thành)
- [x] Module Generator: Tạo phiếu thu chi tự động (Blob UTF-8 NFC)
- [x] Xuất báo cáo Excel (3-Sheet đối chiếu, Báo cáo kiểm lỗi)
- [x] Xuất Báo cáo PDF Native (`jspdf` + `jspdf-autotable`) cho Đối chiếu và Kiểm lỗi
- [x] Trí tuệ Nghiệp vụ Dashboard (Chart.js): Thu vs Chi, Phân bổ TK, Xu hướng dòng tiền
- [x] In ấn trực tiếp từ phần mềm

## Giai đoạn 6: Bộ Báo Cáo Tài Chính & Đóng Gói Windows (Đã hoàn thành)
- [x] Bảng Cân Đối Kế Toán (Mẫu B01-DN) — Tự động cân bằng Tổng TS = Tổng NV
- [x] Báo Cáo Lưu Chuyển Tiền Tệ (Mẫu B03-DN) — Phương pháp Gián tiếp (HĐKD/HĐĐT/HĐTC)
- [x] Thuyết Minh Báo Cáo Tài Chính (Mẫu B09-DN) — 6 mục tự động sinh
- [x] Đóng gói NSIS Installer Windows (`AccoDesk Ultra Pro Setup 1.0.0.exe` 94.3 MB)
- [x] Auto-Updater (`electron-updater`) & CI/CD GitHub Actions Workflow
- [x] Nâng cấp Giao diện Menu Sidebar: Gom 4 Master Hubs & Ghim Yêu Thích Pin ⭐ nút bấm lớn dễ chọn

## Giai đoạn 7: Tự Động Hóa eTax HTKK & Sổ Nhật Ký Đặc Biệt (Kế hoạch V7 - Quý 3/2026)
- [x] **S7.1 — Xuất XML & Excel Tờ Khai Thuế Cổng HTKK**: Mẫu 01/GTGT (Kèm Phụ lục 01-1, 01-2) & Mẫu 01/TNDN tạm tính quý gửi Cổng Thuế (`thuetdt.gdt.gov.vn`)
- [ ] **S7.2 — Bộ Sổ Nhật Ký Đặc Biệt TT200**: Nhật ký Mua hàng, Nhật ký Bán hàng, Nhật ký Thu tiền, Nhật ký Chi tiền
- [ ] **S7.3 — AI Smart Audit Thuế**: Tự động đối soát Nhà cung cấp ngừng hoạt động / rủi ro MST

## Giai đoạn 8: Đa Doanh Nghiệp & Cloud Backup Tự Động (Kế hoạch V8 - Quý 4/2026)
- [ ] **S8.1 — Quản Lý Đa Doanh Nghiệp / Đa Chi Nhánh**: Chuyển đổi linh hoạt công ty và phân quyền chi tiết
- [ ] **S8.2 — Tự Động Sao Lưu Cloud Mã Hóa AES-256**: Đồng bộ tệp sao lưu an toàn lên Google Drive / OneDrive
