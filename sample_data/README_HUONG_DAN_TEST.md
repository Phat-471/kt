# BỘ DỮ LIỆU MẪU KIỂM THỬ TOÀN DIỆN ACCODESK ULTRA PRO

Thư mục này chứa đầy đủ các file dữ liệu chuẩn để kiểm thử 100% tính năng của hệ thống.

---

## 📂 Danh Sách Các Tệp Mẫu:

### 1. `01_So_Nhat_Ky_Chung_2026.xlsx` (Sổ Kế Toán & Thuế)
- **Tính năng dùng để test**:
  - **Menu 2: Import & Ánh Xạ Excel**: Nạp tệp Excel này vào phần mềm.
  - **Menu 1: Báo Cáo Tài Chính (B01, B02, B03, B09)** & Cân Đối Phát Sinh Pivot.
  - **Menu 3: Bộ 4 Sổ Nhật Ký Đặc Biệt (TT200)**: Xem tự động phân loại Mua hàng (S04a), Bán hàng (S04b), Thu tiền (S04c), Chi tiền (S04d).
  - **Menu 3: Giá Thành Hợp Đồng**: Tập hợp chi phí HĐ01 (1541, 1542, 1543).
  - **Menu 5: Kiểm Lỗi Dữ Liệu**: Phát hiện tự động khoản chi thiếu hóa đơn, chi tiền mặt $\ge 20M$, đối tác rủi ro `0109999888`.
  - **Menu 3: Khai Thuế eTax 01/TNDN**: Bấm **"Chi tiết & Sửa [B4]"** để sửa và cập nhật tờ khai.

---

### 2. `02_Sao_Ke_Ngan_Hang_VCB_Q3_2026.xlsx` (Sao Kê Ngân Hàng)
- **Tính năng dùng để test**:
  - **Menu 2: Import & Ánh Xạ Excel** (chọn loại tệp: Sao kê ngân hàng).
  - **Menu 5: So Sánh & Đối Chiếu Ngân Hàng (Reconciliation)**:
    - Kiểm tra tính năng **Tự động ghép cặp (Auto-Match)**: Khớp tự động khoản 49.5M (Xi măng Hà Tiên) và 91.8M (Phúc Thịnh).
    - Phát hiện giao dịch phí ngân hàng 55.000 đ chưa hạch toán trên sổ sách.

---

### 3. `03_Bang_Ke_Mua_Vao_Ban_Ra.xlsx` (Bảng Kê Hóa Đơn GTGT)
- **Tính năng dùng để test**:
  - **Menu 3: Khai Thuế eTax (Tab 01/GTGT)**: Đối chiếu bảng kê mua vào (PL01-2) và bán ra (PL01-1).
  - Xuất tờ khai XML và Excel nộp Cổng Thuế eTax / HTKK.

---

### 4. `04_Hoa_Don_Dien_Tu_XML_TT78/` (Hóa Đơn XML Thông Tư 78)
- **Tính năng dùng để test**:
  - **Menu 2: Đọc Hóa Đơn XML (TT78)**: Kéo thả các file XML vào để hệ thống:
    - Bóc tách tự động: Mã hóa đơn, người bán, người mua, danh mục hàng hóa, thuế suất.
    - Kiểm tra chữ ký số điện tử `<ds:Signature>`.
    - Tự động sinh bút toán định khoản Nợ/Có.

---

### 5. `05_AccoDesk_MasterBackup_FullData.accobak` (Tệp Sao Lưu Toàn Diện)
- **Tính năng dùng để test**:
  - **Menu 6: Sao Lưu & Khôi Phục**: Bấm "Chọn Tệp Sao Lưu Để Phục Hồi" -> Nạp tệp này để lập tức có sẵn 3 công ty mẫu (An Phát, Sao Việt, Phúc Lộc) cùng toàn bộ chứng từ sẵn sàng sử dụng.
