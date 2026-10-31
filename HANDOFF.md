# HANDOFF DOCUMENT — Vương Quốc Pixel (2D Pixel RTS Kingdom Builder)

> **Hướng dẫn khi chuyển sang tài khoản mới:**
> Khi bắt đầu phiên làm việc ở tài khoản mới, bạn chỉ cần nhắn câu đầu tiên:
> *"Hãy đọc file `/HANDOFF.md` để nắm toàn bộ quy tắc, kiến trúc và tiến độ hiện tại của dự án trước khi code."*

---

## 1. Nguyên Tắc Bất Di Bất Dịch (Core Rules)
1. **Chỉ chỉnh sửa những phần code cần thiết:** Luôn giữ tốc độ phản hồi nhanh, sửa đúng trọng tâm yêu cầu, không viết lại những phần đang chạy ổn định.
2. **100% Client-Side (Zero API):** Tuyệt đối không sử dụng bất kỳ API bên ngoài nào, không có Quân Sư AI, không gọi LLM hay backend để đảm bảo game luôn Publish được ngay.
3. **Ngôn ngữ giao tiếp & hiển thị:** Toàn bộ giao diện trong game và phản hồi đều bằng **Tiếng Việt**.
4. **Không rung màn hình (No Screen Shake):** Chiến đấu có hiệu ứng tụ lực (windup), đẩy lùi (knockback), văng hạt (particles), số sát thương nảy lên nhưng **tuyệt đối không làm rung camera**.

---

## 2. Cấu Trúc Thư Mục & File Quan Trọng
- `/src/types/game.ts`:
  - Định nghĩa toàn bộ kiểu dữ liệu, cấu trúc **14 chỉ số chiến đấu (`UnitCombatStats`)**, kỹ năng đơn vị (`SOLDIER_SKILLS`) và cơ sở dữ liệu **Wiki (`UNIT_WIKI_DATABASE`)** cho cả Quân Ta (`ALLY`) và Quân Địch (`ENEMY`).
  - Hàm `computeFinalStats(unitId, waveBonus)` tính tổng chỉ số cuối cùng (`baseStats + bonusStats`).
- `/src/utils/statusEffects.ts`:
  - Hệ thống **Buff / Debuff mở rộng** (`BLESSED_SHIELD`, `POISON_DOT`, ...).
  - Vẽ icon siêu nhỏ căn giữa phía trên thanh máu đơn vị:
    - **Buff:** Viền vàng rất mỏng (`#fbbf24`).
    - **Debuff:** Viền đỏ rất mỏng (`#ef4444`).
  - Lá chắn (`Shield`) hiển thị bằng thanh màu trắng ở cạnh phải thanh máu (nếu máu đầy thì đè lên cạnh phải thanh máu).
- `/src/utils/pixelSprites.ts`:
  - Engine vẽ Pixel Art 16-bit có bộ nhớ đệm offscreen (`spriteCache`) giúp game cực nhẹ.
  - Tự động tách nền trắng bằng thuật toán tràn viền (BFS flood-fill) cho ảnh nhân vật Cấm Vệ Quân tại `/public/assets/aistudio/image_28538eb4.png`.
- `/src/components/PixelArtPortrait.tsx`:
  - Vẽ avatar Pixel Art cho toàn bộ đơn vị (`KING`, `SOLDIER_MELEE`, `SOLDIER_RANGED`, `PEASANT`, `ENEMY_MELEE`, `ENEMY_RANGED`) và công trình (`TOWN_HALL`, `BARRACKS`, `FARM`).
- `/src/index.css`:
  - Phong cách giao diện **nền nâu sáng & nâu sẫm mịn** để chữ và số nổi bật rõ ràng, kết hợp **viền khắc bậc kiểu tường thành cổ**.
- `/src/App.tsx`:
  - Vòng lặp 60FPS, điều khiển RTS, tính toán sát thương 14 chỉ số, xử lý chiều sâu **2.5D Y-Sorting** (đơn vị đi phía sau hoặc phía trước công trình hợp lý) và toàn bộ HUD / Modal.

---

## 3. Cơ Chế Điều Khiển & Gameplay Hiện Tại
- **Di chuyển camera:** Phím `W`, `A`, `S`, `D`. Cuộn chuột (`Mouse Wheel`) để phóng to / thu nhỏ ngay tại vị trí mũi trỏ chuột.
- **Chuột trái (`Left Click`):**
  - Nhấp hoặc kéo thả khung xanh để chọn Đức Vua / Quân lính.
  - Nhấp vào công trình để mở bảng nâng cấp / chiêu mộ lính.
  - Nhấp vào **đất trống** để **huỷ chọn toàn bộ**.
- **Chuột phải (`Right Click`):**
  - Ra lệnh cho các đơn vị đang chọn di chuyển đến vị trí chỉ định, tấn công mục tiêu địch hoặc khai thác mỏ tài nguyên.
- **Tọa độ con trỏ chuột:** Đã đồng bộ chính xác với tỉ lệ `object-cover` của `<canvas>` để điểm chọn luôn nằm ngay tại **đỉnh mũi nhọn của con trỏ chuột**.

---

## 4. Hệ Thống 14 Chỉ Số & Quy Tắc Hiển Thị
### Giải nghĩa 14 chỉ số:
- `HP`: Máu hiện tại / Máu tối đa.
- `REG`: Lượng máu hồi mỗi **5 giây**.
- `ATK`: Tấn công cơ sở.
- `DEF`: Phòng thủ vật lý.
- `MAR`: Kháng phép.
- `ATS`: Tốc độ đánh (Mặc định `1.0` = 2 giây ra 1 đòn).
- `CRT`: Tỉ lệ chí mạng (`%`).
- `EVA`: Tỉ lệ né đòn đánh thường và cả kỹ năng (`%`, khi né hiện chữ `NÉ!`).
- `CRD`: Sát thương chí mạng (`%`, mặc định `150%`).
- `SPD`: Tốc độ di chuyển (Mặc định `100`).
- `DMG%`: Phần trăm sát thương tăng thêm trên tổng sát thương đầu ra.
- `RES%`: Phần trăm giảm thương đầu tiên (trừ trước khi tính `DEF`/`MAR`).
- `PEN%`: Xuyên giáp & xuyên kháng phép theo `%`.
- `PEN`: Xuyên giáp & xuyên kháng phép cộng thẳng (trừ thẳng vào `DEF`/`MAR`).

### Quy tắc hiển thị ở 2 nơi:
1. **Bảng thông tin đơn vị ở góc dưới trái (Ngoài màn hình chơi):**
   - Hiển thị **chỉ số tổng cuối cùng** (`base + bonus`).
   - **Chữ tên chỉ số và con số có cùng 1 màu** riêng biệt cho từng chỉ số, chia làm 4 hàng trong khung chữ nhật lớn.
   - **Tên kỹ năng** nằm trong 1 thanh hình chữ nhật đậm màu cạnh tên đơn vị; **mô tả kỹ năng chỉ hiện lên khi rê chuột vào tên kỹ năng**.
2. **Bảng Wiki (Nút Wiki ở góc phải Top Bar):**
   - Có 2 tab: **Quân Ta (Vương Quốc)** và **Quân Địch (Hắc Ám)** hiển thị dạng lưới kèm avatar đơn vị.
   - **Quân Ta:** Chỉ số cơ bản màu trắng (`#ffffff`) + chỉ số cộng thêm màu xanh lá (`#4ade80`, ví dụ `+20`), khoá `whitespace-nowrap` để không bao giờ bị rớt dòng.
   - **Quân Địch:** Chỉ hiển thị chỉ số cơ bản màu trắng.

---

## 5. Kỹ Năng Đơn Vị Đã Có
1. **Cấm Vệ Quân (`SOLDIER_MELEE`) — Kỹ năng: Đòn Phù Hộ**
   - Đòn đánh có `20%` tỉ lệ gây `130% ATK` vật lý và tạo lớp lá chắn trắng bằng `15% máu tối đa` trong `5s`.
   - Hiển thị icon khiên trắng siêu nhỏ (viền vàng mỏng) trên thanh máu và thanh khiên trắng bên phải thanh máu.
2. **Cung Thủ Hoàng Gia (`SOLDIER_RANGED`) — Kỹ năng: Tên Độc**
   - Đòn đánh có `20%` tỉ lệ gây `135% ATK` vật lý và gắn hiệu ứng độc DOT gây `10% ATK phép mỗi giây` trong `5s`.
   - Hiển thị icon độc siêu nhỏ (viền đỏ mỏng) trên thanh máu kẻ địch kèm hiệu ứng nổ độc xanh lá mỗi giây.

---

## 6. Quy Định Bất Di Bất Dịch Về Hệ Thống Trang Bị & Nghiên Cứu (Bắt Buộc Tuân Thủ Khi Tạo Trang Bị Mới)
1. **Dùng chung cho Anh Hùng & Quân Lính:**
   - Cả `Anh Hùng` (Đức Vua) và `Quân Lính` (Cấm Vệ Quân, Cung Thủ Hoàng Gia, Nông Dân) đều sử dụng chung hệ thống vật phẩm trang bị.
2. **6 Loại Ô Trang Bị (`EquipmentSlot`) & Phân Bổ Chỉ Số Hợp Lý:**
   - `HELMET` (**Mũ**): Tập trung `HP`, `DEF`, `MAR`, `RES%`.
   - `ARMOR` (**Áo**): Tập trung `HP`, `DEF`, `MAR`, `REG`.
   - `WEAPON` (**Vũ Khí**): Tập trung `ATK`, `ATS`, `CRT`, `PEN`, `PEN%`.
   - `BOOTS` (**Giày**): **ĐỘC QUYỀN chỉ số Tốc độ di chuyển (`SPD`)** kèm `EVA`, `DEF`/`MAR`. **Tuyệt đối không trang bị nào ngoài Giày được phép có chỉ số `SPD`!**
   - `RING` (**Nhẫn**): Tập trung `ATK`, `CRT`, `CRD`, `DMG%`.
   - `AMULET` (**Dây Chuyền**): Tập trung `HP`, `REG`, `MAR`, `RES%`, `PEN%`.
3. **5 Bậc Phẩm Chất Trang Bị (`EquipmentRarity`) & Màu Sắc Viền Chuẩn:**
   - Bậc 1 — **Trắng (`WHITE` - Phổ Thông):** Viền `#e5e7eb`.
   - Bậc 2 — **Xanh Lá (`GREEN` - Tinh Lương):** Viền `#4ade80`.
   - Bậc 3 — **Xanh Lam (`BLUE` - Hiếm):** Viền `#38bdf8`.
   - Bậc 4 — **Tím (`PURPLE` - Sử Thi):** Viền `#c084fc`.
   - Bậc 5 — **Vàng (`GOLD` - Huyền Thoại):** Viền `#fbbf24`.
4. **Đồng Bộ Trang Bị & Nghiên Cứu Vào Wiki:**
   - Cấp bậc **Nghiên Cứu `[T1 -> T10]`** cộng trực tiếp `%` vào 4 chỉ số cơ bản màu trắng (`HP`, `ATK`, `DEF`, `MAR`) trong Wiki.
   - Chỉ số của **6 Trang Bị** đang mặc cộng trực tiếp vào **chỉ số cộng thêm màu xanh lá (`+xx`)** trong Wiki và cập nhật ngay cho các đơn vị trên bản đồ.
   - Dưới Avatar của mỗi đơn vị Quân Ta trong **Wiki** luôn có **6 ô vuông nhỏ** đại diện cho 6 món trang bị: nếu đơn vị đang mặc món nào thì ô đó sáng lên và hiển thị màu viền tương ứng với 5 bậc phẩm chất (`Trắng / Xanh lá / Xanh lam / Tím / Vàng`).

