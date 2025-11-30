
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
    version: "2.5.3",
    date: new Date().toISOString().split('T')[0],
    changes: [
      { type: 'balance', description: 'Đại tu sức mạnh Thú Cưng: Tăng mạnh các hệ số HP, Tấn công và Phòng thủ để thú cưng đóng vai trò quan trọng hơn (Tanker/DPS) ở giai đoạn sau.' },
      { type: 'new', description: 'Cơ chế Tiến Hóa Thú Cưng: Thú cưng đã tiến hóa nhận thêm 20% chỉ số tổng và khả năng Hút máu (Lifesteal) bẩm sinh.' },
    ],
  },
  {
    version: "2.5.2",
    date: "2024-09-08",
    changes: [
      { type: 'balance', description: 'Cân bằng lại toàn bộ hệ thống chỉ số: Tăng mạnh HP và Thủ của nhân vật để phù hợp với phong cách Tiên Hiệp.' },
      { type: 'balance', description: 'Điều chỉnh công thức tính sát thương vật lý và phép thuật, tăng ảnh hưởng của các chỉ số chính (STR/INT).' },
      { type: 'balance', description: 'Cập nhật chỉ số cho Thú Cưng để chúng hữu dụng hơn trong chiến đấu.' },
    ],
  },
  {
    version: "2.5.1",
    date: "2024-09-08",
    changes: [
      { type: 'balance', description: 'Cân bằng lại chỉ số Người Chơi: Tăng mạnh HP, ATK và DEF từ các chỉ số gốc để phù hợp với bối cảnh Tiên Hiệp.' },
      { type: 'balance', description: 'Cân bằng lại Quái Vật: Tăng chỉ số theo cấp độ và áp dụng chính xác hệ số sức mạnh theo Cấp bậc (Thường/Tinh Anh/Thủ Lĩnh).' },
      { type: 'balance', description: 'Hệ thống chiến đấu: Tăng sát thương chí mạng lên 175% và thêm cơ chế sát thương tối thiểu dựa trên cấp độ.' },
    ],
  },
  {
    version: "2.5.0",
    date: "2024-09-08",
    changes: [
      { type: 'new', description: 'Hệ thống Nhiệm Vụ Tông Môn Động (Dynamic Quest): Sử dụng Gemini 3.0 Pro để tạo nhiệm vụ dựa trên cốt truyện và cấp bậc.' },
      { type: 'update', description: 'Nâng cấp AI Dẫn Truyện (GM): Kích hoạt Thinking Model cho Gemini 2.5 Flash, giúp phản hồi hành động người chơi thông minh và mạch lạc hơn.' },
      { type: 'balance', description: 'Cân bằng lại chỉ số HP và Tấn Công giai đoạn giữa game.' },
    ],
  },
  {
    version: "2.4.0",
    date: "2024-09-08",
    changes: [
      { type: 'new', description: 'Thêm tính năng lồng tiếng AI (TTS) cho các đoạn hội thoại NPC.' },
      { type: 'update', description: 'Nâng cấp trải nghiệm hội thoại với âm thanh sống động.' },
      { type: 'fix', description: 'Cải thiện hiển thị giao diện đối thoại trên thiết bị di động.' },
    ],
  },
  {
    version: "2.3.0",
    date: "2024-09-05",
    changes: [
      { type: 'update', description: 'Nâng cấp AI Core lên Gemini 3.0 Pro cho khả năng sáng tạo thế giới và nhân vật vượt trội.' },
      { type: 'new', description: 'Tích hợp mô hình tư duy (Thinking Model) giúp thế giới được tạo ra logic và có chiều sâu hơn.' },
      { type: 'balance', description: 'Tối ưu hóa tốc độ phản hồi cho các hành động trong game.' },
    ],
  },
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
