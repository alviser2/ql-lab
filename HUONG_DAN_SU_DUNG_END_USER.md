# HƯỚNG DẪN SỬ DỤNG HỆ THỐNG GIAO BAN BỆNH VIỆN

> Tài liệu dành cho người dùng cuối (Giám đốc, Phó Giám đốc, Trưởng khoa, Nhân viên).

---

## 1) Truy cập hệ thống

- Mở trình duyệt và vào: `https://giaobanbv.ibme.edu.vn`
- Nhập **Tên đăng nhập** và **Mật khẩu** đã được quản trị cấp.
- Nếu quên mật khẩu: liên hệ quản trị viên/giám đốc để đặt lại.

---

## 2) Các khu vực chính trên menu

- **Dashboard**: tổng quan công việc/KPI theo quyền.
- **Tasks**: quản lý công việc đang chạy.
- **Lịch sử công việc**: các việc đã được chốt và lưu lịch sử.
- **KPI**: theo dõi kết quả thực hiện.
- **Meetings**: lịch và biên bản giao ban.
- **Quản trị**: chỉ Giám đốc thấy (quản lý tài khoản, phân quyền).

---

## 3) Luồng công việc chuẩn

### 3.1 Trạng thái công việc

1. **NEW** (Mới)
2. **IN_PROGRESS** (Đang làm)
3. **PENDING_APPROVAL** (Chờ duyệt báo cáo)
4. **COMPLETED** (Hoàn thành)

Nếu bị từ chối duyệt, việc quay lại **IN_PROGRESS** để cập nhật và báo cáo lại.

### 3.2 Luồng xử lý thường dùng

1. Cấp trên tạo việc/giao việc
2. Người nhận bấm **Bắt đầu làm**
3. Khi xong, người nhận bấm **Báo cáo**
4. Người giao vào **Hộp duyệt** để:
   - **Duyệt** → việc hoàn thành
   - **Từ chối** → nêu lý do để cấp dưới sửa

---

## 4) Hướng dẫn theo vai trò

## 4.1 Nhân viên (r-staff)

- Vào **Tasks** → mục **Việc của tôi**
- Bấm vào tên việc để xem chi tiết
- Thao tác chính:
  - **Bắt đầu làm**
  - **Báo cáo** kết quả lên người giao
- Nếu bị từ chối: đọc lý do, cập nhật và báo cáo lại.

## 4.2 Trưởng khoa (r-dept-head)

- Xem bảng Kanban của khoa tại **Tasks**
- Giao việc trong phạm vi khoa
- Duyệt báo cáo từ cấp dưới trong **Hộp duyệt**
- Theo dõi KPI và tiến độ khoa trên Dashboard/KPI.

## 4.3 Phó Giám đốc (r-vice-director)

- Theo dõi các khoa được phân công
- Tạo/giao việc trong phạm vi phụ trách
- Duyệt báo cáo từ cấp dưới
- Tạo lịch giao ban trong **Meetings**.

## 4.4 Giám đốc (r-director)

- Xem tổng quan toàn viện
- Duyệt báo cáo cuối các đầu việc
- Chốt cây việc hoàn thành (hệ thống chuyển sang lịch sử)
- Quản trị tài khoản/phân quyền tại **Quản trị**
- Duyệt biên bản họp giao ban.

---

## 5) Lịch sử công việc

- Mục **Lịch sử công việc** hiển thị các việc đã được chốt.
- Dùng:
  - **Mở toàn bộ**: bung toàn bộ cây việc
  - **Thu gọn**: thu gọn danh sách
- Dữ liệu lịch sử dùng để tra cứu và tính KPI.

> Ghi chú: tính năng mở chi tiết trực tiếp từ lịch sử và dọn dữ liệu lịch sử theo nhiều mức (xóa lẻ/xóa theo tháng/xóa toàn bộ) sẽ được bổ sung theo cấu hình quản trị.

---

## 6) Meetings (lịch và biên bản giao ban)

### 6.1 Tạo lịch giao ban

- Vai trò được phép: **Giám đốc, Phó Giám đốc**
- Vào **Meetings** → **+ Tạo lịch giao ban**

### 6.2 Cập nhật biên bản

- Thư ký được chỉnh sửa khi biên bản ở trạng thái **nháp**
- Sau khi Giám đốc duyệt, biên bản sẽ khóa chỉnh sửa
- Có thể xuất/in biên bản từ trang chi tiết cuộc họp.

---

## 7) Quản trị tài khoản (chỉ Giám đốc)

Tại menu **Quản trị**, có thể:

- Tạo khoa
- Tạo tài khoản
- Đổi mật khẩu
- Đổi vai trò/phân quyền
- Khóa/Mở tài khoản
- Xóa tài khoản (soft delete)

Khuyến nghị:
- Đặt mật khẩu mạnh
- Đổi mật khẩu định kỳ
- Khóa tài khoản không còn sử dụng.

---

## 8) Một số lỗi thường gặp

### Không đăng nhập được

- Kiểm tra đúng username/password
- Kiểm tra Caps Lock/bộ gõ
- Nếu vẫn lỗi: nhờ quản trị đặt lại mật khẩu.

### Không thấy dữ liệu công việc

- Có thể bạn chưa được giao việc hoặc chưa có quyền xem phạm vi đó
- Kiểm tra lại role/phân quyền với quản trị.

### Báo cáo xong nhưng không hoàn thành

- Việc đang ở trạng thái **chờ duyệt**
- Cần người giao việc bấm **Duyệt**.

---

## 9) Quy ước sử dụng tốt

- Tiêu đề việc ngắn gọn, rõ mục tiêu
- Mô tả việc có đầu ra cụ thể
- Deadline phù hợp, tránh dồn cuối kỳ
- Báo cáo nêu rõ: đã làm gì, kết quả gì, vướng mắc gì
- Khi từ chối duyệt, ghi lý do rõ để xử lý nhanh.

---

## 10) Hỗ trợ

Khi cần hỗ trợ kỹ thuật, chuẩn bị giúp các thông tin sau để xử lý nhanh:

- Username
- Thời điểm gặp lỗi
- Ảnh chụp màn hình lỗi
- Tác vụ bạn vừa thực hiện trước khi lỗi xảy ra
