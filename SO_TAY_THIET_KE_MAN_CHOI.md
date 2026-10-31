# SỔ TAY THIẾT KẾ MÀN CHƠI (LEVEL DESIGN HANDBOOK)

Tài liệu này tập hợp toàn bộ các quy tắc thiết kế, khởi tạo và vẽ bản đồ cho **Module Tự Động Hóa Tạo & Vẽ Map** (`src/utils/levelDesignHandbook.ts` & `src/utils/stageDesignHandbook.ts`).

> **Phạm vi hoạt động của Module Tự Động Hóa Tạo Map**:
> - Module này **không liên quan đến Bản Đồ Thế Giới 50×50** (`WORLD_MAP` giữ nguyên thuật toán đồng bộ cố định giữa mọi người chơi Online).
> - Module này chịu trách nhiệm tự động đọc quy tắc trong Sổ Tay để tạo mới ngẫu nhiên địa hình, mỏ tài nguyên và bố cục cho 3 loại bản đồ theo đúng thứ tự:
>   1. **Map Vương Quốc (`KINGDOM_MAP`)**
>   2. **Map Trang Viên (`MANOR_MAP`)**
>   3. **Map Màn Chơi / Phó Bản (`STAGE_MAP`)**

---

## 1. QUY TẮC TẠO & VẼ MAP VƯƠNG QUỐC (`KINGDOM_MAP`)

1. **Không gian & Góc nhìn**:
   - Lưới bản đồ: **30 cột × 18 hàng** (`GRID_COLS = 30`, `GRID_ROWS = 18`), mỗi ô `64×64 px` (`1920×1152 px` không gian thế giới).
   - Phép chiếu: **Isometric 2.5D** tỉ lệ thoi `2:1`, có cạnh khối đất nổi 3D (**3D Diorama Slab Edge** dày `22px`) bao quanh mép dưới bản đồ.
   - Camera: Kéo thả tự do, phóng to / thu nhỏ (`0.55x` – `2.2x`), điều hướng nhanh qua Minimap.

2. **Sương Mù Chiến Tranh (Fog of War - 3 trạng thái)**:
   - `0 = UNEXPLORED` (Sương đen): Chưa từng khám phá.
   - `1 = EXPLORED` (Sương mờ): Đã khám phá nhưng hiện không có đơn vị/công trình đứng gần; hiển thị địa hình, công trình, mỏ tài nguyên nhưng ẩn kẻ địch.
   - `2 = VISIBLE` (Sáng rõ): Trong tầm nhìn của công trình (`4 ô`) hoặc đơn vị quân ta (`3.5 ô`).

3. **Công trình khởi đầu & Quy tắc xây dựng**:
   - Khi khởi tạo Vương Quốc mới: Đặt duy nhất **1 Nhà Kho (`WAREHOUSE`) Cấp 1** ở trung tâm tại tọa độ `(11, 7)` với vùng đệm an toàn `±2 ô` xung quanh.
   - **Giới hạn số lượng công trình**:
     - Không giới hạn số lượng: **Nhà Dân (`TOWN_HALL`)**, **Ruộng Lúa (`FARM`)**.
     - Giới hạn tối đa 1 công trình trên toàn Vương Quốc: **Nhà Kho (`WAREHOUSE`)**, **Trại Lính (`BARRACKS`)**, **Điện Anh Hùng (`HERO_ALTAR`)**, **Trang Viên (`MANOR`)**.
   - **Điều kiện ô hợp lệ khi đặt công trình**: Không được đặt trên ô mặt nước (`isWaterTile`), ô đường đá (`isRoadTile`), ô có mỏ tài nguyên (`resourceNodes`), hoặc trùng lên công trình khác.

4. **Tự động hóa sinh địa hình & tài nguyên ngẫu nhiên theo Sổ Tay**:
   - **Cụm mặt nước (`waterClusters`)**: Mỗi lần tạo/mở Vương Quốc, module tự động sinh ngẫu nhiên hình dáng các vùng nước ở góc Tây Bắc (`gx: 0..4, gy: 0..3`), vịnh Đông Nam (`gx: 23..29, gy: 11..17`) và bờ sông phía Nam (`gx: 6..18, gy: 16..17`), tự động bo góc tự nhiên và tránh mọi công trình đã xây.
   - **Đường đá cuội (`roadGeneration`)**: Tự động sinh trục đường ngang (`gy ∈ {6, 7, 8}`) và trục đường dọc (`gx ∈ {11, 12, 13}`) giao nhau gần Nhà Kho trung tâm cùng nhánh phụ ngẫu nhiên, tự động tránh vùng nước và công trình.
   - **Thảm cỏ & Hoa dại (`grassSeedSalt`)**: Đổi seed ngẫu nhiên mỗi lần vẽ map để phân bố bụi cỏ và hoa dại luôn mới mẻ.
   - **Mỏ tài nguyên tự nhiên (`resourceSpawns`)**: Tự động sinh ngẫu nhiên trên các ô cỏ hợp lệ (tránh nước, đường đá, vùng đệm Nhà Kho và công trình):
     - **8 Cây Gỗ (`TREE`)**: `80 Gỗ / cây`.
     - **3 Mỏ Đá (`STONE_DEPOSIT`)**: `100 Đá / mỏ`.
     - **3 Mỏ Vàng (`GOLD_VEIN`)**: `120 Vàng / mỏ`.

---

## 2. QUY TẮC TẠO & VẼ MAP TRANG VIÊN (`MANOR_MAP`)

1. **Kiến trúc Vương Quốc Ảo (Virtual Kingdom Space)**:
   - Dùng chung engine bản đồ Isometric 2.5D kích thước **30×18 ô** và giữ nguyên Thanh Top Bar của Vương Quốc gốc.
   - **Điều kiện truy cập**: Chỉ mở nút **"Vào Trang Viên"** khi trên bản đồ Vương Quốc không còn kẻ địch (`activeEnemyCount === 0`).
   - **Mở sáng 100%**: Tắt hoàn toàn Sương Đen (`Fog of War`), toàn bộ 30×18 ô đều hiển thị sáng rõ (`fogStates = 2`).
   - **Ẩn đối tượng chiến đấu & khai thác**:
     - Không sinh cây rừng, mỏ đá, mỏ vàng hoang dã.
     - Ẩn toàn bộ binh lính, nông dân, anh hùng, kẻ địch và ẩn chính tòa nhà Trang Viên.
     - Khóa cụm phím chiến thuật (`1–5`, `D`, `F`, `H`) và khóa 6 nút chức năng Vương Quốc ở thanh dưới (`Thư Tín`, `Kho Đồ`, `Cửa Hàng`, `Doanh Trại`, `Trang Bị`, `Nghiên Cứu`).

2. **Tự động hóa sinh địa hình Trang Viên ngẫu nhiên theo Sổ Tay**:
   - **Hồ nước trung tâm (`centralPond`)**: Mỗi lần bước vào Trang Viên, module tự động tạo một hồ nước trong xanh ở khu vực trung tâm (`centerGx: 13..16, centerGy: 7..9`, rộng `5..6 ô`, cao `3..4 ô`), tự động cắt góc tạo dáng hồ tự nhiên và né toàn bộ vật phẩm Trang Viên người chơi đã đặt (`placedManorObjects`).
   - **Vành đai Đá Tảng & Rêu Xanh (`stoneBoulderRing`)**: Tự động tính toán và lót 1 vòng đá tảng cuội xám xen rêu xanh bao quanh toàn bộ các ô tiếp giáp hồ nước.
   - **Đường dạo lát đá (`gardenCobblestonePaths`)**: Tự động sinh lối đi lát đá cuội khu vườn phía Tây kết nối về phía hồ nước, tự động tránh các vật phẩm Trang Viên đã đặt.
   - **Quy tắc đặt vật phẩm Trang Viên**: Người chơi chỉ được đặt vật phẩm từ **Kho Đồ Trang Viên** lên ô cỏ trống; cấm đặt đè lên lòng hồ nước, vành đai đá tảng bờ hồ hoặc vật phẩm Trang Viên khác.

---

## 3. QUY TẮC TẠO & VẼ MAP MÀN CHƠI / PHÓ BẢN (`STAGE_MAP`)

1. **Cơ chế Vương Quốc Ảo Màn Chơi (Virtual Kingdom Stage Session)**:
   - Khi bấm **"Bắt Đầu Chiến Đấu"**, module tạo một **Vương Quốc Ảo** sao chép sâu (`deep clone`) dữ liệu từ Vương Quốc tham chiến.
   - **Xóa tạm công trình & quân ở nhà**: Xóa toàn bộ công trình (`buildings = []`), chỉ triệu hồi đúng số lượng quân đội mà người chơi đã điều phối.
   - **Bản đồ mở sáng 100%**: Toàn bộ `30×18 ô` đều mở sáng hoàn toàn (`fogStates = 2`).
   - **Kho Đồ Tạm Thời (`StageTempLootBag`)**: Hiển thị bằng nút **Icon Túi Đồ Pixel 2D 8-Bit** ở góc trên bên trái màn hình (mặc định ẩn danh sách, bấm vào mới bung danh sách chiến lợi phẩm gồm Vàng, Kim cương, Lương thực, Gỗ, Đá và Vật phẩm nhặt được).
   - **Thẻ Thông Tin Map**: Đặt ở góc trên bên phải màn hình (Hàng 1: Tiêu đề màn chơi; Hàng 2: Địch còn lại).
   - **Khóa giao diện ngoài trận**: Khóa các nút Thư Tín, Kho Đồ, Cửa Hàng, Doanh Trại, Trang Bị, Nghiên Cứu và khóa nút Bản Đồ Thế Giới; hiển thị nút **Rút Lui** kế bên nút Bản Đồ Thế Giới (bấm Rút Lui kích hoạt thua trận ngay).

2. **Quy tắc Chiến Thắng & Thất Bại / Rút Lui**:
   - **Khi Chiến Thắng (`VICTORY`)**:
     1. Đếm ngược **3 giây**, sau đó tự động thu hồi toàn bộ vật phẩm rơi trên bản đồ nếu người chơi quên nhặt.
     2. Cộng toàn bộ tài nguyên, tiền tệ và vật phẩm trong **Kho Đồ Tạm Thời** vào Vương Quốc Ảo.
     3. Sao chép dữ liệu mới của Vương Quốc Ảo đè ngược về **Vương Quốc tham chiến** (cộng dồn cả sản lượng lúa bị động ở quê nhà trong thời gian đánh phó bản) và mở khóa ải tiếp theo.
     4. Xóa Vương Quốc Ảo và hiển thị bảng tổng kết phần thưởng.
   - **Khi Thua Trận hoặc Rút Lui (`DEFEAT`)**:
     1. Chép trạng thái quân đội điều phối bị thương/kiệt sức (`isRecuperating = true, hp = 0`) về **Trại Hồi Sức** của Vương Quốc tham chiến.
     2. Chép toàn bộ tài nguyên tăng thêm bị động ở quê nhà trong suốt thời gian chiến đấu về Vương Quốc tham chiến.
     3. Hủy bỏ Kho Đồ Tạm Thời, xóa Vương Quốc Ảo và hiển thị bảng thông báo.

3. **Danh mục Chế độ chơi trong Sổ Tay Thiết Kế Màn Chơi**:

### 1. Chế độ Phó Bản / Đồng Bằng Châu Thổ (`delta_plains`) / Ải 1 – Ải 6:
- **Quy tắc giới hạn chơi lại**: **Khi hoàn thành màn chơi (vượt ải thành công), không thể chơi lại màn đó** (ải đã vượt sẽ chuyển sang trạng thái `"ĐÃ HOÀN THÀNH"` và khóa vĩnh viễn; người chơi chỉ có thể khiêu chiến ải mới nhất vừa mở khóa).
- **Phong cách vẽ map**: Đồng cỏ xanh 2.5D Isometric (`PLAINS_GRASS`, lưới `30×18` ô, `64×64 px/ô`), xóa tạm thời toàn bộ công trình và đơn vị không tham chiến của Vương Quốc gốc, mở sáng `100%` toàn bản đồ (tắt Fog of War), đổi seed cỏ & hoa dại mới mỗi lần vào màn chơi.
- **Thời tiết**: Gió Nhẹ (`LIGHT_WIND`) với hiệu ứng lá bay ngang màn hình.
- **Vùng trống an toàn**: Góc dưới bên trái bản đồ (`gx <= 8, gy >= 10`) để trống hoàn toàn (không sinh cây, đá, nước hay kẻ địch).
- **Vùng triệu hồi quân ta**: Góc dưới bên trái bản đồ (`gx: 2..6, gy: 13..16`). Khi mới vào màn chơi, toàn bộ quân đoàn xuất phát từ bên ngoài rìa bản đồ góc trái bên dưới (`x = sx - 165, y = sy + 105`) và hành quân tiến vào vị trí đội hình (`sx, sy`).
- **Sinh tài nguyên ngẫu nhiên ngoài vùng an toàn**:
  - Cây Gỗ (`TREE`, `80 Gỗ/cây`): `14 – 20` cây rải ngẫu nhiên ngoài vùng an toàn.
  - Mỏ Đá (`STONE_DEPOSIT`, `100 Đá/mỏ`): `6 – 10` mỏ rải ngẫu nhiên ngoài vùng an toàn.
  - Mỏ Vàng (`GOLD_VEIN`): `0` mỏ mặc định (hoặc bật qua Ma Trận Admin Showroom).
- **Sinh kẻ địch**:
  + **Sinh kẻ địch ngẫu nhiên từ Wiki ngoài vùng an toàn**:
    - Chủng loại: Ngẫu nhiên từ Wiki (`ENEMY_MELEE` - Chiến Binh Hắc Ám, `ENEMY_RANGED` - Cung Thủ Bóng Đêm, `ENEMY_MAGE` - Pháp Sư Bóng Đêm).
    - Số lượng & Cấp độ theo từng ải:
      - Ải 1: `3` quân địch — Cấp `1`
      - Ải 2: `5` quân địch — Cấp `2`
      - Ải 3: `7` quân địch — Cấp `3`
      - Ải 4: `9` quân địch — Cấp `4`
      - Ải 5: `12` quân địch — Cấp `5`
      - Ải 6: `15` quân địch — Cấp `6`
    - Hành vi AI: `PASSIVE_DETECT` (Đứng yên canh gác tại vị trí ngẫu nhiên ngoài vùng an toàn; chỉ chủ động lao ra tấn công khi quân ta bước vào tầm phát hiện `250px – 270px` hoặc khi bị tấn công).
  + **Sinh kẻ địch theo điều kiện đặc biệt**: Không có công trình địch hay Boss đặc biệt.
- **Thưởng theo ải**:
  - Vật phẩm rơi trực tiếp từ từng kẻ địch bị tiêu diệt theo bảng `ENEMY_DROP_RATE_HANDBOOK` (5 nhóm phẩm chất Trắng/Xanh Lá/Xanh Lam/Tím/Vàng: gốc `20%` ở Lv.1, tăng thêm `+5%` tương đối mỗi cấp độ) vào Kho Đồ Tạm Thời.
  - Thưởng hoàn thành ải (`completionBonus`):
    - Ải 1: `+10 Vàng, +12 Lương thực, +12 Gỗ, +10 Đá, +15 EXP Vương Quốc`
    - Ải 2: `+15 Vàng, +16 Lương thực, +16 Gỗ, +14 Đá, +20 EXP Vương Quốc`
    - Ải 3: `+20 Vàng, +20 Lương thực, +20 Gỗ, +18 Đá, +25 EXP Vương Quốc`
    - Ải 4: `+25 Vàng, +25 Lương thực, +25 Gỗ, +22 Đá, +30 EXP Vương Quốc`
    - Ải 5: `+32 Vàng, +30 Lương thực, +30 Gỗ, +26 Đá, +35 EXP Vương Quốc`
    - Ải 6: `+40 Vàng, +36 Lương thực, +36 Gỗ, +32 Đá, +45 EXP Vương Quốc`
- **Điều kiện chiến thắng**: Tiêu diệt toàn bộ kẻ địch trên bản đồ (`KILL_ALL_ENEMIES`). Đếm ngược `3 giây` tự động thu thập toàn bộ vật phẩm rơi trên mặt đất vào Kho Đồ Tạm Thời, cộng về Vương Quốc tham chiến, đánh dấu ải hiện tại là **Đã Hoàn Thành (không thể chơi lại)** và mở khóa ải tiếp theo.
- **Điều kiện thua**: Toàn bộ đơn vị quân ta điều phối vào màn chơi bị hạ gục (`HP = 0`) hoặc người chơi bấm nút **"Rút Lui"**. Toàn bộ đơn vị điều phối được đưa về **Trại Hồi Sức** của Vương Quốc tham chiến và mất toàn bộ chiến lợi phẩm trong Kho Đồ Tạm Thời.

---

### 2. Chế độ Tấn Công Trại Quân Địch Trên Bản Đồ Thế Giới (`world_enemy_camp`) / Trại Địch Lv.1 – Lv.10:
- **Điều kiện kích hoạt, Lệnh Hành Quân (`3s/ô`) & Trạng thái Doanh Trại**:
  - Trên Bản Đồ Thế Giới `50×50`, bấm chọn vào ô **Trại Quân Địch (`ENEMY_CAMP`)** sẽ bung bảng chọn nhỏ màu đỏ chữ trắng viền đen **"Tấn công"** ngay tại vị trí con trỏ; bấm vào mở bảng điều phối quân đội và tiêu hao **`-1` Lệnh Hành Quân (`item-march-order`)** của Vương Quốc tham chiến.
  - **Giới hạn xuất quân**: **Mỗi Vương Quốc chỉ được xuất `1` đội quân** tại một thời điểm.
  - **Hành quân trên Bản Đồ Thế Giới (`3 giây / ô`) & Khóa mục tiêu**: Khi xác nhận xuất quân sẽ chưa vào map chiến đấu ngay mà **treo lên 1 Lệnh Tấn Công**; đoàn quân di chuyển từ tọa độ Vương Quốc đến tọa độ Trại Địch với tốc độ **`3 giây / ô`**. Trại Địch đang bị treo lệnh sẽ bị khóa mục tiêu, người chơi / Vương Quốc khác không thể phát lệnh tấn công trùng lên trại đó. Khi đoàn quân di chuyển đến địa điểm mục tiêu thì mở nút **"Vào Chiến Đấu"** để vào map chiến đấu.
  - **Cập nhật Doanh Trại Vương Quốc**: Khi xuất quân, những đơn vị đã bị điều đi sẽ tạm rời khỏi bản đồ Vương Quốc, đồng thời trong **Doanh Trại** của Vương Quốc đó các thẻ đơn vị này sẽ **tối màu đi** và được gán nhãn xanh lá **`"Đã rời vương quốc"`**.
- **Phong cách vẽ map**: Đồng cỏ xanh 2.5D Isometric (`PLAINS_GRASS`, lưới `30×18` ô, `64×64 px/ô`), xóa tạm thời công trình và đơn vị ở nhà của Vương Quốc gốc, mở sáng `100%` toàn bản đồ (tắt Fog of War), đổi seed cỏ & hoa dại mới mỗi lần vào trận.
- **Thời tiết**: Gió Nhẹ (`LIGHT_WIND`).
- **Vùng trống an toàn**:
  - Vùng trống góc dưới bên trái bản đồ (`gx <= 8, gy >= 10`) dành cho quân ta xuất trận.
  - Vùng trống khu vực trung tâm bản đồ (`gx: 11..18, gy: 5..12`) dành riêng để đặt Công Trình Trại Quân Địch, Tháp Canh Hắc Ám và vòng đai phòng thủ của quân địch (không sinh cây cối/mỏ đá đè lên trại).
- **Vùng triệu hồi quân ta**: Góc dưới bên trái bản đồ (`gx: 2..6, gy: 13..16`). Khi mới vào màn chơi, toàn bộ quân đoàn xuất phát từ bên ngoài rìa bản đồ góc trái bên dưới (`x = sx - 165, y = sy + 105`) và hành quân đi bộ vào vị trí đội hình (`sx, sy`).
- **Sinh tài nguyên ngẫu nhiên ngoài vùng an toàn**:
  - Cây Gỗ (`TREE`, `80 Gỗ/cây`): `14 – 18` cây rải ngẫu nhiên ngoài 2 vùng an toàn.
  - Mỏ Đá (`STONE_DEPOSIT`, `100 Đá/mỏ`): `6 – 9` mỏ rải ngẫu nhiên ngoài 2 vùng an toàn.
  - Mỏ Vàng (`GOLD_VEIN`): `0` mỏ mặc định (hoặc bật qua Ma Trận Admin Showroom).
- **Sinh kẻ địch**:
  + **Sinh kẻ địch ngẫu nhiên từ Wiki ngoài vùng an toàn**:
    - Chủng loại: Ngẫu nhiên từ Wiki (`ENEMY_MELEE` - Chiến Binh Hắc Ám, `ENEMY_RANGED` - Cung Thủ Bóng Đêm, `ENEMY_MAGE` - Pháp Sư Bóng Đêm).
    - Số lượng & Cấp độ theo từng cấp Trại Địch (`Lv.1 – Lv.10`):
      - Trại Lv.1: `4` quân địch — Cấp `1`
      - Trại Lv.2: `6` quân địch — Cấp `2`
      - Trại Lv.3: `8` quân địch — Cấp `3`
      - Trại Lv.4: `10` quân địch — Cấp `4`
      - Trại Lv.5: `12` quân địch — Cấp `5`
      - Trại Lv.6: `14` quân địch — Cấp `6`
      - Trại Lv.7: `16` quân địch — Cấp `7`
      - Trại Lv.8: `18` quân địch — Cấp `8`
      - Trại Lv.9: `20` quân địch — Cấp `9`
      - Trại Lv.10: `22` quân địch — Cấp `10`
    - Hành vi AI: `PASSIVE_DETECT` (Đứng yên bố trí thành vòng tròn đồng tâm phòng thủ xung quanh Trại Quân Địch ở trung tâm bản đồ; chỉ chủ động lao ra tấn công khi quân ta bước vào tầm phát hiện `250px – 280px` hoặc khi bị tấn công).
  + **Sinh kẻ địch theo điều kiện đặc biệt**:
    - **Công trình Trại Quân Địch (`ENEMY_CAMP_BUILDING` / `CAMP_BUILDING`)**: Sinh `1` Trại Quân Địch cố định tại chính giữa trung tâm bản đồ (`gx = 14.5, gy = 8.5`), cấp độ bằng cấp trại (`Lv.1 – Lv.10`), có thanh máu lớn (`HP = 650 × hệ số cấp`), có thể bị tấn công nhưng **miễn nhiễm toàn bộ hiệu ứng bất lợi (debuff)** và miễn nhiễm đẩy lùi (knockback).
    - **Công trình Tháp Canh Hắc Ám (`ENEMY_WATCHTOWER` / `WATCHTOWER`)**: Sinh từ `1` đến `4` Tháp Canh Hắc Ám đặt ở các góc bảo vệ xung quanh Trại Quân Địch trung tâm (`Lv.1–3`: `1` tháp; `Lv.4–6`: `2` tháp; `Lv.7–9`: `3` tháp; `Lv.10`: `4` tháp), cấp độ bằng cấp trại (`Lv.1 – Lv.10`), có thanh máu (`HP = 420 × hệ số cấp`), tự động bắn tên hắc ám tầm xa (`225px`) vào quân ta, có thể bị tấn công nhưng **miễn nhiễm toàn bộ debuff** và miễn nhiễm đẩy lùi.
- **Thưởng theo ải**:
  - Vật phẩm rơi trực tiếp từ quân địch và công trình địch khi bị phá hủy theo bảng `ENEMY_DROP_RATE_HANDBOOK` (gốc `20%` mỗi nhóm phẩm chất ở Lv.1, tăng thêm `+5%` tương đối mỗi cấp độ) vào Kho Đồ Tạm Thời.
  - Thưởng hoàn thành màn chơi (`completionBonus`):
    - Trại Lv.1: `+15 Vàng, +15 Lương thực, +15 Gỗ, +12 Đá, +20 EXP Vương Quốc`
    - Trại Lv.2: `+22 Vàng, +20 Lương thực, +20 Gỗ, +18 Đá, +25 EXP Vương Quốc`
    - Trại Lv.3: `+30 Vàng, +26 Lương thực, +26 Gỗ, +24 Đá, +30 EXP Vương Quốc`
    - Trại Lv.4: `+38 Vàng, +32 Lương thực, +32 Gỗ, +28 Đá, +38 EXP Vương Quốc`
    - Trại Lv.5: `+46 Vàng, +40 Lương thực, +40 Gỗ, +35 Đá, +45 EXP Vương Quốc`
    - Trại Lv.6: `+55 Vàng, +48 Lương thực, +48 Gỗ, +42 Đá, +55 EXP Vương Quốc`
    - Trại Lv.7: `+65 Vàng, +56 Lương thực, +56 Gỗ, +50 Đá, +65 EXP Vương Quốc`
    - Trại Lv.8: `+78 Vàng, +66 Lương thực, +66 Gỗ, +60 Đá, +75 EXP Vương Quốc`
    - Trại Lv.9: `+92 Vàng, +78 Lương thực, +78 Gỗ, +70 Đá, +90 EXP Vương Quốc`
    - Trại Lv.10: `+110 Vàng, +95 Lương thực, +95 Gỗ, +85 Đá, +110 EXP Vương Quốc`
- **Điều kiện chiến thắng**: Tiêu diệt toàn bộ quân địch VÀ phá hủy toàn bộ công trình địch (Trại Quân Địch + Tháp Canh Hắc Ám) trên bản đồ (`KILL_ALL_ENEMIES_AND_STRUCTURES`). Sau `3 giây` tự động thu thập toàn bộ vật phẩm rơi trên mặt đất vào Kho Đồ Tạm Thời, trả quân về Vương Quốc tham chiến (xóa nhãn `"Đã rời vương quốc"`). **Đồng thời trên Bản Đồ Thế Giới `50×50`, Trại Quân Địch vừa bị tiêu diệt sẽ biến mất khỏi tọa độ cũ và tự động tái sinh 1 Trại Quân Địch mới ở vị trí Đồng Bằng Trống ngẫu nhiên khác.**
- **Điều kiện thua**: Toàn bộ đơn vị quân ta điều phối vào màn chơi bị hạ gục (`HP = 0`) hoặc người chơi bấm nút **"Rút Lui"**. Toàn bộ đơn vị tham chiến được đưa về **Trại Hồi Sức** của Vương Quốc tham chiến (xóa nhãn `"Đã rời vương quốc"`), mở khóa lại mục tiêu trên Bản Đồ Thế Giới, mất toàn bộ chiến lợi phẩm trong Kho Đồ Tạm Thời (vật phẩm **Lệnh Hành Quân** đã tiêu hao không hoàn lại).

---

### 3. Chế Độ: Vương Quốc vs Vương Quốc Trên Bản Đồ Thế Giới (`WORLD_PVP_KINGDOM` — `world_pvp_kingdom`)
- **Kiểu màn chơi**: Bản đồ Vương Quốc `30×18` ô (`1920×1152` px) sao chép nguyên bản từ Vương Quốc bị tấn công (địa hình, mỏ tài nguyên, công trình và bố trí quân đội). Hỗ trợ tự tấn công các Vương Quốc thuộc sở hữu của mình trên Bản Đồ Thế Giới để kiểm thử cũng như tấn công Vương Quốc của người chơi khác.
- **Tương tác trên Bản Đồ Thế Giới & Điều kiện tham chiến**:
  - Khi click vào Vương Quốc bất kỳ trên Bản Đồ Thế Giới, bung ra danh sách lựa chọn với các nút bấm kích thước lớn, chữ trắng rõ nét:
    1. **Truy cập** (nếu Vương Quốc thuộc sở hữu của người chơi)
    2. **Tấn công** (nút màu đỏ `#dc2626`, chữ trắng) -> Mở Bảng Điều Phối Quân Đội
    3. **Viện trợ tài nguyên** (nút màu xanh lam `#2563eb`, chữ trắng)
    4. **Viện trợ quân đội** (nút màu tím `#7e22ce`, chữ trắng)
  - Mỗi lượt tấn công bắt buộc tiêu hao **`-1 Lệnh Hành Quân` (`item-march-order`)** trong Kho Đồ của Vương Quốc xuất quân.
  - **Cơ chế Hành Quân trên Bản Đồ Thế Giới**:
    + **Mỗi Vương Quốc chỉ được xuất tối đa `1` đội quân** tại một thời điểm.
    + Đoàn quân mất **`3 giây di chuyển / 1 ô`** khoảng cách từ Vương Quốc xuất phát đến Vương Quốc mục tiêu.
    + Những đơn vị được điều phối đi sẽ **tối màu trong Doanh Trại của Vương Quốc** và gắn nhãn xanh lá **"Đã rời vương quốc"** cho tới khi trận chiến hoàn tất.
    + Khi đoàn quân di chuyển đến địa điểm mục tiêu (`0s`), người chơi bấm nút **"Vào Chiến Đấu"** để nạp Engine tạo màn chơi.
- **Thời tiết**: Đồng bộ theo thời tiết hiện tại của Vương Quốc bị tấn công.
- **Xóa các công trình đã xây & đơn vị sẵn có của Vương Quốc xuất quân**: Khởi tạo **Vương Quốc Ảo** sao chép nguyên bản cảnh quan, mỏ tài nguyên và các công trình dân sinh/hậu cần (`Nhà Kho`, `Nhà Dân`, `Trại Lính`, `Điện Anh Hùng`, `Ruộng Lúa`, `Trang Viên`) của **Vương Quốc bị tấn công** làm cảnh quan tĩnh.
- **Khu vực triệu hồi quân ta**: Góc trái bên dưới bản đồ (`gx: 2 → 6, gy: 13 → 16`). **Khi mới vào màn chơi, toàn bộ đơn vị quân ta xuất phát từ ngoài bản đồ đi bộ tiến vào vị trí tập kết ở góc trái bên dưới.**
- **Khu vực trống**: Giữ thông thoáng khu vực góc trái bên dưới (`gx <= 7, gy >= 11`) để quân viễn chinh của ta tiến vào không bị kẹt địa hình.
- **Cách thức tạo tài nguyên & Kẻ địch trên bản đồ**:
  + **Tài nguyên**: Sao chép nguyên trạng các mỏ Cây Gỗ (`FOREST_WOOD`) và Mỏ Đá (`QUARRY_STONE`) trên bản đồ của Vương Quốc bị tấn công.
  + **Chuyển đổi dữ liệu Quân Đội & Công Trình Phòng Thủ Địch (Chống xung đột ID)**:
    - Trước khi triệu hồi quân viễn chinh của ta vào bản đồ, toàn bộ công trình có thể tấn công được và quân đội chiến đấu của Vương Quốc bị tấn công được chuyển sang danh sách `enemies` với tiền tố định danh riêng biệt (`pvp-def-bldg-{id}` và `pvp-def-unit-{id}`), hiển thị thanh máu đỏ của phe Địch:
    - **Công trình Tháp Phòng Thủ Địch (`TOWER_ARCHER`, `TOWER_MUSKET`, `TOWER_CANNON`, `TOWER_HEXTECH`)**: Giữ nguyên cấp độ (`Lv.1 – Lv.20`), chỉ số thực tế và kỹ năng bị động đặc trưng của từng loại tháp (`Liên Châu Tiễn [Q]`, `Đạn Phá Giáp [Q]`, `Pháo Diện Rộng [Q]`, `Cầu Năng Lượng Làm Chậm [Q] & Tia Năng Lượng Tê Liệt [W]`), có thanh máu nhưng **miễn nhiễm toàn bộ hiệu ứng bất lợi (debuff)** và miễn nhiễm đẩy lùi.
    - **Quân đội đồn trú của Vương Quốc bị tấn công (`HERO`, `SOLDIER`, `ALLY`)**: Giữ nguyên cấp độ, bậc nghiên cứu `[T1–T10]`, trang bị đang mặc, tên hiệu và chỉ số thực tế, đứng phòng thủ tại đúng vị trí hiện hữu của họ trong Vương Quốc (`AI: PASSIVE_DETECT`).
    - **Về Nông Dân của Vương Quốc bị tấn công (`PEASANT`)**: Nông dân không tham gia chiến đấu và không tính vào mục tiêu cần tiêu diệt; ngay khi trận chiến bắt đầu, toàn bộ Nông Dân của địch **tự động chạy trốn vào Nhà Dân / Nhà Kho gần nhất** và ẩn nấp an toàn trong nhà.
- **Thưởng theo ải**:
  - **Không rơi vật phẩm (`Không rơi item`)**: Hạ gục quân địch hoặc phá hủy công trình trong chế độ Vương Quốc vs Vương Quốc không rơi vật phẩm ra mặt đất.
  - **Thưởng hoàn thành màn chơi khi Chiến Thắng**:
    - **Cướp Tài Nguyên**: Cướp một lượng tài nguyên tương đương **10% lượng tài nguyên hiện tại của Vương Quốc bị tấn công** (`10% Lương thực`, `10% Gỗ`, `10% Đá`).
    - **Không cướp tiền tệ**: Vàng (`0`) và Kim cương (`0`) không bị cướp.
    - **Thưởng thêm EXP Vương Quốc**: Nhận thêm EXP Vương Quốc tùy theo cấp độ Vương Quốc của kẻ địch (`Cấp Vương Quốc Địch × 25 EXP`).
- **Điều kiện chiến thắng**: Tiêu diệt toàn bộ quân đội phòng thủ của địch VÀ phá hủy toàn bộ các công trình có thể tấn công được (`4 loại Tháp Phòng Thủ`) trong bản đồ (`KILL_ALL_ENEMIES_AND_STRUCTURES`). Sau khi kết thúc trận chiến:
  - Chuyển toàn bộ tài nguyên cướp được (`10% Lương thực, 10% Gỗ, 10% Đá`) và EXP Vương Quốc về Vương Quốc xuất quân, xóa nhãn `"Đã rời vương quốc"` cho quân ta (đơn vị tử trận của ta vào Trại Hồi Sức).
  - **Đối với Vương Quốc bị tấn công**: **Không xóa công trình bị phá hủy** sau khi kết thúc trận chiến, đồng thời **hồi sinh hết toàn bộ quân đội bị thương của Vương Quốc bị tấn công** (`100% HP`, xóa trạng thái trọng thương) sau khi kết thúc trận chiến (chỉ trừ 10% Lương thực, Gỗ, Đá bị cướp).
- **Điều kiện thua**: Toàn bộ đơn vị quân ta điều phối vào màn chơi chết hết (`HP = 0`) hoặc người chơi bấm nút **"Rút Lui"**. Toàn bộ đơn vị tham chiến của quân ta được đưa về **Trại Hồi Sức** của Vương Quốc xuất quân (xóa nhãn `"Đã rời vương quốc"`), không nhận được tài nguyên hay EXP (vật phẩm **Lệnh Hành Quân** đã tiêu hao không hoàn lại). Vương Quốc bị tấn công giữ nguyên toàn bộ công trình, tài nguyên và hồi sinh đầy đủ quân đội.
