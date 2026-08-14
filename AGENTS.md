# AGENTS.md — Quy Tắc Dự Án Kế Toán AccoDesk Ultra Pro

## ⚠️ QUY TẮC TỐI CAO: KHÔNG TỰ ĐOÁN & KHÔNG LÀM QUA LOA

1. **HỎI LẠI KHI CHƯA RÕ**: Nếu yêu cầu của người dùng chưa đủ thông tin, còn mơ hồ, hoặc có nhiều hướng triển khai, AI **phải luôn hỏi lại người dùng** để làm rõ trước khi viết code.
2. **KHÔNG TỰ ĐOÁN (NO GUESSING)**: Không bao giờ tự suy đoán logic kế toán, tên trường dữ liệu, hoặc giả định luồng nghiệp vụ khi chưa xác minh từ mã nguồn hoặc người dùng.
3. **LÀM TỈ MỈ & TRIỆT ĐỂ (THOROUGHNESS)**: Không làm sơ sài, không viết code qua loa đối phó. Code phải đầy đủ kiểm tra lỗi, khớp chuẩn mực kế toán (TT200/TT133/TT88).
4. **KIỂM THỬ BẮT BUỘC**: Mọi thay đổi phải chạy và vượt qua 100% các bài test trong Master Test Suite (`npx tsx src/test/runMasterTestSuite.ts`).
