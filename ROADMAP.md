# ROADMAP DỰ ÁN - AccoDesk

*AccoDesk - Trợ Lý Kế Toán Offline, tập trung vào bảo mật, hiệu năng và giao diện hiện đại.*

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
- [x] Phân tích cú pháp XML Hóa đơn chuẩn TT78
- [x] Giao diện Drag & Drop / Quét thư mục
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
- [x] **Xuất Báo cáo PDF Native (`jspdf` + `jspdf-autotable`)** cho Đối chiếu và Kiểm lỗi
- [x] **Trí tuệ Nghiệp vụ Dashboard (Chart.js)**: Thu vs Chi, Phân bổ TK, Xu hướng dòng tiền
- [x] In ấn trực tiếp từ phần mềm

## Giai đoạn 6: Tối Ưu Hóa & Đóng Gói (Đang triển khai)
- [x] Tối ưu hóa UI/UX: Thu gọn Menu, phím tắt toàn cục, Page transition animation, TableSkeleton
- [ ] Cải thiện hiệu suất xử lý file dung lượng lớn (Web Worker pool parse XML, Virtualized Table)
- [ ] Đóng gói và phát hành (CI/CD, Auto-updater, Installer)

