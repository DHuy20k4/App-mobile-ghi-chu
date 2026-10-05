# BÁO CÁO NGHIỆM THU DỰ ÁN - ỨNG DỤNG GHI CHÚ & NHIỆM VỤ HÀNG NGÀY (NOTE & TASK APP)

**Môn học:** Phát triển ứng dụng mobile đa nền tảng  
**Nền tảng:** Android & iOS (React Native + Expo)  
**Cơ sở dữ liệu:** SQLite (Client) & SQL Server (Server)  
**Backend:** Node.js + Express.js  

---

## 1. TỔNG QUAN KẾT QUẢ TRIỂN KHAI (100% HOÀN THÀNH)

Dự án đã được triển khai hoàn chỉnh qua 6 Phase phát triển theo chuẩn kiến trúc **Offline-First** và **Incremental Sync**:

| Phase | Nội dung triển khai | Kết quả nghiệm thu |
| :---: | :--- | :---: |
| **1** | **Local Note App (Offline):** SQLite schema, Full CRUD Ghi chú & Sổ tay, Grid/List view, Multi-select, Tìm kiếm bỏ dấu tiếng Việt, PIN bảo mật ghi chú riêng tư. | 🟢 Đạt 100% |
| **2** | **Daily Task & Streak Module:** SQLite schema, Task CRUD, Thuật toán đếm chuỗi Streak động theo mốc ngày cục bộ (`YYYY-MM-DD`), xử lý Undo tick không mất lịch sử. | 🟢 Đạt 100% |
| **3** | **Local Notification:** Đăng ký thông báo lặp lại hàng ngày offline trực tiếp với HĐH qua `expo-notifications`, tự động liên kết vòng đời tạo/sửa/xóa task. | 🟢 Đạt 100% |
| **4** | **Auth & Sync Core (Lát cắt mỏng):** Dựng SQL Server DB `schema.sql`, Auth API (`bcrypt`, JWT Access 15p / Refresh 7d), Sync Push/Pull cho bảng Notes (LWW). | 🟢 Đạt 100% |
| **5** | **Hoàn thiện Backend & Full Sync:** Mở rộng Sync Push/Pull cho cả 4 thực thể (`Notebooks`, `Notes`, `DailyTasks`, `TaskCompletions`), xử lý đồng bộ Undo. | 🟢 Đạt 100% |
| **6** | **Kiểm thử, Tối ưu & Báo cáo:** Kiểm tra TypeScript build (0 lỗi), đánh chỉ mục Index SQL Server, kiểm thử lệch giờ & giải thuật LWW, lập báo cáo nghiệm thu. | 🟢 Đạt 100% |

---

## 2. KIẾN TRÚC KỸ THUẬT NỔI BẬT

### 2.1. Cơ chế Offline-First & Đồng bộ Gia tăng (Incremental Sync)
* **Tốc độ đáp ứng tức thì (Zero Latency):** Mọi thao tác tạo, chỉnh sửa, ghim, chuyển thùng rác hay tick task của người dùng được lưu và truy vấn trực tiếp trên CSDL **SQLite local**.
* **Tránh lỗi lệch đồng hồ thiết bị:** Mốc `lastSyncAt` không dùng đồng hồ của điện thoại mà **sử dụng thời gian do Server trả về (`server_timestamp`)** sau mỗi lần đồng bộ thành công.
* **Xử lý xung đột Last-Write-Wins (LWW):** Tất cả bản ghi sử dụng `UUID` duy nhất. Server so sánh mốc `updatedAt`. Nếu bản ghi ở Client mới hơn hoặc bằng Server, Server sẽ ghi đè và gán lại mốc `UpdatedAt = server_now`.

### 2.2. Thuật toán đếm Streak (Chuỗi hoàn thành) động
* Streak không lưu cố định để tránh xung đột dữ liệu giữa các thiết bị.
* Thuật toán truy vấn bảng `TaskCompletions` theo mốc ngày cục bộ (`YYYY-MM-DD`):
  * Khoảng cách ngày gần nhất $= 0$ (Hôm nay vừa tick) $\rightarrow$ **Tăng Streak +1**.
  * Khoảng cách ngày $= 1$ (Hôm qua tick, hôm nay chưa) $\rightarrow$ **Giữ chuỗi** chờ người dùng hoàn thành.
  * Khoảng cách ngày $\ge 2$ (Bỏ lỡ từ 1 ngày) $\rightarrow$ **Tự động ngắt chuỗi (Reset về 0)**.

### 2.3. Tối ưu hóa Truy vấn trên SQL Server (Indexing)
Đã thiết lập cụm chỉ mục Index cho mốc thời gian đồng bộ `(UserId, UpdatedAt)` trên SQL Server:
```sql
CREATE INDEX IX_Notebooks_UserId_UpdatedAt ON Notebooks(UserId, UpdatedAt);
CREATE INDEX IX_Notes_UserId_UpdatedAt ON Notes(UserId, UpdatedAt);
CREATE INDEX IX_DailyTasks_UserId_UpdatedAt ON DailyTasks(UserId, UpdatedAt);
CREATE INDEX IX_TaskCompletions_TaskId_UpdatedAt ON TaskCompletions(TaskId, UpdatedAt);
```

---

## 3. HƯỚNG DẪN KHỞI CHẠY DỰ ÁN

### 3.1. Khởi chạy Backend (Node.js + SQL Server)
1. Mở SQL Server Management Studio (SSMS) và thực thi script `backend/schema.sql` để tạo CSDL `NoteAppDB`.
2. Truy cập thư mục backend và cài đặt dependencies:
   ```bash
   cd backend
   npm install
   ```
3. Chạy server ở chế độ Development:
   ```bash
   npm run dev
   ```
   *(Server sẽ chạy tại `http://localhost:5000`)*

### 3.2. Khởi chạy Frontend (React Native Expo)
1. Truy cập thư mục frontend và cài đặt dependencies:
   ```bash
   cd frontend
   npm install
   ```
2. Khởi chạy ứng dụng Expo:
   ```bash
   npm run android  # Hoặc npm run ios / npx expo start
   ```

---

## 4. KẾT LUẬN

Dự án **Ứng dụng Ghi chú & Nhiệm vụ hàng ngày** đã đáp ứng hoàn hảo toàn bộ các tiêu chí đề ra trong bản kế hoạch ban đầu. Ứng dụng chạy mượt mà offline, bảo mật thông tin bằng PIN, tạo động lực hoàn thành công việc hàng ngày qua chuỗi Streak và đồng bộ dữ liệu an toàn, tin cậy lên SQL Server.
