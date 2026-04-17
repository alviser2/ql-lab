Để xây dựng một hệ thống quản trị bệnh viện có khả năng phân cấp nhiệm vụ và đánh giá KPI, cấu trúc cơ sở dữ liệu (Database Schema) cần đảm bảo tính nhất quán (Integrity) và khả năng truy vấn ngược (Traceability).

**1\. Nhóm Danh mục & Tổ chức (Core)**

Nhóm này định nghĩa "Ai là ai" và "Thuộc đơn vị nào".

* **Departments (Phòng ban/Khoa):** Lưu thông tin các khoa, phòng.

  * id (PK), name, type (Lâm sàng/Cận lâm sàng/Hành chính), supervisor\_id (FK to Users \- PGĐ phụ trách khoa này).

* **Roles (Vai trò):**

  * id (PK), role\_name (GĐ, PGĐ, Trưởng khoa, Nhân viên), level (1, 2, 3, 4 \- Dùng để chặn quyền giao việc vượt cấp).

* **Users (Người dùng):**

  * id (PK), full\_name, username, password\_hash, role\_id (FK), dept\_id (FK), manager\_id (FK to Users \- Cấp trên trực tiếp).

**2\. Nhóm Giao ban & Công việc (Tasks & Meetings)**

Đây là "trái tim" của hệ thống, cho phép phân rã công việc từ biên bản họp.

* **Meetings (Cuộc họp):**

  * id (PK), title, meeting\_date, location, chairperson\_id (FK), secretary\_id (FK), content\_raw (Nội dung thô), conclusion (Kết luận chung).

* **Tasks (Công việc):**

  * id (PK), meeting\_id (FK \- Có thể null nếu là việc hành chính phát sinh), parent\_task\_id (FK to Tasks \- Dùng để phân rã việc: GĐ giao việc A \-\> PGĐ phân nhỏ thành A1, A2).

  * title, description, priority (Thấp/Trung bình/Cao).

  * creator\_id (FK \- Người giao), assignee\_id (FK \- Người thực hiện), monitor\_id (FK \- Người giám sát/Thường trực).

  * deadline, started\_at, completed\_at.

  * status (New, In Progress, Pending Approval, Completed, Overdue).

  * result\_note (Kết quả dự kiến/thực tế).

* **Task\_Attachments (Tài liệu đính kèm):**

  * id, task\_id (FK), file\_path, uploaded\_at.

**3\. Nhóm Theo dõi & Đánh giá (KPI & Logs)**

Mở rộng để đánh giá hiệu quả công việc tự động.

* **Task\_History (Lịch sử công việc):** Để kiểm soát tính trung thực.

  * id, task\_id (FK), changed\_by (FK), old\_status, new\_status, comment, created\_at.

* **KPI\_Metrics (Tiêu chí KPI):**

  * id, name (Ví dụ: Tỷ lệ đúng hạn, Khối lượng việc...), weight (Trọng số).

* **KPI\_Results (Kết quả đánh giá):**

  * id, user\_id (FK), month, year, score\_auto (Máy tính), score\_manual (Lãnh đạo chấm), final\_grade.

**4\. Sơ đồ quan hệ thực tế (Logic phân cấp)**

Để xử lý yêu cầu **"Giám đốc \-\> PGĐ \-\> Trưởng khoa \-\> Nhân viên"**, chúng ta sử dụng mối quan hệ đệ quy (Recursive Relationship) trong bảng Tasks thông qua trường parent\_task\_id.

**Ví dụ luồng dữ liệu:**

1. Một dòng trong Meetings được tạo.

2. Giám đốc tạo một Tasks (ID: 101, parent\_task\_id: NULL) giao cho PGĐ A.

3. PGĐ A nhận việc, tạo Tasks (ID: 102, parent\_task\_id: 101\) giao cho Trưởng khoa Nội.

4. Trưởng khoa Nội tạo Tasks (ID: 103, parent\_task\_id: 102\) giao cho Điều dưỡng B thực hiện.

\-\> Hệ thống sẽ hiển thị được "Cây công việc" (Task Tree) để biết một chỉ đạo của GĐ đã được thực hiện đến đâu.

Thiết kế UI/UX cho hệ thống quản lý giao ban bệnh viện cần ưu tiên tính **trực quan**, **tốc độ truy cập** và **phân lớp thông tin**. Dưới đây là phác thảo chi tiết cho từng vai trò trên hai nền tảng chính: Web (Dành cho Lãnh đạo/Quản lý) và Mobile App (Dành cho nhân viên).

**1\. Vai trò: Giám đốc (Dashboard Tổng thể \- Giao diện Web)**

**Mục tiêu:** Cung cấp cái nhìn toàn cảnh ("Chim ưng") về sức khỏe vận hành của toàn bệnh viện mà không cần đi vào chi tiết vụn vặt.

* **Widget Tổng quan (Top Cards):**

  * **Chỉ số hoàn thành:** Biểu đồ tròn biểu thị % công việc đã hoàn thành đúng hạn toàn viện.

  * **Điểm nóng (Hotspots):** Danh sách 3 khoa có tỷ lệ công việc tồn đọng cao nhất (Cảnh báo đỏ).

  * **Trạng thái Giao ban:** Trạng thái biên bản họp hôm nay (Đã ký/Chờ duyệt).

* **Biểu đồ Tiến độ (Heatmap/Gantt):**

  * Hiển thị dòng chảy công việc từ các chỉ đạo giao ban theo thời gian.

* **Tính năng "Deep Dive":** Click vào một PGĐ để xem cây công việc mà vị đó đang phụ trách.

* **Lệnh khẩn cấp:** Một nút "Chỉ đạo nóng" nổi bật để giao việc tức thời cho toàn viện hoặc nhóm nhân sự cốt cán.

**2\. Vai trò: Phó Giám đốc (Management Hub \- Giao diện Web/Tablet)**

**Mục tiêu:** Quản lý luồng công việc giữa các khoa mình phụ trách và phê duyệt kết quả.

* **Danh sách Phê duyệt (Approval Inbox):** \* Nơi tập trung các báo cáo kết quả từ các Trưởng khoa gửi lên. Giao diện dạng "Swipe" hoặc "Quick Review" để duyệt nhanh.

* **Cây phân cấp công việc (Task Tree View):** \* Hiển thị một công việc gốc từ Giám đốc đã được chia nhỏ cho những khoa nào, trạng thái cụ thể của từng nhánh.

* **Bảng so sánh KPI:** \* Biểu đồ cột so sánh hiệu suất giữa các khoa trong khối mình phụ trách (Ví dụ: Khối Nội vs Khối Ngoại).

**3\. Vai trò: Trưởng/Phó Khoa (Operation Board \- Giao diện Web)**

**Mục tiêu:** Điều phối nhân sự nội bộ và giám sát chi tiết thực thi.

* **Bảng Kanban (To-do | Doing | Review | Done):**

  * Mỗi thẻ (Card) là một công việc. Thẻ có màu sắc theo độ ưu tiên (Đỏ: Khẩn, Vàng: Thường).

* **Biểu đồ khối lượng công việc (Workload Balance):**

  * Xem nhân viên nào đang bị quá tải, nhân viên nào đang rảnh để điều phối việc công bằng.

* **Tích hợp Biên bản:** \* Cửa sổ chia đôi màn hình: Bên trái là Biên bản giao ban sáng nay, bên phải là danh sách tạo việc cho nhân viên để đảm bảo không sót ý chỉ đạo.

**4\. Vai trò: Nhân viên (Mobile App \- Giao diện Di động)**

**Mục tiêu:** Nhận việc tức thì và báo cáo kết quả trong "3 chạm".

* **Màn hình Home (My Tasks):**

  * Danh sách việc cần làm xếp theo Deadline.

  * Mỗi task có nút **"Check-in"** khi bắt đầu làm và **"Báo cáo"** khi xong.

* **Báo cáo thông minh (Quick Report):**

  * **Voice-to-text:** Nhân viên đọc báo cáo, AI tự chuyển thành văn bản (phù hợp khi đang trong phòng bệnh/trực).

  * **Camera:** Chụp ảnh minh chứng (Kết quả xét nghiệm, tình trạng thiết bị...) đính kèm thẳng vào task.

* **Thông báo (Push Notifications):**

  * Nhắc nhở khi sắp đến Deadline hoặc có chỉ đạo khẩn từ Trưởng khoa/Giám đốc.

**Tóm tắt các thành phần UI chủ đạo**

| Thành phần | Đặc điểm UX | Công nghệ đề xuất |
| :---- | :---- | :---- |
| **Color Palette** | Xanh Medical (Primary), Trắng/Xám nhạt (Background). | Tailwind CSS / Material UI |
| **Typography** | Font không chân (Inter/Roboto), cỡ chữ lớn cho Mobile. | Google Fonts |
| **Data Viz** | Biểu đồ tối giản, không quá nhiều chi tiết gây nhiễu. | ApexCharts / Chart.js |
| **Navigation** | Sidebar cho Web, Bottom Navigation cho Mobile. | React Navigation / Vue Router |

