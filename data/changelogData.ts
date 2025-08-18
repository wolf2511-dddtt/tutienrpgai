export interface ChangelogEntry {
  version: string;
  date: string;
  changes: {
    type: 'new' | 'update' | 'fix' | 'balance';
    description: string;
  }[];
}

export const CHANGELOG_DATA: ChangelogEntry[] = [
  {
    version: "2.2.0",
    date: "2024-09-01",
    changes: [
      { type: 'new', description: 'Thêm tính năng cài đặt Font chữ, cho phép tùy chỉnh kích cỡ và loại font toàn cục.' },
      { type: 'update', description: 'Gỡ bỏ các tùy chọn kích thước font cũ không cần thiết để thống nhất giao diện.' },
      { type: 'update', description: 'Cải thiện logic phân tích và đề xuất cho tính năng tạo ảnh bằng AI.' },
    ],
  },
  {
    version: "2.1.5",
    date: "2024-08-28",
    changes: [
      { type: 'new', description: 'Thêm chức năng hiển thị Lịch Sử Cập Nhật (Changelog).' },
      { type: 'fix', description: 'Sửa lỗi hiển thị sai chỉ số phòng thủ khi có Nô Bộc đang Hộ Pháp.' },
      { type: 'balance', description: 'Tăng nhẹ tỉ lệ thành công khi cường hóa trang bị ở độ khó Dễ.' },
    ],
  },
  {
    version: "2.1.0",
    date: "2024-08-25",
    changes: [
      { type: 'new', description: 'Ra mắt hệ thống Đồng Hành với Nô Bộc và Thị Vệ.' },
      { type: 'new', description: 'Thêm cơ chế "Nô Dịch" kẻ địch hình người trong chiến đấu.' },
      { type: 'update', description: 'Cập nhật lại giao diện Bảng Nhân Vật, thêm các tab mới.' },
      { type: 'fix', description: 'Sửa lỗi một số kỹ năng bị động không được tính toán chính xác.' },
    ],
  },
  {
    version: "2.0.0",
    date: "2024-08-15",
    changes: [
      { type: 'new', description: 'Ra mắt tính năng "Sáng Tạo & Phân Tích Thế Giới" bằng AI.' },
      { type: 'new', description: 'Thêm hệ thống Class Tùy Chỉnh, cho phép người chơi tự phân bổ điểm tiềm năng.' },
      { type: 'update', description: 'Đại tu giao diện người dùng, cải thiện trải nghiệm trên các thiết bị.' },
    ],
  },
];
