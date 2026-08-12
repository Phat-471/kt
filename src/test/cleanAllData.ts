import { clearAllDatabaseData } from '../services/storage';

async function runClean() {
  console.log('🧹 Bắt đầu dọn dẹp sạch 100% dữ liệu thử nghiệm trong cơ sở dữ liệu...');
  await clearAllDatabaseData();
  console.log('✅ Đã xóa toàn bộ dữ liệu mẫu/thử nghiệm thành công!');
}

runClean().catch(err => {
  console.error('Lỗi khi dọn dẹp dữ liệu:', err);
});
