import {
  BuildingType,
  CustomItemIconKind,
  EnemyUnit,
  PlacedBuilding,
  PlacedManorObject,
  ResourceNode,
  UnitArchetypeId,
  VillagerUnit,
} from '../types/game';

export const SHOWROOM_GRID_COLS = 30;
export const SHOWROOM_GRID_ROWS = 30;

export type ShowroomCategory =
  | 'GROUND_TEXTURE'
  | 'TREE_AND_RESOURCE'
  | 'DECORATION'
  | 'BUILDING'
  | 'ENEMY'
  | 'HERO_AND_TROOP';

export interface ShowroomCategoryMeta {
  id: ShowroomCategory;
  rowNumber: number;
  gridY: number;
  titleVi: string;
  shortTitleVi: string;
  descriptionVi: string;
  canConfigureStages: boolean;
  badgeColorHex: string;
}

export const SHOWROOM_CATEGORIES: ShowroomCategoryMeta[] = [
  {
    id: 'GROUND_TEXTURE',
    rowNumber: 1,
    gridY: 3,
    titleVi: 'Hàng 1: Ô Đất & Texture Mặt Đất',
    shortTitleVi: '1. Ô Đất / Texture',
    descriptionVi:
      'Các loại ô đất, thảm cỏ hoa, đường đá cuội, đá tảng rêu và mặt nước. Có thể tích chọn cho từng màn chơi.',
    canConfigureStages: true,
    badgeColorHex: '#4ade80',
  },
  {
    id: 'TREE_AND_RESOURCE',
    rowNumber: 2,
    gridY: 7,
    titleVi: 'Hàng 2: Cây Cối, Đá Tảng & Mỏ Tài Nguyên',
    shortTitleVi: '2. Cây & Đá',
    descriptionVi:
      'Cây cổ thụ, cụm đá hoa cương và mạch quặng vàng tự nhiên trên bản đồ. Có thể tích chọn cho từng màn chơi.',
    canConfigureStages: true,
    badgeColorHex: '#a3e635',
  },
  {
    id: 'DECORATION',
    rowNumber: 3,
    gridY: 11,
    titleVi: 'Hàng 3: Bụi Cỏ, Hoa & Vật Trang Trí Cảnh Quan',
    shortTitleVi: '3. Cỏ & Trang Trí',
    descriptionVi:
      'Hàng rào gỗ bụi cỏ, luống hoa thảo dược, đài phun nước, hươu sao và tượng kỳ lân. Có thể tích chọn cho từng màn chơi.',
    canConfigureStages: true,
    badgeColorHex: '#f472b6',
  },
  {
    id: 'BUILDING',
    rowNumber: 4,
    gridY: 15,
    titleVi: 'Hàng 4: Công Trình & Kiến Trúc Trang Trí',
    shortTitleVi: '4. Công Trình',
    descriptionVi:
      'Các mẫu kiến trúc Nhà Kho, Nhà Dân, Ruộng Lúa, Trại Lính, Điện Anh Hùng, Trang Viên. Có thể tích chọn làm cảnh quan màn chơi.',
    canConfigureStages: true,
    badgeColorHex: '#fbbf24',
  },
  {
    id: 'ENEMY',
    rowNumber: 5,
    gridY: 20,
    titleVi: 'Hàng 5: Quân Địch & Quái Vật',
    shortTitleVi: '5. Quân Địch',
    descriptionVi:
      'Các chủng loại quân địch xuất hiện trong màn chơi (Chiến Binh Hắc Ám, Cung Thủ Bóng Đêm). Có thể tích chọn cho từng màn chơi.',
    canConfigureStages: true,
    badgeColorHex: '#f87171',
  },
  {
    id: 'HERO_AND_TROOP',
    rowNumber: 6,
    gridY: 25,
    titleVi: 'Hàng 6: Anh Hùng & Quân Lính (Chỉ Xem Tổng Quát)',
    shortTitleVi: '6. Anh Hùng & Lính',
    descriptionVi:
      'Đức Vua, Anh Hùng Farel, Cấm Vệ Quân, Cung Thủ Hoàng Gia và Nông Dân. Chỉ trưng bày trực quan, không áp dụng tích chọn tự sinh trong màn chơi.',
    canConfigureStages: false,
    badgeColorHex: '#38bdf8',
  },
];

export type GroundTextureVariantId =
  | 'TEX_GRASS_MEADOW'
  | 'TEX_GRASS_BUTTERCUP'
  | 'TEX_GRASS_LUSH'
  | 'TEX_GRASS_POPPY'
  | 'TEX_GRASS_PEBBLE'
  | 'TEX_GRASS_BLUEBELL'
  | 'TEX_ROYAL_ROAD'
  | 'TEX_POND_BOULDER'
  | 'TEX_RIVER_WATER';

export interface ShowroomModelItem {
  id: string;
  nameVi: string;
  subLabelVi: string;
  category: ShowroomCategory;
  gridX: number;
  gridY: number;
  canConfigureStages: boolean;
  // Metadata để vẽ đúng thực thể trên bản đồ 30x30 Showroom
  groundTextureVariant?: GroundTextureVariantId;
  grassSeedOverride?: number;
  resourceNodeType?: ResourceNode['type'];
  manorCustomIcon?: CustomItemIconKind;
  buildingType?: BuildingType;
  enemyKind?: 'MELEE' | 'RANGED' | 'MAGE';
  enemyArchetypeId?: 'ENEMY_MELEE' | 'ENEMY_RANGED' | 'ENEMY_MAGE';
  allyPreviewKind?:
    | 'KING_LORD'
    | 'HERO_FAREL'
    | 'SOLDIER_MELEE'
    | 'SOLDIER_RANGED'
    | 'PEASANT';
  portraitKind?: UnitArchetypeId | BuildingType;
}

/**
 * Danh sách toàn bộ Model & Ô Texture đặt trên bản đồ Showroom 30x30,
 * sắp xếp theo từng hàng cùng loại (cách nhau 3 ô theo trục X để thoáng và dễ click).
 */
export const SHOWROOM_MODELS_CATALOG: ShowroomModelItem[] = [
  // ==========================================================================
  // HÀNG 1 (gridY = 3): Ô ĐẤT & TEXTURE MẶT ĐẤT (9 mẫu: gx = 3..27)
  // ==========================================================================
  {
    id: 'TEX_GRASS_MEADOW',
    nameVi: 'Ô Thảo Nguyên Cỏ Non',
    subLabelVi: 'Texture Mặt Đất · Cỏ Xanh Cơ Bản',
    category: 'GROUND_TEXTURE',
    gridX: 3,
    gridY: 3,
    canConfigureStages: true,
    groundTextureVariant: 'TEX_GRASS_MEADOW',
    grassSeedOverride: 5,
  },
  {
    id: 'TEX_GRASS_BUTTERCUP',
    nameVi: 'Ô Cỏ Hoa Mao Lương Vàng',
    subLabelVi: 'Texture Mặt Đất · Hoa Vàng Điểm Xuyết',
    category: 'GROUND_TEXTURE',
    gridX: 6,
    gridY: 3,
    canConfigureStages: true,
    groundTextureVariant: 'TEX_GRASS_BUTTERCUP',
    grassSeedOverride: 0,
  },
  {
    id: 'TEX_GRASS_LUSH',
    nameVi: 'Ô Khóm Cỏ Xanh Rậm',
    subLabelVi: 'Texture Mặt Đất · Bụi Cỏ Đôi',
    category: 'GROUND_TEXTURE',
    gridX: 9,
    gridY: 3,
    canConfigureStages: true,
    groundTextureVariant: 'TEX_GRASS_LUSH',
    grassSeedOverride: 1,
  },
  {
    id: 'TEX_GRASS_POPPY',
    nameVi: 'Ô Cỏ Hoa Anh Túc Đỏ',
    subLabelVi: 'Texture Mặt Đất · Hoa Đỏ Thảo Nguyên',
    category: 'GROUND_TEXTURE',
    gridX: 12,
    gridY: 3,
    canConfigureStages: true,
    groundTextureVariant: 'TEX_GRASS_POPPY',
    grassSeedOverride: 2,
  },
  {
    id: 'TEX_GRASS_PEBBLE',
    nameVi: 'Ô Đất Đá Cuội Rêu Phong',
    subLabelVi: 'Texture Mặt Đất · Sỏi Đá Tự Nhiên',
    category: 'GROUND_TEXTURE',
    gridX: 15,
    gridY: 3,
    canConfigureStages: true,
    groundTextureVariant: 'TEX_GRASS_PEBBLE',
    grassSeedOverride: 3,
  },
  {
    id: 'TEX_GRASS_BLUEBELL',
    nameVi: 'Ô Cỏ Hoa Chuông Xanh',
    subLabelVi: 'Texture Mặt Đất · Hoa Lam Điểm Xuyết',
    category: 'GROUND_TEXTURE',
    gridX: 18,
    gridY: 3,
    canConfigureStages: true,
    groundTextureVariant: 'TEX_GRASS_BLUEBELL',
    grassSeedOverride: 4,
  },
  {
    id: 'TEX_ROYAL_ROAD',
    nameVi: 'Ô Đường Đá Cuội Hoàng Gia',
    subLabelVi: 'Texture Mặt Đất · Lối Đi Lát Đá',
    category: 'GROUND_TEXTURE',
    gridX: 21,
    gridY: 3,
    canConfigureStages: true,
    groundTextureVariant: 'TEX_ROYAL_ROAD',
  },
  {
    id: 'TEX_POND_BOULDER',
    nameVi: 'Ô Đá Tảng Rêu Ven Hồ',
    subLabelVi: 'Texture Mặt Đất · Vành Đai Đá Cuội',
    category: 'GROUND_TEXTURE',
    gridX: 24,
    gridY: 3,
    canConfigureStages: true,
    groundTextureVariant: 'TEX_POND_BOULDER',
  },
  {
    id: 'TEX_RIVER_WATER',
    nameVi: 'Ô Mặt Nước Sông Hồ',
    subLabelVi: 'Texture Mặt Đất · Nước Gợn Sóng',
    category: 'GROUND_TEXTURE',
    gridX: 27,
    gridY: 3,
    canConfigureStages: true,
    groundTextureVariant: 'TEX_RIVER_WATER',
  },

  // ==========================================================================
  // HÀNG 2 (gridY = 7): CÂY CỐI, ĐÁ TẢNG & MỎ TÀI NGUYÊN
  // ==========================================================================
  {
    id: 'NODE_TREE',
    nameVi: 'Cây Sồi Cổ Thụ',
    subLabelVi: 'Cây Cối Tự Nhiên · Đung Đưa Theo Gió',
    category: 'TREE_AND_RESOURCE',
    gridX: 5,
    gridY: 7,
    canConfigureStages: true,
    resourceNodeType: 'TREE',
  },
  {
    id: 'NODE_STONE_DEPOSIT',
    nameVi: 'Cụm Đá Tảng Hoa Cương',
    subLabelVi: 'Đá Tự Nhiên & Mỏ Đá',
    category: 'TREE_AND_RESOURCE',
    gridX: 10,
    gridY: 7,
    canConfigureStages: true,
    resourceNodeType: 'STONE_DEPOSIT',
  },
  {
    id: 'NODE_GOLD_VEIN',
    nameVi: 'Mạch Quặng Vàng Ròng',
    subLabelVi: 'Mỏ Vàng Lấp Lánh',
    category: 'TREE_AND_RESOURCE',
    gridX: 15,
    gridY: 7,
    canConfigureStages: true,
    resourceNodeType: 'GOLD_VEIN',
  },

  // ==========================================================================
  // HÀNG 3 (gridY = 11): BỤI CỎ, HOA & VẬT TRANG TRÍ MÔI TRƯỜNG
  // ==========================================================================
  {
    id: 'DEC_MANOR_FENCE',
    nameVi: 'Hàng Rào Gỗ & Bụi Cỏ Hoa',
    subLabelVi: 'Trang Trí Cảnh Quan · Phẩm Chất Thường',
    category: 'DECORATION',
    gridX: 5,
    gridY: 11,
    canConfigureStages: true,
    manorCustomIcon: 'MANOR_FENCE',
  },
  {
    id: 'DEC_MANOR_GARDEN',
    nameVi: 'Luống Hoa & Thảo Dược',
    subLabelVi: 'Bụi Hoa Thảo Nguyên · Phẩm Chất Phổ Biến',
    category: 'DECORATION',
    gridX: 10,
    gridY: 11,
    canConfigureStages: true,
    manorCustomIcon: 'MANOR_GARDEN',
  },
  {
    id: 'DEC_MANOR_FOUNTAIN',
    nameVi: 'Đài Phun Nước Đá Cổ',
    subLabelVi: 'Trang Trí Kiến Trúc · Phẩm Chất Hiếm Có',
    category: 'DECORATION',
    gridX: 15,
    gridY: 11,
    canConfigureStages: true,
    manorCustomIcon: 'MANOR_FOUNTAIN',
  },
  {
    id: 'DEC_MANOR_DEER',
    nameVi: 'Bãi Cỏ Hươu Sao Linh Thú',
    subLabelVi: 'Sinh Vật Cảnh Quan · Phẩm Chất Siêu Hiếm',
    category: 'DECORATION',
    gridX: 20,
    gridY: 11,
    canConfigureStages: true,
    manorCustomIcon: 'MANOR_DEER',
  },
  {
    id: 'DEC_MANOR_STATUE',
    nameVi: 'Tượng Kỳ Lân Hoàng Kim',
    subLabelVi: 'Tượng Cổ Huyền Thoại · Phẩm Chất Vàng',
    category: 'DECORATION',
    gridX: 25,
    gridY: 11,
    canConfigureStages: true,
    manorCustomIcon: 'MANOR_STATUE',
  },

  // ==========================================================================
  // HÀNG 4 (gridY = 15): CÔNG TRÌNH KIẾN TRÚC
  // ==========================================================================
  {
    id: 'BLD_WAREHOUSE',
    nameVi: 'Nhà Kho Trung Tâm',
    subLabelVi: 'Công Trình · Kho Lương Thảo',
    category: 'BUILDING',
    gridX: 4,
    gridY: 15,
    canConfigureStages: true,
    buildingType: 'WAREHOUSE',
    portraitKind: 'WAREHOUSE',
  },
  {
    id: 'BLD_TOWN_HALL',
    nameVi: 'Nhà Dân Mái Ngói',
    subLabelVi: 'Công Trình · Mái Ấm Bách Tính',
    category: 'BUILDING',
    gridX: 8,
    gridY: 15,
    canConfigureStages: true,
    buildingType: 'TOWN_HALL',
    portraitKind: 'TOWN_HALL',
  },
  {
    id: 'BLD_FARM',
    nameVi: 'Ruộng Lúa Vàng',
    subLabelVi: 'Công Trình · Cánh Đồng Lúa Chín',
    category: 'BUILDING',
    gridX: 12,
    gridY: 15,
    canConfigureStages: true,
    buildingType: 'FARM',
    portraitKind: 'FARM',
  },
  {
    id: 'BLD_BARRACKS',
    nameVi: 'Trại Lính Hoàng Gia',
    subLabelVi: 'Công Trình · Doanh Trại Quân Đội',
    category: 'BUILDING',
    gridX: 16,
    gridY: 15,
    canConfigureStages: true,
    buildingType: 'BARRACKS',
    portraitKind: 'BARRACKS',
  },
  {
    id: 'BLD_HERO_ALTAR',
    nameVi: 'Điện Anh Hùng',
    subLabelVi: 'Công Trình · Thánh Điện Triệu Hồi',
    category: 'BUILDING',
    gridX: 20,
    gridY: 15,
    canConfigureStages: true,
    buildingType: 'HERO_ALTAR',
    portraitKind: 'HERO_ALTAR',
  },
  {
    id: 'BLD_MANOR',
    nameVi: 'Dinh Thự Trang Viên',
    subLabelVi: 'Công Trình · Biệt Phủ Quý Tộc',
    category: 'BUILDING',
    gridX: 24,
    gridY: 15,
    canConfigureStages: true,
    buildingType: 'MANOR',
    portraitKind: 'MANOR',
  },

  // ==========================================================================
  // HÀNG 5 (gridY = 20): QUÂN ĐỊCH & QUÁI VẬT (Có tích chọn màn chơi)
  // ==========================================================================
  {
    id: 'ENEMY_MELEE',
    nameVi: 'Chiến Binh Hắc Ám',
    subLabelVi: 'Quân Địch Tiên Phong · Cận Chiến',
    category: 'ENEMY',
    gridX: 8,
    gridY: 20,
    canConfigureStages: true,
    enemyKind: 'MELEE',
    enemyArchetypeId: 'ENEMY_MELEE',
    portraitKind: 'ENEMY_MELEE',
  },
  {
    id: 'ENEMY_RANGED',
    nameVi: 'Cung Thủ Bóng Đêm',
    subLabelVi: 'Quân Địch Ám Kích · Tầm Xa',
    category: 'ENEMY',
    gridX: 14,
    gridY: 20,
    canConfigureStages: true,
    enemyKind: 'RANGED',
    enemyArchetypeId: 'ENEMY_RANGED',
    portraitKind: 'ENEMY_RANGED',
  },
  {
    id: 'ENEMY_MAGE',
    nameVi: 'Pháp Sư Bóng Đêm',
    subLabelVi: 'Quân Địch Hắc Pháp · Tầm Xa Phép Thuật',
    category: 'ENEMY',
    gridX: 20,
    gridY: 20,
    canConfigureStages: true,
    enemyKind: 'MAGE',
    enemyArchetypeId: 'ENEMY_MAGE',
    portraitKind: 'ENEMY_MAGE',
  },

  // ==========================================================================
  // HÀNG 6 (gridY = 25): ANH HÙNG & QUÂN LÍNH (CHỈ XEM TỔNG QUÁT, KHÔNG TÍCH CHỌN)
  // ==========================================================================
  {
    id: 'ALLY_KING_LORD',
    nameVi: 'Đức Vua (Lãnh Chúa)',
    subLabelVi: 'Chỉ Xem Tổng Quát · Không Áp Dụng Tích Chọn',
    category: 'HERO_AND_TROOP',
    gridX: 5,
    gridY: 25,
    canConfigureStages: false,
    allyPreviewKind: 'KING_LORD',
    portraitKind: 'KING',
  },
  {
    id: 'ALLY_HERO_FAREL',
    nameVi: 'Anh Hùng Farel',
    subLabelVi: 'Chỉ Xem Tổng Quát · Không Áp Dụng Tích Chọn',
    category: 'HERO_AND_TROOP',
    gridX: 10,
    gridY: 25,
    canConfigureStages: false,
    allyPreviewKind: 'HERO_FAREL',
    portraitKind: 'KING',
  },
  {
    id: 'ALLY_SOLDIER_MELEE',
    nameVi: 'Cấm Vệ Quân (Bộ Binh)',
    subLabelVi: 'Chỉ Xem Tổng Quát · Không Áp Dụng Tích Chọn',
    category: 'HERO_AND_TROOP',
    gridX: 15,
    gridY: 25,
    canConfigureStages: false,
    allyPreviewKind: 'SOLDIER_MELEE',
    portraitKind: 'SOLDIER_MELEE',
  },
  {
    id: 'ALLY_SOLDIER_RANGED',
    nameVi: 'Cung Thủ Hoàng Gia (Xạ Thủ)',
    subLabelVi: 'Chỉ Xem Tổng Quát · Không Áp Dụng Tích Chọn',
    category: 'HERO_AND_TROOP',
    gridX: 20,
    gridY: 25,
    canConfigureStages: false,
    allyPreviewKind: 'SOLDIER_RANGED',
    portraitKind: 'SOLDIER_RANGED',
  },
  {
    id: 'ALLY_PEASANT',
    nameVi: 'Nông Dân Cần Mẫn',
    subLabelVi: 'Chỉ Xem Tổng Quát · Không Áp Dụng Tích Chọn',
    category: 'HERO_AND_TROOP',
    gridX: 25,
    gridY: 25,
    canConfigureStages: false,
    allyPreviewKind: 'PEASANT',
    portraitKind: 'PEASANT',
  },
];

// ============================================================================
// DANH SÁCH TẤT CẢ MÀN CHƠI (SẮP XẾP THEO NHÓM CHẾ ĐỘ CHƠI)
// ============================================================================

export interface StageTargetOption {
  stageKey: string;
  groupModeId: string;
  groupModeTitleVi: string;
  cardId?: string;
  stageNumber?: number;
  titleVi: string;
  subLabelVi: string;
}

export interface StageModeGroup {
  groupModeId: string;
  groupModeTitleVi: string;
  descriptionVi: string;
  stages: StageTargetOption[];
}

export const STAGE_MODE_GROUPS: StageModeGroup[] = [
  {
    groupModeId: 'DUNGEON_DELTA_PLAINS',
    groupModeTitleVi: 'Chế Độ Phó Bản · Đồng Bằng Châu Thổ (6 Ải)',
    descriptionVi:
      'Các màn chơi chiến dịch Phó Bản thuộc khu vực Đồng Bằng Châu Thổ.',
    stages: [
      {
        stageKey: 'stage_delta_plains_1',
        groupModeId: 'DUNGEON_DELTA_PLAINS',
        groupModeTitleVi: 'Phó Bản · Đồng Bằng Châu Thổ',
        cardId: 'delta_plains',
        stageNumber: 1,
        titleVi: 'Ải 1 - Tiền Đồn Bờ Sông',
        subLabelVi: 'Đồng Bằng Châu Thổ · Cấp Địch Lv.1',
      },
      {
        stageKey: 'stage_delta_plains_2',
        groupModeId: 'DUNGEON_DELTA_PLAINS',
        groupModeTitleVi: 'Phó Bản · Đồng Bằng Châu Thổ',
        cardId: 'delta_plains',
        stageNumber: 2,
        titleVi: 'Ải 2 - Cánh Đồng Hoang',
        subLabelVi: 'Đồng Bằng Châu Thổ · Cấp Địch Lv.2',
      },
      {
        stageKey: 'stage_delta_plains_3',
        groupModeId: 'DUNGEON_DELTA_PLAINS',
        groupModeTitleVi: 'Phó Bản · Đồng Bằng Châu Thổ',
        cardId: 'delta_plains',
        stageNumber: 3,
        titleVi: 'Ải 3 - Thảo Nguyên Gió Nhẹ',
        subLabelVi: 'Đồng Bằng Châu Thổ · Cấp Địch Lv.3',
      },
      {
        stageKey: 'stage_delta_plains_4',
        groupModeId: 'DUNGEON_DELTA_PLAINS',
        groupModeTitleVi: 'Phó Bản · Đồng Bằng Châu Thổ',
        cardId: 'delta_plains',
        stageNumber: 4,
        titleVi: 'Ải 4 - Kho Lương Bị Chiếm',
        subLabelVi: 'Đồng Bằng Châu Thổ · Cấp Địch Lv.4',
      },
      {
        stageKey: 'stage_delta_plains_5',
        groupModeId: 'DUNGEON_DELTA_PLAINS',
        groupModeTitleVi: 'Phó Bản · Đồng Bằng Châu Thổ',
        cardId: 'delta_plains',
        stageNumber: 5,
        titleVi: 'Ải 5 - Doanh Trại Ven Đồi',
        subLabelVi: 'Đồng Bằng Châu Thổ · Cấp Địch Lv.5',
      },
      {
        stageKey: 'stage_delta_plains_6',
        groupModeId: 'DUNGEON_DELTA_PLAINS',
        groupModeTitleVi: 'Phó Bản · Đồng Bằng Châu Thổ',
        cardId: 'delta_plains',
        stageNumber: 6,
        titleVi: 'Ải 6 - Thành Lũy Châu Thổ',
        subLabelVi: 'Đồng Bằng Châu Thổ · Cấp Địch Lv.6',
      },
    ],
  },
  {
    groupModeId: 'KINGDOM_AND_MANOR_MAPS',
    groupModeTitleVi: 'Chế Độ Kiến Thiết · Map Vương Quốc & Map Trang Viên',
    descriptionVi:
      'Bản đồ Vương Quốc chính và Bản đồ Trang Viên do Module Vẽ Map Tự Động khởi tạo.',
    stages: [
      {
        stageKey: 'map_kingdom_default',
        groupModeId: 'KINGDOM_AND_MANOR_MAPS',
        groupModeTitleVi: 'Chế Độ Kiến Thiết',
        titleVi: 'Map Vương Quốc (30×18)',
        subLabelVi: 'Bản đồ xây dựng & phòng thủ Vương Quốc',
      },
      {
        stageKey: 'map_manor_default',
        groupModeId: 'KINGDOM_AND_MANOR_MAPS',
        groupModeTitleVi: 'Chế Độ Kiến Thiết',
        titleVi: 'Map Trang Viên Điền Viên (30×18)',
        subLabelVi: 'Bản đồ hồ nước & sân vườn Trang Viên',
      },
    ],
  },
];

export const ALL_STAGE_TARGET_OPTIONS: StageTargetOption[] =
  STAGE_MODE_GROUPS.flatMap((g) => g.stages);

export function getStageKeyForDungeon(
  cardId: string,
  stageNumber: number
): string {
  return `stage_${cardId}_${stageNumber}`;
}

/**
 * Cấu trúc dữ liệu Ma Trận Tích Chọn của Admin:
 * Key = `model.id` (VD: 'NODE_TREE', 'TEX_GRASS_POPPY', 'ENEMY_MELEE'...)
 * Value = Mảng các `stageKey` mà model đó được phép xuất hiện.
 */
export type AdminStageAssetMatrix = Record<string, string[]>;

const LOCAL_STORAGE_MATRIX_KEY = 'pe_v10_admin_stage_asset_matrix_v1';

export function createDefaultAdminStageAssetMatrix(): AdminStageAssetMatrix {
  const dungeonStageKeys = [
    'stage_delta_plains_1',
    'stage_delta_plains_2',
    'stage_delta_plains_3',
    'stage_delta_plains_4',
    'stage_delta_plains_5',
    'stage_delta_plains_6',
  ];
  const allMapKeys = [
    ...dungeonStageKeys,
    'map_kingdom_default',
    'map_manor_default',
  ];

  return {
    // 1. Ô đất / Texture mặc định
    TEX_GRASS_MEADOW: [...allMapKeys],
    TEX_GRASS_BUTTERCUP: [...allMapKeys],
    TEX_GRASS_LUSH: [...allMapKeys],
    TEX_GRASS_POPPY: [...allMapKeys],
    TEX_GRASS_PEBBLE: [...allMapKeys],
    TEX_GRASS_BLUEBELL: [...allMapKeys],
    TEX_ROYAL_ROAD: ['map_kingdom_default', 'map_manor_default'],
    TEX_POND_BOULDER: ['map_manor_default'],
    TEX_RIVER_WATER: ['map_kingdom_default', 'map_manor_default'],

    // 2. Cây cối & Mỏ tài nguyên mặc định
    NODE_TREE: [...dungeonStageKeys, 'map_kingdom_default'],
    NODE_STONE_DEPOSIT: [...dungeonStageKeys, 'map_kingdom_default'],
    NODE_GOLD_VEIN: ['map_kingdom_default'],

    // 3. Bụi cỏ & Trang trí môi trường (Mặc định bật Hàng rào & Luống hoa ở một số ải cao hoặc do Admin tùy chỉnh)
    DEC_MANOR_FENCE: [],
    DEC_MANOR_GARDEN: [],
    DEC_MANOR_FOUNTAIN: [],
    DEC_MANOR_DEER: [],
    DEC_MANOR_STATUE: [],

    // 4. Công trình trang trí trong màn chơi
    BLD_WAREHOUSE: [],
    BLD_TOWN_HALL: [],
    BLD_FARM: [],
    BLD_BARRACKS: [],
    BLD_HERO_ALTAR: [],
    BLD_MANOR: [],

    // 5. Quân địch mặc định trong các màn chơi
    ENEMY_MELEE: [...dungeonStageKeys, 'map_kingdom_default'],
    ENEMY_RANGED: [...dungeonStageKeys, 'map_kingdom_default'],
    ENEMY_MAGE: [...dungeonStageKeys, 'map_kingdom_default'],
  };
}

let activeAdminStageAssetMatrix: AdminStageAssetMatrix = (() => {
  const defaults = createDefaultAdminStageAssetMatrix();
  if (typeof window === 'undefined') return defaults;
  try {
    const raw = window.localStorage.getItem(LOCAL_STORAGE_MATRIX_KEY);
    if (!raw) return defaults;
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (!parsed || typeof parsed !== 'object') return defaults;
    const merged: AdminStageAssetMatrix = { ...defaults };
    Object.keys(defaults).forEach((modelId) => {
      const val = parsed[modelId];
      if (Array.isArray(val)) {
        merged[modelId] = val.filter((x): x is string => typeof x === 'string');
      }
    });
    return merged;
  } catch {
    return defaults;
  }
})();

const matrixListeners = new Set<(matrix: AdminStageAssetMatrix) => void>();

export function getActiveAdminStageAssetMatrix(): AdminStageAssetMatrix {
  return activeAdminStageAssetMatrix;
}

export function setActiveAdminStageAssetMatrix(
  nextMatrix: AdminStageAssetMatrix,
  persistLocal = true
): void {
  const defaults = createDefaultAdminStageAssetMatrix();
  const normalized: AdminStageAssetMatrix = { ...defaults };
  Object.keys(defaults).forEach((modelId) => {
    const arr = nextMatrix[modelId];
    if (Array.isArray(arr)) {
      normalized[modelId] = Array.from(
        new Set(arr.filter((s): s is string => typeof s === 'string'))
      );
    }
  });
  activeAdminStageAssetMatrix = normalized;

  if (persistLocal && typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(
        LOCAL_STORAGE_MATRIX_KEY,
        JSON.stringify(normalized)
      );
    } catch {
      // Ignore storage quota errors
    }
  }

  matrixListeners.forEach((cb) => cb(activeAdminStageAssetMatrix));
}

export function subscribeToLocalStageAssetMatrix(
  callback: (matrix: AdminStageAssetMatrix) => void
): () => void {
  matrixListeners.add(callback);
  return () => {
    matrixListeners.delete(callback);
  };
}

export function isModelEnabledForStageKey(
  modelId: string,
  stageKey: string,
  matrix: AdminStageAssetMatrix = activeAdminStageAssetMatrix
): boolean {
  const list = matrix[modelId];
  if (!Array.isArray(list)) return false;
  return list.includes(stageKey);
}

/**
 * Trả về danh sách các seed cỏ (0..5) được Admin tích chọn cho stageKey.
 * Có Fallback an toàn: Nếu Admin bỏ tích toàn bộ ô cỏ, trả về [5] (Cỏ non cơ bản) để map luôn hiển thị đẹp.
 */
export function getAllowedGrassSeedsForStageKey(
  stageKey: string,
  matrix: AdminStageAssetMatrix = activeAdminStageAssetMatrix
): number[] {
  const seedMap: Array<{ id: GroundTextureVariantId; seed: number }> = [
    { id: 'TEX_GRASS_BUTTERCUP', seed: 0 },
    { id: 'TEX_GRASS_LUSH', seed: 1 },
    { id: 'TEX_GRASS_POPPY', seed: 2 },
    { id: 'TEX_GRASS_PEBBLE', seed: 3 },
    { id: 'TEX_GRASS_BLUEBELL', seed: 4 },
    { id: 'TEX_GRASS_MEADOW', seed: 5 },
  ];
  const allowed = seedMap
    .filter((item) => isModelEnabledForStageKey(item.id, stageKey, matrix))
    .map((item) => item.seed);

  return allowed.length > 0 ? allowed : [5];
}

// ============================================================================
// HÀM DỰNG THỰC THỂ TRƯNG BÀY TRÊN BẢN ĐỒ SHOWROOM 30x30
// ============================================================================

export function buildShowroom30x30Entities(tileSize: number): {
  resourceNodes: ResourceNode[];
  manorObjects: PlacedManorObject[];
  buildings: PlacedBuilding[];
  enemies: EnemyUnit[];
  villagers: VillagerUnit[];
  tileToModelMap: Map<string, ShowroomModelItem>;
} {
  const resourceNodes: ResourceNode[] = [];
  const manorObjects: PlacedManorObject[] = [];
  const buildings: PlacedBuilding[] = [];
  const enemies: EnemyUnit[] = [];
  const villagers: VillagerUnit[] = [];
  const tileToModelMap = new Map<string, ShowroomModelItem>();

  SHOWROOM_MODELS_CATALOG.forEach((item) => {
    tileToModelMap.set(`${item.gridX},${item.gridY}`, item);
    const centerX = item.gridX * tileSize + tileSize / 2;
    const centerY = item.gridY * tileSize + tileSize / 2;

    if (item.resourceNodeType) {
      resourceNodes.push({
        id: `sr-node-${item.id}`,
        type: item.resourceNodeType,
        gridX: item.gridX,
        gridY: item.gridY,
        amount: 100,
      });
    } else if (item.manorCustomIcon) {
      manorObjects.push({
        id: `sr-manor-${item.id}`,
        itemId: item.id,
        name: item.nameVi,
        vietnameseSub: item.subLabelVi,
        rarity:
          item.manorCustomIcon === 'MANOR_STATUE'
            ? 'GOLD'
            : item.manorCustomIcon === 'MANOR_DEER'
              ? 'PURPLE'
              : item.manorCustomIcon === 'MANOR_FOUNTAIN'
                ? 'BLUE'
                : item.manorCustomIcon === 'MANOR_GARDEN'
                  ? 'GREEN'
                  : 'WHITE',
        manorCategory: 'DECORATION',
        customIcon: item.manorCustomIcon,
        gridX: item.gridX,
        gridY: item.gridY,
        placedAt: 0,
      });
    } else if (item.buildingType) {
      buildings.push({
        id: `sr-bld-${item.id}`,
        type: item.buildingType,
        gridX: item.gridX,
        gridY: item.gridY,
        level: 1,
        buildProgress: 100,
        isConstructed: true,
        lastProducedAt: 0,
      });
    } else if (item.enemyKind) {
      enemies.push({
        id: `sr-enemy-${item.id}`,
        kind: item.enemyKind,
        level: 1,
        expReward: 15,
        name: item.nameVi,
        x: centerX,
        y: centerY,
        guardX: centerX,
        guardY: centerY,
        aiMode: 'PASSIVE_DETECT',
        detectRange: 0,
        facing: 'RIGHT',
        hp: 120,
        maxHp: 120,
        reg: 2,
        atk: 15,
        mag: 10,
        def: 20,
        mar: 20,
        ats: 1,
        crt: 10,
        eva: 5,
        crd: 150,
        spd: 95,
        ran: item.enemyKind === 'MELEE' ? 38 : 195,
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
        pow: 230,
        statusEffects: [],
        attackRange: item.enemyKind === 'MELEE' ? 38 : 195,
        speed: 0,
        attackCooldown: 0,
        windup: 0,
        hitFlash: 0,
        knockbackX: 0,
        knockbackY: 0,
      });
    } else if (item.allyPreviewKind && item.allyPreviewKind !== 'KING_LORD') {
      const role: VillagerUnit['role'] =
        item.allyPreviewKind === 'HERO_FAREL'
          ? 'HERO'
          : item.allyPreviewKind === 'PEASANT'
            ? 'PEASANT'
            : 'SOLDIER';
      const combatClass: 'MELEE' | 'RANGED' =
        item.allyPreviewKind === 'SOLDIER_RANGED' ? 'RANGED' : 'MELEE';

      villagers.push({
        id: `sr-ally-${item.id}`,
        role,
        troopCategory: role === 'HERO' ? 'HERO' : 'SOLDIER',
        heroArchetypeId: role === 'HERO' ? 'KING' : undefined,
        unitName: role === 'HERO' ? 'Farel' : item.nameVi,
        nickname: item.nameVi,
        combatClass,
        tier: 1,
        level: 1,
        x: centerX,
        y: centerY,
        targetX: centerX,
        targetY: centerY,
        facing: 'RIGHT',
        color: '#38bdf8',
        hp: 150,
        maxHp: 150,
        reg: 3,
        atk: 20,
        mag: 15,
        def: 25,
        mar: 20,
        ats: 1,
        crt: 10,
        eva: 5,
        crd: 150,
        spd: 100,
        ran: combatClass === 'RANGED' ? 205 : 40,
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
        pow: 280,
        statusEffects: [],
        attackRange: combatClass === 'RANGED' ? 205 : 40,
        attackCooldown: 0,
        windup: 0,
        hitFlash: 0,
        knockbackX: 0,
        knockbackY: 0,
      });
    }
  });

  return {
    resourceNodes,
    manorObjects,
    buildings,
    enemies,
    villagers,
    tileToModelMap,
  };
}
