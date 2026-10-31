import {
  AllyUnitArchetypeId,
  BuildingType,
  cloneUnitEquipmentLoadout,
  computeEnemyStatsForLevel,
  computeFinalStats,
  computeTowerStatsForLevel,
  CustomItemIconKind,
  defineKingdomItem,
  defineManorItem,
  EnemyUnit,
  EQUIPMENT_RARITY_META,
  EquipmentItem,
  EquipmentRarity,
  GemItem,
  generateRandomEquipmentItem,
  generateRandomUnitNickname,
  getHeroMaxExp,
  HERO_EXP_POTION_BLUEPRINTS,
  INITIAL_MANOR_INVENTORY_ITEMS,
  INITIAL_UNIT_TIERS,
  InventoryItem,
  isDefensiveTowerBuilding,
  KingdomSaveData,
  MANOR_ITEM_BLUEPRINTS,
  MYSTIC_IRON_ORE_BLUEPRINT,
  PlacedBuilding,
  PlacedManorObject,
  RESOURCE_CURRENCY_PACK_BLUEPRINTS,
  ResourceNode,
  Resources,
  STARTER_GEMS,
  STARTER_WHITE_EQUIPMENT,
  UNIT_SUMMON_CARD_BLUEPRINTS,
  UNIT_WIKI_DATABASE,
  UnitCombatStats,
  UnitEquipmentLoadout,
  VillagerUnit,
  WeatherType,
  WorldTilePublicSummary,
} from '../types/game';
import {
  GRID_COLS,
  GRID_ROWS,
  setActiveKingdomTerrainLayout,
  setActiveManorTerrainLayout,
  setActiveStageTerrainLayout,
  TILE_SIZE,
} from './pixelSprites';
import { isModelEnabledForStageKey } from './adminShowroomConfig';
import {
  KINGDOM_MAP_HANDBOOK_RULES,
  LEVEL_DESIGN_HANDBOOK,
  MANOR_MAP_HANDBOOK_RULES,
  STAGE_GENERAL_HANDBOOK_RULES,
} from './levelDesignHandbook';

export {
  KINGDOM_MAP_HANDBOOK_RULES,
  LEVEL_DESIGN_HANDBOOK,
  MANOR_MAP_HANDBOOK_RULES,
  STAGE_GENERAL_HANDBOOK_RULES,
};

// ============================================================================
// MODULE TỰ ĐỘNG HÓA TẠO & VẼ MAP + SỔ TAY THIẾT KẾ MÀN CHƠI
// ============================================================================
// Module này đọc trực tiếp các quy tắc khai báo trong "Sổ Tay Thiết Kế Màn Chơi"
// (file `src/utils/levelDesignHandbook.ts` & `SO_TAY_THIET_KE_MAN_CHOI.md`)
// kết hợp với Cấu Hình Ma Trận Model Showroom của Admin (`adminShowroomConfig.ts`)
// theo đúng thứ tự:
//   1. Map Vương Quốc (generateKingdomMapFromHandbook)
//   2. Map Trang Viên (generateManorMapFromHandbook)
//   3. Map Màn Chơi / Phó Bản (generateStageMapFromHandbook)
// Lưu ý: Không can thiệp vào Bản Đồ Thế Giới 50x50 (World Map luôn cố định).
// ============================================================================

function randomIntBetween(min: number, max: number): number {
  return min + Math.floor(Math.random() * (max - min + 1));
}

/**
 * 1. TỰ ĐỘNG TẠO & VẼ MAP VƯƠNG QUỐC THEO SỔ TAY (`KINGDOM_MAP_HANDBOOK_RULES`)
 *    VÀ CẤU HÌNH ADMIN SHOWROOM (`map_kingdom_default`):
 * - Mỗi lần tạo hoặc mở Vương Quốc, tự động sinh ngẫu nhiên cụm hồ/sông ở rìa bản đồ,
 *   trục đường đá cuội trung tâm, đổi seed thảm cỏ & hoa dại, và rải ngẫu nhiên các mỏ
 *   tài nguyên (8 Cây Gỗ, 3 Mỏ Đá, 3 Mỏ Vàng) tuân theo quy tắc Sổ Tay & tích chọn của Admin.
 * - Tự động tránh các công trình đã xây dựng (`existingBuildings`) và vùng đệm Nhà Kho.
 */
export function generateKingdomMapFromHandbook(
  existingBuildings: PlacedBuilding[] = []
): ResourceNode[] {
  const stageKey = 'map_kingdom_default';
  const rules = LEVEL_DESIGN_HANDBOOK.kingdomMap;
  const cols = rules.grid.cols;
  const rows = rules.grid.rows;
  const wh = rules.initialCenterBuilding;

  const buildingTileSet = new Set<string>();
  existingBuildings.forEach((b) => {
    buildingTileSet.add(`${b.gridX},${b.gridY}`);
  });
  buildingTileSet.add(`${wh.gridX},${wh.gridY}`);

  const isNearWarehouse = (gx: number, gy: number, radius: number) =>
    Math.abs(gx - wh.gridX) <= radius && Math.abs(gy - wh.gridY) <= radius;

  // B1: Sinh ngẫu nhiên các cụm nước (Ao Tây Bắc, Vịnh Đông Nam, Bờ Sông Nam) nếu Admin bật TEX_RIVER_WATER
  const waterTiles = new Set<string>();
  if (isModelEnabledForStageKey('TEX_RIVER_WATER', stageKey)) {
    rules.terrainGeneration.waterClusters.forEach((cluster) => {
      const w = randomIntBetween(cluster.minWidth, cluster.maxWidth);
      const h = randomIntBetween(cluster.minHeight, cluster.maxHeight);
      const maxStartX = Math.max(cluster.gxRange[0], cluster.gxRange[1] - w + 1);
      const maxStartY = Math.max(cluster.gyRange[0], cluster.gyRange[1] - h + 1);
      const startX = randomIntBetween(cluster.gxRange[0], maxStartX);
      const startY = randomIntBetween(cluster.gyRange[0], maxStartY);

      for (let gy = startY; gy < startY + h; gy++) {
        for (let gx = startX; gx < startX + w; gx++) {
          if (gx < 0 || gx >= cols || gy < 0 || gy >= rows) continue;
          if (buildingTileSet.has(`${gx},${gy}`) || isNearWarehouse(gx, gy, 2)) {
            continue;
          }
          const isCorner =
            (gx === startX || gx === startX + w - 1) &&
            (gy === startY || gy === startY + h - 1);
          if (isCorner && Math.random() < cluster.organicCornerTrimChance) {
            continue;
          }
          waterTiles.add(`${gx},${gy}`);
        }
      }
    });
  }

  // B2: Sinh ngẫu nhiên trục đường đá cuội ngang & dọc giao nhau gần Nhà Kho nếu Admin bật TEX_ROYAL_ROAD
  const roadTiles = new Set<string>();
  if (isModelEnabledForStageKey('TEX_ROYAL_ROAD', stageKey)) {
    const roadRule = rules.terrainGeneration.roadGeneration;
    const horizGy =
      roadRule.horizontalRoad.gyCandidates[
        Math.floor(Math.random() * roadRule.horizontalRoad.gyCandidates.length)
      ];
    const hStartX = randomIntBetween(
      roadRule.horizontalRoad.minStartX,
      roadRule.horizontalRoad.maxStartX
    );
    const hEndX = randomIntBetween(
      roadRule.horizontalRoad.minEndX,
      roadRule.horizontalRoad.maxEndX
    );

    for (let gx = hStartX; gx <= hEndX; gx++) {
      const key = `${gx},${horizGy}`;
      if (!waterTiles.has(key) && !buildingTileSet.has(key)) {
        roadTiles.add(key);
      }
    }

    const vertGx =
      roadRule.verticalRoad.gxCandidates[
        Math.floor(Math.random() * roadRule.verticalRoad.gxCandidates.length)
      ];
    const vStartY = randomIntBetween(
      roadRule.verticalRoad.minStartY,
      roadRule.verticalRoad.maxStartY
    );
    const vEndY = randomIntBetween(
      roadRule.verticalRoad.minEndY,
      roadRule.verticalRoad.maxEndY
    );

    for (let gy = vStartY; gy <= vEndY; gy++) {
      const key = `${vertGx},${gy}`;
      if (!waterTiles.has(key) && !buildingTileSet.has(key)) {
        roadTiles.add(key);
      }
    }

    // Nhánh đường phụ ngẫu nhiên tạo nét mới mẻ mỗi lần vẽ map
    if (Math.random() < roadRule.secondarySpurChance) {
      const spurX = randomIntBetween(6, 18);
      const spurStart = Math.min(horizGy, randomIntBetween(4, 11));
      const spurEnd = Math.max(horizGy, randomIntBetween(4, 11));
      for (let gy = spurStart; gy <= spurEnd; gy++) {
        const key = `${spurX},${gy}`;
        if (!waterTiles.has(key) && !buildingTileSet.has(key)) {
          roadTiles.add(key);
        }
      }
    }
  }

  // B3: Cập nhật layout địa hình Vương Quốc vào bộ vẽ Tile
  const grassSeedSalt = Math.floor(Math.random() * 8);
  setActiveKingdomTerrainLayout(waterTiles, roadTiles, grassSeedSalt);

  // B4: Sinh ngẫu nhiên các Mỏ Tài Nguyên (8 TREE, 3 STONE_DEPOSIT, 3 GOLD_VEIN) theo Sổ Tay & Admin Matrix
  const nodes: ResourceNode[] = [];
  const occupiedTiles = new Set<string>([
    ...waterTiles,
    ...roadTiles,
    ...buildingTileSet,
  ]);

  let nodeCounter = 1;
  rules.terrainGeneration.resourceSpawns.forEach((spawnRule) => {
    const modelId =
      spawnRule.type === 'TREE'
        ? 'NODE_TREE'
        : spawnRule.type === 'STONE_DEPOSIT'
        ? 'NODE_STONE_DEPOSIT'
        : 'NODE_GOLD_VEIN';
    if (!isModelEnabledForStageKey(modelId, stageKey)) {
      return;
    }

    for (let i = 0; i < spawnRule.count; i++) {
      for (let attempt = 0; attempt < 120; attempt++) {
        const gx = randomIntBetween(2, cols - 3);
        const gy = randomIntBetween(2, rows - 3);
        const key = `${gx},${gy}`;
        if (occupiedTiles.has(key)) continue;
        if (isNearWarehouse(gx, gy, spawnRule.minDistFromWarehouse)) continue;
        occupiedTiles.add(key);
        nodes.push({
          id: `n-${nodeCounter++}-${Date.now()}`,
          type: spawnRule.type,
          gridX: gx,
          gridY: gy,
          amount: spawnRule.amountPerNode,
        });
        break;
      }
    }
  });

  return nodes;
}

/**
 * 2. TỰ ĐỘNG TẠO & VẼ MAP TRANG VIÊN THEO SỔ TAY (`MANOR_MAP_HANDBOOK_RULES`)
 *    VÀ CẤU HÌNH ADMIN SHOWROOM (`map_manor_default`):
 * - Mỗi lần bước vào Trang Viên, tự động sinh ngẫu nhiên hồ nước trung tâm,
 *   lót vành đai đá tảng & rêu xanh bao quanh 1 vòng bờ hồ, và tạo lối đi lát đá
 *   khu vườn phía Tây, tự động né mọi vật phẩm Trang Viên đã đặt (`existingManorObjects`).
 */
export function generateManorMapFromHandbook(
  existingManorObjects: PlacedManorObject[] = []
): void {
  const stageKey = 'map_manor_default';
  const rules = LEVEL_DESIGN_HANDBOOK.manorMap;
  const cols = rules.grid.cols;
  const rows = rules.grid.rows;
  const pondRule = rules.terrainGeneration.centralPond;

  const occupiedByObjects = new Set<string>(
    existingManorObjects.map((o) => `${o.gridX},${o.gridY}`)
  );

  // Đảm bảo cả hồ nước lẫn vành đai đá 1 ô xung quanh không đè lên vật phẩm đã đặt
  const isNearPlacedObject = (gx: number, gy: number, radius: number) => {
    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        if (occupiedByObjects.has(`${gx + dx},${gy + dy}`)) return true;
      }
    }
    return false;
  };

  const waterTiles = new Set<string>();
  if (isModelEnabledForStageKey('TEX_RIVER_WATER', stageKey)) {
    const pondW = randomIntBetween(pondRule.minWidth, pondRule.maxWidth);
    const pondH = randomIntBetween(pondRule.minHeight, pondRule.maxHeight);
    const centerGx = randomIntBetween(
      pondRule.centerGxRange[0],
      pondRule.centerGxRange[1]
    );
    const centerGy = randomIntBetween(
      pondRule.centerGyRange[0],
      pondRule.centerGyRange[1]
    );
    const startX = Math.max(
      10,
      Math.min(cols - pondW - 3, centerGx - Math.floor(pondW / 2))
    );
    const startY = Math.max(
      4,
      Math.min(rows - pondH - 4, centerGy - Math.floor(pondH / 2))
    );

    for (let gy = startY; gy < startY + pondH; gy++) {
      for (let gx = startX; gx < startX + pondW; gx++) {
        if (pondRule.trimCornersForOrganicShape) {
          if (gx === startX && gy === startY) continue;
          if (gx === startX + pondW - 1 && gy === startY + pondH - 1) continue;
        }
        if (isNearPlacedObject(gx, gy, 1)) continue;
        waterTiles.add(`${gx},${gy}`);
      }
    }
  }

  // Tính toán vành đai Đá Tảng & Rêu Xanh 1 ô bao quanh mặt hồ nếu Admin bật TEX_POND_BOULDER
  const stoneRingTiles = new Set<string>();
  if (isModelEnabledForStageKey('TEX_POND_BOULDER', stageKey)) {
    waterTiles.forEach((coord) => {
      const [wx, wy] = coord.split(',').map(Number);
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (dx === 0 && dy === 0) continue;
          const nx = wx + dx;
          const ny = wy + dy;
          const nKey = `${nx},${ny}`;
          if (
            nx >= 0 &&
            nx < cols &&
            ny >= 0 &&
            ny < rows &&
            !waterTiles.has(nKey) &&
            !occupiedByObjects.has(nKey)
          ) {
            stoneRingTiles.add(nKey);
          }
        }
      }
    });
  }

  // Sinh ngẫu nhiên đường dạo lát đá khu vườn phía Tây theo Sổ Tay nếu Admin bật TEX_ROYAL_ROAD
  const roadTiles = new Set<string>();
  if (isModelEnabledForStageKey('TEX_ROYAL_ROAD', stageKey)) {
    const pathRule = rules.terrainGeneration.gardenCobblestonePaths;
    const hGy = randomIntBetween(
      pathRule.horizontalGyRange[0],
      pathRule.horizontalGyRange[1]
    );
    const vGx = randomIntBetween(
      pathRule.verticalGxRange[0],
      pathRule.verticalGxRange[1]
    );

    for (
      let gx = pathRule.horizontalGxSpan[0];
      gx <= pathRule.horizontalGxSpan[1];
      gx++
    ) {
      const key = `${gx},${hGy}`;
      if (
        !waterTiles.has(key) &&
        !stoneRingTiles.has(key) &&
        !occupiedByObjects.has(key)
      ) {
        roadTiles.add(key);
      }
    }
    for (
      let gy = pathRule.verticalGySpan[0];
      gy <= pathRule.verticalGySpan[1];
      gy++
    ) {
      const key = `${vGx},${gy}`;
      if (
        !waterTiles.has(key) &&
        !stoneRingTiles.has(key) &&
        !occupiedByObjects.has(key)
      ) {
        roadTiles.add(key);
      }
    }
  }

  const grassSeedSalt = Math.floor(Math.random() * 8);
  setActiveManorTerrainLayout(
    waterTiles,
    stoneRingTiles,
    roadTiles,
    grassSeedSalt
  );
}

export type StageGameMode =
  | 'DUNGEON'
  | 'WORLD_ENEMY_CAMP'
  | 'WORLD_PVP_KINGDOM';
export type StageMapStyle = 'PLAINS_GRASS';
export type StageEnemyAiMode = 'PASSIVE_DETECT' | 'AGGRESSIVE';
export type StageVictoryCondition =
  | 'KILL_ALL_ENEMIES'
  | 'KILL_ALL_ENEMIES_AND_STRUCTURES';

export interface StageDesignRule {
  mode: StageGameMode;
  cardId: string;
  cardName: string;
  dungeonTitle: string;
  stageNumber: number;
  title: string;
  stageTitle: string;
  subLabel: string;
  // Quy tắc vẽ Map
  mapStyle: StageMapStyle;
  weather: WeatherType;
  clearBottomLeftSpawn: {
    maxGx: number;
    minGy: number;
  };
  centerCampSafeZone?: {
    minGx: number;
    maxGx: number;
    minGy: number;
    maxGy: number;
  };
  requiredItemCost?: {
    itemId: string;
    itemName: string;
    quantity: number;
  };
  specialStructures?: {
    campBuildingCount: number;
    watchtowerCount: number;
    centerGx: number;
    centerGy: number;
    defensiveRingRadiusTiles: number;
    immuneToDebuffs: boolean;
  };
  randomTreeCount: number;
  randomStoneCount: number;
  // Quy tắc bố trí Quân Ta
  allySpawnZone: {
    minGx: number;
    maxGx: number;
    minGy: number;
    maxGy: number;
  };
  // Quy tắc bố trí Quân Địch & AI
  enemyCount: number;
  enemyLevel: number;
  enemyWikiPool: Array<'ENEMY_MELEE' | 'ENEMY_RANGED' | 'ENEMY_MAGE'>;
  enemyAiMode: StageEnemyAiMode;
  enemyDetectRangePx: number;
  // Điều kiện thắng & Thời gian tự nhặt đồ (3.000ms)
  victoryCondition: StageVictoryCondition;
  victoryAutoPickupDelayMs: number;
  autoLootDelayMs: number;
  // Phần thưởng hoàn thành ải (Nhánh phụ 25% so với Pomodoro 75%)
  completionBonus: {
    gold: number;
    diamonds: number;
    food: number;
    wood: number;
    stone: number;
    kingdomExp: number;
  };
  clearReward: {
    gold: number;
    diamonds: number;
    food: number;
    wood: number;
    stone: number;
    kingdomExp: number;
  };
}

/**
 * SỔ TAY THIẾT KẾ MÀN CHƠI (Đọc quy tắc từ `LEVEL_DESIGN_HANDBOOK.stageMap`):
 * Chế độ chơi: Phó bản / Đồng Bằng Châu Thổ (delta_plains) / Ải 1, 2, 3, 4, 5, 6
 */
export const STAGE_DESIGN_HANDBOOK: Record<
  string,
  Record<number, StageDesignRule>
> = {
  delta_plains: {
    1: {
      mode: 'DUNGEON',
      cardId: 'delta_plains',
      cardName: 'Đồng Bằng Châu Thổ',
      dungeonTitle: 'Đồng Bằng Châu Thổ',
      stageNumber: 1,
      title: 'Ải 1 - Đồng Bằng Châu Thổ',
      stageTitle: 'Ải 1 - Tiền Đồn Bờ Sông',
      subLabel: 'Tiền Đồn Bờ Sông',
      mapStyle: 'PLAINS_GRASS',
      weather: 'LIGHT_WIND',
      clearBottomLeftSpawn: { maxGx: 8, minGy: 10 },
      randomTreeCount: 14,
      randomStoneCount: 6,
      allySpawnZone: { minGx: 2, maxGx: 6, minGy: 13, maxGy: 16 },
      enemyCount: 3,
      enemyLevel: 1,
      enemyWikiPool: ['ENEMY_MELEE', 'ENEMY_RANGED', 'ENEMY_MAGE'],
      enemyAiMode: 'PASSIVE_DETECT',
      enemyDetectRangePx: 250,
      victoryCondition: 'KILL_ALL_ENEMIES',
      victoryAutoPickupDelayMs: 3000,
      autoLootDelayMs: 3000,
      completionBonus: {
        gold: 10,
        diamonds: 0,
        food: 12,
        wood: 12,
        stone: 10,
        kingdomExp: 15,
      },
      clearReward: {
        gold: 10,
        diamonds: 0,
        food: 12,
        wood: 12,
        stone: 10,
        kingdomExp: 15,
      },
    },
    2: {
      mode: 'DUNGEON',
      cardId: 'delta_plains',
      cardName: 'Đồng Bằng Châu Thổ',
      dungeonTitle: 'Đồng Bằng Châu Thổ',
      stageNumber: 2,
      title: 'Ải 2 - Đồng Bằng Châu Thổ',
      stageTitle: 'Ải 2 - Cánh Đồng Hoang',
      subLabel: 'Cánh Đồng Hoang',
      mapStyle: 'PLAINS_GRASS',
      weather: 'LIGHT_WIND',
      clearBottomLeftSpawn: { maxGx: 8, minGy: 10 },
      randomTreeCount: 15,
      randomStoneCount: 7,
      allySpawnZone: { minGx: 2, maxGx: 6, minGy: 13, maxGy: 16 },
      enemyCount: 5,
      enemyLevel: 2,
      enemyWikiPool: ['ENEMY_MELEE', 'ENEMY_RANGED', 'ENEMY_MAGE'],
      enemyAiMode: 'PASSIVE_DETECT',
      enemyDetectRangePx: 250,
      victoryCondition: 'KILL_ALL_ENEMIES',
      victoryAutoPickupDelayMs: 3000,
      autoLootDelayMs: 3000,
      completionBonus: {
        gold: 15,
        diamonds: 0,
        food: 16,
        wood: 16,
        stone: 14,
        kingdomExp: 20,
      },
      clearReward: {
        gold: 15,
        diamonds: 0,
        food: 16,
        wood: 16,
        stone: 14,
        kingdomExp: 20,
      },
    },
    3: {
      mode: 'DUNGEON',
      cardId: 'delta_plains',
      cardName: 'Đồng Bằng Châu Thổ',
      dungeonTitle: 'Đồng Bằng Châu Thổ',
      stageNumber: 3,
      title: 'Ải 3 - Đồng Bằng Châu Thổ',
      stageTitle: 'Ải 3 - Thảo Nguyên Gió Nhẹ',
      subLabel: 'Thảo Nguyên Gió Nhẹ',
      mapStyle: 'PLAINS_GRASS',
      weather: 'LIGHT_WIND',
      clearBottomLeftSpawn: { maxGx: 8, minGy: 10 },
      randomTreeCount: 16,
      randomStoneCount: 7,
      allySpawnZone: { minGx: 2, maxGx: 6, minGy: 13, maxGy: 16 },
      enemyCount: 7,
      enemyLevel: 3,
      enemyWikiPool: ['ENEMY_MELEE', 'ENEMY_RANGED', 'ENEMY_MAGE'],
      enemyAiMode: 'PASSIVE_DETECT',
      enemyDetectRangePx: 255,
      victoryCondition: 'KILL_ALL_ENEMIES',
      victoryAutoPickupDelayMs: 3000,
      autoLootDelayMs: 3000,
      completionBonus: {
        gold: 20,
        diamonds: 0,
        food: 20,
        wood: 20,
        stone: 18,
        kingdomExp: 25,
      },
      clearReward: {
        gold: 20,
        diamonds: 0,
        food: 20,
        wood: 20,
        stone: 18,
        kingdomExp: 25,
      },
    },
    4: {
      mode: 'DUNGEON',
      cardId: 'delta_plains',
      cardName: 'Đồng Bằng Châu Thổ',
      dungeonTitle: 'Đồng Bằng Châu Thổ',
      stageNumber: 4,
      title: 'Ải 4 - Đồng Bằng Châu Thổ',
      stageTitle: 'Ải 4 - Kho Lương Bị Chiếm',
      subLabel: 'Kho Lương Bị Chiếm',
      mapStyle: 'PLAINS_GRASS',
      weather: 'LIGHT_WIND',
      clearBottomLeftSpawn: { maxGx: 8, minGy: 10 },
      randomTreeCount: 16,
      randomStoneCount: 8,
      allySpawnZone: { minGx: 2, maxGx: 6, minGy: 13, maxGy: 16 },
      enemyCount: 9,
      enemyLevel: 4,
      enemyWikiPool: ['ENEMY_MELEE', 'ENEMY_RANGED', 'ENEMY_MAGE'],
      enemyAiMode: 'PASSIVE_DETECT',
      enemyDetectRangePx: 260,
      victoryCondition: 'KILL_ALL_ENEMIES',
      victoryAutoPickupDelayMs: 3000,
      autoLootDelayMs: 3000,
      completionBonus: {
        gold: 25,
        diamonds: 0,
        food: 25,
        wood: 25,
        stone: 22,
        kingdomExp: 30,
      },
      clearReward: {
        gold: 25,
        diamonds: 0,
        food: 25,
        wood: 25,
        stone: 22,
        kingdomExp: 30,
      },
    },
    5: {
      mode: 'DUNGEON',
      cardId: 'delta_plains',
      cardName: 'Đồng Bằng Châu Thổ',
      dungeonTitle: 'Đồng Bằng Châu Thổ',
      stageNumber: 5,
      title: 'Ải 5 - Đồng Bằng Châu Thổ',
      stageTitle: 'Ải 5 - Doanh Trại Ven Đồi',
      subLabel: 'Doanh Trại Ven Đồi',
      mapStyle: 'PLAINS_GRASS',
      weather: 'LIGHT_WIND',
      clearBottomLeftSpawn: { maxGx: 8, minGy: 10 },
      randomTreeCount: 17,
      randomStoneCount: 8,
      allySpawnZone: { minGx: 2, maxGx: 6, minGy: 13, maxGy: 16 },
      enemyCount: 12,
      enemyLevel: 5,
      enemyWikiPool: ['ENEMY_MELEE', 'ENEMY_RANGED', 'ENEMY_MAGE'],
      enemyAiMode: 'PASSIVE_DETECT',
      enemyDetectRangePx: 265,
      victoryCondition: 'KILL_ALL_ENEMIES',
      victoryAutoPickupDelayMs: 3000,
      autoLootDelayMs: 3000,
      completionBonus: {
        gold: 32,
        diamonds: 0,
        food: 30,
        wood: 30,
        stone: 26,
        kingdomExp: 35,
      },
      clearReward: {
        gold: 32,
        diamonds: 0,
        food: 30,
        wood: 30,
        stone: 26,
        kingdomExp: 35,
      },
    },
    6: {
      mode: 'DUNGEON',
      cardId: 'delta_plains',
      cardName: 'Đồng Bằng Châu Thổ',
      dungeonTitle: 'Đồng Bằng Châu Thổ',
      stageNumber: 6,
      title: 'Ải 6 - Đồng Bằng Châu Thổ',
      stageTitle: 'Ải 6 - Thành Lũy Châu Thổ',
      subLabel: 'Thành Lũy Châu Thổ',
      mapStyle: 'PLAINS_GRASS',
      weather: 'LIGHT_WIND',
      clearBottomLeftSpawn: { maxGx: 8, minGy: 10 },
      randomTreeCount: 18,
      randomStoneCount: 9,
      allySpawnZone: { minGx: 2, maxGx: 6, minGy: 13, maxGy: 16 },
      enemyCount: 15,
      enemyLevel: 6,
      enemyWikiPool: ['ENEMY_MELEE', 'ENEMY_RANGED', 'ENEMY_MAGE'],
      enemyAiMode: 'PASSIVE_DETECT',
      enemyDetectRangePx: 270,
      victoryCondition: 'KILL_ALL_ENEMIES',
      victoryAutoPickupDelayMs: 3000,
      autoLootDelayMs: 3000,
      completionBonus: {
        gold: 40,
        diamonds: 0,
        food: 36,
        wood: 36,
        stone: 32,
        kingdomExp: 45,
      },
      clearReward: {
        gold: 40,
        diamonds: 0,
        food: 36,
        wood: 36,
        stone: 32,
        kingdomExp: 45,
      },
    },
  },
  world_enemy_camp: (() => {
    const troopCounts = [4, 6, 8, 10, 12, 14, 16, 18, 20, 22];
    const goldRewards = [15, 22, 30, 38, 46, 55, 65, 78, 92, 110];
    const foodWoodRewards = [15, 20, 26, 32, 40, 48, 56, 66, 78, 95];
    const stoneRewards = [12, 18, 24, 28, 35, 42, 50, 60, 70, 85];
    const expRewards = [20, 25, 30, 38, 45, 55, 65, 75, 90, 110];
    const campStages: Record<number, StageDesignRule> = {};
    for (let lvl = 1; lvl <= 10; lvl++) {
      const watchtowerCount = lvl <= 3 ? 1 : lvl <= 6 ? 2 : lvl <= 9 ? 3 : 4;
      const bonus = {
        gold: goldRewards[lvl - 1] || 15 * lvl,
        diamonds: 0,
        food: foodWoodRewards[lvl - 1] || 15 * lvl,
        wood: foodWoodRewards[lvl - 1] || 15 * lvl,
        stone: stoneRewards[lvl - 1] || 12 * lvl,
        kingdomExp: expRewards[lvl - 1] || 20 * lvl,
      };
      campStages[lvl] = {
        mode: 'WORLD_ENEMY_CAMP',
        cardId: 'world_enemy_camp',
        cardName: 'Trại Quân Địch',
        dungeonTitle: 'Trại Quân Địch (Bản Đồ Thế Giới)',
        stageNumber: lvl,
        title: `Trại Quân Địch Lv.${lvl}`,
        stageTitle: `Trại Quân Địch Lv.${lvl} - Đồn Trú Trung Tâm`,
        subLabel: `Đồn Trú Trung Tâm (${watchtowerCount} Tháp Canh)`,
        mapStyle: 'PLAINS_GRASS',
        weather: 'LIGHT_WIND',
        clearBottomLeftSpawn: { maxGx: 8, minGy: 10 },
        centerCampSafeZone: { minGx: 11, maxGx: 18, minGy: 5, maxGy: 12 },
        requiredItemCost: {
          itemId: 'item-march-order',
          itemName: 'Lệnh Hành Quân',
          quantity: 1,
        },
        specialStructures: {
          campBuildingCount: 1,
          watchtowerCount,
          centerGx: 14.5,
          centerGy: 8.5,
          defensiveRingRadiusTiles: 3.2,
          immuneToDebuffs: true,
        },
        randomTreeCount: 15,
        randomStoneCount: 7,
        allySpawnZone: { minGx: 2, maxGx: 6, minGy: 13, maxGy: 16 },
        enemyCount: troopCounts[lvl - 1] || 4 + (lvl - 1) * 2,
        enemyLevel: lvl,
        enemyWikiPool: ['ENEMY_MELEE', 'ENEMY_RANGED', 'ENEMY_MAGE'],
        enemyAiMode: 'PASSIVE_DETECT',
        enemyDetectRangePx: 250 + Math.min(30, (lvl - 1) * 3),
        victoryCondition: 'KILL_ALL_ENEMIES_AND_STRUCTURES',
        victoryAutoPickupDelayMs: 3000,
        autoLootDelayMs: 3000,
        completionBonus: bonus,
        clearReward: bonus,
      };
    }
    return campStages;
  })(),

  world_pvp_kingdom: (() => {
    const pvpStages: Record<number, StageDesignRule> = {};
    for (let lvl = 1; lvl <= 50; lvl++) {
      const bonus = {
        gold: 0,
        diamonds: 0,
        food: 1000,
        wood: 1000,
        stone: 1000,
        kingdomExp: lvl * 25,
      };
      pvpStages[lvl] = {
        mode: 'WORLD_PVP_KINGDOM',
        cardId: 'world_pvp_kingdom',
        cardName: 'Vương Quốc vs Vương Quốc (Bản Đồ Thế Giới)',
        dungeonTitle: 'Vương Quốc vs Vương Quốc',
        stageNumber: lvl,
        title: `Công Thành Vương Quốc Lv.${lvl}`,
        stageTitle: `Công Thành Vương Quốc Lv.${lvl}`,
        subLabel:
          'Diệt hết quân địch & công trình tấn công được · Cướp 10% Tài Nguyên · Không rơi item',
        mapStyle: 'PLAINS_GRASS',
        weather: 'CLEAR',
        clearBottomLeftSpawn: { maxGx: 7, minGy: 11 },
        requiredItemCost: {
          itemId: 'item-march-order',
          itemName: 'Lệnh Hành Quân',
          quantity: 1,
        },
        randomTreeCount: 12,
        randomStoneCount: 6,
        allySpawnZone: { minGx: 2, maxGx: 6, minGy: 13, maxGy: 16 },
        enemyCount: 0,
        enemyLevel: Math.min(10, Math.max(1, Math.ceil(lvl / 5))),
        enemyWikiPool: ['ENEMY_MELEE', 'ENEMY_RANGED', 'ENEMY_MAGE'],
        enemyAiMode: 'PASSIVE_DETECT',
        enemyDetectRangePx: 280,
        victoryCondition: 'KILL_ALL_ENEMIES_AND_STRUCTURES',
        victoryAutoPickupDelayMs: 1200,
        autoLootDelayMs: 1200,
        completionBonus: bonus,
        clearReward: bonus,
      };
    }
    return pvpStages;
  })(),
};

export function getStageDesignRule(
  cardId: string,
  stageNumber: number
): StageDesignRule {
  const handbookRule =
    LEVEL_DESIGN_HANDBOOK.stageMap.dungeons[cardId]?.[stageNumber];
  const cardStages =
    STAGE_DESIGN_HANDBOOK[cardId] || STAGE_DESIGN_HANDBOOK.delta_plains;
  const base = cardStages[stageNumber] || cardStages[1];
  if (!handbookRule) return base;
  return {
    ...base,
    weather: handbookRule.weather,
    clearBottomLeftSpawn: { ...handbookRule.emptySafeZone },
    centerCampSafeZone: handbookRule.centerCampSafeZone
      ? { ...handbookRule.centerCampSafeZone }
      : base.centerCampSafeZone,
    requiredItemCost: handbookRule.requiredItemCost
      ? { ...handbookRule.requiredItemCost }
      : base.requiredItemCost,
    specialStructures: handbookRule.enemyGeneration.specialStructures
      ? { ...handbookRule.enemyGeneration.specialStructures }
      : base.specialStructures,
    allySpawnZone: { ...handbookRule.allySpawnZone },
    randomTreeCount: randomIntBetween(
      handbookRule.resourceGeneration.treeCountRange[0],
      handbookRule.resourceGeneration.treeCountRange[1]
    ),
    randomStoneCount: randomIntBetween(
      handbookRule.resourceGeneration.stoneCountRange[0],
      handbookRule.resourceGeneration.stoneCountRange[1]
    ),
    enemyCount: handbookRule.enemyGeneration.totalCount,
    enemyLevel: handbookRule.enemyGeneration.level,
    enemyDetectRangePx: handbookRule.enemyGeneration.detectRangePx,
    victoryCondition: handbookRule.victoryCondition,
    victoryAutoPickupDelayMs: handbookRule.victoryAutoLootDelayMs,
    autoLootDelayMs: handbookRule.victoryAutoLootDelayMs,
  };
}

// ============================================================================
// KHO ĐỒ TẠM THỜI TRONG MÀN CHƠI & VẬT PHẨM RƠI TRÊN BẢN ĐỒ
// ============================================================================

export type GroundLootDropKind =
  | 'GOLD'
  | 'DIAMOND'
  | 'FOOD'
  | 'WOOD'
  | 'STONE'
  | 'KINGDOM_ITEM'
  | 'MANOR_ITEM'
  | 'EQUIPMENT'
  | 'GEM';

export interface GroundLootDrop {
  id: string;
  x: number;
  y: number;
  originX: number;
  originY: number;
  kind: GroundLootDropKind;
  rarity?: EquipmentRarity;
  customIcon?: CustomItemIconKind | string;
  label: string;
  amount: number;
  colorHex: string;
  color: string;
  createdAt: number;
  isFlyingToBag?: boolean;
  flyStartedAt?: number;
  flyFromScreenX?: number;
  flyFromScreenY?: number;
  kingdomItemBlueprint?: Omit<InventoryItem, 'quantity'>;
  manorItemBlueprint?: Omit<InventoryItem, 'quantity'>;
  equipmentItem?: EquipmentItem;
  gemItem?: GemItem;
}

export interface StageTempLootBagItemEntry {
  itemId: string;
  name: string;
  quantity: number;
  rarity?: EquipmentRarity;
  blueprint: {
    portraitKind:
      | AllyUnitArchetypeId
      | BuildingType
      | CustomItemIconKind
      | 'ENEMY_MELEE'
      | 'ENEMY_RANGED'
      | string;
  };
}

export interface StageTempLootBag {
  gold: number;
  diamonds: number;
  food: number;
  wood: number;
  stone: number;
  kingdomExp: number;
  heroExpGained: number;
  items: StageTempLootBagItemEntry[];
  kingdomItems: InventoryItem[];
  manorItems: InventoryItem[];
  equipmentItems: EquipmentItem[];
  gemItems: GemItem[];
  pickupLogs: string[];
}

export function createEmptyStageTempLootBag(): StageTempLootBag {
  return {
    gold: 0,
    diamonds: 0,
    food: 0,
    wood: 0,
    stone: 0,
    kingdomExp: 0,
    heroExpGained: 0,
    items: [],
    kingdomItems: [],
    manorItems: [],
    equipmentItems: [],
    gemItems: [],
    pickupLogs: [],
  };
}

export function getTempLootBagTotalEntries(bag: StageTempLootBag): number {
  let count = 0;
  if (bag.gold > 0) count++;
  if (bag.diamonds > 0) count++;
  if (bag.food > 0) count++;
  if (bag.wood > 0) count++;
  if (bag.stone > 0) count++;
  count += bag.items.reduce((s, it) => s + it.quantity, 0);
  return count;
}

function upsertBagDisplayEntry(
  entries: StageTempLootBagItemEntry[],
  itemId: string,
  name: string,
  qty: number,
  portraitKind: StageTempLootBagItemEntry['blueprint']['portraitKind'],
  rarity?: EquipmentRarity
): StageTempLootBagItemEntry[] {
  const cloned = entries.map((e) => ({
    ...e,
    blueprint: { ...e.blueprint },
  }));
  const existing = cloned.find((e) => e.itemId === itemId);
  if (existing) {
    existing.quantity += qty;
  } else {
    cloned.push({
      itemId,
      name,
      quantity: qty,
      rarity,
      blueprint: { portraitKind },
    });
  }
  return cloned;
}

export function addDropToTempLootBag(
  bag: StageTempLootBag,
  drop: GroundLootDrop
): StageTempLootBag {
  const next: StageTempLootBag = {
    ...bag,
    items: bag.items.map((it) => ({
      ...it,
      blueprint: { ...it.blueprint },
    })),
    kingdomItems: bag.kingdomItems.map((it) => ({ ...it })),
    manorItems: bag.manorItems.map((it) => ({ ...it })),
    equipmentItems: bag.equipmentItems.map((eq) => ({ ...eq })),
    gemItems: bag.gemItems.map((g) => ({ ...g })),
    pickupLogs: [...bag.pickupLogs],
  };

  if (drop.kind === 'GOLD') {
    next.gold += drop.amount;
  } else if (drop.kind === 'DIAMOND') {
    next.diamonds += drop.amount;
  } else if (drop.kind === 'FOOD') {
    next.food += drop.amount;
  } else if (drop.kind === 'WOOD') {
    next.wood += drop.amount;
  } else if (drop.kind === 'STONE') {
    next.stone += drop.amount;
  } else if (drop.kind === 'KINGDOM_ITEM' && drop.kingdomItemBlueprint) {
    const bp = drop.kingdomItemBlueprint;
    const existing = next.kingdomItems.find((it) => it.id === bp.id);
    if (existing) {
      existing.quantity += drop.amount;
    } else {
      next.kingdomItems.push(
        defineKingdomItem({
          ...bp,
          quantity: drop.amount,
        })
      );
    }
    next.items = upsertBagDisplayEntry(
      next.items,
      bp.id,
      bp.name,
      drop.amount,
      bp.customIcon || bp.portraitKind || 'HERO_ALTAR',
      bp.rarity || drop.rarity || 'WHITE'
    );
  } else if (drop.kind === 'MANOR_ITEM' && drop.manorItemBlueprint) {
    const bp = drop.manorItemBlueprint;
    const existing = next.manorItems.find((it) => it.id === bp.id);
    if (existing) {
      existing.quantity += drop.amount;
    } else {
      next.manorItems.push(
        defineManorItem({
          ...bp,
          quantity: drop.amount,
        })
      );
    }
    next.items = upsertBagDisplayEntry(
      next.items,
      bp.id,
      bp.name,
      drop.amount,
      bp.customIcon || bp.portraitKind || 'MANOR',
      bp.rarity || drop.rarity || 'WHITE'
    );
  } else if (drop.kind === 'EQUIPMENT' && drop.equipmentItem) {
    const eq = drop.equipmentItem;
    next.equipmentItems.push({ ...eq });
    next.items = upsertBagDisplayEntry(
      next.items,
      eq.id,
      eq.name,
      1,
      `EQUIP|${eq.visualKind || eq.slot}|${eq.rarity || drop.rarity || 'WHITE'}`,
      eq.rarity || drop.rarity || 'WHITE'
    );
  } else if (drop.kind === 'GEM' && drop.gemItem) {
    const g = drop.gemItem;
    const existing = next.gemItems.find((item) => item.id === g.id);
    if (existing) {
      existing.quantity += drop.amount;
    } else {
      next.gemItems.push({ ...g, quantity: drop.amount });
    }
    next.items = upsertBagDisplayEntry(
      next.items,
      g.id,
      g.name,
      drop.amount,
      'HERO_ALTAR',
      g.rarity || drop.rarity || 'WHITE'
    );
  }

  next.pickupLogs = [`Nhặt: ${drop.label}`, ...next.pickupLogs.slice(0, 29)];
  return next;
}

/**
 * SỔ TAY TỈ LỆ RỚT ĐỒ THEO TỪNG LOẠI QUÁI (ENEMY DROP RATE HANDBOOK):
 * - Tỉ lệ rớt đồ tính trên từng loại quái, chỉ cần chết sẽ có tỉ lệ rơi ra đồ (trừ quái test).
 * - Cấp độ càng cao thì tỉ lệ rớt tổng được tăng thêm 5% mỗi cấp (tương đối trên tỉ lệ gốc ở Lv.1):
 *   Ví dụ: Quái có 10% tỉ lệ rớt đồ ở Lv.1 -> ở Lv.2 có 10.5% (tăng 5% của 10%).
 *   Công thức: effectiveRate(Lv) = baseRateLv1 * (1 + (Lv - 1) * 0.05)
 * - Thiết lập hiện tại cho Chiến Binh Hắc Ám, Cung Thủ Bóng Đêm, Pháp Sư Bóng Đêm:
 *   Như nhau — 20% rớt đồ mỗi nhóm phẩm chất (5 nhóm: WHITE, GREEN, BLUE, PURPLE, GOLD -> mỗi nhóm 20% ở Lv.1).
 */
export interface EnemyRarityDropRateTable {
  enemyId: 'ENEMY_MELEE' | 'ENEMY_RANGED' | 'ENEMY_MAGE';
  enemyName: string;
  baseRarityGroupRatesLv1: Record<EquipmentRarity, number>;
}

export const ENEMY_DROP_RATE_HANDBOOK: {
  relativeBonusPerLevelAbove1: number;
  excludeTestUnits: boolean;
  enemies: Record<'ENEMY_MELEE' | 'ENEMY_RANGED' | 'ENEMY_MAGE', EnemyRarityDropRateTable>;
} = {
  relativeBonusPerLevelAbove1: 0.05,
  excludeTestUnits: true,
  enemies: {
    ENEMY_MELEE: {
      enemyId: 'ENEMY_MELEE',
      enemyName: 'Chiến Binh Hắc Ám',
      baseRarityGroupRatesLv1: {
        WHITE: 0.2,
        GREEN: 0.2,
        BLUE: 0.2,
        PURPLE: 0.2,
        GOLD: 0.2,
      },
    },
    ENEMY_RANGED: {
      enemyId: 'ENEMY_RANGED',
      enemyName: 'Cung Thủ Bóng Đêm',
      baseRarityGroupRatesLv1: {
        WHITE: 0.2,
        GREEN: 0.2,
        BLUE: 0.2,
        PURPLE: 0.2,
        GOLD: 0.2,
      },
    },
    ENEMY_MAGE: {
      enemyId: 'ENEMY_MAGE',
      enemyName: 'Pháp Sư Bóng Đêm',
      baseRarityGroupRatesLv1: {
        WHITE: 0.2,
        GREEN: 0.2,
        BLUE: 0.2,
        PURPLE: 0.2,
        GOLD: 0.2,
      },
    },
  },
};

export function computeEnemyDropRateForLevel(
  baseRateLv1: number,
  enemyLevel: number
): number {
  const safeLevel = Math.max(1, Math.floor(enemyLevel || 1));
  return Math.min(
    1,
    baseRateLv1 *
      (1 + (safeLevel - 1) * ENEMY_DROP_RATE_HANDBOOK.relativeBonusPerLevelAbove1)
  );
}

const RARITY_ORDER: EquipmentRarity[] = [
  'WHITE',
  'GREEN',
  'BLUE',
  'PURPLE',
  'GOLD',
];

export function generateEnemyDeathLootDrops(
  enemy: EnemyUnit,
  stageNumber: number
): GroundLootDrop[] {
  if (enemy.noLootDrop) {
    return [];
  }
  const drops: GroundLootDrop[] = [];
  const now = performance.now();
  const lvl = Math.max(1, enemy.level || stageNumber || 1);

  const enemyArchetype: 'ENEMY_MELEE' | 'ENEMY_RANGED' | 'ENEMY_MAGE' =
    enemy.kind === 'MAGE'
      ? 'ENEMY_MAGE'
      : enemy.kind === 'RANGED'
        ? 'ENEMY_RANGED'
        : 'ENEMY_MELEE';
  const rateTable =
    ENEMY_DROP_RATE_HANDBOOK.enemies[enemyArchetype]?.baseRarityGroupRatesLv1 ||
    ENEMY_DROP_RATE_HANDBOOK.enemies.ENEMY_MELEE.baseRarityGroupRatesLv1;

  const baseAngle = Math.random() * Math.PI * 2;
  const pickScatterPos = (slotIndex: number) => {
    const angle =
      baseAngle +
      slotIndex * ((Math.PI * 2) / 5) +
      (Math.random() - 0.5) * 0.45;
    const dist = 24 + slotIndex * 9 + Math.random() * 12;
    return {
      x: Math.max(
        48,
        Math.min(GRID_COLS * TILE_SIZE - 48, enemy.x + Math.cos(angle) * dist)
      ),
      y: Math.max(
        48,
        Math.min(GRID_ROWS * TILE_SIZE - 48, enemy.y + Math.sin(angle) * dist)
      ),
    };
  };

  // Chọn 1 vật phẩm ngẫu nhiên thuộc đúng nhóm phẩm chất `rarity`
  const createDropForRarityGroup = (
    rarity: EquipmentRarity,
    slotIndex: number
  ): GroundLootDrop => {
    const pos = pickScatterPos(slotIndex);
    const meta = EQUIPMENT_RARITY_META[rarity];

    // Pool vật phẩm theo đúng phẩm chất
    const packCandidates = RESOURCE_CURRENCY_PACK_BLUEPRINTS.filter(
      (bp) => (bp.rarity || 'WHITE') === rarity
    );
    const potionCandidates = HERO_EXP_POTION_BLUEPRINTS.filter(
      (bp) => (bp.rarity || 'WHITE') === rarity
    );
    const manorCandidates = MANOR_ITEM_BLUEPRINTS.filter(
      (bp) => (bp.rarity || 'WHITE') === rarity
    );
    const gemCandidates = STARTER_GEMS.filter(
      (g) => (g.rarity || 'WHITE') === rarity
    );

    const roll = Math.random();

    // Nhóm BLUE có thêm Đá Huyền Thiếc (Nguyên liệu nâng cấp trang bị) và Thẻ Chiêu Mộ Quân Lính
    if (rarity === 'BLUE' && roll < 0.24) {
      return {
        id: `drop-ore-${Date.now()}-${slotIndex}-${Math.random().toString(36).slice(2, 6)}`,
        x: pos.x,
        y: pos.y,
        originX: enemy.x,
        originY: enemy.y,
        kind: 'KINGDOM_ITEM',
        rarity: 'BLUE',
        customIcon: MYSTIC_IRON_ORE_BLUEPRINT.customIcon,
        label: MYSTIC_IRON_ORE_BLUEPRINT.name,
        amount: 1,
        colorHex: meta.borderHex,
        color: meta.textHex,
        createdAt: now,
        kingdomItemBlueprint: MYSTIC_IRON_ORE_BLUEPRINT,
      };
    }

    if (rarity === 'BLUE' && roll >= 0.24 && roll < 0.36) {
      const cardBp =
        Math.random() < 0.5
          ? UNIT_SUMMON_CARD_BLUEPRINTS.SOLDIER_MELEE
          : UNIT_SUMMON_CARD_BLUEPRINTS.SOLDIER_RANGED;
      return {
        id: `drop-card-${Date.now()}-${slotIndex}-${Math.random().toString(36).slice(2, 6)}`,
        x: pos.x,
        y: pos.y,
        originX: enemy.x,
        originY: enemy.y,
        kind: 'KINGDOM_ITEM',
        rarity,
        customIcon: cardBp.customIcon,
        label: cardBp.name,
        amount: 1,
        colorHex: meta.borderHex,
        color: meta.textHex,
        createdAt: now,
        kingdomItemBlueprint: cardBp,
      };
    }

    // Mọi nhóm phẩm chất (WHITE, GREEN, BLUE, PURPLE, GOLD) đều có thể rớt Trang Bị ngẫu nhiên cùng phẩm chất (kèm ID mới và dòng phụ ngẫu nhiên)
    if (roll > 0.78) {
      const randomEq = generateRandomEquipmentItem({
        rarity,
        idPrefix: `eq-stage-${slotIndex}`,
      });
      return {
        id: `drop-eq-${Date.now()}-${slotIndex}-${Math.random().toString(36).slice(2, 6)}`,
        x: pos.x,
        y: pos.y,
        originX: enemy.x,
        originY: enemy.y,
        kind: 'EQUIPMENT',
        rarity,
        label: randomEq.name,
        amount: 1,
        colorHex: meta.borderHex,
        color: meta.textHex,
        createdAt: now,
        equipmentItem: randomEq,
      };
    }

    // Bình EXP Anh Hùng cùng phẩm chất
    if (roll > 0.56 && roll <= 0.72 && potionCandidates.length > 0) {
      const potionBp =
        potionCandidates[Math.floor(Math.random() * potionCandidates.length)];
      return {
        id: `drop-kitem-${Date.now()}-${slotIndex}-${Math.random().toString(36).slice(2, 6)}`,
        x: pos.x,
        y: pos.y,
        originX: enemy.x,
        originY: enemy.y,
        kind: 'KINGDOM_ITEM',
        rarity,
        customIcon: potionBp.customIcon,
        label: potionBp.name,
        amount: 1,
        colorHex: meta.borderHex,
        color: meta.textHex,
        createdAt: now,
        kingdomItemBlueprint: potionBp,
      };
    }

    // Vật phẩm Trang Viên cùng phẩm chất
    if (roll > 0.72 && roll <= 0.84 && manorCandidates.length > 0) {
      const manorBp =
        manorCandidates[Math.floor(Math.random() * manorCandidates.length)];
      return {
        id: `drop-mitem-${Date.now()}-${slotIndex}-${Math.random().toString(36).slice(2, 6)}`,
        x: pos.x,
        y: pos.y,
        originX: enemy.x,
        originY: enemy.y,
        kind: 'MANOR_ITEM',
        rarity,
        customIcon: manorBp.customIcon,
        label: manorBp.name,
        amount: 1,
        colorHex: meta.borderHex,
        color: meta.textHex,
        createdAt: now,
        manorItemBlueprint: manorBp,
      };
    }

    // Đá Quý cùng phẩm chất
    if (roll > 0.84 && gemCandidates.length > 0) {
      const baseGem =
        gemCandidates[Math.floor(Math.random() * gemCandidates.length)];
      return {
        id: `drop-gem-${Date.now()}-${slotIndex}-${Math.random().toString(36).slice(2, 6)}`,
        x: pos.x,
        y: pos.y,
        originX: enemy.x,
        originY: enemy.y,
        kind: 'GEM',
        rarity,
        label: baseGem.name,
        amount: 1,
        colorHex: meta.borderHex,
        color: meta.textHex,
        createdAt: now,
        gemItem: { ...baseGem, quantity: 1 },
      };
    }

    // Mặc định (phổ biến nhất): Túi / Rương Tài Nguyên hoặc Tiền Tệ thuộc đúng phẩm chất `rarity`
    const packBp =
      packCandidates[Math.floor(Math.random() * packCandidates.length)] ||
      RESOURCE_CURRENCY_PACK_BLUEPRINTS[0];
    return {
      id: `drop-pack-${Date.now()}-${slotIndex}-${Math.random().toString(36).slice(2, 6)}`,
      x: pos.x,
      y: pos.y,
      originX: enemy.x,
      originY: enemy.y,
      kind: 'KINGDOM_ITEM',
      rarity,
      customIcon: packBp.customIcon,
      label: packBp.name,
      amount: 1,
      colorHex: meta.borderHex,
      color: meta.textHex,
      createdAt: now,
      kingdomItemBlueprint: packBp,
    };
  };

  // Xét độc lập từng nhóm phẩm chất (WHITE, GREEN, BLUE, PURPLE, GOLD)
  // Mỗi nhóm có baseRateLv1 (20%) và tăng thêm +5% tương đối mỗi cấp độ quái
  let slotIdx = 0;
  for (const rarity of RARITY_ORDER) {
    const baseRate = rateTable[rarity] ?? 0.2;
    const effectiveRate = computeEnemyDropRateForLevel(baseRate, lvl);
    if (Math.random() < effectiveRate) {
      drops.push(createDropForRarityGroup(rarity, slotIdx));
      slotIdx += 1;
    }
  }

  return drops;
}

// ============================================================================
// PHIÊN VƯƠNG QUỐC ẢO CHO MÀN CHƠI (VIRTUAL KINGDOM SESSION)
// ============================================================================

export interface FleeingDefenderPeasant {
  id: string;
  nickname: string;
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  facing: 'LEFT' | 'RIGHT';
  hiddenInsideHouse?: boolean;
  fleeShouted?: boolean;
}

export interface VirtualKingdomStageSession {
  virtualKingdomId: string;
  sourceKingdomId: string;
  sourceKingdomName: string;
  sourceKingdomSnapshot: KingdomSaveData;
  stageRule: StageDesignRule;
  dispatchedUnitIds: string[];
  originalHomeBuildings: PlacedBuilding[];
  originalHomeResourceNodes: ResourceNode[];
  nonDispatchedHomeVillagers: VillagerUnit[];
  originalHomePositionByUnitId: Record<
    string,
    {
      x: number;
      y: number;
      targetX: number;
      targetY: number;
      homeX?: number;
      homeY?: number;
      assignedFarmId?: string;
      workState?: VillagerUnit['workState'];
    }
  >;
  homeWorkingPeasantsCount: number;
  virtualKingdom: KingdomSaveData;
  virtualKingdomData: KingdomSaveData;
  startedAtMs: number;
  targetWorldCoord?: { x: number; y: number };
  targetKingdomId?: string;
  targetKingdomName?: string;
  fleeingDefenderPeasants?: FleeingDefenderPeasant[];
  lootedResourcesFromDefender?: {
    food: number;
    wood: number;
    stone: number;
  };
}

function isInsideBottomLeftSafeZone(
  gx: number,
  gy: number,
  rule: StageDesignRule
): boolean {
  if (
    gx <= rule.clearBottomLeftSpawn.maxGx &&
    gy >= rule.clearBottomLeftSpawn.minGy
  ) {
    return true;
  }
  if (
    rule.centerCampSafeZone &&
    gx >= rule.centerCampSafeZone.minGx &&
    gx <= rule.centerCampSafeZone.maxGx &&
    gy >= rule.centerCampSafeZone.minGy &&
    gy <= rule.centerCampSafeZone.maxGy
  ) {
    return true;
  }
  return false;
}

/**
 * Tạo bản đồ ngẫu nhiên cho màn chơi theo quy định trong Sổ Tay & Cấu Hình Admin Showroom:
 * - Góc dưới bên trái map để trống hoàn toàn (không có cây, đá, chướng ngại).
 * - Các model đồng bằng, cỏ xanh (TREE, STONE_DEPOSIT, GOLD_VEIN rải ngẫu nhiên ở các vùng khác
 *   nếu được tích chọn trong Ma Trận Admin cho màn chơi đó).
 */
export function generateStageMapResourceNodes(
  rule: StageDesignRule,
  stageKey = `stage_${rule.cardId}_${rule.stageNumber}`,
  preOccupiedTiles: Iterable<string> = []
): ResourceNode[] {
  const nodes: ResourceNode[] = [];
  const occupied = new Set<string>(preOccupiedTiles);

  const tryPickTile = (): { gx: number; gy: number } | null => {
    for (let attempt = 0; attempt < 80; attempt++) {
      const gx = 1 + Math.floor(Math.random() * (GRID_COLS - 2));
      const gy = 1 + Math.floor(Math.random() * (GRID_ROWS - 2));
      if (isInsideBottomLeftSafeZone(gx, gy, rule)) continue;
      const key = `${gx},${gy}`;
      if (occupied.has(key)) continue;
      occupied.add(key);
      return { gx, gy };
    }
    return null;
  };

  if (isModelEnabledForStageKey('NODE_TREE', stageKey)) {
    for (let i = 0; i < rule.randomTreeCount; i++) {
      const pos = tryPickTile();
      if (!pos) continue;
      nodes.push({
        id: `stg-tree-${i}-${Date.now()}`,
        type: 'TREE',
        gridX: pos.gx,
        gridY: pos.gy,
        amount: 80,
      });
    }
  }

  if (isModelEnabledForStageKey('NODE_STONE_DEPOSIT', stageKey)) {
    for (let i = 0; i < rule.randomStoneCount; i++) {
      const pos = tryPickTile();
      if (!pos) continue;
      nodes.push({
        id: `stg-stone-${i}-${Date.now()}`,
        type: 'STONE_DEPOSIT',
        gridX: pos.gx,
        gridY: pos.gy,
        amount: 100,
      });
    }
  }

  if (isModelEnabledForStageKey('NODE_GOLD_VEIN', stageKey)) {
    const goldCount = Math.max(2, Math.floor(rule.randomStoneCount / 2));
    for (let i = 0; i < goldCount; i++) {
      const pos = tryPickTile();
      if (!pos) continue;
      nodes.push({
        id: `stg-gold-${i}-${Date.now()}`,
        type: 'GOLD_VEIN',
        gridX: pos.gx,
        gridY: pos.gy,
        amount: 120,
      });
    }
  }

  return nodes;
}

/**
 * Sinh các vật phẩm trang trí & công trình cảnh quan trên màn chơi Phó Bản
 * nếu Admin đã tích chọn cho phép xuất hiện trong màn chơi đó (`stageKey`).
 */
export function generateStageDecorationsAndBuildings(
  rule: StageDesignRule,
  stageKey: string,
  occupiedTiles: Set<string>
): {
  stageDecorations: PlacedManorObject[];
  stageBuildings: PlacedBuilding[];
} {
  const stageDecorations: PlacedManorObject[] = [];
  const stageBuildings: PlacedBuilding[] = [];

  const tryPickTile = (): { gx: number; gy: number } | null => {
    for (let attempt = 0; attempt < 80; attempt++) {
      const gx = 2 + Math.floor(Math.random() * (GRID_COLS - 4));
      const gy = 2 + Math.floor(Math.random() * (GRID_ROWS - 4));
      if (isInsideBottomLeftSafeZone(gx, gy, rule)) continue;
      const key = `${gx},${gy}`;
      if (occupiedTiles.has(key)) continue;
      occupiedTiles.add(key);
      return { gx, gy };
    }
    return null;
  };

  const decorationConfigs: Array<{
    modelId: string;
    blueprintId: string;
    count: number;
  }> = [
    { modelId: 'DEC_MANOR_FENCE', blueprintId: 'manor_item_1', count: 3 },
    { modelId: 'DEC_MANOR_GARDEN', blueprintId: 'manor_item_2', count: 3 },
    { modelId: 'DEC_MANOR_FOUNTAIN', blueprintId: 'manor_item_3', count: 1 },
    { modelId: 'DEC_MANOR_DEER', blueprintId: 'manor_item_4', count: 2 },
    { modelId: 'DEC_MANOR_STATUE', blueprintId: 'manor_item_5', count: 1 },
  ];

  decorationConfigs.forEach((cfg) => {
    if (!isModelEnabledForStageKey(cfg.modelId, stageKey)) return;
    const bp =
      MANOR_ITEM_BLUEPRINTS.find((b) => b.id === cfg.blueprintId) ||
      MANOR_ITEM_BLUEPRINTS[0];
    if (!bp) return;
    for (let i = 0; i < cfg.count; i++) {
      const pos = tryPickTile();
      if (!pos) continue;
      stageDecorations.push({
        id: `stg-dec-${cfg.modelId}-${i}-${Date.now()}`,
        itemId: bp.id,
        name: bp.name,
        rarity: bp.rarity,
        gridX: pos.gx,
        gridY: pos.gy,
      });
    }
  });

  const buildingConfigs: Array<{
    modelId: string;
    type: BuildingType;
    count: number;
  }> = [
    { modelId: 'BLD_WAREHOUSE', type: 'WAREHOUSE', count: 1 },
    { modelId: 'BLD_TOWN_HALL', type: 'TOWN_HALL', count: 1 },
    { modelId: 'BLD_FARM', type: 'FARM', count: 2 },
    { modelId: 'BLD_BARRACKS', type: 'BARRACKS', count: 1 },
    { modelId: 'BLD_HERO_ALTAR', type: 'HERO_ALTAR', count: 1 },
    { modelId: 'BLD_MANOR', type: 'MANOR', count: 1 },
  ];

  buildingConfigs.forEach((cfg) => {
    if (!isModelEnabledForStageKey(cfg.modelId, stageKey)) return;
    for (let i = 0; i < cfg.count; i++) {
      const pos = tryPickTile();
      if (!pos) continue;
      stageBuildings.push({
        id: `stg-bld-${cfg.type}-${i}-${Date.now()}`,
        type: cfg.type,
        gridX: pos.gx,
        gridY: pos.gy,
        hp: 600,
        maxHp: 600,
        level: 1,
        isConstructed: true,
        constructionProgress: 100,
      });
    }
  });

  return { stageDecorations, stageBuildings };
}

/**
 * Tạo danh sách Kẻ Địch theo quy định trong Sổ Tay & Cấu Hình Admin Showroom:
 * - Ải 1 có 3 quân địch ngẫu nhiên Lv.1 trong Wiki (ENEMY_MELEE / ENEMY_RANGED).
 * - Số lượng và cấp độ tăng dần theo các ải 1..6.
 * - Chỉ chọn loại quân địch được Admin tích chọn cho màn chơi đó (nếu bỏ tích cả 2 thì fallback giữ nguyên pool gốc).
 * - Vị trí ngẫu nhiên trên bản đồ TRỪ góc dưới bên trái map.
 * - AI địch: PASSIVE_DETECT (Đứng yên chờ người chơi bước vào tầm phát hiện).
 */
export function generateStageEnemies(
  rule: StageDesignRule,
  stageNodes: ResourceNode[],
  stageKey = `stage_${rule.cardId}_${rule.stageNumber}`,
  extraBlockedTiles: Iterable<string> = []
): EnemyUnit[] {
  const enemies: EnemyUnit[] = [];
  const nodeTileSet = new Set([
    ...stageNodes.map((n) => `${n.gridX},${n.gridY}`),
    ...extraBlockedTiles,
  ]);
  const chosenPositions: Array<{ x: number; y: number }> = [];

  // 1. Nếu màn chơi có điều kiện đặc biệt (Trại Quân Địch & Tháp Canh Hắc Ám ở trung tâm bản đồ):
  if (rule.specialStructures) {
    const centerX = rule.specialStructures.centerGx * TILE_SIZE + 32;
    const centerY = rule.specialStructures.centerGy * TILE_SIZE + 32;

    // Sinh Trại Quân Địch ở chính giữa trung tâm bản đồ
    const campSpawn = computeEnemyStatsForLevel(
      'ENEMY_CAMP_BUILDING',
      rule.enemyLevel
    );
    const campStats = campSpawn.stats;
    chosenPositions.push({ x: centerX, y: centerY });
    enemies.push({
      id: `stg-camp-bld-${rule.stageNumber}-${Date.now()}`,
      kind: 'CAMP_BUILDING',
      isStructure: true,
      level: campSpawn.level,
      expReward: campSpawn.expReward,
      name: UNIT_WIKI_DATABASE.ENEMY_CAMP_BUILDING.name,
      x: centerX,
      y: centerY,
      guardX: centerX,
      guardY: centerY,
      aiMode: 'PASSIVE_DETECT',
      detectRange: 0,
      facing: 'LEFT',
      hp: campStats.maxHp,
      ...campStats,
      statusEffects: [],
      attackRange: 0,
      speed: 0,
      attackCooldown: 0,
      windup: 0,
      hitFlash: 0,
      knockbackX: 0,
      knockbackY: 0,
    });

    // Sinh các Tháp Canh Hắc Ám ở 4 góc bảo vệ xung quanh Trại Quân Địch
    const towerOffsets = [
      { dx: -96, dy: -72 },
      { dx: 96, dy: -72 },
      { dx: -96, dy: 72 },
      { dx: 96, dy: 72 },
    ];
    const towerCount = Math.min(
      towerOffsets.length,
      Math.max(1, rule.specialStructures.watchtowerCount)
    );
    const towerSpawn = computeEnemyStatsForLevel(
      'ENEMY_WATCHTOWER',
      rule.enemyLevel
    );
    const towerStats = towerSpawn.stats;

    for (let tIdx = 0; tIdx < towerCount; tIdx++) {
      const tx = centerX + towerOffsets[tIdx].dx;
      const ty = centerY + towerOffsets[tIdx].dy;
      chosenPositions.push({ x: tx, y: ty });
      enemies.push({
        id: `stg-watchtower-${rule.stageNumber}-${tIdx}-${Date.now()}`,
        kind: 'WATCHTOWER',
        isStructure: true,
        level: towerSpawn.level,
        expReward: towerSpawn.expReward,
        name: UNIT_WIKI_DATABASE.ENEMY_WATCHTOWER.name,
        x: tx,
        y: ty,
        guardX: tx,
        guardY: ty,
        aiMode: 'PASSIVE_DETECT',
        detectRange: 350,
        facing: 'LEFT',
        hp: towerStats.maxHp,
        ...towerStats,
        statusEffects: [],
        attackRange: 320,
        speed: 0,
        attackCooldown: 0,
        windup: 0,
        hitFlash: 0,
        knockbackX: 0,
        knockbackY: 0,
      });
    }
  }

  const filteredEnemyPool = rule.enemyWikiPool.filter((wikiKey) =>
    isModelEnabledForStageKey(wikiKey, stageKey)
  );
  const activeEnemyPool =
    filteredEnemyPool.length > 0 ? filteredEnemyPool : rule.enemyWikiPool;

  for (let i = 0; i < rule.enemyCount; i++) {
    const wikiKey =
      activeEnemyPool[Math.floor(Math.random() * activeEnemyPool.length)];
    const kind: 'MELEE' | 'RANGED' | 'MAGE' =
      wikiKey === 'ENEMY_MAGE'
        ? 'MAGE'
        : wikiKey === 'ENEMY_RANGED'
          ? 'RANGED'
          : 'MELEE';
    const spawnInfo = computeEnemyStatsForLevel(wikiKey, rule.enemyLevel);
    const eStats = spawnInfo.stats;

    let spawnX = (14 + (i % 10)) * TILE_SIZE + 32;
    let spawnY = (3 + (i % 9)) * TILE_SIZE + 32;

    if (rule.specialStructures) {
      // Bố trí quân địch đứng yên phòng thủ theo vòng tròn đồng tâm quanh Trại Quân Địch trung tâm
      const centerX = rule.specialStructures.centerGx * TILE_SIZE + 32;
      const centerY = rule.specialStructures.centerGy * TILE_SIZE + 32;
      const ringIndex = Math.floor(i / 8);
      const posInRing = i % 8;
      const slotsInThisRing = Math.min(8, Math.max(1, rule.enemyCount - ringIndex * 8));
      const baseAngle =
        (posInRing / slotsInThisRing) * Math.PI * 2 + ringIndex * 0.38;
      const baseRadius = 135 + ringIndex * 54;

      for (let attempt = 0; attempt < 60; attempt++) {
        const angle = baseAngle + (attempt > 0 ? (Math.random() - 0.5) * 0.45 : 0);
        const radius = baseRadius + (attempt > 0 ? (Math.random() - 0.5) * 28 : 0);
        const candidateX = Math.max(
          2 * TILE_SIZE,
          Math.min((GRID_COLS - 2) * TILE_SIZE, centerX + Math.cos(angle) * radius)
        );
        const candidateY = Math.max(
          2 * TILE_SIZE,
          Math.min((GRID_ROWS - 2) * TILE_SIZE, centerY + Math.sin(angle) * radius * 0.78)
        );
        const tooClose = chosenPositions.some(
          (p) => Math.hypot(p.x - candidateX, p.y - candidateY) < 46
        );
        if (!tooClose) {
          spawnX = candidateX;
          spawnY = candidateY;
          break;
        }
      }
    } else {
      for (let attempt = 0; attempt < 100; attempt++) {
        const gx = 2 + Math.floor(Math.random() * (GRID_COLS - 4));
        const gy = 2 + Math.floor(Math.random() * (GRID_ROWS - 4));
        if (
          gx <= rule.clearBottomLeftSpawn.maxGx + 2 &&
          gy >= rule.clearBottomLeftSpawn.minGy - 1
        ) {
          continue;
        }
        if (nodeTileSet.has(`${gx},${gy}`)) continue;
        const candidateX = gx * TILE_SIZE + 20 + Math.random() * 24;
        const candidateY = gy * TILE_SIZE + 20 + Math.random() * 24;
        const tooClose = chosenPositions.some(
          (p) => Math.hypot(p.x - candidateX, p.y - candidateY) < 72
        );
        if (tooClose) continue;
        spawnX = candidateX;
        spawnY = candidateY;
        break;
      }
    }

    chosenPositions.push({ x: spawnX, y: spawnY });

    enemies.push({
      id: `stg-enemy-${rule.stageNumber}-${i}-${Date.now()}`,
      kind,
      level: spawnInfo.level,
      expReward: spawnInfo.expReward,
      name: UNIT_WIKI_DATABASE[wikiKey].name,
      x: spawnX,
      y: spawnY,
      guardX: spawnX,
      guardY: spawnY,
      aiMode: rule.enemyAiMode,
      detectRange: rule.enemyDetectRangePx,
      facing: 'LEFT',
      hp: eStats.maxHp,
      ...eStats,
      statusEffects: [],
      attackRange: kind === 'MELEE' ? 38 : kind === 'MAGE' ? 195 : 190,
      speed: (kind === 'MELEE' ? 1.55 : 1.35) * (eStats.spd / 100),
      attackCooldown: 0,
      windup: 0,
      hitFlash: 0,
      knockbackX: 0,
      knockbackY: 0,
    });
  }

  return enemies;
}

/**
 * KHỞI TẠO VƯƠNG QUỐC ẢO CHO MÀN CHƠI:
 * - Sao chép toàn bộ data của Vương Quốc tham chiến (sourceKingdom) vào Vương Quốc Ảo.
 * - Xóa tạm thời các công trình gốc ở nhà và quân không điều phối.
 * - Triệu hồi đúng số lượng quân đã chọn ở Bước 2 (dispatchedCounts) vào góc dưới bên trái map.
 * - Sinh bản đồ đồng bằng ngẫu nhiên theo Sổ Tay + Cấu Hình Ma Trận Admin Showroom.
 */
export function createVirtualKingdomStageSession(
  sourceKingdom: KingdomSaveData,
  cardId: string,
  stageNumber: number,
  dispatchedCounts: {
    hero?: number;
    melee?: number;
    ranged?: number;
    peasant?: number;
    heroFarel?: number;
    meleeSoldiers?: number;
    rangedSoldiers?: number;
    peasants?: number;
  },
  _encodeExploredTilesRLE?: (tiles: Uint8Array) => string,
  customComputeFinalStats?: (
    unitId: AllyUnitArchetypeId,
    bonusPercent?: number,
    tier?: number,
    equipment?: UnitEquipmentLoadout,
    unitLevel?: number
  ) => UnitCombatStats,
  customGetVillagerArchetypeId?: (u: VillagerUnit) => AllyUnitArchetypeId,
  customGetHeroMaxExp?: (lvl: number) => number,
  marchSessionOptions?: {
    preDispatchedUnitIds?: string[];
    skipItemCost?: boolean;
    targetWorldCoord?: { x: number; y: number };
    targetKingdomData?: KingdomSaveData | null;
    targetKingdomPublicSummary?: WorldTilePublicSummary | null;
  }
): VirtualKingdomStageSession | null {
  const baseRule = getStageDesignRule(cardId, stageNumber);
  const rule: StageDesignRule = {
    ...baseRule,
    completionBonus: { ...baseRule.completionBonus },
    clearReward: { ...baseRule.clearReward },
  };
  const stageKey = `stage_${cardId}_${stageNumber}`;
  const statsFn = customComputeFinalStats || computeFinalStats;
  const archFn =
    customGetVillagerArchetypeId ||
    ((u: VillagerUnit): AllyUnitArchetypeId => {
      if (u.role === 'HERO') return u.heroArchetypeId || 'KING';
      if (u.role === 'PEASANT') return 'PEASANT';
      return u.combatClass === 'RANGED' ? 'SOLDIER_RANGED' : 'SOLDIER_MELEE';
    });
  const heroMaxExpFn = customGetHeroMaxExp || getHeroMaxExp;

  // Sao chép sâu toàn bộ trang bị theo ID đơn vị
  const clonedEquipById: Record<string, UnitEquipmentLoadout> = {};
  if (sourceKingdom.unitEquipmentById) {
    Object.entries(sourceKingdom.unitEquipmentById).forEach(([uId, loadout]) => {
      clonedEquipById[uId] = cloneUnitEquipmentLoadout(loadout);
    });
  }

  const loadedHeroLvl = sourceKingdom.heroLevel || 1;
  const loadedHeroExp = sourceKingdom.heroExp ?? 50;

  const allSourceVillagers: VillagerUnit[] = (sourceKingdom.villagers || []).map(
    (v) => {
      const unitEq = cloneUnitEquipmentLoadout(
        clonedEquipById[v.id] || v.equipment
      );
      clonedEquipById[v.id] = unitEq;
      const archId = archFn(v);
      const tier =
        v.role === 'ALLY'
          ? v.tier || 1
          : sourceKingdom.unitTiers?.[archId] || v.tier || 1;
      const unitLvl =
        v.role === 'HERO' ? v.level || loadedHeroLvl : v.level || 1;
      const recalculated = statsFn(archId, 0, tier, unitEq, unitLvl);
      const wasRecup = Boolean(v.isRecuperating || v.hp <= 0);
      return {
        ...v,
        tier,
        level: unitLvl,
        exp: v.role === 'HERO' ? (v.exp ?? loadedHeroExp) : (v.exp ?? 0),
        maxExp:
          v.role === 'HERO'
            ? v.maxExp || heroMaxExpFn(unitLvl)
            : v.maxExp || 100,
        equipment: unitEq,
        skills: v.skills ? v.skills.map((s) => ({ ...s })) : [],
        ...recalculated,
        hp: wasRecup
          ? 0
          : Math.round(
              Math.min(recalculated.maxHp, v.hp || recalculated.maxHp)
            ),
        rage: v.role === 'HERO' ? 0 : v.rage,
        lastCombatAt: 0,
        statusEffects: [...(v.statusEffects || [])],
      };
    }
  );

  // Đếm số nông dân đang làm ruộng ở Vương Quốc gốc để tài nguyên bị động vẫn tăng trong lúc đánh Phó Bản
  const constructedFarmIds = new Set(
    (sourceKingdom.buildings || [])
      .filter((b) => b.isConstructed && b.type === 'FARM')
      .map((b) => b.id)
  );
  const homeWorkingPeasantsCount = allSourceVillagers.filter(
    (v) =>
      !v.isRecuperating &&
      !v.isDeployedAway &&
      v.hp > 0 &&
      v.role === 'PEASANT' &&
      v.assignedFarmId &&
      constructedFarmIds.has(v.assignedFarmId)
  ).length;

  // Lọc các đơn vị được điều phối ở Bước 2 (hoặc từ Lệnh Hành Quân đã xuất quân trước đó)
  let remHero = dispatchedCounts.hero ?? dispatchedCounts.heroFarel ?? 0;
  let remMelee = dispatchedCounts.melee ?? dispatchedCounts.meleeSoldiers ?? 0;
  let remRanged =
    dispatchedCounts.ranged ?? dispatchedCounts.rangedSoldiers ?? 0;
  let remPeasant = dispatchedCounts.peasant ?? dispatchedCounts.peasants ?? 0;
  const preDispatchedSet =
    marchSessionOptions?.preDispatchedUnitIds &&
    marchSessionOptions.preDispatchedUnitIds.length > 0
      ? new Set(marchSessionOptions.preDispatchedUnitIds)
      : null;

  const dispatchedVillagers: VillagerUnit[] = [];
  const nonDispatchedHomeVillagers: VillagerUnit[] = [];
  const originalHomePositionByUnitId: VirtualKingdomStageSession['originalHomePositionByUnitId'] =
    {};

  allSourceVillagers.forEach((v) => {
    originalHomePositionByUnitId[v.id] = {
      x: v.x,
      y: v.y,
      targetX: v.targetX,
      targetY: v.targetY,
      homeX: v.homeX,
      homeY: v.homeY,
      assignedFarmId: v.assignedFarmId,
      workState: v.workState,
    };

    const isAlive = !v.isRecuperating && v.hp > 0;
    let take = false;
    if (preDispatchedSet) {
      if (isAlive && preDispatchedSet.has(v.id)) {
        take = true;
      }
    } else if (isAlive && !v.isDeployedAway) {
      if (v.role === 'HERO' && remHero > 0) {
        remHero--;
        take = true;
      } else if (
        v.role === 'SOLDIER' &&
        v.combatClass !== 'RANGED' &&
        remMelee > 0
      ) {
        remMelee--;
        take = true;
      } else if (
        v.role === 'SOLDIER' &&
        v.combatClass === 'RANGED' &&
        remRanged > 0
      ) {
        remRanged--;
        take = true;
      } else if (v.role === 'PEASANT' && remPeasant > 0) {
        remPeasant--;
        take = true;
      }
    }

    if (take) {
      dispatchedVillagers.push({ ...v, isDeployedAway: false });
    } else {
      nonDispatchedHomeVillagers.push({ ...v, isDeployedAway: false });
    }
  });

  if (dispatchedVillagers.length === 0) {
    return null;
  }

  // Kiểm tra và trừ vật phẩm điều kiện tham chiến (VD: -1 Lệnh Hành Quân khi tấn công Trại Quân Địch)
  const updatedSourceInventory = (sourceKingdom.inventoryItems || []).map(
    (it) => ({ ...it })
  );
  if (rule.requiredItemCost && !marchSessionOptions?.skipItemCost) {
    const reqId = rule.requiredItemCost.itemId;
    const reqQty = rule.requiredItemCost.quantity;
    const targetItem = updatedSourceInventory.find((it) => it.id === reqId);
    if (!targetItem || targetItem.quantity < reqQty) {
      return null;
    }
    targetItem.quantity = Math.max(0, targetItem.quantity - reqQty);
  }

  // Sắp xếp vị trí xuất quân ở GÓC DƯỚI BÊN TRÁI MAP (gx: 2..6, gy: 13..16)
  // Khi mới vào game, cho đơn vị xuất phát từ bên ngoài rìa bản đồ góc trái bên dưới đi bộ vào vị trí đội hình (sx, sy)
  const { minGx, maxGx, minGy, maxGy } = rule.allySpawnZone;
  const cols = Math.max(1, maxGx - minGx + 1);
  const hasHeroInDispatch = dispatchedVillagers.some((u) => u.role === 'HERO');
  dispatchedVillagers.forEach((u, idx) => {
    const col = idx % cols;
    const row = Math.floor(idx / cols);
    const gx = Math.min(maxGx, minGx + col);
    const gy = Math.min(maxGy, minGy + (row % (maxGy - minGy + 1)));
    const sx = gx * TILE_SIZE + 24 + (idx % 3) * 8;
    const sy = gy * TILE_SIZE + 24 + (Math.floor(idx / 3) % 3) * 8;

    u.x = sx - 165;
    u.y = sy + 105;
    u.targetX = sx;
    u.targetY = sy;
    u.homeX = sx;
    u.homeY = sy;
    u.facing = 'RIGHT';
    u.isSelected = hasHeroInDispatch ? u.role === 'HERO' : idx === 0;
    u.manualMoveOrder = true;
    u.forcedTargetEnemyId = undefined;
    u.isPatrolling = false;
    u.patrolWaitUntil = undefined;
    u.patrolTargetX = undefined;
    u.patrolTargetY = undefined;
    u.windup = 0;
    u.attackCooldown = 0;
    if (u.role === 'HERO') {
      u.rage = 0;
      u.maxRage = u.maxRage || 100;
      u.lastCombatAt = 0;
    }
    if (u.role === 'PEASANT') {
      // Trong màn chơi Phó Bản, nông dân điều phối có thể hỗ trợ chiến đấu cận chiến cơ bản
      u.assignedFarmId = undefined;
      u.workState = 'IDLE';
      u.carryingFood = false;
      if (!u.attackRange || u.attackRange <= 0) {
        u.attackRange = 36;
      }
    }
  });

  // ==========================================================================
  // CHẾ ĐỘ 3: VƯƠNG QUỐC VS VƯƠNG QUỐC (SAO CHÉP BẢN ĐỒ VƯƠNG QUỐC BỊ TẤN CÔNG)
  // ==========================================================================
  const isPvpKingdomMode = cardId === 'world_pvp_kingdom';
  const targetK = marchSessionOptions?.targetKingdomData || null;
  const targetPub = marchSessionOptions?.targetKingdomPublicSummary || null;

  let stageBuildings: PlacedBuilding[] = [];
  let stageNodes: ResourceNode[] = [];
  let stageDecorations: PlacedManorObject[] = [];
  let stageEnemies: EnemyUnit[] = [];
  const fleeingDefenderPeasants: FleeingDefenderPeasant[] = [];
  let lootedResourcesFromDefender:
    | { food: number; wood: number; stone: number }
    | undefined;

  if (isPvpKingdomMode) {
    const defName =
      targetK?.name ||
      targetPub?.kingdomName ||
      `Vương Quốc (${marchSessionOptions?.targetWorldCoord?.x ?? 0}, ${marchSessionOptions?.targetWorldCoord?.y ?? 0})`;
    const defLevel = Math.max(
      1,
      targetK?.kingdomLevel || targetPub?.kingdomLevel || stageNumber || 1
    );
    rule.stageNumber = defLevel;
    rule.title = `Công Thành [${defName}] (Lv.${defLevel})`;
    rule.stageTitle = `Công Thành [${defName}] (Lv.${defLevel})`;
    rule.weather = targetK?.weather || 'CLEAR';

    // Tính 10% lượng tài nguyên hiện tại của Vương Quốc bị tấn công (Không cướp Vàng/Kim cương, thưởng thêm EXP Vương Quốc theo cấp địch)
    const defFood = Math.max(
      0,
      targetK?.resources?.food ?? (targetPub ? defLevel * 2500 : 10000)
    );
    const defWood = Math.max(
      0,
      targetK?.resources?.wood ?? (targetPub ? defLevel * 2500 : 10000)
    );
    const defStone = Math.max(
      0,
      targetK?.resources?.stone ?? (targetPub ? defLevel * 2500 : 10000)
    );
    const lootFood = Math.max(10, Math.floor(defFood * 0.1));
    const lootWood = Math.max(10, Math.floor(defWood * 0.1));
    const lootStone = Math.max(10, Math.floor(defStone * 0.1));
    const bonusExp = defLevel * 25;

    lootedResourcesFromDefender = {
      food: lootFood,
      wood: lootWood,
      stone: lootStone,
    };
    const pvpBonus = {
      gold: 0,
      diamonds: 0,
      food: lootFood,
      wood: lootWood,
      stone: lootStone,
      kingdomExp: bonusExp,
    };
    rule.completionBonus = pvpBonus;
    rule.clearReward = pvpBonus;

    // 1. Sao chép các công trình của Vương Quốc bị tấn công:
    // - Các công trình có thể tấn công (4 loại Tháp Phòng Thủ) -> Chuyển thành Kẻ Địch (enemies) với ID tiền tố `pvp-def-bldg-`
    // - Các công trình dân sinh/hậu cần còn lại -> Giữ nguyên làm cảnh quan trong `stageBuildings`
    const rawDefBuildings =
      targetK?.buildings && targetK.buildings.length > 0
        ? targetK.buildings
        : [
            {
              id: 'b-pvp-fallback-warehouse',
              type: 'WAREHOUSE' as BuildingType,
              gridX: 11,
              gridY: 7,
              level: 1,
              buildProgress: 100,
              isConstructed: true,
              lastProducedAt: Date.now(),
            },
            {
              id: 'b-pvp-fallback-house',
              type: 'TOWN_HALL' as BuildingType,
              gridX: 14,
              gridY: 7,
              level: 1,
              buildProgress: 100,
              isConstructed: true,
              lastProducedAt: Date.now(),
            },
          ];

    rawDefBuildings.forEach((b) => {
      // Tránh đặt công trình chặn ngay điểm tập kết góc dưới bên trái của quân ta
      if (isInsideBottomLeftSafeZone(b.gridX, b.gridY, rule)) return;

      if (b.isConstructed && isDefensiveTowerBuilding(b.type)) {
        const tLvl = Math.max(1, b.level || 1);
        const tStats = computeTowerStatsForLevel(b.type, tLvl);
        const tx = b.gridX * TILE_SIZE + 32;
        const ty = b.gridY * TILE_SIZE + 32;
        stageEnemies.push({
          id: `pvp-def-bldg-${b.id}`,
          kind: 'WATCHTOWER',
          pvpTowerType: b.type,
          isStructure: true,
          noLootDrop: true,
          level: tLvl,
          name: `${
            b.type === 'TOWER_ARCHER'
              ? 'Tháp Cung Thủ'
              : b.type === 'TOWER_MUSKET'
                ? 'Tháp Súng Hỏa Mai'
                : b.type === 'TOWER_CANNON'
                  ? 'Tháp Pháo Hạng Nặng'
                  : 'Tháp Pháo Hextech'
          } Lv.${tLvl}`,
          unitName: `${
            b.type === 'TOWER_ARCHER'
              ? 'Tháp Cung Thủ'
              : b.type === 'TOWER_MUSKET'
                ? 'Tháp Súng Hỏa Mai'
                : b.type === 'TOWER_CANNON'
                  ? 'Tháp Pháo Hạng Nặng'
                  : 'Tháp Pháo Hextech'
          } Lv.${tLvl}`,
          aiMode: 'PASSIVE_DETECT',
          detectRange: (tStats.ran || 360) + 40,
          guardX: tx,
          guardY: ty,
          x: tx,
          y: ty,
          facing: 'LEFT',
          hp: tStats.maxHp,
          ...tStats,
          statusEffects: [],
          attackRange: tStats.ran || 360,
          speed: 0,
          attackCooldown: 0,
          windup: 0,
          hitFlash: 0,
          knockbackX: 0,
          knockbackY: 0,
        });
      } else {
        stageBuildings.push({
          ...b,
          id: `pvp-scenery-${b.id}`,
        });
      }
    });

    // Khởi tạo địa hình Vương Quốc bị tấn công (Cỏ, sông, đường đá, mỏ cây/đá)
    generateKingdomMapFromHandbook(stageBuildings);

    if (targetK?.resourceNodes && targetK.resourceNodes.length > 0) {
      stageNodes = targetK.resourceNodes
        .filter((n) => !isInsideBottomLeftSafeZone(n.gridX, n.gridY, rule))
        .map((n) => ({ ...n, id: `pvp-node-${n.id}` }));
    } else {
      const stageOccupiedTiles = new Set<string>();
      stageBuildings.forEach((b) =>
        stageOccupiedTiles.add(`${b.gridX},${b.gridY}`)
      );
      stageEnemies.forEach((e) =>
        stageOccupiedTiles.add(
          `${Math.floor(e.x / TILE_SIZE)},${Math.floor(e.y / TILE_SIZE)}`
        )
      );
      stageNodes = generateStageMapResourceNodes(
        rule,
        stageKey,
        stageOccupiedTiles
      );
    }

    // 2. Xác định danh sách Nhà Dân / Nhà Kho để Nông Dân của địch chạy trốn vào nhà
    const shelterBuildings = stageBuildings.filter(
      (b) =>
        b.isConstructed && (b.type === 'TOWN_HALL' || b.type === 'WAREHOUSE')
    );

    // 3. Chuyển đổi toàn bộ Quân Đội của Vương Quốc bị tấn công thành Kẻ Địch (ID tiền tố `pvp-def-unit-`)
    //    (Cho phép sao chép cả đơn vị đang isDeployedAway để khi người chơi tự tấn công vương quốc của mình lúc test vẫn có đầy đủ đội hình phòng thủ)
    //    Riêng Nông Dân (`PEASANT`) tự động chạy trốn vào Nhà Dân / Nhà Kho gần nhất
    const rawDefVillagers = targetK?.villagers || [];
    rawDefVillagers.forEach((v) => {
      if (v.isRecuperating || v.hp <= 0) return;

      if (v.role === 'PEASANT') {
        let nearestShelter = shelterBuildings[0];
        let bestDist = Infinity;
        shelterBuildings.forEach((sh) => {
          const sx = sh.gridX * TILE_SIZE + 32;
          const sy = sh.gridY * TILE_SIZE + 36;
          const d = Math.hypot(sx - v.x, sy - v.y);
          if (d < bestDist) {
            bestDist = d;
            nearestShelter = sh;
          }
        });
        const targetX = nearestShelter
          ? nearestShelter.gridX * TILE_SIZE + 32
          : 11 * TILE_SIZE + 32;
        const targetY = nearestShelter
          ? nearestShelter.gridY * TILE_SIZE + 36
          : 7 * TILE_SIZE + 36;
        const startX =
          v.x < 8 * TILE_SIZE && v.y > 10 * TILE_SIZE
            ? 10 * TILE_SIZE + 32
            : v.x;
        const startY =
          v.x < 8 * TILE_SIZE && v.y > 10 * TILE_SIZE
            ? 8 * TILE_SIZE + 32
            : v.y;
        const rawNick =
          v.nickname ||
          targetK?.unitNicknames?.[v.id] ||
          generateRandomUnitNickname('PEASANT');
        fleeingDefenderPeasants.push({
          id: `pvp-flee-pea-${v.id}`,
          nickname: rawNick,
          x: startX,
          y: startY,
          targetX,
          targetY,
          facing: targetX >= startX ? 'RIGHT' : 'LEFT',
          hiddenInsideHouse: false,
          fleeShouted: false,
        });
        return;
      }

      const archId = archFn(v);
      const tier =
        v.role === 'ALLY'
          ? v.tier || 1
          : targetK?.unitTiers?.[archId] || v.tier || 1;
      const unitEq = cloneUnitEquipmentLoadout(
        targetK?.unitEquipmentById?.[v.id] ||
          v.equipment ||
          targetK?.unitEquipment?.[archId]
      );
      const unitLvl =
        v.role === 'HERO'
          ? v.level || targetK?.heroLevel || 1
          : v.level || 1;
      const calcStats = statsFn(archId, 0, tier, unitEq, unitLvl);
      const isRanged = v.combatClass === 'RANGED';
      const defaultName =
        v.role === 'HERO'
          ? `Anh Hùng ${v.unitName || 'Farel'}`
          : isRanged
            ? 'Cung Thủ Hoàng Gia'
            : 'Cấm Vệ Quân';
      const rawNick =
        v.nickname ||
        targetK?.unitNicknames?.[v.id] ||
        (v.role === 'HERO' ? targetK?.unitNicknames?.['HERO_FAREL'] : '') ||
        '';
      const displayLabel = rawNick.trim()
        ? `${defaultName} - ${rawNick.trim()}`
        : defaultName;

      // Nếu đơn vị phòng thủ tình cờ đang đứng ở góc dưới bên trái (nơi quân ta tiến vào), dời nhẹ về gần trung tâm Vương Quốc
      let gxPos = v.x;
      let gyPos = v.y;
      if (gxPos < 8.5 * TILE_SIZE && gyPos > 10.5 * TILE_SIZE) {
        gxPos = 12 * TILE_SIZE + ((stageEnemies.length * 29) % 160);
        gyPos = 8 * TILE_SIZE + ((stageEnemies.length * 23) % 120);
      }

      stageEnemies.push({
        id: `pvp-def-unit-${v.id}`,
        kind: isRanged ? 'RANGED' : 'MELEE',
        pvpUnitArchetype: archId,
        equipment: unitEq,
        noLootDrop: true,
        level: v.role === 'HERO' ? unitLvl : tier,
        name: displayLabel,
        unitName: displayLabel,
        nickname: rawNick.trim() || undefined,
        aiMode: 'PASSIVE_DETECT',
        detectRange: v.role === 'HERO' ? 360 : 320,
        guardX: gxPos,
        guardY: gyPos,
        x: gxPos,
        y: gyPos,
        facing: 'LEFT',
        hp: Math.max(1, Math.min(calcStats.maxHp, Math.round(v.hp || calcStats.maxHp))),
        ...calcStats,
        statusEffects: [],
        attackRange: isRanged ? 205 : v.role === 'HERO' ? 44 : 40,
        speed: 1.55 * ((calcStats.spd || 100) / 100),
        attackCooldown: 0,
        heroSkillCooldown: v.role === 'HERO' ? 1.5 : undefined,
        windup: 0,
        hitFlash: 0,
        knockbackX: 0,
        knockbackY: 0,
      });
    });

    // Nếu Vương Quốc bị tấn công chưa xây Tháp Phòng Thủ nào, bổ sung 1 Tháp Cung Thủ bảo vệ Nhà Kho
    const hasDefendingStructure = stageEnemies.some((e) => e.isStructure);
    const fallbackTier = Math.min(10, Math.max(1, Math.ceil(defLevel / 5)));
    if (!hasDefendingStructure) {
      const twrStats = computeTowerStatsForLevel('TOWER_ARCHER', defLevel);
      const twrX = 12 * TILE_SIZE + 32;
      const twrY = 8 * TILE_SIZE + 32;
      stageEnemies.push({
        id: `pvp-def-bldg-fallback-twr`,
        kind: 'WATCHTOWER',
        pvpTowerType: 'TOWER_ARCHER',
        isStructure: true,
        noLootDrop: true,
        level: defLevel,
        name: `Tháp Cung Thủ Lv.${defLevel}`,
        unitName: `Tháp Cung Thủ Lv.${defLevel}`,
        aiMode: 'PASSIVE_DETECT',
        detectRange: (twrStats.ran || 340) + 40,
        guardX: twrX,
        guardY: twrY,
        x: twrX,
        y: twrY,
        facing: 'LEFT',
        hp: twrStats.maxHp,
        ...twrStats,
        statusEffects: [],
        attackRange: twrStats.ran || 340,
        speed: 0,
        attackCooldown: 0,
        windup: 0,
        hitFlash: 0,
        knockbackX: 0,
        knockbackY: 0,
      });
    }

    // Nếu Vương Quốc bị tấn công chưa có Tướng hoặc chưa chiêu mộ Quân Lính (ví dụ Vương Quốc mới tạo hoặc Vương Quốc Online chỉ có Summary),
    // tự động bố trí đội quân đồn trú Hoàng Gia để luôn có Tướng + Quân Lính phòng thủ
    const hasDefendingHero = stageEnemies.some((e) => e.pvpUnitArchetype === 'KING');
    const hasDefendingSoldiers = stageEnemies.some(
      (e) =>
        e.pvpUnitArchetype === 'SOLDIER_MELEE' ||
        e.pvpUnitArchetype === 'SOLDIER_RANGED'
    );
    const buildFallbackGarrisonEquipment = (
      existingEq?: UnitEquipmentLoadout
    ): UnitEquipmentLoadout => {
      if (existingEq && Object.keys(existingEq).length > 0) {
        return cloneUnitEquipmentLoadout(existingEq);
      }
      const starterLoadout: UnitEquipmentLoadout = {};
      STARTER_WHITE_EQUIPMENT.forEach((eq) => {
        if (!starterLoadout[eq.slot]) {
          starterLoadout[eq.slot] = { ...eq };
        }
      });
      return starterLoadout;
    };

    if (!hasDefendingHero) {
      const heroEq = buildFallbackGarrisonEquipment(targetK?.unitEquipment?.KING);
      const heroStats = statsFn(
        'KING',
        0,
        1,
        heroEq,
        Math.max(1, targetK?.heroLevel || defLevel)
      );
      const hxPx = 11.2 * TILE_SIZE;
      const hyPx = 8.5 * TILE_SIZE;
      stageEnemies.push({
        id: `pvp-def-unit-fallback-hero`,
        kind: 'MELEE',
        pvpUnitArchetype: 'KING',
        equipment: heroEq,
        noLootDrop: true,
        level: Math.max(1, targetK?.heroLevel || defLevel),
        name: 'Anh Hùng Farel Đồn Trú',
        unitName: 'Anh Hùng Farel Đồn Trú',
        aiMode: 'PASSIVE_DETECT',
        detectRange: 360,
        guardX: hxPx,
        guardY: hyPx,
        x: hxPx,
        y: hyPx,
        facing: 'LEFT',
        hp: heroStats.maxHp,
        ...heroStats,
        statusEffects: [],
        attackRange: 44,
        speed: 1.55 * ((heroStats.spd || 100) / 100),
        attackCooldown: 0,
        heroSkillCooldown: 1.5,
        windup: 0,
        hitFlash: 0,
        knockbackX: 0,
        knockbackY: 0,
      });
    }
    if (!hasDefendingSoldiers) {
      const guardSpecs: Array<{
        arch: AllyUnitArchetypeId;
        kind: 'MELEE' | 'RANGED';
        gx: number;
        gy: number;
        label: string;
      }> = [
        {
          arch: 'SOLDIER_MELEE',
          kind: 'MELEE',
          gx: 10.5,
          gy: 8.2,
          label: 'Cấm Vệ Quân Đồn Trú',
        },
        {
          arch: 'SOLDIER_MELEE',
          kind: 'MELEE',
          gx: 11.5,
          gy: 9.2,
          label: 'Cấm Vệ Quân Đồn Trú',
        },
        {
          arch: 'SOLDIER_RANGED',
          kind: 'RANGED',
          gx: 13.0,
          gy: 7.8,
          label: 'Cung Thủ Hoàng Gia Đồn Trú',
        },
      ];
      guardSpecs.forEach((g, idx) => {
        const gEq = buildFallbackGarrisonEquipment(targetK?.unitEquipment?.[g.arch]);
        const gStats = statsFn(g.arch, 0, fallbackTier, gEq, 1);
        const gxPx = g.gx * TILE_SIZE;
        const gyPx = g.gy * TILE_SIZE;
        stageEnemies.push({
          id: `pvp-def-unit-fallback-${idx}`,
          kind: g.kind,
          pvpUnitArchetype: g.arch,
          equipment: gEq,
          noLootDrop: true,
          level: fallbackTier,
          name: g.label,
          unitName: g.label,
          aiMode: 'PASSIVE_DETECT',
          detectRange: 320,
          guardX: gxPx,
          guardY: gyPx,
          x: gxPx,
          y: gyPx,
          facing: 'LEFT',
          hp: gStats.maxHp,
          ...gStats,
          statusEffects: [],
          attackRange: g.kind === 'RANGED' ? 205 : 40,
          speed: 1.55 * ((gStats.spd || 100) / 100),
          attackCooldown: 0,
          windup: 0,
          hitFlash: 0,
          knockbackX: 0,
          knockbackY: 0,
        });
      });
    }
  } else {
    // Sinh các ô mặt nước, đá tảng ven hồ, hoặc đường lát đá nếu Admin tích chọn trong Showroom cho ải này
    const stageWaterTiles = new Set<string>();
    const stageStoneRingTiles = new Set<string>();
    const stageRoadTiles = new Set<string>();

    if (isModelEnabledForStageKey('TEX_RIVER_WATER', stageKey)) {
      const pondGx = randomIntBetween(18, 23);
      const pondGy = randomIntBetween(10, 13);
      for (let dy = 0; dy < 3; dy++) {
        for (let dx = 0; dx < 4; dx++) {
          if (dx === 0 && dy === 0) continue;
          const wx = pondGx + dx;
          const wy = pondGy + dy;
          if (!isInsideBottomLeftSafeZone(wx, wy, rule)) {
            stageWaterTiles.add(`${wx},${wy}`);
          }
        }
      }
    }

    if (isModelEnabledForStageKey('TEX_POND_BOULDER', stageKey)) {
      if (stageWaterTiles.size > 0) {
        stageWaterTiles.forEach((coord) => {
          const [wx, wy] = coord.split(',').map(Number);
          for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
              const nx = wx + dx;
              const ny = wy + dy;
              const nKey = `${nx},${ny}`;
              if (
                nx >= 1 &&
                nx < GRID_COLS - 1 &&
                ny >= 1 &&
                ny < GRID_ROWS - 1 &&
                !stageWaterTiles.has(nKey) &&
                !isInsideBottomLeftSafeZone(nx, ny, rule)
              ) {
                stageStoneRingTiles.add(nKey);
              }
            }
          }
        });
      } else {
        for (let i = 0; i < 6; i++) {
          const sx = randomIntBetween(10, GRID_COLS - 4);
          const sy = randomIntBetween(3, GRID_ROWS - 4);
          if (!isInsideBottomLeftSafeZone(sx, sy, rule)) {
            stageStoneRingTiles.add(`${sx},${sy}`);
          }
        }
      }
    }

    if (isModelEnabledForStageKey('TEX_ROYAL_ROAD', stageKey)) {
      const roadY = randomIntBetween(6, 9);
      for (let gx = 9; gx <= 24; gx++) {
        const rKey = `${gx},${roadY}`;
        if (!stageWaterTiles.has(rKey) && !stageStoneRingTiles.has(rKey)) {
          stageRoadTiles.add(rKey);
        }
      }
    }

    const grassSeedSalt = Math.floor(Math.random() * 8);
    setActiveStageTerrainLayout(
      grassSeedSalt,
      stageKey,
      stageWaterTiles,
      stageStoneRingTiles,
      stageRoadTiles
    );

    const stageOccupiedTiles = new Set<string>([
      ...stageWaterTiles,
      ...stageStoneRingTiles,
      ...stageRoadTiles,
    ]);
    stageNodes = generateStageMapResourceNodes(
      rule,
      stageKey,
      stageOccupiedTiles
    );
    stageNodes.forEach((n) => stageOccupiedTiles.add(`${n.gridX},${n.gridY}`));

    const generatedDecoAndBldgs = generateStageDecorationsAndBuildings(
      rule,
      stageKey,
      stageOccupiedTiles
    );
    stageDecorations = generatedDecoAndBldgs.stageDecorations;
    stageBuildings = generatedDecoAndBldgs.stageBuildings;

    stageEnemies = generateStageEnemies(
      rule,
      stageNodes,
      stageKey,
      stageOccupiedTiles
    );
  }

  const leadUnit =
    dispatchedVillagers.find((u) => u.role === 'HERO') ||
    dispatchedVillagers[0];
  const virtualKingX = leadUnit ? leadUnit.x : 3 * TILE_SIZE + 32;
  const virtualKingY = leadUnit ? leadUnit.y : 14 * TILE_SIZE + 32;

  const virtualKingdomData: KingdomSaveData = {
    ...sourceKingdom,
    id: `virtual-stage-${sourceKingdom.id}-${Date.now()}`,
    name: `${sourceKingdom.name} · ${rule.title}`,
    createdAt: Date.now(),
    lastSavedAt: Date.now(),
    isInitialized: true,
    kingdomLevel: sourceKingdom.kingdomLevel || 1,
    kingdomExp: sourceKingdom.kingdomExp ?? 35,
    heroLevel: sourceKingdom.heroLevel || 1,
    heroExp: sourceKingdom.heroExp ?? 50,
    resources: { ...(sourceKingdom.resources || {}) },
    buildings: stageBuildings,
    resourceNodes: stageNodes,
    villagers: dispatchedVillagers,
    king: {
      ...(sourceKingdom.king || {}),
      x: virtualKingX,
      y: virtualKingY,
      targetX: virtualKingX,
      targetY: virtualKingY,
      statusEffects: [],
    },
    enemies: stageEnemies,
    waveNumber: rule.stageNumber,
    day: sourceKingdom.day || 1,
    elapsedMinutes: sourceKingdom.elapsedMinutes || 0,
    weather: rule.weather,
    inventoryItems: updatedSourceInventory.map((it) => ({
      ...it,
    })),
    manorInventory: (
      sourceKingdom.manorInventory && sourceKingdom.manorInventory.length > 0
        ? sourceKingdom.manorInventory
        : INITIAL_MANOR_INVENTORY_ITEMS
    ).map((it) => ({ ...it })),
    manorObjects: stageDecorations,
    equipmentInventory: (sourceKingdom.equipmentInventory || []).map((eq) => ({
      ...eq,
      socketedGem: eq.socketedGem ? { ...eq.socketedGem } : undefined,
    })),
    gemInventory: (sourceKingdom.gemInventory || []).map((g) => ({ ...g })),
    unitTiers: { ...(sourceKingdom.unitTiers || INITIAL_UNIT_TIERS) },
    unitEquipment: {
      KING: cloneUnitEquipmentLoadout(sourceKingdom.unitEquipment?.KING),
      SOLDIER_MELEE: cloneUnitEquipmentLoadout(
        sourceKingdom.unitEquipment?.SOLDIER_MELEE
      ),
      SOLDIER_RANGED: cloneUnitEquipmentLoadout(
        sourceKingdom.unitEquipment?.SOLDIER_RANGED
      ),
      PEASANT: cloneUnitEquipmentLoadout(sourceKingdom.unitEquipment?.PEASANT),
    },
    unitEquipmentById: clonedEquipById,
    unitNicknames: { ...(sourceKingdom.unitNicknames || {}) },
    exploredTilesRLE: '',
    controlGroups: { 1: [], 2: [], 3: [], 4: [], 5: [] },
    holdPositionMode: false,
    formationMode: sourceKingdom.formationMode || 'CLUSTER',
    skillCooldownEndMap: {},
    unlockedDungeonStages: {
      ...(sourceKingdom.unlockedDungeonStages || { delta_plains: 1 }),
    },
    cardSystemMigratedV1: true,
    mails: (sourceKingdom.mails || []).map((m) => ({ ...m })),
    chronicleLogs: [
      `[Màn Chơi - ${rule.title}] Đã khởi tạo Vương Quốc Ảo từ [${sourceKingdom.name}], xuất trận ${dispatchedVillagers.length} đơn vị hành quân từ góc dưới bên trái bản đồ!`,
      ...(sourceKingdom.chronicleLogs || []).slice(0, 40),
    ],
  };

  return {
    virtualKingdomId: virtualKingdomData.id,
    sourceKingdomId: sourceKingdom.id,
    sourceKingdomName: sourceKingdom.name,
    sourceKingdomSnapshot: {
      ...sourceKingdom,
      inventoryItems: updatedSourceInventory.map((it) => ({ ...it })),
      villagers: allSourceVillagers,
    },
    stageRule: rule,
    dispatchedUnitIds: dispatchedVillagers.map((u) => u.id),
    originalHomeBuildings: (sourceKingdom.buildings || []).map((b) => ({
      ...b,
    })),
    originalHomeResourceNodes: (sourceKingdom.resourceNodes || []).map((n) => ({
      ...n,
    })),
    nonDispatchedHomeVillagers,
    originalHomePositionByUnitId,
    homeWorkingPeasantsCount,
    virtualKingdom: virtualKingdomData,
    virtualKingdomData,
    startedAtMs: Date.now(),
    targetWorldCoord: marchSessionOptions?.targetWorldCoord,
    targetKingdomId: targetK?.id,
    targetKingdomName:
      targetK?.name || targetPub?.kingdomName || undefined,
    fleeingDefenderPeasants,
    lootedResourcesFromDefender,
  };
}

/**
 * QUY TẮC CHIẾN THẮNG (COMMIT VIRTUAL KINGDOM -> PARTICIPATING KINGDOM):
 * 1. Cộng toàn bộ phần thưởng trong Kho Đồ Tạm Thời (finalTempBag)
 *    vào trực tiếp dữ liệu Vương Quốc Ảo hiện tại.
 * 2. Sao chép toàn bộ dữ liệu Vương Quốc Ảo về ngược lại Vương Quốc tham chiến
 *    (khôi phục công trình & mỏ ở nhà, gộp quân đội tham chiến với quân ở nhà, mở khóa ải tiếp theo).
 */
export function commitVirtualKingdomOnVictory(
  session: VirtualKingdomStageSession,
  virtualSnapshot: KingdomSaveData,
  finalTempBag: StageTempLootBag,
  _defineKingdomItemFn?: typeof defineKingdomItem,
  _defineManorItemFn?: typeof defineManorItem
): KingdomSaveData {
  const sourceKingdom = session.sourceKingdomSnapshot;
  const rule = session.stageRule;

  // 1. Cộng toàn bộ tài nguyên & tiền tệ từ Kho Đồ Tạm Thời vào Vương Quốc Ảo
  const mergedResources: Resources = {
    ...virtualSnapshot.resources,
    gold: (virtualSnapshot.resources.gold || 0) + finalTempBag.gold,
    diamonds:
      (virtualSnapshot.resources.diamonds || 0) + finalTempBag.diamonds,
    food: (virtualSnapshot.resources.food || 0) + finalTempBag.food,
    wood: (virtualSnapshot.resources.wood || 0) + finalTempBag.wood,
    stone: (virtualSnapshot.resources.stone || 0) + finalTempBag.stone,
  };

  // 2. Cộng EXP Vương Quốc từ Kho Đồ Tạm Thời + Thưởng hoàn thành ải
  const expGain =
    (finalTempBag.kingdomExp || 0) + (rule.completionBonus.kingdomExp || 20);
  let nextKingdomLevel = virtualSnapshot.kingdomLevel || 1;
  let nextKingdomExp = (virtualSnapshot.kingdomExp || 0) + expGain;
  while (nextKingdomLevel < 50 && nextKingdomExp >= nextKingdomLevel * 100) {
    nextKingdomExp -= nextKingdomLevel * 100;
    nextKingdomLevel += 1;
  }

  // 3. Gộp vật phẩm Vương Quốc từ Kho Đồ Tạm Thời vào Kho Đồ Vương Quốc Ảo
  const mergedInventory = (virtualSnapshot.inventoryItems || []).map((it) => ({
    ...it,
  }));
  finalTempBag.kingdomItems.forEach((lootItem) => {
    const existing = mergedInventory.find((it) => it.id === lootItem.id);
    if (existing) {
      existing.quantity += lootItem.quantity;
    } else {
      mergedInventory.push({ ...lootItem });
    }
  });

  // 4. Gộp vật phẩm Trang Viên từ Kho Đồ Tạm Thời
  const mergedManorInv = (virtualSnapshot.manorInventory || []).map((it) => ({
    ...it,
  }));
  finalTempBag.manorItems.forEach((mItem) => {
    const existing = mergedManorInv.find((it) => it.id === mItem.id);
    if (existing) {
      existing.quantity += mItem.quantity;
    } else {
      mergedManorInv.push({ ...mItem });
    }
  });

  // 5. Gộp Trang Bị & Đá Quý từ Kho Đồ Tạm Thời
  const mergedEquipmentInv = [
    ...(virtualSnapshot.equipmentInventory || []).map((eq) => ({ ...eq })),
    ...finalTempBag.equipmentItems.map((eq) => ({ ...eq })),
  ];
  const mergedGemInv = (virtualSnapshot.gemInventory || []).map((g) => ({
    ...g,
  }));
  finalTempBag.gemItems.forEach((gemLoot) => {
    const existing = mergedGemInv.find((g) => g.id === gemLoot.id);
    if (existing) {
      existing.quantity += gemLoot.quantity;
    } else {
      mergedGemInv.push({ ...gemLoot });
    }
  });

  // 6. Khôi phục vị trí quê nhà cho các đơn vị điều phối (giữ nguyên HP/Trại Hồi Sức, EXP, cấp độ, trang bị mới nhất)
  //    và gộp lại với các đơn vị ở nhà không tham chiến
  const returnedDispatchedUnits: VillagerUnit[] = (
    virtualSnapshot.villagers || []
  ).map((u) => {
    const origPos = session.originalHomePositionByUnitId[u.id];
    const deadOrRecup = Boolean(u.isRecuperating || u.hp <= 0);
    return {
      ...u,
      isRecuperating: deadOrRecup,
      isDeployedAway: false,
      hp: deadOrRecup ? 0 : Math.max(1, Math.min(u.maxHp, Math.round(u.hp))),
      x: origPos ? origPos.x : u.x,
      y: origPos ? origPos.y : u.y,
      targetX: origPos ? origPos.targetX : u.x,
      targetY: origPos ? origPos.targetY : u.y,
      homeX: origPos?.homeX ?? (origPos ? origPos.x : u.x),
      homeY: origPos?.homeY ?? (origPos ? origPos.y : u.y),
      assignedFarmId: deadOrRecup ? undefined : origPos?.assignedFarmId,
      workState: deadOrRecup ? 'IDLE' : origPos?.workState || 'IDLE',
      isSelected: false,
      manualMoveOrder: false,
      windup: 0,
      statusEffects: [],
    };
  });

  const mergedVillagers: VillagerUnit[] = [
    ...returnedDispatchedUnits,
    ...session.nonDispatchedHomeVillagers.map((v) => ({
      ...v,
      isDeployedAway: false,
    })),
  ];

  // Mở khóa ải tiếp theo trong thẻ Phó Bản hiện tại (cho phép lên tới 7 khi hoàn thành Ải 6 để khóa không cho chơi lại Ải 6)
  const prevUnlocked =
    sourceKingdom.unlockedDungeonStages?.[rule.cardId] || 1;
  const maxUnlockedCap = rule.cardId === 'delta_plains' ? 7 : 10;
  const nextUnlockedStage = Math.min(
    maxUnlockedCap,
    Math.max(prevUnlocked, rule.stageNumber + 1)
  );

  const clonedEquipById: Record<string, UnitEquipmentLoadout> = {};
  Object.entries(virtualSnapshot.unitEquipmentById || {}).forEach(
    ([uId, ld]) => {
      clonedEquipById[uId] = cloneUnitEquipmentLoadout(ld);
    }
  );

  return {
    ...sourceKingdom,
    lastSavedAt: Date.now(),
    isInitialized: true,
    activeMarchOrder: null,
    kingdomLevel: nextKingdomLevel,
    kingdomExp: nextKingdomExp,
    heroLevel: virtualSnapshot.heroLevel || sourceKingdom.heroLevel || 1,
    heroExp: virtualSnapshot.heroExp ?? sourceKingdom.heroExp ?? 50,
    resources: {
      ...mergedResources,
      population: mergedVillagers.filter((v) => v.role === 'PEASANT').length,
      soldiers: mergedVillagers.filter((v) => v.role === 'SOLDIER').length,
    },
    buildings: session.originalHomeBuildings.map((b) => ({ ...b })),
    resourceNodes: session.originalHomeResourceNodes.map((n) => ({ ...n })),
    villagers: mergedVillagers,
    enemies: (sourceKingdom.enemies || []).map((e) => ({ ...e })),
    day: Math.max(sourceKingdom.day || 1, virtualSnapshot.day || 1),
    elapsedMinutes: Math.max(
      sourceKingdom.elapsedMinutes || 0,
      virtualSnapshot.elapsedMinutes || 0
    ),
    weather: sourceKingdom.weather || 'CLEAR',
    inventoryItems: mergedInventory,
    manorInventory: mergedManorInv,
    manorObjects: (sourceKingdom.manorObjects || []).map((o) => ({ ...o })),
    equipmentInventory: mergedEquipmentInv,
    gemInventory: mergedGemInv,
    unitTiers: { ...(virtualSnapshot.unitTiers || sourceKingdom.unitTiers) },
    unitEquipment: {
      KING: cloneUnitEquipmentLoadout(
        virtualSnapshot.unitEquipment?.KING || sourceKingdom.unitEquipment?.KING
      ),
      SOLDIER_MELEE: cloneUnitEquipmentLoadout(
        virtualSnapshot.unitEquipment?.SOLDIER_MELEE ||
          sourceKingdom.unitEquipment?.SOLDIER_MELEE
      ),
      SOLDIER_RANGED: cloneUnitEquipmentLoadout(
        virtualSnapshot.unitEquipment?.SOLDIER_RANGED ||
          sourceKingdom.unitEquipment?.SOLDIER_RANGED
      ),
      PEASANT: cloneUnitEquipmentLoadout(
        virtualSnapshot.unitEquipment?.PEASANT ||
          sourceKingdom.unitEquipment?.PEASANT
      ),
    },
    unitEquipmentById: clonedEquipById,
    unitNicknames: {
      ...(sourceKingdom.unitNicknames || {}),
      ...(virtualSnapshot.unitNicknames || {}),
    },
    unlockedDungeonStages: {
      ...(sourceKingdom.unlockedDungeonStages || {}),
      [rule.cardId]: nextUnlockedStage,
    },
    mails: (virtualSnapshot.mails || sourceKingdom.mails || []).map((m) => ({
      ...m,
    })),
    chronicleLogs: [
      `[Chiến Thắng Phó Bản - ${rule.title}] Đã chuyển toàn bộ phần thưởng từ Kho Đồ Tạm Thời (+${finalTempBag.gold} Vàng, +${finalTempBag.diamonds} Kim Cương) từ Vương Quốc Ảo về [${sourceKingdom.name}]!`,
      ...(virtualSnapshot.chronicleLogs || sourceKingdom.chronicleLogs || []).slice(
        0,
        58
      ),
    ],
  };
}

/**
 * QUY TẮC THUA TRẬN (COMMIT DEFEATED TROOPS & PASSIVE RESOURCES ONLY):
 * - Nếu quân bị diệt hết thì phó bản thất bại.
 * - Chỉ chép data số quân đội đã điều phối sang bị giết / kiệt sức (hp = 0, isRecuperating = true)
 *   vào Vương Quốc tham chiến.
 * - Chép cả data tài nguyên bị động (do trong suốt quá trình chiến đấu tài nguyên bị động ở Vương Quốc vẫn tăng).
 * - Còn các thành quả kiếm được ở Vương Quốc Ảo và Kho Đồ Tạm Thời thì mất hết.
 */
export function commitVirtualKingdomOnDefeat(
  session: VirtualKingdomStageSession,
  virtualSnapshot: KingdomSaveData
): KingdomSaveData {
  const sourceKingdom = session.sourceKingdomSnapshot;
  const dispatchedSet = new Set(session.dispatchedUnitIds);

  const updatedHomeVillagers: VillagerUnit[] = (
    sourceKingdom.villagers || []
  ).map((v) => {
    if (!dispatchedSet.has(v.id)) {
      return { ...v, isDeployedAway: false };
    }
    // Các đơn vị đã điều phối sang Phó Bản bị tiêu diệt / kiệt sức -> Đưa vào Trại Hồi Sức
    return {
      ...v,
      hp: 0,
      isRecuperating: true,
      isDeployedAway: false,
      isSelected: false,
      windup: 0,
      windupTargetId: undefined,
      manualMoveOrder: false,
      statusEffects: [],
      carryingFood: false,
      workState: v.role === 'PEASANT' ? 'IDLE' : v.workState,
    };
  });

  // Giữ nguyên tài nguyên gốc + phần lương thực bị động tăng thêm trong thời gian chiến đấu
  // (Không cộng bất kỳ vàng hay vật phẩm chiến lợi phẩm nào kiếm được trong Vương Quốc Ảo)
  const passiveFoodDelta = Math.max(
    0,
    (virtualSnapshot.resources?.food || 0) -
      (session.virtualKingdomData.resources.food || 0)
  );

  return {
    ...sourceKingdom,
    lastSavedAt: Date.now(),
    activeMarchOrder: null,
    day: Math.max(sourceKingdom.day || 1, virtualSnapshot.day || 1),
    elapsedMinutes: Math.max(
      sourceKingdom.elapsedMinutes || 0,
      virtualSnapshot.elapsedMinutes || 0
    ),
    resources: {
      ...sourceKingdom.resources,
      food: (sourceKingdom.resources.food || 0) + passiveFoodDelta,
    },
    villagers: updatedHomeVillagers,
    chronicleLogs: [
      `[Thất Bại Phó Bản - ${session.stageRule.title}] Toàn bộ ${session.dispatchedUnitIds.length} đơn vị điều phối đã kiệt sức và được đưa về Trại Hồi Sức của [${sourceKingdom.name}]. Toàn bộ chiến lợi phẩm tạm thời trong màn chơi đã bị mất!`,
      ...(sourceKingdom.chronicleLogs || []).slice(0, 58),
    ],
  };
}
