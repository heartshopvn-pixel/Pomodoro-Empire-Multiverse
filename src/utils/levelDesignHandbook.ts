import {
  BuildingType,
  EnemyArchetypeId,
  WeatherType,
} from '../types/game';

/**
 * ============================================================================
 * SỔ TAY THIẾT KẾ MÀN CHƠI (LEVEL DESIGN HANDBOOK)
 * ============================================================================
 * File tập hợp toàn bộ quy tắc khai báo để "Module Tự Động Hóa Tạo & Vẽ Map"
 * đọc và tự động sinh bản đồ mới mỗi lần khởi tạo / truy cập.
 *
 * Lưu ý phạm vi:
 * - Module này KHÔNG liên quan đến Bản Đồ Thế Giới 50x50 (World Map luôn cố định
 *   theo seed đồng bộ giữa mọi người chơi Online).
 * - Thứ tự quy tắc chuẩn trong Sổ Tay:
 *   1. QUY TẮC MAP VƯƠNG QUỐC (KINGDOM MAP)
 *   2. QUY TẮC MAP TRANG VIÊN (MANOR MAP)
 *   3. QUY TẮC MAP MÀN CHƠI / PHÓ BẢN (STAGE MAP)
 * ============================================================================
 */

// ============================================================================
// PHẦN 1: QUY TẮC THIẾT KẾ MAP VƯƠNG QUỐC (KINGDOM MAP)
// ============================================================================

export interface KingdomWaterClusterRule {
  id: string;
  description: string;
  gxRange: [number, number];
  gyRange: [number, number];
  minWidth: number;
  maxWidth: number;
  minHeight: number;
  maxHeight: number;
  organicCornerTrimChance: number;
}

export interface KingdomRoadGenerationRule {
  horizontalRoad: {
    gyCandidates: number[];
    minStartX: number;
    maxStartX: number;
    minEndX: number;
    maxEndX: number;
  };
  verticalRoad: {
    gxCandidates: number[];
    minStartY: number;
    maxStartY: number;
    minEndY: number;
    maxEndY: number;
  };
  secondarySpurChance: number;
}

export interface KingdomResourceSpawnRule {
  type: 'TREE' | 'STONE_DEPOSIT' | 'GOLD_VEIN';
  count: number;
  amountPerNode: number;
  minDistFromWarehouse: number;
}

export interface KingdomMapHandbookRules {
  mapType: 'KINGDOM_MAP';
  titleVi: string;
  perspective: {
    projection: 'ISOMETRIC_2_5D_DIAMOND_2_TO_1';
    dioramaSlabHeightPx: number;
    cameraZoomRange: [number, number];
  };
  grid: {
    cols: number;
    rows: number;
    tileSizePx: number;
  };
  fogOfWar: {
    enabled: boolean;
    states: {
      UNEXPLORED: 0;
      EXPLORED: 1;
      VISIBLE: 2;
    };
    buildingSightRadiusTiles: number;
    unitSightRadiusTiles: number;
  };
  defaultWeather: WeatherType;
  initialCenterBuilding: {
    type: BuildingType;
    gridX: number;
    gridY: number;
    level: number;
    safeClearanceRadiusTiles: number;
  };
  buildingPlacementLimits: {
    unlimitedTypes: BuildingType[];
    singleInstanceTypes: BuildingType[];
    forbidOnWater: boolean;
    forbidOnRoad: boolean;
    forbidOnResourceNodes: boolean;
    forbidOnExistingBuildings: boolean;
  };
  terrainGeneration: {
    randomizeOnEveryCreateOrEnter: boolean;
    waterClusters: KingdomWaterClusterRule[];
    roadGeneration: KingdomRoadGenerationRule;
    resourceSpawns: KingdomResourceSpawnRule[];
  };
}

export const KINGDOM_MAP_HANDBOOK_RULES: KingdomMapHandbookRules = {
  mapType: 'KINGDOM_MAP',
  titleVi: '1. Quy Tắc Tạo & Vẽ Map Vương Quốc (Kingdom Map)',
  perspective: {
    projection: 'ISOMETRIC_2_5D_DIAMOND_2_TO_1',
    dioramaSlabHeightPx: 22,
    cameraZoomRange: [0.55, 2.2],
  },
  grid: {
    cols: 30,
    rows: 18,
    tileSizePx: 64,
  },
  fogOfWar: {
    enabled: true,
    states: {
      UNEXPLORED: 0,
      EXPLORED: 1,
      VISIBLE: 2,
    },
    buildingSightRadiusTiles: 4,
    unitSightRadiusTiles: 3.5,
  },
  defaultWeather: 'CLEAR',
  initialCenterBuilding: {
    type: 'WAREHOUSE',
    gridX: 11,
    gridY: 7,
    level: 1,
    safeClearanceRadiusTiles: 2,
  },
  buildingPlacementLimits: {
    unlimitedTypes: ['TOWN_HALL', 'FARM'],
    singleInstanceTypes: ['WAREHOUSE', 'BARRACKS', 'HERO_ALTAR', 'MANOR'],
    forbidOnWater: true,
    forbidOnRoad: true,
    forbidOnResourceNodes: true,
    forbidOnExistingBuildings: true,
  },
  terrainGeneration: {
    randomizeOnEveryCreateOrEnter: true,
    waterClusters: [
      {
        id: 'northwest_lake',
        description: 'Ao nước góc Tây Bắc bản đồ Vương Quốc',
        gxRange: [0, 4],
        gyRange: [0, 3],
        minWidth: 2,
        maxWidth: 4,
        minHeight: 2,
        maxHeight: 3,
        organicCornerTrimChance: 0.45,
      },
      {
        id: 'southeast_bay',
        description: 'Vịnh nước lớn góc Đông Nam bản đồ Vương Quốc',
        gxRange: [23, 29],
        gyRange: [11, 17],
        minWidth: 4,
        maxWidth: 6,
        minHeight: 5,
        maxHeight: 7,
        organicCornerTrimChance: 0.5,
      },
      {
        id: 'southern_river_bank',
        description: 'Dải sông bờ Nam bản đồ Vương Quốc',
        gxRange: [6, 18],
        gyRange: [16, 17],
        minWidth: 6,
        maxWidth: 10,
        minHeight: 1,
        maxHeight: 2,
        organicCornerTrimChance: 0.35,
      },
    ],
    roadGeneration: {
      horizontalRoad: {
        gyCandidates: [6, 7, 8],
        minStartX: 3,
        maxStartX: 6,
        minEndX: 19,
        maxEndX: 23,
      },
      verticalRoad: {
        gxCandidates: [11, 12, 13],
        minStartY: 2,
        maxStartY: 4,
        minEndY: 12,
        maxEndY: 14,
      },
      secondarySpurChance: 0.65,
    },
    resourceSpawns: [
      {
        type: 'TREE',
        count: 8,
        amountPerNode: 80,
        minDistFromWarehouse: 3,
      },
      {
        type: 'STONE_DEPOSIT',
        count: 3,
        amountPerNode: 100,
        minDistFromWarehouse: 3,
      },
      {
        type: 'GOLD_VEIN',
        count: 3,
        amountPerNode: 120,
        minDistFromWarehouse: 3,
      },
    ],
  },
};

// ============================================================================
// PHẦN 2: QUY TẮC THIẾT KẾ MAP TRANG VIÊN (MANOR MAP)
// ============================================================================

export interface ManorMapHandbookRules {
  mapType: 'MANOR_MAP';
  titleVi: string;
  virtualKingdomArchitecture: {
    sharesGridAndEngineWithKingdom: boolean;
    sharesTopBarWithKingdom: boolean;
    requireZeroEnemiesToEnter: boolean;
    fogOfWarEnabled: boolean;
    spawnWildResourceNodes: boolean;
    hideCombatUnitsAndManorBuilding: boolean;
    lockTacticalAndKingdomBottomBarButtons: boolean;
  };
  grid: {
    cols: number;
    rows: number;
    tileSizePx: number;
  };
  terrainGeneration: {
    randomizeOnEveryEnter: boolean;
    centralPond: {
      centerGxRange: [number, number];
      centerGyRange: [number, number];
      minWidth: number;
      maxWidth: number;
      minHeight: number;
      maxHeight: number;
      trimCornersForOrganicShape: boolean;
      stoneBoulderRingWidthTiles: number;
    };
    gardenCobblestonePaths: {
      horizontalGyRange: [number, number];
      horizontalGxSpan: [number, number];
      verticalGxRange: [number, number];
      verticalGySpan: [number, number];
    };
    placementRules: {
      forbidOnPondWater: boolean;
      forbidOnStoneBoulderRing: boolean;
      forbidOnOtherManorObjects: boolean;
    };
  };
}

export const MANOR_MAP_HANDBOOK_RULES: ManorMapHandbookRules = {
  mapType: 'MANOR_MAP',
  titleVi: '2. Quy Tắc Tạo & Vẽ Map Trang Viên (Manor Map - Vương Quốc Ảo)',
  virtualKingdomArchitecture: {
    sharesGridAndEngineWithKingdom: true,
    sharesTopBarWithKingdom: true,
    requireZeroEnemiesToEnter: true,
    fogOfWarEnabled: false, // Mở sáng 100%, không có Fog of War
    spawnWildResourceNodes: false, // Không sinh cây rừng, mỏ đá, mỏ vàng hoang dã
    hideCombatUnitsAndManorBuilding: true, // Ẩn toàn bộ binh lính, nông dân, anh hùng, kẻ địch và chính tòa Trang Viên
    lockTacticalAndKingdomBottomBarButtons: true, // Khóa cụm 1-5, D, F, H và 6 nút Thư tín/Kho đồ/Cửa hàng/Doanh trại/Trang bị/Nghiên cứu
  },
  grid: {
    cols: 30,
    rows: 18,
    tileSizePx: 64,
  },
  terrainGeneration: {
    randomizeOnEveryEnter: true,
    centralPond: {
      centerGxRange: [13, 16],
      centerGyRange: [7, 9],
      minWidth: 5,
      maxWidth: 6,
      minHeight: 3,
      maxHeight: 4,
      trimCornersForOrganicShape: true,
      stoneBoulderRingWidthTiles: 1, // Vành đai đá tảng & rêu xanh bao quanh 1 vòng sát mặt hồ
    },
    gardenCobblestonePaths: {
      horizontalGyRange: [6, 8],
      horizontalGxSpan: [3, 10],
      verticalGxRange: [6, 9],
      verticalGySpan: [3, 13],
    },
    placementRules: {
      forbidOnPondWater: true,
      forbidOnStoneBoulderRing: true,
      forbidOnOtherManorObjects: true,
    },
  },
};

// ============================================================================
// PHẦN 3: QUY TẮC THIẾT KẾ MAP MÀN CHƠI / PHÓ BẢN (STAGE MAP)
// ============================================================================

export type StageGameMode =
  | 'DUNGEON'
  | 'WORLD_ENEMY_CAMP'
  | 'WORLD_PVP_KINGDOM';

export type StageMapStyle = 'PLAINS_GRASS';

export type StageEnemyAIBehavior = 'PASSIVE_DETECT';

export type StageVictoryCondition =
  | 'KILL_ALL_ENEMIES'
  | 'KILL_ALL_ENEMIES_AND_STRUCTURES';

export interface StageSpecialEnemyStructureRule {
  campBuildingCount: number;
  watchtowerCount: number;
  centerGx: number;
  centerGy: number;
  defensiveRingRadiusTiles: number;
  immuneToDebuffs: boolean;
}

export interface StageDesignRule {
  mode: StageGameMode;
  dungeonId: string;
  dungeonTitle: string;
  stageNumber: number;
  stageTitle: string;
  mapStyle: StageMapStyle;
  weather: WeatherType;
  clearExistingBuildings: boolean;
  clearExistingUnits: boolean;
  allowReplayCompletedStage?: boolean; // false = Chế độ Phó Bản khi hoàn thành màn chơi không thể chơi lại màn đó
  allyMarchInFromOutsideBottomLeft?: boolean;
  worldMapMarchRule?: {
    secondsPerTile: number; // 3 giây di chuyển / 1 ô trên Bản Đồ Thế Giới
    maxActiveSquadsPerKingdom: number; // Mỗi Vương Quốc chỉ được xuất 1 đội quân
    lockTargetAgainstOtherPlayers: boolean; // Khóa mục tiêu khi đã có lệnh tấn công
    barracksDispatchedLabelVi: string; // "Đã rời vương quốc" (tối màu thẻ đơn vị trong Doanh Trại)
    respawnCampAtRandomLocationOnVictory: boolean; // Khi diệt xong trại, trại cũ biến mất và tạo lại 1 trại mới ở vị trí ngẫu nhiên khác
  };
  requiredItemCost?: {
    itemId: string;
    itemName: string;
    quantity: number;
  };
  allySpawnZone: {
    minGx: number;
    maxGx: number;
    minGy: number;
    maxGy: number;
  };
  emptySafeZone: {
    maxGx: number;
    minGy: number;
  };
  centerCampSafeZone?: {
    minGx: number;
    maxGx: number;
    minGy: number;
    maxGy: number;
  };
  resourceGeneration: {
    treeCountRange: [number, number];
    stoneCountRange: [number, number];
    goldCountRange: [number, number];
  };
  enemyGeneration: {
    allowedArchetypes: EnemyArchetypeId[];
    totalCount: number;
    level: number;
    aiBehavior: StageEnemyAIBehavior;
    detectRangePx: number;
    specialStructures?: StageSpecialEnemyStructureRule;
  };
  victoryCondition: StageVictoryCondition;
  victoryAutoLootDelayMs: number;
}

export interface StageGeneralHandbookRules {
  mapType: 'STAGE_MAP';
  titleVi: string;
  virtualKingdomLifecycle: {
    cloneSourceKingdomData: boolean;
    clearAllPlacedBuildings: boolean;
    spawnOnlyDispatchedUnits: boolean;
    fullVisibilityNoFog: boolean;
    enableTemporaryLootBagTopLeft: boolean;
    showStageInfoCardTopRight: boolean;
    lockKingdomBottomBarAndWorldMapButton: boolean;
    allowRetreatButtonImmediateDefeat: boolean;
    onVictory: {
      autoCollectGroundDropsAfterSeconds: number;
      mergeTempLootBagIntoVirtualKingdom: boolean;
      commitVirtualKingdomBackToSourceKingdom: boolean;
      unlockNextStageInCard: boolean;
      lockCompletedDungeonStageFromReplay: boolean;
      relocateDefeatedWorldEnemyCampToRandomTile: boolean;
      destroyVirtualKingdomAfterCommit: boolean;
    };
    onDefeatOrRetreat: {
      sendDispatchedUnitsToRecuperationCamp: boolean;
      syncPassiveHomeResourcesEarnedDuringBattle: boolean;
      discardTempLootBagAndDestroyVirtualKingdom: boolean;
    };
  };
}

export const STAGE_GENERAL_HANDBOOK_RULES: StageGeneralHandbookRules = {
  mapType: 'STAGE_MAP',
  titleVi: '3. Quy Tắc Tạo & Vẽ Map Màn Chơi / Phó Bản (Stage Map)',
  virtualKingdomLifecycle: {
    cloneSourceKingdomData: true,
    clearAllPlacedBuildings: true,
    spawnOnlyDispatchedUnits: true,
    fullVisibilityNoFog: true,
    enableTemporaryLootBagTopLeft: true,
    showStageInfoCardTopRight: true,
    lockKingdomBottomBarAndWorldMapButton: true,
    allowRetreatButtonImmediateDefeat: true,
    onVictory: {
      autoCollectGroundDropsAfterSeconds: 3,
      mergeTempLootBagIntoVirtualKingdom: true,
      commitVirtualKingdomBackToSourceKingdom: true,
      unlockNextStageInCard: true,
      lockCompletedDungeonStageFromReplay: true,
      relocateDefeatedWorldEnemyCampToRandomTile: true,
      destroyVirtualKingdomAfterCommit: true,
    },
    onDefeatOrRetreat: {
      sendDispatchedUnitsToRecuperationCamp: true,
      syncPassiveHomeResourcesEarnedDuringBattle: true,
      discardTempLootBagAndDestroyVirtualKingdom: true,
    },
  },
};

function buildWorldEnemyCampHandbookRules(): Record<number, StageDesignRule> {
  const troopCounts = [4, 6, 8, 10, 12, 14, 16, 18, 20, 22];
  const result: Record<number, StageDesignRule> = {};
  for (let lvl = 1; lvl <= 10; lvl++) {
    const watchtowerCount = lvl <= 3 ? 1 : lvl <= 6 ? 2 : lvl <= 9 ? 3 : 4;
    result[lvl] = {
      mode: 'WORLD_ENEMY_CAMP',
      dungeonId: 'world_enemy_camp',
      dungeonTitle: 'Trại Quân Địch (Bản Đồ Thế Giới)',
      stageNumber: lvl,
      stageTitle: `Trại Quân Địch Lv.${lvl}`,
      mapStyle: 'PLAINS_GRASS',
      weather: 'LIGHT_WIND',
      clearExistingBuildings: true,
      clearExistingUnits: true,
      allyMarchInFromOutsideBottomLeft: true,
      worldMapMarchRule: {
        secondsPerTile: 3,
        maxActiveSquadsPerKingdom: 1,
        lockTargetAgainstOtherPlayers: true,
        barracksDispatchedLabelVi: 'Đã rời vương quốc',
        respawnCampAtRandomLocationOnVictory: true,
      },
      requiredItemCost: {
        itemId: 'item-march-order',
        itemName: 'Lệnh Hành Quân',
        quantity: 1,
      },
      allySpawnZone: {
        minGx: 2,
        maxGx: 6,
        minGy: 13,
        maxGy: 16,
      },
      emptySafeZone: {
        maxGx: 8,
        minGy: 10,
      },
      centerCampSafeZone: {
        minGx: 11,
        maxGx: 18,
        minGy: 5,
        maxGy: 12,
      },
      resourceGeneration: {
        treeCountRange: [14, 18],
        stoneCountRange: [6, 9],
        goldCountRange: [0, 0],
      },
      enemyGeneration: {
        allowedArchetypes: ['ENEMY_MELEE', 'ENEMY_RANGED', 'ENEMY_MAGE'],
        totalCount: troopCounts[lvl - 1] || 4 + (lvl - 1) * 2,
        level: lvl,
        aiBehavior: 'PASSIVE_DETECT',
        detectRangePx: 250 + Math.min(30, (lvl - 1) * 3),
        specialStructures: {
          campBuildingCount: 1,
          watchtowerCount,
          centerGx: 14.5,
          centerGy: 8.5,
          defensiveRingRadiusTiles: 3.2,
          immuneToDebuffs: true,
        },
      },
      victoryCondition: 'KILL_ALL_ENEMIES_AND_STRUCTURES',
      victoryAutoLootDelayMs: 3000,
    };
  }
  return result;
}

/**
 * SỔ TAY THIẾT KẾ MÀN CHƠI CHI TIẾT CHO TỪNG CHẾ ĐỘ & TỪNG ẢI
 * 1. Chế độ Phó Bản (DUNGEON) -> Thẻ 1: "Đồng Bằng Châu Thổ" (delta_plains) -> Ải 1..6
 * 2. Chế độ Tấn Công Trại Quân Địch Trên Bản Đồ Thế Giới (WORLD_ENEMY_CAMP) -> Trại Địch Lv.1..Lv.10
 */
export const STAGE_DESIGN_HANDBOOK: Record<string, Record<number, StageDesignRule>> = {
  delta_plains: {
    1: {
      mode: 'DUNGEON',
      dungeonId: 'delta_plains',
      dungeonTitle: 'Đồng Bằng Châu Thổ',
      stageNumber: 1,
      stageTitle: 'Ải 1 - Đồng Bằng Châu Thổ',
      mapStyle: 'PLAINS_GRASS',
      weather: 'LIGHT_WIND',
      clearExistingBuildings: true,
      clearExistingUnits: true,
      allyMarchInFromOutsideBottomLeft: true,
      allySpawnZone: {
        minGx: 2,
        maxGx: 6,
        minGy: 13,
        maxGy: 16,
      },
      emptySafeZone: {
        maxGx: 8,
        minGy: 10,
      },
      resourceGeneration: {
        treeCountRange: [14, 18],
        stoneCountRange: [6, 8],
        goldCountRange: [0, 0],
      },
      enemyGeneration: {
        allowedArchetypes: ['ENEMY_MELEE', 'ENEMY_RANGED', 'ENEMY_MAGE'],
        totalCount: 3,
        level: 1,
        aiBehavior: 'PASSIVE_DETECT',
        detectRangePx: 250,
      },
      victoryCondition: 'KILL_ALL_ENEMIES',
      victoryAutoLootDelayMs: 3000,
    },
    2: {
      mode: 'DUNGEON',
      dungeonId: 'delta_plains',
      dungeonTitle: 'Đồng Bằng Châu Thổ',
      stageNumber: 2,
      stageTitle: 'Ải 2 - Đồng Bằng Châu Thổ',
      mapStyle: 'PLAINS_GRASS',
      weather: 'LIGHT_WIND',
      clearExistingBuildings: true,
      clearExistingUnits: true,
      allyMarchInFromOutsideBottomLeft: true,
      allySpawnZone: {
        minGx: 2,
        maxGx: 6,
        minGy: 13,
        maxGy: 16,
      },
      emptySafeZone: {
        maxGx: 8,
        minGy: 10,
      },
      resourceGeneration: {
        treeCountRange: [14, 18],
        stoneCountRange: [6, 8],
        goldCountRange: [0, 0],
      },
      enemyGeneration: {
        allowedArchetypes: ['ENEMY_MELEE', 'ENEMY_RANGED', 'ENEMY_MAGE'],
        totalCount: 5,
        level: 2,
        aiBehavior: 'PASSIVE_DETECT',
        detectRangePx: 250,
      },
      victoryCondition: 'KILL_ALL_ENEMIES',
      victoryAutoLootDelayMs: 3000,
    },
    3: {
      mode: 'DUNGEON',
      dungeonId: 'delta_plains',
      dungeonTitle: 'Đồng Bằng Châu Thổ',
      stageNumber: 3,
      stageTitle: 'Ải 3 - Đồng Bằng Châu Thổ',
      mapStyle: 'PLAINS_GRASS',
      weather: 'LIGHT_WIND',
      clearExistingBuildings: true,
      clearExistingUnits: true,
      allyMarchInFromOutsideBottomLeft: true,
      allySpawnZone: {
        minGx: 2,
        maxGx: 6,
        minGy: 13,
        maxGy: 16,
      },
      emptySafeZone: {
        maxGx: 8,
        minGy: 10,
      },
      resourceGeneration: {
        treeCountRange: [15, 19],
        stoneCountRange: [6, 9],
        goldCountRange: [0, 0],
      },
      enemyGeneration: {
        allowedArchetypes: ['ENEMY_MELEE', 'ENEMY_RANGED', 'ENEMY_MAGE'],
        totalCount: 7,
        level: 3,
        aiBehavior: 'PASSIVE_DETECT',
        detectRangePx: 260,
      },
      victoryCondition: 'KILL_ALL_ENEMIES',
      victoryAutoLootDelayMs: 3000,
    },
    4: {
      mode: 'DUNGEON',
      dungeonId: 'delta_plains',
      dungeonTitle: 'Đồng Bằng Châu Thổ',
      stageNumber: 4,
      stageTitle: 'Ải 4 - Đồng Bằng Châu Thổ',
      mapStyle: 'PLAINS_GRASS',
      weather: 'LIGHT_WIND',
      clearExistingBuildings: true,
      clearExistingUnits: true,
      allyMarchInFromOutsideBottomLeft: true,
      allySpawnZone: {
        minGx: 2,
        maxGx: 6,
        minGy: 13,
        maxGy: 16,
      },
      emptySafeZone: {
        maxGx: 8,
        minGy: 10,
      },
      resourceGeneration: {
        treeCountRange: [15, 19],
        stoneCountRange: [7, 9],
        goldCountRange: [0, 0],
      },
      enemyGeneration: {
        allowedArchetypes: ['ENEMY_MELEE', 'ENEMY_RANGED', 'ENEMY_MAGE'],
        totalCount: 9,
        level: 4,
        aiBehavior: 'PASSIVE_DETECT',
        detectRangePx: 260,
      },
      victoryCondition: 'KILL_ALL_ENEMIES',
      victoryAutoLootDelayMs: 3000,
    },
    5: {
      mode: 'DUNGEON',
      dungeonId: 'delta_plains',
      dungeonTitle: 'Đồng Bằng Châu Thổ',
      stageNumber: 5,
      stageTitle: 'Ải 5 - Đồng Bằng Châu Thổ',
      mapStyle: 'PLAINS_GRASS',
      weather: 'LIGHT_WIND',
      clearExistingBuildings: true,
      clearExistingUnits: true,
      allyMarchInFromOutsideBottomLeft: true,
      allySpawnZone: {
        minGx: 2,
        maxGx: 6,
        minGy: 13,
        maxGy: 16,
      },
      emptySafeZone: {
        maxGx: 8,
        minGy: 10,
      },
      resourceGeneration: {
        treeCountRange: [16, 20],
        stoneCountRange: [7, 10],
        goldCountRange: [0, 0],
      },
      enemyGeneration: {
        allowedArchetypes: ['ENEMY_MELEE', 'ENEMY_RANGED', 'ENEMY_MAGE'],
        totalCount: 12,
        level: 5,
        aiBehavior: 'PASSIVE_DETECT',
        detectRangePx: 270,
      },
      victoryCondition: 'KILL_ALL_ENEMIES',
      victoryAutoLootDelayMs: 3000,
    },
    6: {
      mode: 'DUNGEON',
      dungeonId: 'delta_plains',
      dungeonTitle: 'Đồng Bằng Châu Thổ',
      stageNumber: 6,
      stageTitle: 'Ải 6 - Đồng Bằng Châu Thổ',
      mapStyle: 'PLAINS_GRASS',
      weather: 'LIGHT_WIND',
      clearExistingBuildings: true,
      clearExistingUnits: true,
      allyMarchInFromOutsideBottomLeft: true,
      allySpawnZone: {
        minGx: 2,
        maxGx: 6,
        minGy: 13,
        maxGy: 16,
      },
      emptySafeZone: {
        maxGx: 8,
        minGy: 10,
      },
      resourceGeneration: {
        treeCountRange: [16, 20],
        stoneCountRange: [8, 10],
        goldCountRange: [0, 0],
      },
      enemyGeneration: {
        allowedArchetypes: ['ENEMY_MELEE', 'ENEMY_RANGED', 'ENEMY_MAGE'],
        totalCount: 15,
        level: 6,
        aiBehavior: 'PASSIVE_DETECT',
        detectRangePx: 270,
      },
      victoryCondition: 'KILL_ALL_ENEMIES',
      victoryAutoLootDelayMs: 3000,
    },
  },
  world_enemy_camp: buildWorldEnemyCampHandbookRules(),
  world_pvp_kingdom: buildWorldPvPKingdomHandbookRules(),
};

function buildWorldPvPKingdomHandbookRules(): Record<number, StageDesignRule> {
  const result: Record<number, StageDesignRule> = {};
  for (let lvl = 1; lvl <= 50; lvl++) {
    result[lvl] = {
      mode: 'WORLD_PVP_KINGDOM',
      dungeonId: 'world_pvp_kingdom',
      dungeonTitle: 'Vương Quốc vs Vương Quốc (Bản Đồ Thế Giới)',
      stageNumber: lvl,
      stageTitle: `Công Thành Vương Quốc Lv.${lvl}`,
      mapStyle: 'PLAINS_GRASS',
      weather: 'CLEAR',
      clearExistingBuildings: false,
      clearExistingUnits: true,
      allyMarchInFromOutsideBottomLeft: true,
      worldMapMarchRule: {
        secondsPerTile: 3,
        maxActiveSquadsPerKingdom: 1,
        lockTargetAgainstOtherPlayers: true,
        barracksDispatchedLabelVi: 'Đã rời vương quốc',
        respawnCampAtRandomLocationOnVictory: false,
      },
      requiredItemCost: {
        itemId: 'item-march-order',
        itemName: 'Lệnh Hành Quân',
        quantity: 1,
      },
      allySpawnZone: {
        minGx: 2,
        maxGx: 6,
        minGy: 13,
        maxGy: 16,
      },
      emptySafeZone: {
        maxGx: 8,
        minGy: 10,
      },
      resourceGeneration: {
        treeCountRange: [12, 16],
        stoneCountRange: [6, 8],
        goldCountRange: [0, 0],
      },
      enemyGeneration: {
        allowedArchetypes: ['ENEMY_MELEE', 'ENEMY_RANGED', 'ENEMY_MAGE'],
        totalCount: 0,
        level: Math.min(10, Math.max(1, Math.ceil(lvl / 5))),
        aiBehavior: 'PASSIVE_DETECT',
        detectRangePx: 280,
      },
      victoryCondition: 'KILL_ALL_ENEMIES_AND_STRUCTURES',
      victoryAutoLootDelayMs: 1200,
    };
  }
  return result;
}

export function getStageDesignRule(
  dungeonId: string,
  stageNumber: number
): StageDesignRule | null {
  return STAGE_DESIGN_HANDBOOK[dungeonId]?.[stageNumber] || null;
}

/**
 * Toàn bộ Sổ Tay Thiết Kế Màn Chơi tập hợp theo đúng thứ tự:
 * 1. Map Vương Quốc (`kingdomMap`)
 * 2. Map Trang Viên (`manorMap`)
 * 3. Map Màn Chơi (`stageMap`)
 */
export const LEVEL_DESIGN_HANDBOOK = {
  kingdomMap: KINGDOM_MAP_HANDBOOK_RULES,
  manorMap: MANOR_MAP_HANDBOOK_RULES,
  stageMap: {
    generalRules: STAGE_GENERAL_HANDBOOK_RULES,
    dungeons: STAGE_DESIGN_HANDBOOK,
  },
} as const;
