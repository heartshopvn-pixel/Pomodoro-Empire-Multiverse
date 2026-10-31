# SỔ TAY QUY TẮC THIẾT KẾ & KIẾN TRÚC GAME (`GAME_RULES.md`)

Tài liệu này là **Hiến pháp Thiết kế & Kỹ thuật** của trò chơi, được kết nối trực tiếp với hệ thống kiểu dữ liệu và các hàm khởi tạo chuẩn (*Factory/Helper functions*) trong `src/types/game.ts` và `src/components/PixelArtPortrait.tsx`.
Mọi lần cập nhật hoặc mở rộng tính năng mới (vẽ icon kỹ năng, thêm trang bị, ngọc khảm, thêm quân đội, tạo quái mới hay tạo bản đồ mới) **bắt buộc phải đi qua bộ lọc quy tắc này**.

---

## MỤC 1: Quy Tắc Vẽ Icon Kỹ Năng (Chuẩn Warcraft 6 Tông Màu & Phân Biệt Chủ Động / Bị Động)
- **Phạm vi áp dụng**: Chỉ áp dụng **riêng biệt cho việc vẽ các Icon Kỹ Năng** (thông qua component `<WarcraftSkillIcon />` trong `src/components/PixelArtPortrait.tsx` và hàm khởi tạo `defineSkill(...)` trong `src/types/game.ts`). Không áp dụng lên icon trang bị hay công trình.
- **Phong cách hiển thị**: Mỗi icon kỹ năng (`16x16` pixel art) bắt buộc có **nền phát sáng chuyển sắc đa lớp + tia năng lượng góc + khung viền kiểu Warcraft**, làm nổi bật biểu tượng kỹ năng ở trung tâm.
- **Quy tắc Viền Kỹ Năng Chủ Động vs. Bị Động (`isPassive`)**:
  - **Kỹ năng có thể kích hoạt (Chủ động — `isPassive: false`)**: Viền icon là **viền liền thường (`border-solid`)**, bấm chuột trái hoặc nhấn phím tắt **`Q / W / E / R`** sẽ có hiệu ứng bấm nút và kích hoạt hồi chiêu (`cooldownSec`).
  - **Kỹ năng bị động (`isPassive: true`)**: Viền icon bắt buộc là **đường đứt khúc (`border-dashed` + pixel dashed stroke)** để phân biệt trực quan với kỹ năng chủ động.
- **Quy tắc Tô Màu Nổi Bật Mô Tả Kỹ Năng (Không Hiển Thị Dấu `[]` — `getSkillBracketColorHex` & `<FormattedSkillDescription />`)**:
  - Trong chuỗi gốc, các cụm chỉ số được đánh dấu trong `[...]`, nhưng khi hiển thị ra giao diện sẽ **tự động loại bỏ hoàn toàn các dấu `[` và `]`**, giữ nguyên chỉ số in đậm và màu sắc nổi bật theo quy tắc:
    - Sát thương vật lý (ví dụ `130% ATK`): Trùng màu `ATK` (`#fbbf24`)
    - Sát thương phép (ví dụ `10% Phép/giây`): Màu Tím (`#c084fc`)
    - Thời gian hiệu ứng (ví dụ `5s`, `8s`): Màu Xanh dương (`#38bdf8`)
    - Buff / Khiên / Tỉ lệ (ví dụ `Lá Chắn 15% HP`, `20% tỉ lệ`): Màu Vàng (`#fde047`)
    - Hồi máu: Màu Xanh lá cây (`#4ade80`)
- **6 Tông Màu Nền Chuẩn (`SkillColorTheme` & `SKILL_THEME_META`)**:
  1. **Tấn công vật lý (`PHYSICAL`)**: Tông nền **Đỏ** (`#ef4444` / `#dc2626` / `#450a0a`)
  2. **Phép thuật (`MAGIC`)**: Tông nền **Tím** (`#a855f7` / `#9333ea` / `#2e1065`)
  3. **Phòng thủ (`DEFENSE`)**: Tông nền **Xanh lam** (`#3b82f6` / `#2563eb` / `#172554`)
  4. **Cường hóa / Buff (`BUFF`)**: Tông nền **Vàng** (`#eab308` / `#ca8a04` / `#451a03`)
  5. **Suy yếu / Debuff (`DEBUFF`)**: Tông nền **Xanh ngọc bích** (`#14b8a6` / `#0d9488` / `#042f2e`)
  6. **Hồi máu (`HEAL`)**: Tông nền **Xanh lá cây** (`#22c55e` / `#16a34a` / `#052e16`)
- **Hàm khởi tạo bắt buộc**: Khi thêm bất kỳ kỹ năng mới nào trong `src/types/game.ts`, luôn khởi tạo qua `defineSkill({ id, name, chancePercent, isPassive, cooldownSec, theme, description })` và hiển thị bằng `<WarcraftSkillIcon skill={...} />` + `<FormattedSkillDescription text={...} />`.

---

## MỤC 2: Quy Tắc Hệ Thống 20 Chỉ Số, Trang Bị & Ngọc Khảm
- **20 Chỉ số chiến đấu & Bảng màu gốc (`UnitCombatStats`, `STAT_COLOR_HEX` & `STAT_META_INFO`)**:
  - Tổng cộng **20 chỉ số** (10 chỉ số chính luôn hiển thị + 10 chỉ số nâng cao ẩn mặc định):
    - **10 Chỉ số chính**: `HP` (Health Points), `REG` (Health Regeneration), `ATK` (Attack), `DEF` (Defense), `MAR` (Magic Resistance), `ATS` (Attack Speed), `CRT` (Critical Rate), `EVA` (Evasion), `CRD` (Critical Damage), `SPD` (Movement Speed).
    - **10 Chỉ số ẩn (Mở rộng / Thu gọn)**:
      - `DMG%` (Damage Bonus %), `RES%` (Damage Reduction %), `PEN%` (Armor Penetration %), `PEN` (Flat Penetration)
      - `LST%` (Lifesteal % — đổi tên từ Hút Máu), `BLK` (Damage Block — đổi tên từ Chặn ST)
      - `DBR%` (Debuff Resistance % — giảm % thời gian chịu debuff và khống chế)
      - `EFF%` (Buff Effectiveness % — tăng % lượng hồi máu nhận vào thông qua kỹ năng hồi máu của bản thân hoặc đồng minh, hút máu `LST%` và lượng tạo khiên)
      - `SKD%` (Skill Damage % — mặc định `100%`, nhân sát thương kỹ năng đầu ra của cả kỹ năng chủ động và bị động)
      - `CLD%` (Cooldown Reduction % — giảm % thời gian hồi của tất cả kỹ năng chủ động)
  - Mọi dòng cộng chỉ số (trên thẻ trang bị, ngọc khảm, tooltip và bảng Wiki) phải lấy màu chữ từ hằng số `STAT_COLOR_HEX[statKey]` để đồng bộ 100% với màu gốc của chỉ số đó trên bảng thông tin.
  - Công thức giảm sát thương của Giáp vật lý (`DEF`) và Kháng phép (`MAR`) tuân theo công thức chuẩn Liên Minh Huyền Thoại (`getLoLDamageMultiplier` = `100 / (100 + resist)`).
- **6 Ô Trang Bị Dùng Chung (`EquipmentSlot` & `EQUIPMENT_SLOTS_ORDER`)**:
  - Anh Hùng và Quân Lính dùng chung hệ thống 6 ô trang bị: **Mũ (`HELMET`), Áo (`ARMOR`), Vũ Khí (`WEAPON`), Giày (`BOOTS`), Nhẫn (`RING`), Dây Chuyền (`AMULET`)**.
  - **Quy tắc độc quyền chỉ số `SPD`**: Chỉ số Tốc độ di chuyển (`SPD`) **chỉ được phép nằm trong trang bị Giày (`BOOTS`)**. Hàm `defineEquipmentItem(...)` và `getUnitTotalBonusStats(...)` tự động loại bỏ `spd` nếu đặt nhầm ở ô khác.
- **5 Bậc Phẩm Chất & Số Dòng Thuộc Tính (`EquipmentRarity` & `EQUIPMENT_RARITY_META`)**:
  1. **Trắng (`WHITE` — Phổ Thông)**: 1 dòng thuộc tính cơ bản.
  2. **Xanh Lá (`GREEN` — Tinh Lương)**: 2 dòng thuộc tính.
  3. **Xanh Lam (`BLUE` — Hiếm)**: 3 dòng thuộc tính.
  4. **Tím (`PURPLE` — Sử Thi)**: 4 dòng thuộc tính (có thể xuất hiện `DMG%`, `RES%`, `PEN`, `PEN%`; riêng *Nhẫn Huyết Long* có `LST%`).
  5. **Vàng (`GOLD` — Huyền Thoại)**: 5 dòng thuộc tính (có thể xuất hiện `LST%` và `BLK` cực hiếm).
- **Cường Hóa & Ngọc Khảm (`defineEquipmentItem` & `defineGemItem`)**:
  - Trang bị nâng cấp từ `+0` đến tối đa `+5` (`getUpgradedEquipmentStats` cộng `+20%` chỉ số trang bị mỗi cấp cường hóa).
  - Mỗi trang bị khảm tối đa 1 viên **Đá Quý (`GemItem`)** mang duy nhất 1 dòng thuộc tính và có 5 bậc phẩm chất tương ứng.

---

## MỤC 3: Quy Tắc Anh Hùng (Lv.1–50), Quân Lính (T1–T10) & Quái Vật (Theo Level)
- **3 Loại Troop Trong Quân Đội (`TroopCategory`)**:
  1. **Anh Hùng (`HERO`)**: Ví dụ Anh Hùng **Farel** (đã thay thế hoàn toàn Đức Vua). Triệu hồi từ công trình **Điện Anh Hùng (`HERO_ALTAR`)** — Cấp 1 triệu hồi được 1 Anh Hùng, chi phí nâng cấp Điện Anh Hùng rất đắt đỏ để mở thêm giới hạn triệu hồi (`+1` mỗi cấp).
  2. **Quân Lính (`SOLDIER` — bao gồm cả Nông Dân)**: Gồm Nông Dân (`PEASANT`), Cấm Vệ Quân (`SOLDIER_MELEE`), Cung Thủ Hoàng Gia (`SOLDIER_RANGED`).
  3. **Quân Đồng Minh (`ALLY`)**: Quân đội từ vương quốc khác gửi sang chi viện/đồn trú khi tương tác liên vương quốc.
- **Hệ Thống Cấp Độ Anh Hùng (`Lv.1` -> `Lv.50`)**:
  - Cấp tối đa của Anh Hùng là **`HERO_MAX_LEVEL = 50`**.
  - Mỗi cấp độ Anh Hùng tăng **`+5%` chỉ số gốc (`HERO_STAT_BONUS_PER_LEVEL = 0.05`)** và **chỉ áp dụng cho 3 chỉ số: `HP`, `ATK`, `DEF`** (xử lý tự động trong `getResearchedBaseStats`).
  - Anh Hùng có thanh kinh nghiệm màu tím nhỏ dưới chân dung (`50 / 100 exp`), nhận EXP mỗi khi bất kỳ kẻ địch nào bị tiêu diệt trên bản đồ (không hiển thị floating text EXP trên màn hình).
- **Hệ Thống Cấp Bậc Quân Lính (`[T1]` -> `[T10]`)**:
  - Nâng cấp tại Viện Nghiên Cứu (chỉ áp dụng cho các đơn vị Quân Lính: Cấm Vệ Quân, Cung Thủ Hoàng Gia, Nông Dân; không có nâng cấp Anh Hùng trong phần Nghiên Cứu), mỗi cấp `T` cộng **`+15%` (`TIER_BONUS_PER_LEVEL = 0.15`)** vào 4 chỉ số cơ bản: `HP`, `ATK`, `DEF`, `MAR`.
- **Hệ Thống Sinh Quái & Wiki Kẻ Địch (`defineEnemyWikiEntry` & `computeEnemyStatsForLevel`)**:
  - Trong `UNIT_WIKI_DATABASE`, mỗi loại kẻ địch **chỉ lưu duy nhất 1 thông số gốc cố định (Level 1)** thông qua `defineEnemyWikiEntry(...)`.
  - Kẻ địch chỉ mạnh hơn khi sinh ra ở Level cao hơn thông qua hàm `computeEnemyStatsForLevel(archetypeId, level)`:
    - **`HP`, `ATK`, `DEF`, `MAR`**: Tăng **`+10%` mỗi cấp** (`ENEMY_STAT_BONUS_PER_LEVEL = 0.10`).
    - **Kinh nghiệm thưởng (`expReward`)**: Tăng **`+20%` mỗi cấp** (`ENEMY_EXP_BONUS_PER_LEVEL = 0.20`), cộng cho mọi Anh Hùng hiện có trên bản đồ khi quái chết.
  - Cho phép click chuột trái trực tiếp vào đơn vị quân địch trên bản đồ để xem chỉ số trên Thẻ Thông Tin giống như quân ta.

---

## MỤC 4: Quy Tắc Giao Diện HUD, Định Dạng Chữ & 5 Thẻ Bottom Bar
- **Định dạng số, Chuỗi chỉ số & Nickname Đơn Vị**:
  - Mọi con số từ hàng nghìn trở lên bắt buộc ngăn cách bằng dấu chấm `.` (ví dụ: `1.000`, `10.000`) qua hàm `formatNumberDot(value)`.
  - Giữa tên chỉ số (kèm dấu `:`) và con số **chỉ có đúng 1 khoảng trắng** (ví dụ: `ATK: 16`, `DEF: 25`) qua hàm `formatStatLine(label, value)`. Trong phần mô tả kỹ năng (`FormattedSkillDescription`), các cụm chỉ số được tô màu (như `130% ATK`, `20% tỉ lệ`) giữ đúng 1 khoảng cách chuẩn của font chữ thường (`font-sans`).
  - **Hệ Thống Đặt Nickname Cho Toàn Bộ Đơn Vị**:
    - Hiển thị tên đơn vị màu vàng (ví dụ: `"Anh hùng Farel [Cấp 1]"` hoặc `"Cấm Vệ Quân [T1]"`), kế tiếp là `"- nick name"` màu trắng (nếu đã đặt), kế đến là **icon cây bút nhỏ (`Pencil`)** cho phép đặt hoặc chỉnh sửa nickname trực tiếp cho đơn vị đó.
- **Bố Cục 5 Thẻ Trên Thanh Bottom Bar (Cạnh trên & dưới của mọi thẻ luôn bằng nhau tuyệt đối)**:
  - **Quy tắc Khi Không Chọn Đơn Vị / Công Trình Nào**: Khi không chọn bất kỳ đơn vị, kẻ địch, công trình hay vật phẩm Trang Viên nào trên bản đồ, **Thẻ Thông Tin, Thẻ Trang Bị và Thẻ Kỹ Năng bắt buộc hiển thị trống hoàn toàn** (Khung Avatar trống, Tên trống, Chỉ số trống, 6 ô Trang Bị trống, 4 ô Kỹ Năng `Q W E R` trống) — tuyệt đối không tự động hiển thị thông tin của Anh Hùng khi chưa chọn.
  - **Cụm 4 thẻ dính liền bên trái**:
    1. **Thẻ 1 — Thẻ Thông Tin**:
       - Chiều ngang thu hẹp gọn đẹp; Icon Avatar đơn vị kích thước lớn; riêng đối với Anh Hùng đang được chọn, thanh EXP có chiều dài bằng đúng cạnh hình vuông Avatar, không bo góc (`rounded-none`) và gắn liền trực tiếp vào đáy Avatar.
       - Hiển thị 10 chỉ số chính (`HP`, `REG`, `ATK`, `DEF`, `MAR`, `ATS`, `CRT`, `EVA`, `CRD`, `SPD`) kèm **Nút Mở rộng / Thu gọn** để xem toàn bộ 10 chỉ số nâng cao ẩn (`DMG%`, `RES%`, `PEN%`, `PEN`, `LST%`, `BLK`, `DBR%`, `EFF%`, `SKD%`, `CLD%`) ngay cả khi bằng `0`.
       - Khi rê chuột lên bất kỳ chỉ số nào, ô chỉ số sẽ highlight và hiện Tooltip gồm **tên Tiếng Anh đầy đủ của từ viết tắt** kèm **mô tả ngắn về chức năng chỉ số**.
    2. **Thẻ 2 — Thẻ Trang Bị (Hình chữ nhật đứng)**: Dính liền bên phải Thẻ Thông Tin; chứa gọn 6 ô trang bị hình vuông (`2x3`), viền màu theo phẩm chất, hiển thị cấp `[+x]`, icon đá khảm và rê chuột lên để xem tooltip chi tiết trang bị.
    3. **Thẻ 3 — Thẻ Kỹ Năng (Hình vuông `Q W E R`)**: Dính liền bên phải Thẻ Trang Bị; chứa gọn 4 ô vuông kỹ năng (`2x2`) gán nhãn **`Q`, `W`, `E`, `R`**. Đối với kỹ năng chủ động của đơn vị đang chọn, `Q W E R` cũng là phím tắt kích hoạt (kèm hiệu ứng bấm nút & đếm ngược Cooldown giảm theo `CLD%`); kỹ năng bị động có viền đứt khúc (`border-dashed`) và hoạt động tự động.
    4. **Thẻ 4 — Thẻ Bản Đồ Minimap (Hình vuông)**: Dính liền bên phải Thẻ Kỹ Năng; nút **`-` nằm ở góc dưới bên trái**, nút **`+` nằm ở góc dưới bên phải** của thẻ để thu nhỏ / phóng to theo 3 mức zoom (không hiển thị chữ `x1, x2, x3`); kích thước công trình trên Minimap gọn gàng, cân đối; hỗ trợ click/kéo chuột để di chuyển nhanh Camera.
  - **Thẻ 5 — Thẻ Các Nút Chức Năng Game (Nằm bên phải, cách Thẻ Minimap một khoảng trống)**: Gom gọn 6 nút (`Thư Tín`, `Kho Đồ`, `Cửa Hàng`, `Doanh Trại`, `Trang Bị`, `Nghiên Cứu`) vào 1 thẻ lưới `3x2`.

---

## MỤC 5: Quy Tắc Tạo Map Mới, Bản Đồ Thế Giới Online `50×50` (Viewport Chunking) & Kinh Tế Thời Gian Thực
- **Quy Tắc Thống Nhất Đồ Họa Giữa Các Bản Đồ**:
  - **Bản Đồ Thế Giới (`WORLD_MAP` — `50x50` Ô = 2.500 Ô, chia 25 Chunks `10x10`)**: Thống nhất sử dụng **Đồ Họa 2D Pixel 8-Bit Cổ Điển** (lưới vuông phẳng 2D).
  - **Bản Đồ Vương Quốc (`KINGDOM_MAP`) & Bản Đồ Trang Viên (`MANOR`)**: Thống nhất 100% sử dụng **Đồ Họa Isometric 2.5D** (mặt đất hình thoi tỉ lệ `2:1` kèm vách đá 3D `Isometric Diorama Slab Edge` và các công trình, đơn vị, hiệu ứng đứng thẳng `2.5D Depth-Sorted` theo chiều sâu `isoY`; đã loại bỏ hoàn toàn nút chuyển đổi 2D và phần vẽ map 2D cũ).
- **Bản Đồ Thế Giới Online Nhiều Người Chơi (`50x50` Pixel 8-Bit 2D • Chia 25 Chunks `10x10` • Viewport Loading)**:
  - **Đồng Bộ Địa Hình Tĩnh Bằng Hạt Giống Chung (`getDeterministicWorldTileAt(x, y)`)**: Toàn bộ 2.500 ô (`50x50`) gồm Đồng bằng, Dãy núi, Rừng già, Dòng sông, Toán quân địch (`Lv.1..10`), Khu mỏ (`GOLD`, `STONE`, `WOOD`, `FOOD`) được đồng bộ 100% giữa mọi người chơi bằng công thức toán học cố định theo tọa độ `(x, y)` mà không tốn băng thông tải địa hình tĩnh.
  - **Chỉ Tải & Vẽ Ô Trong Màn Hình Hiển Thị (`Viewport Loading & Spatial Chunking 10x10`)**:
    - Bản đồ `50x50` được chia thành **25 Chunks (`chunk_0_0` đến `chunk_4_4`)**, mỗi Chunk kích thước **`10x10` ô**.
    - Khi người chơi di chuyển camera (`WASD`, phím mũi tên hoặc kéo chuột) hoặc thu phóng (`Scroll Wheel`), hệ thống tính khung nhìn hiện tại `(minGx..maxGx, minGy..maxGy)` và chỉ mở kết nối lắng nghe thời gian thực (`ViewportChunkSubscriptionManager` trên Firebase Firestore `world_tiles`) cho đúng **các Chunks `10x10` đang nằm trong màn hình hiển thị**.
    - Các Chunks và ô nằm ngoài màn hình hiển thị sẽ tự động ngắt kết nối lắng nghe, giải phóng bộ nhớ và không gọi lệnh vẽ Canvas, giữ tốc độ 60 FPS ổn định dù có hàng trăm Vương Quốc trên bản đồ.
  - **Phân Quyền Sở Hữu Vương Quốc Tuyệt Đối (`Firebase Firestore + Security Rules`)**:
    - Mọi người chơi đều nhìn thấy vị trí, tên, cấp độ và chủ sở hữu của tất cả các Vương Quốc trên Bản Đồ Thế Giới (`world_tiles/{tileId}`), nhưng dữ liệu chi tiết bên trong Vương Quốc (`kingdom_saves/{kingdomId}`) được bảo vệ nghiêm ngặt bởi `firestore.rules` (`resource.data.ownerId == request.auth.uid`).
    - Người chơi **chỉ được phép bấm `Truy Cập Vương Quốc` đối với Vương Quốc do chính bản thân sở hữu**; khi chọn Vương Quốc của người chơi khác trên bản đồ thế giới, nút truy cập sẽ khóa kèm thông báo *"Vương Quốc Của Người Chơi Khác (Chỉ Chủ Sở Hữu Mới Được Truy Cập)"*.
- **Bản Đồ Chiến Đấu / Vương Quốc (`KINGDOM_MAP` — Isometric 2.5D)**:
  - **Góc Nhìn Isometric 2.5D Thống Nhất (Tỉ Lệ Kim Cương `2:1`)**:
    - Mặt đất Vương Quốc và Trang Viên được chiếu cố định theo hệ trục **Isometric 2.5D (`worldToIso` / `isoToWorld` / `applyIsoGroundTransform`)** tạo thành bàn cờ hình thoi `2:1` có vách địa tầng 3D (`Isometric Diorama Slab Edge`), trong khi các Công trình, Cây cối, Mỏ đá/vàng, Anh Hùng, Quân Lính, Kẻ Địch, Hiệu ứng Kỹ năng và Sát thương đứng thẳng 2.5D (`Depth-Sorted`) theo chiều sâu `isoY`.
  - **Di chuyển Camera bằng Nắm & Kéo Chuột Trái (`100ms` Hold-to-Pan)**: Đè giữ chuột trái trong **`100ms`** (giảm từ `280ms` xuống còn `100ms`) sẽ lập tức chuyển con trỏ thành bàn tay nắm (`cursor-grabbing`) để kéo thả di chuyển bản đồ cực nhạy; quét chuột trái nhanh trước `100ms` sẽ kéo khung chọn quân (`Drag-box marquee`), click chuột trái đơn dùng để chọn đơn vị/công trình hoặc kích hoạt hướng kỹ năng, còn chuột phải dùng để ra lệnh di chuyển/tấn công.
  - **Nhà Dân (`TOWN_HALL`)**: Model mái nhà gỗ ấm cúng hợp lý; ngay từ **Cấp 1 đã có sẵn `1/1` dân rảnh rỗi** (mỗi cấp tăng thêm `+1` dân).
  - **Ruộng Lúa (`FARM`)**: Mỗi nông dân được điều phối làm việc tại Ruộng Lúa tạo ra **`+1` Lương thực / phút thực tế** (tối đa 5 dân ứng với 5 cấp Ruộng Lúa), thu hoạch và vận chuyển về **Nhà Kho (`WAREHOUSE`)**.
  - **Tiêu thụ Lương thực**: Dân thường và quân lính tiêu thụ lương thực tính theo giờ thực tế, hiển thị trực quan trên thanh trạng thái.
  - **Quy tắc Thử Nghiệm Vật Phẩm trong Kho Đồ (Starter Test Items Rule)**:
    - **Tất cả các item tạo ra đều cho sẵn `1` item vào Kho Đồ (`INITIAL_INVENTORY_ITEMS` & đồng bộ vào bản lưu) để thử nghiệm** (bao gồm các bản thiết kế công trình, `Thẻ Anh Hùng Farel`, `Thẻ Cấm Vệ Quân`, `Thẻ Cung Thủ`, v.v.). Sau này khi game chạy chính thức chỉ cần xóa danh sách thử nghiệm này là xong.
  - **Hệ thống Triệu Hồi bằng Thẻ tại Điện Anh Hùng (`HERO_ALTAR`) và Trại Lính (`BARRACKS`)**:
    - **Điện Anh Hùng (`HERO_ALTAR`)**: Bấm nút **`Triệu Hồi`** sẽ xổ ra danh sách các Anh Hùng có thể triệu hồi. Anh Hùng chỉ **sáng đèn** để triệu hồi nếu có thẻ của Anh Hùng đó trong Kho Đồ (`Thẻ Anh Hùng Farel`) và chưa có mặt trên bản đồ (`0/1`); nếu không có thẻ (hoặc đã triệu hồi `1/1`) thì **tối đèn**, không triệu hồi được. Sau khi triệu hồi sẽ tiêu hao mất 1 thẻ đó. Các Anh Hùng là duy nhất và chỉ có thể triệu hồi 1 lần vào bản đồ.
    - **Trại Lính / Doanh Trại (`BARRACKS`)**: Bấm nút **`Tạo Quân`** duy nhất sẽ xổ ra danh sách các loại quân (`Cấm Vệ Quân`, `Cung Thủ Hoàng Gia`). Loại quân sáng đèn nếu có `Thẻ Cấm Vệ Quân` hoặc `Thẻ Cung Thủ` tương ứng trong Kho Đồ, tối đèn nếu không có thẻ. Khi tạo quân sẽ tiêu hao 1 thẻ tương ứng và có thể tạo nhiều quân cùng loại.
  - **Phím tắt Chiến Thuật & Kỹ Năng**:
    - **`Q / W / E / R`**: Kích hoạt 4 ô kỹ năng của đơn vị đang chọn.
    - **`D`**: Bật / Tắt chế độ **Giữ Vị Trí** (quay về vị trí ban đầu sau khi giao tranh xong).
    - **`F`**: Thay đổi kiểu **Sắp Trận / Xếp Đội Hình** (Cụm → Dọc → Ngang → Tròn).
    - **`1 / 2 / 3 / 4 / 5`**: Bấm `1..5` để gọi đội, `Ctrl + 1..5` (hoặc Chuột phải / bấm ô trống khi đang chọn quân) để đặt đội. Cụm nút góc dưới bên phải bản đồ sắp xếp theo thứ tự từ trái sang phải: `1 2 3 4 5 D F`.
  - **Hồi máu mỗi 5 giây (`REG`)**:
    - Khi máu đơn vị đã đạt tối đa (`hp >= maxHp`) thì dừng hồi máu hoàn toàn và không hiển thị số hồi máu (`floating text`) nhảy trên đầu đơn vị.
  - **Hệ Thống 23 Chỉ Số (`MAG`, `RAN`, `CP`) & Bố Cục 6 Hàng x 4 Cột**:
    - Thêm chỉ số **`MAG` (Magic Power - Sức mạnh phép thuật)**: Ảnh hưởng đến các kỹ năng gây sát thương phép hoặc kỹ năng hỗ trợ, hồi máu.
    - Thêm chỉ số **`RAN` (Range - Tầm đánh)**: Thể hiện tầm đánh của đơn vị; cố định theo binh chủng và **không có trong trang bị**.
    - Đưa **`SPD`** vào nhóm **12 chỉ số nâng cao (mở rộng)**; cập nhật quy tắc: **Chỉ số `SPD` luôn có ở Giày (`BOOTS`) và chỉ Giày mới có `SPD`**.
    - **Bố cục hiển thị 4 chỉ số mỗi hàng (6 hàng x 4 cột)**:
      - Hàng 1 (Chính): `HP` | `(trống)` | `REG` | `CP`
      - Hàng 2 (Chính): `ATK` | `MAG` | `DEF` | `MAR`
      - Hàng 3 (Chính): `CRT` | `EVA` | `CRD` | `ATS`
      - Hàng 4 (Nâng cao): `DMG%` | `RES%` | `PEN` | `PEN%`
      - Hàng 5 (Nâng cao): `LST%` | `BLK` | `DBR%` | `EFF%`
      - Hàng 6 (Nâng cao): `SKD%` | `CLD%` | `SPD` | `RAN`
  - **Doanh Trại (`Doanh Trại Vương Quốc`) & Wiki (`Wiki Kẻ Địch`)**:
    - **Thẻ đơn vị trong Doanh Trại**: Sử dụng thiết kế thẻ của Wiki với kích thước nhỏ gọn hơn, đồng bộ đầy đủ 6 ô trang bị riêng lẻ của từng đơn vị, chỉ số `CP`, thanh máu và có nút **`Hiện / Ẩn chỉ số & kỹ năng`** để xem gọn gàng 23 chỉ số theo đúng bố cục 6 hàng x 4 cột cùng hộp mô tả kỹ năng.
    - **Thanh HP & EXP trong Doanh Trại & Thẻ Thông Tin**: Thanh HP bỏ bo góc (`rounded-none`), có viền mỏng (`border`). Thanh kinh nghiệm (`EXP`) trong thẻ Anh Hùng và Thẻ Thông Tin dùng **1 màu tím nhẹ (`#a855f7`), không dùng màu gradient**.
    - **Wiki**: Chỉ hiển thị danh sách **Kẻ Địch (`Quân Địch - Hắc Ám`)**, không hiển thị Quân Ta.
  - **Khung Hình Cố Định 16:9 Nằm Ngang & Chế Độ Full Màn Hình**:
    - Khung hình game luôn cố định tỉ lệ **16:9 nằm ngang** (`w-[min(100vw,calc(100vh*16/9))] h-[min(100vh,calc(100vw*9/16))] aspect-video`).
    - Trong phần **Cài Đặt**, tích hợp nút **Full Màn Hình (`Toàn Màn Hình`)** để bật/thoát chế độ toàn màn hình.
  - **Thanh Top Bar, Số Ngày & Tooltip Lương Thực (+/- Mỗi Phút / Ngày)**:
    - Nền của thanh **Top Bar** và **Bottom Bar** (cùng bảng mở rộng `+12 chỉ số`) dùng **màu nâu đơn giản đồng nhất, không dùng màu gradient**.
    - Toàn bộ thanh Top Bar giữ thiết kế vuông góc (`rounded-none`), các thẻ tài nguyên/tiền tệ hiển thị **Icon Pixel 16x16** và **con số màu trắng dùng font bình thường (`font-sans`)**.
    - Loại bỏ thẻ trạng thái ở góc trên bên trái bản đồ; chuyển **Số Ngày (`Ngày X · Giờ Phút`)** vào góc trái thanh Top Bar.
    - Khi rê chuột vào thẻ **Lương thực** trên thanh Top Bar, hiển thị bảng chi tiết lượng Lương thực **`+ / -` mỗi phút, mỗi giờ và mỗi ngày**.
  - **Thẻ Nhật Ký Thông Báo Góc Dưới Bên Trái Màn Hình**:
    - Đặt cố định một thẻ hình chữ nhật gắn sát góc dưới bên trái màn hình bản đồ (`bottom-0 left-0`), nền nâu tối trong suốt (`bg-[#1a0f08]/80`), chữ trắng kết hợp highlight màu sắc nổi bật cho các vật phẩm nhặt được, tăng/giảm tài nguyên và tiền tệ.
    - Thanh dài trên đầu thẻ có nút mũi tên **xuống / lên** để thu gọn hoặc mở rộng danh sách log thông báo.
  - **Cửa Hàng Vương Quốc (`Cửa Hàng` - Giá 0đ Test)**:
    - Mở từ nút **Cửa Hàng** ở Bottom Bar, cho phép mua mọi vật phẩm (Thẻ Anh Hùng & Quân Đội, Bản Vẽ Công Trình, Trang Bị Chiến Đấu, Đá Quý Khảm) với **giá 0đ** để thử nghiệm.

  - **Sương Tối Chiến Thuật RTS (`Fog of War` - Kiểu Warcraft) & Đồng Bộ Minimap**:
    - Bản đồ Vương Quốc áp dụng cơ chế **Sương Tối 3 trạng thái** chuẩn dòng game RTS (Warcraft):
      1. **Chưa khám phá (`UNEXPLORED` - Sương Đen Đặc)**: Phủ màn đêm đen thẫm (`rgba(4, 5, 10, 0.94)`), ẩn toàn bộ địa hình, tài nguyên và kẻ địch.
      2. **Đã khám phá (`EXPLORED` - Sương Mờ)**: Những vùng từng có công trình hoặc quân ta đi qua nhưng hiện tại nằm ngoài tầm nhìn sẽ chuyển sang lớp sương mờ tối (`rgba(6, 9, 16, 0.56)`), vẫn thấy địa hình & công trình tĩnh nhưng ẩn di chuyển của kẻ địch.
      3. **Trong tầm nhìn (`VISIBLE` - Sáng Rõ)**: Xung quanh các công trình của Vương Quốc (Tháp Canh và Lâu Đài có tầm nhìn xa hơn) và các đơn vị Quân Ta / Anh Hùng đang tuần tra sẽ mở sáng rõ hoàn toàn và phát hiện kẻ địch.
    - **Đồng bộ thời gian thực với Minimap**: Mọi vùng Sương Đen / Sương Mờ / Sáng Rõ và chấm đỏ kẻ địch trên Minimap đều cập nhật đồng bộ 100% với bản đồ chính.
    - **Trang Viên không có Sương Đen**: Khi tiến vào Trang Viên, toàn bộ bản đồ chính và Minimap đều sáng rõ 100%, không có sương tối.

  - **Công Trình Trang Viên (`MANOR`) — Cơ Chế Vương Quốc Ảo (`Virtual Kingdom`)**:
    - Giới hạn xây tối đa `1` Trang Viên trong Vương Quốc (có sẵn 1 bản vẽ `Thẻ Xây Trang Viên` trong Kho Đồ Vương Quốc và có bán giá `0đ` trong Cửa Hàng).
    - Khi bấm vào công trình **Trang Viên** đã xây trên bản đồ, trong Thẻ Thông Tin ở Bottom Bar xuất hiện nút **`Vào Trang Viên`**.
    - **Điều Kiện Truy Cập Trang Viên**: Chỉ khi **trên bản đồ Vương Quốc không có địch (`activeEnemyCount === 0`)** thì mới bấm được vào nút **`Vào Trang Viên`**. Nếu đang có quân địch trên bản đồ, nút `Vào Trang Viên` sẽ bị khóa để người chơi tập trung phòng thủ trước.
    - **Tạo Map Trang Viên bằng công cụ Map Vương Quốc Isometric 2.5D (`Vương Quốc Ảo`)**:
      - Trang Viên sử dụng trực tiếp công cụ tạo bản đồ Canvas Isometric 2.5D và Minimap của Vương Quốc (hỗ trợ kéo thả camera, phóng to/thu nhỏ, chiều sâu 2.5D đồng bộ với Vương Quốc).
      - Toàn bộ dữ liệu **Tài nguyên, Tiền tệ, Cấp độ Vương Quốc, Ngày giờ, Thời tiết** trên thanh Top Bar đều sao chép/đồng bộ y hệt Vương Quốc đang chứa Trang Viên đó.
      - Địa hình Trang Viên không có cây rừng hay mỏ khoáng sản cũng như không có Sương Đen; trung tâm bản đồ được tạo **1 Hồ Nước Nhỏ trong xanh lót Đá Tảng bao quanh hồ** cùng đường lát đá.
      - Khi ở trong Trang Viên:
        - **Ẩn toàn bộ Quân Đội, Anh Hùng, Nông Dân** (trên cả bản đồ chính và Minimap) vì họ đang ở ngoài bản đồ Vương Quốc, đồng thời **ẩn luôn công trình Trang Viên** ở bên trong Trang Viên.
        - **Khóa các chức năng chiến thuật**: **Đặt đội (`Ctrl+1..5`)**, **Gọi đội (`1..5`)**, **Giữ vị trí (`D`)**, **Sắp trận (`F`)** và **Kỹ năng (`Q/W/E/R`)** để tránh lỗi điều khiển quân khi đang ở trong Trang Viên.
        - **Tắt nút Phòng Thủ Chiến Đấu (`Đợt Địch`)** ở góc trên bên phải và thay bằng bảng trạng thái Trang Viên kèm nút **`Thoát Trang Viên`**.
        - **Khóa toàn bộ 6 nút chức năng trên thanh Bottom Bar** (`Thư Tín`, `Kho Đồ`, `Cửa Hàng`, `Doanh Trại`, `Trang Bị`, `Nghiên Cứu`).
        - Góc dưới cùng bên phải màn hình có nút **`Kho Đồ Trang Viên`** để mở túi đồ Trang Viên và đặt/thu hồi các vật phẩm (`Trang trí`, `Sưu tầm`, `Làm nông trại`, `Nuôi thú`...) trực tiếp trên bản đồ Canvas.
  - **Hệ Thống Hóa Item Toàn Cục (3 Túi Đồ Riêng Biệt & 5 Phẩm Chất Toàn Cục)**:
    - **3 thuộc tính vị trí túi đồ (`ItemBagDomain`)**:
      1. **`KINGDOM` (Item Vương Quốc — nằm trong `Kho Đồ Vương Quốc`)**: Bản vẽ công trình, Thẻ triệu hồi/chiêu mộ quân, Bình kinh nghiệm Anh Hùng...
      2. **`MANOR` (Item Trang Viên — nằm trong `Kho Đồ Trang Viên`)**: Vật phẩm trang trí (`DECORATION`), sưu tầm (`COLLECTIBLE`), làm nông trại (`FARMING`), nuôi thú (`LIVESTOCK`)...
      3. **`EQUIPMENT_GEM` (Item Trang Bị & Ngọc — nằm trong `Danh Sách Trang Bị & Ngọc`)**: Trang bị 6 ô và Đá quý khảm.
    - **5 Phẩm Chất Toàn Cục (`EquipmentRarity`) & Màu Viền Ô Vật Phẩm**:
      1. **Thường (`WHITE`)**: Viền màu Trắng (`#e5e7eb`)
      2. **Phổ biến (`GREEN`)**: Viền màu Xanh lá (`#4ade80`)
      3. **Hiếm có (`BLUE`)**: Viền màu Xanh lam (`#38bdf8`)
      4. **Siêu hiếm (`PURPLE`)**: Viền màu Tím (`#c084fc`)
      5. **Huyền thoại (`GOLD`)**: Viền màu Vàng (`#fbbf24`)
    - Các hàm khởi tạo chuẩn hóa `defineKingdomItem`, `defineManorItem`, `defineEquipmentItem` giúp thêm số lượng lớn vật phẩm kèm thuộc tính riêng mà không phát sinh lỗi.
  - **Đồ Họa 2D Pixel 8-Bit `16x16` Cho Mọi Vật Phẩm & 5 Dạng Lọ `Bình EXP Anh Hùng`**:
    - Toàn bộ vật phẩm trong game (Bình EXP, Vật phẩm Trang Viên, Thẻ Triệu Hồi, Bản Vẽ, Trang Bị, Đá Quý) đều được vẽ theo chuẩn **2D Pixel 8-Bit lưới `16x16`** đồng bộ hoàn toàn với hệ thống Icon Trang Bị (`EquipmentSlotIcon`): có viền tối phân tách (`#0f172a` / `#1c1917`), đổ bóng khối 3 lớp và điểm sáng phản quang (`specular highlight`).
    - Tích hợp **Bộ Tự Động Vẽ Pixel 8-Bit `16x16` Dự Phòng (Procedural 8-Bit Item Generator)**: Mọi vật phẩm mới thêm vào về sau (dù chưa khai báo sprite riêng) đều tự động được kết xuất thành biểu tượng Pixel 8-Bit `16x16` dựa theo tên, danh mục và phẩm chất.
    - **5 Bình Kinh Nghiệm Anh Hùng (`Bình EXP Anh Hùng` — 5 Phẩm Chất, 5 Dạng Lọ Khác Nhau, Tất Cả Đều Sắc Tím Tử Tinh)**:
      - Toàn bộ 5 bình EXP đều giữ màu viền ô theo đúng 5 phẩm chất (`Trắng`, `Xanh lá`, `Xanh lam`, `Tím`, `Vàng`), nhưng **dung dịch bên trong tất cả 5 bình đều thống nhất màu Tím (`#d8b4fe` -> `#a855f7` -> `#7e22ce` -> `#581c87`)** đồng bộ với thanh EXP màu tím của Anh Hùng:
      1. **Bình EXP Anh Hùng (Bé)** — Phẩm chất **Thường** (Viền Trắng, `+50 EXP`): **Ống nghiệm thủy tinh nhỏ (Slim Glass Test-Tube Vial)** nút bần gỗ, dung dịch tím tử tinh lấp lánh.
      2. **Bình EXP Anh Hùng (Nhỏ)** — Phẩm chất **Phổ biến** (Viền Xanh lá, `+150 EXP`): **Bình cầu nhỏ cổ thắt (Small Round Bulb Flask)** cổ buộc dây, dung dịch tím sủi bọt.
      3. **Bình EXP Anh Hùng (Vừa)** — Phẩm chất **Hiếm có** (Viền Xanh lam, `+400 EXP`): **Bình tam giác giả kim (Conical Erlenmeyer Crystal Flask)** cổ nạm bạc, dung dịch tím huyền ảo.
      4. **Bình EXP Anh Hùng (Lớn)** — Phẩm chất **Siêu hiếm** (Viền Tím, `+1.000 EXP`): **Bình hồ lô 2 bầu (Ornate Twin-Gourd Royal Elixir)** thắt đai vàng kim, nắp ngọc tím, dung dịch tử tinh đậm đặc.
      5. **Bình EXP Anh Hùng (Đại)** — Phẩm chất **Huyền thoại** (Viền Vàng, `+2.500 EXP`): **Bình cầu tròn hoàng kim (Majestic Spherical Royal Orb Bottle)** thân tròn trịa cân đối ôm đai hoàng kim đính bảo ngọc, nắp vương miện vàng, chứa đại linh dịch tử tinh rực rỡ.
    - Khi bấm vào Bình EXP Anh Hùng trong `Kho Đồ Vương Quốc` và chọn nút **`Sử dụng`**, hệ thống sẽ xổ xuống danh sách các **Anh Hùng hiện có trong Doanh Trại**; bấm chọn Anh Hùng nào sẽ tiêu hao 1 bình và cộng trực tiếp lượng EXP đó cho Anh Hùng (tự động lên cấp và cộng +5% chỉ số gốc mỗi cấp).
  - **Trại Hồi Sức (`isRecuperating`) & Nút `Hồi Sinh Quân Đội`**:
    - **Cơ chế Trại Hồi Sức**: Khi Quân Đội, Anh Hùng hoặc Nông Dân bị hạ gục (`hp <= 0`), đơn vị đó **không bị xóa bỏ** mà được đưa vào **Trại Hồi Sức** (`isRecuperating = true`, `hp = 0`). Toàn bộ dữ liệu của đơn vị (Cấp độ, EXP, Biệt danh, Trang bị đang mặc, Chỉ số...) vẫn được giữ nguyên.
    - **Đếm đầu người & Giới hạn tối đa**: Đơn vị đang trong Trại Hồi Sức **vẫn được tính là đang sống** trong tổng quân số (`Anh Hùng: 1/1`, `Quân Lính: X/Max`, `Nông Dân`), ngăn việc triệu hồi hoặc chiêu mộ thêm vượt quá giới hạn tối đa.
    - **Hiển thị trong Doanh Trại Vương Quốc**: Thẻ của đơn vị đang hồi sức vẫn giữ nguyên vị trí trong Doanh Trại nhưng chuyển sang giao diện **thẻ tối màu** kèm nhãn **`Đang Hồi Sức`** và thanh máu `HP: 0/Max (Đang Hồi Sức)`.
    - **Nút `Hồi Sinh Quân Đội`**: Nằm ngay bên dưới nút `Phòng Thủ · Đợt Địch` ở góc trên bên phải màn hình (và có nút nhanh trên thanh tiêu đề Doanh Trại khi có quân đang hồi sức). Khi bấm vào sẽ hồi sinh toàn bộ quân đội và anh hùng đang trong Trại Hồi Sức với 100% HP tại công trình tương ứng trong Vương Quốc.
  - **Kiến Trúc Khai Báo Mở Rộng Nhanh Đơn Vị / Anh Hùng / Kẻ Địch & Kỹ Năng (`Declarative Unit & Skill Engine`)**:
    - **Thêm Kỹ Năng Mới (`defineSkill` & `SkillMechanicsConfig`)**:
      - Chỉ cần khai báo dữ liệu trong `defineSkill({ id, name, type, cooldownSec, procChancePercent, iconGlyph, mechanics })`.
      - **Tự động sinh mô tả chuẩn Quy tắc 1**: Hàm `buildSkillDescriptionFromMechanics` tự động tạo chuỗi mô tả có cặp ngoặc vuông `[...]` để tô màu cam cho sát thương vật lý (`ATK`), xanh dương cho sát thương phép (`MAG`), xanh lá cho tỉ lệ/thời gian/tầm ảnh hưởng và hồng cho hồi máu.
      - **12 Biểu tượng Kỹ năng Pixel 8-Bit (`SkillIconGlyph`)**: Hỗ trợ sẵn 12 mẫu biểu tượng Warcraft Pixel (`HOLY_SWORD`, `POISON_ARROW`, `BLESSED_SHIELD`, `FIREBALL`, `LIGHTNING`, `ICE_NOVA`, `HEAL_LIGHT`, `WHIRLWIND`, `BLOOD_STRIKE`, `METEOR`, `WAR_CRY`, `DARK_CURSE`).
      - **Tự động thực thi Logic Chiến Đấu & VFX từ `mechanics`**: Vòng lặp chiến đấu (`renderLoop`) tự động đọc `unitSkill.mechanics` từ `UNIT_WIKI_DATABASE` để tính tỉ lệ kích hoạt, hệ số sát thương (`scaleStat` * `damageMultiplier` * `SKD%`), tạo Khiên/Hồi máu bản thân (`EFF%`), gắn hiệu ứng trạng thái lên mục tiêu (`POISON_DOT`, `BURN_DOT`, `SLOW_DEBUFF` giảm theo `DBR%`), đổi màu đạn bắn và phát hiệu ứng nổ VFX (`vfxKind`, `vfxColor`) mà không cần sửa code vòng lặp chiến đấu.
    - **Thêm Đơn Vị / Anh Hùng / Kẻ Địch Mới (`defineAllyWikiEntry` & `defineEnemyWikiEntry`)**:
      - Tự động chuẩn hóa đủ 23 chỉ số thông qua `createCombatStats(...)` và **tự động tính Lực Chiến (`CP` / `pow`)** bằng `computeUnitPower(...)`, loại bỏ hoàn toàn việc tính nhẩm thủ công hoặc thiếu chỉ số khi thêm hàng loạt đơn vị mới.
  - **Kiến Trúc Lưu Trữ Dữ Liệu Độc Lập Cho Từng Vương Quốc (`KingdomSaveData`) & Tối Ưu Hóa Quy Mô Hàng Trăm Vương Quốc**:
    - Mỗi Vương Quốc được lưu độc lập tuyệt đối trong `account.kingdoms[kingdomId]` và đồng bộ lên `/kingdom_saves/{kingdomId}`:
      - **Thông tin Vương Quốc & Thời Gian**: `kingdomLevel`, `kingdomExp`, `day`, `elapsedMinutes`, `weather`, `waveNumber`, `lastSavedAt`, `isInitialized`, `ownerId`, `ownerUsername`.
      - **Tài Nguyên & Tiền Tệ**: `resources` (`food`, `wood`, `stone`, `gold`, `diamonds`, `population`, `soldiers`, `prosperity`), `buildings`, `resourceNodes`, `manorObjects`, và 3 túi đồ riêng biệt (`inventoryItems`, `manorInventory`, `equipmentInventory` + `gemInventory`).
      - **Trạng Thái Chiến Thuật & Sương Tối Riêng Biệt**: Sương Tối (`exploredTilesRLE` nén bằng thuật toán Run-Length Encoding tiết kiệm >90% dung lượng), 5 Đội hình chiến thuật (`controlGroups` 1..5), chế độ Giữ Vị Trí (`holdPositionMode`), kiểu Sắp Trận (`formationMode`) và Hồi chiêu kỹ năng (`skillCooldownEndMap`).
      - **Dữ Liệu Đầy Đủ Của Từng Đơn Vị Riêng Biệt (`VillagerUnit`)**: Lưu riêng cho từng cá thể theo `unit.id` gồm `role`, `troopCategory`, `level`, `exp`, `maxExp`, cấp bậc `tier` (`T1..T10`), `nickname`, trọn bộ **23 chỉ số chiến đấu** (kèm `pow`/`CP`), bộ **6 ô trang bị + đá quý khảm** được sao chép sâu (`cloneUnitEquipmentLoadout`), kỹ năng riêng (`skillId`, `skills`), trạng thái `isRecuperating` (Trại Hồi Sức) và `statusEffects`.
    - **Tối ưu cho hàng trăm Vương Quốc trên Bản Đồ Thế Giới 50×50**:
      - Áp dụng **Viewport Spatial Chunking (`10x10` ô/chunk)** và **Viewport Frustum Culling** trên Canvas Bản Đồ Thế Giới (chỉ tải dữ liệu từ server và chỉ vẽ các ô nằm trong khung nhìn Camera).
      - Hỗ trợ **Lazy Hydration** (`isInitialized`) và nén RLE (`encodeExploredTilesRLE` / `decodeExploredTilesRLE`) giúp dữ liệu nhẹ, chuyển đổi giữa các Vương Quốc tức thì và ổn định ở 60 FPS.

