# SỔ TAY TỈ LỆ RỚT ĐỒ (DROP RATE HANDBOOK)

Tài liệu này là quy chuẩn thiết kế **Hệ Thống Tỉ Lệ Rớt Đồ (Loot Drop Rate Rules)** khi tiêu diệt quái trong các màn chơi Phó Bản. Mọi chỉnh sửa tỉ lệ rớt đồ của từng loại quái hoặc thêm quái mới trong tương lai đều đối chiếu trực tiếp tại đây và tại module `src/utils/stageDesignHandbook.ts` (`ENEMY_DROP_RATE_HANDBOOK`).

---

## I. QUY TẮC CHUNG VỀ TỈ LỆ RỚT ĐỒ

1. **Tính trên từng loại quái (Per-Enemy Drop Table)**:
   - Tỉ lệ rớt đồ được cấu hình riêng cho từng loại quái (`ENEMY_MELEE`, `ENEMY_RANGED`, `ENEMY_MAGE`, ...).
   - **Chỉ cần quái chết trong màn chơi Phó Bản là sẽ quay tỉ lệ rơi ra đồ** (ngoại trừ **Quái Test** triệu hồi trong Vương Quốc không rơi đồ).
   - Giết quái **chỉ rơi ra vật phẩm (item)** trên mặt đất để người chơi nhặt vào Túi Chiến Lợi Phẩm (không cộng thẳng tài nguyên hay tiền tệ).

2. **Công thức tăng tỉ lệ rớt đồ theo Cấp độ quái (`+5%` tỉ lệ tương đối mỗi cấp)**:
   - Cấp độ quái càng cao thì **tỉ lệ rớt tổng / từng nhóm phẩm chất được tăng thêm `5%` của tỉ lệ gốc cho mỗi cấp độ tăng thêm** (tính từ Cấp 2 trở đi).
   - **Công thức chuẩn**:
     $$\text{Tỉ lệ thực tế ở Level } L = \text{Tỉ lệ gốc (Lv.1)} \times \left(1 + (L - 1) \times 0.05\right)$$
   - **Ví dụ minh họa**:
     - Nếu quái có `10%` tỉ lệ rớt đồ ở **Lv.1**:
       - Ở **Lv.2**: $10\% \times (1 + 1 \times 0.05) = 10.5\%$ (tăng thêm $5\%$ của $10\%$).
       - Ở **Lv.3**: $10\% \times (1 + 2 \times 0.05) = 11.0\%$.
     - Nếu quái có `20%` tỉ lệ rớt đồ mỗi nhóm phẩm chất ở **Lv.1**:
       - Ở **Lv.1**: `20.0%` mỗi nhóm phẩm chất.
       - Ở **Lv.2**: `21.0%` mỗi nhóm phẩm chất ($20\% \times 1.05$).
       - Ở **Lv.3**: `22.0%` mỗi nhóm phẩm chất ($20\% \times 1.10$).
       - Ở **Lv.4**: `23.0%` mỗi nhóm phẩm chất ($20\% \times 1.15$).
       - Ở **Lv.5**: `24.0%` mỗi nhóm phẩm chất ($20\% \times 1.20$).
       - Ở **Lv.6**: `25.0%` mỗi nhóm phẩm chất ($20\% \times 1.25$).

---

## II. BẢNG TỈ LỆ RỚT ĐỒ THEO TỪNG LOẠI QUÁI (Ở CẤP 1)

Hệ thống vật phẩm trong game được chia làm **5 nhóm phẩm chất**:
- **Nhóm 1 — Thường (`WHITE`)**
- **Nhóm 2 — Phổ biến (`GREEN`)**
- **Nhóm 3 — Hiếm có (`BLUE`)**
- **Nhóm 4 — Siêu hiếm (`PURPLE`)**
- **Nhóm 5 — Huyền thoại (`GOLD`)**

Khi một đơn vị quái bị tiêu diệt, hệ thống sẽ xét tỉ lệ rớt đồ trên cả 5 nhóm phẩm chất của loại quái đó (tỉ lệ đã nhân hệ số cấp độ `1 + (level - 1) * 0.05`):

| Mã Quái | Tên Đơn Vị Quái | Thường (`WHITE`) | Phổ biến (`GREEN`) | Hiếm có (`BLUE`) | Siêu hiếm (`PURPLE`) | Huyền thoại (`GOLD`) | Hệ số tăng mỗi cấp |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| `ENEMY_MELEE` | **Chiến Binh Hắc Ám** | **20%** | **20%** | **20%** | **20%** | **20%** | `+5%` của tỉ lệ gốc / cấp |
| `ENEMY_RANGED` | **Cung Thủ Bóng Đêm** | **20%** | **20%** | **20%** | **20%** | **20%** | `+5%` của tỉ lệ gốc / cấp |
| `ENEMY_MAGE` | **Pháp Sư Bóng Đêm** | **20%** | **20%** | **20%** | **20%** | **20%** | `+5%` của tỉ lệ gốc / cấp |

---

## III. DANH MỤC VẬT PHẨM TRONG MỖI NHÓM PHẨM CHẤT KHI RƠI ĐỒ

Khi một nhóm phẩm chất (`WHITE` / `GREEN` / `BLUE` / `PURPLE` / `GOLD`) quay trúng tỉ lệ rớt, một vật phẩm thuộc đúng phẩm chất đó sẽ văng ra mặt đất tại vị trí quái chết (kèm viền màu theo phẩm chất và hiệu ứng glow vàng khi rê chuột):

1. **Nhóm Tài nguyên - Tiền tệ (`RESOURCE_CURRENCY`)**:
   - 25 vật phẩm Túi & Rương của 5 loại (Lương thực, Gỗ, Đá, Vàng, Kim cương) ứng với 5 phẩm chất:
     - Tài nguyên (`Lương thực`, `Gỗ`, `Đá`): `+5`, `+10`, `+50`, `+200`, `+600` đơn vị.
     - Tiền tệ (`Vàng`, `Kim cương`): `+1`, `+3`, `+10`, `+30`, `+100` đơn vị.
2. **Nhóm Nguyên liệu (`MATERIAL`)**:
   - **Đá Huyền Thiếc** (`item-mystic-iron-ore`): Nguyên liệu rèn đúc dùng để nâng cấp trang bị chiến đấu từ `[+1]` đến `[+5]`.
3. **Nhóm Bình EXP Anh Hùng (`EXP_POTION`)**:
   - 5 bậc Bình EXP Anh Hùng (`Bé +50`, `Nhỏ +150`, `Vừa +400`, `Lớn +1.000`, `Đại +2.500`) ứng với 5 phẩm chất.
4. **Nhóm Thẻ Anh Hùng & Quân Đội (`UNIT_CARD`)**:
   - Thẻ Cấm Vệ Quân (`BLUE`), Thẻ Cung Thủ (`BLUE`), Thẻ Anh Hùng Farel (`GOLD`).
5. **Nhóm Vật Phẩm Trang Viên (`MANOR_ITEM`)**:
   - 5 vật phẩm Trang Viên ứng với 5 phẩm chất (`Hàng Rào Gỗ Điền Viên`, `Luống Hoa & Thảo Dược`, `Đài Phun Nước Đá Cổ`, `Bãi Chăn Hươu Sao Linh Thú`, `Tượng Kỳ Lân Hoàng Kim`).
6. **Nhóm Trang Bị Chiến Đấu (`EQUIPMENT`) & Đá Quý Khảm (`GEM`)**:
   - Trang bị chiến đấu và Đá quý khảm có phẩm chất tương ứng với nhóm phẩm chất quay trúng.
