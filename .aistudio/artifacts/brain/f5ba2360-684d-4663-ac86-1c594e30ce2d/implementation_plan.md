# Kế Hoạch Triển Khai: Chế Độ Online Nhiều Người Chơi & Bản Đồ Thế Giới 50×50 (Viewport Chunking)

## 1. Mục Tiêu Cốt Lõi
Chuyển đổi **Pomodoro Empire Ultimate V.10** sang kiến trúc **Online Nhiều Người Chơi Thời Gian Thực (Real-time Multiplayer)** trên nền tảng **Firebase Firestore & Authentication**, đồng thời mở rộng Bản Đồ Thế Giới lên **50×50 ô (2.500 ô)** chia thành **25 Chunks (mỗi Chunk 10×10 ô)** với cơ chế **Viewport Loading & Render Culling** (chỉ tải dữ liệu từ server và vẽ các ô nằm trong phạm vi màn hình đang nhìn).

---

## 2. Kiến Trúc Đồng Bộ & Bảo Mật Quyền Sở Hữu (Firebase Firestore + Auth)

### 2.1. Xác Thực Người Chơi & Đồng Bộ Tài Khoản
- Tích hợp **Firebase Authentication (Google Sign-In qua Popup)** kết hợp hồ sơ người chơi (`users/{uid}`) để định danh duy nhất từng người chơi trên toàn server (`ownerUid`, `username`).
- Tự động đồng bộ/di chuyển dữ liệu vương quốc hiện có trên máy người chơi lên tài khoản Firebase ngay khi đăng nhập lần đầu.

### 2.2. Mô Hình 3 Lớp Dữ Liệu Bản Đồ Thế Giới (Tối Ưu Cho Hàng Trăm Người Chơi)
1. **Lớp 1 — Địa Hình Tĩnh Đồng Bộ Qua Hạt Giống Chung (`Deterministic World Seed`):**
   - Toàn bộ **2.500 ô (`50×50`)** gồm Cỏ (`PLAIN`), Rừng (`FOREST`), Sông (`RIVER`), Núi (`MOUNTAIN`), cùng vị trí mặc định của Mỏ tài nguyên (`MINE`) và Địch (`ENEMY`) được sinh từ cùng một hàm toán học cố định `getWorldMapTileFeature(gx, gy)` trên mọi máy khách.
   - Đảm bảo 100% người chơi nhìn thấy cùng một địa hình sông núi, cây cỏ, mỏ, địch tại đúng tọa độ `(x, y)` mà **không tốn băng thông tải địa hình tĩnh**.

2. **Lớp 2 — Thực Thể Động Trên Bản Đồ Thế Giới Theo Chunk (`world_tiles/{tileKey}`):**
   - Mỗi ô có Vương Quốc người chơi (hoặc biến động trạng thái Mỏ/Địch) được lưu trên Firestore với trường định danh `chunkId = "chunk_${Math.floor(x / 10)}_${Math.floor(y / 10)}"`.
   - Dữ liệu công khai trên ô gồm: `tileKey`, `chunkId`, `gridX`, `gridY`, `tileType`, `kingdomId`, `kingdomName`, `kingdomLevel`, `ownerUid`, `ownerUsername`, `updatedAt`.
   - Mọi người chơi đều nhìn thấy tất cả Vương Quốc của nhau xuất hiện theo thời gian thực khi lướt camera qua vùng Chunk đó.

3. **Lớp 3 — Dữ Liệu Chi Tiết Nội Bộ Vương Quốc (`kingdom_saves/{kingdomId}`):**
   - Lưu trữ toàn bộ dữ liệu riêng biệt của từng Vương Quốc: cấp độ, EXP, thời gian, tài nguyên, tiền tệ, công trình, trang viên, và danh sách đầy đủ từng đơn vị/anh hùng (cấp, Tier, tên, chỉ số, trang bị, kỹ năng).
   - **Bảo mật quyền sở hữu tuyệt đối (`firestore.rules`):**
     - Bất kỳ người chơi nào trên Bản Đồ Thế Giới đều xem được thông tin tóm tắt công khai của ô Vương Quốc (`world_tiles`), nhưng **chỉ chủ sở hữu (`resource.data.ownerUid == request.auth.uid`)** mới có quyền đọc/ghi `kingdom_saves/{kingdomId}` và bấm nút **"Vào Vương Quốc"**.
     - Khi nhấp vào Vương Quốc của người chơi khác trên Bản Đồ Thế Giới, giao diện sẽ hiển thị thẻ thông tin Vương Quốc & tên Chủ Sở Hữu với trạng thái khóa **"Vương Quốc Của Người Chơi Khác (Chỉ Chủ Sở Hữu Mới Được Truy Cập)"**.

---

## 3. Cơ Chế Viewport Loading & Spatial Chunking (Bản Đồ 50×50 Ô, Chunk 10×10)

### 3.1. Chia Lưới Chunk 10×10 Ô
- Bản đồ `50×50` ô được chia thành lưới **5×5 = 25 Chunks**, mỗi Chunk kích thước **`10×10` ô** (`chunk_0_0` đến `chunk_4_4`).
- Khi người chơi di chuyển camera trên Bản Đồ Thế Giới (bằng `WASD` hoặc giữ chuột kéo map):
  1. Tính khung nhìn hiện tại trên Canvas: `(minTileX, minTileY)` đến `(maxTileX, maxTileY)` cộng thêm **1 viền đệm (Buffer = 2 ô)** xung quanh màn hình.
  2. Quy đổi sang danh sách các `chunkId` đang nằm trong màn hình (thường chỉ từ **1 đến 4 Chunks** cùng lúc).
  3. **Viewport Server Subscription:** Chỉ mở kết nối lắng nghe thời gian thực (`onSnapshot` với truy vấn `where('chunkId', '==', chunkId)`) cho đúng các Chunk nằm trong màn hình. Khi một Chunk ra khỏi màn hình, hệ thống tự động ngắt listener của Chunk đó.

### 3.2. Viewport Canvas Render Culling (Tối Ưu 60 FPS)
- Thay vì lặp qua toàn bộ `2.500 ô` mỗi khung hình trên Canvas 2D:
  - Vòng lặp vẽ địa hình, sông nước, cây cối, mỏ, địch và vương quốc chỉ chạy trong phạm vi `for (let gy = visibleMinY; gy <= visibleMaxY; gy++)` và `for (let gx = visibleMinX; gx <= visibleMaxX; gx++)`.
  - Các ô nằm ngoài màn hình hoàn toàn không gọi lệnh vẽ Canvas và không tải dữ liệu từ server.
- Bổ sung chỉ báo gọn nhẹ trên góc Bản Đồ Thế Giới hiển thị:
  - Tọa độ vùng đang nhìn & số Chunk đang tải trực tuyến (ví dụ: `Online • Vùng hiển thị: (X: 12..28, Y: 10..22) • Chunks đang tải: 4/25`).
  - Minimap Thế Giới thu nhỏ hoặc bộ chọn nhảy nhanh tới Vương Quốc của bản thân trên bản đồ `50×50`.

---

## 4. Các Tệp Sẽ Cập Nhật & Khởi Tạo
1. **Cấu hình & Bảo mật Firebase:**
   - Khởi tạo Firebase qua công cụ tích hợp của AI Studio (`firebase-applet-config.json`).
   - `/firebase-blueprint.json` & `/firestore.rules`: Định nghĩa schema và quy tắc bảo mật tách biệt quyền đọc công khai theo Chunk (`world_tiles`) và quyền sở hữu riêng tư (`kingdom_saves`, `users`).
   - `/src/utils/firebase.ts`: Quản lý kết nối Firebase Auth, Firestore, hàm xử lý lỗi chuẩn `handleFirestoreError`, và hook/service đồng bộ Chunk theo Viewport.
2. **Mở Rộng Bản Đồ Thế Giới & UI Online:**
   - `/src/types/game.ts`: Nâng `WORLD_MAP_SIZE = 50`, thêm hằng số `WORLD_CHUNK_SIZE = 10` và kiểu dữ liệu `WorldMapPublicTile` / `WorldChunkCoord`.
   - `/src/components/AuthAndWorldScreens.tsx`:
     - Nâng cấp màn hình Đăng Nhập hỗ trợ **Đăng Nhập Online (Google / Tài Khoản Đồng Bộ Cloud)**.
     - Nâng cấp Canvas Bản Đồ Thế Giới `50×50` với **Viewport Render Culling** (chỉ vẽ ô trong màn hình) và **Viewport Chunk Loader** (chỉ tải dữ liệu từ server cho các Chunk `10×10` trong màn hình).
     - Kiểm tra quyền sở hữu khi chọn ô Vương Quốc: chỉ cho phép truy cập Vương Quốc do chính người chơi sở hữu.
   - `/src/App.tsx`: Đồng bộ lưu/tải trạng thái Vương Quốc (`KingdomSaveData`) và vị trí Vương Quốc lên Firestore theo thời gian thực.
   - `/GAME_RULES.md`: Ghi chú đầy đủ quy tắc Online, Bản Đồ Thế Giới `50×50`, Chunk `10×10`, và Viewport Culling vào sổ tay thiết kế.
