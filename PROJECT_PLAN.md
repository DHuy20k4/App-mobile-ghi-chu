# BẢN KẾ HOẠCH CHI TIẾT & YÊU CẦU DỰ ÁN - ỨNG DỤNG GHI CHÚ & NHIỆM VỤ HÀNG NGÀY

**Môn học:** Phát triển ứng dụng mobile đa nền tảng  
**Nền tảng mục tiêu:** Android & iOS  

---

## 1. TỔNG QUAN DỰ ÁN

### 1.1. Mục tiêu & Công nghệ
* **Mục tiêu:** Xây dựng ứng dụng quản lý ghi chú và nhiệm vụ hàng ngày (To-do list) kết hợp tính năng tạo động lực (Streak).
* **Frontend:** React Native (Expo / Bare React Native).
* **Lưu trữ bảo mật (Client):** `SecureStore` (Expo) / `EncryptedStorage` (để lưu JWT, tuyệt đối không dùng `AsyncStorage`).
* **Local Database:** SQLite / WatermelonDB.
* **Backend:** Node.js + Express.js.
* **Server Database:** SQL Server (MSSQL).

### 1.2. Kiến trúc cốt lõi: Offline-First & Additive Sync
* **Offline-First:** Ứng dụng phản hồi ngay lập tức dựa trên Local Database. Các thao tác CRUD (Tạo, Đọc, Sửa, Xóa) hoạt động hoàn toàn offline.
* **Đồng bộ gia tăng (Incremental Sync) theo Giờ Server:** Để tránh lỗi do đồng hồ điện thoại bị sai lệch, mốc `lastSyncAt` sẽ **sử dụng thời gian do Server trả về** sau mỗi lần đồng bộ thành công.
* **Xử lý xung đột (Last-Write-Wins - LWW):**
  * Định danh bản ghi bằng `UUID` (tạo client-side).
  * Hợp nhất dựa trên mốc thời gian `UpdatedAt` (theo giờ Server).
  * Cơ chế đơn giản, dễ triển khai nhưng có giới hạn ghi đè phiên bản cũ nếu 2 thiết bị cùng sửa 1 bản ghi cùng lúc.

---

## 2. THIẾT KẾ GIAO DIỆN & TRẢI NGHIỆM (UI/UX)

* **Hamburger Menu (☰):**
  * Quản lý Danh sách Sổ tay (Notebooks).
  * **Ghi chú riêng tư:** Yêu cầu xác thực bằng mã PIN hoặc Sinh trắc học (Biometrics - Fingerprint / Face ID) trước khi xem.  
    *(Lưu ý MVP: Nội dung tạm thời lưu plaintext trên Server, tính năng mã hóa đầu cuối E2E là định hướng phát triển nâng cao).*
  * **Thùng rác (Trash):** Xem và khôi phục/xóa vĩnh viễn các ghi chú trong thùng rác.
* **Tìm kiếm (🔍):** Hỗ trợ tìm kiếm gần đúng cơ bản (Chuẩn hóa bỏ dấu tiếng Việt).
* **Menu tùy chọn (⋮):**
  * Hỗ trợ Multi-select (chọn nhiều bản ghi để thao tác hàng loạt).
  * Chuyển đổi giữa Chế độ lưới (Grid View) và Chế độ danh sách (List View).
  * Sắp xếp theo ngày tạo, ngày cập nhật, tiêu đề.

---

## 3. NGHIỆP VỤ NHIỆM VỤ HÀNG NGÀY (DAILY TASKS) & STREAK

### 3.1. Tính năng cốt lõi & Nhắc nhở
* **Tạo nhiệm vụ:** Nhập Tên nhiệm vụ, Giờ nhắc (Reminder Time).
* **Nhắc nhở Cục bộ (Local Notification):** Đăng ký trực tiếp với HĐH (iOS / Android) thông qua thư viện thông báo cục bộ để phát thông báo ngay cả khi không có kết nối Internet.
* **Múi giờ (Timezone Handling):** `CompletionDate` được tính theo Ngày cục bộ (Local Date `YYYY-MM-DD`) của thiết bị người dùng tại thời điểm bấm hoàn thành, tránh lỗi qua ngày mới do lệch múi giờ UTC/Local.

### 3.2. Thuật toán tính Streak (Chuỗi hoàn thành)
Streak được tính động từ bảng lịch sử `TaskCompletions` (không lưu hay đồng bộ trực tiếp con số Streak để tránh xung đột).

**Quy tắc kiểm tra:**
1. Lấy `LastCompletionDate` (Ngày hoàn thành gần nhất).
2. So sánh `LastCompletionDate` với Ngày hiện tại (`Today` theo giờ local):
   * **Giữ chuỗi:** Hôm nay chưa bấm hoàn thành, nhưng `LastCompletionDate` là ngày hôm qua (`Today - 1`). $\rightarrow$ **Giữ nguyên chuỗi**, chờ người dùng hoàn thành trong ngày.
   * **Tăng chuỗi:** Hôm nay bấm hoàn thành $\rightarrow$ `LastCompletionDate` cập nhật thành `Today`. $\rightarrow$ **Tăng Streak thêm 1**.
   * **Ngắt chuỗi:** `Today - LastCompletionDate >= 2` (Đã bỏ lỡ từ 1 ngày trở lên). $\rightarrow$ **Reset Streak về 0**.

---

## 4. THIẾT KẾ CƠ SỞ DỮ LIỆU (DATABASE SCHEMA)

*Tất cả Bảng đều sử dụng `UUID` cho Khóa chính (PK).*  
*Phân tách rõ ràng giữa `IsTrashed` (Thùng rác - người dùng khôi phục được) và `IsDeleted` (Tombstone - phục vụ đồng bộ dữ liệu).*  
*💡 **Tối ưu truy vấn (Indexing):** Trên SQL Server, **BẮT BUỘC** tạo Index cho cụm cột `(UserId, UpdatedAt)` ở tất cả các bảng để tối ưu hóa tốc độ API Pull Sync.*

### 4.1. Bảng `Users` (Tài khoản)
* `Id` (UUID, Primary Key)
* `Username` (VARCHAR, UNIQUE)
* `PasswordHash` (VARCHAR - Mã hóa bằng `bcrypt`)
* `CreatedAt` (DATETIME)
* `UpdatedAt` (DATETIME)

### 4.2. Bảng `Notebooks` (Sổ tay)
* `Id` (UUID, Primary Key)
* `UserId` (UUID, Foreign Key $\rightarrow$ Users.Id)
* `Name` (NVARCHAR)
* `IsDeleted` (BIT, Default: 0) - Tombstone cho Sync
* `CreatedAt` (DATETIME)
* `UpdatedAt` (DATETIME)

### 4.3. Bảng `Notes` (Ghi chú)
* `Id` (UUID, Primary Key)
* `NotebookId` (UUID, Foreign Key $\rightarrow$ Notebooks.Id, Nullable)
* `UserId` (UUID, Foreign Key $\rightarrow$ Users.Id)
* `Title` (NVARCHAR)
* `Content` (NTEXT / NVARCHAR(MAX))
* `IsPrivate` (BIT, Default: 0) - Đánh dấu ghi chú riêng tư
* `IsPinned` (BIT, Default: 0) - Ghim lên đầu
* `IsTrashed` (BIT, Default: 0) - Chuyển vào Thùng rác
* `IsDeleted` (BIT, Default: 0) - Tombstone cho Sync
* `CreatedAt` (DATETIME)
* `UpdatedAt` (DATETIME)

### 4.4. Bảng `DailyTasks` (Nhiệm vụ hàng ngày)
* `Id` (UUID, Primary Key)
* `UserId` (UUID, Foreign Key $\rightarrow$ Users.Id)
* `Title` (NVARCHAR)
* `ReminderTime` (TIME / VARCHAR) - Giờ nhắc nhở
* `LastCompletionDate` (DATE, Nullable) - Ngày hoàn thành gần nhất
* `IsDeleted` (BIT, Default: 0) - Tombstone cho Sync
* `CreatedAt` (DATETIME)
* `UpdatedAt` (DATETIME)

### 4.5. Bảng `TaskCompletions` (Lịch sử hoàn thành nhiệm vụ)
* `Id` (UUID, Primary Key)
* `TaskId` (UUID, Foreign Key $\rightarrow$ DailyTasks.Id)
* `CompletionDate` (DATE) - Ngày tính hoàn thành (`YYYY-MM-DD`)
* `CompletedAt` (DATETIME) - Thời điểm chính xác bấm hoàn thành
* `UpdatedAt` (DATETIME) - Phục vụ đồng bộ gia tăng
* `IsDeleted` (BIT, Default: 0) - Hỗ trợ tính năng "Undo" (bỏ tick)
* *Constraint:* `UNIQUE(TaskId, CompletionDate)`

---

## 5. DANH SÁCH API ENDPOINTS

### 5.1. Authentication (Xác thực & Bảo mật)
Sử dụng Access Token (ngắn hạn - 15 phút) & Refresh Token (dài hạn - 7 ngày).

| Method | Endpoint | Mô tả |
| :--- | :--- | :--- |
| `POST` | `/api/auth/register` | Đăng ký tài khoản (Băm mật khẩu `bcrypt`) |
| `POST` | `/api/auth/login` | Đăng nhập, trả về `accessToken` & `refreshToken` |
| `POST` | `/api/auth/refresh` | Cấp mới Access Token bằng Refresh Token |
| `GET` | `/api/auth/me` | Lấy thông tin người dùng hiện tại |

### 5.2. Synchronization (Đồng bộ gia tăng)

| Method | Endpoint | Mô tả |
| :--- | :--- | :--- |
| `POST` | `/api/sync/push` | Client gửi các thay đổi lên Server. Server xử lý xung đột (LWW theo giờ Server), lưu DB và trả về `server_timestamp` mới |
| `GET` | `/api/sync/pull?since={server_lastSyncAt}` | Lấy toàn bộ thay đổi (`UpdatedAt > since`), bao gồm cả bản ghi `IsDeleted = 1`. Trả về mốc giờ Server hiện tại |

### 5.3. RESTful CRUD (Cho Backend 3 lớp)
* **Notebooks:** `GET`, `POST`, `PUT`, `DELETE` `/api/notebooks/:id`
* **Notes:** `GET`, `POST`, `PUT`, `DELETE` `/api/notes/:id`
* **Tasks:** `GET`, `POST`, `PUT`, `DELETE` `/api/tasks/:id`
* **Completions:** `GET`, `POST` `/api/tasks/:taskId/completions`

---

## 6. LỘ TRÌNH PHÁT TRIỂN (6 PHASES)

### 🚩 Phase 1: Local Note (App Offline Ghi chú)
- Khởi tạo cấu trúc SQLite/WatermelonDB local.
- Hoàn thiện tính năng CRUD Note, Notebook, Trash offline.
- Giao diện Grid/List View, Multi-select, Tìm kiếm bỏ dấu tiếng Việt.

### 🚩 Phase 2: Daily Task & Streak Module
- Xây dựng mô đun Nhiệm vụ hàng ngày offline.
- Quản lý `TaskCompletions` local.
- Viết thuật toán tính Streak động dựa trên mốc Local Date.

### 🚩 Phase 3: Local Notification
- Cấu hình thư viện thông báo cục bộ (`expo-notifications` hoặc `react-native-push-notification`).
- Đăng ký và hủy lịch nhắc nhở theo giờ đặt trước.

### 🚩 Phase 4: Auth & Sync Core (Lát cắt mỏng - Notes Sync)
- Dựng cơ sở dữ liệu SQL Server.
- Cấu hình Auth API với `bcrypt` và JWT Access/Refresh Token.
- Triển khai luồng Sync Push/Pull chuẩn giờ Server cho bảng `Notes` để kiểm thử giải thuật LWW.

### 🚩 Phase 5: Hoàn thiện Backend & Full Sync
- Mở rộng luồng Sync Push/Pull cho `Notebooks`, `DailyTasks`, `TaskCompletions`.
- Xử lý đồng bộ các trường hợp Undo tick completion (`IsDeleted = 1`).

### 🚩 Phase 6: Kiểm thử, Tối ưu & Báo cáo
- Test thay đổi múi giờ, lệch giờ giữa thiết bị và server.
- Test xung đột LWW khi 2 thiết bị cùng chỉnh sửa 1 bản ghi.
- Đánh chỉ mục Index `(UserId, UpdatedAt)` trên SQL Server.
- Sửa lỗi và hoàn thiện báo cáo môn học.
