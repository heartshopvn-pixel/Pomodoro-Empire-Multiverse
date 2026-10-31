export type BuildingType =
  | 'TOWN_HALL'
  | 'BARRACKS'
  | 'FARM'
  | 'WAREHOUSE'
  | 'HERO_ALTAR'
  | 'MANOR'
  | 'CONSTRUCTION_CENTER'
  | 'TOWER_ARCHER'
  | 'TOWER_MUSKET'
  | 'TOWER_CANNON'
  | 'TOWER_HEXTECH'
  | 'CAMPFIRE';

export function isDefensiveTowerBuilding(type: BuildingType): boolean {
  return (
    type === 'TOWER_ARCHER' ||
    type === 'TOWER_MUSKET' ||
    type === 'TOWER_CANNON' ||
    type === 'TOWER_HEXTECH'
  );
}

export const TOWER_MAX_LEVEL = 20;
export const TOWER_STAT_BONUS_PER_LEVEL = 0.08; // Mỗi cấp nâng cấp (Lv.1 -> Lv.20) tăng +8% các chỉ số gốc (HP, ATK, MAG, DEF, MAR)

// Hệ thống Quân Đội chuẩn gồm 3 loại Troop chính:
// 1. HERO: Anh Hùng (Ví dụ: Farel — triệu hồi từ Điện Anh Hùng)
// 2. SOLDIER: Quân Lính (Bao gồm cả Nông Dân, Cấm Vệ Quân, Cung Thủ Hoàng Gia)
// 3. ALLY: Quân Đồng Minh (Quân đội từ Vương Quốc khác gửi sang chi viện/hỗ trợ)
export type TroopCategory = 'HERO' | 'SOLDIER' | 'ALLY';

export const TROOP_CATEGORY_META: Record<
  TroopCategory,
  { id: TroopCategory; nameVi: string; badgeClass: string; desc: string }
> = {
  HERO: {
    id: 'HERO',
    nameVi: 'Anh Hùng',
    badgeClass: 'bg-[#451a03] border-[#fbbf24] text-[#fde047]',
    desc: 'Anh hùng chỉ huy triệu hồi từ Điện Anh Hùng (Farel, ...)',
  },
  SOLDIER: {
    id: 'SOLDIER',
    nameVi: 'Quân Lính (Gồm Nông Dân)',
    badgeClass: 'bg-[#172554] border-[#60a5fa] text-[#93c5fd]',
    desc: 'Quân lính & Nông dân của Vương Quốc (Nông Dân, Cấm Vệ Quân, Cung Thủ)',
  },
  ALLY: {
    id: 'ALLY',
    nameVi: 'Quân Đồng Minh',
    badgeClass: 'bg-[#064e3b] border-[#34d399] text-[#6ee7b7]',
    desc: 'Quân đội từ Vương Quốc khác gửi sang đồn trú và tiếp viện chiến đấu',
  },
};

export type GameState = 'TITLE_MENU' | 'PLAYING' | 'PAUSED' | 'VICTORY';

export type DamageType = 'PHYSICAL' | 'MAGIC';

export type StatusEffectCategory = 'BUFF' | 'DEBUFF';

export type StatusEffectIconType =
  | 'SHIELD_WHITE'
  | 'POISON_DROP'
  | 'SWORD_UP'
  | 'MAGIC_BARRIER'
  | 'BURN'
  | 'SLOW'
  | 'ARMOR_BREAK'
  | 'WEAKEN'
  | 'BLEED'
  | 'STAT_BUFF'
  | 'PARALYZE';

export interface StatusEffectDefinition {
  id: string;
  name: string;
  category: StatusEffectCategory;
  iconType: StatusEffectIconType;
  defaultDurationMs: number;
  tickIntervalMs?: number;
  stackable?: boolean;
  effectSummary?: string;
  description: string;
}

export interface ActiveStatusEffect {
  uid: string;
  effectId: string;
  name: string;
  category: StatusEffectCategory;
  iconType: StatusEffectIconType;
  createdAt: number;
  expiresAt: number;
  durationMs: number;
  lastTickAt?: number;
  tickIntervalMs?: number;
  shieldAmount?: number;
  maxShieldAmount?: number;
  dotDamagePerSec?: number;
  dotDamageType?: DamageType;
  slowPercent?: number;
  statMod?: Partial<UnitCombatStats> & {
    speed?: number;
  };
}

export const STATUS_EFFECT_DEFINITIONS: Record<string, StatusEffectDefinition> = {
  BLESSED_SHIELD: {
    id: 'BLESSED_SHIELD',
    name: 'Lá Chắn Phù Hộ',
    category: 'BUFF',
    iconType: 'SHIELD_WHITE',
    defaultDurationMs: 5000,
    stackable: false,
    effectSummary: 'Tạo lá chắn ảo 15% HP tối đa + Tăng 15% DEF & MAR',
    description:
      'Lá chắn hấp thụ sát thương bằng 15% máu tối đa và tăng nhẹ Giáp/Kháng phép trong 5s.',
  },
  STAT_BUFF: {
    id: 'STAT_BUFF',
    name: 'Cường Hóa Chỉ Số',
    category: 'BUFF',
    iconType: 'STAT_BUFF',
    defaultDurationMs: 5000,
    stackable: false,
    effectSummary: 'Tăng +20% ATK, DEF, MAR trong thời gian hiệu lực',
    description: 'Tăng cường chỉ số chiến đấu (ATK, DEF, MAR) trong thời gian hiệu lực.',
  },
  PARALYZE_DEBUFF: {
    id: 'PARALYZE_DEBUFF',
    name: 'Tê Liệt',
    category: 'DEBUFF',
    iconType: 'PARALYZE',
    defaultDurationMs: 3000,
    stackable: false,
    effectSummary: 'Choáng (bất động) + Giảm 20% Kháng Phép (MAR) + Hiệu ứng điện giật',
    description:
      'Phóng hồ quang điện lên người mục tiêu: Gây Choáng hoàn toàn (không thể di chuyển hay tấn công) đồng thời giảm 20% Kháng Phép (MAR) trong 3s.',
  },
  ARMOR_BREAK: {
    id: 'ARMOR_BREAK',
    name: 'Phá Giáp',
    category: 'DEBUFF',
    iconType: 'ARMOR_BREAK',
    defaultDurationMs: 3000,
    stackable: false,
    effectSummary: 'Giảm 35% Giáp Vật Lý (DEF)',
    description: 'Đòn đánh xuyên phá làm rạn nứt giáp trụ, giảm 35% DEF của mục tiêu.',
  },
  SLOW_DEBUFF: {
    id: 'SLOW_DEBUFF',
    name: 'Làm Chậm',
    category: 'DEBUFF',
    iconType: 'SLOW',
    defaultDurationMs: 3000,
    stackable: true,
    effectSummary: 'Giảm Tốc Độ Di Chuyển (SPD) tùy theo kỹ năng · Có cộng dồn',
    description:
      'Giảm tốc độ di chuyển (SPD) của mục tiêu tùy theo kỹ năng (VD: -30% SPD từ Tháp Hextech). Có cộng dồn nhiều tầng.',
  },
  POISON_DOT: {
    id: 'POISON_DOT',
    name: 'Trúng Độc',
    category: 'DEBUFF',
    iconType: 'POISON_DROP',
    defaultDurationMs: 5000,
    tickIntervalMs: 1000,
    stackable: true,
    effectSummary: 'Gây sát thương phép mỗi giây (/s) tùy kỹ năng · Có cộng dồn',
    description:
      'Gây sát thương phép theo thời gian mỗi giây (/s) tùy theo kỹ năng (VD: Cung Thủ Hoàng Gia). Có cộng dồn nhiều tầng.',
  },
  BURN_DOT: {
    id: 'BURN_DOT',
    name: 'Thiêu Đốt',
    category: 'DEBUFF',
    iconType: 'BURN',
    defaultDurationMs: 4000,
    tickIntervalMs: 1000,
    stackable: false,
    effectSummary: 'Gây sát thương phép thiêu đốt mỗi giây (/s)',
    description: 'Nhận sát thương phép thiêu đốt mỗi giây.',
  },
  WEAKEN_DEBUFF: {
    id: 'WEAKEN_DEBUFF',
    name: 'Suy Yếu',
    category: 'DEBUFF',
    iconType: 'WEAKEN',
    defaultDurationMs: 4000,
    stackable: false,
    effectSummary: 'Giảm 20% ATK & MAG của mục tiêu',
    description: 'Giảm 20% sức tấn công vật lý (ATK) và phép thuật (MAG) của mục tiêu.',
  },
  BLEED_DOT: {
    id: 'BLEED_DOT',
    name: 'Chảy Máu',
    category: 'DEBUFF',
    iconType: 'BLEED',
    defaultDurationMs: 4000,
    tickIntervalMs: 1000,
    stackable: false,
    effectSummary: 'Gây sát thương vật lý chảy máu mỗi giây (/s)',
    description: 'Nhận sát thương vật lý chảy máu mỗi giây.',
  },
};

export type SkillColorTheme =
  | 'PHYSICAL' // Đỏ: Tấn công vật lý
  | 'MAGIC' // Tím: Phép thuật
  | 'DEFENSE' // Xanh lam: Phòng thủ
  | 'BUFF' // Vàng: Cường hóa / Hỗ trợ
  | 'DEBUFF' // Xanh ngọc bích: Suy yếu / Độc / Khống chế
  | 'HEAL'; // Xanh lá cây: Hồi máu

export type SkillIconGlyph =
  | 'HOLY_SWORD'
  | 'POISON_ARROW'
  | 'BLESSED_SHIELD'
  | 'FIREBALL'
  | 'LIGHTNING'
  | 'ICE_NOVA'
  | 'HEAL_LIGHT'
  | 'WHIRLWIND'
  | 'BLOOD_STRIKE'
  | 'METEOR'
  | 'WAR_CRY'
  | 'DARK_CURSE';

export const SKILL_HOTKEYS = ['Q', 'W', 'E', 'R'] as const;
export type SkillHotkey = (typeof SKILL_HOTKEYS)[number];

/**
 * Cấu hình Logic Hoạt Động & VFX Chuẩn Hóa cho Kỹ Năng (Declarative Skill Mechanics):
 * Cho phép thêm số lượng lớn kỹ năng mới (Chủ động / Bị động) mà không cần sửa vòng lặp renderLoop.
 */
export interface SkillMechanicsConfig {
  triggerType?:
    | 'ON_ATTACK_PROC' // Kỹ năng bị động kích hoạt theo % tỉ lệ trên đòn đánh
    | 'ACTIVE_DIRECTIONAL_LINE' // Kỹ năng chủ động chọn hướng hình chữ nhật (kiểu Thánh Kiếm Farel)
    | 'ACTIVE_CIRCLE_AOE' // Kỹ năng chủ động nổ vòng tròn quanh bản thân
    | 'ACTIVE_SELF_BUFF' // Kỹ năng chủ động tự cường hóa / tạo khiên
    | 'ACTIVE_ALLY_HEAL'; // Kỹ năng chủ động hồi máu bản thân & đồng minh
  damageMultiplier?: number; // Hệ số sát thương (VD: 1.3 = 130%)
  scaleStat?: 'atk' | 'mag' | 'maxHp' | 'def'; // Chỉ số gốc dùng để nhân hệ số sát thương (mặc định: 'atk')
  damageType?: DamageType; // Loại sát thương gây ra ('PHYSICAL' | 'MAGIC')
  selfShieldPercentMaxHp?: number; // Tạo lá chắn theo % HP tối đa của người dùng (nhân thêm EFF%)
  selfShieldDurationMs?: number; // Thời gian tồn tại lá chắn (ms)
  selfHealPercentMaxHp?: number; // Tự hồi máu theo % HP tối đa (nhân thêm EFF%)
  selfHealScaleMag?: number; // Hồi máu theo hệ số MAG (nhân thêm EFF%)
  applyStatusEffectId?: string; // ID hiệu ứng trạng thái gây lên mục tiêu ('POISON_DOT' | 'BURN_DOT' | 'SLOW_DEBUFF'...)
  statusDurationMs?: number; // Thời gian hiệu ứng (ms, bị giảm bởi DBR% của mục tiêu)
  dotScalePercent?: number; // % ATK hoặc MAG gây sát thương mỗi giây cho hiệu ứng DOT (nhân SKD%)
  dotDamageType?: DamageType; // Loại sát thương của hiệu ứng DOT ('MAGIC' | 'PHYSICAL')
  aoeLength?: number; // Chiều dài vùng kỹ năng định hướng (px, mặc định 96)
  aoeWidth?: number; // Chiều rộng vùng kỹ năng định hướng (px, mặc định 38)
  aoeRadius?: number; // Bán kính vùng nổ AOE (px, mặc định 90)
  projectileColor?: string; // Màu đạn bắn ra khi kỹ năng kích hoạt trên đòn đánh xa
  vfxKind?: 'SLASH' | 'IMPACT_RING' | 'CHARGE_BURST' | 'POISON_BURST'; // Hiệu ứng hình ảnh VFX khi trúng đích
  vfxColor?: string; // Màu hiệu ứng VFX
  procFloatingText?: string; // Chữ bay lên khi kích hoạt kỹ năng (VD: 'ĐÒN PHÙ HỘ!', 'TÊN ĐỘC!')
  procFloatingColor?: string; // Màu chữ bay lên
}

export interface UnitSkillInfo {
  id: string;
  name: string;
  chancePercent: number;
  description: string;
  theme?: SkillColorTheme;
  iconGlyph?: SkillIconGlyph; // Biểu tượng 8-bit pixel vẽ trên nền Warcraft của kỹ năng
  isPassive?: boolean; // true = Kỹ năng bị động (viền đứt khúc); false = Kỹ năng chủ động kích hoạt bằng chuột trái / phím tắt QWER (viền liền)
  cooldownSec?: number; // Thời gian hồi chiêu (giây) đối với kỹ năng chủ động
  hotkeySlot?: SkillHotkey; // Ô phím tắt ưu tiên ('Q' | 'W' | 'E' | 'R')
  mechanics?: SkillMechanicsConfig; // Cấu hình logic chiến đấu & VFX tự động
}

export const SOLDIER_SKILLS: Record<'MELEE' | 'RANGED', UnitSkillInfo> = {
  MELEE: {
    id: 'BLESSED_STRIKE',
    name: 'Đòn Phù Hộ',
    chancePercent: 20,
    isPassive: true,
    theme: 'DEFENSE',
    iconGlyph: 'BLESSED_SHIELD',
    description:
      'Đòn đánh có [20% tỉ lệ] gây [130% ATK] sát thương vật lý, tạo [Lá Chắn 15% HP] trong [5s].',
    mechanics: {
      triggerType: 'ON_ATTACK_PROC',
      damageMultiplier: 1.3,
      scaleStat: 'atk',
      damageType: 'PHYSICAL',
      selfShieldPercentMaxHp: 15,
      selfShieldDurationMs: 5000,
      vfxKind: 'IMPACT_RING',
      vfxColor: '#60a5fa',
      procFloatingText: 'ĐÒN PHÙ HỘ!',
      procFloatingColor: '#ffffff',
    },
  },
  RANGED: {
    id: 'POISON_ARROW',
    name: 'Tên Độc',
    chancePercent: 20,
    isPassive: true,
    theme: 'DEBUFF',
    iconGlyph: 'POISON_ARROW',
    description:
      'Đòn đánh có [20% tỉ lệ] gây [135% ATK] sát thương vật lý, gây hiệu ứng độc rút [10% Phép/giây] trong [5s].',
    mechanics: {
      triggerType: 'ON_ATTACK_PROC',
      damageMultiplier: 1.35,
      scaleStat: 'atk',
      damageType: 'PHYSICAL',
      applyStatusEffectId: 'POISON_DOT',
      statusDurationMs: 5000,
      dotScalePercent: 10,
      dotDamageType: 'MAGIC',
      projectileColor: '#22c55e',
      vfxKind: 'POISON_BURST',
      vfxColor: '#4ade80',
      procFloatingText: 'TÊN ĐỘC!',
      procFloatingColor: '#4ade80',
    },
  },
};

// Full 23-stat profile (22 combat/unit stats + CP: Combat Power in white)
export interface UnitCombatStats {
  maxHp: number; // HP tối đa
  reg: number; // Hồi máu mỗi 5s
  atk: number; // Tấn công vật lý
  mag: number; // MAG Sức mạnh phép thuật (Magic Power) — ảnh hưởng kỹ năng phép, hỗ trợ & hồi máu
  def: number; // Phòng thủ vật lý
  mar: number; // Phòng thủ phép
  ats: number; // Tốc độ tấn công (1.0 = 2s/đòn)
  crt: number; // Tỉ lệ chí mạng (%)
  eva: number; // Tỉ lệ né đòn đánh & kỹ năng (%)
  crd: number; // Sát thương chí mạng (%)
  spd: number; // Tốc độ di chuyển (100 = chuẩn, thuộc nhóm nâng cao, luôn có ở Giày)
  ran: number; // RAN Tầm đánh (Range) — cố định theo đơn vị, không có trong trang bị
  dmgPercent: number; // DMG% tăng thêm trước phòng thủ (%) [Chỉ có ở Tím & Vàng]
  resPercent: number; // RES% giảm thương đầu tiên trước phòng thủ (%) [Chỉ có ở Tím & Vàng]
  penPercent: number; // PEN% xuyên giáp & kháng phép (%) [Chỉ có ở Tím & Vàng]
  penFlat: number; // PEN xuyên giáp & kháng phép thẳng [Chỉ có ở Tím & Vàng]
  lifesteal: number; // LST% Hút máu (%) [Cực hiếm: Vàng & Nhẫn Huyết Long]
  dmgBlock: number; // BLK Chặn sát thương thẳng mỗi đòn [Cực hiếm: Vàng]
  dbr: number; // DBR% Kháng hiệu ứng Debuff Resistance (%) — giảm % thời gian chịu debuff & khống chế
  eff: number; // EFF% Hiệu quả tăng cường Buff Effectiveness (%) — tăng % hồi máu nhận vào từ kỹ năng hồi máu (bản thân/đồng minh), hút máu và tạo khiên
  skd: number; // SKD% Tăng % sát thương kỹ năng Skill Damage % (mặc định 100%, áp dụng cho cả chủ động & bị động)
  cld: number; // CLD% Giảm thời gian hồi kỹ năng Cooldown Reduction (%) của tất cả kỹ năng chủ động
  pow: number; // CP: Lực Chiến (Màu trắng #ffffff, thể hiện sức mạnh tổng hợp, không tính trực tiếp vào sát thương chiến đấu)
}

// Bảng màu gốc riêng biệt cho từng loại chỉ số (hiển thị đúng màu gốc trong Tab Trang Bị, Wiki & HUD)
export const STAT_COLOR_HEX: Record<keyof UnitCombatStats, string> = {
  maxHp: '#4ade80', // Xanh lá (HP)
  reg: '#34d399', // Xanh lục bảo (REG)
  atk: '#fbbf24', // Vàng cam (ATK)
  mag: '#a855f7', // Tím ma thuật (MAG - Sức mạnh phép thuật)
  def: '#60a5fa', // Xanh dương (DEF)
  mar: '#c084fc', // Tím nhạt (MAR)
  ats: '#fde047', // Vàng sáng (ATS)
  crt: '#fb923c', // Cam (CRT)
  eva: '#38bdf8', // Xanh da trời (EVA)
  crd: '#f87171', // Đỏ san hô (CRD)
  spd: '#5eead4', // Xanh ngọc (SPD)
  ran: '#a3e635', // Xanh tầm đánh (RAN)
  dmgPercent: '#f59e0b', // Hổ phách (DMG%)
  resPercent: '#93c5fd', // Xanh lam nhạt (RES%)
  penPercent: '#e879f9', // Hồng tím (PEN%)
  penFlat: '#fdba74', // Cam nhạt (PEN)
  lifesteal: '#fb7185', // Đỏ hồng (LST%)
  dmgBlock: '#fcd34d', // Vàng kim khiên (BLK)
  dbr: '#2dd4bf', // Xanh ngọc bích (DBR%)
  eff: '#86efac', // Xanh lục sáng (EFF%)
  skd: '#f472b6', // Hồng sáng (SKD%)
  cld: '#67e8f9', // Xanh băng (CLD%)
  pow: '#ffffff', // Trắng (CP - Lực Chiến)
};

export interface StatMetaEntry {
  key: keyof UnitCombatStats;
  abbr: string;
  englishName: string;
  descVi: string;
  isHiddenAdvanced: boolean;
}

// Từ điển tra cứu Tên Tiếng Anh đầy đủ & Mô tả chức năng cho toàn bộ 20 chỉ số khi rê chuột (Hover Tooltip)
export const STAT_META_INFO: Record<keyof UnitCombatStats, StatMetaEntry> = {
  maxHp: {
    key: 'maxHp',
    abbr: 'HP',
    englishName: 'Health Points',
    descVi: 'Lượng máu tối đa của đơn vị. Khi HP về 0, đơn vị sẽ bị hạ gục.',
    isHiddenAdvanced: false,
  },
  reg: {
    key: 'reg',
    abbr: 'REG',
    englishName: 'Health Regeneration',
    descVi: 'Lượng máu tự động hồi phục mỗi 5 giây.',
    isHiddenAdvanced: false,
  },
  atk: {
    key: 'atk',
    abbr: 'ATK',
    englishName: 'Attack',
    descVi: 'Sức tấn công cơ bản cho đòn đánh thường và làm gốc tính sát thương vật lý của kỹ năng.',
    isHiddenAdvanced: false,
  },
  mag: {
    key: 'mag',
    abbr: 'MAG',
    englishName: 'Magic Power',
    descVi: 'Sức mạnh phép thuật thường ảnh hưởng đến các kỹ năng gây sát thương phép hoặc kỹ năng hỗ trợ, hồi máu.',
    isHiddenAdvanced: false,
  },
  def: {
    key: 'def',
    abbr: 'DEF',
    englishName: 'Physical Defense',
    descVi: 'Giáp vật lý giúp giảm sát thương vật lý nhận vào theo công thức 100 / (100 + DEF).',
    isHiddenAdvanced: false,
  },
  mar: {
    key: 'mar',
    abbr: 'MAR',
    englishName: 'Magic Resistance',
    descVi: 'Kháng phép giúp giảm sát thương phép nhận vào theo công thức 100 / (100 + MAR).',
    isHiddenAdvanced: false,
  },
  ats: {
    key: 'ats',
    abbr: 'ATS',
    englishName: 'Attack Speed',
    descVi: 'Tốc độ ra đòn đánh thường (1.0 tương đương 2.0 giây mỗi đòn đánh).',
    isHiddenAdvanced: false,
  },
  crt: {
    key: 'crt',
    abbr: 'CRT',
    englishName: 'Critical Rate',
    descVi: 'Tỉ lệ phần trăm kích hoạt đòn đánh hoặc kỹ năng Bạo Kích (Chí mạng).',
    isHiddenAdvanced: false,
  },
  eva: {
    key: 'eva',
    abbr: 'EVA',
    englishName: 'Evasion',
    descVi: 'Tỉ lệ phần trăm né tránh hoàn toàn sát thương từ đòn đánh thường và kỹ năng.',
    isHiddenAdvanced: false,
  },
  crd: {
    key: 'crd',
    abbr: 'CRD',
    englishName: 'Critical Damage',
    descVi: 'Tỉ lệ sát thương gây ra khi Bạo Kích (mặc định 150% sát thương).',
    isHiddenAdvanced: false,
  },
  spd: {
    key: 'spd',
    abbr: 'SPD',
    englishName: 'Movement Speed',
    descVi: 'Tốc độ di chuyển trên bản đồ (100 là tốc độ chuẩn; thuộc nhóm chỉ số nâng cao, luôn có ở Giày và chỉ Giày mới có SPD).',
    isHiddenAdvanced: true,
  },
  ran: {
    key: 'ran',
    abbr: 'RAN',
    englishName: 'Range',
    descVi: 'Tầm đánh của đơn vị (Cận chiến hoặc Tầm xa). Chỉ số RAN cố định theo đơn vị và không có trong trang bị.',
    isHiddenAdvanced: true,
  },
  dmgPercent: {
    key: 'dmgPercent',
    abbr: 'DMG%',
    englishName: 'Bonus Damage %',
    descVi: 'Tăng phần trăm tổng sát thương đầu ra trước khi tính Giáp/Kháng phép của mục tiêu.',
    isHiddenAdvanced: true,
  },
  resPercent: {
    key: 'resPercent',
    abbr: 'RES%',
    englishName: 'Damage Resistance %',
    descVi: 'Giảm phần trăm sát thương gánh chịu ngay bước đầu tiên trước khi tính DEF/MAR.',
    isHiddenAdvanced: true,
  },
  penPercent: {
    key: 'penPercent',
    abbr: 'PEN%',
    englishName: 'Armor & Magic Penetration %',
    descVi: 'Xuyên phần trăm Giáp (DEF) và Kháng phép (MAR) của mục tiêu (áp dụng trước PEN thẳng).',
    isHiddenAdvanced: true,
  },
  penFlat: {
    key: 'penFlat',
    abbr: 'PEN',
    englishName: 'Flat Penetration',
    descVi: 'Xuyên thẳng điểm Giáp (DEF) và Kháng phép (MAR) của mục tiêu sau khi đã trừ PEN%.',
    isHiddenAdvanced: true,
  },
  lifesteal: {
    key: 'lifesteal',
    abbr: 'LST%',
    englishName: 'Lifesteal %',
    descVi: 'Hút máu theo phần trăm sát thương thực tế gây ra (được tăng cường thêm bởi EFF%).',
    isHiddenAdvanced: true,
  },
  dmgBlock: {
    key: 'dmgBlock',
    abbr: 'BLK',
    englishName: 'Damage Block',
    descVi: 'Chặn và trừ thẳng một lượng sát thương cố định trên mỗi đòn đánh hoặc kỹ năng nhận vào.',
    isHiddenAdvanced: true,
  },
  dbr: {
    key: 'dbr',
    abbr: 'DBR%',
    englishName: 'Debuff Resistance %',
    descVi: 'Kháng hiệu ứng: Giảm phần trăm thời gian phải chịu các hiệu ứng bất lợi (Debuff) và khống chế.',
    isHiddenAdvanced: true,
  },
  eff: {
    key: 'eff',
    abbr: 'EFF%',
    englishName: 'Buff Effectiveness %',
    descVi: 'Hiệu quả tăng cường: Tăng phần trăm lượng hồi máu nhận vào thông qua kỹ năng hồi máu của bản thân hoặc đồng minh, hút máu (LST%) và lượng tạo khiên.',
    isHiddenAdvanced: true,
  },
  skd: {
    key: 'skd',
    abbr: 'SKD%',
    englishName: 'Skill Damage %',
    descVi: 'Tỉ lệ sát thương kỹ năng đầu ra (mặc định 100%), áp dụng cho cả kỹ năng chủ động và bị động.',
    isHiddenAdvanced: true,
  },
  cld: {
    key: 'cld',
    abbr: 'CLD%',
    englishName: 'Cooldown Reduction %',
    descVi: 'Giảm phần trăm thời gian hồi chiêu của tất cả các kỹ năng chủ động.',
    isHiddenAdvanced: true,
  },
  pow: {
    key: 'pow',
    abbr: 'CP',
    englishName: 'Combat Power',
    descVi: 'Điểm số lực chiến (CP) thể hiện sức mạnh tổng hợp của đơn vị (tính từ tổng điểm từng chỉ số nhân hệ số riêng, không tính vào chiến đấu).',
    isHiddenAdvanced: false,
  },
};

/**
 * Tính điểm Lực Chiến (CP - chỉ số thứ 21) từ 20 chỉ số của đơn vị với hệ số vừa phải:
 * - HP * 0.2, REG * 1.5, ATK * 2.0, DEF * 1.4, MAR * 1.4, ATS * 25
 * - CRT * 1.2, EVA * 1.5, (CRD - 100) * 0.4, SPD * 0.3
 * - DMG% * 2.5, RES% * 2.5, PEN% * 2.0, PEN * 2.2, LST% * 2.5, BLK * 3.0
 * - DBR% * 1.8, EFF% * 1.8, (SKD% - 100) * 1.5, CLD% * 2.0
 */
export function computeUnitPower(
  s: Omit<UnitCombatStats, 'pow'> & { pow?: number }
): number {
  const score =
    (s.maxHp || 0) * 0.2 +
    (s.reg || 0) * 1.5 +
    (s.atk || 0) * 2.0 +
    (s.mag || 0) * 2.0 +
    (s.def || 0) * 1.4 +
    (s.mar || 0) * 1.4 +
    (s.ats || 0) * 25 +
    (s.crt || 0) * 1.2 +
    (s.eva || 0) * 1.5 +
    Math.max(0, (s.crd || 150) - 100) * 0.4 +
    (s.spd || 0) * 0.3 +
    (s.dmgPercent || 0) * 2.5 +
    (s.resPercent || 0) * 2.5 +
    (s.penPercent || 0) * 2.0 +
    (s.penFlat || 0) * 2.2 +
    (s.lifesteal || 0) * 2.5 +
    (s.dmgBlock || 0) * 3.0 +
    (s.dbr || 0) * 1.8 +
    (s.eff || 0) * 1.8 +
    Math.max(0, (s.skd ?? 100) - 100) * 1.5 +
    (s.cld || 0) * 2.0;
  return Math.max(1, Math.round(score));
}

export function computeBonusPower(
  b: Omit<UnitCombatStats, 'pow'> & { pow?: number }
): number {
  const score =
    (b.maxHp || 0) * 0.2 +
    (b.reg || 0) * 1.5 +
    (b.atk || 0) * 2.0 +
    (b.mag || 0) * 2.0 +
    (b.def || 0) * 1.4 +
    (b.mar || 0) * 1.4 +
    (b.ats || 0) * 25 +
    (b.crt || 0) * 1.2 +
    (b.eva || 0) * 1.5 +
    (b.crd || 0) * 0.4 +
    (b.spd || 0) * 0.3 +
    (b.dmgPercent || 0) * 2.5 +
    (b.resPercent || 0) * 2.5 +
    (b.penPercent || 0) * 2.0 +
    (b.penFlat || 0) * 2.2 +
    (b.lifesteal || 0) * 2.5 +
    (b.dmgBlock || 0) * 3.0 +
    (b.dbr || 0) * 1.8 +
    (b.eff || 0) * 1.8 +
    (b.skd || 0) * 1.5 +
    (b.cld || 0) * 2.0;
  return Math.max(0, Math.round(score));
}

const RANDOM_UNIT_NICKNAMES_POOL: string[] = [
  'Arthur',
  'Lancelot',
  'Gawain',
  'Roland',
  'Siegfried',
  'Tristan',
  'Galahad',
  'Percival',
  'Cedric',
  'Alden',
  'Vance',
  'Kael',
  'Darius',
  'Thorne',
  'Gideon',
  'Marcus',
  'Leon',
  'Victor',
  'Robin',
  'Sylas',
  'Rowan',
  'Finn',
  'Bram',
  'Alaric',
  'Beric',
  'Cassian',
  'Dorian',
  'Evander',
  'Garrick',
  'Halvar',
  'Ivor',
  'Magnus',
  'Nolan',
  'Orin',
  'Perrin',
  'Roderick',
  'Soren',
  'Torin',
  'Ulric',
  'Varian',
  'Wulfric',
  'Zane',
  'Lucan',
  'Gareth',
  'Lionel',
  'Bedivere',
];

let nicknameRollCounter = 0;

export function generateRandomUnitNickname(_roleOrType?: string): string {
  const idx =
    (Math.floor(Math.random() * RANDOM_UNIT_NICKNAMES_POOL.length) +
      nicknameRollCounter++) %
    RANDOM_UNIT_NICKNAMES_POOL.length;
  return RANDOM_UNIT_NICKNAMES_POOL[idx];
}

export type UnitArchetypeId =
  | 'KING'
  | 'SOLDIER_MELEE'
  | 'SOLDIER_RANGED'
  | 'PEASANT'
  | 'TOWER_ARCHER'
  | 'TOWER_MUSKET'
  | 'TOWER_CANNON'
  | 'TOWER_HEXTECH'
  | 'ENEMY_MELEE'
  | 'ENEMY_RANGED'
  | 'ENEMY_MAGE'
  | 'ENEMY_CAMP_BUILDING'
  | 'ENEMY_WATCHTOWER';

export type UnitClassType = 'HERO' | 'TROOP' | 'BUILDING';

export type AllyUnitArchetypeId =
  | 'KING'
  | 'SOLDIER_MELEE'
  | 'SOLDIER_RANGED'
  | 'PEASANT';

export type UnitTierMap = Record<AllyUnitArchetypeId, number>;

export const INITIAL_UNIT_TIERS: UnitTierMap = {
  KING: 1,
  SOLDIER_MELEE: 1,
  SOLDIER_RANGED: 1,
  PEASANT: 1,
};

// Mỗi cấp T (T1 -> T10) cộng +15% vào 4 chỉ số cơ bản chính: HP, ATK, DEF, MAR
export const TIER_BONUS_PER_LEVEL = 0.15;

// Anh Hùng: Cấp tối đa 50, mỗi cấp chỉ số gốc +5% (chỉ bao gồm HP, ATK, DEF)
export const HERO_MAX_LEVEL = 50;
export const HERO_STAT_BONUS_PER_LEVEL = 0.05;

// Kẻ Địch: Chỉ mạnh hơn khi level cao hơn (+10% mỗi cấp cho HP, ATK, DEF, MAR; +20% mỗi cấp cho EXP)
export const ENEMY_STAT_BONUS_PER_LEVEL = 0.1;
export const ENEMY_EXP_BONUS_PER_LEVEL = 0.2;

export function getHeroMaxExp(level: number): number {
  const clamped = Math.max(1, Math.min(HERO_MAX_LEVEL, Math.floor(level || 1)));
  return clamped * 100;
}

export function getTierBonusPercent(tier: number): number {
  return Math.max(0, Math.round((tier - 1) * TIER_BONUS_PER_LEVEL * 100));
}

export interface UnitVisualConfig {
  primaryColor?: string;
  secondaryColor?: string;
  accentColor?: string;
  projectileColor?: string;
}

export interface EnemyWaveSpawnConfig {
  minWave: number;
  spawnWeight: number;
  goldBounty: number;
}

export interface WikiUnitEntry {
  id: UnitArchetypeId;
  faction: 'ALLY' | 'ENEMY';
  name: string;
  tier: number; // Cấp bậc quân [T1 -> T10]
  unitClassType: UnitClassType; // Phân loại Anh Hùng / Quân Lính / Công Trình
  unitClassLabel: 'Anh Hùng' | 'Quân Lính' | 'Công Trình';
  category?: 'CIVILIAN' | 'MILITARY';
  roleLabel: string;
  baseStats: UnitCombatStats;
  bonusStats: UnitCombatStats; // Cho Quân Ta (trang bị / huấn luyện / nâng cấp), Quân Địch = 0
  baseExpReward?: number; // Lượng EXP gốc của Kẻ Địch thưởng cho mọi Anh Hùng trên bản đồ khi bị tiêu diệt
  skill: UnitSkillInfo | null;
  skills?: UnitSkillInfo[]; // Hỗ trợ mở rộng tối đa 4 kỹ năng [Q, W, E, R] cho Anh Hùng / Đơn vị mới
  visuals?: UnitVisualConfig; // Cấu hình màu sắc / đạn bắn tự động cho đơn vị mới
  waveConfig?: EnemyWaveSpawnConfig; // Cấu hình tự động xuất hiện trong các đợt quái cho Kẻ Địch mới
}

// Công thức giảm thương của Giáp (DEF) và Kháng Phép (MAR) chuẩn Liên Minh Huyền Thoại (LoL)
export function getLoLDamageMultiplier(effectiveResist: number): number {
  if (effectiveResist >= 0) {
    return 100 / (100 + effectiveResist);
  }
  return 2 - 100 / (100 - effectiveResist);
}

export function getLoLDamageReductionPercent(resist: number): number {
  const mult = getLoLDamageMultiplier(resist);
  return Number(((1 - mult) * 100).toFixed(1));
}

export const ZERO_STATS: UnitCombatStats = {
  maxHp: 0,
  reg: 0,
  atk: 0,
  mag: 0,
  def: 0,
  mar: 0,
  ats: 0,
  crt: 0,
  eva: 0,
  crd: 0,
  spd: 0,
  ran: 0,
  dmgPercent: 0,
  resPercent: 0,
  penPercent: 0,
  penFlat: 0,
  lifesteal: 0,
  dmgBlock: 0,
  dbr: 0,
  eff: 0,
  skd: 0,
  cld: 0,
  pow: 0,
};

export const UNIT_WIKI_DATABASE: Record<UnitArchetypeId, WikiUnitEntry> = {
  KING: {
    id: 'KING',
    faction: 'ALLY',
    name: 'Farel',
    tier: 1,
    unitClassType: 'HERO',
    unitClassLabel: 'Anh Hùng',
    category: 'MILITARY',
    roleLabel: 'Anh Hùng Tiên Phong · Cận Chiến',
    baseStats: {
      maxHp: 280,
      reg: 6,
      atk: 25,
      mag: 20,
      def: 35,
      mar: 30,
      ats: 1.0,
      crt: 15,
      eva: 8,
      crd: 150,
      spd: 77,
      ran: 44,
      dmgPercent: 5,
      resPercent: 5,
      penPercent: 0,
      penFlat: 2,
      lifesteal: 0,
      dmgBlock: 0,
      dbr: 0,
      eff: 0,
      skd: 100,
      cld: 0,
      pow: 365,
    },
    bonusStats: { ...ZERO_STATS },
    skill: {
      id: 'FAREL_HOLY_SWORD',
      name: 'Thánh kiếm Farel',
      chancePercent: 100,
      isPassive: false,
      cooldownSec: 8,
      hotkeySlot: 'Q',
      theme: 'PHYSICAL',
      iconGlyph: 'HOLY_SWORD',
      description:
        'Farel bộc phát thánh kiếm chém mạnh xuống vùng đất trước mặt, gây [130% ATK] sát thương vật lý',
      mechanics: {
        triggerType: 'ACTIVE_DIRECTIONAL_LINE',
        damageMultiplier: 1.3,
        scaleStat: 'atk',
        damageType: 'PHYSICAL',
        aoeLength: 96,
        aoeWidth: 38,
        vfxKind: 'IMPACT_RING',
        vfxColor: '#fde047',
      },
    },
  },
  SOLDIER_MELEE: {
    id: 'SOLDIER_MELEE',
    faction: 'ALLY',
    name: 'Cấm Vệ Quân',
    tier: 1,
    unitClassType: 'TROOP',
    unitClassLabel: 'Quân Lính',
    category: 'MILITARY',
    roleLabel: 'Bộ Binh Giáp Sắt · Cận Chiến',
    baseStats: {
      maxHp: 120,
      reg: 3,
      atk: 16,
      mag: 10,
      def: 25,
      mar: 20,
      ats: 1.0,
      crt: 10,
      eva: 5,
      crd: 150,
      spd: 70,
      ran: 40,
      dmgPercent: 0,
      resPercent: 3,
      penPercent: 0,
      penFlat: 0,
      lifesteal: 0,
      dmgBlock: 0,
      dbr: 0,
      eff: 0,
      skd: 100,
      cld: 0,
      pow: 233,
    },
    bonusStats: { ...ZERO_STATS },
    skill: SOLDIER_SKILLS.MELEE,
  },
  SOLDIER_RANGED: {
    id: 'SOLDIER_RANGED',
    faction: 'ALLY',
    name: 'Cung Thủ Hoàng Gia',
    tier: 1,
    unitClassType: 'TROOP',
    unitClassLabel: 'Quân Lính',
    category: 'MILITARY',
    roleLabel: 'Xạ Thủ Tinh Nhuệ · Tầm Xa',
    baseStats: {
      maxHp: 80,
      reg: 2,
      atk: 14,
      mag: 15,
      def: 15,
      mar: 22,
      ats: 1.0,
      crt: 15,
      eva: 10,
      crd: 150,
      spd: 70,
      ran: 205,
      dmgPercent: 0,
      resPercent: 0,
      penPercent: 5,
      penFlat: 1,
      lifesteal: 0,
      dmgBlock: 0,
      dbr: 0,
      eff: 0,
      skd: 100,
      cld: 0,
      pow: 235,
    },
    bonusStats: { ...ZERO_STATS },
    skill: SOLDIER_SKILLS.RANGED,
  },
  PEASANT: {
    id: 'PEASANT',
    faction: 'ALLY',
    name: 'Nông Dân',
    tier: 1,
    unitClassType: 'TROOP',
    unitClassLabel: 'Quân Lính',
    category: 'CIVILIAN',
    roleLabel: 'Hậu Cần & Canh Tác',
    baseStats: {
      maxHp: 50,
      reg: 2,
      atk: 4,
      mag: 2,
      def: 10,
      mar: 10,
      ats: 1.0,
      crt: 0,
      eva: 5,
      crd: 150,
      spd: 46,
      ran: 0,
      dmgPercent: 0,
      resPercent: 0,
      penPercent: 0,
      penFlat: 0,
      lifesteal: 0,
      dmgBlock: 0,
      dbr: 0,
      eff: 0,
      skd: 100,
      cld: 0,
      pow: 119,
    },
    bonusStats: { ...ZERO_STATS },
    skill: null,
  },
  TOWER_ARCHER: {
    id: 'TOWER_ARCHER',
    faction: 'ALLY',
    name: 'Tháp Cung Thủ',
    tier: 1,
    unitClassType: 'BUILDING',
    unitClassLabel: 'Công Trình',
    category: 'MILITARY',
    roleLabel: 'Tháp Phòng Thủ Tầm Xa · Bắn Nhanh · Nhiễu Nhẹ',
    baseStats: {
      maxHp: 240,
      reg: 0,
      atk: 16,
      mag: 5,
      def: 26,
      mar: 42,
      ats: 1.5,
      crt: 12,
      eva: 0,
      crd: 150,
      spd: 0,
      ran: 340,
      dmgPercent: 0,
      resPercent: 5,
      penPercent: 5,
      penFlat: 1,
      lifesteal: 0,
      dmgBlock: 1,
      dbr: 0,
      eff: 0,
      skd: 100,
      cld: 0,
      pow: 315,
    },
    bonusStats: { ...ZERO_STATS },
    skill: {
      id: 'TOWER_ARCHER_TRIPLE_VOLLEY',
      name: 'Liên Xạ Tam Tiễn',
      chancePercent: 25,
      isPassive: true,
      theme: 'PHYSICAL',
      iconGlyph: 'POISON_ARROW',
      description:
        '[25% tỉ lệ] bắn ra thêm [3 mũi tên] gây [100% ATK] [sát thương vật lý] mỗi mũi, cách nhau [0.3s] (không kích hoạt lặp).',
    },
  },
  TOWER_MUSKET: {
    id: 'TOWER_MUSKET',
    faction: 'ALLY',
    name: 'Tháp Súng Hỏa Mai',
    tier: 1,
    unitClassType: 'BUILDING',
    unitClassLabel: 'Công Trình',
    category: 'MILITARY',
    roleLabel: 'Tháp Hỏa Mai Tầm Vừa · Đạn Thẳng Nhanh · Xuyên Giáp',
    baseStats: {
      maxHp: 250,
      reg: 0,
      atk: 24,
      mag: 5,
      def: 28,
      mar: 42,
      ats: 1.0,
      crt: 15,
      eva: 0,
      crd: 150,
      spd: 0,
      ran: 280,
      dmgPercent: 0,
      resPercent: 5,
      penPercent: 10,
      penFlat: 2,
      lifesteal: 0,
      dmgBlock: 1,
      dbr: 0,
      eff: 0,
      skd: 100,
      cld: 0,
      pow: 335,
    },
    bonusStats: { ...ZERO_STATS },
    skill: {
      id: 'TOWER_MUSKET_PIERCING_SHOT',
      name: 'Đạn Chì Xuyên Phá',
      chancePercent: 25,
      isPassive: true,
      theme: 'PHYSICAL',
      iconGlyph: 'BLOOD_STRIKE',
      description:
        '[25% tỉ lệ] bắn đạn cường hóa gây [150% ATK] [sát thương vật lý] kèm [+50% Xuyên Giáp (PEN%)] và đặt debuff [Phá Giáp (-35% DEF)] trong [3s].',
    },
  },
  TOWER_CANNON: {
    id: 'TOWER_CANNON',
    faction: 'ALLY',
    name: 'Tháp Pháo Hạng Nặng',
    tier: 1,
    unitClassType: 'BUILDING',
    unitClassLabel: 'Công Trình',
    category: 'MILITARY',
    roleLabel: 'Tháp Đại Pháo Hạng Nặng · Máu & Giáp Cao · Đánh Lan Knockback',
    baseStats: {
      maxHp: 380,
      reg: 0,
      atk: 42,
      mag: 5,
      def: 42,
      mar: 45,
      ats: 0.6,
      crt: 10,
      eva: 0,
      crd: 150,
      spd: 0,
      ran: 250,
      dmgPercent: 0,
      resPercent: 8,
      penPercent: 5,
      penFlat: 2,
      lifesteal: 0,
      dmgBlock: 2,
      dbr: 0,
      eff: 0,
      skd: 100,
      cld: 0,
      pow: 420,
    },
    bonusStats: { ...ZERO_STATS },
    skill: {
      id: 'TOWER_CANNON_AOE_BLAST',
      name: 'Đại Pháo Nổ Lan',
      chancePercent: 100,
      isPassive: true,
      theme: 'PHYSICAL',
      iconGlyph: 'METEOR',
      description:
        'Đòn đánh thường nâng cấp thành [đòn đánh nổ lan], gây [100% ATK] [sát thương vật lý] diện rộng kèm [220% đẩy lùi].',
    },
  },
  TOWER_HEXTECH: {
    id: 'TOWER_HEXTECH',
    faction: 'ALLY',
    name: 'Tháp Pháo Hextech',
    tier: 1,
    unitClassType: 'BUILDING',
    unitClassLabel: 'Công Trình',
    category: 'MILITARY',
    roleLabel: 'Tháp Ma Đạo Hextech · Tầm Xa · Làm Chậm & Tia Tê Liệt',
    baseStats: {
      maxHp: 250,
      reg: 0,
      atk: 5,
      mag: 34,
      def: 26,
      mar: 46,
      ats: 1.0,
      crt: 12,
      eva: 0,
      crd: 150,
      spd: 0,
      ran: 330,
      dmgPercent: 0,
      resPercent: 6,
      penPercent: 8,
      penFlat: 2,
      lifesteal: 0,
      dmgBlock: 1,
      dbr: 0,
      eff: 0,
      skd: 100,
      cld: 0,
      pow: 360,
    },
    bonusStats: { ...ZERO_STATS },
    skill: {
      id: 'TOWER_HEXTECH_SLOW_ORB',
      name: 'Cầu Năng Lượng Hextech',
      chancePercent: 100,
      isPassive: true,
      theme: 'DEBUFF',
      iconGlyph: 'ICE_NOVA',
      description:
        'Đòn đánh thường bắn quả cầu năng lượng gây [100% ATK] [sát thương vật lý] kèm thêm [75% MAG] [sát thương phép] cùng lúc và đặt debuff [Làm Chậm -30% SPD] (cộng dồn) trong [3s].',
    },
    skills: [
      {
        id: 'TOWER_HEXTECH_SLOW_ORB',
        name: 'Cầu Năng Lượng Hextech',
        chancePercent: 100,
        isPassive: true,
        theme: 'DEBUFF',
        iconGlyph: 'ICE_NOVA',
        description:
          'Đòn đánh thường bắn quả cầu năng lượng gây [100% ATK] [sát thương vật lý] kèm thêm [75% MAG] [sát thương phép] cùng lúc và đặt debuff [Làm Chậm -30% SPD] (cộng dồn) trong [3s].',
      },
      {
        id: 'TOWER_HEXTECH_PARALYZE_BEAM',
        name: 'Tia Năng Lượng Tê Liệt',
        chancePercent: 25,
        isPassive: true,
        theme: 'MAGIC',
        iconGlyph: 'LIGHTNING',
        description:
          '[25% tỉ lệ] phóng tia năng lượng từ nòng súng đến mục tiêu, gây tức thì [150% MAG] [sát thương phép] kèm [240% đẩy lùi] và đặt debuff [Tê Liệt -20% MAR] ([Choáng bất động]) trong [3s].',
      },
    ],
  },
  ENEMY_MELEE: {
    id: 'ENEMY_MELEE',
    faction: 'ENEMY',
    name: 'Chiến Binh Hắc Ám',
    tier: 1,
    unitClassType: 'TROOP',
    unitClassLabel: 'Quân Lính',
    roleLabel: 'Quân Địch Tiên Phong · Cận Chiến',
    baseStats: {
      maxHp: 125,
      reg: 2,
      atk: 17,
      mag: 10,
      def: 25,
      mar: 18,
      ats: 1.0,
      crt: 10,
      eva: 5,
      crd: 150,
      spd: 67,
      ran: 38,
      dmgPercent: 0,
      resPercent: 0,
      penPercent: 0,
      penFlat: 0,
      lifesteal: 0,
      dmgBlock: 0,
      dbr: 0,
      eff: 0,
      skd: 100,
      cld: 0,
      pow: 223,
    },
    bonusStats: { ...ZERO_STATS },
    baseExpReward: 15,
    skill: null,
  },
  ENEMY_RANGED: {
    id: 'ENEMY_RANGED',
    faction: 'ENEMY',
    name: 'Cung Thủ Bóng Đêm',
    tier: 1,
    unitClassType: 'TROOP',
    unitClassLabel: 'Quân Lính',
    roleLabel: 'Quân Địch Ám Kích · Tầm Xa',
    baseStats: {
      maxHp: 85,
      reg: 1,
      atk: 15,
      mag: 14,
      def: 15,
      mar: 24,
      ats: 1.0,
      crt: 12,
      eva: 8,
      crd: 150,
      spd: 63,
      ran: 190,
      dmgPercent: 0,
      resPercent: 0,
      penPercent: 0,
      penFlat: 0,
      lifesteal: 0,
      dmgBlock: 0,
      dbr: 0,
      eff: 0,
      skd: 100,
      cld: 0,
      pow: 216,
    },
    bonusStats: { ...ZERO_STATS },
    baseExpReward: 18,
    skill: null,
  },
  ENEMY_MAGE: {
    id: 'ENEMY_MAGE',
    faction: 'ENEMY',
    name: 'Pháp Sư Bóng Đêm',
    tier: 1,
    unitClassType: 'TROOP',
    unitClassLabel: 'Quân Lính',
    roleLabel: 'Quân Địch Hắc Pháp · Tầm Xa Phép Thuật',
    baseStats: {
      maxHp: 90,
      reg: 2,
      atk: 8,
      mag: 22,
      def: 12,
      mar: 28,
      ats: 0.85,
      crt: 12,
      eva: 6,
      crd: 150,
      spd: 63,
      ran: 195,
      dmgPercent: 0,
      resPercent: 0,
      penPercent: 5,
      penFlat: 2,
      lifesteal: 0,
      dmgBlock: 0,
      dbr: 0,
      eff: 0,
      skd: 100,
      cld: 0,
      pow: 230,
    },
    bonusStats: { ...ZERO_STATS },
    baseExpReward: 22,
    skill: {
      id: 'DARK_MAGE_MEGA_ORB',
      name: 'Quả Cầu Hủy Diệt',
      chancePercent: 20,
      isPassive: true,
      theme: 'MAGIC',
      iconGlyph: 'ARCANE_BOLT',
      description:
        'Đòn bắn có [20% tỉ lệ] phóng ra quả cầu năng lượng kích thước lớn, chạm mục tiêu phát nổ diện rộng gây [150% MAG] sát thương phép kèm [200% đẩy lùi] cho những kẻ địch trúng chiêu.',
      mechanics: {
        triggerType: 'PASSIVE_ON_HIT',
        damageMultiplier: 1.5,
        scaleStat: 'mag',
        damageType: 'MAGIC',
        vfxKind: 'IMPACT_RING',
        vfxColor: '#e879f9',
      },
    },
  },
  ENEMY_CAMP_BUILDING: {
    id: 'ENEMY_CAMP_BUILDING',
    faction: 'ENEMY',
    name: 'Trại Quân Địch',
    tier: 1,
    unitClassType: 'BUILDING',
    unitClassLabel: 'Công Trình',
    roleLabel: 'Công Trình Địch Trung Tâm · Miễn Nhiễm Debuff',
    baseStats: {
      maxHp: 420,
      reg: 0,
      atk: 0,
      mag: 0,
      def: 35,
      mar: 35,
      ats: 0,
      crt: 0,
      eva: 0,
      crd: 150,
      spd: 0,
      ran: 0,
      dmgPercent: 0,
      resPercent: 10,
      penPercent: 0,
      penFlat: 0,
      lifesteal: 0,
      dmgBlock: 2,
      dbr: 100,
      eff: 0,
      skd: 100,
      cld: 0,
      pow: 450,
    },
    bonusStats: { ...ZERO_STATS },
    baseExpReward: 45,
    skill: null,
  },
  ENEMY_WATCHTOWER: {
    id: 'ENEMY_WATCHTOWER',
    faction: 'ENEMY',
    name: 'Tháp Canh Hắc Ám',
    tier: 1,
    unitClassType: 'BUILDING',
    unitClassLabel: 'Công Trình',
    roleLabel: 'Công Trình Phòng Thủ Tầm Xa · Miễn Nhiễm Debuff',
    baseStats: {
      maxHp: 240,
      reg: 0,
      atk: 19,
      mag: 10,
      def: 28,
      mar: 28,
      ats: 0.9,
      crt: 10,
      eva: 0,
      crd: 150,
      spd: 0,
      ran: 320,
      dmgPercent: 0,
      resPercent: 5,
      penPercent: 5,
      penFlat: 2,
      lifesteal: 0,
      dmgBlock: 1,
      dbr: 100,
      eff: 0,
      skd: 100,
      cld: 0,
      pow: 310,
    },
    bonusStats: { ...ZERO_STATS },
    baseExpReward: 30,
    skill: null,
  },
};

// ============================================================================
// HỆ THỐNG TRANG BỊ & ĐÁ QUÝ KHẢM (6 LOẠI Ô TRANG BỊ & 5 BẬC PHẨM CHẤT)
// Quy tắc bắt buộc:
// 1. Anh hùng và Quân lính dùng chung hệ thống item trang bị gồm 6 ô:
//    Mũ (HELMET), Áo (ARMOR), Vũ khí (WEAPON), Giày (BOOTS), Nhẫn (RING), Dây chuyền (AMULET).
// 2. Chỉ số Tốc độ di chuyển (SPD) CHỈ ĐƯỢC PHÉP nằm trong trang bị Giày (BOOTS).
// 3. 5 bậc phẩm chất: Trắng (WHITE) -> Xanh lá (GREEN) -> Xanh lam (BLUE) -> Tím (PURPLE) -> Vàng (GOLD).
// 4. Trang bị có thể nâng cấp từ +1 đến +5, khảm 1 viên Đá Quý (mang 1 dòng thuộc tính duy nhất, 5 phẩm chất) và bán lấy Vàng.
// ============================================================================

export type EquipmentSlot =
  | 'HELMET'
  | 'ARMOR'
  | 'WEAPON'
  | 'BOOTS'
  | 'RING'
  | 'AMULET';

export type EquipmentRarity = 'WHITE' | 'GREEN' | 'BLUE' | 'PURPLE' | 'GOLD';

export const EQUIPMENT_SLOTS_ORDER: EquipmentSlot[] = [
  'HELMET',
  'ARMOR',
  'WEAPON',
  'BOOTS',
  'RING',
  'AMULET',
];

export const EQUIPMENT_SLOT_META: Record<
  EquipmentSlot,
  { slot: EquipmentSlot; nameVi: string; shortLabel: string; mainFocus: string }
> = {
  HELMET: {
    slot: 'HELMET',
    nameVi: 'Mũ',
    shortLabel: 'Mũ',
    mainFocus: 'HP, DEF, MAR, RES%',
  },
  ARMOR: {
    slot: 'ARMOR',
    nameVi: 'Áo',
    shortLabel: 'Áo',
    mainFocus: 'HP, DEF, MAR, REG',
  },
  WEAPON: {
    slot: 'WEAPON',
    nameVi: 'Vũ Khí',
    shortLabel: 'V.Khí',
    mainFocus: 'ATK, MAG, ATS, CRT, PEN',
  },
  BOOTS: {
    slot: 'BOOTS',
    nameVi: 'Giày',
    shortLabel: 'Giày',
    mainFocus: 'SPD (Luôn có ở Giày), EVA, DEF',
  },
  RING: {
    slot: 'RING',
    nameVi: 'Nhẫn',
    shortLabel: 'Nhẫn',
    mainFocus: 'ATK, MAG, CRT, CRD, DMG%',
  },
  AMULET: {
    slot: 'AMULET',
    nameVi: 'Dây Chuyền',
    shortLabel: 'D.Chuyền',
    mainFocus: 'HP, MAG, REG, MAR, RES%, PEN%',
  },
};

export const EQUIPMENT_RARITY_META: Record<
  EquipmentRarity,
  {
    id: EquipmentRarity;
    nameVi: string;
    borderHex: string;
    textHex: string;
    bgHex: string;
    glowClass: string;
  }
> = {
  WHITE: {
    id: 'WHITE',
    nameVi: 'Thường',
    borderHex: '#e5e7eb',
    textHex: '#f3f4f6',
    bgHex: '#27272a',
    glowClass: 'shadow-[0_0_6px_rgba(229,231,235,0.45)]',
  },
  GREEN: {
    id: 'GREEN',
    nameVi: 'Phổ biến',
    borderHex: '#4ade80',
    textHex: '#4ade80',
    bgHex: '#064e3b',
    glowClass: 'shadow-[0_0_6px_rgba(74,222,128,0.55)]',
  },
  BLUE: {
    id: 'BLUE',
    nameVi: 'Hiếm có',
    borderHex: '#38bdf8',
    textHex: '#38bdf8',
    bgHex: '#0c4a6e',
    glowClass: 'shadow-[0_0_6px_rgba(56,189,248,0.55)]',
  },
  PURPLE: {
    id: 'PURPLE',
    nameVi: 'Siêu hiếm',
    borderHex: '#c084fc',
    textHex: '#c084fc',
    bgHex: '#3b0764',
    glowClass: 'shadow-[0_0_6px_rgba(192,132,252,0.6)]',
  },
  GOLD: {
    id: 'GOLD',
    nameVi: 'Huyền thoại',
    borderHex: '#fbbf24',
    textHex: '#fde047',
    bgHex: '#451a03',
    glowClass: 'shadow-[0_0_8px_rgba(251,191,36,0.75)]',
  },
};

// Đá quý khảm trang bị: Chỉ mang 1 dòng thuộc tính duy nhất, có 5 phẩm chất tương tự trang bị
export interface GemItem {
  id: string;
  name: string;
  rarity: EquipmentRarity;
  statKey: keyof UnitCombatStats;
  statValue: number;
  statLabel: string; // Ví dụ: "+25 HP", "+12 ATK"
  quantity: number;
}

// 5 loại Đá Quý với 5 phẩm chất (Trắng / Xanh lá / Xanh lam / Tím / Vàng) để test khảm
export const STARTER_GEMS: GemItem[] = [
  {
    id: 'gem-white-hp',
    name: 'Ngọc Thạch Trắng',
    rarity: 'WHITE',
    statKey: 'maxHp',
    statValue: 25,
    statLabel: '+25 HP',
    quantity: 3,
  },
  {
    id: 'gem-green-def',
    name: 'Ngọc Lục Bảo',
    rarity: 'GREEN',
    statKey: 'def',
    statValue: 6,
    statLabel: '+6 DEF',
    quantity: 3,
  },
  {
    id: 'gem-blue-mar',
    name: 'Ngọc Lam Tinh',
    rarity: 'BLUE',
    statKey: 'mar',
    statValue: 8,
    statLabel: '+8 MAR',
    quantity: 3,
  },
  {
    id: 'gem-purple-crt',
    name: 'Ngọc Tử Tinh',
    rarity: 'PURPLE',
    statKey: 'penPercent',
    statValue: 8,
    statLabel: '+8% PEN%',
    quantity: 3,
  },
  {
    id: 'gem-gold-lifesteal',
    name: 'Ngọc Hoàng Kim',
    rarity: 'GOLD',
    statKey: 'lifesteal',
    statValue: 10,
    statLabel: '+10% LST%',
    quantity: 3,
  },
];

export type EquipmentVisualKind =
  | 'HELMET'
  | 'ARMOR_DEF'
  | 'ARMOR_MAR'
  | 'WEAPON_ATK'
  | 'WEAPON_MAG'
  | 'BOOTS'
  | 'RING'
  | 'AMULET';

export interface EquipmentItem {
  id: string;
  name: string;
  slot: EquipmentSlot;
  rarity: EquipmentRarity;
  visualKind?: EquipmentVisualKind;
  mainStatKey?: keyof UnitCombatStats;
  mainStatValue?: number;
  subStats?: Partial<UnitCombatStats>;
  description: string;
  stats: Partial<UnitCombatStats>;
  upgradeLevel?: number; // Cấp nâng cấp từ 0 đến 5 (+1 -> +5): CHỈ tăng chỉ số chính (+20%/cấp)
  socketedGem?: Omit<GemItem, 'quantity'> | null; // Đá quý đã khảm (1 dòng thuộc tính duy nhất)
  sellGold?: number; // Giá bán nhận Vàng
}

export type UnitEquipmentLoadout = Partial<Record<EquipmentSlot, EquipmentItem>>;

export type AllUnitsEquipmentMap = Record<
  AllyUnitArchetypeId,
  UnitEquipmentLoadout
>;

export const INITIAL_UNIT_EQUIPMENT: AllUnitsEquipmentMap = {
  KING: {},
  SOLDIER_MELEE: {},
  SOLDIER_RANGED: {},
  PEASANT: {},
};

// ============================================================================
// HỆ THỐNG 40 THIẾT KẾ TRANG BỊ (8 NHÁNH HÌNH ẢNH × 5 PHẨM CHẤT)
// & QUY TẮC DÒNG CHỈ SỐ CHÍNH + DÒNG CHỈ SỐ PHỤ NGẪU NHIÊN
// - Mỗi trang bị có 1 dòng chỉ số chính cao; khi nâng cấp (+1..+5) CHỈ tăng chỉ số chính.
//   + Nón (HELMET): HP (maxHp)
//   + Áo (ARMOR): DEF (Giáp vật lý - ARMOR_DEF) hoặc MAR (Giáp phép - ARMOR_MAR)
//   + Vũ khí (WEAPON): ATK (Kiếm - WEAPON_ATK) hoặc MAG (Trượng phép - WEAPON_MAG)
//   + Giày (BOOTS): SPD (spd)
//   + Nhẫn (RING): CRT, CRD, ATS hoặc ATK
//   + Dây chuyền (AMULET): MAG, DEF, MAR, HP (maxHp), EVA hoặc REG
// - Số dòng phụ theo phẩm chất:
//   + Thường (WHITE): 0 dòng phụ
//   + Phổ biến (GREEN): 1 dòng phụ
//   + Hiếm có (BLUE): 2 dòng phụ
//   + Siêu hiếm (PURPLE): 3 dòng phụ
//   + Huyền thoại (GOLD): 4 dòng phụ
// ============================================================================

export const EQUIPMENT_VISUAL_KIND_ORDER: EquipmentVisualKind[] = [
  'HELMET',
  'ARMOR_DEF',
  'ARMOR_MAR',
  'WEAPON_ATK',
  'WEAPON_MAG',
  'BOOTS',
  'RING',
  'AMULET',
];

export const EQUIPMENT_MAIN_STAT_POOLS_BY_VISUAL: Record<
  EquipmentVisualKind,
  Array<keyof UnitCombatStats>
> = {
  HELMET: ['maxHp'],
  ARMOR_DEF: ['def'],
  ARMOR_MAR: ['mar'],
  WEAPON_ATK: ['atk'],
  WEAPON_MAG: ['mag'],
  BOOTS: ['spd'],
  RING: ['crt', 'crd', 'ats', 'atk'],
  AMULET: ['mag', 'def', 'mar', 'maxHp', 'eva', 'reg'],
};

export const EQUIPMENT_MAIN_STAT_VALUES_BY_RARITY: Record<
  keyof UnitCombatStats,
  Record<EquipmentRarity, number>
> = {
  maxHp: { WHITE: 45, GREEN: 75, BLUE: 115, PURPLE: 170, GOLD: 250 },
  reg: { WHITE: 5, GREEN: 8, BLUE: 12, PURPLE: 18, GOLD: 26 },
  atk: { WHITE: 12, GREEN: 19, BLUE: 28, PURPLE: 42, GOLD: 62 },
  mag: { WHITE: 12, GREEN: 19, BLUE: 28, PURPLE: 42, GOLD: 62 },
  def: { WHITE: 12, GREEN: 18, BLUE: 26, PURPLE: 38, GOLD: 55 },
  mar: { WHITE: 12, GREEN: 18, BLUE: 26, PURPLE: 38, GOLD: 55 },
  ats: { WHITE: 0.12, GREEN: 0.18, BLUE: 0.25, PURPLE: 0.35, GOLD: 0.5 },
  crt: { WHITE: 8, GREEN: 12, BLUE: 17, PURPLE: 24, GOLD: 32 },
  eva: { WHITE: 6, GREEN: 10, BLUE: 14, PURPLE: 20, GOLD: 28 },
  crd: { WHITE: 15, GREEN: 22, BLUE: 32, PURPLE: 45, GOLD: 65 },
  spd: { WHITE: 18, GREEN: 24, BLUE: 30, PURPLE: 38, GOLD: 48 },
  ran: { WHITE: 0, GREEN: 0, BLUE: 0, PURPLE: 0, GOLD: 0 },
  dmgPercent: { WHITE: 5, GREEN: 8, BLUE: 12, PURPLE: 16, GOLD: 22 },
  resPercent: { WHITE: 5, GREEN: 8, BLUE: 12, PURPLE: 16, GOLD: 22 },
  penPercent: { WHITE: 6, GREEN: 10, BLUE: 14, PURPLE: 20, GOLD: 28 },
  penFlat: { WHITE: 5, GREEN: 8, BLUE: 12, PURPLE: 18, GOLD: 25 },
  lifesteal: { WHITE: 4, GREEN: 7, BLUE: 10, PURPLE: 14, GOLD: 20 },
  dmgBlock: { WHITE: 4, GREEN: 7, BLUE: 11, PURPLE: 16, GOLD: 24 },
  dbr: { WHITE: 6, GREEN: 10, BLUE: 15, PURPLE: 22, GOLD: 30 },
  eff: { WHITE: 6, GREEN: 10, BLUE: 15, PURPLE: 22, GOLD: 30 },
  skd: { WHITE: 8, GREEN: 12, BLUE: 18, PURPLE: 25, GOLD: 35 },
  cld: { WHITE: 4, GREEN: 7, BLUE: 10, PURPLE: 15, GOLD: 20 },
  pow: { WHITE: 0, GREEN: 0, BLUE: 0, PURPLE: 0, GOLD: 0 },
};

export interface EquipmentDesignTemplate {
  visualKind: EquipmentVisualKind;
  slot: EquipmentSlot;
  rarity: EquipmentRarity;
  name: string;
  description: string;
  sellGold: number;
}

export const EQUIPMENT_40_DESIGNS: Record<
  EquipmentVisualKind,
  Record<EquipmentRarity, EquipmentDesignTemplate>
> = {
  HELMET: {
    WHITE: {
      visualKind: 'HELMET',
      slot: 'HELMET',
      rarity: 'WHITE',
      name: 'Mũ Sắt Tân Binh',
      description: 'Tăng HP tối đa cho đơn vị trang bị.',
      sellGold: 45,
    },
    GREEN: {
      visualKind: 'HELMET',
      slot: 'HELMET',
      rarity: 'GREEN',
      name: 'Mũ Đồng Chiến Trận',
      description: 'Tăng HP tối đa kèm 1 dòng chỉ số phụ.',
      sellGold: 80,
    },
    BLUE: {
      visualKind: 'HELMET',
      slot: 'HELMET',
      rarity: 'BLUE',
      name: 'Mũ Thép Lam Tinh',
      description: 'Tăng HP tối đa kèm 2 dòng chỉ số phụ.',
      sellGold: 130,
    },
    PURPLE: {
      visualKind: 'HELMET',
      slot: 'HELMET',
      rarity: 'PURPLE',
      name: 'Mũ Giáp Ám Kim',
      description: 'Tăng HP tối đa kèm 3 dòng chỉ số phụ.',
      sellGold: 210,
    },
    GOLD: {
      visualKind: 'HELMET',
      slot: 'HELMET',
      rarity: 'GOLD',
      name: 'Vương Miện Long Thần',
      description: 'Tăng HP tối đa cực cao kèm 4 dòng chỉ số phụ.',
      sellGold: 340,
    },
  },
  ARMOR_DEF: {
    WHITE: {
      visualKind: 'ARMOR_DEF',
      slot: 'ARMOR',
      rarity: 'WHITE',
      name: 'Áo Giáp Da Thuộc',
      description: 'Tăng giáp vật lý DEF cho đơn vị trang bị.',
      sellGold: 50,
    },
    GREEN: {
      visualKind: 'ARMOR_DEF',
      slot: 'ARMOR',
      rarity: 'GREEN',
      name: 'Giáp Xích Tinh Thiết',
      description: 'Tăng giáp vật lý DEF kèm 1 dòng chỉ số phụ.',
      sellGold: 85,
    },
    BLUE: {
      visualKind: 'ARMOR_DEF',
      slot: 'ARMOR',
      rarity: 'BLUE',
      name: 'Trọng Giáp Kỵ Sĩ',
      description: 'Tăng giáp vật lý DEF kèm 2 dòng chỉ số phụ.',
      sellGold: 140,
    },
    PURPLE: {
      visualKind: 'ARMOR_DEF',
      slot: 'ARMOR',
      rarity: 'PURPLE',
      name: 'Giáp Hắc Thiết Hộ Vệ',
      description: 'Tăng giáp vật lý DEF kèm 3 dòng chỉ số phụ.',
      sellGold: 220,
    },
    GOLD: {
      visualKind: 'ARMOR_DEF',
      slot: 'ARMOR',
      rarity: 'GOLD',
      name: 'Thánh Giáp Long Lân',
      description: 'Tăng giáp vật lý DEF cực cao kèm 4 dòng chỉ số phụ.',
      sellGold: 350,
    },
  },
  ARMOR_MAR: {
    WHITE: {
      visualKind: 'ARMOR_MAR',
      slot: 'ARMOR',
      rarity: 'WHITE',
      name: 'Áo Choàng Học Đồ',
      description: 'Tăng kháng phép MAR cho đơn vị trang bị.',
      sellGold: 50,
    },
    GREEN: {
      visualKind: 'ARMOR_MAR',
      slot: 'ARMOR',
      rarity: 'GREEN',
      name: 'Pháp Bào Lục Ngọc',
      description: 'Tăng kháng phép MAR kèm 1 dòng chỉ số phụ.',
      sellGold: 85,
    },
    BLUE: {
      visualKind: 'ARMOR_MAR',
      slot: 'ARMOR',
      rarity: 'BLUE',
      name: 'Áo Choàng Tinh Tú',
      description: 'Tăng kháng phép MAR kèm 2 dòng chỉ số phụ.',
      sellGold: 140,
    },
    PURPLE: {
      visualKind: 'ARMOR_MAR',
      slot: 'ARMOR',
      rarity: 'PURPLE',
      name: 'Pháp Y Tử Tinh',
      description: 'Tăng kháng phép MAR kèm 3 dòng chỉ số phụ.',
      sellGold: 220,
    },
    GOLD: {
      visualKind: 'ARMOR_MAR',
      slot: 'ARMOR',
      rarity: 'GOLD',
      name: 'Thánh Bào Thiên Sứ',
      description: 'Tăng kháng phép MAR cực cao kèm 4 dòng chỉ số phụ.',
      sellGold: 350,
    },
  },
  WEAPON_ATK: {
    WHITE: {
      visualKind: 'WEAPON_ATK',
      slot: 'WEAPON',
      rarity: 'WHITE',
      name: 'Trường Kiếm Rèn Thô',
      description: 'Tăng sức tấn công vật lý ATK cho đơn vị trang bị.',
      sellGold: 55,
    },
    GREEN: {
      visualKind: 'WEAPON_ATK',
      slot: 'WEAPON',
      rarity: 'GREEN',
      name: 'Thanh Kiếm Thép Xanh',
      description: 'Tăng sức tấn công vật lý ATK kèm 1 dòng chỉ số phụ.',
      sellGold: 90,
    },
    BLUE: {
      visualKind: 'WEAPON_ATK',
      slot: 'WEAPON',
      rarity: 'BLUE',
      name: 'Hàn Băng Trọng Kiếm',
      description: 'Tăng sức tấn công vật lý ATK kèm 2 dòng chỉ số phụ.',
      sellGold: 145,
    },
    PURPLE: {
      visualKind: 'WEAPON_ATK',
      slot: 'WEAPON',
      rarity: 'PURPLE',
      name: 'Huyết Ảnh Ma Kiếm',
      description: 'Tăng sức tấn công vật lý ATK kèm 3 dòng chỉ số phụ.',
      sellGold: 230,
    },
    GOLD: {
      visualKind: 'WEAPON_ATK',
      slot: 'WEAPON',
      rarity: 'GOLD',
      name: 'Thần Kiếm Thái Dương',
      description: 'Tăng sức tấn công vật lý ATK cực cao kèm 4 dòng chỉ số phụ.',
      sellGold: 360,
    },
  },
  WEAPON_MAG: {
    WHITE: {
      visualKind: 'WEAPON_MAG',
      slot: 'WEAPON',
      rarity: 'WHITE',
      name: 'Trượng Gỗ Tập Sự',
      description: 'Tăng sức mạnh phép thuật MAG cho đơn vị trang bị.',
      sellGold: 55,
    },
    GREEN: {
      visualKind: 'WEAPON_MAG',
      slot: 'WEAPON',
      rarity: 'GREEN',
      name: 'Trượng Ngọc Lục Bảo',
      description: 'Tăng sức mạnh phép thuật MAG kèm 1 dòng chỉ số phụ.',
      sellGold: 90,
    },
    BLUE: {
      visualKind: 'WEAPON_MAG',
      slot: 'WEAPON',
      rarity: 'BLUE',
      name: 'Pháp Trượng Lam Băng',
      description: 'Tăng sức mạnh phép thuật MAG kèm 2 dòng chỉ số phụ.',
      sellGold: 145,
    },
    PURPLE: {
      visualKind: 'WEAPON_MAG',
      slot: 'WEAPON',
      rarity: 'PURPLE',
      name: 'Quyền Trượng Hư Không',
      description: 'Tăng sức mạnh phép thuật MAG kèm 3 dòng chỉ số phụ.',
      sellGold: 230,
    },
    GOLD: {
      visualKind: 'WEAPON_MAG',
      slot: 'WEAPON',
      rarity: 'GOLD',
      name: 'Thần Trượng Tinh Hà',
      description: 'Tăng sức mạnh phép thuật MAG cực cao kèm 4 dòng chỉ số phụ.',
      sellGold: 360,
    },
  },
  BOOTS: {
    WHITE: {
      visualKind: 'BOOTS',
      slot: 'BOOTS',
      rarity: 'WHITE',
      name: 'Giày Hành Quân Vải Bố',
      description: 'Tăng tốc độ di chuyển SPD cho đơn vị trang bị.',
      sellGold: 50,
    },
    GREEN: {
      visualKind: 'BOOTS',
      slot: 'BOOTS',
      rarity: 'GREEN',
      name: 'Giày Da Truy Phong',
      description: 'Tăng tốc độ di chuyển SPD kèm 1 dòng chỉ số phụ.',
      sellGold: 85,
    },
    BLUE: {
      visualKind: 'BOOTS',
      slot: 'BOOTS',
      rarity: 'BLUE',
      name: 'Chiến Hài Bạc Tốc',
      description: 'Tăng tốc độ di chuyển SPD kèm 2 dòng chỉ số phụ.',
      sellGold: 135,
    },
    PURPLE: {
      visualKind: 'BOOTS',
      slot: 'BOOTS',
      rarity: 'PURPLE',
      name: 'Giày Bóng Đêm Tức Thời',
      description: 'Tăng tốc độ di chuyển SPD kèm 3 dòng chỉ số phụ.',
      sellGold: 215,
    },
    GOLD: {
      visualKind: 'BOOTS',
      slot: 'BOOTS',
      rarity: 'GOLD',
      name: 'Thần Hài Quang Tốc',
      description: 'Tăng tốc độ di chuyển SPD cực cao kèm 4 dòng chỉ số phụ.',
      sellGold: 345,
    },
  },
  RING: {
    WHITE: {
      visualKind: 'RING',
      slot: 'RING',
      rarity: 'WHITE',
      name: 'Nhẫn Đồng Chiến Binh',
      description: 'Trang sức nhẫn gia tăng chỉ số chiến đấu chính.',
      sellGold: 50,
    },
    GREEN: {
      visualKind: 'RING',
      slot: 'RING',
      rarity: 'GREEN',
      name: 'Nhẫn Bạc Lục Bảo',
      description: 'Nhẫn chiến đấu kèm 1 dòng chỉ số phụ.',
      sellGold: 85,
    },
    BLUE: {
      visualKind: 'RING',
      slot: 'RING',
      rarity: 'BLUE',
      name: 'Nhẫn Lam Ngọc Tinh Anh',
      description: 'Nhẫn chiến đấu kèm 2 dòng chỉ số phụ.',
      sellGold: 140,
    },
    PURPLE: {
      visualKind: 'RING',
      slot: 'RING',
      rarity: 'PURPLE',
      name: 'Nhẫn Huyết Long Tử Tinh',
      description: 'Nhẫn chiến đấu kèm 3 dòng chỉ số phụ.',
      sellGold: 225,
    },
    GOLD: {
      visualKind: 'RING',
      slot: 'RING',
      rarity: 'GOLD',
      name: 'Nhẫn Thần Vương Vĩnh Cửu',
      description: 'Nhẫn thần vương kèm 4 dòng chỉ số phụ.',
      sellGold: 355,
    },
  },
  AMULET: {
    WHITE: {
      visualKind: 'AMULET',
      slot: 'AMULET',
      rarity: 'WHITE',
      name: 'Dây Chuyền Hộ Mệnh',
      description: 'Dây chuyền hộ thân gia tăng chỉ số chính.',
      sellGold: 50,
    },
    GREEN: {
      visualKind: 'AMULET',
      slot: 'AMULET',
      rarity: 'GREEN',
      name: 'Bùa Cổ Ngọc Bích',
      description: 'Dây chuyền hộ thân kèm 1 dòng chỉ số phụ.',
      sellGold: 85,
    },
    BLUE: {
      visualKind: 'AMULET',
      slot: 'AMULET',
      rarity: 'BLUE',
      name: 'Dây Chuyền Giọt Lệ Lam',
      description: 'Dây chuyền hộ thân kèm 2 dòng chỉ số phụ.',
      sellGold: 140,
    },
    PURPLE: {
      visualKind: 'AMULET',
      slot: 'AMULET',
      rarity: 'PURPLE',
      name: 'Ấn Chú Tâm Linh Tử Tinh',
      description: 'Dây chuyền hộ thân kèm 3 dòng chỉ số phụ.',
      sellGold: 225,
    },
    GOLD: {
      visualKind: 'AMULET',
      slot: 'AMULET',
      rarity: 'GOLD',
      name: 'Thánh Tích Trái Tim Rồng',
      description: 'Thánh tích hộ mệnh kèm 4 dòng chỉ số phụ.',
      sellGold: 355,
    },
  },
};

interface WeightedSubStatDefinition {
  statKey: keyof UnitCombatStats;
  weight: number; // Chỉ số cơ bản: 10 (cao), Chỉ số mở rộng: 2 (thấp)
  isFloat?: boolean;
  rangesByRarity: Record<
    Exclude<EquipmentRarity, 'WHITE'>,
    [number, number]
  >;
}

export const EQUIPMENT_SUBSTAT_POOL: WeightedSubStatDefinition[] = [
  // --- 10 CHỈ SỐ CƠ BẢN (Tỉ lệ xuất hiện cao: weight = 10) ---
  {
    statKey: 'maxHp',
    weight: 10,
    rangesByRarity: {
      GREEN: [8, 14],
      BLUE: [14, 24],
      PURPLE: [22, 36],
      GOLD: [34, 55],
    },
  },
  {
    statKey: 'reg',
    weight: 10,
    rangesByRarity: {
      GREEN: [1, 2],
      BLUE: [2, 3],
      PURPLE: [3, 5],
      GOLD: [5, 8],
    },
  },
  {
    statKey: 'atk',
    weight: 10,
    rangesByRarity: {
      GREEN: [2, 4],
      BLUE: [4, 6],
      PURPLE: [6, 9],
      GOLD: [9, 14],
    },
  },
  {
    statKey: 'mag',
    weight: 10,
    rangesByRarity: {
      GREEN: [2, 4],
      BLUE: [4, 6],
      PURPLE: [6, 9],
      GOLD: [9, 14],
    },
  },
  {
    statKey: 'def',
    weight: 10,
    rangesByRarity: {
      GREEN: [2, 4],
      BLUE: [4, 6],
      PURPLE: [6, 9],
      GOLD: [9, 14],
    },
  },
  {
    statKey: 'mar',
    weight: 10,
    rangesByRarity: {
      GREEN: [2, 4],
      BLUE: [4, 6],
      PURPLE: [6, 9],
      GOLD: [9, 14],
    },
  },
  {
    statKey: 'ats',
    weight: 10,
    isFloat: true,
    rangesByRarity: {
      GREEN: [0.02, 0.04],
      BLUE: [0.04, 0.06],
      PURPLE: [0.06, 0.09],
      GOLD: [0.09, 0.14],
    },
  },
  {
    statKey: 'crt',
    weight: 10,
    rangesByRarity: {
      GREEN: [1, 2],
      BLUE: [2, 4],
      PURPLE: [4, 6],
      GOLD: [6, 9],
    },
  },
  {
    statKey: 'eva',
    weight: 10,
    rangesByRarity: {
      GREEN: [1, 2],
      BLUE: [2, 4],
      PURPLE: [4, 6],
      GOLD: [6, 9],
    },
  },
  {
    statKey: 'crd',
    weight: 10,
    rangesByRarity: {
      GREEN: [3, 5],
      BLUE: [5, 8],
      PURPLE: [8, 13],
      GOLD: [13, 20],
    },
  },
  // --- 10 CHỈ SỐ MỞ RỘNG (Tỉ lệ xuất hiện thấp: weight = 2) ---
  {
    statKey: 'dmgPercent',
    weight: 2,
    rangesByRarity: {
      GREEN: [1, 2],
      BLUE: [2, 4],
      PURPLE: [4, 6],
      GOLD: [6, 10],
    },
  },
  {
    statKey: 'resPercent',
    weight: 2,
    rangesByRarity: {
      GREEN: [1, 2],
      BLUE: [2, 4],
      PURPLE: [4, 6],
      GOLD: [6, 10],
    },
  },
  {
    statKey: 'penPercent',
    weight: 2,
    rangesByRarity: {
      GREEN: [2, 3],
      BLUE: [3, 5],
      PURPLE: [5, 8],
      GOLD: [8, 12],
    },
  },
  {
    statKey: 'penFlat',
    weight: 2,
    rangesByRarity: {
      GREEN: [2, 3],
      BLUE: [3, 5],
      PURPLE: [5, 8],
      GOLD: [8, 13],
    },
  },
  {
    statKey: 'lifesteal',
    weight: 2,
    rangesByRarity: {
      GREEN: [1, 2],
      BLUE: [2, 4],
      PURPLE: [4, 7],
      GOLD: [7, 11],
    },
  },
  {
    statKey: 'dmgBlock',
    weight: 2,
    rangesByRarity: {
      GREEN: [2, 3],
      BLUE: [3, 5],
      PURPLE: [5, 9],
      GOLD: [9, 15],
    },
  },
  {
    statKey: 'dbr',
    weight: 2,
    rangesByRarity: {
      GREEN: [2, 4],
      BLUE: [4, 7],
      PURPLE: [7, 11],
      GOLD: [11, 16],
    },
  },
  {
    statKey: 'eff',
    weight: 2,
    rangesByRarity: {
      GREEN: [2, 4],
      BLUE: [4, 7],
      PURPLE: [7, 11],
      GOLD: [11, 16],
    },
  },
  {
    statKey: 'skd',
    weight: 2,
    rangesByRarity: {
      GREEN: [2, 4],
      BLUE: [4, 7],
      PURPLE: [7, 12],
      GOLD: [12, 18],
    },
  },
  {
    statKey: 'cld',
    weight: 2,
    rangesByRarity: {
      GREEN: [1, 2],
      BLUE: [2, 4],
      PURPLE: [4, 6],
      GOLD: [6, 10],
    },
  },
];

export const SUBSTAT_COUNT_BY_RARITY: Record<EquipmentRarity, number> = {
  WHITE: 0,
  GREEN: 1,
  BLUE: 2,
  PURPLE: 3,
  GOLD: 4,
};

export function rollEquipmentSubStats(
  rarity: EquipmentRarity,
  mainStatKey: keyof UnitCombatStats
): Partial<UnitCombatStats> {
  const count = SUBSTAT_COUNT_BY_RARITY[rarity] || 0;
  if (count <= 0 || rarity === 'WHITE') return {};

  const subStats: Partial<UnitCombatStats> = {};
  const available = EQUIPMENT_SUBSTAT_POOL.filter(
    (def) => def.statKey !== mainStatKey
  );

  for (let i = 0; i < count && available.length > 0; i++) {
    const totalWeight = available.reduce((acc, d) => acc + d.weight, 0);
    let r = Math.random() * totalWeight;
    let chosenIdx = 0;
    for (let j = 0; j < available.length; j++) {
      r -= available[j].weight;
      if (r <= 0) {
        chosenIdx = j;
        break;
      }
    }
    const chosen = available.splice(chosenIdx, 1)[0];
    const [minVal, maxVal] = chosen.rangesByRarity[rarity];
    if (chosen.isFloat) {
      const val = minVal + Math.random() * (maxVal - minVal);
      subStats[chosen.statKey] = Number(val.toFixed(2));
    } else {
      const val =
        Math.floor(Math.random() * (maxVal - minVal + 1)) + minVal;
      subStats[chosen.statKey] = val;
    }
  }

  return subStats;
}

export function generateRandomEquipmentItem(options?: {
  rarity?: EquipmentRarity;
  visualKind?: EquipmentVisualKind;
  slot?: EquipmentSlot;
  mainStatKey?: keyof UnitCombatStats;
  subStatsOverride?: Partial<UnitCombatStats>;
  idPrefix?: string;
}): EquipmentItem {
  const rarities: EquipmentRarity[] = [
    'WHITE',
    'GREEN',
    'BLUE',
    'PURPLE',
    'GOLD',
  ];
  const rarity: EquipmentRarity =
    options?.rarity || rarities[Math.floor(Math.random() * rarities.length)];

  let visualKind: EquipmentVisualKind;
  if (options?.visualKind) {
    visualKind = options.visualKind;
  } else if (options?.slot) {
    if (options.slot === 'ARMOR') {
      visualKind = Math.random() < 0.5 ? 'ARMOR_DEF' : 'ARMOR_MAR';
    } else if (options.slot === 'WEAPON') {
      visualKind = Math.random() < 0.5 ? 'WEAPON_ATK' : 'WEAPON_MAG';
    } else {
      visualKind = options.slot;
    }
  } else {
    visualKind =
      EQUIPMENT_VISUAL_KIND_ORDER[
        Math.floor(Math.random() * EQUIPMENT_VISUAL_KIND_ORDER.length)
      ];
  }

  const template = EQUIPMENT_40_DESIGNS[visualKind][rarity];
  const allowedMains = EQUIPMENT_MAIN_STAT_POOLS_BY_VISUAL[visualKind];
  const mainStatKey: keyof UnitCombatStats =
    options?.mainStatKey && allowedMains.includes(options.mainStatKey)
      ? options.mainStatKey
      : allowedMains[Math.floor(Math.random() * allowedMains.length)];

  const mainStatValue =
    EQUIPMENT_MAIN_STAT_VALUES_BY_RARITY[mainStatKey]?.[rarity] || 15;
  const subStats =
    options?.subStatsOverride !== undefined
      ? { ...options.subStatsOverride }
      : rollEquipmentSubStats(rarity, mainStatKey);

  const combinedStats: Partial<UnitCombatStats> = {
    ...subStats,
    [mainStatKey]: mainStatValue,
  };

  const uniqueId = `${options?.idPrefix || 'eq-inst'}-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;

  return {
    id: uniqueId,
    name: template.name,
    slot: template.slot,
    rarity,
    visualKind,
    mainStatKey,
    mainStatValue,
    subStats,
    description: template.description,
    stats: combinedStats,
    upgradeLevel: 0,
    socketedGem: null,
    sellGold: template.sellGold,
  };
}

export function resolveEquipmentItemStructure(item: EquipmentItem): {
  visualKind: EquipmentVisualKind;
  mainStatKey: keyof UnitCombatStats;
  mainStatValue: number;
  subStats: Partial<UnitCombatStats>;
} {
  let visualKind: EquipmentVisualKind = item.visualKind || 'HELMET';
  if (!item.visualKind) {
    if (item.slot === 'HELMET') visualKind = 'HELMET';
    else if (item.slot === 'BOOTS') visualKind = 'BOOTS';
    else if (item.slot === 'RING') visualKind = 'RING';
    else if (item.slot === 'AMULET') visualKind = 'AMULET';
    else if (item.slot === 'ARMOR') {
      visualKind =
        (item.stats?.mar || 0) > (item.stats?.def || 0)
          ? 'ARMOR_MAR'
          : 'ARMOR_DEF';
    } else if (item.slot === 'WEAPON') {
      visualKind =
        (item.stats?.mag || 0) > (item.stats?.atk || 0)
          ? 'WEAPON_MAG'
          : 'WEAPON_ATK';
    }
  }

  const allowedMains = EQUIPMENT_MAIN_STAT_POOLS_BY_VISUAL[visualKind];
  let mainStatKey: keyof UnitCombatStats =
    item.mainStatKey && allowedMains.includes(item.mainStatKey)
      ? item.mainStatKey
      : allowedMains[0];

  if (!item.mainStatKey && item.stats) {
    const foundAllowed = allowedMains.find(
      (k) => (item.stats[k] || 0) > 0
    );
    if (foundAllowed) {
      mainStatKey = foundAllowed;
    }
  }

  const defaultMainVal =
    EQUIPMENT_MAIN_STAT_VALUES_BY_RARITY[mainStatKey]?.[item.rarity] || 12;
  const mainStatValue =
    item.mainStatValue !== undefined && item.mainStatValue > 0
      ? item.mainStatValue
      : item.stats?.[mainStatKey] && (item.stats[mainStatKey] || 0) > 0
        ? (item.stats[mainStatKey] as number)
        : defaultMainVal;

  const subStats: Partial<UnitCombatStats> = {};
  if (item.subStats) {
    (Object.keys(item.subStats) as Array<keyof UnitCombatStats>).forEach(
      (k) => {
        const val = item.subStats?.[k];
        if (
          k !== mainStatKey &&
          k !== 'ran' &&
          k !== 'spd' &&
          k !== 'pow' &&
          val &&
          val > 0
        ) {
          subStats[k] = val;
        }
      }
    );
  } else if (item.stats && item.rarity !== 'WHITE') {
    (Object.keys(item.stats) as Array<keyof UnitCombatStats>).forEach((k) => {
      const val = item.stats[k];
      if (
        k !== mainStatKey &&
        k !== 'ran' &&
        k !== 'spd' &&
        k !== 'pow' &&
        val &&
        val > 0
      ) {
        subStats[k] = val;
      }
    });
  }

  return {
    visualKind,
    mainStatKey,
    mainStatValue,
    subStats,
  };
}

export const STARTER_WHITE_EQUIPMENT: EquipmentItem[] = [
  // --- 2 Trang bị Đặc Biệt Cấp Cao Để Test LST% & BLK (Đúng chuẩn 1 dòng chính cao + dòng phụ theo phẩm chất) ---
  {
    id: 'eq-purple-blood-dragon-ring',
    name: 'Nhẫn Huyết Long Tử Tinh',
    slot: 'RING',
    rarity: 'PURPLE',
    visualKind: 'RING',
    mainStatKey: 'crt',
    mainStatValue: 24,
    subStats: {
      lifesteal: 7,
      atk: 8,
      dmgPercent: 6,
    },
    description: 'Nhẫn chiến đấu kèm 3 dòng chỉ số phụ.',
    stats: {
      crt: 24,
      lifesteal: 7,
      atk: 8,
      dmgPercent: 6,
    },
    upgradeLevel: 0,
    socketedGem: null,
    sellGold: 225,
  },
  {
    id: 'eq-gold-dragon-armor',
    name: 'Thánh Giáp Long Lân',
    slot: 'ARMOR',
    rarity: 'GOLD',
    visualKind: 'ARMOR_DEF',
    mainStatKey: 'def',
    mainStatValue: 55,
    subStats: {
      dmgBlock: 14,
      maxHp: 45,
      mar: 12,
      resPercent: 8,
    },
    description: 'Tăng giáp vật lý DEF cực cao kèm 4 dòng chỉ số phụ.',
    stats: {
      def: 55,
      dmgBlock: 14,
      maxHp: 45,
      mar: 12,
      resPercent: 8,
    },
    upgradeLevel: 0,
    socketedGem: null,
    sellGold: 350,
  },
  // --- 8 Trang bị Cơ Bản Phẩm Chất Trắng (Đủ 8 nhánh thiết kế: Nón, Giáp DEF, Giáp MAR, Kiếm ATK, Trượng MAG, Giày, Nhẫn, Dây Chuyền) ---
  generateRandomEquipmentItem({
    rarity: 'WHITE',
    visualKind: 'HELMET',
    mainStatKey: 'maxHp',
    idPrefix: 'eq-white-helmet',
  }),
  generateRandomEquipmentItem({
    rarity: 'WHITE',
    visualKind: 'ARMOR_DEF',
    mainStatKey: 'def',
    idPrefix: 'eq-white-armor-def',
  }),
  generateRandomEquipmentItem({
    rarity: 'WHITE',
    visualKind: 'ARMOR_MAR',
    mainStatKey: 'mar',
    idPrefix: 'eq-white-armor-mar',
  }),
  generateRandomEquipmentItem({
    rarity: 'WHITE',
    visualKind: 'WEAPON_ATK',
    mainStatKey: 'atk',
    idPrefix: 'eq-white-weapon-atk',
  }),
  generateRandomEquipmentItem({
    rarity: 'WHITE',
    visualKind: 'WEAPON_MAG',
    mainStatKey: 'mag',
    idPrefix: 'eq-white-weapon-mag',
  }),
  generateRandomEquipmentItem({
    rarity: 'WHITE',
    visualKind: 'BOOTS',
    mainStatKey: 'spd',
    idPrefix: 'eq-white-boots',
  }),
  generateRandomEquipmentItem({
    rarity: 'WHITE',
    visualKind: 'RING',
    mainStatKey: 'crt',
    idPrefix: 'eq-white-ring',
  }),
  generateRandomEquipmentItem({
    rarity: 'WHITE',
    visualKind: 'AMULET',
    mainStatKey: 'mar',
    idPrefix: 'eq-white-amulet',
  }),
];

// ============================================================================
// BỘ HÀM KHỞI TẠO & ĐỊNH DẠNG CHUẨN QUY TẮC (FACTORY & HELPER FUNCTIONS)
// Kết nối trực tiếp với sổ tay GAME_RULES.md ở thư mục gốc dự án
// ============================================================================

/**
 * Tự động sinh chuỗi mô tả kỹ năng có gắn thẻ màu `[...]` chuẩn Quy Tắc 1 (GAME_RULES.md)
 * từ `SkillMechanicsConfig` nếu người lập trình không truyền sẵn `description`.
 */
export function buildSkillDescriptionFromMechanics(
  name: string,
  chancePercent: number,
  isPassive: boolean,
  mechanics?: SkillMechanicsConfig
): string {
  if (!mechanics) return name;
  const parts: string[] = [];
  if (isPassive && chancePercent < 100) {
    parts.push(`Đòn đánh có [${chancePercent}% tỉ lệ]`);
  } else {
    parts.push(`Kích hoạt ${name}`);
  }
  if (mechanics.damageMultiplier && mechanics.damageMultiplier > 0) {
    const pct = Math.round(mechanics.damageMultiplier * 100);
    const statLabel =
      mechanics.scaleStat === 'mag'
        ? 'MAG'
        : mechanics.scaleStat === 'maxHp'
          ? 'HP'
          : mechanics.scaleStat === 'def'
            ? 'DEF'
            : 'ATK';
    const dmgTypeVi =
      mechanics.damageType === 'MAGIC' ? 'sát thương phép' : 'sát thương vật lý';
    parts.push(`gây [${pct}% ${statLabel}] ${dmgTypeVi}`);
  }
  if (mechanics.selfShieldPercentMaxHp && mechanics.selfShieldPercentMaxHp > 0) {
    const durSec = Math.round((mechanics.selfShieldDurationMs || 5000) / 1000);
    parts.push(
      `tạo [Lá Chắn ${mechanics.selfShieldPercentMaxHp}% HP] trong [${durSec}s]`
    );
  }
  if (mechanics.selfHealPercentMaxHp && mechanics.selfHealPercentMaxHp > 0) {
    parts.push(`hồi [${mechanics.selfHealPercentMaxHp}% HP]`);
  }
  if (mechanics.applyStatusEffectId && mechanics.dotScalePercent) {
    const durSec = Math.round((mechanics.statusDurationMs || 5000) / 1000);
    const label =
      mechanics.applyStatusEffectId === 'BURN_DOT' ? 'thiêu đốt' : 'độc rút';
    parts.push(
      `gây hiệu ứng ${label} [${mechanics.dotScalePercent}% Phép/giây] trong [${durSec}s]`
    );
  }
  return `${parts.join(', ')}.`;
}

/**
 * Factory khởi tạo Kỹ Năng chuẩn Quy Tắc 1 (GAME_RULES.md):
 * - Bắt buộc mọi kỹ năng phải khai báo rõ `theme` thuộc 1 trong 6 tông màu nền kiểu Warcraft:
 *   PHYSICAL (Đỏ), MAGIC (Tím), DEFENSE (Xanh lam), BUFF (Vàng), DEBUFF (Xanh ngọc bích), HEAL (Xanh lá).
 * - Hỗ trợ tự động tạo mô tả có gắn thẻ `[...]` từ `mechanics` nếu chưa điền `description`.
 */
export function defineSkill(
  skill: Omit<UnitSkillInfo, 'description'> & {
    theme: SkillColorTheme;
    description?: string;
  }
): UnitSkillInfo {
  const isPassive = skill.isPassive ?? true;
  const chancePercent = Math.max(
    0,
    Math.min(100, Math.round(skill.chancePercent ?? 100))
  );
  const description =
    skill.description && skill.description.trim().length > 0
      ? skill.description
      : buildSkillDescriptionFromMechanics(
          skill.name,
          chancePercent,
          isPassive,
          skill.mechanics
        );
  return {
    ...skill,
    isPassive,
    chancePercent,
    description,
  };
}

/**
 * Helper tô màu nổi bật cho các cụm thông số trong mô tả kỹ năng (khi hiển thị đã ẩn dấu `[]` để nhìn thoải mái hơn):
 * - Sát thương vật lý (`130% ATK`, `vật lý`) -> Trùng màu ATK (`#fbbf24`)
 * - Sát thương phép (`phép`, `mar`, `mag`, `ma thuật`) -> Trùng màu Tím (`#c084fc`)
 * - Thời gian hiệu ứng / Hồi chiêu (`s`, `giây`, `phút`) -> Màu Xanh dương (`#38bdf8`)
 * - Hồi máu / Máu (`hồi`, `máu`, `hp`) -> Màu Xanh lá cây (`#4ade80`)
 * - Buff / Khiên / Tỉ lệ (`buff`, `lá chắn`, `khiên`, `tỉ lệ`, `tăng`) -> Màu Vàng sáng (`#fde047`)
 * - Debuff / Độc (`độc`, `làm chậm`, `suy yếu`, `thiêu đốt`) -> Màu Xanh ngọc (`#2dd4bf`)
 */
export function getSkillBracketColorHex(bracketSegment: string): string {
  const lower = bracketSegment.toLowerCase();
  if (
    lower.includes('phép') ||
    lower.includes('mar') ||
    lower.includes('mag') ||
    lower.includes('ma thuật')
  ) {
    return STAT_COLOR_HEX.mar; // #c084fc (Tím - Sát thương phép / MAR / MAG)
  }
  if (lower.includes('xuyên giáp') || lower.includes('pen')) {
    return '#e879f9'; // Hồng tím (Xuyên Giáp PEN%)
  }
  if (lower.includes('phá giáp') || lower.includes('def')) {
    return '#f87171'; // Đỏ san hô (Phá Giáp / DEF)
  }
  if (lower.includes('tê liệt') || lower.includes('choáng')) {
    return '#fde047'; // Vàng điện (Tê Liệt / Choáng)
  }
  if (lower.includes('đẩy lùi') || lower.includes('knockback')) {
    return '#fb923c'; // Cam rực (Đẩy lùi / Knockback)
  }
  if (
    lower.includes('atk') ||
    lower.includes('vật lý') ||
    lower.includes('nổ lan') ||
    lower.includes('mũi tên')
  ) {
    return STAT_COLOR_HEX.atk; // #fbbf24 (Vàng cam ATK / Vật lý)
  }
  if (
    lower.includes('giây') ||
    lower.includes('phút') ||
    /\b\d+(\.\d+)?s\b/.test(lower)
  ) {
    return '#38bdf8'; // Xanh dương (Thời gian hiệu ứng)
  }
  if (
    lower.includes('hồi') ||
    (lower.includes('hp') && !lower.includes('lá chắn') && !lower.includes('khiên')) ||
    (lower.includes('máu') && !lower.includes('lá chắn') && !lower.includes('khiên'))
  ) {
    return STAT_COLOR_HEX.maxHp; // #4ade80 (Xanh lá cây)
  }
  if (
    lower.includes('độc') ||
    lower.includes('chậm') ||
    lower.includes('suy yếu') ||
    lower.includes('thiêu đốt')
  ) {
    return '#2dd4bf'; // Xanh ngọc bích (Debuff)
  }
  if (
    lower.includes('buff') ||
    lower.includes('khiên') ||
    lower.includes('lá chắn') ||
    lower.includes('tỉ lệ') ||
    lower.includes('tăng')
  ) {
    return '#fde047'; // Vàng sáng (Tỉ lệ kích hoạt / Buff / Lá chắn)
  }
  return STAT_COLOR_HEX.atk;
}

/**
 * Factory khởi tạo Đơn vị Quân Ta / Anh Hùng trong Wiki chuẩn Quy Tắc 3 (GAME_RULES.md):
 * - Tự động chuẩn hóa nhãn phân loại ('Anh Hùng' | 'Quân Lính')
 * - Tự động tính lực chiến gốc `baseStats.pow` bằng `computeUnitPower`
 * - Khởi tạo `bonusStats = ZERO_STATS`
 */
export function defineAllyWikiEntry(
  entry: Omit<WikiUnitEntry, 'faction' | 'unitClassLabel' | 'bonusStats'>
): WikiUnitEntry {
  const normalizedBase: UnitCombatStats = {
    ...ZERO_STATS,
    ...entry.baseStats,
    crd: entry.baseStats.crd || 150,
    skd: entry.baseStats.skd ?? 100,
    pow: 0,
  };
  normalizedBase.pow = computeUnitPower(normalizedBase);
  return {
    ...entry,
    faction: 'ALLY',
    unitClassLabel: entry.unitClassType === 'HERO' ? 'Anh Hùng' : 'Quân Lính',
    baseStats: normalizedBase,
    bonusStats: { ...ZERO_STATS },
  };
}

/**
 * Factory khởi tạo Kẻ Địch trong Wiki chuẩn Quy Tắc 3 (GAME_RULES.md):
 * - Bắt buộc mỗi loại Kẻ Địch trong Wiki CHỈ lưu duy nhất 1 bộ chỉ số gốc cố định (`tier = 1`, `bonusStats = 0`)
 * - Tự động tính lực chiến gốc `baseStats.pow` bằng `computeUnitPower`
 * - Bắt buộc có `baseExpReward` để thưởng EXP cho mọi Anh Hùng trên bản đồ khi bị tiêu diệt.
 */
export function defineEnemyWikiEntry(
  entry: Omit<
    WikiUnitEntry,
    'faction' | 'tier' | 'unitClassType' | 'unitClassLabel' | 'bonusStats'
  > & {
    baseExpReward: number;
  }
): WikiUnitEntry {
  const normalizedBase: UnitCombatStats = {
    ...ZERO_STATS,
    ...entry.baseStats,
    crd: entry.baseStats.crd || 150,
    skd: entry.baseStats.skd ?? 100,
    pow: 0,
  };
  normalizedBase.pow = computeUnitPower(normalizedBase);
  return {
    ...entry,
    faction: 'ENEMY',
    tier: 1,
    unitClassType: 'TROOP',
    unitClassLabel: 'Quân Lính',
    baseStats: normalizedBase,
    bonusStats: { ...ZERO_STATS },
    baseExpReward: Math.max(1, Math.round(entry.baseExpReward)),
  };
}

/**
 * Factory khởi tạo Trang Bị chuẩn Quy Tắc 2 (GAME_RULES.md):
 * - Quy tắc SPD: Chỉ số SPD CHỈ được phép nằm ở Giày (`slot === 'BOOTS'`) và LUÔN CÓ ở mọi trang bị Giày.
 * - Quy tắc RAN: Chỉ số RAN (Tầm đánh) KHÔNG bao giờ có trong trang bị.
 * - Mỗi trang bị có 1 dòng chỉ số chính cao (`mainStatKey`, `mainStatValue`) và các dòng phụ (`subStats`).
 */
export function defineEquipmentItem(item: EquipmentItem): EquipmentItem {
  const resolved = resolveEquipmentItemStructure(item);
  const combinedStats: Partial<UnitCombatStats> = {
    ...resolved.subStats,
    [resolved.mainStatKey]: resolved.mainStatValue,
  };
  return {
    ...item,
    visualKind: resolved.visualKind,
    mainStatKey: resolved.mainStatKey,
    mainStatValue: resolved.mainStatValue,
    subStats: resolved.subStats,
    stats: combinedStats,
    upgradeLevel: Math.max(0, Math.min(5, Math.floor(item.upgradeLevel || 0))),
    socketedGem: item.socketedGem ?? null,
    sellGold: item.sellGold ?? 50,
  };
}

/**
 * Factory khởi tạo Đá Quý chuẩn Quy Tắc 2 (GAME_RULES.md):
 * Mỗi viên Đá Quý chỉ mang duy nhất 1 dòng thuộc tính và thuộc 1 trong 5 bậc phẩm chất.
 */
export function defineGemItem(gem: GemItem): GemItem {
  return {
    ...gem,
    quantity: Math.max(0, Math.floor(gem.quantity)),
  };
}

/**
 * Helper định dạng số ngăn cách hàng nghìn bằng dấu chấm (Ví dụ: 1.000, 25.000) chuẩn Quy Tắc 4 (GAME_RULES.md).
 */
export function formatNumberDot(value: number): string {
  const safe = Math.floor(Number.isFinite(value) ? value : 0);
  return safe.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

/**
 * Định dạng giá trị số của chỉ số: nếu là số nguyên >= 1000 thì thêm dấu chấm hàng nghìn (1.000).
 */
export function formatStatNumber(value: number): string {
  if (!Number.isFinite(value)) return '0';
  if (Number.isInteger(value) && Math.abs(value) >= 1000) {
    return formatNumberDot(value);
  }
  return String(value);
}

/**
 * Helper định dạng chuỗi chỉ số chuẩn Quy Tắc 4 (GAME_RULES.md):
 * - Đảm bảo giữa nhãn chỉ số (có dấu `:`) và giá trị chỉ có ĐÚNG 1 khoảng trắng (Ví dụ: `ATK: 16`).
 * - Tự động định dạng dấu chấm hàng nghìn (`1.000`) cho mọi con số từ 1.000 trở lên (kể cả HP dạng `1.200/1.500`).
 */
export function formatStatLine(label: string, value: string | number): string {
  const cleanLabel = label.trim().replace(/:$/, '');
  const rawStr =
    typeof value === 'number'
      ? formatStatNumber(value)
      : String(value).replace(/\b\d{4,}\b/g, (match) =>
          formatNumberDot(Number(match))
        );
  const cleanValue = rawStr.replace(/\s+/g, ' ').trim();
  return `${cleanLabel}: ${cleanValue}`;
}

/**
 * Tính lượng hồi máu thực tế nhận vào từ kỹ năng hồi máu của bản thân hoặc đồng minh,
 * được tăng thêm bởi chỉ số EFF% của đơn vị nhận hồi máu.
 */
export function computeSkillHealReceived(
  baseSkillHeal: number,
  receiverEffPercent: number = 0
): number {
  if (baseSkillHeal <= 0) return 0;
  const effMult = 1 + Math.max(0, receiverEffPercent || 0) / 100;
  return Math.max(1, Math.round(baseSkillHeal * effMult));
}

// Tính chỉ số của 1 món trang bị sau khi cộng cấp nâng cấp [+0 -> +5]:
// QUY TẮC MỚI: Khi nâng cấp CHỈ tăng chỉ số chính (+20% mỗi cấp), các dòng chỉ số phụ giữ nguyên.
export function getUpgradedEquipmentStats(
  item: EquipmentItem
): Partial<UnitCombatStats> {
  const lvl = Math.max(0, Math.min(5, item.upgradeLevel || 0));
  const mult = 1 + lvl * 0.2;
  const { mainStatKey, mainStatValue, subStats } =
    resolveEquipmentItemStructure(item);

  const result: Partial<UnitCombatStats> = {
    ...subStats,
  };

  if (mainStatKey === 'ats') {
    result.ats = Number((mainStatValue * mult).toFixed(2));
  } else {
    result[mainStatKey] = Math.round(mainStatValue * mult);
  }

  return result;
}

export interface ColoredStatBadge {
  statKey: keyof UnitCombatStats;
  text: string;
  colorHex: string;
  isMainStat?: boolean;
}

export function formatSingleEquipmentStatText(
  key: keyof UnitCombatStats,
  val: number
): string {
  switch (key) {
    case 'maxHp':
      return `+${val} HP`;
    case 'reg':
      return `+${val} REG`;
    case 'atk':
      return `+${val} ATK`;
    case 'mag':
      return `+${val} MAG`;
    case 'def':
      return `+${val} DEF`;
    case 'mar':
      return `+${val} MAR`;
    case 'ats':
      return `+${val} ATS`;
    case 'crt':
      return `+${val}% CRT`;
    case 'eva':
      return `+${val}% EVA`;
    case 'crd':
      return `+${val}% CRD`;
    case 'spd':
      return `+${val} SPD`;
    case 'dmgPercent':
      return `+${val}% DMG%`;
    case 'resPercent':
      return `+${val}% RES%`;
    case 'penPercent':
      return `+${val}% PEN%`;
    case 'penFlat':
      return `+${val} PEN`;
    case 'lifesteal':
      return `+${val}% LST%`;
    case 'dmgBlock':
      return `+${val} BLK`;
    case 'dbr':
      return `+${val}% DBR%`;
    case 'eff':
      return `+${val}% EFF%`;
    case 'skd':
      return `+${val}% SKD%`;
    case 'cld':
      return `+${val}% CLD%`;
    default:
      return `+${val}`;
  }
}

export function getEquipmentStatBadges(
  item: EquipmentItem
): ColoredStatBadge[] {
  const s = getUpgradedEquipmentStats(item);
  const { mainStatKey } = resolveEquipmentItemStructure(item);
  const badges: ColoredStatBadge[] = [];

  const mainVal = s[mainStatKey];
  if (mainVal && mainVal > 0) {
    badges.push({
      statKey: mainStatKey,
      text: formatSingleEquipmentStatText(mainStatKey, mainVal),
      colorHex: STAT_COLOR_HEX[mainStatKey],
      isMainStat: true,
    });
  }

  const allKeys: Array<keyof UnitCombatStats> = [
    'maxHp',
    'reg',
    'atk',
    'mag',
    'def',
    'mar',
    'ats',
    'crt',
    'eva',
    'crd',
    'spd',
    'dmgPercent',
    'resPercent',
    'penPercent',
    'penFlat',
    'lifesteal',
    'dmgBlock',
    'dbr',
    'eff',
    'skd',
    'cld',
  ];

  allKeys.forEach((key) => {
    if (key === mainStatKey) return;
    if (key === 'spd' && item.slot !== 'BOOTS') return;
    const val = s[key];
    if (val && val > 0) {
      badges.push({
        statKey: key,
        text: formatSingleEquipmentStatText(key, val),
        colorHex: STAT_COLOR_HEX[key],
        isMainStat: false,
      });
    }
  });

  return badges;
}

// Tính tổng chỉ số cộng thêm = CHỈ tính từ Trang Bị đang mặc (cộng cấp +1..+5 và Ngọc khảm)
// Lưu ý: RAN không có trong trang bị (total.ran = 0); SPD luôn có ở Giày và chỉ cộng từ Giày.
export function getUnitTotalBonusStats(
  _archetypeId: UnitArchetypeId,
  loadout?: UnitEquipmentLoadout
): UnitCombatStats {
  const total: UnitCombatStats = { ...ZERO_STATS };

  if (loadout) {
    EQUIPMENT_SLOTS_ORDER.forEach((slot) => {
      const item = loadout[slot];
      if (!item) return;
      const s = getUpgradedEquipmentStats(item);
      total.maxHp += s.maxHp || 0;
      total.reg += s.reg || 0;
      total.atk += s.atk || 0;
      total.mag += s.mag || 0;
      total.def += s.def || 0;
      total.mar += s.mar || 0;
      total.ats = Number((total.ats + (s.ats || 0)).toFixed(2));
      total.crt += s.crt || 0;
      total.eva += s.eva || 0;
      total.crd += s.crd || 0;
      // Quy tắc: Chỉ trang bị Giày (BOOTS) mới được cộng SPD (và Giày luôn có SPD)
      if (slot === 'BOOTS') {
        total.spd += s.spd || 0;
      }
      total.dmgPercent += s.dmgPercent || 0;
      total.resPercent += s.resPercent || 0;
      total.penPercent += s.penPercent || 0;
      total.penFlat += s.penFlat || 0;
      total.lifesteal += s.lifesteal || 0;
      total.dmgBlock += s.dmgBlock || 0;
      total.dbr += s.dbr || 0;
      total.eff += s.eff || 0;
      total.skd += s.skd || 0;
      total.cld += s.cld || 0;

      // Cộng thêm 1 dòng thuộc tính duy nhất của Đá Quý khảm trên trang bị (nếu có, không cộng RAN)
      if (item.socketedGem) {
        const gKey = item.socketedGem.statKey;
        const gVal = item.socketedGem.statValue;
        if (gKey === 'ats') {
          total.ats = Number((total.ats + gVal).toFixed(2));
        } else if (gKey !== 'ran' && (gKey !== 'spd' || slot === 'BOOTS')) {
          total[gKey] = (total[gKey] || 0) + gVal;
        }
      }
    });
  }

  total.ran = 0;
  total.pow = computeBonusPower(total);
  return total;
}

// Tính chỉ số cơ bản (Base Stats):
// - Với Anh Hùng (KING): Mỗi cấp Anh Hùng (1 -> 50) +5% chỉ số gốc (HP, ATK, MAG, DEF), kết hợp cấp Nghiên Cứu (nếu có)
// - Với Quân Lính: Đồng bộ cấp bậc Nghiên Cứu [T1 -> T10] (+15%/cấp cho HP, ATK, MAG, DEF, MAR)
export function getResearchedBaseStats(
  archetypeId: UnitArchetypeId,
  tier = 1,
  heroLevel = 1
): UnitCombatStats {
  const entry = UNIT_WIKI_DATABASE[archetypeId];
  const b = entry.baseStats;
  const clampedTier = Math.max(1, Math.min(10, tier));
  const tierMult = 1 + (clampedTier - 1) * TIER_BONUS_PER_LEVEL;

  if (archetypeId === 'KING') {
    const clampedHeroLvl = Math.max(
      1,
      Math.min(HERO_MAX_LEVEL, Math.floor(heroLevel || 1))
    );
    const heroLvlMult = 1 + (clampedHeroLvl - 1) * HERO_STAT_BONUS_PER_LEVEL;
    const baseHero: UnitCombatStats = {
      ...b,
      maxHp: Math.round(b.maxHp * heroLvlMult * tierMult),
      atk: Math.round(b.atk * heroLvlMult * tierMult),
      mag: Math.round((b.mag || 0) * heroLvlMult * tierMult),
      def: Math.round(b.def * heroLvlMult * tierMult),
      mar: Math.round(b.mar * tierMult),
      ran: b.ran,
      pow: 0,
    };
    baseHero.pow = computeUnitPower(baseHero);
    return baseHero;
  }

  const baseTroop: UnitCombatStats = {
    ...b,
    maxHp: Math.round(b.maxHp * tierMult),
    atk: Math.round(b.atk * tierMult),
    mag: Math.round((b.mag || 0) * tierMult),
    def: Math.round(b.def * tierMult),
    mar: Math.round(b.mar * tierMult),
    ran: b.ran,
    pow: 0,
  };
  baseTroop.pow = computeUnitPower(baseTroop);
  return baseTroop;
}

// Tính chỉ số và EXP của Kẻ Địch khi triệu hồi theo Level:
// Mỗi loại kẻ địch trong Wiki chỉ lưu duy nhất 1 bộ chỉ số gốc cố định.
// Khi sinh quái ở level cao hơn: +10% mỗi cấp cho HP, ATK, MAG, DEF, MAR và +20% mỗi cấp cho EXP.
export function computeEnemyStatsForLevel(
  archetypeId:
    | 'ENEMY_MELEE'
    | 'ENEMY_RANGED'
    | 'ENEMY_MAGE'
    | 'ENEMY_CAMP_BUILDING'
    | 'ENEMY_WATCHTOWER',
  level = 1
): { stats: UnitCombatStats; expReward: number; level: number } {
  const entry = UNIT_WIKI_DATABASE[archetypeId];
  const b = entry.baseStats;
  const safeLevel = Math.max(1, Math.floor(level || 1));
  const statMult = 1 + (safeLevel - 1) * ENEMY_STAT_BONUS_PER_LEVEL;
  const expMult = 1 + (safeLevel - 1) * ENEMY_EXP_BONUS_PER_LEVEL;
  const baseExp = entry.baseExpReward ?? 15;

  const enStats: UnitCombatStats = {
    ...b,
    maxHp: Math.round(b.maxHp * statMult),
    atk: Math.round(b.atk * statMult),
    mag: Math.round((b.mag || 0) * statMult),
    def: Math.round(b.def * statMult),
    mar: Math.round(b.mar * statMult),
    ran: b.ran,
    pow: 0,
  };
  enStats.pow = computeUnitPower(enStats);

  return {
    level: safeLevel,
    expReward: Math.max(1, Math.round(baseExp * expMult)),
    stats: enStats,
  };
}

export function computeFinalStats(
  archetypeId: UnitArchetypeId,
  extraWaveScale = 0,
  tier = 1,
  loadout?: UnitEquipmentLoadout,
  heroLevel = 1
): UnitCombatStats {
  if (
    archetypeId === 'ENEMY_MELEE' ||
    archetypeId === 'ENEMY_RANGED' ||
    archetypeId === 'ENEMY_MAGE' ||
    archetypeId === 'ENEMY_CAMP_BUILDING' ||
    archetypeId === 'ENEMY_WATCHTOWER'
  ) {
    const enemyLevel = Math.max(1, Math.floor(extraWaveScale) + 1);
    return computeEnemyStatsForLevel(archetypeId, enemyLevel).stats;
  }

  const b = getResearchedBaseStats(archetypeId, tier, heroLevel);
  const a = getUnitTotalBonusStats(archetypeId, loadout);
  const combined: UnitCombatStats = {
    maxHp: b.maxHp + a.maxHp,
    reg: b.reg + a.reg,
    atk: b.atk + a.atk,
    mag: (b.mag || 0) + (a.mag || 0),
    def: b.def + a.def,
    mar: b.mar + a.mar,
    ats: Number((b.ats + a.ats).toFixed(2)),
    crt: b.crt + a.crt,
    eva: b.eva + a.eva,
    crd: b.crd + a.crd,
    spd: b.spd + a.spd,
    ran: b.ran,
    dmgPercent: b.dmgPercent + a.dmgPercent,
    resPercent: b.resPercent + a.resPercent,
    penPercent: b.penPercent + a.penPercent,
    penFlat: b.penFlat + a.penFlat,
    lifesteal: b.lifesteal + a.lifesteal,
    dmgBlock: b.dmgBlock + a.dmgBlock,
    dbr: (b.dbr || 0) + (a.dbr || 0),
    eff: (b.eff || 0) + (a.eff || 0),
    skd: (b.skd ?? 100) + (a.skd || 0),
    cld: (b.cld || 0) + (a.cld || 0),
    pow: 0,
  };
  combined.pow = computeUnitPower(combined);
  return combined;
}

export interface Resources {
  food: number;
  wood: number;
  stone: number;
  gold: number;
  diamonds: number;
  population: number;
  soldiers: number;
  prosperity: number;
}

export interface BuildingBlueprint {
  type: BuildingType;
  name: string;
  vietnameseSub: string;
  description: string;
  productionText: string;
}

export type UnitCardType = 'HERO_FAREL' | 'SOLDIER_MELEE' | 'SOLDIER_RANGED';

// ============================================================================
// HỆ THỐNG PHÂN LOẠI ITEM TOÀN CỤC (3 TÚI ĐỒ & 5 PHẨM CHẤT)
// - KINGDOM: Item Vương Quốc (nằm trong Kho Đồ Vương Quốc: bản vẽ xây dựng, thẻ triệu hồi, bình EXP anh hùng...)
// - MANOR: Item Trang Viên (nằm trong Kho Đồ Trang Viên: trang trí, sưu tầm, làm nông trại, nuôi thú...)
// - EQUIPMENT_GEM: Item Trang Bị & Ngọc (nằm trong Danh Sách Trang Bị & Ngọc)
// ============================================================================
export type ItemBagDomain = 'KINGDOM' | 'MANOR' | 'EQUIPMENT_GEM';
export type KingdomItemActionType =
  | 'BUILD_BLUEPRINT'
  | 'SUMMON_CARD'
  | 'HERO_EXP_POTION'
  | 'RESOURCE_PACK'
  | 'UPGRADE_MATERIAL'
  | 'MARCH_ORDER'
  | 'RENAME_CARD'
  | 'LAND_EXPAND_CARD';
export type ManorItemCategory = 'DECORATION' | 'COLLECTIBLE' | 'FARMING' | 'LIVESTOCK';
export type CustomItemIconKind =
  | 'EXP_POTION_TINY'
  | 'EXP_POTION_SMALL'
  | 'EXP_POTION_MEDIUM'
  | 'EXP_POTION_LARGE'
  | 'EXP_POTION_GRAND'
  | 'MANOR_FENCE'
  | 'MANOR_GARDEN'
  | 'MANOR_FOUNTAIN'
  | 'MANOR_DEER'
  | 'MANOR_STATUE'
  | 'DECO_TREE'
  | 'DECO_GRASS_TUFT'
  | 'DECO_BUSH'
  | 'DECO_FLOWER_BUSH'
  | 'DECO_ROCK'
  | 'MYSTIC_IRON_ORE'
  | 'MARCH_ORDER'
  | 'RENAME_CARD'
  | 'LAND_EXPAND_CARD'
  | 'PACK_FOOD_1'
  | 'PACK_FOOD_2'
  | 'PACK_FOOD_3'
  | 'PACK_FOOD_4'
  | 'PACK_FOOD_5'
  | 'PACK_WOOD_1'
  | 'PACK_WOOD_2'
  | 'PACK_WOOD_3'
  | 'PACK_WOOD_4'
  | 'PACK_WOOD_5'
  | 'PACK_STONE_1'
  | 'PACK_STONE_2'
  | 'PACK_STONE_3'
  | 'PACK_STONE_4'
  | 'PACK_STONE_5'
  | 'PACK_GOLD_1'
  | 'PACK_GOLD_2'
  | 'PACK_GOLD_3'
  | 'PACK_GOLD_4'
  | 'PACK_GOLD_5'
  | 'PACK_DIAMOND_1'
  | 'PACK_DIAMOND_2'
  | 'PACK_DIAMOND_3'
  | 'PACK_DIAMOND_4'
  | 'PACK_DIAMOND_5';

export interface InventoryItem {
  id: string;
  itemDomain?: ItemBagDomain; // Mặc định: 'KINGDOM' (Kho Vương Quốc) hoặc 'MANOR' (Kho Trang Viên)
  rarity?: EquipmentRarity; // 5 phẩm chất: WHITE (Thường), GREEN (Phổ biến), BLUE (Hiếm có), PURPLE (Siêu hiếm), GOLD (Huyền thoại)
  actionType?: KingdomItemActionType;
  buildingType?: BuildingType;
  unitCardType?: UnitCardType;
  portraitKind?: UnitArchetypeId | BuildingType;
  customIcon?: CustomItemIconKind;
  expAmount?: number; // Lượng EXP cộng cho Anh Hùng khi dùng Bình EXP Anh Hùng
  resourceRewardType?: 'food' | 'wood' | 'stone' | 'gold' | 'diamonds'; // Loại tài nguyên / tiền tệ cộng khi dùng Túi/Rương
  resourceRewardAmount?: number; // Lượng tài nguyên (+5,+10,+50,+200,+600) hoặc tiền tệ (+1,+3,+10,+30,+100)
  manorCategory?: ManorItemCategory; // Phân loại vật phẩm Trang Viên: Trang trí / Sưu tầm / Làm nông / Nuôi thú
  name: string;
  vietnameseSub: string;
  description: string;
  productionText: string;
  quantity: number;
}

export interface PlacedManorObject {
  id: string;
  itemId: string;
  name: string;
  vietnameseSub: string;
  rarity: EquipmentRarity;
  manorCategory: ManorItemCategory;
  customIcon: CustomItemIconKind;
  gridX: number; // Tọa độ ô trong Trang Viên (0..19)
  gridY: number; // Tọa độ ô trong Trang Viên (0..19)
  placedAt: number;
}

// Hàm khởi tạo Item Vương Quốc & Item Trang Viên chuẩn hóa để mở rộng số lượng lớn item dễ dàng
export function defineKingdomItem(
  config: Omit<InventoryItem, 'itemDomain' | 'quantity'> & { quantity?: number }
): InventoryItem {
  return {
    ...config,
    itemDomain: 'KINGDOM',
    rarity: config.rarity ?? 'WHITE',
    quantity: config.quantity ?? 1,
  };
}

export function defineManorItem(
  config: Omit<InventoryItem, 'itemDomain' | 'quantity'> & { quantity?: number }
): InventoryItem {
  return {
    ...config,
    itemDomain: 'MANOR',
    rarity: config.rarity ?? 'WHITE',
    quantity: config.quantity ?? 1,
  };
}

export interface TowerBurstShot {
  fireAt: number;
  targetId: string;
  targetX: number;
  targetY: number;
  atk: number;
}

export interface PlacedBuilding {
  id: string;
  type: BuildingType;
  gridX: number;
  gridY: number;
  level: number;
  buildProgress: number;
  isConstructed: boolean;
  lastProducedAt: number;
  hp?: number;
  maxHp?: number;
  attackCooldown?: number;
  windup?: number;
  windupTargetId?: string;
  windupWillProcSkill?: boolean;
  hitFlash?: number;
  facing?: 'LEFT' | 'RIGHT';
  statusEffects?: ActiveStatusEffect[];
  burstQueue?: TowerBurstShot[];
}

export function computeTowerStatsForLevel(
  type: BuildingType,
  level: number
): UnitCombatStats {
  const wiki = UNIT_WIKI_DATABASE[type as UnitArchetypeId];
  if (!wiki) {
    return { ...ZERO_STATS, maxHp: 200, def: 20, mar: 20, ats: 1, skd: 100 };
  }
  const clampedLv = Math.max(1, Math.min(TOWER_MAX_LEVEL, Math.floor(level || 1)));
  const mult = 1 + (clampedLv - 1) * TOWER_STAT_BONUS_PER_LEVEL;
  const b = wiki.baseStats;
  const scaled: UnitCombatStats = {
    ...b,
    maxHp: Math.round(b.maxHp * mult),
    atk: Math.round(b.atk * mult),
    mag: Math.round(b.mag * mult),
    def: Math.round(b.def * mult),
    mar: Math.round(b.mar * mult),
  };
  scaled.pow = computeUnitPower(scaled);
  return scaled;
}

export interface ResourceNode {
  id: string;
  type: 'TREE' | 'STONE_DEPOSIT' | 'GOLD_VEIN';
  gridX: number;
  gridY: number;
  amount: number;
}

export interface KingState extends UnitCombatStats {
  tier?: number;
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  facing: 'LEFT' | 'RIGHT';
  state: 'IDLE' | 'WALKING' | 'BUILDING' | 'HARVESTING' | 'ATTACKING';
  isSelected: boolean;
  hp: number;
  statusEffects: ActiveStatusEffect[];
  attackRange: number;
  attackCooldown: number;
  windup: number;
  windupTargetId?: string;
  hitFlash: number;
  knockbackX: number;
  knockbackY: number;
  pendingAction?: {
    type: 'BUILD' | 'INSPECT_BUILDING' | 'HARVEST_NODE';
    gridX?: number;
    gridY?: number;
    buildingType?: BuildingType;
    buildingId?: string;
    nodeId?: string;
  };
}

export interface VillagerUnit extends UnitCombatStats {
  id: string;
  role: 'PEASANT' | 'SOLDIER' | 'HERO' | 'ALLY';
  troopCategory?: TroopCategory; // Phân loại 3 nhóm: HERO (Anh hùng) / SOLDIER (Quân lính gồm Nông dân) / ALLY (Quân đồng minh từ Vương Quốc khác)
  heroArchetypeId?: AllyUnitArchetypeId;
  unitName?: string;
  nickname?: string; // Nickname tùy chỉnh của đơn vị (mặc định gán ngẫu nhiên khi tạo)
  equipment?: UnitEquipmentLoadout; // Trang bị riêng lẻ của từng đơn vị
  originKingdomName?: string; // Dùng cho Quân Đồng Minh (ALLY) gửi từ Vương Quốc khác sang
  combatClass?: 'MELEE' | 'RANGED';
  tier?: number;
  level?: number; // Cấp độ Anh Hùng (1 -> 50, mỗi cấp +5% HP, ATK, DEF cơ bản)
  exp?: number; // Kinh nghiệm hiện tại của Anh Hùng
  maxExp?: number; // Kinh nghiệm tối đa để lên cấp tiếp theo
  rage?: number; // Nộ khí hiện tại của Anh Hùng (0 -> 100, +3/s khi vào combat, -5/s sau khi rời combat 5s)
  maxRage?: number; // Nộ khí tối đa (100 điểm để mở khóa kỹ năng R Ultimate)
  lastCombatAt?: number; // Thời điểm gần nhất Anh Hùng ở trong giao tranh (performance.now())
  skillId?: string; // ID kỹ năng gắn riêng của đơn vị (ưu tiên đọc trước bảng tra cứu chung)
  skills?: UnitSkillInfo[]; // Danh sách kỹ năng riêng lẻ của từng đơn vị (phục vụ mở rộng đa kỹ năng)
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  facing: 'LEFT' | 'RIGHT';
  color: string;
  isSelected?: boolean;
  hasPlayerOrder?: boolean;
  manualMoveOrder?: boolean; // Lệnh di chuyển trực tiếp từ người chơi (ưu tiên di chuyển ngay cả khi đang tấn công, trừ khi bị khống chế)
  forcedTargetEnemyId?: string; // Mục tiêu kẻ địch được người chơi chỉ định tấn công trực tiếp (ưu tiên bám đuổi & tấn công mục tiêu này)
  isPatrolling?: boolean; // Chế độ Đi Tuần [H]: Bật/tắt tuần tra tự động
  patrolMode?: 'GUARD' | 'EXPLORE'; // 'GUARD': Canh gác quanh công trình (mặc định cũ) | 'EXPLORE': Khám phá ngẫu nhiên toàn bản đồ
  patrolWaitUntil?: number; // Thời điểm kết thúc đứng nghỉ tại điểm tuần tra (ms)
  patrolTargetX?: number; // Tọa độ X điểm tuần tra hiện tại
  patrolTargetY?: number; // Tọa độ Y điểm tuần tra hiện tại
  homeX?: number; // Vị trí neo ban đầu trước khi giao tranh (dùng cho chế độ Giữ Vị Trí [D])
  homeY?: number;
  assignedFarmId?: string;
  workState?: 'IDLE' | 'TO_FARM' | 'HARVESTING' | 'TO_WAREHOUSE';
  workTimer?: number;
  carryingFood?: boolean;
  isRecuperating?: boolean; // Trạng thái Đang Hồi Sức trong Trại Hồi Sức khi tử trận (giữ nguyên toàn bộ data, trang bị và đầu người)
  isDeployedAway?: boolean; // Trạng thái Đã Rời Vương Quốc (đang xuất quân hành quân trên Bản Đồ Thế Giới)
  hp: number;
  statusEffects: ActiveStatusEffect[];
  attackRange: number;
  attackCooldown: number;
  windup: number;
  windupTargetId?: string;
  windupWillProcSkill?: boolean;
  hitFlash: number;
  knockbackX: number;
  knockbackY: number;
}

export interface EnemyUnit extends UnitCombatStats {
  id: string;
  kind: 'MELEE' | 'RANGED' | 'MAGE' | 'CAMP_BUILDING' | 'WATCHTOWER';
  isStructure?: boolean; // true = Công trình địch (Trại địch, Tháp canh): có thanh máu, có thể bị tấn công nhưng miễn nhiễm hoàn toàn với debuff
  level?: number; // Level của kẻ địch khi sinh ra (+10%/cấp cho HP, ATK, DEF, MAR)
  expReward?: number; // Lượng EXP cộng cho mọi Anh Hùng trên bản đồ khi kẻ địch chết (+20%/cấp)
  tier?: number;
  name: string;
  nickname?: string; // Nickname tùy chỉnh của đơn vị
  x: number;
  y: number;
  guardX?: number; // Tọa độ đứng canh gác ban đầu (dùng cho AI PASSIVE_DETECT trong Phó Bản)
  guardY?: number;
  aiMode?: 'AGGRESSIVE' | 'PASSIVE_DETECT'; // AGGRESSIVE: Chủ động tiến công; PASSIVE_DETECT: Đứng yên chờ người chơi vào tầm phát hiện
  detectRange?: number; // Tầm phát hiện người chơi (mặc định ~250px khi ở chế độ PASSIVE_DETECT)
  facing: 'LEFT' | 'RIGHT';
  isSelected?: boolean;
  hp: number;
  statusEffects: ActiveStatusEffect[];
  attackRange: number;
  speed: number;
  attackCooldown: number;
  windup: number;
  windupTargetId?: string;
  windupWillProcSkill?: boolean;
  hitFlash: number;
  knockbackX: number;
  knockbackY: number;
  // Chế độ Vương Quốc vs Vương Quốc (PvP): Hiển thị sprite & kỹ năng của quân đội/tháp phòng thủ vương quốc bị tấn công nhưng thuộc phe Kẻ Địch (thanh máu đỏ)
  pvpUnitArchetype?: AllyUnitArchetypeId;
  pvpTowerType?: BuildingType;
  burstQueue?: TowerBurstShot[];
  noLootDrop?: boolean;
  heroSkillCooldown?: number;
  equipment?: UnitEquipmentLoadout;
  rallyTargetX?: number;
  rallyTargetY?: number;
  rallyUntilMs?: number;
}

export interface DefeatedEnemyCorpse {
  id: string;
  kind: 'MELEE' | 'RANGED' | 'MAGE' | 'CAMP_BUILDING' | 'WATCHTOWER';
  pvpUnitArchetype?: AllyUnitArchetypeId;
  facing: 'LEFT' | 'RIGHT';
  x: number;
  y: number;
  vx: number;
  vy: number;
  fallDir: 1 | -1; // Hướng ngã văng ra đất (ngược lại với kẻ giết mình)
  createdAt: number;
  durationMs: number;
}

export interface Projectile {
  id: string;
  fromTeam: 'KINGDOM' | 'ENEMY';
  attackerId?: string;
  lifesteal?: number;
  eff?: number;
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  targetId: string;
  speed: number;
  atk: number;
  bonusMagicDmg?: number;
  crt: number;
  crd: number;
  dmgPercent: number;
  penPercent: number;
  penFlat: number;
  damageType?: DamageType;
  color: string;
  projectileStyle?:
    | 'ARROW'
    | 'POISON_ARROW'
    | 'SHADOW_ARROW'
    | 'ENERGY_ORB'
    | 'MEGA_ENERGY_ORB'
    | 'MUSKET_BULLET'
    | 'CANNON_BALL'
    | 'HEXTECH_ORB'
    | 'HEXTECH_BEAM';
  isTowerProjectile?: boolean;
  isSkillEnhanced?: boolean;
  slowPercent?: number;
  aoeRadius?: number;
  knockbackMultiplier?: number;
  skillEffect?: {
    type: string;
    dotDamagePerSec?: number;
    durationMs: number;
    dotDamageType?: DamageType;
    slowPercent?: number;
    vfxKind?: HitEffect['kind'] | string;
    vfxColor?: string;
  };
}

export interface HitEffect {
  id: string;
  x: number;
  y: number;
  targetX?: number;
  targetY?: number;
  kind:
    | 'SLASH'
    | 'CRESCENT_SLASH'
    | 'IMPACT_RING'
    | 'CHARGE_BURST'
    | 'POISON_BURST'
    | 'ORB_BURST_SMALL'
    | 'ORB_BURST_LARGE'
    | 'CANNON_EXPLOSION'
    | 'HEXTECH_SPARK_BURST'
    | 'HEXTECH_PARALYZE_BURST'
    | 'HEXTECH_LASER_BEAM';
  color: string;
  facing: 'LEFT' | 'RIGHT';
  angle?: number;
  createdAt: number;
  duration: number;
}

// Chế độ chọn hướng & vùng ảnh hưởng kỹ năng định hướng (Kiểu Liên Minh Huyền Thoại)
export interface SkillTargetingState {
  skillId: string;
  slotIdx: number;
  casterUnitId: string;
  aoeLength: number; // Chiều dài hình chữ nhật vùng ảnh hưởng (bằng 2x chiều cao Farel = 96px)
  aoeWidth: number; // Chiều rộng hình chữ nhật vùng ảnh hưởng (38px)
}

// Hiệu ứng thi triển kỹ năng Thánh Kiếm Farel trên bản đồ (Không có thời gian cast, Farel ở trạng thái bình thường)
export interface HolySwordSkillEffect {
  id: string;
  casterUnitId: string;
  fromTeam?: 'KINGDOM' | 'ENEMY';
  originX: number; // Vị trí dưới chân Farel lúc kích hoạt
  originY: number;
  targetAngle: number; // Góc chém về phía chỉ định (radian)
  swordHeight: number; // Độ cao mũi kiếm đạt gấp đôi chiều cao của Farel (96px)
  aoeLength: number; // Chiều dài vùng ảnh hưởng hình chữ nhật kéo dài (96px)
  aoeWidth: number; // Chiều rộng vùng ảnh hưởng hình chữ nhật (38px)
  createdAt: number; // performance.now()
  riseDurationMs: number; // Pha 1: Kiếm mọc thẳng từ dưới chân lên tới độ cao 2x Farel
  slamDurationMs: number; // Pha 2: Xoay góc chém từ thẳng đứng về phía chỉ định tới khi chạm đất
  holdDurationMs: number; // Pha 3: Dư chấn khi kiếm chạm đất trước khi mờ dần
  impacted: boolean; // Đã chạm đất và kích hoạt sát thương 130% ATK chưa
  casterStats: {
    atk: number;
    crt: number;
    crd: number;
    dmgPercent: number;
    penPercent: number;
    penFlat: number;
    lifesteal: number;
    eff: number;
    skd: number;
  };
}

export interface HitParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  life: number;
  maxLife: number;
}

export interface DamagePopup {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  offsetX?: number;
  offsetY?: number;
  text: string;
  color: string;
  isCrit?: boolean;
  createdAt: number;
}

export interface FloatingText {
  id: string;
  x: number;
  y: number;
  text: string;
  color: string;
  createdAt: number;
}

export const BUILDING_BLUEPRINTS: Record<BuildingType, BuildingBlueprint> = {
  TOWN_HALL: {
    type: 'TOWN_HALL',
    name: 'Nhà Dân',
    vietnameseSub: 'Mái Ấm Bách Tính Vương Quốc',
    description: 'Tăng giới hạn Nông Dân (+1 dân mỗi cấp). Không giới hạn số lượng xây.',
    productionText: 'Cấp 1 có 1/1 Dân rảnh rỗi (+1 Dân/cấp · Xây nhiều)',
  },
  BARRACKS: {
    type: 'BARRACKS',
    name: 'Trại Lính',
    vietnameseSub: 'Doanh Trại Huấn Luyện (Giới hạn: 1)',
    description: 'Dùng Thẻ Quân để chiêu mộ Cấm Vệ Quân và Cung Thủ (Giới hạn xây: 1).',
    productionText: 'Chiêu mộ bằng Thẻ Quân · Giới hạn xây: 1',
  },
  FARM: {
    type: 'FARM',
    name: 'Ruộng Lúa',
    vietnameseSub: 'Cánh Đồng Lúa Vàng',
    description: 'Phân công Nông Dân làm việc (+1 Lương thực / phút / dân, tối đa 5 dân).',
    productionText: '+1 Lương thực / phút / dân (Tối đa 5 dân · Xây nhiều)',
  },
  WAREHOUSE: {
    type: 'WAREHOUSE',
    name: 'Nhà Kho',
    vietnameseSub: 'Kho Lương Thảo Trung Tâm (Giới hạn: 1)',
    description: 'Nơi tập kết Lương thực từ Ruộng Lúa và lưu trữ tài nguyên (Giới hạn: 1).',
    productionText: 'Trung tâm lưu trữ tài nguyên (Giới hạn: 1)',
  },
  HERO_ALTAR: {
    type: 'HERO_ALTAR',
    name: 'Điện Anh Hùng',
    vietnameseSub: 'Thánh Điện Triệu Hồi Anh Hùng (Giới hạn: 1)',
    description: 'Dùng Thẻ Anh Hùng để triệu hồi Anh Hùng lên bản đồ (Giới hạn xây: 1).',
    productionText: 'Triệu hồi bằng Thẻ Anh Hùng (Giới hạn xây: 1)',
  },
  MANOR: {
    type: 'MANOR',
    name: 'Trang Viên',
    vietnameseSub: 'Không Gian Điền Viên Quý Tộc 20x20 (Giới hạn: 1)',
    description: 'Mở bản đồ Trang Viên 20x20 để đặt vật phẩm trang trí (Giới hạn xây: 1).',
    productionText: 'Mở bản đồ Trang Viên 20x20 (Giới hạn xây: 1)',
  },
  CONSTRUCTION_CENTER: {
    type: 'CONSTRUCTION_CENTER',
    name: 'Trung Tâm Xây Dựng',
    vietnameseSub: 'Tổng Cục Quy Hoạch & Kiến Thiết Vương Quốc (Giới hạn: 1)',
    description: 'Mở Chế Độ Xây Dựng Vương Quốc khi bản đồ không có địch: ẩn tạm đơn vị, di chuyển công trình & cây cỏ trang trí, thu hồi vào kho, xóa bỏ và lát ô tile.',
    productionText: 'Bật Chế Độ Xây Dựng & Quy Hoạch Vương Quốc (Giới hạn: 1)',
  },
  TOWER_ARCHER: {
    type: 'TOWER_ARCHER',
    name: 'Tháp Cung Thủ',
    vietnameseSub: 'Tháp Phòng Thủ Tầm Xa · Nâng tối đa Lv.20',
    description: 'Tháp thủ vật lý tầm xa (340), bắn nhanh (1.5/s). 25% tỉ lệ bắn thêm 3 mũi tên.',
    productionText: 'Tốc bắn nhanh · 25% bắn liên hoàn 3 tên (Lv.1-20)',
  },
  TOWER_MUSKET: {
    type: 'TOWER_MUSKET',
    name: 'Tháp Súng Hỏa Mai',
    vietnameseSub: 'Tháp Xạ Thủ Hỏa Mai · Nâng tối đa Lv.20',
    description: 'Tháp thủ vật lý tầm vừa (280), đạn nhanh. 25% tỉ lệ bắn đạn Xuyên Giáp & Phá Giáp.',
    productionText: 'Đạn thẳng nhanh · 25% Đạn Xuyên Phá Giáp (Lv.1-20)',
  },
  TOWER_CANNON: {
    type: 'TOWER_CANNON',
    name: 'Tháp Pháo Hạng Nặng',
    vietnameseSub: 'Tháp Đại Pháo Đánh Lan · Nâng tối đa Lv.20',
    description: 'Tháp đại pháo tầm vừa (250), máu-giáp cao. Đánh thường nổ lan diện rộng & Knockback.',
    productionText: 'Máu-Giáp cao · Đánh thường Nổ Lan & Knockback (Lv.1-20)',
  },
  TOWER_HEXTECH: {
    type: 'TOWER_HEXTECH',
    name: 'Tháp Pháo Hextech',
    vietnameseSub: 'Tháp Năng Lượng Ma Đạo · Nâng tối đa Lv.20',
    description: 'Tháp ma đạo tầm xa (330). Đánh thường kèm sát thương phép & Làm Chậm; 25% phóng Tia Năng Lượng Tê Liệt.',
    productionText: 'Quả cầu Làm Chậm -30% & 25% Tia Tê Liệt 3s (Lv.1-20)',
  },
  CAMPFIRE: {
    type: 'CAMPFIRE',
    name: 'Lửa Trại',
    vietnameseSub: 'Ngọn Lửa Chiếu Sáng Môi Trường & Xua Tan Mưa Tối',
    description: 'Đốt lửa trại chiếu sáng vùng đất xung quanh, hắt ánh lửa ấm áp lên mặt đất, cây cối, công trình và xuyên thủng màn trời tối khi trời mưa bão.',
    productionText: 'Tỏa ánh sáng lửa ấm ra môi trường & xua tan màn mưa tối',
  },
};

// [QUY TẮC THỬ NGHIỆM]: Tất cả các item tạo ra đều cho 1 item vào Kho Đồ để thử.
// Sau này khi game chạy chính thức chỉ cần xóa các item thử nghiệm trong danh sách này là xong.
export const UNIT_SUMMON_CARD_BLUEPRINTS: Record<
  UnitCardType,
  Omit<InventoryItem, 'quantity'>
> = {
  HERO_FAREL: {
    id: 'item-card-hero-farel',
    itemDomain: 'KINGDOM',
    rarity: 'GOLD',
    actionType: 'SUMMON_CARD',
    unitCardType: 'HERO_FAREL',
    portraitKind: 'KING',
    name: 'Thẻ Anh Hùng Farel',
    vietnameseSub: 'Thẻ Triệu Hồi Anh Hùng Độc Nhất (1/1)',
    description: 'Triệu hồi Anh Hùng Farel tại Điện Anh Hùng (Tối đa 1 trên bản đồ).',
    productionText: 'Dùng tại Điện Anh Hùng · Tiêu hao 1 thẻ',
  },
  SOLDIER_MELEE: {
    id: 'item-card-soldier-melee',
    itemDomain: 'KINGDOM',
    rarity: 'BLUE',
    actionType: 'SUMMON_CARD',
    unitCardType: 'SOLDIER_MELEE',
    portraitKind: 'SOLDIER_MELEE',
    name: 'Thẻ Cấm Vệ Quân',
    vietnameseSub: 'Thẻ Chiêu Mộ Bộ Binh Cận Chiến',
    description: 'Chiêu mộ +1 Cấm Vệ Quân tại Trại Lính.',
    productionText: 'Dùng tại Trại Lính · Tiêu hao 1 thẻ',
  },
  SOLDIER_RANGED: {
    id: 'item-card-soldier-ranged',
    itemDomain: 'KINGDOM',
    rarity: 'BLUE',
    actionType: 'SUMMON_CARD',
    unitCardType: 'SOLDIER_RANGED',
    portraitKind: 'SOLDIER_RANGED',
    name: 'Thẻ Cung Thủ',
    vietnameseSub: 'Thẻ Chiêu Mộ Xạ Thủ Tầm Xa',
    description: 'Chiêu mộ +1 Cung Thủ Hoàng Gia tại Trại Lính.',
    productionText: 'Dùng tại Trại Lính · Tiêu hao 1 thẻ',
  },
};

// 5 BÌNH KINH NGHIỆM ANH HÙNG (BÉ -> ĐẠI) TƯƠNG ỨNG 5 PHẨM CHẤT (THƯỜNG -> HUYỀN THOẠI) - TẤT CẢ SẮC TÍM TỬ TINH
export const HERO_EXP_POTION_BLUEPRINTS: Omit<InventoryItem, 'quantity'>[] = [
  {
    id: 'item-exp-potion-white',
    itemDomain: 'KINGDOM',
    rarity: 'WHITE',
    actionType: 'HERO_EXP_POTION',
    customIcon: 'EXP_POTION_TINY',
    expAmount: 50,
    name: 'Bình EXP Anh Hùng (Bé)',
    vietnameseSub: 'Phẩm chất: Thường · +50 EXP Anh Hùng',
    description: 'Cộng +50 EXP cho Anh Hùng.',
    productionText: 'Sử dụng: Cộng +50 EXP cho 1 Anh Hùng',
  },
  {
    id: 'item-exp-potion-green',
    itemDomain: 'KINGDOM',
    rarity: 'GREEN',
    actionType: 'HERO_EXP_POTION',
    customIcon: 'EXP_POTION_SMALL',
    expAmount: 150,
    name: 'Bình EXP Anh Hùng (Nhỏ)',
    vietnameseSub: 'Phẩm chất: Phổ biến · +150 EXP Anh Hùng',
    description: 'Cộng +150 EXP cho Anh Hùng.',
    productionText: 'Sử dụng: Cộng +150 EXP cho 1 Anh Hùng',
  },
  {
    id: 'item-exp-potion-blue',
    itemDomain: 'KINGDOM',
    rarity: 'BLUE',
    actionType: 'HERO_EXP_POTION',
    customIcon: 'EXP_POTION_MEDIUM',
    expAmount: 400,
    name: 'Bình EXP Anh Hùng (Vừa)',
    vietnameseSub: 'Phẩm chất: Hiếm có · +400 EXP Anh Hùng',
    description: 'Cộng +400 EXP cho Anh Hùng.',
    productionText: 'Sử dụng: Cộng +400 EXP cho 1 Anh Hùng',
  },
  {
    id: 'item-exp-potion-purple',
    itemDomain: 'KINGDOM',
    rarity: 'PURPLE',
    actionType: 'HERO_EXP_POTION',
    customIcon: 'EXP_POTION_LARGE',
    expAmount: 1000,
    name: 'Bình EXP Anh Hùng (Lớn)',
    vietnameseSub: 'Phẩm chất: Siêu hiếm · +1.000 EXP Anh Hùng',
    description: 'Cộng +1.000 EXP cho Anh Hùng.',
    productionText: 'Sử dụng: Cộng +1.000 EXP cho 1 Anh Hùng',
  },
  {
    id: 'item-exp-potion-gold',
    itemDomain: 'KINGDOM',
    rarity: 'GOLD',
    actionType: 'HERO_EXP_POTION',
    customIcon: 'EXP_POTION_GRAND',
    expAmount: 2500,
    name: 'Bình EXP Anh Hùng (Đại)',
    vietnameseSub: 'Phẩm chất: Huyền thoại · +2.500 EXP Anh Hùng',
    description: 'Cộng +2.500 EXP cho Anh Hùng.',
    productionText: 'Sử dụng: Cộng +2.500 EXP cho 1 Anh Hùng',
  },
];

// ============================================================================
// 25 VẬT PHẨM TÚI & RƯƠNG TÀI NGUYÊN / TIỀN TỆ (5 LOẠI x 5 PHẨM CHẤT)
// - Tài nguyên (Lương thực, Gỗ, Đá): +5, +10, +50, +200, +600 đơn vị
// - Tiền tệ (Vàng, Kim cương): +1, +3, +10, +30, +100 đơn vị
// ============================================================================
const PACK_RARITY_ORDER: EquipmentRarity[] = ['WHITE', 'GREEN', 'BLUE', 'PURPLE', 'GOLD'];
const PACK_RARITY_LABELS_VI: Record<EquipmentRarity, string> = {
  WHITE: 'Thường',
  GREEN: 'Phổ biến',
  BLUE: 'Hiếm có',
  PURPLE: 'Siêu hiếm',
  GOLD: 'Huyền thoại',
};
const PACK_CONTAINER_TIERS = [
  { prefix: 'Túi', suffix: '(Nhỏ)' },
  { prefix: 'Túi', suffix: '(Lớn)' },
  { prefix: 'Rương', suffix: '(Nhỏ)' },
  { prefix: 'Rương', suffix: '(Vừa)' },
  { prefix: 'Rương', suffix: '(Lớn)' },
] as const;

const RESOURCE_AMOUNTS_BY_TIER = [5, 10, 50, 200, 600] as const;
const CURRENCY_AMOUNTS_BY_TIER = [1, 3, 10, 30, 100] as const;

const PACK_GROUP_CONFIGS: Array<{
  type: 'food' | 'wood' | 'stone' | 'gold' | 'diamonds';
  idPrefix: string;
  iconPrefix: 'PACK_FOOD' | 'PACK_WOOD' | 'PACK_STONE' | 'PACK_GOLD' | 'PACK_DIAMOND';
  labelLower: string;
  unitLabel: string;
  isCurrency: boolean;
}> = [
  {
    type: 'food',
    idPrefix: 'item-pack-food',
    iconPrefix: 'PACK_FOOD',
    labelLower: 'lương thực',
    unitLabel: 'Lương thực',
    isCurrency: false,
  },
  {
    type: 'wood',
    idPrefix: 'item-pack-wood',
    iconPrefix: 'PACK_WOOD',
    labelLower: 'gỗ',
    unitLabel: 'Gỗ',
    isCurrency: false,
  },
  {
    type: 'stone',
    idPrefix: 'item-pack-stone',
    iconPrefix: 'PACK_STONE',
    labelLower: 'đá',
    unitLabel: 'Đá',
    isCurrency: false,
  },
  {
    type: 'gold',
    idPrefix: 'item-pack-gold',
    iconPrefix: 'PACK_GOLD',
    labelLower: 'vàng',
    unitLabel: 'Vàng',
    isCurrency: true,
  },
  {
    type: 'diamonds',
    idPrefix: 'item-pack-diamond',
    iconPrefix: 'PACK_DIAMOND',
    labelLower: 'kim cương',
    unitLabel: 'Kim cương',
    isCurrency: true,
  },
];

export const RESOURCE_CURRENCY_PACK_BLUEPRINTS: Omit<InventoryItem, 'quantity'>[] =
  PACK_GROUP_CONFIGS.flatMap((grp) =>
    PACK_CONTAINER_TIERS.map((tierCfg, tierIdx) => {
      const rarity = PACK_RARITY_ORDER[tierIdx];
      const amount = grp.isCurrency
        ? CURRENCY_AMOUNTS_BY_TIER[tierIdx]
        : RESOURCE_AMOUNTS_BY_TIER[tierIdx];
      const itemName = `${tierCfg.prefix} ${grp.labelLower} ${tierCfg.suffix}`;
      const customIcon = `${grp.iconPrefix}_${tierIdx + 1}` as CustomItemIconKind;
      return {
        id: `${grp.idPrefix}-${tierIdx + 1}`,
        itemDomain: 'KINGDOM' as const,
        rarity,
        actionType: 'RESOURCE_PACK' as const,
        customIcon,
        resourceRewardType: grp.type,
        resourceRewardAmount: amount,
        name: itemName,
        vietnameseSub: `Phẩm chất: ${PACK_RARITY_LABELS_VI[rarity]} · +${amount} ${grp.unitLabel}`,
        description: `Cộng +${amount} ${grp.unitLabel} vào kho Vương Quốc.`,
        productionText: `Sử dụng: Cộng +${amount} ${grp.unitLabel}`,
      };
    })
  );

// ============================================================================
// NHÓM NGUYÊN LIỆU RÈN ĐÚC & CƯỜNG HÓA (ĐÁ HUYỀN THIẾC)
// ============================================================================
export const MYSTIC_IRON_ORE_BLUEPRINT: Omit<InventoryItem, 'quantity'> = {
  id: 'item-mystic-iron-ore',
  itemDomain: 'KINGDOM',
  rarity: 'BLUE',
  actionType: 'UPGRADE_MATERIAL',
  customIcon: 'MYSTIC_IRON_ORE',
  name: 'Đá Huyền Thiếc',
  vietnameseSub: 'Nguyên Liệu Rèn Đúc · Phẩm chất: Hiếm có',
  description: 'Nguyên liệu cường hóa trang bị từ [+1] đến [+5].',
  productionText: 'Nguyên liệu tiêu hao khi Nâng Cấp Trang Bị',
};

export const MARCH_ORDER_BLUEPRINT: Omit<InventoryItem, 'quantity'> = {
  id: 'item-march-order',
  itemDomain: 'KINGDOM',
  rarity: 'GOLD',
  actionType: 'MARCH_ORDER',
  customIcon: 'MARCH_ORDER',
  name: 'Lệnh Hành Quân',
  vietnameseSub: 'Đạo Cụ Vương Quốc · Phẩm chất: Huyền thoại',
  description: 'Tiêu hao 1 lệnh mỗi lượt xuất quân trên Bản Đồ Thế Giới.',
  productionText: 'Tiêu hao -1 mỗi lượt Tấn Công trên Bản Đồ Thế Giới',
};

export const KINGDOM_RENAME_CARD_BLUEPRINT: Omit<InventoryItem, 'quantity'> = {
  id: 'item-kingdom-rename-card',
  itemDomain: 'KINGDOM',
  rarity: 'PURPLE',
  actionType: 'RENAME_CARD',
  customIcon: 'RENAME_CARD',
  name: 'Thẻ Đổi Tên Vương Quốc',
  vietnameseSub: 'Đạo Cụ Vương Quốc · Phẩm chất: Siêu hiếm',
  description: 'Tiêu hao 1 thẻ để đổi tên Vương Quốc đang truy cập.',
  productionText: 'Sử dụng: Đổi tên Vương Quốc (Tiêu hao -1 thẻ)',
};

export const KINGDOM_LAND_EXPANSION_CARD_BLUEPRINT: Omit<InventoryItem, 'quantity'> = {
  id: 'item-kingdom-expand-land',
  itemDomain: 'KINGDOM',
  rarity: 'PURPLE',
  actionType: 'LAND_EXPAND_CARD',
  customIcon: 'LAND_EXPAND_CARD',
  name: 'Thẻ Lệnh Mở Rộng Đất Vương Quốc',
  vietnameseSub: 'Đạo Cụ Vương Quốc · Phẩm chất: Siêu hiếm',
  description: 'Tiêu hao thẻ lệnh tại các nút ngoài rìa bản đồ (cạnh B–C hoặc C–D, không chứa điểm gốc A) để mở rộng lãnh thổ Vương Quốc thêm đúng 1 Chunk 16×16 ô.',
  productionText: 'Sử dụng tại rìa bản đồ B–C hoặc C–D để mở rộng +1 Chunk 16×16',
};

export const CRAFTING_MATERIAL_BLUEPRINTS: Omit<InventoryItem, 'quantity'>[] = [
  MYSTIC_IRON_ORE_BLUEPRINT,
];

export const PROP_ITEM_BLUEPRINTS: Omit<InventoryItem, 'quantity'>[] = [
  MARCH_ORDER_BLUEPRINT,
  KINGDOM_RENAME_CARD_BLUEPRINT,
  KINGDOM_LAND_EXPANSION_CARD_BLUEPRINT,
];

// DANH SÁCH VẬT PHẨM TRANG VIÊN MẪU (NẰM TRONG TÚI KHO ĐỒ TRANG VIÊN - ĐỦ 5 PHẨM CHẤT)
export const MANOR_ITEM_BLUEPRINTS: Omit<InventoryItem, 'quantity'>[] = [
  {
    id: 'manor-item-fence-white',
    itemDomain: 'MANOR',
    rarity: 'WHITE',
    manorCategory: 'DECORATION',
    customIcon: 'MANOR_FENCE',
    name: 'Hàng Rào Gỗ Điền Viên',
    vietnameseSub: 'Trang Trí Trang Viên · Phẩm chất: Thường',
    description: 'Đặt trang trí trong bản đồ Trang Viên.',
    productionText: 'Đặt trong Trang Viên (Thuộc tính: Trang trí)',
  },
  {
    id: 'manor-item-garden-green',
    itemDomain: 'MANOR',
    rarity: 'GREEN',
    manorCategory: 'FARMING',
    customIcon: 'MANOR_GARDEN',
    name: 'Luống Hoa & Thảo Dược',
    vietnameseSub: 'Làm Nông Trang Viên · Phẩm chất: Phổ biến',
    description: 'Đặt làm nông trại trong bản đồ Trang Viên.',
    productionText: 'Đặt trong Trang Viên (Thuộc tính: Làm nông trại)',
  },
  {
    id: 'manor-item-fountain-blue',
    itemDomain: 'MANOR',
    rarity: 'BLUE',
    manorCategory: 'DECORATION',
    customIcon: 'MANOR_FOUNTAIN',
    name: 'Đài Phun Nước Đá Cổ',
    vietnameseSub: 'Trang Trí Trang Viên · Phẩm chất: Hiếm có',
    description: 'Đặt trang trí trong bản đồ Trang Viên.',
    productionText: 'Đặt trong Trang Viên (Thuộc tính: Trang trí)',
  },
  {
    id: 'manor-item-deer-purple',
    itemDomain: 'MANOR',
    rarity: 'PURPLE',
    manorCategory: 'LIVESTOCK',
    customIcon: 'MANOR_DEER',
    name: 'Bãi Chăn Hươu Sao Linh Thú',
    vietnameseSub: 'Nuôi Thú Trang Viên · Phẩm chất: Siêu hiếm',
    description: 'Đặt nuôi thú trong bản đồ Trang Viên.',
    productionText: 'Đặt trong Trang Viên (Thuộc tính: Nuôi thú)',
  },
  {
    id: 'manor-item-statue-gold',
    itemDomain: 'MANOR',
    rarity: 'GOLD',
    manorCategory: 'COLLECTIBLE',
    customIcon: 'MANOR_STATUE',
    name: 'Tượng Kỳ Lân Hoàng Kim',
    vietnameseSub: 'Sưu Tầm Trang Viên · Phẩm chất: Huyền thoại',
    description: 'Đặt trưng bày sưu tầm trong bản đồ Trang Viên.',
    productionText: 'Đặt trong Trang Viên (Thuộc tính: Sưu tầm)',
  },
];

export const RARITY_SORT_WEIGHT: Record<EquipmentRarity, number> = {
  GOLD: 5,
  PURPLE: 4,
  BLUE: 3,
  GREEN: 2,
  WHITE: 1,
};

export function getInventoryItemTypeBadge(item: Partial<InventoryItem>): string {
  if (item.actionType === 'SUMMON_CARD' || item.unitCardType) {
    return 'THẺ QUÂN';
  }
  if (item.actionType === 'BUILD_BLUEPRINT' || item.buildingType) {
    return 'CÔNG TRÌNH';
  }
  if (item.actionType === 'HERO_EXP_POTION' || item.expAmount) {
    return 'BÌNH EXP';
  }
  if (item.actionType === 'RESOURCE_PACK' || item.resourceRewardType) {
    if (
      item.resourceRewardType === 'gold' ||
      item.resourceRewardType === 'diamonds'
    ) {
      return 'TIỀN TỆ';
    }
    return 'TÀI NGUYÊN';
  }
  if (item.actionType === 'UPGRADE_MATERIAL') {
    return 'NGUYÊN LIỆU';
  }
  if (item.itemDomain === 'MANOR' || item.manorCategory) {
    return 'TRANG VIÊN';
  }
  return 'ĐẠO CỤ';
}

export function getCanonicalItemDescription(item: Partial<InventoryItem>): string {
  if (item.unitCardType && UNIT_SUMMON_CARD_BLUEPRINTS[item.unitCardType]) {
    return UNIT_SUMMON_CARD_BLUEPRINTS[item.unitCardType].description;
  }
  if (item.buildingType && BUILDING_BLUEPRINTS[item.buildingType]) {
    return BUILDING_BLUEPRINTS[item.buildingType].description;
  }
  const potionMatch = HERO_EXP_POTION_BLUEPRINTS.find((p) => p.id === item.id);
  if (potionMatch) return potionMatch.description;
  const packMatch = RESOURCE_CURRENCY_PACK_BLUEPRINTS.find((p) => p.id === item.id);
  if (packMatch) return packMatch.description;
  const matMatch = CRAFTING_MATERIAL_BLUEPRINTS.find((m) => m.id === item.id);
  if (matMatch) return matMatch.description;
  const propMatch = PROP_ITEM_BLUEPRINTS.find((p) => p.id === item.id);
  if (propMatch) return propMatch.description;
  const manorMatch = MANOR_ITEM_BLUEPRINTS.find((m) => m.id === item.id);
  if (manorMatch) return manorMatch.description;
  return item.description || '';
}

export const INITIAL_MANOR_INVENTORY_ITEMS: InventoryItem[] = MANOR_ITEM_BLUEPRINTS.map((bp) =>
  defineManorItem({
    ...bp,
    quantity: 1,
  })
);

export const INITIAL_INVENTORY_ITEMS: InventoryItem[] = [
  defineKingdomItem({
    id: 'item-town-hall',
    rarity: 'WHITE',
    actionType: 'BUILD_BLUEPRINT',
    buildingType: 'TOWN_HALL',
    portraitKind: 'TOWN_HALL',
    ...BUILDING_BLUEPRINTS.TOWN_HALL,
    quantity: 5,
  }),
  defineKingdomItem({
    id: 'item-farm',
    rarity: 'GREEN',
    actionType: 'BUILD_BLUEPRINT',
    buildingType: 'FARM',
    portraitKind: 'FARM',
    ...BUILDING_BLUEPRINTS.FARM,
    quantity: 8,
  }),
  defineKingdomItem({
    id: 'item-barracks',
    rarity: 'BLUE',
    actionType: 'BUILD_BLUEPRINT',
    buildingType: 'BARRACKS',
    portraitKind: 'BARRACKS',
    ...BUILDING_BLUEPRINTS.BARRACKS,
    quantity: 1,
  }),
  defineKingdomItem({
    id: 'item-hero-altar',
    rarity: 'PURPLE',
    actionType: 'BUILD_BLUEPRINT',
    buildingType: 'HERO_ALTAR',
    portraitKind: 'HERO_ALTAR',
    ...BUILDING_BLUEPRINTS.HERO_ALTAR,
    quantity: 1,
  }),
  defineKingdomItem({
    id: 'item-manor',
    rarity: 'PURPLE',
    actionType: 'BUILD_BLUEPRINT',
    buildingType: 'MANOR',
    portraitKind: 'MANOR',
    ...BUILDING_BLUEPRINTS.MANOR,
    quantity: 1,
  }),
  defineKingdomItem({
    id: 'item-construction-center',
    rarity: 'PURPLE',
    actionType: 'BUILD_BLUEPRINT',
    buildingType: 'CONSTRUCTION_CENTER',
    portraitKind: 'CONSTRUCTION_CENTER',
    ...BUILDING_BLUEPRINTS.CONSTRUCTION_CENTER,
    quantity: 1,
  }),
  defineKingdomItem({
    id: 'item-campfire',
    rarity: 'GREEN',
    actionType: 'BUILD_BLUEPRINT',
    buildingType: 'CAMPFIRE',
    portraitKind: 'CAMPFIRE',
    ...BUILDING_BLUEPRINTS.CAMPFIRE,
    quantity: 5,
  }),
  defineKingdomItem({
    id: 'item-tower-archer',
    rarity: 'GREEN',
    actionType: 'BUILD_BLUEPRINT',
    buildingType: 'TOWER_ARCHER',
    portraitKind: 'TOWER_ARCHER',
    ...BUILDING_BLUEPRINTS.TOWER_ARCHER,
    quantity: 3,
  }),
  defineKingdomItem({
    id: 'item-tower-musket',
    rarity: 'BLUE',
    actionType: 'BUILD_BLUEPRINT',
    buildingType: 'TOWER_MUSKET',
    portraitKind: 'TOWER_MUSKET',
    ...BUILDING_BLUEPRINTS.TOWER_MUSKET,
    quantity: 3,
  }),
  defineKingdomItem({
    id: 'item-tower-cannon',
    rarity: 'PURPLE',
    actionType: 'BUILD_BLUEPRINT',
    buildingType: 'TOWER_CANNON',
    portraitKind: 'TOWER_CANNON',
    ...BUILDING_BLUEPRINTS.TOWER_CANNON,
    quantity: 3,
  }),
  defineKingdomItem({
    id: 'item-tower-hextech',
    rarity: 'GOLD',
    actionType: 'BUILD_BLUEPRINT',
    buildingType: 'TOWER_HEXTECH',
    portraitKind: 'TOWER_HEXTECH',
    ...BUILDING_BLUEPRINTS.TOWER_HEXTECH,
    quantity: 3,
  }),
  // [TEST RULE]: Cho sẵn 1 item của mỗi loại thẻ triệu hồi / chiêu mộ vào Kho Đồ để thử
  defineKingdomItem({
    ...UNIT_SUMMON_CARD_BLUEPRINTS.HERO_FAREL,
    quantity: 1,
  }),
  defineKingdomItem({
    ...UNIT_SUMMON_CARD_BLUEPRINTS.SOLDIER_MELEE,
    quantity: 1,
  }),
  defineKingdomItem({
    ...UNIT_SUMMON_CARD_BLUEPRINTS.SOLDIER_RANGED,
    quantity: 1,
  }),
  // [TEST RULE]: Cho sẵn 1 item mỗi loại Bình EXP Anh Hùng (5 phẩm chất từ Bé -> Đại) vào Kho Đồ Vương Quốc
  ...HERO_EXP_POTION_BLUEPRINTS.map((bp) =>
    defineKingdomItem({
      ...bp,
      quantity: 1,
    })
  ),
  // [TEST RULE]: Cho sẵn 1 item mỗi loại trong 25 Túi/Rương Tài Nguyên & Tiền Tệ (5 loại x 5 phẩm chất) vào Kho Đồ Vương Quốc
  ...RESOURCE_CURRENCY_PACK_BLUEPRINTS.map((bp) =>
    defineKingdomItem({
      ...bp,
      quantity: 1,
    })
  ),
  // [TEST RULE]: Cho sẵn 20 viên Đá Huyền Thiếc vào Kho Đồ Vương Quốc để thử nâng cấp trang bị
  ...CRAFTING_MATERIAL_BLUEPRINTS.map((bp) =>
    defineKingdomItem({
      ...bp,
      quantity: 20,
    })
  ),
  // [TEST RULE]: Cho sẵn 20 mỗi loại Đạo Cụ (Lệnh Hành Quân, Thẻ Đổi Tên Vương Quốc, Thẻ Lệnh Mở Rộng Đất Vương Quốc)
  ...PROP_ITEM_BLUEPRINTS.map((bp) =>
    defineKingdomItem({
      ...bp,
      quantity: 20,
    })
  ),
];

export interface KingdomConstructionDecoBlueprint {
  id: string;
  name: string;
  subLabel: string;
  rarity: EquipmentRarity;
  customIcon: CustomItemIconKind;
  category: ManorItemCategory;
}

export const KINGDOM_CONSTRUCTION_DECORATION_CATALOG: KingdomConstructionDecoBlueprint[] = [
  {
    id: 'deco-tree-oak',
    name: 'Cây Sồi Cổ Thụ',
    subLabel: 'Cây Rừng Cảnh Quan',
    rarity: 'GREEN',
    customIcon: 'DECO_TREE',
    category: 'DECORATION',
  },
  {
    id: 'deco-grass-tuft',
    name: 'Khóm Cỏ Xanh Mướt',
    subLabel: 'Thảm Cỏ Tự Nhiên',
    rarity: 'WHITE',
    customIcon: 'DECO_GRASS_TUFT',
    category: 'DECORATION',
  },
  {
    id: 'deco-bush-lush',
    name: 'Bụi Cây Xanh Rậm',
    subLabel: 'Bụi Cây Điền Viên',
    rarity: 'WHITE',
    customIcon: 'DECO_BUSH',
    category: 'DECORATION',
  },
  {
    id: 'deco-flower-bush',
    name: 'Bụi Hoa Rực Rỡ',
    subLabel: 'Tiểu Cảnh Hoa Tươi',
    rarity: 'GREEN',
    customIcon: 'DECO_FLOWER_BUSH',
    category: 'DECORATION',
  },
  {
    id: 'deco-mossy-rock',
    name: 'Đá Cảnh Rêu Phong',
    subLabel: 'Hòn Non Bộ Cảnh Quan',
    rarity: 'BLUE',
    customIcon: 'DECO_ROCK',
    category: 'DECORATION',
  },
];

export interface KingdomConstructionTileBlueprint {
  id: string;
  variantId: string;
  name: string;
  subLabel: string;
  previewHex: string;
  accentHex: string;
}

export const KINGDOM_CONSTRUCTION_TILE_CATALOG: KingdomConstructionTileBlueprint[] = [
  {
    id: 'tile-royal-road',
    variantId: 'TEX_ROYAL_ROAD',
    name: 'Đường Đá Hoàng Gia',
    subLabel: 'Lát đường đi bằng đá cuội',
    previewHex: '#78716c',
    accentHex: '#d6d3d1',
  },
  {
    id: 'tile-grass-meadow',
    variantId: 'TEX_GRASS_MEADOW',
    name: 'Thảm Cỏ Non',
    subLabel: 'Nền cỏ đồng bằng xanh mượt',
    previewHex: '#2c5e27',
    accentHex: '#5cb84f',
  },
  {
    id: 'tile-grass-buttercup',
    variantId: 'TEX_GRASS_BUTTERCUP',
    name: 'Cỏ Hoa Hoàng Liên',
    subLabel: 'Thảm cỏ điểm hoa vàng',
    previewHex: '#2c5e27',
    accentHex: '#facc15',
  },
  {
    id: 'tile-grass-poppy',
    variantId: 'TEX_GRASS_POPPY',
    name: 'Cỏ Hoa Anh Túc',
    subLabel: 'Thảm cỏ điểm hoa đỏ thắm',
    previewHex: '#265322',
    accentHex: '#ef4444',
  },
  {
    id: 'tile-grass-bluebell',
    variantId: 'TEX_GRASS_BLUEBELL',
    name: 'Cỏ Hoa Chuông Lam',
    subLabel: 'Thảm cỏ điểm hoa xanh lam',
    previewHex: '#2c5e27',
    accentHex: '#60a5fa',
  },
  {
    id: 'tile-grass-lush',
    variantId: 'TEX_GRASS_LUSH',
    name: 'Khóm Cỏ Rậm',
    subLabel: 'Thảm cỏ bụi dày tự nhiên',
    previewHex: '#1e441b',
    accentHex: '#4ade80',
  },
  {
    id: 'tile-grass-pebble',
    variantId: 'TEX_GRASS_PEBBLE',
    name: 'Đất Sỏi Cuội Nhỏ',
    subLabel: 'Nền cỏ xen lẫn sỏi đá',
    previewHex: '#3f6212',
    accentHex: '#a8a29e',
  },
  {
    id: 'tile-pond-boulder',
    variantId: 'TEX_POND_BOULDER',
    name: 'Đá Tảng Rêu Phong',
    subLabel: 'Nền đá tảng lớn ven hồ',
    previewHex: '#57534e',
    accentHex: '#4ade80',
  },
  {
    id: 'tile-river-water',
    variantId: 'TEX_RIVER_WATER',
    name: 'Ô Mặt Nước Hồ',
    subLabel: 'Đào kênh nước / hồ cảnh quan',
    previewHex: '#1d4ed8',
    accentHex: '#60a5fa',
  },
];

// ============================================================================
// HỆ THỐNG THƯ TÍN VƯƠNG QUỐC (3 DANH MỤC: THÔNG BÁO / VƯƠNG QUỐC / CHIẾN ĐẤU)
// ============================================================================

export type MailCategory = 'ANNOUNCEMENT' | 'KINGDOM' | 'COMBAT';

export interface MailRewardAttachment {
  gold?: number;
  food?: number;
  wood?: number;
  stone?: number;
  diamonds?: number;
}

export interface KingdomMailItem {
  id: string;
  category: MailCategory;
  title: string;
  sender: string;
  timestampLabel: string;
  content: string;
  isRead: boolean;
  reward?: MailRewardAttachment;
  rewardClaimed?: boolean;
}

export function createInitialKingdomMails(
  kingdomName: string = 'Vương Quốc Pixel'
): KingdomMailItem[] {
  return [
    {
      id: 'mail-ann-1',
      category: 'ANNOUNCEMENT',
      title: 'Chiếu Chỉ Tân Vương & Quà Khởi Nghiệp',
      sender: 'Hội Đồng Hoàng Gia',
      timestampLabel: 'Ngày 1 · 00:01',
      content: `Chào mừng Đức Vua quang lâm thiết lập [${kingdomName}]!\n\nHội Đồng Hoàng Gia xin gửi tặng phần quà trợ cấp khởi nghiệp để Ngài chiêu binh mãi mã, rèn đúc trang bị và nâng cấp viện nghiên cứu.\n\n• Lưu ý quy tắc xây dựng mới: Mỗi loại công trình chỉ được phép xây dựng tối đa 1 cái, ngoại trừ Ruộng Lúa và Nhà Dân có thể xây nhiều.\n• Mỗi vị Anh Hùng (như Farel) là độc nhất vô nhị trên chiến trường.\n• Trang bị hiện đã được trang bị riêng lẻ cho từng cá nhân kèm điểm Lực Chiến (POW).`,
      isRead: false,
      reward: {
        gold: 500,
        food: 300,
        wood: 300,
        stone: 300,
        diamonds: 100,
      },
      rewardClaimed: false,
    },
    {
      id: 'mail-ann-2',
      category: 'ANNOUNCEMENT',
      title: 'Cẩm Nang Điều Binh & Sắp Trận Chiến Thuật',
      sender: 'Đại Học Sĩ Vương Quốc',
      timestampLabel: 'Ngày 1 · 00:05',
      content:
        'Tâu Bệ Hạ, hệ thống điều khiển chiến thuật góc dưới bên phải bản đồ đã sẵn sàng:\n\n• Phím [1 - 5]: Gọi đội quân đã lưu (Nhấn Ctrl + 1..5 để gán đội từ các đơn vị đang chọn).\n• Phím [D] (Giữ Vị Trí): Khi bật, quân ta sau khi giao tranh xong sẽ tự động rút về vị trí đóng quân ban đầu.\n• Phím [F] (Sắp Trận): Đổi luân phiên đội hình Cụm, Hàng Dọc, Hàng Ngang, Vòng Tròn.\n• Phím [Q / W / E / R]: Kích hoạt 4 ô kỹ năng của đơn vị đang chọn.\n• Click đúp chuột trái vào 1 đơn vị để chọn toàn bộ đơn vị cùng loại trên bản đồ.',
      isRead: false,
    },
    {
      id: 'mail-kng-1',
      category: 'KINGDOM',
      title: 'Báo Cáo Khảo Sát Đất Đai & Kho Lương',
      sender: 'Quan Quản Kho Hoàng Gia',
      timestampLabel: 'Ngày 1 · 00:10',
      content: `Bẩm Bệ Hạ, Nhà Kho trung tâm tại [${kingdomName}] đã đi vào hoạt động ổn định.\n\nNgài có thể mở "Kho Đồ" để đặt xây dựng Nhà Dân (tăng dân số nhàn rỗi), Ruộng Lúa (điều phối dân canh tác +1 Lương thực/phút), Trại Lính (tuyển mộ Cấm Vệ Quân & Cung Thủ) và Điện Anh Hùng.\n\nKho lương gửi kèm một phần lương thảo dự trữ đầu mùa.`,
      isRead: false,
      reward: {
        food: 250,
        wood: 200,
      },
      rewardClaimed: false,
    },
    {
      id: 'mail-cmb-1',
      category: 'COMBAT',
      title: 'Mật Báo Do Thám: Quân Hắc Ám Rình Rập',
      sender: 'Đội Trưởng Trinh Sát',
      timestampLabel: 'Ngày 1 · 00:15',
      content:
        'Cấp báo! Đội trinh sát phát hiện các toán Chiến Binh Hắc Ám và Cung Thủ Bóng Đêm đang tập kết ở biên giới phía Bắc và phía Đông.\n\nAnh Hùng Farel đã sẵn sàng với tuyệt kỹ chủ động "Thánh Kiếm Farel" (Phím Q khi chọn Farel). Hãy trang bị vũ khí, giáp trụ riêng cho từng chiến binh trong tab "Trang Bị" để gia tăng Lực Chiến (POW) trước khi địch tràn vào!',
      isRead: false,
      reward: {
        gold: 200,
      },
      rewardClaimed: false,
    },
  ];
}

export type WeatherType =
  | 'CLEAR'
  | 'LIGHT_WIND'
  | 'STRONG_WIND'
  | 'LIGHT_RAIN'
  | 'HEAVY_RAIN'
  | 'THUNDERSTORM'
  | 'LIGHT_SNOW'
  | 'BLIZZARD';

export const WEATHER_OPTIONS: Array<{
  id: WeatherType;
  label: string;
  desc: string;
}> = [
  { id: 'CLEAR', label: 'Trời Quang', desc: 'Nắng ấm bình yên, không mưa gió' },
  {
    id: 'LIGHT_WIND',
    label: 'Gió Nhẹ',
    desc: 'Lá cây và cánh hoa bay lướt nhẹ theo làn gió',
  },
  {
    id: 'STRONG_WIND',
    label: 'Gió Mạnh',
    desc: 'Vệt gió cuộn ngang màn hình kèm nhiều lá cây bay nhanh',
  },
  {
    id: 'LIGHT_RAIN',
    label: 'Mưa Nhẹ',
    desc: 'Mưa phùn dịu mát kèm gợn nước nhỏ trên mặt đất',
  },
  {
    id: 'HEAVY_RAIN',
    label: 'Mưa Bão',
    desc: 'Trời sầm tối, mưa nặng hạt quất chéo kèm gió lớn',
  },
  {
    id: 'THUNDERSTORM',
    label: 'Sấm Chớp',
    desc: 'Mưa bão dữ dội kèm tia sét rạch ngang bầu trời và tiếng sấm',
  },
  {
    id: 'LIGHT_SNOW',
    label: 'Tuyết Rơi Nhẹ',
    desc: 'Tuyết rơi nhẹ nhàng, phủ lớp tuyết mỏng lên công trình, cây cối & mặt đất',
  },
  {
    id: 'BLIZZARD',
    label: 'Tuyết Dày & Bão Tuyết',
    desc: 'Tuyết rơi dày kèm gió bão tuyết, phủ trắng dày đặc khắp bề mặt',
  },
];

// ============================================================================
// HỆ THỐNG TÀI KHOẢN (LOGIN / ĐĂNG KÝ) & BẢN ĐỒ THẾ GIỚI 20x20 (TRỤC OXY)
// Mỗi Vương Quốc trên bản đồ thế giới lưu trữ dữ liệu độc lập hoàn toàn.
// ============================================================================

export type AppScreenMode =
  | 'AUTH'
  | 'WORLD_MAP'
  | 'KINGDOM_MAP'
  | 'ADMIN_SHOWROOM';

export type WorldTileTerrain =
  | 'PLAINS' // Ô trống (Đồng bằng) - Có thể đặt Vương Quốc mới
  | 'MOUNTAIN' // Ngọn núi
  | 'FOREST' // Đám rừng
  | 'RIVER' // Dòng sông
  | 'ENEMY_CAMP' // Toán quân địch
  | 'MINE'; // Khu mỏ

export interface WorldMapTile {
  x: number; // Trục Ox: 0 -> 19
  y: number; // Trục Oy: 0 -> 19
  terrain: WorldTileTerrain;
  labelVi: string;
  kingdomId?: string; // Nếu có Vương Quốc của người chơi đặt tại ô (x, y) này
  enemyLevel?: number; // Cấp độ toán quân địch (nếu terrain === 'ENEMY_CAMP')
  mineType?: 'GOLD' | 'STONE' | 'WOOD' | 'FOOD'; // Loại mỏ tài nguyên (nếu terrain === 'MINE')
}

export interface KingdomSaveData {
  id: string;
  name: string;
  worldX: number;
  worldY: number;
  ownerId?: string; // Firebase Auth UID của chủ sở hữu Vương Quốc
  ownerUsername?: string; // Tên hiển thị của chủ sở hữu Vương Quốc trên Bản Đồ Thế Giới
  createdAt: number;
  lastSavedAt?: number; // Thời điểm lưu gần nhất (hỗ trợ đồng bộ thời gian thực & đa vương quốc)
  isInitialized?: boolean; // Hỗ trợ Lazy Hydration: Chỉ khởi tạo chi tiết map/đơn vị khi người chơi thực sự bước vào Vương Quốc (tối ưu cho hàng trăm Vương Quốc trên World Map)
  mapSeed?: number; // Hạt giống địa hình Procedural 32-bit cố định theo điểm gốc A
  chunksX?: number; // Số lượng Chunk 16×16 theo chiều ngang của khung bao (mặc định khởi đầu: 1 chunk = 16 ô)
  chunksY?: number; // Số lượng Chunk 16×16 theo chiều dọc của khung bao (mặc định khởi đầu: 1 chunk = 16 ô)
  unlockedChunks?: string[]; // Danh sách các tọa độ Chunk 16×16 đã mở khóa (ví dụ ['0,0', '1,0', '0,1']) — mỗi lần mở rộng chỉ thêm đúng 1 chunk 16×16!
  kingdomLevel: number;
  kingdomExp: number;
  heroLevel?: number;
  heroExp?: number;
  resources: Resources;
  buildings: PlacedBuilding[];
  resourceNodes: ResourceNode[];
  villagers: VillagerUnit[];
  king: KingState;
  enemies: EnemyUnit[];
  waveNumber: number;
  day: number;
  elapsedMinutes: number;
  weather: WeatherType;
  inventoryItems: InventoryItem[];
  equipmentInventory: EquipmentItem[];
  gemInventory: GemItem[];
  unitTiers: UnitTierMap;
  unitEquipment: AllUnitsEquipmentMap;
  unitEquipmentById?: Record<string, UnitEquipmentLoadout>;
  unitNicknames?: Record<string, string>;
  exploredTilesRLE?: string; // Nén Run-Length Encoding trạng thái Sương Tối (Fog of War) riêng biệt cho từng Vương Quốc
  controlGroups?: Record<number, string[]>; // Lưu 5 đội hình chiến thuật [1..5] riêng biệt của Vương Quốc
  holdPositionMode?: boolean; // Trạng thái Giữ Vị Trí [D] riêng của Vương Quốc
  formationMode?:
    | 'CLUSTER'
    | 'VERTICAL'
    | 'HORIZONTAL'
    | 'DIAGONAL'
    | 'DIAGONAL_VERTICAL'
    | 'DIAGONAL_HORIZONTAL'
    | 'CIRCLE'; // Kiểu Sắp Trận [F] riêng của Vương Quốc
  skillCooldownEndMap?: Record<string, number>; // Thời gian hồi chiêu kỹ năng riêng của Vương Quốc
  mails?: KingdomMailItem[];
  manorInventory?: InventoryItem[];
  manorObjects?: PlacedManorObject[];
  customTiles?: Record<string, string>; // Lưu các ô đất tùy chỉnh được lát trong Chế Độ Xây Dựng ("gx,gy" -> GroundTextureVariantId)
  unlockedDungeonStages?: Record<string, number>; // Lưu ải cao nhất đã mở khóa cho từng thẻ Phó Bản (VD: { delta_plains: 2 })
  activeMarchOrder?: ActiveWorldMarchOrder | null; // Lệnh xuất quân hành quân trên Bản Đồ Thế Giới (mỗi Vương Quốc tối đa 1 đội quân)
  cardSystemMigratedV1?: boolean;
  chronicleLogs: string[];
}

export interface ActiveWorldMarchOrder {
  orderId: string;
  kingdomId: string;
  kingdomName: string;
  ownerUsername: string;
  fromX: number;
  fromY: number;
  targetX: number;
  targetY: number;
  enemyLevel: number;
  targetType?: 'ENEMY_CAMP' | 'PVP_KINGDOM';
  targetKingdomId?: string;
  targetKingdomName?: string;
  distanceTiles: number;
  pathCoords?: Array<{ x: number; y: number }>;
  startTimeMs: number;
  arrivalTimeMs: number;
  dispatchedTroops: {
    hero: number;
    melee: number;
    ranged: number;
    peasant: number;
  };
  dispatchedUnitIds: string[];
}

export interface WorldChatMessage {
  id: string;
  senderUid: string;
  senderUsername: string;
  text: string;
  createdAtMs: number;
  timestampLabel: string;
}

// Dữ liệu công khai của 1 ô Vương Quốc trên Bản Đồ Thế Giới 50x50 đồng bộ theo từng Chunk 10x10 từ Firebase Firestore
export interface WorldTilePublicSummary {
  tileId: string;
  chunkId: string;
  visibility: 'PUBLIC';
  x: number;
  y: number;
  kingdomId: string;
  kingdomName: string;
  kingdomLevel: number;
  day: number;
  ownerId: string;
  ownerUsername: string;
  population: number;
  gold: number;
}

// Hàm sao chép sâu (Deep Clone) bộ 6 món trang bị + ngọc khảm của 1 đơn vị để tránh chia sẻ tham chiếu bộ nhớ giữa các Vương Quốc
export function cloneUnitEquipmentLoadout(
  loadout?: UnitEquipmentLoadout
): UnitEquipmentLoadout {
  if (!loadout) return {};
  const cloned: UnitEquipmentLoadout = {};
  (Object.keys(loadout) as EquipmentSlot[]).forEach((slot) => {
    const item = loadout[slot];
    if (item) {
      cloned[slot] = {
        ...item,
        stats: item.stats ? { ...item.stats } : {},
        subStats: item.subStats ? { ...item.subStats } : undefined,
        socketedGem: item.socketedGem ? { ...item.socketedGem } : undefined,
      };
    }
  });
  return cloned;
}

// Nén mảng Uint8Array Sương Tối (504 ô) thành chuỗi Run-Length Encoding siêu gọn (VD: "0:320,1:184")
// Giúp tiết kiệm >90% dung lượng bộ nhớ khi lưu hàng trăm Vương Quốc trên Bản Đồ Thế Giới
export function encodeExploredTilesRLE(tiles: Uint8Array): string {
  if (!tiles || tiles.length === 0) return '';
  const parts: string[] = [];
  // Khi lưu xuống đĩa, các ô đang sáng rõ (2) được chuẩn hóa về Đã Khám Phá (1) để khi nạp lại sẽ tính toán tầm nhìn thực tế
  let currentVal = tiles[0] > 0 ? 1 : 0;
  let count = 1;
  for (let i = 1; i < tiles.length; i++) {
    const val = tiles[i] > 0 ? 1 : 0;
    if (val === currentVal) {
      count++;
    } else {
      parts.push(`${currentVal}:${count}`);
      currentVal = val;
      count = 1;
    }
  }
  parts.push(`${currentVal}:${count}`);
  return parts.join(',');
}

// Giải nén chuỗi RLE Sương Tối về lại Uint8Array cho Vương Quốc đang mở
export function decodeExploredTilesRLE(
  rle: string | undefined,
  totalLength: number
): Uint8Array {
  const result = new Uint8Array(totalLength);
  if (!rle) return result;
  let idx = 0;
  const segments = rle.split(',');
  for (const seg of segments) {
    const [valStr, countStr] = seg.split(':');
    const val = Number(valStr) > 0 ? 1 : 0;
    const count = Number(countStr) || 0;
    for (let c = 0; c < count && idx < totalLength; c++) {
      result[idx++] = val;
    }
  }
  return result;
}

export interface PlayerAccount {
  uid?: string;
  username: string;
  password: string;
  createdAt: number;
  worldTiles: WorldMapTile[];
  kingdoms: Record<string, KingdomSaveData>;
}

// Bản Đồ Thế Giới Online mở rộng 50x50 (2.500 ô), chia thành 25 Chunks (mỗi Chunk 10x10 ô)
export const WORLD_MAP_SIZE = 50;
export const WORLD_CHUNK_SIZE = 10;
export const WORLD_CHUNKS_PER_AXIS = WORLD_MAP_SIZE / WORLD_CHUNK_SIZE; // 5x5 = 25 chunks

export function getWorldChunkId(x: number, y: number): string {
  const cx = Math.max(
    0,
    Math.min(WORLD_CHUNKS_PER_AXIS - 1, Math.floor(x / WORLD_CHUNK_SIZE))
  );
  const cy = Math.max(
    0,
    Math.min(WORLD_CHUNKS_PER_AXIS - 1, Math.floor(y / WORLD_CHUNK_SIZE))
  );
  return `chunk_${cx}_${cy}`;
}

export function getWorldTileDocId(x: number, y: number): string {
  return `tile_${x}_${y}`;
}

export interface WorldMapDynamicState {
  clearedCampCoords: Record<string, boolean>;
  spawnedCampsByCoord: Record<string, number>; // key: "x,y", value: enemyLevel (1..10)
  activeMarchLocksByCoord: Record<string, ActiveWorldMarchOrder>; // key: "targetX,targetY"
}

const WORLD_MAP_DYNAMIC_STORAGE_KEY = 'pixel_kingdom_world_map_dynamic_v1';

let cachedWorldMapDynamicState: WorldMapDynamicState | null = null;

export function getWorldMapDynamicState(): WorldMapDynamicState {
  if (cachedWorldMapDynamicState) return cachedWorldMapDynamicState;
  try {
    const raw =
      typeof window !== 'undefined'
        ? window.localStorage.getItem(WORLD_MAP_DYNAMIC_STORAGE_KEY)
        : null;
    if (raw) {
      const parsed = JSON.parse(raw);
      cachedWorldMapDynamicState = {
        clearedCampCoords: parsed.clearedCampCoords || {},
        spawnedCampsByCoord: parsed.spawnedCampsByCoord || {},
        activeMarchLocksByCoord: parsed.activeMarchLocksByCoord || {},
      };
      return cachedWorldMapDynamicState;
    }
  } catch {
    // Ignore storage read errors
  }
  cachedWorldMapDynamicState = {
    clearedCampCoords: {},
    spawnedCampsByCoord: {},
    activeMarchLocksByCoord: {},
  };
  return cachedWorldMapDynamicState;
}

function saveWorldMapDynamicState(state: WorldMapDynamicState): void {
  cachedWorldMapDynamicState = state;
  try {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(
        WORLD_MAP_DYNAMIC_STORAGE_KEY,
        JSON.stringify(state)
      );
    }
  } catch {
    // Ignore storage write errors
  }
}

export function registerWorldMarchLock(order: ActiveWorldMarchOrder): void {
  const state = getWorldMapDynamicState();
  const key = `${order.targetX},${order.targetY}`;
  state.activeMarchLocksByCoord[key] = order;
  saveWorldMapDynamicState({ ...state });
}

export function clearWorldMarchLock(targetX: number, targetY: number): void {
  const state = getWorldMapDynamicState();
  const key = `${targetX},${targetY}`;
  if (state.activeMarchLocksByCoord[key]) {
    delete state.activeMarchLocksByCoord[key];
    saveWorldMapDynamicState({ ...state });
  }
}

export function getActiveMarchLockAtTile(
  x: number,
  y: number
): ActiveWorldMarchOrder | null {
  const state = getWorldMapDynamicState();
  return state.activeMarchLocksByCoord[`${x},${y}`] || null;
}

/**
 * Khi diệt xong 1 Trại Quân Địch trên Bản Đồ Thế Giới:
 * - Trại cũ tại (oldX, oldY) biến mất khỏi bản đồ (trở thành Đồng Bằng Trống).
 * - Tự động tạo lại 1 Trại Quân Địch mới ở vị trí Đồng Bằng Trống ngẫu nhiên khác trên bản đồ 50x50.
 */
export function relocateDefeatedWorldEnemyCamp(
  oldX: number,
  oldY: number,
  enemyLevel: number,
  occupiedCoords: Set<string> = new Set()
): { newX: number; newY: number } {
  const state = getWorldMapDynamicState();
  const oldKey = `${oldX},${oldY}`;
  delete state.spawnedCampsByCoord[oldKey];
  state.clearedCampCoords[oldKey] = true;
  delete state.activeMarchLocksByCoord[oldKey];

  let chosenX = oldX;
  let chosenY = oldY;
  for (let attempt = 0; attempt < 300; attempt++) {
    const rx = Math.floor(Math.random() * WORLD_MAP_SIZE);
    const ry = Math.floor(Math.random() * WORLD_MAP_SIZE);
    const rKey = `${rx},${ry}`;
    if (rx === oldX && ry === oldY) continue;
    if (occupiedCoords.has(rKey)) continue;
    if (state.activeMarchLocksByCoord[rKey]) continue;
    const tile = getDeterministicWorldTileAt(rx, ry);
    if (tile.terrain === 'PLAINS') {
      chosenX = rx;
      chosenY = ry;
      break;
    }
  }

  const newKey = `${chosenX},${chosenY}`;
  delete state.clearedCampCoords[newKey];
  state.spawnedCampsByCoord[newKey] = Math.max(1, Math.min(10, enemyLevel));
  saveWorldMapDynamicState({ ...state });
  return { newX: chosenX, newY: chosenY };
}

/**
 * Hàm hạt giống cố định (Deterministic World Seed) cho 1 ô (x, y) trên Bản Đồ Thế Giới 50x50:
 * - Đảm bảo 100% người chơi trên toàn thế giới nhìn thấy cùng từng bụi cây, dòng sông, ngọn núi, mỏ và toán quân địch
 *   mà chỉ cần tính toán cho đúng các ô đang nằm trong màn hình hiển thị (Viewport Loading O(1)).
 * - Kết hợp với trạng thái động (Trại Địch đã bị tiêu diệt sẽ biến mất và tái sinh ở tọa độ ngẫu nhiên mới).
 */
export function getDeterministicWorldTileAt(x: number, y: number): WorldMapTile {
  const dynamicState = getWorldMapDynamicState();
  const coordKey = `${x},${y}`;

  // Dòng sông chính uốn lượn dọc lục địa 50x50 + nhánh sông phụ phía Đông Nam
  const mainRiverX = Math.floor(21 + Math.sin(y * 0.28) * 4.5);
  const branchRiverY = Math.floor(32 + Math.cos(x * 0.25) * 3.5);
  const isMainRiver =
    x === mainRiverX || (y % 4 === 0 && x === mainRiverX + 1);
  const isBranchRiver = x >= mainRiverX && y === branchRiverY;
  const isBridgeOrCenter =
    (x === 5 && y === 5) ||
    (x === 6 && y === 5) ||
    (x === 10 && y === 10) ||
    (x === 25 && y === 25) ||
    (x === 3 && y === 3);
  const isRiver = (isMainRiver || isBranchRiver) && !isBridgeOrCenter;

  // Giá trị băm cố định theo tọa độ (x, y)
  const hash =
    ((x * 73856093) ^ (y * 19349663) ^ ((x + y) * 83492791)) >>> 0;
  const roll = hash % 100;

  let terrain: WorldTileTerrain = 'PLAINS';
  let labelVi = 'Đồng Bằng Trống';
  let enemyLevel: number | undefined;
  let mineType: 'GOLD' | 'STONE' | 'WOOD' | 'FOOD' | undefined;

  if (isRiver) {
    terrain = 'RIVER';
    labelVi = 'Dòng Sông Lớn';
  } else if (roll < 10) {
    terrain = 'MOUNTAIN';
    labelVi = 'Dãy Núi Đá';
  } else if (roll >= 10 && roll < 22) {
    terrain = 'FOREST';
    labelVi = 'Rừng Già Nguyên Sinh';
  } else if (roll >= 22 && roll < 29) {
    terrain = 'ENEMY_CAMP';
    enemyLevel = 1 + ((x + y) % 10);
    labelVi = `Toán Quân Địch Lv.${enemyLevel}`;
  } else if (roll >= 29 && roll < 35) {
    terrain = 'MINE';
    const mineOptions: Array<'GOLD' | 'STONE' | 'WOOD' | 'FOOD'> = [
      'GOLD',
      'STONE',
      'WOOD',
      'FOOD',
    ];
    mineType = mineOptions[(x + y) % mineOptions.length];
    labelVi =
      mineType === 'GOLD'
        ? 'Khu Mỏ Vàng Cổ'
        : mineType === 'STONE'
          ? 'Khu Mỏ Đá Hoa Cương'
          : mineType === 'WOOD'
            ? 'Khu Lâm Trường Cổ Thụ'
            : 'Thung Lũng Lúa Mạch';
  }

  // Đảm bảo các tọa độ khởi đầu phổ biến luôn là ô Đồng Bằng Trống
  if (isBridgeOrCenter) {
    terrain = 'PLAINS';
    labelVi = 'Đồng Bằng Trống';
    enemyLevel = undefined;
    mineType = undefined;
  }

  // Nếu trại quân địch tại ô này đã bị tiêu diệt, biến mất khỏi vị trí cũ
  if (terrain === 'ENEMY_CAMP' && dynamicState.clearedCampCoords[coordKey]) {
    terrain = 'PLAINS';
    labelVi = 'Đồng Bằng Trống';
    enemyLevel = undefined;
  }

  // Nếu có trại quân địch mới tái sinh tại ô đồng bằng này
  if (dynamicState.spawnedCampsByCoord[coordKey] !== undefined) {
    terrain = 'ENEMY_CAMP';
    enemyLevel = dynamicState.spawnedCampsByCoord[coordKey];
    labelVi = `Toán Quân Địch Lv.${enemyLevel}`;
    mineType = undefined;
  }

  return {
    x,
    y,
    terrain,
    labelVi,
    enemyLevel,
    mineType,
  };
}

export function generateInitialWorldMap20x20(): WorldMapTile[] {
  const tiles: WorldMapTile[] = [];
  for (let y = 0; y < WORLD_MAP_SIZE; y++) {
    for (let x = 0; x < WORLD_MAP_SIZE; x++) {
      tiles.push(getDeterministicWorldTileAt(x, y));
    }
  }
  return tiles;
}

export interface PomodoroRewardPayload {
  gold?: number;
  diamonds?: number;
  food?: number;
  wood?: number;
  stone?: number;
  kingdomExp?: number;
  kingdomItems?: Array<{
    blueprint: Omit<InventoryItem, 'quantity'>;
    quantity: number;
  }>;
  manorItems?: Array<{
    blueprint: Omit<InventoryItem, 'quantity'>;
    quantity: number;
  }>;
  summaryLabel: string;
}

const MARCH_PATH_CACHE = new Map<string, Array<{ x: number; y: number }>>();

/**
 * Tìm đường đi 4 hướng vuông góc (Lên, Phải, Xuống, Trái — TUYỆT ĐỐI KHÔNG ĐI CHÉO)
 * trên Bản Đồ Thế Giới 50x50 từ (fromX, fromY) đến (targetX, targetY),
 * buộc phải né toàn bộ vật cản: Núi (MOUNTAIN), Rừng (FOREST), Sông (RIVER), Mỏ (MINE),
 * Trại Địch (ENEMY_CAMP) và các Vương Quốc khác trên bản đồ.
 */
export function computeWorldMarchPath4Dir(
  fromX: number,
  fromY: number,
  targetX: number,
  targetY: number,
  occupiedKingdomCoords?: Iterable<string>
): Array<{ x: number; y: number }> {
  const sx = Math.max(0, Math.min(WORLD_MAP_SIZE - 1, Math.round(fromX)));
  const sy = Math.max(0, Math.min(WORLD_MAP_SIZE - 1, Math.round(fromY)));
  const tx = Math.max(0, Math.min(WORLD_MAP_SIZE - 1, Math.round(targetX)));
  const ty = Math.max(0, Math.min(WORLD_MAP_SIZE - 1, Math.round(targetY)));

  if (sx === tx && sy === ty) {
    return [{ x: sx, y: sy }];
  }

  const occupiedSet = new Set<string>(occupiedKingdomCoords || []);
  const totalCells = WORLD_MAP_SIZE * WORLD_MAP_SIZE;
  const startIdx = sy * WORLD_MAP_SIZE + sx;
  const targetIdx = ty * WORLD_MAP_SIZE + tx;

  const isPassableTile = (x: number, y: number): boolean => {
    if (x === sx && y === sy) return true;
    if (x === tx && y === ty) return true;
    const key = `${x},${y}`;
    if (occupiedSet.has(key)) return false;
    const tile = getDeterministicWorldTileAt(x, y);
    return tile.terrain === 'PLAINS';
  };

  // 4 hướng vuông góc: Lên, Phải, Xuống, Trái (Không đi chéo)
  const dirs: ReadonlyArray<readonly [number, number]> = [
    [0, -1],
    [1, 0],
    [0, 1],
    [-1, 0],
  ];

  // Pass 1: BFS 4 hướng tuyệt đối chỉ đi qua ô PLAINS trống
  const visited = new Uint8Array(totalCells);
  const parent = new Int32Array(totalCells).fill(-1);
  const queue = new Int32Array(totalCells);
  let head = 0;
  let tail = 0;

  visited[startIdx] = 1;
  queue[tail++] = startIdx;
  let found = false;

  while (head < tail) {
    const curr = queue[head++];
    if (curr === targetIdx) {
      found = true;
      break;
    }
    const cx = curr % WORLD_MAP_SIZE;
    const cy = Math.floor(curr / WORLD_MAP_SIZE);

    for (let d = 0; d < 4; d++) {
      const nx = cx + dirs[d][0];
      const ny = cy + dirs[d][1];
      if (nx < 0 || nx >= WORLD_MAP_SIZE || ny < 0 || ny >= WORLD_MAP_SIZE) {
        continue;
      }
      const nIdx = ny * WORLD_MAP_SIZE + nx;
      if (visited[nIdx]) continue;
      if (!isPassableTile(nx, ny)) continue;
      visited[nIdx] = 1;
      parent[nIdx] = curr;
      queue[tail++] = nIdx;
    }
  }

  // Pass 2 (Fallback nếu mục tiêu bị bao vây kín 4 phía bởi sông/núi/rừng):
  // Dùng 0-1 BFS / Dijkstra ưu tiên tối đa ô trống (chi phí 1) và phạt nặng vật cản (chi phí 80)
  if (!found) {
    const dist = new Int32Array(totalCells).fill(1e9);
    parent.fill(-1);
    const used = new Uint8Array(totalCells);
    dist[startIdx] = 0;

    for (let step = 0; step < totalCells; step++) {
      let u = -1;
      let bestD = 1e9;
      for (let i = 0; i < totalCells; i++) {
        if (!used[i] && dist[i] < bestD) {
          bestD = dist[i];
          u = i;
        }
      }
      if (u === -1 || u === targetIdx) break;
      used[u] = 1;

      const cx = u % WORLD_MAP_SIZE;
      const cy = Math.floor(u / WORLD_MAP_SIZE);
      for (let d = 0; d < 4; d++) {
        const nx = cx + dirs[d][0];
        const ny = cy + dirs[d][1];
        if (nx < 0 || nx >= WORLD_MAP_SIZE || ny < 0 || ny >= WORLD_MAP_SIZE) {
          continue;
        }
        const nIdx = ny * WORLD_MAP_SIZE + nx;
        const stepCost = isPassableTile(nx, ny) ? 1 : 80;
        if (dist[u] + stepCost < dist[nIdx]) {
          dist[nIdx] = dist[u] + stepCost;
          parent[nIdx] = u;
        }
      }
    }
  }

  const path: Array<{ x: number; y: number }> = [];
  let trace = targetIdx;
  while (trace !== -1) {
    path.push({
      x: trace % WORLD_MAP_SIZE,
      y: Math.floor(trace / WORLD_MAP_SIZE),
    });
    if (trace === startIdx) break;
    trace = parent[trace];
  }
  path.reverse();

  if (path.length < 2 || path[0].x !== sx || path[0].y !== sy) {
    // Fallback an toàn nối từng ô theo trục X rồi trục Y (vẫn đi 4 hướng không đi chéo)
    const fallbackPath: Array<{ x: number; y: number }> = [{ x: sx, y: sy }];
    let curX = sx;
    let curY = sy;
    while (curX !== tx) {
      curX += curX < tx ? 1 : -1;
      fallbackPath.push({ x: curX, y: curY });
    }
    while (curY !== ty) {
      curY += curY < ty ? 1 : -1;
      fallbackPath.push({ x: curX, y: curY });
    }
    return fallbackPath;
  }

  return path;
}

export function getMarchOrderPath4Dir(
  order: ActiveWorldMarchOrder,
  occupiedKingdomCoords?: Iterable<string>
): Array<{ x: number; y: number }> {
  if (order.pathCoords && order.pathCoords.length >= 2) {
    return order.pathCoords;
  }
  const cacheKey = `${order.orderId}_${order.fromX},${order.fromY}->${order.targetX},${order.targetY}`;
  const cached = MARCH_PATH_CACHE.get(cacheKey);
  if (cached) return cached;
  const computed = computeWorldMarchPath4Dir(
    order.fromX,
    order.fromY,
    order.targetX,
    order.targetY,
    occupiedKingdomCoords
  );
  MARCH_PATH_CACHE.set(cacheKey, computed);
  return computed;
}
