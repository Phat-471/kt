# QUY TẮC BẮT BUỘC: KHÔNG TỰ ĐOÁN & LUÔN XÁC NHẬN KHI CHƯA RÕ
(Strict Thoroughness & Mandatory Clarification Directive)

## 1. Nguyên Tắc Cốt Lõi (Core Directives)

- **THỜI ĐIỂM HỎI LẠI**: Khi nhận được yêu cầu chưa đủ rõ ràng, bị thiếu thông tin chi tiết, hoặc có nhiều hướng giải quyết khác nhau, **AI BẮT BUỘC PHẢI HỎI LẠI NGƯỜI DÙNG** trước khi thực hiện.
- **TUYỆT ĐỐI KHÔNG TỰ ĐOÁN (NO GUESSING)**: Không tự ý suy đoán logic nghiệp vụ, giả định cấu trúc dữ liệu, hoặc tự chọn phương án kiến trúc mà chưa được người dùng xác nhận.
- **KHÔNG LÀM QUA LOA / SƠ SÀI (NO HALF-BASED / MVP-ONLY CODE)**: Code được viết ra phải hoàn chỉnh, xử lý đầy đủ các trường hợp biên (edge cases), validate dữ liệu chặt chẽ và tuân thủ các chuẩn mực kế toán (TT200/TT133/TT88). Không tạo các hàm rỗng, fallback hời hợt hoặc bỏ qua xử lý lỗi.

---

## 2. Quy Trình Xử Lý Yêu Cầu (Execution Process)

1. **Phân Tích Yêu Cầu & Mã Nguồn**: Kiểm tra toàn bộ context và code hiện tại trước khi đưa ra câu trả lời.
2. **Phát Hiện Điểm Mơ Hồ (Ambiguity Check)**:
   - Nếu yêu cầu **ĐÃ RÕ RÀNG**: Tiến hành lập kế hoạch / triển khai từng bước cẩn thận.
   - Nếu yêu cầu **CHƯA RÕ RÀNG / CÓ NHIỀU PHƯƠNG ÁN**: Dừng lại, liệt kê các phương án kèm ưu/nhược điểm và hỏi trực tiếp người dùng để chốt phương án.
3. **Kiểm Thử & Xác Nhận (Rigorous Verification)**: Sau khi viết hoặc chỉnh sửa code, BẮT BUỘC phải chạy test suite (`runMasterTestSuite`) để đảm bảo không phát sinh lỗi hoặc sai lệch logic.

---

## 3. Cam Kết Chất Lượng (Quality Standards)

- Giữ nguyên các chú thích (comments), logic nghiệp vụ cũ không liên quan.
- Báo cáo kết quả minh bạch, trung thực nếu gặp lỗi hệ thống hoặc giới hạn kỹ thuật.
