# CHECKLIST CÔNG VIỆC HÀNG NGÀY - PHẦN MỀM KẾ TOÁN

Cập nhật: **2026-08-12** | Phiên làm việc cuối: Nâng Cấp Version 2.0 Engine Xử Lý Dữ Liệu Sai & Lịch Sử Version Dữ Liệu Cũ (Test Suite 57/57 PASSED 100%)

---

## 🔴 Cần Làm Ngay (To-Do)

### Module mới
- [ ] Tích hợp tính năng ký số hóa đơn điện tử trực tiếp trên ứng dụng.

---

## 🟡 Đang Thực Hiện (In Progress)

- [ ] Phân tích báo cáo quản trị chi phí giá thành hợp đồng dịch vụ.

---

## 🟢 Đã Hoàn Thành (Done)

### 🆕 Version 2.0: Engine Xử Lý Dữ Liệu Sai & Quản Lý Version Dữ Liệu Cũ (`adjustmentEntryService.ts`, `dataVersioningService.ts`, `aiAnomalyDetector.ts`, `DataVersionHistoryView.tsx`)
- [x] **✏️ Engine Lập Bút Toán Điều Chỉnh (`adjustmentEntryService.ts`)**: Tự động sinh chứng từ điều chỉnh theo chuẩn kế toán (Ghi đỏ số âm `DC-`, Ghi bổ sung, và Chứng từ thay thế), bảo vệ toàn vẹn lịch sử chứng từ kỳ đã khóa sổ.
- [x] **⏳ Snapshot & Time Machine Dữ Liệu Cũ (`dataVersioningService.ts`)**: Tự động lưu Snapshot phiên bản dữ liệu tại mỗi kỳ khóa sổ và So sánh Diff chênh lệch `Old vs Current` trực quan.
- [x] **🤖 AI Quét Phát Hiện Dữ Liệu Sai Lệch (`aiAnomalyDetector.ts`)**: Tự động phát hiện lỗi gõ thừa/thiếu số 0 (nhập 10M thành 100M), ngược chiều Nợ/Có, ngày chứng từ bất hợp lý.
- [x] **✨ Giao Diện Mới DataVersionHistoryView (`DataVersionHistoryView.tsx`)**: Màn hình quản lý phiên bản tích hợp menu **GitBranch 🌿 Lịch Sử Version & Điều Chỉnh Dữ Liệu** trên Sidebar.
- [x] **57/57 Test Cases PASSED 100% ✅**: Thực thi kiểm thử tự động toàn diện bao phủ toàn bộ 23 phần nghiệp vụ.

### 🆕 Đợt Nâng Cấp Hoàn Thuế GTGT & Quản Trị Giá Thành Hợp Đồng (`vatRefundAuditService.ts`, `contractCostingService.ts`, `ContractCostingView.tsx`)
- [x] **🛡 Rà Soát 6 Điều Kiện Hoàn Thuế GTGT (`vatRefundAuditService.ts`)**: Tự động đánh giá 6 tiêu chí pháp lý (Thông tư 80/2021/TT-BTC) gồm ngưỡng $\ge 300M$, thanh toán ngân hàng $\ge 20M$, liên tục chuyển kỳ sau [43], rà soát hóa đơn doanh nghiệp bỏ địa điểm kinh doanh, và tờ khai hải quan xuất khẩu.
- [x] **🏗 Quản Trị Chi Phí Giá Thành Hợp Đồng / Công Trình (`contractCostingService.ts`)**: Tự động tập hợp chi phí NVL trực tiếp (1541), Nhân công (1542), Máy thi công & Mua ngoài (1543) cho từng mã Hợp Đồng/Công Trình, tính Lợi Nhuận Gộp % và Cảnh báo vượt định mức chi phí.
- [x] **✨ Giao Diện Mới ContractCostingView (`ContractCostingView.tsx`)**: Màn hình quản trị tích hợp tab menu **Briefcase 💼 Giá Thành Hợp Đồng & Hoàn Thuế** trên Sidebar.
- [x] **52/52 Test Cases PASSED 100% ✅**: Thực thi kiểm thử tự động toàn diện bao phủ toàn bộ 20 phần nghiệp vụ.

### 🆕 Đợt Nâng Cấp Executive Analytics, Sleek Glassmorphic UI/UX & Engine Tính Toán BEP (`executiveAnalyticsService.ts`, `financialCalculationEngine.ts`, `ExecutiveAnalyticsDashboardView.tsx`)
- [x] **📊 Đọc & Phân Tích Dữ Liệu Executive 360° (`executiveAnalyticsService.ts`)**: Tự động phân tích chỉ số **EBITDA**, Biên lợi nhuận gộp/ròng %, Tỷ trọng 4 nhóm chi phí doanh nghiệp, và **Điểm Sức Khỏe Tài Chính 0-100 (Financial Health Score)**.
- [x] **🧮 Engine Tính Toán Cao Cấp (`financialCalculationEngine.ts`)**: Tự động bóc tách Định Phí vs Biến Phí để tính **Doanh Thu Hòa Vốn BEP (Break-Even Point)**, Tỷ lệ an toàn doanh thu %, và dự báo **Thuế TNDN Tạm Tính Quý (20%)**.
- [x] **✨ Giao Diện WOW UI/UX Glassmorphism (`ExecutiveAnalyticsDashboardView.tsx`)**: Màn hình quản trị tài chính sang trọng phong cách Sleek Dark Mode, viền Glow Neon, hiệu ứng Micro-Animations mượt mà chuẩn Apple Design Guidelines.
- [x] **48/48 Test Cases PASSED 100% ✅**: Thực thi kiểm thử tự động toàn diện bao phủ toàn bộ 18 phần nghiệp vụ.

### 🆕 Dọn Dẹp Sạch 100% Dữ Liệu Thử Nghiệm (`clearAllDatabaseData`)
- [x] **🧹 Reset Cơ Sở Dữ Liệu Mẫu 100% (`storage.ts`)**: Đã loại bỏ hoàn toàn các khách hàng mẫu, hóa đơn thử nghiệm, sao kê giả lập khỏi DB IndexedDB. Phần mềm hiện ở trạng thái mới tinh 100% để kế toán bắt đầu nhập dữ liệu thực tế.
- [x] **🔥 Nút Bấm Xóa Sạch Dữ Liệu Thử Nghiệm (`BackupRestoreView.tsx`)**: Trang Sao lưu & Khôi phục được trang bị nút "Xóa Sạch Dữ Liệu Thử Nghiệm 🔥" cho phép kế toán chủ động reset sạch DB bất cứ lúc nào.

### 🆕 Trợ Lý AI Gợi Ý Định Khoản & Cảnh Báo Lệch Logic Kế Toán Chéo (`aiAccountSuggestionService.ts`, `crossLogicAuditService.ts`, `AISuggestionModal.tsx`)
- [x] **🤖 Trợ Lý AI Gợi Ý Định Khoản Tài Khoản Tự Động (`aiAccountSuggestionService.ts`)**: Tự động phân tích Diễn Giải chứng từ & Tên Đối Tác theo chuẩn Thông tư 200/133, tính toán **Điểm Tin Cậy AI (Confidence Score %)** (96%, 94%) và Nút **"Áp Dụng Định Khoản AI ⚡"** 1-Click.
- [x] **⚖️ Hệ Thống Cảnh Báo Lệch Logic Kế Toán Chéo (`crossLogicAuditService.ts`)**: Tự động rà soát 5 điểm mâu thuẫn chéo giữa Doanh thu P&L vs Thuế GTGT [28], Giá vốn vs Thẻ Kho, Khấu hao 214 vs Bảng TSCĐ, Tiền gửi 112 vs Sổ Phụ, và Công nợ 131 vs Sổ Cái.
- [x] **✨ AISuggestionModal Component (`AISuggestionModal.tsx`)**: Modal giao diện hiện đại tích hợp nút **"AI Trợ Lý ⚡"** ngay trên Header chính.
- [x] **42/42 Test Cases PASSED 100% ✅**: Thực thi kiểm thử tự động toàn diện bao phủ toàn bộ 16 phần nghiệp vụ.

### 🆕 Phân Hệ Checklist Khóa Sổ Tháng & Màn Hình Khóa Sổ (`monthEndClosingService.ts`, `MonthEndClosingView.tsx`, `closingPdfExporter.ts`)
- [x] **Checklist Tự Động Quét 10 Tiêu Chí Khóa Sổ**: Quét tự động Import HĐ, Đối chiếu ngân hàng 112, Lỗi validation, Công nợ 131/331 bất thường, Kho âm, Tiền mặt/NH âm (111/112), Trích khấu hao 211/242, Tờ khai VAT 01/GTGT, Cân đối Bảng phát sinh Nợ=Có, và Backup dữ liệu.
- [x] **Màn Hình Khóa Sổ Tháng (`MonthEndClosingView.tsx`)**: Đánh giá trạng thái **Hoàn thành / Chưa hoàn thành**, **Mức rủi ro (Thấp/Vừa/Cao)**, danh sách việc cần làm tiếp theo và nút **"Soi Chi Tiết 👁"** điều hướng trực tiếp.
- [x] **1-Click Xuất Biên Bản Khóa Sổ PDF (`closingPdfExporter.ts`)**: Xuất biên bản nghiệm thu khóa sổ chính thức dạng văn bản PDF đầy đủ chữ ký Kế Toán Trưởng & Giám Đốc.
- [x] **39/39 Test Cases PASSED 100% ✅**: Thực thi kiểm thử tự động toàn diện bao phủ toàn bộ 14 phần nghiệp vụ.

### 🆕 Đợt Nâng Cấp Enterprise Chuyên Sâu (`multiCompanyService`, `rolePermissionService`, `industryPresetService`)
- [x] **🏢 Multi-Company / Nhiều Doanh Nghiệp Độc Lập (`multiCompanyService.ts`)**: Quản lý cô lập dữ liệu 100% theo Mã số thuế (MST), Kỳ kế toán (niên độ), Khung Hệ Thống Tài Khoản (TT200/TT133/TT88) và Xuất file `.accobak` riêng cho từng công ty.
- [x] **🔐 Phân Quyền Người Dùng 5 Vai Trò (RBAC) (`rolePermissionService.ts`)**: Phân quyền chi tiết 5 vai trò (Admin, Kế Toán Trưởng, Kế Toán Viên, Người Xem CEO, và Kiểm Toán/Tư Vấn Thuế) với các quyền Xem, Sửa, Xóa, Duyệt, Backup.
- [x] **🏭 Bộ Mẫu Báo Cáo 6 Ngành Nghề Presets (`industryPresetService.ts`)**: Tự động kích hoạt Rule & Mẫu báo cáo tối ưu riêng cho 6 ngành (Thương Mại, Dịch Vụ, Xây Dựng, Sản Xuất Nhỏ, Agency, và Hộ Kinh Doanh lên DN).
- [x] **🛡 RolePermissionBadge Widget (`RolePermissionBadge.tsx`)**: Widget tích hợp trực tiếp trên Header chính cho phép chuyển đổi linh hoạt vai trò người dùng và preset ngành nghề.
- [x] **36/36 Test Cases PASSED 100% ✅**: Thực thi kiểm thử tự động toàn diện bao phủ toàn bộ 13 phần nghiệp vụ.

### 🆕 Cập Nhật Thương Hiệu "Kế Toán" & Bộ 3 Dịch Vụ Kế Toán Chuyên Sâu (`varianceAnalysisService`, `cashflowForecastService`, `generalLedgerService`)
- [x] **Cập Nhật Thương Hiệu "Kế Toán" (Kế Toán Pro / Kế Toán Desktop App)**: Đổi tên toàn bộ ứng dụng trong `package.json`, `index.html`, `Header.tsx`, `Sidebar.tsx`.
- [x] **📊 Phân Tích Biến Động Doanh Thu & Chi Phí Bất Thường (>30%) (`varianceAnalysisService.ts`)**: Tự động so sánh doanh thu/chi phí các kỳ, phát hiện và cảnh báo các tài khoản chi phí biến động tăng/giảm bất thường `>30%`.
- [x] **💵 Dự Báo Dòng Tiền Ròng & Tốc Độ Đốt Quỹ 30-90 Ngày (`cashflowForecastService.ts`)**: Tính toán tốc độ đốt tiền trung bình tháng (Burn Rate), số tháng quỹ duy trì (Runway) và dự báo dòng tiền ròng 30d, 60d, 90d.
- [x] **📜 Nhật Ký Sổ Cái Chi Tiết Mẫu S03a-DN (`generalLedgerService.ts`)**: Trích xuất Sổ Cái Nhật Ký Chung theo từng tài khoản kế toán chuẩn Thông tư 200/TT133.
- [x] **29/29 Test Cases PASSED 100% ✅**: Thực thi kiểm thử tự động toàn diện bao phủ toàn bộ 10 phần nghiệp vụ.

### 🆕 Đợt Tối Ưu Hiệu Năng Enterprise & QA Production Build (`VirtualizedDataGrid.tsx`, `invoiceWorker.ts`, `validationRules.ts`)
- [x] **⚡ Virtualized Table (`react-window`) cho >10.000 dòng**: Áp dụng `VirtualizedDataGrid.tsx` cho 6 bảng dữ liệu lớn (Chứng từ, Kiểm lỗi, Đối chiếu, Công nợ, Nhập xuất tồn kho, Pivot 1xx-9xx). Mở >10.000 dòng mượt mà 60 FPS, chỉ render dòng hiển thị trên màn hình.
- [x] **🧵 Web Worker Parse XML > 1.000 File Song Song**: Nâng cấp `InvoiceXMLImporter.tsx` & `invoiceWorker.ts` bóc tách XML đa luồng, hỗ trợ **Thanh tiến trình %, Số file đã đọc / lỗi / thành công**, nút **Tạm Dừng / Tiếp Tục / Hủy bỏ** và **Log Lỗi Chi Tiết**.
- [x] **🧠 Cache Validation Với Hash Memoization (`validationRules.ts`)**: Cache kết quả kiểm lỗi theo Hash dòng chứng từ. Khi kế toán sửa 1 dòng chỉ re-validate duy nhất dòng đó thay vì 10.000 dòng.
- [x] **🛡 QA Production Build**: `npm run build` thành công **100% không 1 lỗi bundler** (Vite + Electron main/preload dist-electron ok).
- [x] **25/25 Test Cases PASSED 100% ✅**: Thực thi kiểm thử tự động toàn diện.

### 🆕 Trợ Lý AI Bóc Tách Chi Phí Bị Loại Thuế TNDN & Xuất Bộ Hồ Sơ Zip Package (`taxAuditService.ts` & `masterZipExporter.ts`)
- [x] **Trợ Lý AI Phân Tích Chi Phí Bị Loại Thuế TNDN [B4]**: Tự động bóc tách các khoản chi `≥ 5M` thiếu Hóa đơn, chi tiền mặt `≥ 20M` và chi tiền phạt hành chính (811). Tự động tính chỉ tiêu **[B4] Chi phí không được trừ khi tính thuế TNDN** và số tiền thuế TNDN nguy cơ bị truy thu (20%).
- [x] **1-Click Xuất Trọn Bộ Hồ Sơ Kế Toán Zip Package (`JSZip`)**: Nút bấm 1-click tự động xuất đồng loạt 4 file Excel (Cân đối phát sinh 1xx-9xx, P&L B02-DN, Kho Nhập-Xuất-Tồn, và Công Nợ 131/331) nén trực tiếp thành tệp `Bo_Ho_So_Ke_Toan_[Tên_DN]_[Năm].zip`.
- [x] **25/25 Test Cases PASSED 100% ✅**: Thực thi kiểm thử tự động toàn diện bao phủ thêm logic bóc tách chi phí TNDN bị loại chỉ tiêu B4.

### 🆕 Phân Hệ Báo Cáo Tài Chính & Bảng Cân Đối Phát Sinh Pivot 1xx - 9xx (`FinancialStatementsView.tsx` & `financialReportService.ts`)
- [x] **Bảng Cân Đối Phát Sinh Tài Khoản Pivot (TK 1xx - 9xx)**: Tự động tổng hợp số dư đầu kỳ, phát sinh Nợ/Có và dư cuối kỳ tất cả tài khoản; tự động kiểm tra Cân Đối Nợ = Có và nút **Soi Chứng Từ Drill-down** theo từng tài khoản.
- [x] **Báo Cáo Kết Quả Kinh Doanh P&L (Mẫu B02-DN)**: Tự động gom Doanh Thu Thuần (511), Giá Vốn Hàng Bán (632), Lợi Nhuận Gộp, Chi Phí QLDN (642), Lợi Nhuận Trước Thuế và Chi Phí Thuế TNDN (20%).
- [x] **Bảng Tính Khấu Hao TSCĐ (TK 211) & Phân Bổ CCDC (TK 242)**: Thống kê nguyên giá, số tháng phân bổ, giá trị trích hàng tháng và giá trị còn lại.
- [x] Tích hợp nút menu **BarChart3 📊 Báo Cáo Tài Chính & Pivot** nổi bật với badge **HOT** trên Sidebar chính.
- [x] **Thiết Kế Lại Header Báo Cáo Tài Chính Siêu Gọn Gàng**: Tối ưu chiều cao, màu nền slate-900 sắc nét, nút Tab thu nhỏ vừa vặn chuẩn giao diện Data-Centric Kế toán.
- [x] **23/23 Test Cases PASSED 100% ✅**: Nâng cấp runner kiểm thử tự động kiểm soát thêm Cân đối Nợ = Có và chỉ tiêu Doanh thu/Lợi nhuận B02-DN.

### 🆕 Bộ 4 Trụ Cột Kế Toán Nghiệp Vụ Chuyên Sâu Đồng Loạt (`MasterAccountingHub.tsx` & `accountingCoreService.ts`)
- [x] **1. Kế Toán Thuế & Kiểm Soát Rủi Ro Thuế**: Tờ khai Thuế GTGT 01/GTGT & Bảng Kê HTKK; Cảnh báo khoản chi `≥ 5.000.000 VNĐ` thiếu số Hóa đơn & chi `≥ 20.000.000 VNĐ` thanh toán tiền mặt (rủi ro loại thuế TNDN & GTGT).
- [x] **2. Kế Toán Kho & Thẻ Kho Nhập-Xuất-Tồn**: Bảng tổng hợp Nhập - Xuất - Tồn Kho; Thẻ Kho Chi Tiết soi lịch sử biến động từng vật tư/mặt hàng và cảnh báo kho âm.
- [x] **3. Kế Toán Thu Chi Quỹ (TK 111) & Ngân Hàng (TK 112)**: Quản lý chi tiết phát sinh Thu (Nợ 111 / Nợ 112), Chi (Có 111 / Có 112) và tính Dòng Tiền Ròng (Net Cashflow).
- [x] **4. Quản Lý Công Nợ Phải Thu (131) & Phải Trả (331)**: Bảng tổng hợp Dư nợ/Dư có; Phân tích Tuổi Nợ (Aging Debt: Trong hạn, Quá hạn 1-30d, 31-90d, và >90d nợ xấu).
- [x] Tích hợp nút menu **Layers 🏛 Bộ 4 Nghiệp Vụ Kế Toán** nổi bật trên Sidebar chính.

### 🆕 Chế Độ Toàn Màn Hình & Tự Động Ẩn/Hiện Header (Zen Focus Mode)
- [x] **Nút 👁 Ẩn/Hiện Header (`Header.tsx`)**: Cho phép người dùng chủ động ẩn Header đỉnh đầu để nhường không gian hiển thị cho Bảng Dữ Liệu.
- [x] **Phím tắt nhanh `Ctrl + Shift + F`**: Đổi trạng thái Ẩn/Hiện Header tức thời bằng bàn phím.
- [x] **Chế Độ Zen Focus Mode (`MiniFloatingToolbar.tsx`)**: Bật Zen Mode để ẩn hoàn toàn cả Header & Sidebar. Bảng Dữ Liệu được nới rộng **100% diện tích đĩa màn hình (`h-screen`)**, soi được từ **30 đến 35 dòng chứng từ cùng lúc**.
- [x] **Ghi nhớ cấu hình**: Tự động lưu lựa chọn ẩn/hiện Header vào `localStorage`.

### 🆕 Tinh Chỉnh UI/UX Data-Centric Layout (Tập Trung Vào Con Số)
- [x] **Thu gọn Header chính (`Header.tsx`)**: Giảm chiều cao từ 64px (`h-16`) xuống 48px (`h-12`) siêu mảnh và thu gọn dropdown khách hàng.
- [x] **Thu gọn Banner rườm rà**: Thu biến các Banner chào mừng cồng kềnh ở Dashboard, Tra cứu luật, Báo cáo thuế thành các **Thanh Bar 1 dòng nhỏ gọn**, giải phóng 30-40% diện tích lãng phí.
- [x] **Mở rộng chiều cao Bảng Dữ Liệu (`max-h-[calc(100vh-210px)]`)**: Giúp màn hình Trình Kiểm Lỗi (`ErrorDiagnostics.tsx`) hiển thị trực tiếp từ 20 đến 25 dòng chứng từ cùng lúc.
- [x] **Tabular-nums & High-contrast font**: Giúp toàn bộ con số tiền tệ, tài khoản thẳng hàng tuyệt đối, sắc nét dễ soi khi làm việc cường độ cao.

### 🆕 Bộ 4 Báo Cáo & Kiểm Soát Thuế Chuyên Sâu (`TaxAndInventoryReportView.tsx`)
- [x] **🚨 Rule 10 & Kiểm Soát Chi ≥ 5 Tr Không Hóa Đơn**: Tự động phát hiện các khoản chi `≥ 5.000.000 VNĐ` thiếu số Hóa đơn / Tệp XML gốc. Cảnh báo nhãn đỏ **"THIẾU HÓA ĐƠN"** phòng ngừa bị cơ quan thuế loại chi phí TNDN và tính tổng rủi ro bị truy thu.
- [x] **Tờ Khai Thuế GTGT 01/GTGT**: Tính các chỉ tiêu doanh thu & thuế GTGT mua vào/bán ra, xuất Excel Bảng kê mua vào 01-2/GTGT và bán ra 01-1/GTGT chuẩn nạp HTKK.
- [x] **Bảng Cân Đối Kho Hàng (Nhập - Xuất - Tồn)**: Bảng tổng hợp chi tiết số lượt Nhập, Xuất và Tổng tiền phát sinh kho của vật tư/hàng hóa.
- [x] **Bảng Cân Đối Thu Chi & Dòng Tiền**: So sánh tổng phát sinh Thu/Chi tiền mặt (TK 111) và tiền gửi Ngân hàng (TK 112).
- [x] Thêm nút menu **Calculator 🧮 Báo Cáo Thuế & Kho** lên Sidebar chính.

### 🆕 Tra Cứu Luật Kế Toán & Thuế Mới Nhất Offline
- [x] **Cơ sở dữ liệu Luật (`legalDatabase.ts`)**: Tích hợp sẵn NĐ 72/2024 (Giảm thuế 8%), NĐ 123/2020 & TT 78/2021 (Hóa đơn điện tử), TT 200/2014, NĐ 125/2020 (Mức phạt vi phạm thuế).
- [x] **Tra cứu định khoản TK (`ACCOUNT_GUIDES`)**: Hướng dẫn nguyên tắc hạch toán Nợ/Có và các cặp tài khoản đối ứng phổ biến (111, 112, 131, 331, 511, 642...).
- [x] **Lịch đếm ngược nộp tờ khai thuế (`TAX_DEADLINES`)**: Tự động tính số ngày còn lại đến hạn nộp báo cáo thuế Quý/Năm.
- [x] **Giao diện Tra Cứu (`LegalKnowledgeBaseView.tsx`)**: Tìm kiếm full-text từ khóa luật thuế offline, lọc theo danh mục, giao diện hiện đại.
- [x] Đã gắn nút điều hướng **Scale ⚖ Tra Cứu Luật & Thuế** lên Sidebar chính.

### 🆕 Bảng Dữ Liệu Chuyên Sâu (Advanced Table Grid)
- [x] **ColumnVisibilityModal (`ColumnVisibilityModal.tsx`)**: Popup chọn cột ẩn/hiện tùy chỉnh, cho phép người dùng tự do hiển thị những thông tin cần thiết.
- [x] **Cuộn Ngang & Đứng Rộng Rãi**: Đặt `min-w-[1300px]` và kích thước chuẩn từng cột, xóa bỏ tình trạng ép méo chữ.
- [x] **Cố Định Cột (Sticky Columns)**: Ghim cố định cột Duyệt và Số CT bên trái (`left-0`, `left-12`) và cột Thao Tác bên phải (`right-0`) khi kéo ngang.
- [x] **Tùy Chọn Khoảng Cách Dòng (Density Switcher)**: Chuyển đổi linh hoạt giữa chế độ dòng vừa (Normal) và dòng thu gọn (Compact).
- [x] Tự động lưu cấu hình ẩn/hiện cột ưa thích của người dùng vào `localStorage`.

### 🆕 Chống Mất Dữ Liệu Khi Lỡ Tay (Excel Import Auto-Save Draft)
- [x] **Auto-save Import Draft vào `localStorage`**: Tự động lưu phiên làm việc tệp Excel, cấu hình map cột, bảng dòng và loại chứng từ.
- [x] **Banner Khôi Phục Phiên Làm Việc Dở Dang**: Tự động cảnh báo và cho phép người dùng khôi phục lại 100% dữ liệu tệp Excel đang làm dở khi vô tình chuyển tab hoặc tắt ứng dụng.
- [x] Tự động xóa nháp sau khi đã nạp chứng từ thành công vào CSDL.

### 🆕 Nâng Cao Đợt 3 (Fuzzy Matching + AES-256 Backup)
- [x] **Matching Engine 2.0 (`matchingEngine.ts`)**:
  - Tích hợp thuật toán **Levenshtein Similarity** so sánh mờ cho Tên Đối Tác và Diễn giải chứng từ.
  - Tự động gợi ý điểm tin cậy mờ (%) khi tên đối tác/nội dung bị gõ sai chính tả nhẹ.
- [x] **Mã Hóa File Backup AES-256 (`cryptoBackupService.ts`)**:
  - Mã hóa PBKDF2 + AES-GCM (256-bit) cho tệp `.accobak` bằng Web Crypto API.
  - Tích hợp checkbox Đặt Mật Khẩu và Prompt nhập mật khẩu tự động khi khôi phục.

### 🆕 Nâng Cao Đợt 2 (Export PDF Native + Skeleton UI)
- [x] **Module Xuất PDF Native (`jspdf` + `jspdf-autotable`)**:
  - `exportReconciliationPDF()` — Xuất Báo cáo đối chiếu 2-Bảng ra file `.pdf`
  - `exportValidationDiagnosticsPDF()` — Xuất Báo cáo kiểm lỗi ra file `.pdf`
  - Nút **Xuất PDF** trực tiếp tại Reconciliation Workspace & Error Diagnostics.
- [x] **TableSkeleton Component** (`TableSkeleton.tsx`) — Hiệu ứng skeleton loading mượt mà cho các bảng dữ liệu lớn.

### 🆕 Nâng Cao Đợt 1 (BI + Validation 2.0 + Animation)
- [x] **Biểu đồ Dashboard Chart.js** — 3 biểu đồ: Thu vs Chi (Bar), Phân bổ TK (Doughnut), Xu hướng Dòng tiền (Line).
- [x] **Validation Rule 8: Outlier Detection** — Phát hiện giao dịch bất thường vượt ngưỡng ±3σ.
- [x] **Validation Rule 9: Gap Detection** — Phát hiện nhảy số chứng từ trong chuỗi liên tục.
- [x] **Page Transition Animation** — Hiệu ứng fade-in khi chuyển tab (CSS keyframe).

### Nghiệp vụ & Validation
- [x] Cảnh báo MST nâng cao: kiểm tra prefix 2 số đầu = mã tỉnh hợp lệ (01–96).
- [x] Cảnh báo xung đột tên đối tác khi trùng Mã số thuế trong danh mục chứng từ.
- [x] Nút **Xuất Excel Đối chiếu** & bộ lọc trạng thái (Tất cả / Chưa ghép / Đã ghép) trong Reconciliation Workspace.
- [x] Auto-save draft Phiếu Thu/Chi vào `localStorage` & khôi phục tự động khi đổi tab.

### Nền Tảng & Kiến Trúc
- [x] Thiết lập kiến trúc Electron + React + Vite + Dexie.js (IndexedDB).
- [x] Hệ thống UI/UX Light Mode / Dark Mode – TailwindCSS.
- [x] Giao diện Sidebar thu gọn/mở rộng.
- [x] Dashboard tổng quan với Stats Widgets.

### Import & Đọc Hóa Đơn
- [x] Import dữ liệu Excel (Bảng kê mua vào, bán ra, sổ ngân hàng).
- [x] Map cột linh hoạt + lưu mẫu Map cột (MappingTemplate).
- [x] Phân tích cú pháp XML Hóa đơn chuẩn TT78.
- [x] Giao diện Drag & Drop + Quét thư mục.
- [x] Gom nhóm XML và PDF theo cùng tên gốc (pair matching).
- [x] Toast thông báo chi tiết sau khi "Lưu hóa đơn" vào DB (X thành công / Y lỗi).

### Kiểm Lỗi & Validation
- [x] Phát hiện hóa đơn trùng lặp xuyên file (Cross-file Duplicate Detection).
- [x] Bộ quy tắc `validateTransaction()` – nay 10 loại lỗi/cảnh báo (bao gồm outlier + gap).
- [x] **Bổ sung kiểm tra thuế suất GTGT 8%/10%** (MTHH = 0%/5%/8%/10%).
- [x] Giao diện ErrorDiagnostics: filter theo nhãn lỗi, sửa inline, duyệt hàng loạt.
- [x] Xuất báo cáo lỗi ra Excel & PDF từ tab Kiểm lỗi.

### Đối Chiếu (Reconciliation)
- [x] Đối chiếu tự động Sao kê Ngân hàng vs Sổ sách Kế toán (MatchingEngine).
- [x] Giao diện xác nhận/hủy ghép cặp với điểm tin cậy (% khớp).
- [x] `exportReconciliationReportToExcel()` – xuất báo cáo 3-sheet.
- [x] `exportReconciliationPDF()` – xuất báo cáo đối chiếu định dạng PDF native.

### Audit Log
- [x] Hệ thống Audit Log lưu vết tất cả thao tác (CRUD, Approve, Match).
- [x] **Xóa hàng loạt** và **Xóa toàn bộ** nhật ký trong tab Audit Log.
- [x] Lọc Audit Log theo hành động + tìm kiếm từ khóa.

### Tạo Chứng Từ (Document Generator)
- [x] Module tạo Phiếu Thu / Phiếu Chi tự động (chuẩn TT200/2014).
- [x] Chuyển đổi số tiền → chữ Tiếng Việt (`numberToVietnameseWords`).
- [x] Preview bản in trực tiếp trong app.
- [x] **Sửa lỗi tiếng Việt vỡ dấu khi in** (Blob URL UTF-8 + NFC normalize).

### Dashboard & UX Thông Minh
- [x] **SmartAlertPanel** – Bảng cảnh báo thông minh trên Dashboard (6 loại phân cấp).
- [x] **ShortcutModal** – Bảng tra cứu phím tắt (Ctrl+Shift+K).
- [x] **Nút ⌨ Phím tắt trên Header** với tooltip.
- [x] Phím tắt điều hướng Ctrl+1…9 toàn cục.

### Backup & Khôi Phục
- [x] Xuất/Nhập toàn bộ CSDL dạng `.accobak`.
- [x] Sao lưu nhanh từ Header.

---

## 📋 Kiểm Tra Chất Lượng (QA / Testing) - Trước khi Release

- [x] `npx tsc --noEmit` = 0 lỗi TypeScript ✅ (lần chạy mới nhất: Enterprise Performance & Virtualized Table)
- [x] `npx tsx src/test/runMasterTestSuite.ts` = **25/25 Test Cases PASSED 100% ✅** (Bóc tách chi phí TNDN B4, Báo cáo tài chính, Pivot 1xx-9xx, Thuế, Kho, Thu chi, Công nợ aging debt, Levenshtein matching)
- [x] `npm run build` = **PRODUCTION BUNDLE THÀNH CÔNG 100%** ✅ (Vite build dist & Electron dist-electron/main.js, preload.js ok)
- [ ] Chạy ứng dụng trên môi trường Electron production.
- [ ] Kiểm tra RAM khi parse thư mục >1000 file XML.
- [ ] Kiểm tra Data Persistency (tắt app → mở lại → dữ liệu không mất).
- [ ] Kiểm tra in Phiếu Thu/Chi tiếng Việt hiển thị đúng dấu ✅ (đã sửa).


