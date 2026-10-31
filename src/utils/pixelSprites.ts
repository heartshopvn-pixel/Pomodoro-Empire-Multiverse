import {
  ActiveStatusEffect,
  BuildingType,
  computeTowerStatsForLevel,
  DamagePopup,
  DefeatedEnemyCorpse,
  EnemyUnit,
  HitEffect,
  HitParticle,
  HolySwordSkillEffect,
  isDefensiveTowerBuilding,
  KingState,
  PlacedBuilding,
  PlacedManorObject,
  Projectile,
  ResourceNode,
  VillagerUnit,
} from '../types/game';
import {
  getAllowedGrassSeedsForStageKey,
  GroundTextureVariantId,
} from './adminShowroomConfig';
import { getUnitTotalShield } from './statusEffects';

export const GRID_COLS = 30;
export const GRID_ROWS = 18;
export const TILE_SIZE = 64;
export const WORLD_WIDTH = GRID_COLS * TILE_SIZE; // 1920
export const WORLD_HEIGHT = GRID_ROWS * TILE_SIZE; // 1152
export const CANVAS_WIDTH = 1280;
export const CANVAS_HEIGHT = 720;

// ============================================================================
// OFFSCREEN SPRITE CACHE & PIXEL ART ENGINE (2px = 1 Retro Pixel -> 32x32 Grid per Tile)
// ============================================================================
const P = 2; // High-detail 2px pixel grid (32x32 sub-pixels per 64x64 tile)
const spriteCache = new Map<string, HTMLCanvasElement>();

function getCachedSprite(
  key: string,
  width: number,
  height: number,
  renderFn: (ctx: CanvasRenderingContext2D) => void
): HTMLCanvasElement {
  const existing = spriteCache.get(key);
  if (existing) return existing;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.imageSmoothingEnabled = false;
    renderFn(ctx);
  }
  spriteCache.set(key, canvas);
  return canvas;
}

function px(
  ctx: CanvasRenderingContext2D,
  gx: number,
  gy: number,
  gw: number,
  gh: number,
  color: string
) {
  ctx.fillStyle = color;
  ctx.fillRect(gx * P, gy * P, gw * P, gh * P);
}

function drawMatrix(
  ctx: CanvasRenderingContext2D,
  matrix: string[],
  palette: Record<string, string>,
  offsetX = 0,
  offsetY = 0,
  scale = P
) {
  for (let r = 0; r < matrix.length; r++) {
    const row = matrix[r];
    for (let c = 0; c < row.length; c++) {
      const ch = row[c];
      if (ch === '.' || ch === ' ') continue;
      const color = palette[ch];
      if (color) {
        ctx.fillStyle = color;
        ctx.fillRect(offsetX + c * scale, offsetY + r * scale, scale, scale);
      }
    }
  }
}

// ============================================================================
// TRẠNG THÁI ĐỊA HÌNH ĐỘNG ĐƯỢC SINH TỪ "MODULE TỰ ĐỘNG HÓA TẠO & VẼ MAP"
// (Đọc quy tắc từ Sổ Tay Thiết Kế Màn Chơi + Cấu Hình Ma Trận Admin Showroom)
// ============================================================================
interface ActiveGeneratedTerrainLayout {
  kingdomWaterTiles: Set<string>;
  kingdomRoadTiles: Set<string>;
  kingdomCustomTiles: Map<string, GroundTextureVariantId>;
  kingdomGridCols: number;
  kingdomGridRows: number;
  manorWaterTiles: Set<string>;
  manorStoneRingTiles: Set<string>;
  manorRoadTiles: Set<string>;
  stageWaterTiles: Set<string>;
  stageStoneRingTiles: Set<string>;
  stageRoadTiles: Set<string>;
  activeStageKey: string;
  grassSeedSalt: number;
}

const activeTerrainLayout: ActiveGeneratedTerrainLayout = {
  kingdomWaterTiles: new Set<string>(),
  kingdomRoadTiles: new Set<string>(),
  kingdomCustomTiles: new Map<string, GroundTextureVariantId>(),
  kingdomGridCols: 16,
  kingdomGridRows: 16,
  manorWaterTiles: new Set<string>(),
  manorStoneRingTiles: new Set<string>(),
  manorRoadTiles: new Set<string>(),
  stageWaterTiles: new Set<string>(),
  stageStoneRingTiles: new Set<string>(),
  stageRoadTiles: new Set<string>(),
  activeStageKey: 'stage_delta_plains_1',
  grassSeedSalt: 0,
};

let activeSnowLevel: 0 | 1 | 2 = 0;

export function setActiveWeatherSnowLevel(level: 0 | 1 | 2) {
  activeSnowLevel = level;
}

let activeShowUnitNickname = true;
let activeShowUnitHpBar = true;
let activeShiftHoldShowHpBar = false;

export function setUnitHudDisplayConfig(
  showNickname: boolean,
  showHpBar: boolean,
  isShiftHeld: boolean
) {
  activeShowUnitNickname = showNickname;
  activeShowUnitHpBar = showHpBar;
  activeShiftHoldShowHpBar = isShiftHeld;
}

export function setActiveKingdomTerrainLayout(
  waterTiles: Iterable<string>,
  roadTiles: Iterable<string>,
  grassSeedSalt: number,
  gridCols = 16,
  gridRows = 16
) {
  activeTerrainLayout.kingdomWaterTiles = new Set(waterTiles);
  activeTerrainLayout.kingdomRoadTiles = new Set(roadTiles);
  activeTerrainLayout.grassSeedSalt = Math.abs(Math.floor(grassSeedSalt)) % 8;
  activeTerrainLayout.kingdomGridCols = Math.max(16, gridCols);
  activeTerrainLayout.kingdomGridRows = Math.max(16, gridRows);
}

export function setActiveManorTerrainLayout(
  waterTiles: Iterable<string>,
  stoneRingTiles: Iterable<string>,
  roadTiles: Iterable<string>,
  grassSeedSalt: number
) {
  activeTerrainLayout.manorWaterTiles = new Set(waterTiles);
  activeTerrainLayout.manorStoneRingTiles = new Set(stoneRingTiles);
  activeTerrainLayout.manorRoadTiles = new Set(roadTiles);
  activeTerrainLayout.grassSeedSalt = Math.abs(Math.floor(grassSeedSalt)) % 8;
}

export function setActiveStageTerrainLayout(
  grassSeedSalt: number,
  stageKey = 'stage_delta_plains_1',
  waterTiles: Iterable<string> = [],
  stoneRingTiles: Iterable<string> = [],
  roadTiles: Iterable<string> = []
) {
  activeTerrainLayout.grassSeedSalt = Math.abs(Math.floor(grassSeedSalt)) % 8;
  activeTerrainLayout.activeStageKey = stageKey;
  activeTerrainLayout.stageWaterTiles = new Set(waterTiles);
  activeTerrainLayout.stageStoneRingTiles = new Set(stoneRingTiles);
  activeTerrainLayout.stageRoadTiles = new Set(roadTiles);
}

export function setActiveKingdomCustomTiles(
  customTiles?: Record<string, string>
) {
  activeTerrainLayout.kingdomCustomTiles.clear();
  if (!customTiles) return;
  Object.entries(customTiles).forEach(([coord, variant]) => {
    if (variant) {
      activeTerrainLayout.kingdomCustomTiles.set(
        coord,
        variant as GroundTextureVariantId
      );
    }
  });
}

export function isWaterTile(gx: number, gy: number): boolean {
  const custom = activeTerrainLayout.kingdomCustomTiles.get(`${gx},${gy}`);
  if (custom) {
    return custom === 'TEX_RIVER_WATER';
  }
  if (activeTerrainLayout.kingdomWaterTiles.size > 0) {
    return activeTerrainLayout.kingdomWaterTiles.has(`${gx},${gy}`);
  }
  if (gx >= 25 && gy >= 11) return true;
  if (gx === 24 && gy >= 13) return true;
  if (gx <= 2 && gy <= 2) return true;
  if (gy === 17 && gx >= 8 && gx <= 16) return true;
  return false;
}

// Hồ nước nhỏ ở trung tâm bản đồ Trang Viên (Vương Quốc Ảo) — Sinh tự động từ Sổ Tay Thiết Kế Màn Chơi
export function isManorWaterTile(gx: number, gy: number): boolean {
  if (activeTerrainLayout.manorWaterTiles.size > 0) {
    return activeTerrainLayout.manorWaterTiles.has(`${gx},${gy}`);
  }
  if (gx >= 12 && gx <= 17 && gy >= 7 && gy <= 10) {
    if (gx === 12 && gy === 7) return false;
    if (gx === 17 && gy === 10) return false;
    return true;
  }
  return false;
}

export function isStageWaterTile(gx: number, gy: number): boolean {
  return activeTerrainLayout.stageWaterTiles.has(`${gx},${gy}`);
}

// Đá tảng lót bao quanh hồ nước nhỏ trong Trang Viên — Sinh tự động từ Sổ Tay Thiết Kế Màn Chơi
export function isManorStoneRingTile(gx: number, gy: number): boolean {
  if (activeTerrainLayout.manorStoneRingTiles.size > 0) {
    return activeTerrainLayout.manorStoneRingTiles.has(`${gx},${gy}`);
  }
  if (isManorWaterTile(gx, gy)) return false;
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      if (dx === 0 && dy === 0) continue;
      if (isManorWaterTile(gx + dx, gy + dy)) {
        return true;
      }
    }
  }
  return false;
}

export function isRoadTile(gx: number, gy: number, isManorMode = false): boolean {
  if (isManorMode) {
    if (activeTerrainLayout.manorRoadTiles.size > 0) {
      return activeTerrainLayout.manorRoadTiles.has(`${gx},${gy}`);
    }
    if (gy === 7 && gx >= 4 && gx <= 10) return true;
    if (gx === 8 && gy >= 3 && gy <= 13) return true;
    return false;
  }
  const custom = activeTerrainLayout.kingdomCustomTiles.get(`${gx},${gy}`);
  if (custom) {
    return custom === 'TEX_ROYAL_ROAD';
  }
  if (activeTerrainLayout.kingdomRoadTiles.size > 0) {
    return activeTerrainLayout.kingdomRoadTiles.has(`${gx},${gy}`);
  }
  if (gy === 7 && gx >= 4 && gx <= 21) return true;
  if (gx === 12 && gy >= 2 && gy <= 13) return true;
  return false;
}

// ============================================================================
// 1. TERRAIN & TILE RENDERING (CACHED 32x32 PIXEL ART TILES)
// ============================================================================
export function drawTileBackground(
  ctx: CanvasRenderingContext2D,
  gx: number,
  gy: number,
  tick: number,
  isManorMode = false,
  isPlainsStageMode = false
) {
  if (!isManorMode && !isPlainsStageMode) {
    const customVariant = activeTerrainLayout.kingdomCustomTiles.get(`${gx},${gy}`);
    if (customVariant && customVariant !== 'TEX_RIVER_WATER') {
      drawShowroomGroundTile(ctx, gx, gy, tick, customVariant, false);
      return;
    }
  }
  const x = gx * TILE_SIZE;
  const y = gy * TILE_SIZE;
  const checkWater = isPlainsStageMode
    ? isStageWaterTile
    : isManorMode
    ? isManorWaterTile
    : isWaterTile;
  const isWater = checkWater(gx, gy);

  const maxCols =
    isPlainsStageMode || isManorMode ? GRID_COLS : activeTerrainLayout.kingdomGridCols;
  const maxRows =
    isPlainsStageMode || isManorMode ? GRID_ROWS : activeTerrainLayout.kingdomGridRows;

  if (isWater) {
    const waveFrame = Math.floor(tick / 20 + gx + gy) % 3;
    const topLand = gy > 0 && !checkWater(gx, gy - 1);
    const botLand = gy < maxRows - 1 && !checkWater(gx, gy + 1);
    const leftLand = gx > 0 && !checkWater(gx - 1, gy);
    const rightLand = gx < maxCols - 1 && !checkWater(gx + 1, gy);

    const key = `water_${isPlainsStageMode ? 's' : isManorMode ? 'm' : 'k'}_${(gx + gy) % 2}_${waveFrame}_${topLand ? 1 : 0}${botLand ? 1 : 0}${leftLand ? 1 : 0}${rightLand ? 1 : 0}_sn${activeSnowLevel}`;
    const tileCanvas = getCachedSprite(key, TILE_SIZE, TILE_SIZE, (tCtx) => {
      // Deep water base
      px(
        tCtx,
        0,
        0,
        32,
        32,
        activeSnowLevel === 2
          ? (gx + gy) % 2 === 0
            ? '#1e3a8a'
            : '#172554'
          : (gx + gy) % 2 === 0
            ? '#1b4399'
            : '#173b87'
      );
      // Dithered mid-water texture
      px(tCtx, 2, 2, 28, 28, activeSnowLevel === 2 ? '#1d4ed8' : '#2252b5');
      px(tCtx, 4, 4, 24, 24, activeSnowLevel === 2 ? '#2563eb' : '#295ec7');

      // Animated pixel ripples & specular highlights
      const shift = waveFrame * 2;
      px(tCtx, 5 + shift, 8, 7, 1, '#60a5fa');
      px(tCtx, 6 + shift, 9, 4, 1, '#bae6fd');
      px(tCtx, 18 - shift, 19, 8, 1, '#60a5fa');
      px(tCtx, 20 - shift, 20, 4, 1, '#bae6fd');
      px(tCtx, 9 + shift, 26, 6, 1, '#3b82f6');

      if (activeSnowLevel === 2) {
        // Băng tuyết nổi nhẹ trên mặt nước khi Bão Tuyết
        px(tCtx, 11, 13, 5, 2, '#e0f2fe');
        px(tCtx, 12, 13, 3, 1, '#ffffff');
      }

      // Shoreline foam & shallow banks (Phủ băng tuyết trắng ven bờ khi có tuyết)
      const bankColor =
        activeSnowLevel === 2
          ? '#f8fafc'
          : activeSnowLevel === 1
            ? '#cbd5e1'
            : '#a16207';
      const rimColor = activeSnowLevel >= 1 ? '#ffffff' : '#fef08a';
      if (topLand) {
        px(tCtx, 0, 0, 32, 2, bankColor);
        px(tCtx, 0, 2, 32, 1, rimColor);
        px(tCtx, 0, 3, 32, 2, '#93c5fd');
      }
      if (botLand) {
        px(tCtx, 0, 30, 32, 2, bankColor);
        px(tCtx, 0, 29, 32, 1, '#93c5fd');
      }
      if (leftLand) {
        px(tCtx, 0, 0, 2, 32, bankColor);
        px(tCtx, 2, 0, 1, 32, '#93c5fd');
      }
      if (rightLand) {
        px(tCtx, 30, 0, 2, 32, bankColor);
        px(tCtx, 29, 0, 1, 32, '#93c5fd');
      }
    });

    ctx.drawImage(tileCanvas, x, y);
    return;
  }

  // Nếu là vành đai Đá Tảng lót bao quanh hồ nước nhỏ trong Trang Viên hoặc Màn Chơi có bật GROUND_MANOR_STONE
  const isStoneRing = isPlainsStageMode
    ? activeTerrainLayout.stageStoneRingTiles.has(`${gx},${gy}`)
    : isManorMode && isManorStoneRingTile(gx, gy);
  if (isStoneRing) {
    const stoneKey = `manor_pond_stone_${(gx + gy) % 3}_sn${activeSnowLevel}`;
    const stoneTile = getCachedSprite(stoneKey, TILE_SIZE, TILE_SIZE, (tCtx) => {
      const isEven = (gx + gy) % 2 === 0;
      px(
        tCtx,
        0,
        0,
        32,
        32,
        activeSnowLevel === 2
          ? isEven
            ? '#e2e8f0'
            : '#cbd5e1'
          : activeSnowLevel === 1
            ? isEven
              ? '#4b6b50'
              : '#3f5e44'
            : isEven
              ? '#2c5e27'
              : '#265322'
      );
      // Lót đá tảng lớn & cuội trắng xám bao quanh bờ hồ
      px(tCtx, 2, 3, 13, 11, '#292524');
      px(tCtx, 3, 4, 11, 9, '#78716c');
      px(tCtx, 4, 5, 8, 5, activeSnowLevel >= 1 ? '#f8fafc' : '#d6d3d1');
      px(tCtx, 16, 4, 13, 12, '#1c1917');
      px(tCtx, 17, 5, 11, 10, '#a8a29e');
      px(tCtx, 18, 6, 7, 5, activeSnowLevel >= 1 ? '#ffffff' : '#e7e5e4');
      px(tCtx, 4, 16, 12, 13, '#1c1917');
      px(tCtx, 5, 17, 10, 11, '#a8a29e');
      px(tCtx, 6, 18, 6, 6, activeSnowLevel >= 1 ? '#ffffff' : '#f5f5f4');
      px(tCtx, 17, 18, 12, 11, '#292524');
      px(tCtx, 18, 19, 10, 9, '#78716c');
      px(tCtx, 19, 20, 6, 5, activeSnowLevel >= 1 ? '#f8fafc' : '#d6d3d1');
      if (activeSnowLevel === 2) {
        // Tuyết phủ dày trên đỉnh đá tảng
        px(tCtx, 3, 3, 11, 4, '#ffffff');
        px(tCtx, 17, 4, 11, 4, '#ffffff');
        px(tCtx, 5, 16, 10, 4, '#ffffff');
        px(tCtx, 18, 18, 10, 4, '#ffffff');
      } else {
        // Rêu xanh xen kẽ đá tảng
        px(tCtx, 14, 14, 3, 3, '#4ade80');
        px(tCtx, 2, 14, 2, 2, '#22c55e');
      }
    });
    ctx.drawImage(stoneTile, x, y);
    return;
  }

  const stageKeyForGrass = isPlainsStageMode
    ? activeTerrainLayout.activeStageKey
    : isManorMode
    ? 'map_manor_default'
    : 'map_kingdom_default';
  const allowedSeeds = getAllowedGrassSeedsForStageKey(stageKeyForGrass);
  const invY = isPlainsStageMode || isManorMode ? gy : maxRows - 1 - gy;
  const rawHash = gx * 37 + invY * 17 + activeTerrainLayout.grassSeedSalt;
  const seed = allowedSeeds[Math.abs(rawHash) % allowedSeeds.length];

  const road = isPlainsStageMode
    ? activeTerrainLayout.stageRoadTiles.has(`${gx},${gy}`)
    : isRoadTile(gx, gy, isManorMode);
  const key = `land_${(gx + gy) % 2}_${seed}_${road ? 1 : 0}_sn${activeSnowLevel}`;

  const tileCanvas = getCachedSprite(key, TILE_SIZE, TILE_SIZE, (tCtx) => {
    const isEven = (gx + gy) % 2 === 0;
    // Rich 16-bit meadow palette (Chuyển sang thảm tuyết trắng khi Bão Tuyết hoặc phủ sương tuyết khi Tuyết Rơi Nhẹ)
    if (activeSnowLevel === 2) {
      px(tCtx, 0, 0, 32, 32, isEven ? '#e2e8f0' : '#dbe4ef');
      px(tCtx, 2, 2, 12, 9, '#f1f5f9');
      px(tCtx, 16, 14, 13, 11, '#f8fafc');
      px(tCtx, 4, 20, 10, 8, '#f1f5f9');
      px(tCtx, 18, 4, 10, 7, '#ffffff');
      px(tCtx, 7, 11, 6, 4, '#cbd5e1');
      // Vài ngọn cỏ đông lạnh lấp ló dưới lớp tuyết dày
      if (seed % 2 === 0) {
        px(tCtx, 8, 9, 2, 2, '#64748b');
        px(tCtx, 22, 21, 2, 2, '#475569');
      } else {
        px(tCtx, 19, 7, 2, 2, '#64748b');
        px(tCtx, 11, 23, 2, 2, '#475569');
      }
    } else {
      px(tCtx, 0, 0, 32, 32, isEven ? '#2c5e27' : '#265322');

      // Subtle pixel dithering corners
      px(tCtx, 1, 1, 2, 1, '#336b2d');
      px(tCtx, 28, 3, 2, 1, '#1e441b');
      px(tCtx, 3, 28, 2, 1, '#1e441b');
      px(tCtx, 26, 26, 3, 1, '#336b2d');

      // Grass tufts, wildflowers & pebbles
      if (seed === 0) {
        px(tCtx, 6, 8, 1, 3, '#1a3a16');
        px(tCtx, 7, 7, 1, 4, '#448c3b');
        px(tCtx, 8, 9, 1, 2, '#5cb84f');
        px(tCtx, 22, 20, 3, 2, '#1a3a16');
        px(tCtx, 22, 19, 1, 1, '#facc15');
        px(tCtx, 23, 18, 1, 1, '#fef08a');
        px(tCtx, 24, 19, 1, 1, '#f59e0b');
      } else if (seed === 1) {
        px(tCtx, 18, 6, 1, 3, '#1a3a16');
        px(tCtx, 19, 5, 1, 4, '#448c3b');
        px(tCtx, 20, 7, 1, 2, '#5cb84f');
        px(tCtx, 9, 22, 4, 2, '#1e441b');
        px(tCtx, 10, 21, 2, 1, '#3d7d35');
      } else if (seed === 2) {
        px(tCtx, 8, 18, 1, 3, '#1e441b');
        px(tCtx, 9, 17, 1, 4, '#448c3b');
        px(tCtx, 23, 11, 3, 2, '#1e441b');
        px(tCtx, 23, 10, 2, 2, '#ef4444');
        px(tCtx, 24, 10, 1, 1, '#fca5a5');
      } else if (seed === 3) {
        px(tCtx, 14, 14, 4, 3, '#1a3a16');
        px(tCtx, 14, 13, 3, 2, '#78716c');
        px(tCtx, 15, 13, 1, 1, '#a8a29e');
      } else if (seed === 4) {
        px(tCtx, 12, 10, 1, 3, '#3d7d35');
        px(tCtx, 13, 9, 1, 4, '#5cb84f');
        px(tCtx, 20, 24, 2, 2, '#3b82f6');
        px(tCtx, 21, 24, 1, 1, '#93c5fd');
      } else if (seed === 5) {
        px(tCtx, 5, 24, 1, 3, '#3d7d35');
        px(tCtx, 6, 23, 1, 4, '#5cb84f');
        px(tCtx, 25, 8, 1, 3, '#3d7d35');
      }

      if (activeSnowLevel === 1) {
        // Tuyết rơi nhẹ: Các mảng tuyết trắng mỏng đọng rải rác trên thảm cỏ
        px(tCtx, 3 + (seed % 3) * 2, 4, 7, 4, '#cbd5e1');
        px(tCtx, 4 + (seed % 3) * 2, 4, 5, 3, '#f8fafc');
        px(tCtx, 19 - (seed % 2) * 3, 15, 8, 5, '#cbd5e1');
        px(tCtx, 20 - (seed % 2) * 3, 15, 6, 3, '#f8fafc');
        px(tCtx, 8, 25 - (seed % 3), 6, 3, '#e2e8f0');
        px(tCtx, 9, 25 - (seed % 3), 4, 2, '#ffffff');
      }
    }

    // Cobblestone Royal Road with 3D bevels & mortar lines
    if (road) {
      // Dirt border shoulder
      px(
        tCtx,
        1,
        1,
        30,
        30,
        activeSnowLevel === 2
          ? '#cbd5e1'
          : activeSnowLevel === 1
            ? '#64748b'
            : '#4a3525'
      );
      px(
        tCtx,
        2,
        2,
        28,
        28,
        activeSnowLevel === 2 ? '#94a3b8' : '#292524'
      );

      const stones = [
        [3, 3, 8, 6, '#78716c', '#a8a29e', '#57534e'],
        [12, 3, 9, 6, '#6b6560', '#9ca3af', '#44403c'],
        [22, 3, 7, 6, '#78716c', '#a8a29e', '#57534e'],
        [3, 10, 6, 7, '#6b6560', '#a8a29e', '#44403c'],
        [10, 10, 11, 7, '#78716c', '#d6d3d1', '#57534e'],
        [22, 10, 7, 7, '#57534e', '#78716c', '#44403c'],
        [3, 18, 10, 6, '#78716c', '#a8a29e', '#57534e'],
        [14, 18, 8, 6, '#6b6560', '#a8a29e', '#44403c'],
        [23, 18, 6, 6, '#78716c', '#d6d3d1', '#57534e'],
        [3, 25, 7, 4, '#57534e', '#78716c', '#44403c'],
        [11, 25, 10, 4, '#78716c', '#a8a29e', '#57534e'],
        [22, 25, 7, 4, '#6b6560', '#a8a29e', '#44403c'],
      ] as const;

      for (const [sx, sy, sw, sh, mid, hi, lo] of stones) {
        px(tCtx, sx, sy, sw, sh, lo);
        px(
          tCtx,
          sx,
          sy,
          sw - 1,
          sh - 1,
          activeSnowLevel === 2 ? '#cbd5e1' : mid
        );
        px(
          tCtx,
          sx,
          sy,
          sw - 2,
          activeSnowLevel === 2 ? Math.max(2, sh - 3) : 1,
          activeSnowLevel >= 1 ? '#f8fafc' : hi
        );
        px(tCtx, sx, sy, 1, sh - 2, activeSnowLevel >= 1 ? '#f8fafc' : hi);
      }
      if (activeSnowLevel === 2) {
        // Tuyết phủ trắng dày hai bên lề đường đá
        px(tCtx, 1, 1, 30, 3, '#f8fafc');
        px(tCtx, 1, 28, 30, 3, '#f1f5f9');
      }
    }
  });

  ctx.drawImage(tileCanvas, x, y);
}

/**
 * Vẽ từng ô đất trên Map Showroom 30x30:
 * - Nếu có `variantOverride` (hàng 1: Ô Đất & Texture Địa Hình), vẽ đúng mẫu texture đó.
 * - Nếu không có `variantOverride`, vẽ nền cỏ đồng bằng hoặc đường dẫn phân khu Showroom.
 */
export function drawShowroomGroundTile(
  ctx: CanvasRenderingContext2D,
  gx: number,
  gy: number,
  tick: number,
  variantOverride?: GroundTextureVariantId,
  isCategoryAisle = false
) {
  const x = gx * TILE_SIZE;
  const y = gy * TILE_SIZE;

  if (variantOverride === 'TEX_RIVER_WATER') {
    const waveFrame = Math.floor(tick / 20 + gx + gy) % 3;
    const key = `showroom_water_${(gx + gy) % 2}_${waveFrame}`;
    const tileCanvas = getCachedSprite(key, TILE_SIZE, TILE_SIZE, (tCtx) => {
      px(tCtx, 0, 0, 32, 32, (gx + gy) % 2 === 0 ? '#1b4399' : '#173b87');
      px(tCtx, 2, 2, 28, 28, '#2252b5');
      px(tCtx, 4, 4, 24, 24, '#295ec7');
      const shift = waveFrame * 2;
      px(tCtx, 5 + shift, 8, 7, 1, '#60a5fa');
      px(tCtx, 6 + shift, 9, 4, 1, '#bae6fd');
      px(tCtx, 18 - shift, 19, 8, 1, '#60a5fa');
      px(tCtx, 20 - shift, 20, 4, 1, '#bae6fd');
      px(tCtx, 9 + shift, 26, 6, 1, '#3b82f6');
      // Viền bờ cát xung quanh mẫu ô nước để nhìn rõ trong Showroom
      px(tCtx, 0, 0, 32, 2, '#a16207');
      px(tCtx, 0, 2, 32, 1, '#fef08a');
      px(tCtx, 0, 30, 32, 2, '#a16207');
      px(tCtx, 0, 0, 2, 32, '#a16207');
      px(tCtx, 30, 0, 2, 32, '#a16207');
    });
    ctx.drawImage(tileCanvas, x, y);
    return;
  }

  if (variantOverride === 'TEX_POND_BOULDER') {
    const stoneKey = `manor_pond_stone_${(gx + gy) % 3}`;
    const stoneTile = getCachedSprite(stoneKey, TILE_SIZE, TILE_SIZE, (tCtx) => {
      const isEven = (gx + gy) % 2 === 0;
      px(tCtx, 0, 0, 32, 32, isEven ? '#2c5e27' : '#265322');
      px(tCtx, 2, 3, 13, 11, '#292524');
      px(tCtx, 3, 4, 11, 9, '#78716c');
      px(tCtx, 4, 5, 8, 5, '#d6d3d1');
      px(tCtx, 16, 4, 13, 12, '#1c1917');
      px(tCtx, 17, 5, 11, 10, '#a8a29e');
      px(tCtx, 18, 6, 7, 5, '#e7e5e4');
      px(tCtx, 4, 16, 12, 13, '#1c1917');
      px(tCtx, 5, 17, 10, 11, '#a8a29e');
      px(tCtx, 6, 18, 6, 6, '#f5f5f4');
      px(tCtx, 17, 18, 12, 11, '#292524');
      px(tCtx, 18, 19, 10, 9, '#78716c');
      px(tCtx, 19, 20, 6, 5, '#d6d3d1');
      px(tCtx, 14, 14, 3, 3, '#4ade80');
      px(tCtx, 2, 14, 2, 2, '#22c55e');
    });
    ctx.drawImage(stoneTile, x, y);
    return;
  }

  let seed = 5;
  let road = isCategoryAisle;
  if (variantOverride === 'TEX_ROYAL_ROAD') {
    road = true;
    seed = 5;
  } else if (variantOverride === 'TEX_GRASS_BUTTERCUP') {
    seed = 0;
    road = false;
  } else if (variantOverride === 'TEX_GRASS_LUSH') {
    seed = 1;
    road = false;
  } else if (variantOverride === 'TEX_GRASS_POPPY') {
    seed = 2;
    road = false;
  } else if (variantOverride === 'TEX_GRASS_PEBBLE') {
    seed = 3;
    road = false;
  } else if (variantOverride === 'TEX_GRASS_BLUEBELL') {
    seed = 4;
    road = false;
  } else if (variantOverride === 'TEX_GRASS_MEADOW') {
    seed = 5;
    road = false;
  } else {
    seed = (gx * 37 + gy * 17) % 8;
  }

  const key = `land_${(gx + gy) % 2}_${seed}_${road ? 1 : 0}`;
  const tileCanvas = getCachedSprite(key, TILE_SIZE, TILE_SIZE, (tCtx) => {
    const isEven = (gx + gy) % 2 === 0;
    px(tCtx, 0, 0, 32, 32, isEven ? '#2c5e27' : '#265322');
    px(tCtx, 1, 1, 2, 1, '#336b2d');
    px(tCtx, 28, 3, 2, 1, '#1e441b');
    px(tCtx, 3, 28, 2, 1, '#1e441b');
    px(tCtx, 26, 26, 3, 1, '#336b2d');

    if (seed === 0) {
      px(tCtx, 6, 8, 1, 3, '#1a3a16');
      px(tCtx, 7, 7, 1, 4, '#448c3b');
      px(tCtx, 8, 9, 1, 2, '#5cb84f');
      px(tCtx, 22, 20, 3, 2, '#1a3a16');
      px(tCtx, 22, 19, 1, 1, '#facc15');
      px(tCtx, 23, 18, 1, 1, '#fef08a');
      px(tCtx, 24, 19, 1, 1, '#f59e0b');
    } else if (seed === 1) {
      px(tCtx, 18, 6, 1, 3, '#1a3a16');
      px(tCtx, 19, 5, 1, 4, '#448c3b');
      px(tCtx, 20, 7, 1, 2, '#5cb84f');
      px(tCtx, 9, 22, 4, 2, '#1e441b');
      px(tCtx, 10, 21, 2, 1, '#3d7d35');
    } else if (seed === 2) {
      px(tCtx, 8, 18, 1, 3, '#1e441b');
      px(tCtx, 9, 17, 1, 4, '#448c3b');
      px(tCtx, 23, 11, 3, 2, '#1e441b');
      px(tCtx, 23, 10, 2, 2, '#ef4444');
      px(tCtx, 24, 10, 1, 1, '#fca5a5');
    } else if (seed === 3) {
      px(tCtx, 14, 14, 4, 3, '#1a3a16');
      px(tCtx, 14, 13, 3, 2, '#78716c');
      px(tCtx, 15, 13, 1, 1, '#a8a29e');
    } else if (seed === 4) {
      px(tCtx, 12, 10, 1, 3, '#3d7d35');
      px(tCtx, 13, 9, 1, 4, '#5cb84f');
      px(tCtx, 20, 24, 2, 2, '#3b82f6');
      px(tCtx, 21, 24, 1, 1, '#93c5fd');
    } else if (seed === 5) {
      px(tCtx, 5, 24, 1, 3, '#3d7d35');
      px(tCtx, 6, 23, 1, 4, '#5cb84f');
      px(tCtx, 25, 8, 1, 3, '#3d7d35');
    }

    if (road) {
      px(tCtx, 1, 1, 30, 30, '#4a3525');
      px(tCtx, 2, 2, 28, 28, '#292524');
      const stones = [
        [3, 3, 8, 6, '#78716c', '#a8a29e', '#57534e'],
        [12, 3, 9, 6, '#6b6560', '#9ca3af', '#44403c'],
        [22, 3, 7, 6, '#78716c', '#a8a29e', '#57534e'],
        [3, 10, 6, 7, '#6b6560', '#a8a29e', '#44403c'],
        [10, 10, 11, 7, '#78716c', '#d6d3d1', '#57534e'],
        [22, 10, 7, 7, '#57534e', '#78716c', '#44403c'],
        [3, 18, 10, 6, '#78716c', '#a8a29e', '#57534e'],
        [14, 18, 8, 6, '#6b6560', '#a8a29e', '#44403c'],
        [23, 18, 6, 6, '#78716c', '#d6d3d1', '#57534e'],
        [3, 25, 7, 4, '#57534e', '#78716c', '#44403c'],
        [11, 25, 10, 4, '#78716c', '#a8a29e', '#57534e'],
        [22, 25, 7, 4, '#6b6560', '#a8a29e', '#44403c'],
      ] as const;

      for (const [sx, sy, sw, sh, mid, hi, lo] of stones) {
        px(tCtx, sx, sy, sw, sh, lo);
        px(tCtx, sx, sy, sw - 1, sh - 1, mid);
        px(tCtx, sx, sy, sw - 2, 1, hi);
        px(tCtx, sx, sy, 1, sh - 2, hi);
      }
    }
  });

  ctx.drawImage(tileCanvas, x, y);
}

// ============================================================================
// HỆ THỐNG NGUỒN SÁNG ĐIỂM (CAMPFIRE), BÓNG PIXEL RĂNG CƯA KÉO DÀI THEO TRỤC
// & HIGHLIGHT NHẸ 1 PHẦN CƠ THỂ / VẬT THỂ HƯỚNG VỀ NGUỒN SÁNG
// ============================================================================
export interface ActivePointLightSource {
  id: string;
  worldX: number;
  worldY: number;
  isoX: number;
  isoY: number;
  worldRadius: number;
  intensity: number;
}

interface DirectionalLightSample {
  influence: number;
  ux: number; // Vector đơn vị trên màn hình hướng NGƯỢC về phía nguồn sáng (hướng đổ bóng)
  uy: number;
  toLightX: number; // Vector đơn vị hướng VỀ PHÍA nguồn sáng (hướng nhận highlight)
  toLightY: number;
  dist: number;
  worldRadius: number;
}

let activePointLights: ActivePointLightSource[] = [];
let activeWorldToIsoMapper:
  | ((wx: number, wy: number) => { x: number; y: number })
  | null = null;

export function setActivePointLights(
  lights: ActivePointLightSource[],
  worldToIsoFn?: (wx: number, wy: number) => { x: number; y: number }
) {
  activePointLights = lights;
  if (worldToIsoFn) {
    activeWorldToIsoMapper = worldToIsoFn;
  }
}

function snap2(v: number): number {
  return Math.round(v / 2) * 2;
}

function getDirectionalLightEffectAt(
  worldX?: number,
  worldY?: number
): DirectionalLightSample | null {
  if (
    worldX === undefined ||
    worldY === undefined ||
    activePointLights.length === 0
  ) {
    return null;
  }

  let bestLight: ActivePointLightSource | null = null;
  let bestInfluence = 0;
  let bestDist = 0;

  for (let i = 0; i < activePointLights.length; i++) {
    const l = activePointLights[i];
    const d = Math.hypot(worldX - l.worldX, worldY - l.worldY);
    if (d < l.worldRadius && d > 1) {
      const inf = Math.pow(1 - d / l.worldRadius, 1.2) * l.intensity;
      if (inf > bestInfluence) {
        bestInfluence = inf;
        bestLight = l;
        bestDist = d;
      }
    }
  }

  if (!bestLight || bestInfluence <= 0.015) return null;

  let dxAway = worldX - bestLight.worldX;
  let dyAway = worldY - bestLight.worldY;
  if (activeWorldToIsoMapper) {
    const entIso = activeWorldToIsoMapper(worldX, worldY);
    dxAway = entIso.x - bestLight.isoX;
    dyAway = entIso.y - bestLight.isoY;
  }

  const len = Math.hypot(dxAway, dyAway) || 1;
  const ux = dxAway / len;
  const uy = dyAway / len;

  return {
    influence: Math.min(1, bestInfluence),
    ux,
    uy,
    toLightX: -ux,
    toLightY: -uy,
    dist: bestDist,
    worldRadius: bestLight.worldRadius,
  };
}

/**
 * Vẽ bóng đổ dưới chân mọi đơn vị, công trình, cây cối, trang trí theo phong cách
 * Pixel Art bậc thang răng cưa (không dùng hình elip trơn tròn).
 * Khi nằm trong tầm sáng của Lửa Trại, bóng tự động xoay và kéo dài về hướng ngược với Lửa Trại
 * dọc theo trục đường thẳng nối từ nguồn sáng qua chân thực thể.
 * Đảm bảo CHỈ VẼ 1 LỚP BÓNG DUY NHẤT (gom theo từng dòng scanline 2px không chồng đè) để bóng không bao giờ bị đậm đen khi lại gần lửa.
 */
const shadowScanMinX = new Int16Array(64);
const shadowScanMaxX = new Int16Array(64);

export function drawSteppedPixelShadow(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  baseAlpha = 0.42,
  worldX?: number,
  worldY?: number
) {
  const light = getDirectionalLightEffectAt(worldX, worldY);
  const bx = snap2(cx);
  const by = snap2(cy);

  ctx.save();

  if (!light) {
    // Bóng pixel bậc thang răng cưa chuẩn khi ở ngoài tầm sáng (1 lớp duy nhất, các dải Y tách biệt không đè lên nhau)
    const wCore = Math.max(4, snap2(rx * 2));
    const hCore = Math.max(2, snap2(ry * 0.72));
    const wMid = Math.max(4, snap2(rx * 1.56));
    const hMid = Math.max(4, snap2(ry * 1.42));
    const wOuter = Math.max(2, snap2(rx * 1.02));
    const hOuter = Math.max(6, snap2(ry * 1.98));

    const yCoreTop = by - hCore / 2;
    const yCoreBot = by + hCore / 2;
    const yMidTop = by - hMid / 2;
    const yMidBot = by + hMid / 2;
    const yOutTop = by - hOuter / 2;
    const yOutBot = by + hOuter / 2;

    ctx.fillStyle = `rgba(0, 0, 0, ${(baseAlpha * 0.85).toFixed(3)})`;
    // Dải trung tâm (rộng nhất)
    ctx.fillRect(bx - wCore / 2, yCoreTop, wCore, hCore);
    // Dải bậc thang giữa (trên & dưới, không đè vào dải trung tâm)
    if (yCoreTop > yMidTop) {
      ctx.fillRect(bx - wMid / 2, yMidTop, wMid, yCoreTop - yMidTop);
    }
    if (yMidBot > yCoreBot) {
      ctx.fillRect(bx - wMid / 2, yCoreBot, wMid, yMidBot - yCoreBot);
    }
    // Dải bậc thang ngoài cùng (trên & dưới, không đè vào dải giữa)
    if (yMidTop > yOutTop) {
      ctx.fillRect(bx - wOuter / 2, yOutTop, wOuter, yMidTop - yOutTop);
    }
    if (yOutBot > yMidBot) {
      ctx.fillRect(bx - wOuter / 2, yMidBot, wOuter, yOutBot - yMidBot);
    }
    ctx.restore();
    return;
  }

  // Khi tiến vào tầm sáng Lửa Trại:
  // - Giữ nguyên kích thước bóng gốc dưới chân (tuyệt đối không bung to / phình ngang dọc).
  // - Chỉ kéo dài bóng thuôn dần theo trục (ux, uy) ngược hướng nguồn sáng.
  // - Tăng độ đậm của bóng khi bước vào nguồn sáng (vẫn gộp 1 lớp scanline duy nhất).
  const inf = light.influence;
  const stretchLen = rx * (inf * 1.95);
  const steps = 7;

  const baseMinY = snap2(cy - ry * 2 - Math.abs(light.uy) * stretchLen - 8);
  for (let i = 0; i < 64; i++) {
    shadowScanMinX[i] = 32767;
    shadowScanMaxX[i] = -32768;
  }

  const addBoxToScanlines = (
    boxX: number,
    boxY: number,
    boxW: number,
    boxH: number
  ) => {
    const x1 = snap2(boxX);
    const x2 = x1 + Math.max(2, snap2(boxW));
    const y1 = snap2(boxY);
    const y2 = y1 + Math.max(2, snap2(boxH));
    for (let py = y1; py < y2; py += 2) {
      const idx = (py - baseMinY) >> 1;
      if (idx >= 0 && idx < 64) {
        if (x1 < shadowScanMinX[idx]) shadowScanMinX[idx] = x1;
        if (x2 > shadowScanMaxX[idx]) shadowScanMaxX[idx] = x2;
      }
    }
  };

  const wOuterBase = Math.max(4, snap2(rx * 2));
  const hOuterBase = Math.max(2, snap2(ry * 0.85));
  const wMidBase = Math.max(4, snap2(rx * 1.48));
  const hMidBase = Math.max(2, snap2(ry * 1.48));
  const wCoreBase = Math.max(2, snap2(rx * 0.92));
  const hCoreBase = Math.max(2, snap2(ry * 1.98));

  for (let s = 0; s <= steps; s++) {
    const t = s / steps;
    const sx = snap2(cx + light.ux * (t * stretchLen));
    const sy = snap2(cy + light.uy * (t * stretchLen * 0.82));
    // Tại s = 0 (ngay dưới chân đơn vị), taper = 1 -> giữ nguyên 100% khung bóng chuẩn bình thường, không bung to
    const taper = s === 0 ? 1 : Math.max(0.28, 1 - t * 0.62);

    const wOuter = Math.max(2, snap2(wOuterBase * taper));
    const hOuter = Math.max(2, snap2(hOuterBase * taper));
    const wMid = Math.max(2, snap2(wMidBase * taper));
    const hMid = Math.max(2, snap2(hMidBase * taper));
    const wCore = Math.max(2, snap2(wCoreBase * taper));
    const hCore = Math.max(2, snap2(hCoreBase * taper));

    addBoxToScanlines(sx - wOuter / 2, sy - hOuter / 2, wOuter, hOuter);
    addBoxToScanlines(sx - wMid / 2, sy - hMid / 2, wMid, hMid);
    addBoxToScanlines(sx - wCore / 2, sy - hCore / 2, wCore, hCore);
  }

  // Tăng độ đậm của bóng nhân vật khi bước vào nguồn sáng
  const singleLayerAlpha = Math.min(0.84, baseAlpha * (0.98 + inf * 0.56));
  ctx.fillStyle = `rgba(0, 0, 0, ${singleLayerAlpha.toFixed(3)})`;
  for (let i = 0; i < 64; i++) {
    const minX = shadowScanMinX[i];
    const maxX = shadowScanMaxX[i];
    if (maxX > minX) {
      ctx.fillRect(minX, baseMinY + (i << 1), maxX - minX, 2);
    }
  }

  ctx.restore();
}

/**
 * Highlight ánh sáng lên 1 phần cơ thể đơn vị (Anh Hùng, Quân Lính, Nông Dân, Quái Địch) khi đứng gần nguồn sáng:
 * - Tăng cường độ highlight thêm ~30% để nổi bật hiệu ứng ánh lửa hắt lên người.
 * - 1 phần viền ngoài của đơn vị ở phía hướng về nguồn sáng mang sắc CAM ẤM (#f97316 / #fb923c) tạo cảm giác phản chiếu ánh lửa chân thực.
 * - Phần bên trong cạnh viền cam: nếu quay mặt vào lửa thì highlight 1 phần mặt trước & thân trước; nếu quay lưng lại thì highlight phần sau đầu & thân sau.
 */
function drawUnitDirectionalRimHighlight(
  ctx: CanvasRenderingContext2D,
  rx: number,
  ry: number,
  facing: 'LEFT' | 'RIGHT',
  bob: number,
  unitScale: 'SMALL' | 'NORMAL' | 'LARGE',
  worldX?: number,
  worldY?: number
) {
  const light = getDirectionalLightEffectAt(worldX, worldY);
  if (!light || light.dist > light.worldRadius * 0.88) return;

  const rimFactor = Math.max(
    0,
    (1 - light.dist / (light.worldRadius * 0.88)) * light.influence
  );
  if (rimFactor <= 0.025) return;

  // Phía nào của đơn vị đang hướng về nguồn sáng (+1: mép phải, -1: mép trái)
  const litSide = light.toLightX >= 0 ? 1 : -1;
  const isFacingLight =
    (facing === 'RIGHT' && litSide > 0) || (facing === 'LEFT' && litSide < 0);

  // Tăng ~30% độ sáng highlight + thêm lớp viền màu cam phản chiếu ánh lửa
  const orangeRimAlpha = Math.min(0.72, rimFactor * 0.74);
  const warmGoldAlpha = Math.min(0.56, rimFactor * 0.58);
  const softAmberAlpha = Math.min(0.36, rimFactor * 0.38);

  const hOffset =
    unitScale === 'LARGE' ? -18 : unitScale === 'NORMAL' ? -15 : -13;
  const bodyOffset =
    unitScale === 'LARGE' ? -8 : unitScale === 'NORMAL' ? -6 : -5;
  const sideDist =
    unitScale === 'LARGE' ? 6 : unitScale === 'NORMAL' ? 5 : 4;

  ctx.save();
  if (isFacingLight) {
    // QUAY MẶT VÀO NGUỒN SÁNG:
    // 1. Viền ngoài cùng màu cam lửa (#f97316) dọc theo mép đầu, vai/ngực và hông phía đón sáng
    const rimHeadX = Math.round(rx + litSide * sideDist);
    const rimBodyX = Math.round(rx + litSide * (sideDist + 1));
    const faceY = Math.round(ry + hOffset + bob);
    const chestY = Math.round(ry + bodyOffset + bob);

    ctx.fillStyle = `rgba(249, 115, 22, ${orangeRimAlpha.toFixed(3)})`;
    ctx.fillRect(rimHeadX - 1, faceY - 1, 2, 6); // Viền cam phần đầu/mặt
    ctx.fillRect(rimBodyX - 1, chestY, 2, 10); // Viền cam phần thân/vai trước

    // 2. Lớp sáng vàng cam phản chiếu lên 1 phần mặt trước (trán/má/mũi) và ngực trước
    const innerFaceX = rimHeadX - litSide * 2;
    const innerChestX = rimBodyX - litSide * 2;

    ctx.fillStyle = `rgba(254, 240, 138, ${warmGoldAlpha.toFixed(3)})`;
    ctx.fillRect(innerFaceX - 1, faceY, 2, 5);
    ctx.fillRect(innerChestX - 1, chestY + 1, 2, 8);

    ctx.fillStyle = `rgba(251, 146, 60, ${softAmberAlpha.toFixed(3)})`;
    ctx.fillRect(innerFaceX - litSide * 2 - 1, faceY + 1, 2, 4);
    ctx.fillRect(innerChestX - litSide * 2 - 1, chestY + 2, 2, 6);
  } else {
    // QUAY LƯNG LẠI NGUỒN SÁNG:
    // 1. Viền ngoài cùng màu cam lửa (#f97316) dọc theo mép sau đầu/mũ và lưng/áo choàng phía đón sáng
    const rimBackHeadX = Math.round(rx + litSide * (sideDist + 1));
    const rimBackBodyX = Math.round(rx + litSide * (sideDist + 2));
    const backHeadY = Math.round(ry + hOffset - 1 + bob);
    const backBodyY = Math.round(ry + bodyOffset + bob);

    ctx.fillStyle = `rgba(249, 115, 22, ${orangeRimAlpha.toFixed(3)})`;
    ctx.fillRect(rimBackHeadX - 1, backHeadY, 2, 6); // Viền cam sau đầu
    ctx.fillRect(rimBackBodyX - 1, backBodyY, 2, 11); // Viền cam lưng/áo choàng sau

    // 2. Lớp sáng vàng cam hắt nhẹ vào phần sau đầu và thân sau
    const innerBackHeadX = rimBackHeadX - litSide * 2;
    const innerBackBodyX = rimBackBodyX - litSide * 2;

    ctx.fillStyle = `rgba(254, 215, 102, ${warmGoldAlpha.toFixed(3)})`;
    ctx.fillRect(innerBackHeadX - 1, backHeadY + 1, 2, 5);
    ctx.fillRect(innerBackBodyX - 1, backBodyY + 1, 2, 9);

    ctx.fillStyle = `rgba(251, 146, 60, ${softAmberAlpha.toFixed(3)})`;
    ctx.fillRect(innerBackHeadX - litSide * 2 - 1, backHeadY + 1, 2, 4);
    ctx.fillRect(innerBackBodyX - litSide * 2 - 1, backBodyY + 2, 2, 7);
  }
  ctx.restore();
}

/**
 * Highlight nhẹ 1 phần mép cây cối, vật trang trí, mỏ đá hoặc công trình ở phía hướng về nguồn sáng.
 */
function drawObjectDirectionalRimHighlight(
  ctx: CanvasRenderingContext2D,
  tileOriginX: number,
  tileOriginY: number,
  kind: 'TREE' | 'ROCK' | 'BUSH' | 'GRASS' | 'BUILDING',
  worldX?: number,
  worldY?: number,
  sway = 0
) {
  const light = getDirectionalLightEffectAt(worldX, worldY);
  if (!light || light.dist > light.worldRadius * 0.88) return;

  const rimFactor = Math.max(
    0,
    (1 - light.dist / (light.worldRadius * 0.88)) * light.influence
  );
  if (rimFactor <= 0.03) return;

  const litRight = light.toLightX >= 0;
  const edgeAlpha = Math.min(0.36, rimFactor * 0.38);
  const innerAlpha = Math.min(0.2, rimFactor * 0.22);
  const edgeColor = `rgba(254, 240, 138, ${edgeAlpha.toFixed(3)})`;
  const innerColor = `rgba(251, 146, 60, ${innerAlpha.toFixed(3)})`;

  ctx.save();
  if (kind === 'TREE') {
    const s = sway;
    if (litRight) {
      // Mép phải tán lá 3 tầng & thân cây sồi hướng về phía lửa
      px(ctx, tileOriginX / P + 20 + s, tileOriginY / P + 3, 2, 4, edgeColor);
      px(ctx, tileOriginX / P + 23 + s, tileOriginY / P + 7, 2, 6, edgeColor);
      px(ctx, tileOriginX / P + 24 + s, tileOriginY / P + 11, 2, 7, edgeColor);
      px(ctx, tileOriginX / P + 21 + s, tileOriginY / P + 8, 2, 8, innerColor);
      px(ctx, tileOriginX / P + 17, tileOriginY / P + 18, 2, 7, edgeColor);
    } else {
      // Mép trái tán lá 3 tầng & thân cây sồi hướng về phía lửa
      px(ctx, tileOriginX / P + 10 + s, tileOriginY / P + 3, 2, 4, edgeColor);
      px(ctx, tileOriginX / P + 7 + s, tileOriginY / P + 7, 2, 6, edgeColor);
      px(ctx, tileOriginX / P + 6 + s, tileOriginY / P + 11, 2, 7, edgeColor);
      px(ctx, tileOriginX / P + 9 + s, tileOriginY / P + 8, 2, 8, innerColor);
      px(ctx, tileOriginX / P + 13, tileOriginY / P + 18, 2, 7, edgeColor);
    }
  } else if (kind === 'BUSH') {
    if (litRight) {
      px(ctx, tileOriginX / P + 22, tileOriginY / P + 10, 3, 9, edgeColor);
      px(ctx, tileOriginX / P + 19, tileOriginY / P + 11, 3, 8, innerColor);
    } else {
      px(ctx, tileOriginX / P + 6, tileOriginY / P + 10, 3, 9, edgeColor);
      px(ctx, tileOriginX / P + 9, tileOriginY / P + 11, 3, 8, innerColor);
    }
  } else if (kind === 'GRASS') {
    if (litRight) {
      px(ctx, tileOriginX / P + 18, tileOriginY / P + 11, 2, 9, edgeColor);
      px(ctx, tileOriginX / P + 21, tileOriginY / P + 14, 2, 7, innerColor);
    } else {
      px(ctx, tileOriginX / P + 10, tileOriginY / P + 11, 2, 9, edgeColor);
      px(ctx, tileOriginX / P + 8, tileOriginY / P + 14, 2, 7, innerColor);
    }
  } else if (kind === 'ROCK') {
    if (litRight) {
      px(ctx, tileOriginX / P + 18, tileOriginY / P + 9, 3, 8, edgeColor);
      px(ctx, tileOriginX / P + 22, tileOriginY / P + 14, 3, 8, innerColor);
    } else {
      px(ctx, tileOriginX / P + 9, tileOriginY / P + 9, 3, 8, edgeColor);
      px(ctx, tileOriginX / P + 6, tileOriginY / P + 14, 3, 8, innerColor);
    }
  } else if (kind === 'BUILDING') {
    if (litRight) {
      px(ctx, tileOriginX / P + 24, tileOriginY / P + 8, 3, 15, edgeColor);
      px(ctx, tileOriginX / P + 21, tileOriginY / P + 10, 3, 13, innerColor);
    } else {
      px(ctx, tileOriginX / P + 5, tileOriginY / P + 8, 3, 15, edgeColor);
      px(ctx, tileOriginX / P + 8, tileOriginY / P + 10, 3, 13, innerColor);
    }
  }
  ctx.restore();
}

// ============================================================================
// 2. RESOURCE NODES (CACHED 16-BIT STYLE TREES, QUARRIES & GOLD MINES)
// ============================================================================
export function drawResourceNode(
  ctx: CanvasRenderingContext2D,
  node: ResourceNode,
  tick: number
) {
  const x = node.gridX * TILE_SIZE;
  const y = node.gridY * TILE_SIZE;
  const worldX = (node.gridX + 0.5) * TILE_SIZE;
  const worldY = (node.gridY + 0.5) * TILE_SIZE;

  if (node.type === 'TREE') {
    // Bóng pixel răng cưa động dưới gốc cây (kéo dài theo hướng ngược lửa trại khi ở gần nguồn sáng)
    drawSteppedPixelShadow(ctx, x + 32, y + 52, 17, 6, 0.42, worldX, worldY);

    const sway = Math.sin(tick * 0.045 + node.gridX * 2) > 0.45 ? 1 : 0;
    const key = `node_tree_dynsh_${sway}_sn${activeSnowLevel}`;
    const sprite = getCachedSprite(key, TILE_SIZE, TILE_SIZE, (tCtx) => {
      // Gnarled Oak Trunk with bark outline & shading
      px(tCtx, 12, 17, 8, 10, '#1e130c'); // Dark outline
      px(tCtx, 11, 25, 10, 2, '#1e130c'); // Roots outline
      px(tCtx, 13, 18, 6, 8, '#4a2c18'); // Bark base
      px(tCtx, 13, 18, 2, 8, '#7c4d2b'); // Sunlit left bark
      px(tCtx, 15, 20, 1, 5, '#633b1f'); // Bark groove
      px(tCtx, 12, 25, 2, 1, '#7c4d2b'); // Root highlight
      px(tCtx, 18, 25, 2, 1, '#361f10'); // Root shadow

      // Layered Pixel Canopy (3 lush tiers with dark outline & leaf clusters)
      const s = sway;
      // Outer dark foliage silhouette
      px(tCtx, 5 + s, 10, 22, 10, '#0b2915');
      px(tCtx, 7 + s, 5, 18, 14, '#0b2915');
      px(tCtx, 10 + s, 2, 12, 6, '#0b2915');

      // Deep forest shadow tier
      px(tCtx, 6 + s, 11, 20, 8, '#14532d');
      px(tCtx, 8 + s, 6, 16, 12, '#14532d');

      // Mid-tone emerald clusters
      px(tCtx, 7 + s, 9, 18, 8, '#166534');
      px(tCtx, 9 + s, 4, 14, 10, '#15803d');
      px(tCtx, 11 + s, 3, 10, 5, '#16a34a');

      // Sunlit top leaf highlights
      px(tCtx, 11 + s, 3, 8, 3, '#22c55e');
      px(tCtx, 9 + s, 7, 6, 4, '#22c55e');
      px(tCtx, 16 + s, 8, 5, 3, '#22c55e');
      px(tCtx, 12 + s, 3, 4, 2, '#4ade80');
      px(tCtx, 10 + s, 7, 3, 2, '#4ade80');
      px(tCtx, 17 + s, 8, 2, 1, '#86efac');

      // Tuyết phủ lên tán cây và gốc cây theo mức độ Tuyết Rơi Nhẹ (1) hoặc Bão Tuyết (2)
      if (activeSnowLevel === 1) {
        px(tCtx, 10 + s, 2, 12, 2, '#e2e8f0');
        px(tCtx, 11 + s, 2, 10, 1, '#ffffff');
        px(tCtx, 8 + s, 6, 6, 2, '#f8fafc');
        px(tCtx, 18 + s, 6, 5, 2, '#f8fafc');
        px(tCtx, 6 + s, 10, 5, 2, '#e2e8f0');
        px(tCtx, 21 + s, 10, 5, 2, '#e2e8f0');
        px(tCtx, 10, 25, 12, 2, '#f1f5f9');
      } else if (activeSnowLevel === 2) {
        px(tCtx, 10 + s, 2, 12, 4, '#cbd5e1');
        px(tCtx, 10 + s, 2, 12, 3, '#ffffff');
        px(tCtx, 7 + s, 5, 18, 5, '#cbd5e1');
        px(tCtx, 8 + s, 5, 16, 4, '#f8fafc');
        px(tCtx, 9 + s, 5, 14, 2, '#ffffff');
        px(tCtx, 6 + s, 10, 20, 4, '#cbd5e1');
        px(tCtx, 7 + s, 10, 18, 3, '#f8fafc');
        px(tCtx, 8 + s, 13, 4, 2, '#ffffff');
        px(tCtx, 19 + s, 13, 4, 2, '#ffffff');
        px(tCtx, 8, 24, 16, 3, '#cbd5e1');
        px(tCtx, 9, 24, 14, 2, '#ffffff');
      }
    });
    ctx.drawImage(sprite, x, y);
    drawObjectDirectionalRimHighlight(
      ctx,
      x,
      y,
      'TREE',
      worldX,
      worldY,
      sway
    );
  } else if (node.type === 'STONE_DEPOSIT') {
    drawSteppedPixelShadow(ctx, x + 32, y + 50, 22, 6, 0.45, worldX, worldY);
    const sprite = getCachedSprite(
      `node_stone_dynsh_sn${activeSnowLevel}`,
      TILE_SIZE,
      TILE_SIZE,
      (tCtx) => {
        // Dark outline of jagged granite boulders
        px(tCtx, 5, 13, 22, 13, '#1c1917');
        px(tCtx, 8, 8, 15, 17, '#1c1917');
        px(tCtx, 11, 6, 9, 5, '#1c1917');

        // Main boulder faces (3-tone slate/granite)
        px(tCtx, 6, 14, 20, 11, '#44403c');
        px(tCtx, 9, 9, 13, 15, '#57534e');
        px(tCtx, 12, 7, 7, 12, '#78716c');

        // Crisp highlights & rock facets
        px(tCtx, 12, 7, 6, 2, '#d6d3d1');
        px(tCtx, 9, 9, 3, 5, '#a8a29e');
        px(tCtx, 10, 9, 5, 2, '#d6d3d1');
        px(tCtx, 7, 14, 5, 3, '#a8a29e');
        px(tCtx, 19, 14, 5, 10, '#292524'); // Deep right shadow
        px(tCtx, 14, 15, 1, 6, '#292524'); // Rock crack

        if (activeSnowLevel === 1) {
          px(tCtx, 11, 6, 9, 2, '#ffffff');
          px(tCtx, 8, 8, 5, 2, '#f8fafc');
          px(tCtx, 6, 13, 6, 2, '#e2e8f0');
          px(tCtx, 20, 13, 5, 2, '#e2e8f0');
        } else if (activeSnowLevel === 2) {
          px(tCtx, 11, 6, 9, 4, '#ffffff');
          px(tCtx, 8, 8, 15, 4, '#f8fafc');
          px(tCtx, 9, 8, 13, 2, '#ffffff');
          px(tCtx, 6, 13, 20, 4, '#e2e8f0');
          px(tCtx, 7, 13, 18, 2, '#ffffff');
          px(tCtx, 5, 23, 22, 3, '#f1f5f9');
        }
      }
    );
    ctx.drawImage(sprite, x, y);
    drawObjectDirectionalRimHighlight(ctx, x, y, 'ROCK', worldX, worldY);
  } else if (node.type === 'GOLD_VEIN') {
    drawSteppedPixelShadow(ctx, x + 32, y + 50, 22, 6, 0.48, worldX, worldY);
    const sparkle = Math.floor(tick / 12 + node.gridX) % 2;
    const key = `node_gold_dynsh_${sparkle}_sn${activeSnowLevel}`;
    const sprite = getCachedSprite(key, TILE_SIZE, TILE_SIZE, (tCtx) => {
      // Dark ore rock outline
      px(tCtx, 5, 12, 22, 14, '#18130a');
      px(tCtx, 8, 7, 16, 18, '#18130a');
      px(tCtx, 11, 5, 10, 5, '#18130a');

      // Dark ironstone matrix
      px(tCtx, 6, 13, 20, 12, '#3b332b');
      px(tCtx, 9, 8, 14, 16, '#52473d');
      px(tCtx, 12, 6, 8, 10, '#6e5f52');

      // Rich gleaming gold nuggets & veins
      const nuggets = [
        [11, 7, 4, 3],
        [9, 12, 4, 4],
        [16, 10, 5, 4],
        [14, 17, 5, 4],
        [7, 18, 4, 3],
        [21, 16, 3, 4],
      ];
      for (const [nx, ny, nw, nh] of nuggets) {
        px(tCtx, nx, ny, nw, nh, '#b45309');
        px(tCtx, nx, ny, nw - 1, nh - 1, '#f59e0b');
        px(tCtx, nx, ny, Math.max(1, nw - 2), 1, '#fef08a');
      }

      if (activeSnowLevel === 1) {
        px(tCtx, 11, 5, 10, 2, '#ffffff');
        px(tCtx, 8, 7, 5, 2, '#f8fafc');
        px(tCtx, 6, 12, 5, 2, '#e2e8f0');
      } else if (activeSnowLevel === 2) {
        px(tCtx, 11, 5, 10, 3, '#ffffff');
        px(tCtx, 8, 7, 16, 3, '#f8fafc');
        px(tCtx, 6, 12, 8, 3, '#e2e8f0');
        px(tCtx, 19, 12, 7, 3, '#e2e8f0');
        px(tCtx, 5, 23, 22, 3, '#f1f5f9');
      }

      if (sparkle === 0) {
        px(tCtx, 12, 6, 1, 3, '#ffffff');
        px(tCtx, 11, 7, 3, 1, '#ffffff');
        px(tCtx, 18, 11, 1, 1, '#ffffff');
      } else {
        px(tCtx, 10, 12, 1, 3, '#ffffff');
        px(tCtx, 9, 13, 3, 1, '#ffffff');
        px(tCtx, 16, 18, 1, 1, '#ffffff');
      }
    });
    ctx.drawImage(sprite, x, y);
    drawObjectDirectionalRimHighlight(ctx, x, y, 'ROCK', worldX, worldY);
  }
}

// ============================================================================
// 3. BUILDINGS (CACHED 16-BIT MEDIEVAL ARCHITECTURE)
// ============================================================================
export function drawBuilding(
  ctx: CanvasRenderingContext2D,
  b: PlacedBuilding,
  tick: number,
  isSelected: boolean
) {
  const x = b.gridX * TILE_SIZE;
  const y = b.gridY * TILE_SIZE;
  const worldX = (b.gridX + 0.5) * TILE_SIZE;
  const worldY = (b.gridY + 0.5) * TILE_SIZE;

  if (isSelected) {
    ctx.save();
    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 2;
    ctx.strokeRect(x + 2, y + 2, TILE_SIZE - 4, TILE_SIZE - 4);
    ctx.restore();
  }

  if (!b.isConstructed) {
    drawSteppedPixelShadow(ctx, x + 32, y + 52, 24, 6, 0.4, worldX, worldY);
    const scafSprite = getCachedSprite(
      `building_scaffolding_dynsh_sn${activeSnowLevel}`,
      TILE_SIZE,
      TILE_SIZE,
      (tCtx) => {
        // Stone foundation
        px(tCtx, 4, 20, 24, 7, '#1c1917');
        px(tCtx, 5, 21, 22, 5, '#78716c');
        // Timber scaffolding poles
        px(tCtx, 5, 6, 2, 16, '#451a03');
        px(tCtx, 6, 6, 1, 16, '#92400e');
        px(tCtx, 15, 6, 2, 16, '#451a03');
        px(tCtx, 25, 6, 2, 16, '#451a03');
        px(tCtx, 25, 6, 1, 16, '#92400e');
        // Cross planks
        px(tCtx, 3, 10, 26, 2, '#78350f');
        px(
          tCtx,
          3,
          10,
          26,
          1,
          activeSnowLevel >= 1 ? '#f8fafc' : '#d97706'
        );
        px(tCtx, 3, 16, 26, 2, '#78350f');
        px(
          tCtx,
          3,
          16,
          26,
          1,
          activeSnowLevel >= 1 ? '#f8fafc' : '#d97706'
        );
        if (activeSnowLevel === 2) {
          px(tCtx, 5, 20, 22, 2, '#ffffff');
        }
      }
    );
    ctx.drawImage(scafSprite, x, y);

    // Construction progress bar
    px(ctx, b.gridX * 32 + 4, b.gridY * 32 + 2, 24, 4, '#090d16');
    px(
      ctx,
      b.gridX * 32 + 5,
      b.gridY * 32 + 3,
      Math.max(2, Math.round((22 * b.buildProgress) / 100)),
      2,
      '#22c55e'
    );
    return;
  }

  const flagFrame = Math.floor(tick / 10) % 2;

  if (b.type !== 'FARM' && b.type !== 'CAMPFIRE') {
    drawSteppedPixelShadow(ctx, x + 32, y + 53, 25, 6, 0.48, worldX, worldY);
  }

  if (b.type === 'TOWN_HALL') {
    const key = `b_townhall_cottage_dynsh_${flagFrame}_sn${activeSnowLevel}`;
    const sprite = getCachedSprite(key, TILE_SIZE, TILE_SIZE, (tCtx) => {
      // Brick Chimney on Right Side with Warm Smoke Puff
      px(tCtx, 22, 3, 5, 11, '#1c1917');
      px(tCtx, 23, 4, 3, 9, '#991b1b');
      px(tCtx, 23, 4, 1, 9, '#dc2626');
      px(tCtx, 22, 3, 5, 2, '#78716c');
      // Gentle chimney smoke puff
      if (flagFrame === 0) {
        px(tCtx, 24, 1, 3, 2, 'rgba(229,231,235,0.75)');
        px(tCtx, 26, 0, 2, 1, 'rgba(229,231,235,0.5)');
      } else {
        px(tCtx, 23, 0, 3, 2, 'rgba(229,231,235,0.75)');
        px(tCtx, 25, 2, 2, 1, 'rgba(229,231,235,0.5)');
      }

      // Cozy Half-Timbered Cottage Body (Plaster & Oak Beams + Stone Base)
      px(tCtx, 4, 12, 24, 16, '#1c1917');
      // Stone foundation base
      px(tCtx, 5, 23, 22, 4, '#57534e');
      px(tCtx, 6, 24, 20, 2, '#78716c');
      // Warm cream plaster walls
      px(tCtx, 5, 13, 22, 10, '#f5f5f4');
      px(tCtx, 6, 13, 20, 9, '#fef3c7');
      // Oak timber framing beams
      px(tCtx, 5, 13, 2, 11, '#451a03');
      px(tCtx, 25, 13, 2, 11, '#451a03');
      px(tCtx, 15, 13, 2, 11, '#451a03');
      px(tCtx, 5, 18, 22, 2, '#451a03');

      // Warm Terracotta & Wood Shingled Gable Roof
      px(tCtx, 2, 11, 28, 3, '#1c1917');
      px(tCtx, 4, 8, 24, 4, '#1c1917');
      px(tCtx, 7, 5, 18, 4, '#1c1917');
      px(tCtx, 10, 3, 12, 3, '#1c1917');

      px(tCtx, 3, 11, 26, 2, '#9a3412');
      px(tCtx, 5, 8, 22, 3, '#c2410c');
      px(tCtx, 8, 6, 16, 2, '#ea580c');
      px(tCtx, 11, 4, 10, 2, '#f97316');
      // Roof wooden ridge beam & trim
      px(tCtx, 11, 3, 10, 1, '#fde047');
      px(tCtx, 3, 13, 26, 1, '#78350f');

      // Attic Gable Window
      px(tCtx, 14, 7, 4, 4, '#451a03');
      px(tCtx, 15, 8, 2, 2, '#fef08a');

      // Cozy Arched Wooden Front Door (Left-Center)
      px(tCtx, 8, 19, 6, 8, '#1c1917');
      px(tCtx, 9, 20, 4, 7, '#78350f');
      px(tCtx, 10, 20, 2, 7, '#92400e');
      px(tCtx, 12, 23, 1, 1, '#fbbf24'); // Door handle
      // Stone doorstep
      px(tCtx, 7, 27, 8, 2, '#a8a29e');

      // Warm Lit Cottage Window with Flower Box (Right Side)
      px(tCtx, 18, 15, 6, 6, '#451a03');
      px(tCtx, 19, 16, 4, 4, '#fef08a');
      px(tCtx, 20, 16, 1, 4, '#78350f'); // Window mullion
      px(tCtx, 19, 17, 4, 1, '#78350f');
      // Flower box under window
      px(tCtx, 18, 21, 6, 2, '#78350f');
      px(tCtx, 18, 20, 6, 1, '#22c55e');
      px(tCtx, 19, 19, 1, 1, '#f43f5e');
      px(tCtx, 22, 19, 1, 1, '#fbbf24');

      // Small Wooden Picket Fence on Left Yard
      px(tCtx, 2, 23, 1, 5, '#d6d3d1');
      px(tCtx, 4, 23, 1, 5, '#d6d3d1');
      px(tCtx, 2, 25, 4, 1, '#a8a29e');

      // Phủ tuyết lên mái Nhà Dân, ống khói, bậu cửa sổ và chân tường
      if (activeSnowLevel === 1) {
        px(tCtx, 10, 3, 12, 2, '#ffffff');
        px(tCtx, 7, 5, 5, 2, '#f8fafc');
        px(tCtx, 20, 5, 5, 2, '#f8fafc');
        px(tCtx, 4, 8, 5, 2, '#e2e8f0');
        px(tCtx, 23, 8, 5, 2, '#e2e8f0');
        px(tCtx, 3, 11, 26, 1, '#f8fafc');
        px(tCtx, 22, 3, 5, 1, '#ffffff');
        px(tCtx, 18, 20, 6, 1, '#ffffff');
      } else if (activeSnowLevel === 2) {
        px(tCtx, 10, 3, 12, 3, '#ffffff');
        px(tCtx, 7, 5, 18, 3, '#f8fafc');
        px(tCtx, 8, 5, 16, 2, '#ffffff');
        px(tCtx, 4, 8, 24, 3, '#e2e8f0');
        px(tCtx, 5, 8, 22, 2, '#ffffff');
        px(tCtx, 3, 11, 26, 2, '#f8fafc');
        px(tCtx, 22, 3, 5, 2, '#ffffff');
        // Giữ lại ô cửa sổ tầng áp mái nổi bật giữa mái tuyết
        px(tCtx, 14, 7, 4, 4, '#451a03');
        px(tCtx, 15, 8, 2, 2, '#fef08a');
        // Tuyết đọng dày trên bậu hoa, hàng rào và chân tường
        px(tCtx, 18, 19, 6, 2, '#ffffff');
        px(tCtx, 2, 22, 4, 2, '#ffffff');
        px(tCtx, 5, 26, 22, 2, '#f1f5f9');
      }
    });
    ctx.drawImage(sprite, x, y);
  } else if (b.type === 'BARRACKS') {
    const key = `b_barracks_dynsh_${flagFrame}_sn${activeSnowLevel}`;
    const sprite = getCachedSprite(key, TILE_SIZE, TILE_SIZE, (tCtx) => {
      // Right Watchtower
      px(tCtx, 19, 4, 10, 24, '#1c1917');
      px(tCtx, 20, 5, 8, 22, '#44403c');
      px(tCtx, 20, 5, 3, 22, '#78716c');
      // Watchtower timber roof
      px(tCtx, 18, 2, 12, 3, '#1c1917');
      px(tCtx, 19, 3, 10, 2, '#78350f');
      px(tCtx, 20, 2, 8, 1, '#b45309');

      // Main Garrison Hall
      px(tCtx, 3, 11, 18, 17, '#1c1917');
      px(tCtx, 4, 12, 16, 15, '#57534e');
      px(tCtx, 4, 12, 14, 15, '#78716c');

      // Cobalt Blue Armored Roof
      px(tCtx, 2, 6, 20, 7, '#0f172a');
      px(tCtx, 3, 9, 18, 3, '#1e3a8a');
      px(tCtx, 4, 7, 16, 2, '#2563eb');
      px(tCtx, 6, 6, 12, 1, '#60a5fa');

      // Garrison Archway
      px(tCtx, 7, 18, 8, 10, '#090d16');
      px(tCtx, 8, 19, 6, 9, '#1c1917');
      px(tCtx, 8, 20, 6, 1, '#78716c'); // Portcullis teeth

      // Weapon Rack & Royal Shield Emblem
      px(tCtx, 22, 15, 4, 5, '#1e3a8a');
      px(tCtx, 23, 16, 2, 3, '#fbbf24');
      px(tCtx, 21, 21, 6, 5, '#78350f');
      px(tCtx, 22, 19, 1, 6, '#e2e8f0'); // Spear on rack
      px(tCtx, 25, 19, 1, 6, '#e2e8f0');

      // Blue Pennant Flag
      px(tCtx, 24, 0, 1, 3, '#e2e8f0');
      px(tCtx, 25, 0, 4 + flagFrame * 2, 2, '#3b82f6');

      // Phủ tuyết lên mái Trại Lính & Tháp Canh
      if (activeSnowLevel === 1) {
        px(tCtx, 19, 2, 10, 2, '#ffffff');
        px(tCtx, 5, 6, 14, 2, '#ffffff');
        px(tCtx, 3, 10, 18, 1, '#e2e8f0');
        px(tCtx, 21, 21, 6, 1, '#f8fafc');
      } else if (activeSnowLevel === 2) {
        px(tCtx, 18, 2, 12, 3, '#ffffff');
        px(tCtx, 4, 6, 16, 3, '#ffffff');
        px(tCtx, 3, 8, 18, 4, '#e2e8f0');
        px(tCtx, 4, 8, 16, 2, '#ffffff');
        px(tCtx, 21, 20, 6, 2, '#ffffff');
        px(tCtx, 4, 25, 24, 2, '#f1f5f9');
      }
    });
    ctx.drawImage(sprite, x, y);
  } else if (b.type === 'FARM') {
    const sway = Math.floor(tick / 16 + b.gridX) % 2;
    const key = `b_farm_${sway}_sn${activeSnowLevel}`;
    const sprite = getCachedSprite(key, TILE_SIZE, TILE_SIZE, (tCtx) => {
      // Wooden fence border & plowed fertile soil
      px(tCtx, 2, 3, 28, 27, '#271203');
      px(
        tCtx,
        3,
        4,
        26,
        25,
        activeSnowLevel === 2 ? '#cbd5e1' : '#422006'
      );

      // Plowed furrow ridges
      for (let fy = 6; fy <= 26; fy += 3) {
        px(
          tCtx,
          4,
          fy,
          24,
          2,
          activeSnowLevel === 2 ? '#e2e8f0' : '#5c2d0c'
        );
        px(
          tCtx,
          4,
          fy,
          24,
          1,
          activeSnowLevel === 2
            ? '#ffffff'
            : activeSnowLevel === 1
              ? '#cbd5e1'
              : '#78350f'
        );
      }

      // Cozy Red/Amber Granary Barn (Top-left corner)
      px(tCtx, 3, 2, 12, 12, '#1c1917');
      px(tCtx, 4, 6, 10, 7, '#991b1b');
      px(tCtx, 5, 6, 8, 7, '#b91c1c');
      // Straw roof
      px(tCtx, 3, 3, 12, 3, '#b45309');
      px(tCtx, 4, 2, 10, 2, '#f59e0b');
      px(tCtx, 5, 2, 8, 1, '#fde047');
      if (activeSnowLevel === 1) {
        px(tCtx, 4, 2, 10, 2, '#ffffff');
        px(tCtx, 3, 4, 12, 1, '#e2e8f0');
      } else if (activeSnowLevel === 2) {
        px(tCtx, 3, 2, 12, 4, '#ffffff');
        px(tCtx, 2, 3, 28, 1, '#ffffff');
      }
      // Barn door
      px(tCtx, 7, 9, 4, 4, '#451a03');

      // Lush Golden Wheat Stalks with wind sway
      for (let row = 0; row < 3; row++) {
        for (let col = 0; col < 6; col++) {
          if (row === 0 && col < 3) continue; // Leave space for barn
          const wx = 5 + col * 4;
          const wy = 9 + row * 7;
          px(tCtx, wx, wy + 2, 2, 4, '#854d0e');
          px(tCtx, wx + sway, wy, 2, 3, '#eab308');
          px(
            tCtx,
            wx + sway,
            wy - 1,
            2,
            2,
            activeSnowLevel >= 1 ? '#ffffff' : '#fef08a'
          );
        }
      }
    });
    ctx.drawImage(sprite, x, y);
  } else if (b.type === 'WAREHOUSE') {
    const key = `b_warehouse_dynsh_${flagFrame}_sn${activeSnowLevel}`;
    const sprite = getCachedSprite(key, TILE_SIZE, TILE_SIZE, (tCtx) => {
      // Main Stone & Timber Warehouse Body
      px(tCtx, 2, 8, 28, 20, '#1c1917');
      px(tCtx, 3, 9, 26, 18, '#57534e');
      px(tCtx, 4, 10, 24, 16, '#a8a29e');

      // Timber framing beams
      px(tCtx, 3, 9, 2, 18, '#451a03');
      px(tCtx, 27, 9, 2, 18, '#451a03');
      px(tCtx, 3, 16, 26, 2, '#451a03');

      // Wide Sloped Amber/Brown Shingled Roof
      px(tCtx, 1, 6, 30, 4, '#1c1917');
      px(tCtx, 3, 3, 26, 4, '#1c1917');
      px(tCtx, 2, 7, 28, 2, '#78350f');
      px(tCtx, 4, 4, 24, 3, '#b45309');
      px(tCtx, 6, 3, 20, 2, '#d97706');
      px(tCtx, 8, 2, 16, 1, '#fbbf24');

      // Wide Open Barn Storage Bay with Crates & Grain Sacks
      px(tCtx, 8, 15, 16, 12, '#1c1917');
      px(tCtx, 9, 16, 14, 11, '#291507');

      // Wooden Crates & Golden Grain Sacks inside Warehouse
      px(tCtx, 10, 20, 5, 6, '#92400e');
      px(tCtx, 11, 21, 3, 4, '#d97706');
      px(tCtx, 16, 19, 6, 7, '#ca8a04');
      px(tCtx, 17, 20, 4, 5, '#facc15');
      px(tCtx, 18, 21, 2, 2, '#fef08a');

      // Rooftop Banner
      px(tCtx, 15, 0, 1, 3, '#fef08a');
      px(tCtx, 16, 0, 5 + flagFrame, 2, '#f59e0b');

      // Phủ tuyết lên mái Nhà Kho
      if (activeSnowLevel === 1) {
        px(tCtx, 6, 2, 20, 2, '#ffffff');
        px(tCtx, 4, 4, 6, 2, '#f8fafc');
        px(tCtx, 22, 4, 6, 2, '#f8fafc');
        px(tCtx, 2, 7, 28, 1, '#e2e8f0');
      } else if (activeSnowLevel === 2) {
        px(tCtx, 6, 2, 20, 3, '#ffffff');
        px(tCtx, 4, 4, 24, 3, '#f8fafc');
        px(tCtx, 5, 4, 22, 2, '#ffffff');
        px(tCtx, 2, 7, 28, 2, '#e2e8f0');
        px(tCtx, 3, 25, 26, 2, '#f1f5f9');
      }
    });
    ctx.drawImage(sprite, x, y);
  } else if (b.type === 'HERO_ALTAR') {
    const key = `b_hero_altar_dynsh_${flagFrame}_sn${activeSnowLevel}`;
    const sprite = getCachedSprite(key, TILE_SIZE, TILE_SIZE, (tCtx) => {
      // Stepped Marble & Obsidian Sanctuary Platform
      px(tCtx, 2, 22, 28, 7, '#0f172a');
      px(tCtx, 3, 23, 26, 5, '#cbd5e1');
      px(tCtx, 4, 24, 24, 3, '#f8fafc');
      px(tCtx, 5, 19, 22, 4, '#1e293b');
      px(tCtx, 6, 20, 20, 3, '#e2e8f0');

      // Left & Right Golden Heroic Pillars
      px(tCtx, 5, 7, 5, 14, '#1c1917');
      px(tCtx, 22, 7, 5, 14, '#1c1917');
      px(tCtx, 6, 8, 3, 12, '#f59e0b');
      px(tCtx, 6, 8, 1, 12, '#fef08a');
      px(tCtx, 23, 8, 3, 12, '#f59e0b');
      px(tCtx, 23, 8, 1, 12, '#fef08a');

      // Grand Royal Purple & Gold Pediment Roof
      px(tCtx, 3, 5, 26, 4, '#1e1b4b');
      px(tCtx, 6, 3, 20, 3, '#1e1b4b');
      px(tCtx, 10, 1, 12, 3, '#1e1b4b');
      px(tCtx, 4, 6, 24, 2, '#581c87');
      px(tCtx, 7, 4, 18, 2, '#7e22ce');
      px(tCtx, 11, 2, 10, 2, '#a855f7');
      px(tCtx, 4, 8, 24, 1, '#fbbf24');

      // Sacred Glowing Altar & Floating Hero Greatsword in Center
      px(tCtx, 11, 17, 10, 5, '#3b0764');
      px(tCtx, 12, 18, 8, 3, '#fbbf24');
      // Glowing Aura & Floating Sword Blade
      const hoverY = flagFrame === 0 ? 0 : -1;
      px(tCtx, 14, 9 + hoverY, 4, 8, 'rgba(56, 189, 248, 0.35)');
      px(tCtx, 15, 8 + hoverY, 2, 8, '#f8fafc');
      px(tCtx, 13, 12 + hoverY, 6, 2, '#fbbf24'); // Crossguard
      px(tCtx, 15, 6 + hoverY, 2, 2, '#fef08a'); // Pommel

      // Crimson & Gold Heroic Banners on Pillars
      px(tCtx, 6, 11, 3, 6, '#dc2626');
      px(tCtx, 7, 12, 1, 4, '#fef08a');
      px(tCtx, 23, 11, 3, 6, '#dc2626');
      px(tCtx, 24, 12, 1, 4, '#fef08a');

      // Phủ tuyết lên mái Điện Anh Hùng và bậc thềm đá cẩm thạch
      if (activeSnowLevel === 1) {
        px(tCtx, 10, 1, 12, 2, '#ffffff');
        px(tCtx, 6, 3, 5, 2, '#f8fafc');
        px(tCtx, 21, 3, 5, 2, '#f8fafc');
        px(tCtx, 4, 5, 5, 2, '#e2e8f0');
        px(tCtx, 23, 5, 5, 2, '#e2e8f0');
      } else if (activeSnowLevel === 2) {
        px(tCtx, 10, 1, 12, 3, '#ffffff');
        px(tCtx, 6, 3, 20, 3, '#f8fafc');
        px(tCtx, 7, 3, 18, 2, '#ffffff');
        px(tCtx, 4, 5, 24, 3, '#e2e8f0');
        px(tCtx, 3, 23, 26, 3, '#ffffff');
      }
    });
    ctx.drawImage(sprite, x, y);
  } else if (b.type === 'MANOR') {
    const key = `b_manor_${flagFrame}_sn${activeSnowLevel}`;
    const sprite = getCachedSprite(key, TILE_SIZE, TILE_SIZE, (tCtx) => {
      // Noble Garden Courtyard & Stone Patio
      px(tCtx, 2, 23, 28, 7, '#14532d');
      px(
        tCtx,
        3,
        24,
        26,
        5,
        activeSnowLevel === 2
          ? '#f8fafc'
          : activeSnowLevel === 1
            ? '#cbd5e1'
            : '#22c55e'
      );
      px(tCtx, 8, 25, 16, 4, '#94a3b8'); // Cobblestone walkway

      // Manor Main Villa (Timber & Cream Plaster Walls)
      px(tCtx, 4, 11, 24, 13, '#1c1917');
      px(tCtx, 5, 12, 22, 11, '#fef3c7');
      px(tCtx, 5, 17, 22, 1, '#78350f'); // Timber beam
      px(tCtx, 11, 12, 1, 11, '#78350f');
      px(tCtx, 20, 12, 1, 11, '#78350f');

      // Emerald & Royal Goldpitched Manor Roof
      px(tCtx, 3, 6, 26, 6, '#064e3b');
      px(tCtx, 4, 7, 24, 4, '#059669');
      px(tCtx, 7, 4, 18, 3, '#047857');
      px(tCtx, 11, 2, 10, 2, '#10b981');
      px(tCtx, 4, 11, 24, 1, '#fbbf24'); // Gold roof trim

      // Arched Noble Entrance & Warm Windows
      px(tCtx, 13, 16, 6, 7, '#451a03');
      px(tCtx, 14, 17, 4, 6, '#92400e');
      px(tCtx, 7, 13, 3, 3, '#fef08a');
      px(tCtx, 22, 13, 3, 3, '#fef08a');

      // Mini Courtyard Pond & Flower Bushes in Front
      px(tCtx, 5, 25, 4, 3, '#38bdf8');
      px(
        tCtx,
        23,
        25,
        4,
        3,
        activeSnowLevel === 2 ? '#ffffff' : '#f43f5e'
      );
      if (flagFrame === 0) {
        px(tCtx, 15, 1, 4, 2, '#fbbf24');
      } else {
        px(tCtx, 16, 1, 4, 2, '#fbbf24');
      }

      // Phủ tuyết lên mái Trang Viên
      if (activeSnowLevel === 1) {
        px(tCtx, 10, 2, 12, 2, '#ffffff');
        px(tCtx, 7, 4, 5, 2, '#f8fafc');
        px(tCtx, 20, 4, 5, 2, '#f8fafc');
        px(tCtx, 4, 7, 24, 1, '#e2e8f0');
      } else if (activeSnowLevel === 2) {
        px(tCtx, 10, 2, 12, 3, '#ffffff');
        px(tCtx, 7, 4, 18, 3, '#f8fafc');
        px(tCtx, 4, 7, 24, 3, '#e2e8f0');
        px(tCtx, 5, 7, 22, 2, '#ffffff');
      }
    });
    ctx.drawImage(sprite, x, y);
  } else if (b.type === 'CONSTRUCTION_CENTER') {
    const key = `b_construction_center_dynsh_${flagFrame}_sn${activeSnowLevel}`;
    const sprite = getCachedSprite(key, TILE_SIZE, TILE_SIZE, (tCtx) => {
      // Stone Architect Foundation
      px(tCtx, 2, 20, 28, 8, '#1c1917');
      px(tCtx, 3, 21, 26, 6, '#57534e');
      px(tCtx, 4, 22, 24, 4, '#a8a29e');
      // Timber & Amber Guild Workshop Body
      px(tCtx, 3, 11, 20, 10, '#451a03');
      px(tCtx, 4, 12, 18, 8, '#b45309');
      px(tCtx, 5, 13, 16, 6, '#f59e0b');
      // Royal Blue Blueprint Table in Front Courtyard
      px(tCtx, 5, 16, 11, 5, '#1e3a8a');
      px(tCtx, 6, 17, 9, 3, '#2563eb');
      px(tCtx, 7, 18, 7, 1, '#bae6fd');
      // Sloped Architect Roof
      px(tCtx, 2, 7, 22, 4, '#78350f');
      px(tCtx, 4, 5, 18, 3, '#d97706');
      px(tCtx, 7, 3, 12, 2, '#fbbf24');
      px(tCtx, 3, 10, 20, 1, '#fef08a');
      // Wooden Crane & Pulley Tower on Right
      px(tCtx, 24, 4, 3, 18, '#78350f');
      px(tCtx, 25, 4, 1, 18, '#d97706');
      px(tCtx, 18, 4, 11, 2, '#fbbf24');
      px(tCtx, 27, 6, 1, 6 + flagFrame, '#cbd5e1');
      px(tCtx, 25, 12 + flagFrame, 4, 4, '#f97316');
      px(tCtx, 26, 13 + flagFrame, 2, 2, '#fde047');
      if (activeSnowLevel >= 1) {
        px(tCtx, 6, 3, 14, 2, '#ffffff');
        px(tCtx, 3, 6, 20, 2, '#f8fafc');
      }
    });
    ctx.drawImage(sprite, x, y);
  } else if (b.type === 'CAMPFIRE') {
    // Bóng pixel răng cưa nhỏ gọn dưới chân đống củi Lửa Trại
    drawSteppedPixelShadow(ctx, x + 32, y + 48, 12, 4, 0.38);

    // Giảm tốc độ animation ngọn lửa chậm rãi, tự nhiên hơn (tick / 12 thay vì tick / 4)
    const flameFrame = Math.floor(tick / 12) % 4;
    const key = `b_campfire_compact_${flameFrame}_sn${activeSnowLevel}`;
    const sprite = getCachedSprite(key, TILE_SIZE, TILE_SIZE, (tCtx) => {
      // Nền đất tro nhỏ gọn dưới chân đống lửa (thu gọn diện tích vào tâm 10..22, 19..25)
      px(tCtx, 10, 20, 12, 5, 'rgba(28, 16, 8, 0.65)');
      px(tCtx, 11, 21, 10, 3, '#291d16');
      px(tCtx, 12, 21, 8, 3, 'rgba(234, 88, 12, 0.28)');

      // Đá xếp vòng phía sau (nhỏ gọn)
      px(tCtx, 11, 19, 3, 2, '#44403c');
      px(tCtx, 12, 19, 1, 1, '#78716c');
      px(tCtx, 14, 18, 4, 2, '#44403c');
      px(tCtx, 15, 18, 2, 1, '#78716c');
      px(tCtx, 18, 19, 3, 2, '#44403c');
      px(tCtx, 19, 19, 1, 1, '#78716c');

      // Đá xếp hai bên hông
      px(tCtx, 9, 20, 3, 3, '#292524');
      px(tCtx, 10, 20, 2, 2, '#57534e');
      px(tCtx, 11, 21, 1, 1, '#ea580c');
      px(tCtx, 20, 20, 3, 3, '#292524');
      px(tCtx, 20, 20, 2, 2, '#57534e');
      px(tCtx, 20, 21, 1, 1, '#ea580c');

      // Các thanh củi sồi xếp chéo nhỏ gọn
      px(tCtx, 10, 20, 12, 2, '#451a03');
      px(tCtx, 11, 20, 10, 1, '#78350f');
      px(tCtx, 12, 19, 8, 3, '#451a03');
      px(tCtx, 13, 20, 6, 2, '#92400e');

      // Lớp than hồng âm ỉ ở tâm
      px(tCtx, 12, 20, 8, 2, '#991b1b');
      px(tCtx, 13, 20, 6, 2, '#dc2626');
      px(tCtx, 14, 20, 4, 1, '#f97316');
      px(tCtx, 15, 20, 2, 1, '#fde047');

      // Ngọn lửa 4 khung hình chuyển động êm dịu, nhỏ gọn hơn
      const shiftX = flameFrame === 1 ? 1 : flameFrame === 3 ? -1 : 0;
      const stretchY = flameFrame === 2 ? -1 : 0;

      // Lớp lửa đỏ cam ngoài
      px(tCtx, 12 + shiftX, 15 + stretchY, 8, 6 - stretchY, '#c2410c');
      px(tCtx, 13 + shiftX, 12 + stretchY, 6, 8 - stretchY, '#ea580c');
      px(tCtx, 14 + shiftX, 10 + stretchY, 4, 3, '#ea580c');
      px(tCtx, 15 + shiftX, 9 + stretchY, 2, 2, '#dc2626');

      // Lưỡi lửa nhỏ hai bên
      if (flameFrame % 2 === 0) {
        px(tCtx, 11, 16, 2, 3, '#ea580c');
        px(tCtx, 19, 15, 2, 3, '#f97316');
      } else {
        px(tCtx, 11, 15, 2, 3, '#f97316');
        px(tCtx, 19, 16, 2, 3, '#ea580c');
      }

      // Lớp lửa cam vàng giữa
      px(tCtx, 13 + shiftX, 14 + stretchY, 6, 6 - stretchY, '#f97316');
      px(tCtx, 14 + shiftX, 12 + stretchY, 4, 6 - stretchY, '#fbbf24');

      // Lõi lửa vàng trắng sáng dịu ở tâm
      px(tCtx, 14 + shiftX, 15, 4, 4, '#fde047');
      px(tCtx, 15 + shiftX, 13 + stretchY, 2, 5, '#fef08a');
      px(tCtx, 15 + shiftX, 15, 2, 2, '#ffffff');

      // Đá vòng phía trước đè lên chân củi
      px(tCtx, 10, 22, 4, 3, '#1c1917');
      px(tCtx, 11, 22, 3, 2, '#57534e');
      px(tCtx, 12, 22, 1, 1, '#fb923c');
      px(tCtx, 14, 23, 4, 3, '#1c1917');
      px(tCtx, 15, 23, 2, 2, '#78716c');
      px(tCtx, 15, 23, 2, 1, '#fbbf24');
      px(tCtx, 18, 22, 4, 3, '#1c1917');
      px(tCtx, 18, 22, 3, 2, '#57534e');
      px(tCtx, 19, 22, 1, 1, '#fb923c');
    });
    ctx.drawImage(sprite, x, y);

    // 1. PARTICLE LỬA (Các cụm lưỡi lửa nhỏ tách ra từ ngọn lửa bập bùng bay lên gần đỉnh)
    for (let f = 0; f < 4; f++) {
      const fCycle = (tick * 0.42 + f * 11 + b.gridX * 5 + b.gridY * 9) % 24;
      const fProg = fCycle / 24;
      const fx =
        x +
        31 +
        Math.sin(tick * 0.055 + f * 1.8 + b.gridX) * (2.5 + fProg * 3.5);
      const fy = y + 26 - fProg * 14;
      const fAlpha = Math.max(0, (1 - fProg) * 0.85);
      ctx.fillStyle =
        fProg < 0.35
          ? `rgba(253, 224, 71, ${fAlpha.toFixed(2)})`
          : fProg < 0.7
            ? `rgba(249, 115, 22, ${fAlpha.toFixed(2)})`
            : `rgba(220, 38, 38, ${fAlpha.toFixed(2)})`;
      const fSize = fProg < 0.5 ? 3 : 2;
      ctx.fillRect(Math.round(fx), Math.round(fy), fSize, fSize);
    }

    // 2. HẠT LỬA BAY LÊN (Tàn lửa nhỏ lơ lửng bay cao chậm rãi lên không trung)
    for (let s = 0; s < 6; s++) {
      const cycle = (tick * 0.45 + s * 17 + b.gridX * 7 + b.gridY * 13) % 44;
      const progress = cycle / 44;
      const sparkX =
        x +
        31 +
        Math.sin(tick * 0.045 + s * 2.1 + b.gridX) * (3.5 + progress * 6.5);
      const sparkY = y + 24 - progress * 34;
      const alpha = Math.max(0, 1 - progress);
      ctx.fillStyle =
        s % 2 === 0
          ? `rgba(254, 240, 138, ${(alpha * 0.9).toFixed(2)})`
          : `rgba(251, 146, 60, ${(alpha * 0.82).toFixed(2)})`;
      const sz = progress < 0.45 ? 2 : 1.5;
      ctx.fillRect(Math.round(sparkX), Math.round(sparkY), sz, sz);
    }

    // 3. HẠT LỬA CHÁY VĂNG RA NGOÀI (Tia lửa nổ lách tách bắn vòng cung parabol ra xung quanh đống lửa)
    for (let p = 0; p < 5; p++) {
      const pCycle = (tick * 0.52 + p * 19 + b.gridX * 11 + b.gridY * 17) % 38;
      // Chỉ hiển thị trong pha bắn ra (0..26), tạo nhịp nổ lách tách tự nhiên
      if (pCycle <= 26) {
        const t = pCycle / 26;
        const dirSign = p % 2 === 0 ? 1 : -1;
        const spreadX = (10 + (p % 3) * 4.5) * dirSign;
        const dropOffsetY = (p % 3) * 2.5 - 1;
        // Quỹ đạo parabol văng ra ngoài rồi chạm mặt đất nảy nhẹ
        const arcHeight = 11 + (p % 2) * 4;
        const bounce =
          t < 0.78
            ? 4 * arcHeight * (t / 0.78) * (1 - t / 0.78)
            : 4 * (arcHeight * 0.22) * ((t - 0.78) / 0.22) * (1 - (t - 0.78) / 0.22);
        const pxOut = x + 31 + spreadX * t;
        const pyOut = y + 40 + dropOffsetY * t - bounce;
        const pAlpha = t < 0.75 ? 0.92 : Math.max(0, (1 - (t - 0.75) / 0.25) * 0.85);

        ctx.fillStyle =
          t < 0.4
            ? `rgba(254, 240, 138, ${pAlpha.toFixed(2)})`
            : `rgba(249, 115, 22, ${pAlpha.toFixed(2)})`;
        ctx.fillRect(Math.round(pxOut), Math.round(pyOut), 2, 2);
      }
    }
  } else if (b.type === 'TOWER_ARCHER') {
    const key = `b_tower_archer_dynsh_${flagFrame}_sn${activeSnowLevel}`;
    const sprite = getCachedSprite(key, TILE_SIZE, TILE_SIZE, (tCtx) => {
      // Stone Fortress Base
      px(tCtx, 7, 17, 18, 11, '#1c1917');
      px(tCtx, 8, 18, 16, 9, '#475569');
      px(tCtx, 9, 18, 7, 9, '#64748b');
      // Timber Watch Pillar
      px(tCtx, 9, 9, 14, 9, '#451a03');
      px(tCtx, 10, 9, 12, 8, '#78350f');
      px(tCtx, 10, 9, 5, 8, '#92400e');
      // Archer Balcony Battlements & Embrasure
      px(tCtx, 7, 7, 18, 3, '#1e293b');
      px(tCtx, 8, 7, 16, 2, '#94a3b8');
      px(tCtx, 13, 11, 6, 3, '#0f172a');
      px(tCtx, 14, 11, 4, 2, '#fde047'); // Crossbow/Bow glint
      // Steep Royal Blue Pointed Roof (Peak at gy = 2 -> y + 4)
      px(tCtx, 6, 5, 20, 2, '#1e3a8a');
      px(tCtx, 9, 3, 14, 2, '#2563eb');
      px(tCtx, 13, 2, 6, 1, '#38bdf8');
      px(tCtx, 15, 1, 2, 1, '#fbbf24');
      if (activeSnowLevel >= 1) {
        px(tCtx, 12, 2, 8, 1, '#ffffff');
        px(tCtx, 8, 4, 16, 1, '#f8fafc');
      }
    });
    ctx.drawImage(sprite, x, y);
  } else if (b.type === 'TOWER_MUSKET') {
    const key = `b_tower_musket_dynsh_${flagFrame}_sn${activeSnowLevel}`;
    const sprite = getCachedSprite(key, TILE_SIZE, TILE_SIZE, (tCtx) => {
      // Reinforced Stone & Iron Bastion Base
      px(tCtx, 6, 16, 20, 12, '#1c1917');
      px(tCtx, 7, 17, 18, 10, '#44403c');
      px(tCtx, 8, 17, 8, 10, '#57534e');
      px(tCtx, 6, 21, 20, 2, '#27272a');
      // Brass & Oak Gun Turret Chamber
      px(tCtx, 8, 8, 16, 8, '#451a03');
      px(tCtx, 9, 9, 14, 6, '#78350f');
      px(tCtx, 11, 10, 10, 3, '#090d16');
      // Twin Musket Barrels jutting out
      px(tCtx, 18, 10, 8, 2, '#cbd5e1');
      px(tCtx, 24, 10, 2, 2, '#f59e0b');
      // Brass-Domed Roof (Peak at gy = 2 -> y + 4)
      px(tCtx, 7, 6, 18, 2, '#92400e');
      px(tCtx, 9, 4, 14, 2, '#d97706');
      px(tCtx, 12, 2, 8, 2, '#fbbf24');
      if (activeSnowLevel >= 1) {
        px(tCtx, 11, 2, 10, 1, '#ffffff');
        px(tCtx, 8, 5, 16, 1, '#f8fafc');
      }
    });
    ctx.drawImage(sprite, x, y);
  } else if (b.type === 'TOWER_CANNON') {
    const key = `b_tower_cannon_dynsh_${flagFrame}_sn${activeSnowLevel}`;
    const sprite = getCachedSprite(key, TILE_SIZE, TILE_SIZE, (tCtx) => {
      // Heavy Armored Stone Citadel Base
      px(tCtx, 5, 14, 22, 14, '#18181b');
      px(tCtx, 6, 15, 20, 12, '#3f3f46');
      px(tCtx, 7, 15, 9, 12, '#52525b');
      // Red & Gold Imperial Trim Band
      px(tCtx, 5, 12, 22, 3, '#991b1b');
      px(tCtx, 6, 13, 20, 1, '#ef4444');
      px(tCtx, 6, 12, 20, 1, '#fbbf24');
      // Massive Cast-Iron Bombard Cannon Mounted on Top (Peak at gy = 2 -> y + 4)
      px(tCtx, 8, 6, 14, 6, '#451a03'); // Wooden gun carriage
      px(tCtx, 9, 3, 14, 5, '#090d16'); // Cannon body outline
      px(tCtx, 10, 4, 12, 3, '#27272a'); // Heavy dark iron barrel
      px(tCtx, 10, 4, 10, 1, '#71717a'); // Barrel metallic highlight
      px(tCtx, 19, 3, 5, 5, '#18181b'); // Flared cannon muzzle
      px(tCtx, 21, 4, 2, 3, '#f97316'); // Glowing muzzle core
      px(tCtx, 13, 2, 4, 2, '#fde047'); // Fuse spark on top
      if (activeSnowLevel >= 1) {
        px(tCtx, 6, 11, 20, 1, '#ffffff');
      }
    });
    ctx.drawImage(sprite, x, y);
  } else if (b.type === 'TOWER_HEXTECH') {
    const key = `b_tower_hextech_dynsh_${flagFrame}_sn${activeSnowLevel}`;
    const sprite = getCachedSprite(key, TILE_SIZE, TILE_SIZE, (tCtx) => {
      // Ground Arcane glow
      px(tCtx, 4, 25, 24, 5, 'rgba(14, 165, 233, 0.26)');
      // Piltover Brass & Blue-Steel Pedestal
      px(tCtx, 6, 17, 20, 11, '#0f172a');
      px(tCtx, 7, 18, 18, 9, '#1e3a8a');
      px(tCtx, 6, 25, 20, 2, '#b45309');
      // Glowing Hextech Conduit Core Pillar
      px(tCtx, 9, 10, 14, 8, '#172554');
      px(tCtx, 13, 10, 6, 14, '#0284c7');
      px(tCtx, 14, 11, 4, 12, '#38bdf8');
      px(tCtx, 15, 12, 2, 10, '#e0f2fe');
      // Golden Brass Conductor Rings
      px(tCtx, 8, 9, 16, 2, '#fbbf24');
      px(tCtx, 8, 16, 16, 2, '#d97706');
      // Floating Hextech Crystal Sphere at Apex (Peak at gy = 2 -> y + 4)
      px(tCtx, 11, 2, 10, 6, '#0284c7');
      px(tCtx, 12, 3, 8, 4, '#38bdf8');
      px(tCtx, 14, 3 + flagFrame, 4, 3, '#ffffff');
      px(tCtx, 8, 4, 2, 3, '#fde047');
      px(tCtx, 22, 4, 2, 3, '#fde047');
    });
    ctx.drawImage(sprite, x, y);
  }

  // Highlight nhẹ mép tường/mái công trình hướng về phía Lửa Trại
  if (b.type !== 'FARM' && b.type !== 'CAMPFIRE') {
    drawObjectDirectionalRimHighlight(
      ctx,
      x,
      y,
      'BUILDING',
      worldX,
      worldY
    );
  }

  // Nếu là 4 loại Tháp Phòng Thủ Quân Ta: Hiển thị chớp sáng khi trúng đòn, điểm tụ lực bắn phía trên đỉnh model và Thanh Máu + Cấp độ (Lv.1-20)
  if (isDefensiveTowerBuilding(b.type)) {
    const towerStats = computeTowerStatsForLevel(b.type, b.level || 1);
    const maxHp = b.maxHp ?? towerStats.maxHp;
    const hp = b.hp ?? maxHp;
    const centerX = x + 32;
    // Điểm bắn & tụ lực nằm phía trên đầu model, cách đỉnh model (y + 4) một khoảng rõ rệt -> y - 10
    const shotOriginY = y - 10;

    if ((b.hitFlash ?? 0) > 0) {
      ctx.save();
      ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
      ctx.fillRect(x + 12, y + 4, 40, 52);
      ctx.restore();
    }

    if ((b.windup ?? 0) > 0) {
      const windupColor =
        b.type === 'TOWER_HEXTECH'
          ? '#38bdf8'
          : b.type === 'TOWER_CANNON'
            ? '#f97316'
            : b.type === 'TOWER_MUSKET'
              ? '#fbbf24'
              : '#4ade80';
      drawWeaponWindupCharge(
        ctx,
        centerX,
        shotOriginY,
        b.windup ?? 0,
        windupColor,
        b.facing ?? 'RIGHT'
      );
    }

    drawUnitHealthBar(
      ctx,
      centerX,
      y - 18,
      32,
      hp,
      maxHp,
      '#22c55e',
      b.statusEffects ?? [],
      b.id,
      {
        nickname: `${getBuildingNameVi(b.type)} Lv.${b.level || 1}`,
        isHero: false,
      }
    );
    return;
  }

  if (b.level > 1) {
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.75)';
    ctx.fillRect(x + 4, y + 48, 28, 12);
    ctx.fillStyle = '#fbbf24';
    ctx.font = 'bold 10px "JetBrains Mono", monospace';
    ctx.fillText(`Lv.${b.level}`, x + 6, y + 58);
    ctx.restore();
  }
}

// ============================================================================
// 4. UNIT SPRITE MATRICES (16-BIT PIXEL ART WITH DARK OUTLINES & 3-TONE SHADING)
// ============================================================================

const KING_MATRIX = [
  '......KKKKKK......',
  '.....KYYYYYYK.....',
  '....KYRYYYYBYK....',
  '....KGGGGGGGGK....',
  '....KSSSSSSSSK....',
  '....KSSEESSSSK....',
  '....KSSSSSSSSK....',
  '....KBBBBBBBBK....',
  '...KKCCCCCCCCKK...',
  '..KCCRRRRRRRRCCK..',
  '.KCCRRAAAAAARRCK..',
  '.KCCRRAAGGGARRCKW.',
  '.KCCRRAAGGGARRCKW.',
  '.KCCRRAAAAAARRCKW.',
  '.KCCRRRRRRRRRRCKG.',
  '..KKKKKKKKKKKKKK..',
  '....KLLK..KLLK....',
  '....KLLK..KLLK....',
];

const KNIGHT_MATRIX = [
  '.....KKKKKK.....',
  '....KHHHHHHK....',
  '...KHHHHHHHHK...',
  '...KHSSSSSSHK...',
  '...KHSSEESSHK...',
  '...KHHHHBBBBK...',
  '..KKBBBBBBBBKK..',
  '.KBBBBAAAABBBKW.',
  '.KBBBBAAGABBBKW.',
  '.KBBBBAAAABBBKW.',
  '.KBBBBBBBBBBBKW.',
  '..KKKKKKKKKKKKG.',
  '....KLLK..KLLK..',
  '....KLLK..KLLK..',
];

const ARCHER_MATRIX = [
  '.....KKKKKK.....',
  '....KGGGGGGK....',
  '...KGGGGGGGGK...',
  '...KGSSSSSSGK...',
  '...KGSSEESSGK...',
  '...KGGGGTTTTK...',
  '..KKTTTTTTTTKK..',
  '.KTTTTCCCCCTTKW.',
  '.KTTTTCCCCCTTKWS',
  '.KTTTTCCCCCTTKW.',
  '.KTTTTTTTTTTTK..',
  '..KKKKKKKKKKKK..',
  '....KLLK..KLLK..',
  '....KLLK..KLLK..',
];

const PEASANT_MATRIX = [
  '....KKKKKKKK....',
  '...KYYYYYYYYK...',
  '..KYYYYYYYYYYK..',
  '...KSSSSSSSSK...',
  '...KSSEESSSSK...',
  '...KSSSSSSSSK...',
  '...KTTTTTTTTK...',
  '..KTTTTTTTTTTK..',
  '..KTTBBBBBBTTK..',
  '..KTTTTTTTTTTK..',
  '...KKKKKKKKKK...',
  '....KLLK.KLLK...',
  '....KLLK.KLLK...',
];

const ENEMY_MELEE_MATRIX = [
  '..KK........KK..',
  '.KWWK.KKKK.KWWK.',
  '.KWWKDDDDDDKWWK.',
  '..KKDDDDDDDDKK..',
  '...KDDDDDDDDK...',
  '...KDDRRDDDDK...',
  '..KKDDDDDDDDKK..',
  '.KDDDDMMMMDDDDK.',
  '.KDDDMMMMMMDDDKW',
  '.KDDDMMMMMMDDDKA',
  '.KDDDDMMMMDDDDKA',
  '..KKKKKKKKKKKKW.',
  '....KLLK..KLLK..',
  '....KLLK..KLLK..',
];

const ENEMY_RANGED_MATRIX = [
  '.....KKKKKK.....',
  '....KPPPPPPK....',
  '...KPPPPPPPPK...',
  '...KPPDDDDPPK...',
  '...KPPDRRDPPK...',
  '...KPPPPPPPPK...',
  '..KKPPPPPPPPKK..',
  '.KPPPPVVVVPPPPK.',
  '.KPPPPVVVVPPPPKW',
  '.KPPPPVVVVPPPPKW',
  '.KPPPPPPPPPPPPK.',
  '..KKKKKKKKKKKK..',
  '....KLLK..KLLK..',
  '....KLLK..KLLK..',
];

const ENEMY_MAGE_MATRIX = [
  '......KKKK......',
  '.....KMMMMK.....',
  '....KMMMMMMK....',
  '..KKMMMMMMMMKK..',
  '.KPPPPDDDDPPPPK.',
  '...KPPDRCDPPK.OO',
  '...KPPDDDDPPK.OO',
  '..KKPPPPPPPPKKW.',
  '.KPPPPRRRRPPPPKW',
  '.KPPPPRRRRPPPPKW',
  '.KPPPPVVVVPPPPKW',
  '.KPPPPVVVVPPPPKW',
  '..KKKKKKKKKKKKW.',
  '....KLLK..KLLK..',
  '....KLLK..KLLK..',
];

// ============================================================================
// CUSTOM UPLOADED SOLDIER & ARCHER SPRITE LOADERS + BULLET TRACER LOADER
// ============================================================================
interface CustomSoldierSprites {
  rightNormal: HTMLCanvasElement;
  leftNormal: HTMLCanvasElement;
  rightFlash: HTMLCanvasElement;
  leftFlash: HTMLCanvasElement;
}

let customSoldierSprites: CustomSoldierSprites | null = null;
let customSoldierLoading = false;

let customArcherSprites: CustomSoldierSprites | null = null;
let customArcherLoading = false;

let customBulletTracerSprite: HTMLCanvasElement | null = null;
let customBulletTracerLoading = false;

function loadCharacterSpritesWithBgRemoval(
  src: string,
  onReady: (sprites: CustomSoldierSprites) => void
) {
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.onload = () => {
    const w = img.naturalWidth || img.width;
    const h = img.naturalHeight || img.height;
    if (!w || !h) return;

    const rawCanvas = document.createElement('canvas');
    rawCanvas.width = w;
    rawCanvas.height = h;
    const rawCtx = rawCanvas.getContext('2d');
    if (!rawCtx) return;

    rawCtx.imageSmoothingEnabled = false;
    rawCtx.drawImage(img, 0, 0);
    const imgData = rawCtx.getImageData(0, 0, w, h);
    const data = imgData.data;

    // Sample corner pixel as background color (solid grey)
    const bgR = data[0];
    const bgG = data[1];
    const bgB = data[2];

    const isBgColor = (idx: number, tolerance = 38) => {
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      const a = data[idx + 3];
      if (a === 0) return true;
      return (
        Math.abs(r - bgR) <= tolerance &&
        Math.abs(g - bgG) <= tolerance &&
        Math.abs(b - bgB) <= tolerance
      );
    };

    // BFS Flood-Fill from outer edges so internal colors are preserved
    const visited = new Uint8Array(w * h);
    const queue: number[] = [];

    const pushEdge = (x: number, y: number) => {
      const p = y * w + x;
      if (!visited[p] && isBgColor(p * 4, 42)) {
        visited[p] = 1;
        queue.push(p);
      }
    };

    for (let x = 0; x < w; x++) {
      pushEdge(x, 0);
      pushEdge(x, h - 1);
    }
    for (let y = 0; y < h; y++) {
      pushEdge(0, y);
      pushEdge(w - 1, y);
    }

    let head = 0;
    while (head < queue.length) {
      const curr = queue[head++];
      const cx = curr % w;
      const cy = Math.floor(curr / w);
      data[curr * 4 + 3] = 0; // Make background transparent

      const neighbors = [
        [cx - 1, cy],
        [cx + 1, cy],
        [cx, cy - 1],
        [cx, cy + 1],
      ];
      for (const [nx, ny] of neighbors) {
        if (nx >= 0 && nx < w && ny >= 0 && ny < h) {
          const np = ny * w + nx;
          if (!visited[np] && isBgColor(np * 4, 42)) {
            visited[np] = 1;
            queue.push(np);
          }
        }
      }
    }

    // Find tight bounding box of the character
    let minX = w;
    let minY = h;
    let maxX = 0;
    let maxY = 0;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        if (data[(y * w + x) * 4 + 3] > 20) {
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }

    rawCtx.putImageData(imgData, 0, 0);

    const cropW = Math.max(1, maxX - minX + 1);
    const cropH = Math.max(1, maxY - minY + 1);

    // Target in-game height ~ 38px (matches King & RTS scale)
    const targetH = 38;
    const targetW = Math.max(24, Math.round((cropW / cropH) * targetH));

    const makeVariant = (flip: boolean, flash: boolean) => {
      const c = document.createElement('canvas');
      c.width = targetW;
      c.height = targetH;
      const cCtx = c.getContext('2d');
      if (!cCtx) return c;
      cCtx.imageSmoothingEnabled = false;

      cCtx.save();
      if (flip) {
        cCtx.translate(targetW, 0);
        cCtx.scale(-1, 1);
      }
      cCtx.drawImage(
        rawCanvas,
        minX,
        minY,
        cropW,
        cropH,
        0,
        0,
        targetW,
        targetH
      );
      cCtx.restore();

      if (flash) {
        cCtx.save();
        cCtx.globalCompositeOperation = 'source-atop';
        cCtx.fillStyle = 'rgba(255, 255, 255, 0.85)';
        cCtx.fillRect(0, 0, targetW, targetH);
        cCtx.restore();
      }
      return c;
    };

    onReady({
      rightNormal: makeVariant(false, false),
      leftNormal: makeVariant(true, false),
      rightFlash: makeVariant(false, true),
      leftFlash: makeVariant(true, true),
    });
  };
  img.src = src;
}

function ensureCustomSoldierLoaded() {
  if (typeof window === 'undefined') return;
  if (!customSoldierSprites && !customSoldierLoading) {
    customSoldierLoading = true;
    loadCharacterSpritesWithBgRemoval(
      '/assets/aistudio/image_28538eb4.png',
      (sprites) => {
        customSoldierSprites = sprites;
      }
    );
  }
  if (!customArcherSprites && !customArcherLoading) {
    customArcherLoading = true;
    loadCharacterSpritesWithBgRemoval(
      '/assets/aistudio/image_e4851a63.png',
      (sprites) => {
        customArcherSprites = sprites;
      }
    );
  }
}

function ensureCustomBulletTracerLoaded() {
  if (
    customBulletTracerSprite ||
    customBulletTracerLoading ||
    typeof window === 'undefined'
  ) {
    return;
  }
  customBulletTracerLoading = true;

  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.onload = () => {
    const w = img.naturalWidth || img.width;
    const h = img.naturalHeight || img.height;
    if (!w || !h) return;

    const rawCanvas = document.createElement('canvas');
    rawCanvas.width = w;
    rawCanvas.height = h;
    const rawCtx = rawCanvas.getContext('2d');
    if (!rawCtx) return;

    rawCtx.imageSmoothingEnabled = false;
    rawCtx.drawImage(img, 0, 0);
    const imgData = rawCtx.getImageData(0, 0, w, h);
    const data = imgData.data;

    // Strip all dark background & dark outline pixels so the tracer has ZERO black border
    const isBrightPixel = new Uint8Array(w * h);
    for (let i = 0; i < w * h; i++) {
      const idx = i * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      const a = data[idx + 3];
      const maxChannel = Math.max(r, g, b);

      // Remove dark background (#262626) and any dark/black anti-aliased edge pixels
      if (a < 25 || maxChannel < 105 || r < 95 || g < 85) {
        data[idx + 3] = 0;
      } else {
        isBrightPixel[i] = 1;
        // Convert dark-blended edge luminance into clean alpha with pure warm gold/white RGB (no dark border)
        const norm = Math.min(1, Math.max(0.25, (maxChannel - 95) / 145));
        const boost = 255 / Math.max(120, maxChannel);
        data[idx] = Math.min(255, Math.round(r * boost));
        data[idx + 1] = Math.min(255, Math.round(g * boost));
        data[idx + 2] = Math.min(255, Math.round(b * boost));
        data[idx + 3] = Math.round(255 * norm);
      }
    }

    // Find the largest single tracer streak connected component in image_7c9409f5.png
    const visited = new Uint8Array(w * h);
    let bestComponent: number[] = [];

    for (let p = 0; p < w * h; p++) {
      if (isBrightPixel[p] && !visited[p]) {
        const comp: number[] = [];
        const q: number[] = [p];
        visited[p] = 1;
        let head = 0;
        while (head < q.length) {
          const curr = q[head++];
          comp.push(curr);
          const cx = curr % w;
          const cy = Math.floor(curr / w);
          for (let dy = -2; dy <= 2; dy++) {
            for (let dx = -2; dx <= 2; dx++) {
              const nx = cx + dx;
              const ny = cy + dy;
              if (nx >= 0 && nx < w && ny >= 0 && ny < h) {
                const np = ny * w + nx;
                if (isBrightPixel[np] && !visited[np]) {
                  visited[np] = 1;
                  q.push(np);
                }
              }
            }
          }
        }
        if (comp.length > bestComponent.length) {
          bestComponent = comp;
        }
      }
    }

    if (bestComponent.length === 0) return;

    // Mask out other streaks so only the single cleanest tracer beam is kept
    const keepMask = new Uint8Array(w * h);
    let minX = w;
    let minY = h;
    let maxX = 0;
    let maxY = 0;
    for (const p of bestComponent) {
      keepMask[p] = 1;
      const x = p % w;
      const y = Math.floor(p / w);
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }

    for (let p = 0; p < w * h; p++) {
      if (!keepMask[p]) {
        data[p * 4 + 3] = 0;
      }
    }

    rawCtx.putImageData(imgData, 0, 0);

    const cropW = Math.max(1, maxX - minX + 1);
    const cropH = Math.max(1, maxY - minY + 1);

    const targetW = 26;
    const targetH = Math.max(5, Math.min(8, Math.round((cropH / cropW) * targetW)));

    const out = document.createElement('canvas');
    out.width = targetW;
    out.height = targetH;
    const outCtx = out.getContext('2d');
    if (!outCtx) return;
    outCtx.imageSmoothingEnabled = false;
    outCtx.drawImage(
      rawCanvas,
      minX,
      minY,
      cropW,
      cropH,
      0,
      0,
      targetW,
      targetH
    );
    customBulletTracerSprite = out;
  };
  img.src = '/assets/aistudio/image_7c9409f5.png';
}

function getUnitSprite(
  unitKey: string,
  matrix: string[],
  palette: Record<string, string>,
  facing: 'LEFT' | 'RIGHT',
  isFlashing: boolean
): HTMLCanvasElement {
  const cacheKey = `unit_${unitKey}_${facing}_${isFlashing ? 1 : 0}`;
  const cols = matrix[0].length;
  const rows = matrix.length;
  const scale = 2; // 2px per pixel cell

  return getCachedSprite(cacheKey, cols * scale, rows * scale, (uCtx) => {
    const activePalette: Record<string, string> = {};
    if (isFlashing) {
      for (const k of Object.keys(palette)) {
        activePalette[k] = k === 'K' ? '#450a0a' : '#ffffff';
      }
    } else {
      Object.assign(activePalette, palette);
    }

    if (facing === 'LEFT') {
      uCtx.save();
      uCtx.translate(cols * scale, 0);
      uCtx.scale(-1, 1);
      drawMatrix(uCtx, matrix, activePalette, 0, 0, scale);
      uCtx.restore();
    } else {
      drawMatrix(uCtx, matrix, activePalette, 0, 0, scale);
    }
  });
}

// Vòng tròn thu nhỏ dần quanh đơn vị (CHỈ hiển thị khi đòn đánh sắp kích hoạt Kỹ Năng)
function drawSkillWindupCircle(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  windup: number,
  color: string
) {
  if (windup <= 0) return;
  ctx.save();
  const radius = Math.max(6, (1 - windup) * 28);
  ctx.strokeStyle = color;
  ctx.lineWidth = 2.5;
  ctx.globalAlpha = 0.4 + windup * 0.6;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

// Hiệu ứng tụ lực ở vũ khí / tay cho TẤT CẢ các đơn vị (Cả Địch và Ta) mỗi khi chuẩn bị ra đòn (windup > 0)
function drawWeaponWindupCharge(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  windup: number,
  color: string,
  facing: 'LEFT' | 'RIGHT'
) {
  if (windup <= 0) return;
  ctx.save();
  const orbX = facing === 'RIGHT' ? x + 12 : x - 12;
  const orbY = y - 9;
  const orbSize = 2.5 + windup * 4.5;
  ctx.globalAlpha = Math.min(1, 0.55 + windup * 0.45);

  // Tia tụ lực hội tụ vào vũ khí
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.4;
  for (let i = 0; i < 4; i++) {
    const rayAngle = (i * Math.PI) / 2 + windup * 2.6;
    const innerR = Math.max(1.5, (1 - windup) * 8);
    const outerR = innerR + 4.5;
    ctx.beginPath();
    ctx.moveTo(
      orbX + Math.cos(rayAngle) * innerR,
      orbY + Math.sin(rayAngle) * innerR
    );
    ctx.lineTo(
      orbX + Math.cos(rayAngle) * outerR,
      orbY + Math.sin(rayAngle) * outerR
    );
    ctx.stroke();
  }

  // Quả cầu ánh sáng tụ lực trên vũ khí
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(orbX, orbY, orbSize, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.8;
  ctx.stroke();
  ctx.restore();
}

// Quy định màu sắc riêng biệt cho từng loại Buff / Debuff (1 chấm vuông nhỏ viền đen 1px)
function getStatusEffectDotColor(effect: ActiveStatusEffect): string {
  if (
    effect.effectId === 'PARALYZE_DEBUFF' ||
    effect.iconType === 'PARALYZE'
  ) {
    return '#fde047'; // Tê liệt: Vàng điện giật
  }
  if (effect.effectId === 'POISON_DOT' || effect.iconType === 'POISON_DROP') {
    return '#a855f7'; // Độc: Tím
  }
  if (effect.effectId === 'BURN_DOT' || effect.iconType === 'BURN') {
    return '#ea580c'; // Cháy: Cam đậm
  }
  if (effect.effectId === 'ARMOR_BREAK' || effect.iconType === 'ARMOR_BREAK') {
    return '#fdba74'; // Phá giáp: Cam nhạt
  }
  if (effect.effectId === 'WEAKEN_DEBUFF' || effect.iconType === 'WEAKEN') {
    return '#fca5a5'; // Suy yếu: Đỏ nhạt
  }
  if (effect.effectId === 'BLEED_DOT' || effect.iconType === 'BLEED') {
    return '#b91c1c'; // Chảy máu: Đỏ đậm
  }
  if (effect.effectId === 'SLOW_DEBUFF' || effect.iconType === 'SLOW') {
    return '#38bdf8'; // Làm chậm: Xanh băng
  }
  if (
    effect.effectId === 'BLESSED_SHIELD' ||
    effect.iconType === 'SHIELD_WHITE'
  ) {
    return '#ffffff'; // Buff giáp ảo: Trắng
  }
  if (effect.effectId === 'MAGIC_BARRIER') {
    return '#67e8f9'; // Khiên phép: Xanh ngọc
  }
  if (
    effect.effectId === 'STAT_BUFF' ||
    effect.iconType === 'SWORD_UP' ||
    effect.iconType === 'STAT_BUFF' ||
    effect.category === 'BUFF'
  ) {
    return '#22c55e'; // Buff chỉ số: Xanh lá cây
  }
  return '#f43f5e'; // Debuff khác
}

// Vẽ cột dọc gồm các chấm vuông siêu nhỏ viền đen mỏng 1px (BUFF ở trên, DEBUFF ở dưới)
// Nằm bên trái đơn vị nếu quay mặt qua phải (facing === 'RIGHT') và ngược lại
function drawUnitStatusEffectDots(
  ctx: CanvasRenderingContext2D,
  rx: number,
  topY: number,
  facing: 'LEFT' | 'RIGHT',
  statusEffects: ActiveStatusEffect[] = [],
  sideOffset: number = 14
) {
  if (!statusEffects || statusEffects.length === 0) return;

  const sorted = [...statusEffects].sort((a, b) => {
    const aOrder = a.category === 'BUFF' ? 0 : 1;
    const bOrder = b.category === 'BUFF' ? 0 : 1;
    return aOrder - bOrder;
  });

  const dotSize = 4; // Chấm vuông siêu nhỏ (4x4 px gồm viền đen mỏng 1px)
  const gap = 1.5;
  const dotX =
    facing === 'RIGHT'
      ? Math.round(rx - sideOffset - dotSize)
      : Math.round(rx + sideOffset);

  for (let i = 0; i < sorted.length; i++) {
    const dy = Math.round(topY + i * (dotSize + gap));
    const fillColor = getStatusEffectDotColor(sorted[i]);
    // Viền đen mỏng 1px bao ngoài
    ctx.fillStyle = '#000000';
    ctx.fillRect(dotX, dy, dotSize, dotSize);
    // Nhân màu bên trong
    ctx.fillStyle = fillColor;
    ctx.fillRect(dotX + 0.8, dy + 0.8, dotSize - 1.6, dotSize - 1.6);
  }
}

/**
 * Vẽ hiệu ứng tia điện giật (Paralyze Lightning Arcs) chạy quanh cơ thể đơn vị đang chịu debuff Tê Liệt (PARALYZE_DEBUFF).
 * Các đường điện giật được vẽ mỏng manh, sắc nét kèm tia lửa nhỏ li ti.
 */
function drawParalyzeLightningVfx(
  ctx: CanvasRenderingContext2D,
  rx: number,
  ry: number,
  tick: number,
  seed: number
) {
  const phase = Math.floor((tick + seed * 3) / 3) % 4;
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // Vòng điện mảnh đứt đoạn mờ nhẹ quanh người
  ctx.strokeStyle = 'rgba(56, 189, 248, 0.55)';
  ctx.lineWidth = 0.85;
  ctx.setLineDash([4, 3]);
  ctx.beginPath();
  ctx.ellipse(rx, ry - 4, 10.5, 13.5, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);

  // Các đường tia sét vàng - xanh - trắng mỏng manh gấp khúc chạy qua thân đơn vị
  const dir = phase % 2 === 0 ? 1 : -1;
  ctx.strokeStyle = '#fde047';
  ctx.lineWidth = 0.95;
  ctx.beginPath();
  ctx.moveTo(rx - 8.5 * dir, ry - 15);
  ctx.lineTo(rx - 2 * dir, ry - 9.5);
  ctx.lineTo(rx + 5.5 * dir, ry - 11);
  ctx.lineTo(rx - 3.5 * dir, ry - 3);
  ctx.lineTo(rx + 4 * dir, ry - 1);
  ctx.lineTo(rx - 1.5 * dir, ry + 5);
  ctx.stroke();

  // Lõi trắng siêu mảnh trên tia điện chính
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 0.5;
  ctx.beginPath();
  ctx.moveTo(rx - 8.5 * dir, ry - 15);
  ctx.lineTo(rx - 2 * dir, ry - 9.5);
  ctx.lineTo(rx + 5.5 * dir, ry - 11);
  ctx.lineTo(rx - 3.5 * dir, ry - 3);
  ctx.lineTo(rx + 4 * dir, ry - 1);
  ctx.lineTo(rx - 1.5 * dir, ry + 5);
  ctx.stroke();

  // Tia điện phụ xanh lam mỏng manh đan chéo
  ctx.strokeStyle = '#7dd3fc';
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(rx + 7 * dir, ry - 13.5);
  ctx.lineTo(rx + 1 * dir, ry - 7);
  ctx.lineTo(rx - 5.5 * dir, ry - 5);
  ctx.lineTo(rx + 3.5 * dir, ry + 3.5);
  ctx.stroke();

  // Nhánh rẽ tia điện nhỏ mảnh
  ctx.strokeStyle = 'rgba(254, 240, 138, 0.85)';
  ctx.lineWidth = 0.65;
  ctx.beginPath();
  ctx.moveTo(rx - 2 * dir, ry - 9.5);
  ctx.lineTo(rx - 7 * dir, ry - 6.5);
  ctx.moveTo(rx + 1 * dir, ry - 7);
  ctx.lineTo(rx + 6.5 * dir, ry - 3.5);
  ctx.stroke();

  // Hạt tia lửa điện nhỏ mảnh quanh cơ thể
  const sparkOff = (phase - 1.5) * 2.5;
  ctx.fillStyle = '#38bdf8';
  ctx.fillRect(rx - 11, ry - 8 + sparkOff, 1.5, 1.5);
  ctx.fillRect(rx + 9.5, ry - 4 - sparkOff, 1.5, 1.5);
  ctx.fillStyle = '#fde047';
  ctx.fillRect(rx - 7.5, ry + 2 - sparkOff, 1.5, 1.5);
  ctx.fillRect(rx + 7.5, ry - 13.5 + sparkOff, 1.5, 1.5);
  ctx.restore();
}

// Track receding HP bar trails per unit for smooth light-red damage follow effect
const unitHpTrailMap = new Map<
  string,
  { trailRatio: number; holdUntil: number; lastSeen: number }
>();

// Helper to draw Unit HP Bar (giảm 20% chiều cao, đưa lên cao hơn) + Ô vuông Cấp Độ không viền bên trái (Anh Hùng / Quân Lính / Quái Địch) + Nickname + Thanh Nộ Khí cam cực mỏng
function drawUnitHealthBar(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  hp: number,
  maxHp: number,
  barColor: string,
  statusEffects: ActiveStatusEffect[] = [],
  unitKey?: string,
  options?: {
    nickname?: string;
    isHero?: boolean;
    level?: number;
    rage?: number;
    maxRage?: number;
    levelBoxType?: 'HERO' | 'SOLDIER' | 'ENEMY';
  }
) {
  const ratio = Math.max(0, Math.min(1, hp / Math.max(1, maxHp)));
  const isHero = Boolean(options?.isHero);
  const levelBoxType = options?.levelBoxType ?? (isHero ? 'HERO' : undefined);
  const hasLevelBox = Boolean(levelBoxType);
  const by = Math.round(y);
  const now = performance.now();

  // Giảm chiều cao thanh HP đi 20% (4px -> 3.2px, khung viền 6px -> 4.8px)
  const hpFillH = 3.2;
  const frameTopY = by - 0.8;
  const rageBarH = 1.4;
  const totalFrameH = isHero ? 4.8 + rageBarH + 0.8 : 4.8; // 7.0px cho Anh Hùng, 4.8px cho Quân Lính & Quái

  // Ô vuông Cấp Độ bên trái thanh HP:
  // - Anh Hùng: 8.4px
  // - Quân Lính & Quái: 8.0px (vẽ to hơn chiều cao 4.8px của thanh HP đơn vị để đọc số rõ nét)
  // Xem [Ô Cấp Độ + Thanh HP] như 1 cụm thống nhất cân giữa với cơ thể model (x)
  const levelBoxSize = isHero ? 8.4 : hasLevelBox ? 8.0 : 0;
  const combinedTotalW = hasLevelBox ? levelBoxSize + width + 1 : width + 2;
  const compositeLeftX = Math.round(x - combinedTotalW / 2);
  const bx = hasLevelBox
    ? Math.round(compositeLeftX + levelBoxSize)
    : Math.round(x - width / 2);

  let trailRatio = ratio;
  if (unitKey) {
    const existing = unitHpTrailMap.get(unitKey);
    if (!existing) {
      unitHpTrailMap.set(unitKey, {
        trailRatio: ratio,
        holdUntil: 0,
        lastSeen: now,
      });
    } else {
      existing.lastSeen = now;
      if (ratio < existing.trailRatio - 0.002) {
        if (existing.holdUntil === 0) {
          existing.holdUntil = now + 130;
        } else if (now >= existing.holdUntil) {
          existing.trailRatio = Math.max(
            ratio,
            existing.trailRatio - Math.max(0.009, (existing.trailRatio - ratio) * 0.14)
          );
          if (Math.abs(existing.trailRatio - ratio) <= 0.003) {
            existing.trailRatio = ratio;
            existing.holdUntil = 0;
          }
        }
      } else {
        existing.trailRatio = ratio;
        existing.holdUntil = 0;
      }
      trailRatio = existing.trailRatio;
    }
    if (unitHpTrailMap.size > 400) {
      for (const [k, v] of unitHpTrailMap.entries()) {
        if (now - v.lastSeen > 8000) unitHpTrailMap.delete(k);
      }
    }
  }

  const shouldShowHpBar = activeShowUnitHpBar || activeShiftHoldShowHpBar;
  const shouldShowNickname = activeShowUnitNickname;

  if (shouldShowHpBar) {
    // Outer frame của phần thanh HP (+ Nộ khí)
    ctx.fillStyle = '#090d16';
    ctx.fillRect(bx - 1, frameTopY, width + 2, totalFrameH);
    // Missing HP dark track
    ctx.fillStyle = '#1f2937';
    ctx.fillRect(bx, by, width, hpFillH);

    // Current HP fill & Receding Light-Red Trail
    const hpWidth = hp > 0 ? Math.max(2, Math.round(width * ratio)) : 0;
    const trailWidth = Math.max(hpWidth, Math.round(width * trailRatio));

    if (trailWidth > hpWidth) {
      ctx.fillStyle = '#fca5a5';
      ctx.fillRect(bx + hpWidth, by, trailWidth - hpWidth, hpFillH);
    }

    if (hpWidth > 0) {
      ctx.fillStyle = barColor;
      ctx.fillRect(bx, by, hpWidth, hpFillH);
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      ctx.fillRect(bx, by, hpWidth, 0.8);
    }

    // White Shield Bar (Adjacent to right of HP fill, or overlapping right side when HP is full)
    const totalShield = getUnitTotalShield(statusEffects);
    if (totalShield > 0) {
      const shieldRatio = Math.max(0, Math.min(1, totalShield / maxHp));
      const shieldWidth = Math.max(
        2,
        Math.min(width, Math.round(width * shieldRatio))
      );
      const shieldStartX = bx + Math.min(hpWidth, width - shieldWidth);

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(shieldStartX, by, shieldWidth, hpFillH);
      ctx.fillStyle = '#cbd5e1';
      ctx.fillRect(shieldStartX, by + hpFillH - 0.8, shieldWidth, 0.8);
    }

    // Riêng Anh Hùng: Phía dưới thanh HP có thêm thanh nộ khí màu cam cực mỏng
    if (isHero) {
      const rageY = by + hpFillH + 0.8;
      const maxRage = Math.max(1, options?.maxRage ?? 100);
      const currRage = Math.max(0, Math.min(maxRage, options?.rage ?? 0));
      const rageRatio = currRage / maxRage;
      const rageW =
        currRage > 0 ? Math.max(1, Math.round(width * rageRatio)) : 0;

      ctx.fillStyle = '#1f2937';
      ctx.fillRect(bx, rageY, width, rageBarH);
      if (rageW > 0) {
        ctx.fillStyle = rageRatio >= 1 ? '#fb923c' : '#f97316';
        ctx.fillRect(bx, rageY, rageW, rageBarH);
      }
    }

    // Ô vuông Cấp Độ gắn vào bên trái thanh HP cho Anh Hùng, Quân Lính và Quái:
    // - Nền đen đặc (#05070c), KHÔNG có viền
    // - Text Anh Hùng: màu vàng (#fde047)
    // - Text Quân Lính: chỉ lấy số (không lấy chữ T), màu xanh dương nhạt (#7dd3fc)
    // - Text Quái (Địch): chỉ lấy số, màu đỏ nhạt (#fca5a5)
    if (hasLevelBox) {
      const boxX = compositeLeftX;
      const boxY = frameTopY + (totalFrameH - levelBoxSize) / 2;
      const unitLvl = Math.max(1, Math.floor(options?.level ?? 1));
      const lvlStr = `${unitLvl}`;

      ctx.save();
      ctx.fillStyle = '#05070c';
      ctx.fillRect(boxX, boxY, levelBoxSize, levelBoxSize);

      ctx.font = 'bold 5.5px "JetBrains Mono", monospace';
      ctx.fillStyle =
        levelBoxType === 'HERO'
          ? '#fde047'
          : levelBoxType === 'ENEMY'
            ? '#fca5a5'
            : '#7dd3fc';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(
        lvlStr,
        boxX + levelBoxSize / 2,
        boxY + levelBoxSize / 2 + 0.25
      );
      ctx.restore();
    }
  }

  // Trên thanh HP 1.5px: Dòng chữ nhỏ nickname của đơn vị (chỉ lấy chữ bên phải cùng nếu có nhiều hơn 1 chữ)
  // Quân lính: Xanh dương nhạt (#7dd3fc, size 6px), Quái: Đỏ nhạt (#fca5a5, size 6px), Anh hùng: Vàng (#fde047, giữ size 8px)
  if (shouldShowNickname) {
    const rawNick = options?.nickname?.trim() || '';
    if (rawNick.length > 0) {
      const words = rawNick.split(/\s+/).filter(Boolean);
      const rightMostWord =
        words.length > 0 ? words[words.length - 1] : rawNick;
      if (rightMostWord) {
        ctx.save();
        ctx.font = isHero
          ? 'bold 8px "Plus Jakarta Sans", sans-serif'
          : 'bold 6px "Plus Jakarta Sans", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        const textY = frameTopY - 1.5; // Cách mép trên thanh HP đúng 1.5px
        ctx.lineJoin = 'round';
        ctx.lineWidth = isHero ? 1.1 : 0.75;
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.9)';
        ctx.strokeText(rightMostWord, x, textY);
        ctx.fillStyle = isHero
          ? '#fde047'
          : levelBoxType === 'ENEMY'
            ? '#fca5a5'
            : '#7dd3fc';
        ctx.fillText(rightMostWord, x, textY);
        ctx.restore();
      }
    }
  }
}

export function drawKing(
  ctx: CanvasRenderingContext2D,
  king: KingState,
  tick: number
) {
  const { x, y, facing, state, isSelected, windup, hitFlash, hp, maxHp } = king;
  const bob =
    state === 'WALKING' ? Math.round(Math.abs(Math.sin(tick * 0.35)) * -3) : 0;

  const dir = facing === 'RIGHT' ? 1 : -1;
  const chargeOffset =
    windup > 0 ? (windup < 0.75 ? -dir * (windup * 8) : dir * 10) : 0;

  const rx = Math.round(x + chargeOffset);
  const ry = Math.round(y);

  // Luôn vẽ bóng pixel răng cưa dưới chân (kéo dài theo trục ngược nguồn sáng nếu gần Lửa Trại)
  drawSteppedPixelShadow(ctx, rx, ry + 13, 13, 5, 0.44, x, y);

  // Vòng chọn dưới chân mảnh, chỉ có viền (không có màu nền fill)
  if (isSelected) {
    ctx.save();
    ctx.strokeStyle = '#4ade80';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.ellipse(rx, ry + 13, 16, 6.5, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  // Đòn đánh thường giữ tụ lực (chargeOffset) nhưng không hiện vòng tròn thu nhỏ dần trừ khi sắp kích hoạt kỹ năng
  void windup;

  const sprite = getUnitSprite(
    'king',
    KING_MATRIX,
    {
      K: '#141013', // Crisp dark outline
      Y: '#fde047', // Crown highlight gold
      G: '#f59e0b', // Deep royal gold
      R: '#dc2626', // Royal crimson cloak
      C: '#991b1b', // Cloak shadow fold
      B: '#78350f', // Beard
      S: '#fed7aa', // Skin
      E: '#0f172a', // Eyes
      A: '#e2e8f0', // Silver steel breastplate
      W: '#f8fafc', // Greatsword blade
      L: '#292524', // Armored greaves
    },
    facing,
    hitFlash > 0
  );

  ctx.drawImage(
    sprite,
    Math.round(rx - sprite.width / 2),
    Math.round(ry - sprite.height / 2 - 4 + bob)
  );

  drawUnitDirectionalRimHighlight(ctx, rx, ry, facing, bob, 'LARGE', x, y);

  if (windup > 0) {
    drawWeaponWindupCharge(ctx, rx, ry - 4 + bob, windup, '#fde047', facing);
  }

  drawUnitStatusEffectDots(
    ctx,
    rx,
    ry - 22,
    facing,
    king.statusEffects,
    16
  );

  drawUnitHealthBar(
    ctx,
    rx,
    ry - 35,
    34,
    hp,
    maxHp,
    '#22c55e',
    king.statusEffects,
    'KING',
    {
      nickname: 'Vua',
      isHero: true,
      level: 1,
      rage: 0,
      maxRage: 100,
    }
  );
}

export function drawVillager(
  ctx: CanvasRenderingContext2D,
  unit: VillagerUnit,
  tick: number,
  idSeed: number
) {
  ensureCustomSoldierLoaded();

  const {
    role,
    combatClass,
    x,
    y,
    facing,
    isSelected,
    windup,
    hitFlash,
    hp,
    maxHp,
  } = unit;
  const bob = Math.floor((tick + idSeed * 7) / 10) % 2 === 0 ? 0 : -2;
  const dir = facing === 'RIGHT' ? 1 : -1;
  const chargeOffset =
    windup > 0 ? (windup < 0.75 ? -dir * (windup * 6) : dir * 8) : 0;

  const rx = Math.round(x + chargeOffset);
  const ry = Math.round(y);

  // Luôn vẽ bóng pixel răng cưa dưới chân (kéo dài theo trục ngược nguồn sáng nếu gần Lửa Trại)
  drawSteppedPixelShadow(
    ctx,
    rx,
    ry + 12,
    role === 'HERO' ? 13 : 11,
    role === 'HERO' ? 5 : 4,
    0.42,
    x,
    y
  );

  // Vòng chọn dưới chân nhân vật mảnh hơn và chỉ có viền (bỏ màu nền fill)
  if (isSelected) {
    ctx.save();
    ctx.strokeStyle = '#4ade80';
    ctx.lineWidth = 1.15;
    ctx.beginPath();
    ctx.ellipse(
      rx,
      ry + 12,
      role === 'HERO' ? 15.5 : 13.5,
      role === 'HERO' ? 6 : 5.2,
      0,
      0,
      Math.PI * 2
    );
    ctx.stroke();
    ctx.restore();
  }

  const windupColor =
    role === 'HERO'
      ? '#fde047'
      : role === 'PEASANT'
        ? '#fbbf24'
        : combatClass === 'RANGED'
          ? '#4ade80'
          : '#60a5fa';

  // CHỈ khi kích hoạt kỹ năng mới có thêm hiệu ứng vòng tròn thu nhỏ lại
  if (windup > 0 && unit.windupWillProcSkill) {
    drawSkillWindupCircle(ctx, rx, ry - 4, windup, windupColor);
  }

  if (role === 'PEASANT') {
    const sprite = getUnitSprite(
      'peasant',
      PEASANT_MATRIX,
      {
        K: '#141013',
        Y: '#facc15', // Straw hat
        S: '#fed7aa',
        E: '#1e293b',
        T: '#a16207', // Tunic
        B: '#78350f', // Belt
        L: '#451a03',
      },
      facing,
      hitFlash > 0
    );
    ctx.drawImage(
      sprite,
      Math.round(rx - sprite.width / 2),
      Math.round(ry - sprite.height / 2 - 2 + bob)
    );
    drawUnitDirectionalRimHighlight(ctx, rx, ry, facing, bob, 'SMALL', x, y);
    if (windup > 0) {
      drawWeaponWindupCharge(ctx, rx, ry - 2 + bob, windup, windupColor, facing);
    }

    // Draw golden wheat sack/bundle when peasant is carrying harvested food back to Warehouse
    if (unit.carryingFood) {
      const sackX = facing === 'RIGHT' ? rx + 6 : rx - 14;
      const sackY = ry - 6 + bob;
      ctx.fillStyle = '#141013';
      ctx.fillRect(sackX - 1, sackY - 1, 9, 8);
      ctx.fillStyle = '#eab308';
      ctx.fillRect(sackX, sackY, 7, 6);
      ctx.fillStyle = '#fef08a';
      ctx.fillRect(sackX + 1, sackY + 1, 5, 2);
    }
    return;
  }

  // 1. ANH HÙNG (HERO — Ví dụ: Farel triệu hồi từ Điện Anh Hùng)
  if (role === 'HERO') {
    const heroSprite = getUnitSprite(
      'hero_farel',
      KING_MATRIX,
      {
        K: '#141013', // Crisp dark outline
        Y: '#fde047', // Golden crown/crest
        G: '#f59e0b', // Royal gold trim
        R: '#dc2626', // Heroic crimson cloak
        C: '#991b1b', // Cloak shadow fold
        B: '#78350f', // Hair/beard
        S: '#fed7aa', // Skin
        E: '#0f172a', // Eyes
        A: '#e2e8f0', // Silver-steel breastplate
        W: '#38bdf8', // Glowing holy sword blade
        L: '#292524', // Armored greaves
      },
      facing,
      hitFlash > 0
    );

    ctx.drawImage(
      heroSprite,
      Math.round(rx - heroSprite.width / 2),
      Math.round(ry - heroSprite.height / 2 - 4 + bob)
    );
    drawUnitDirectionalRimHighlight(ctx, rx, ry, facing, bob, 'LARGE', x, y);
    if (windup > 0) {
      drawWeaponWindupCharge(ctx, rx, ry - 4 + bob, windup, windupColor, facing);
    }

    if (unit.statusEffects?.some((ef) => ef.effectId === 'PARALYZE_DEBUFF')) {
      drawParalyzeLightningVfx(ctx, rx, ry, tick, idSeed);
    }

    drawUnitStatusEffectDots(
      ctx,
      rx,
      ry - 22,
      facing,
      unit.statusEffects,
      16
    );

    const heroNick =
      unit.nickname && unit.nickname.trim().length > 0
        ? unit.nickname
        : unit.unitName || 'Farel';

    drawUnitHealthBar(
      ctx,
      rx,
      ry - 34,
      32,
      hp,
      maxHp,
      '#fde047',
      unit.statusEffects,
      unit.id,
      {
        nickname: heroNick,
        isHero: true,
        level: unit.level ?? 1,
        rage: unit.rage ?? 0,
        maxRage: unit.maxRage ?? 100,
      }
    );
    return;
  }

  const soldierNick =
    unit.nickname && unit.nickname.trim().length > 0
      ? unit.nickname
      : unit.unitName || '';

  // Bỏ model ảnh cung thủ, tạm dùng model của Cấm Vệ Quân cho cả cận chiến và cung thủ
  const activeCustomSprites = customSoldierSprites;

  if (activeCustomSprites) {
    const isFlashing = hitFlash > 0;
    const sprite =
      facing === 'RIGHT'
        ? isFlashing
          ? activeCustomSprites.rightFlash
          : activeCustomSprites.rightNormal
        : isFlashing
        ? activeCustomSprites.leftFlash
        : activeCustomSprites.leftNormal;

    ctx.drawImage(
      sprite,
      Math.round(rx - sprite.width / 2),
      Math.round(ry - sprite.height / 2 - 4 + bob)
    );
    drawUnitDirectionalRimHighlight(ctx, rx, ry, facing, bob, 'NORMAL', x, y);
    if (windup > 0) {
      drawWeaponWindupCharge(ctx, rx, ry - 3 + bob, windup, windupColor, facing);
    }

    if (unit.statusEffects?.some((ef) => ef.effectId === 'PARALYZE_DEBUFF')) {
      drawParalyzeLightningVfx(ctx, rx, ry, tick, idSeed);
    }

    drawUnitStatusEffectDots(
      ctx,
      rx,
      ry - 20,
      facing,
      unit.statusEffects,
      14
    );

    drawUnitHealthBar(
      ctx,
      rx,
      ry - 32,
      24,
      hp,
      maxHp,
      '#4ade80',
      unit.statusEffects,
      unit.id,
      {
        nickname: soldierNick,
        isHero: false,
        level: unit.tier ?? 1,
        levelBoxType: 'SOLDIER',
      }
    );
    return;
  }

  if (combatClass === 'RANGED') {
    const sprite = getUnitSprite(
      'archer',
      ARCHER_MATRIX,
      {
        K: '#141013',
        G: '#0f766e',
        T: '#0d9488',
        C: '#b45309',
        S: '#fed7aa',
        E: '#0f172a',
        W: '#f59e0b',
        L: '#1e293b',
      },
      facing,
      hitFlash > 0
    );
    ctx.drawImage(
      sprite,
      Math.round(rx - sprite.width / 2),
      Math.round(ry - sprite.height / 2 - 2 + bob)
    );
    drawUnitDirectionalRimHighlight(ctx, rx, ry, facing, bob, 'NORMAL', x, y);
    if (windup > 0) {
      drawWeaponWindupCharge(ctx, rx, ry - 2 + bob, windup, windupColor, facing);
    }
    drawUnitStatusEffectDots(
      ctx,
      rx,
      ry - 18,
      facing,
      unit.statusEffects,
      13
    );
    drawUnitHealthBar(
      ctx,
      rx,
      ry - 28,
      22,
      hp,
      maxHp,
      '#4ade80',
      unit.statusEffects,
      unit.id,
      {
        nickname: soldierNick,
        isHero: false,
        level: unit.tier ?? 1,
        levelBoxType: 'SOLDIER',
      }
    );
  } else {
    const sprite = getUnitSprite(
      'knight',
      KNIGHT_MATRIX,
      {
        K: '#141013',
        H: '#94a3b8',
        B: '#1d4ed8',
        A: '#e2e8f0',
        G: '#fbbf24',
        S: '#fed7aa',
        E: '#0f172a',
        W: '#f8fafc',
        L: '#334155',
      },
      facing,
      hitFlash > 0
    );
    ctx.drawImage(
      sprite,
      Math.round(rx - sprite.width / 2),
      Math.round(ry - sprite.height / 2 - 2 + bob)
    );
    drawUnitDirectionalRimHighlight(ctx, rx, ry, facing, bob, 'NORMAL', x, y);
    if (windup > 0) {
      drawWeaponWindupCharge(ctx, rx, ry - 2 + bob, windup, windupColor, facing);
    }
    drawUnitStatusEffectDots(
      ctx,
      rx,
      ry - 18,
      facing,
      unit.statusEffects,
      13
    );
    drawUnitHealthBar(
      ctx,
      rx,
      ry - 28,
      22,
      hp,
      maxHp,
      '#4ade80',
      unit.statusEffects,
      unit.id,
      {
        nickname: soldierNick,
        isHero: false,
        level: unit.tier ?? 1,
        levelBoxType: 'SOLDIER',
      }
    );
  }
}

export function drawEnemy(
  ctx: CanvasRenderingContext2D,
  enemy: EnemyUnit,
  tick: number,
  idx: number
) {
  ensureCustomSoldierLoaded();
  const { x, y, kind, facing, hp, maxHp, windup, hitFlash } = enemy;

  // ==========================================================================
  // VẼ CÔNG TRÌNH ĐỊCH: TRẠI QUÂN ĐỊCH (CAMP_BUILDING) & THÁP CANH (WATCHTOWER)
  // Có thanh máu, có thể bị tấn công nhưng miễn nhiễm debuff (không vẽ dot debuff)
  // ==========================================================================
  if (kind === 'CAMP_BUILDING' || kind === 'WATCHTOWER') {
    const rx = Math.round(x);
    const ry = Math.round(y);
    const isFlash = hitFlash > 0;

    // Chế độ Vương Quốc vs Vương Quốc (PvP): Nếu là 1 trong 4 loại Tháp Phòng Thủ của Vương Quốc bị tấn công
    if (enemy.pvpTowerType) {
      const tx = rx - 32;
      const ty = ry - 48;
      if (enemy.isSelected) {
        ctx.save();
        ctx.strokeStyle = '#fde047';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.ellipse(rx, ry + 8, 22, 9, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }
      // Tái sử dụng trực tiếp bộ vẽ 8-bit của 4 loại Tháp Phòng Thủ nhưng hiển thị thanh máu ĐỎ của Phe Địch
      drawBuilding(
        ctx,
        {
          id: enemy.id,
          type: enemy.pvpTowerType,
          gridX: tx / TILE_SIZE,
          gridY: ty / TILE_SIZE,
          level: enemy.level || 1,
          buildProgress: 100,
          isConstructed: true,
          lastProducedAt: 0,
          hp: enemy.hp,
          maxHp: enemy.maxHp,
          hitFlash: enemy.hitFlash,
          windup: enemy.windup,
          facing: enemy.facing,
        },
        tick,
        false
      );
      drawUnitHealthBar(
        ctx,
        rx,
        ty - 18,
        34,
        hp,
        maxHp,
        '#ef4444',
        [],
        enemy.id,
        {
          nickname:
            enemy.name ||
            enemy.unitName ||
            `Tháp Phòng Thủ Lv.${enemy.level || 1}`,
          isHero: false,
        }
      );
      return;
    }

    drawSteppedPixelShadow(
      ctx,
      rx,
      ry + 11,
      kind === 'CAMP_BUILDING' ? 27 : 18,
      kind === 'CAMP_BUILDING' ? 11 : 8,
      0.46,
      x,
      y
    );

    ctx.save();
    if (enemy.isSelected) {
      ctx.strokeStyle = '#fde047';
      ctx.lineWidth = 1.25;
      ctx.beginPath();
      ctx.ellipse(
        rx,
        ry + 10,
        kind === 'CAMP_BUILDING' ? 29 : 20,
        kind === 'CAMP_BUILDING' ? 13 : 9,
        0,
        0,
        Math.PI * 2
      );
      ctx.stroke();
    }

    if (kind === 'CAMP_BUILDING') {
      // 1. TRẠI QUÂN ĐỊCH TRUNG TÂM (Lều Đại Bản Doanh Hắc Ám + Hàng Rào Cọc Nhọn + Đầu Lâu & Chậu Lửa)
      // Nền đá đen isometric dưới chân trại
      ctx.fillStyle = isFlash ? '#ffffff' : '#1c1917';
      ctx.beginPath();
      ctx.moveTo(rx, ry - 4);
      ctx.lineTo(rx + 28, ry + 10);
      ctx.lineTo(rx, ry + 24);
      ctx.lineTo(rx - 28, ry + 10);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#090508';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Cọc gỗ nhọn phòng thủ hai bên sườn
      const drawSpikePost = (px: number, py: number) => {
        ctx.fillStyle = isFlash ? '#fecaca' : '#451a03';
        ctx.fillRect(px - 2, py - 14, 4, 15);
        ctx.fillStyle = isFlash ? '#ffffff' : '#e5e7eb';
        ctx.beginPath();
        ctx.moveTo(px - 2.5, py - 14);
        ctx.lineTo(px, py - 19);
        ctx.lineTo(px + 2.5, py - 14);
        ctx.closePath();
        ctx.fill();
      };
      drawSpikePost(rx - 22, ry + 8);
      drawSpikePost(rx - 15, ry + 13);
      drawSpikePost(rx + 22, ry + 8);
      drawSpikePost(rx + 15, ry + 13);

      // Thân Lều Chiến Đỏ Thẫm Hắc Ám (Isometric 3D Tent)
      ctx.fillStyle = isFlash ? '#fca5a5' : '#7f1d1d';
      ctx.beginPath();
      ctx.moveTo(rx, ry - 34);
      ctx.lineTo(rx + 22, ry - 6);
      ctx.lineTo(rx, ry + 14);
      ctx.lineTo(rx - 22, ry - 6);
      ctx.closePath();
      ctx.fill();

      // Mặt sáng bên trái mái lều
      ctx.fillStyle = isFlash ? '#ffffff' : '#b91c1c';
      ctx.beginPath();
      ctx.moveTo(rx, ry - 34);
      ctx.lineTo(rx, ry + 14);
      ctx.lineTo(rx - 22, ry - 6);
      ctx.closePath();
      ctx.fill();

      // Dải viền giáp sắt đen và sừng xương trên nóc trại
      ctx.strokeStyle = '#090508';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(rx, ry - 34);
      ctx.lineTo(rx + 22, ry - 6);
      ctx.lineTo(rx, ry + 14);
      ctx.lineTo(rx - 22, ry - 6);
      ctx.closePath();
      ctx.stroke();

      // Cổng vòm tối lối vào trại
      ctx.fillStyle = '#090508';
      ctx.beginPath();
      ctx.moveTo(rx - 7, ry + 12);
      ctx.lineTo(rx - 5, ry - 4);
      ctx.lineTo(rx + 5, ry - 4);
      ctx.lineTo(rx + 7, ry + 12);
      ctx.closePath();
      ctx.fill();

      // Cặp sừng xương trắng và Đầu lâu chiến tộc trên đỉnh cổng
      ctx.fillStyle = '#e5e7eb';
      ctx.fillRect(rx - 9, ry - 26, 4, 2);
      ctx.fillRect(rx - 11, ry - 29, 3, 3);
      ctx.fillRect(rx + 5, ry - 26, 4, 2);
      ctx.fillRect(rx + 8, ry - 29, 3, 3);

      // Đầu lâu trắng mắt đỏ rực ở tâm mái lều
      ctx.fillStyle = '#f3f4f6';
      ctx.fillRect(rx - 4, ry - 15, 8, 6);
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(rx - 3, ry - 13, 2, 2);
      ctx.fillRect(rx + 1, ry - 13, 2, 2);

      // Ngọn cờ chiến đỏ đen tung bay trên đỉnh chóp
      const waveOffset = Math.sin((tick + idx * 4) * 0.18) * 2.5;
      ctx.fillStyle = '#fbbf24';
      ctx.fillRect(rx - 1, ry - 44, 2, 11);
      ctx.fillStyle = '#dc2626';
      ctx.beginPath();
      ctx.moveTo(rx + 1, ry - 43);
      ctx.lineTo(rx + 13 + waveOffset, ry - 40);
      ctx.lineTo(rx + 1, ry - 36);
      ctx.closePath();
      ctx.fill();

      // Chậu lửa trại bập bùng phía trước cổng
      const flameH = 4 + (Math.floor((tick + idx * 3) / 5) % 3);
      ctx.fillStyle = '#27272a';
      ctx.fillRect(rx - 12, ry + 12, 6, 3);
      ctx.fillStyle = '#f97316';
      ctx.fillRect(rx - 11, ry + 12 - flameH, 4, flameH);
      ctx.fillStyle = '#fde047';
      ctx.fillRect(rx - 10, ry + 13 - flameH, 2, Math.max(1, flameH - 1));
    } else {
      // 2. THÁP CANH HẮC ÁM (WATCHTOWER — Tháp Canh Gỗ Đá Đen Bắn Tên Tầm Xa)
      // Chân đế đá hắc diện thạch
      ctx.fillStyle = isFlash ? '#ffffff' : '#27272a';
      ctx.fillRect(rx - 11, ry - 4, 22, 14);
      ctx.fillStyle = isFlash ? '#e5e7eb' : '#3f3f46';
      ctx.fillRect(rx - 11, ry - 4, 11, 14);
      ctx.strokeStyle = '#090508';
      ctx.lineWidth = 1.2;
      ctx.strokeRect(rx - 11, ry - 4, 22, 14);

      // Thân trụ gỗ sẫm gia cố đai sắt
      ctx.fillStyle = isFlash ? '#fca5a5' : '#451a03';
      ctx.fillRect(rx - 9, ry - 24, 18, 20);
      ctx.fillStyle = isFlash ? '#fed7aa' : '#78350f';
      ctx.fillRect(rx - 9, ry - 24, 8, 20);
      ctx.fillStyle = '#18181b';
      ctx.fillRect(rx - 10, ry - 15, 20, 2);
      ctx.fillRect(rx - 10, ry - 6, 20, 2);

      // Sàn vọng gác xạ thủ & lỗ châu mai phát sáng
      ctx.fillStyle = isFlash ? '#ffffff' : '#1f2937';
      ctx.fillRect(rx - 12, ry - 32, 24, 8);
      ctx.strokeStyle = '#090508';
      ctx.strokeRect(rx - 12, ry - 32, 24, 8);
      ctx.fillStyle = '#090508';
      ctx.fillRect(rx - 6, ry - 30, 12, 4);
      // Mắt xạ thủ / cung nỏ hắc ám phát sáng bên trong vọng gác
      ctx.fillStyle = windup > 0 ? '#fde047' : '#f43f5e';
      ctx.fillRect(rx - 3, ry - 29, 2, 2);
      ctx.fillRect(rx + 1, ry - 29, 2, 2);

      // Mái chóp nhọn đỏ thẫm của Tháp Canh
      ctx.fillStyle = isFlash ? '#fca5a5' : '#991b1b';
      ctx.beginPath();
      ctx.moveTo(rx, ry - 46);
      ctx.lineTo(rx + 15, ry - 32);
      ctx.lineTo(rx - 15, ry - 32);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = isFlash ? '#ffffff' : '#dc2626';
      ctx.beginPath();
      ctx.moveTo(rx, ry - 46);
      ctx.lineTo(rx, ry - 32);
      ctx.lineTo(rx - 15, ry - 32);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#090508';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(rx, ry - 46);
      ctx.lineTo(rx + 15, ry - 32);
      ctx.lineTo(rx - 15, ry - 32);
      ctx.closePath();
      ctx.stroke();

      // Điểm bắn & tụ lực của Tháp Canh Địch đặt phía trên đỉnh chóp (ry - 46) một khoảng -> ry - 56
      if (windup > 0) {
        drawWeaponWindupCharge(
          ctx,
          rx,
          ry - 56,
          windup,
          '#f43f5e',
          facing
        );
      }
    }
    ctx.restore();

    // Thanh máu của Công Trình Địch (rộng hơn lính thường, đặt phía trên đỉnh công trình & điểm bắn, không có dot debuff)
    drawUnitHealthBar(
      ctx,
      rx,
      kind === 'CAMP_BUILDING' ? ry - 50 : ry - 64,
      kind === 'CAMP_BUILDING' ? 40 : 30,
      hp,
      maxHp,
      '#ef4444',
      [],
      enemy.id,
      {
        nickname:
          enemy.nickname ||
          (kind === 'CAMP_BUILDING' ? 'Trại Địch' : 'Tháp Canh'),
        isHero: false,
      }
    );
    return;
  }

  const bob = Math.floor((tick + idx * 5) / 9) % 2 === 0 ? 0 : -2;
  const dir = facing === 'RIGHT' ? 1 : -1;
  const chargeOffset =
    windup > 0 ? (windup < 0.75 ? -dir * (windup * 8) : dir * 10) : 0;

  const rx = Math.round(x + chargeOffset);
  const ry = Math.round(y);

  // Luôn vẽ bóng pixel răng cưa dưới chân quân địch (kéo dài theo trục ngược nguồn sáng nếu gần Lửa Trại)
  drawSteppedPixelShadow(
    ctx,
    rx,
    ry + 11,
    enemy.pvpUnitArchetype === 'KING' ? 13 : 11,
    enemy.pvpUnitArchetype === 'KING' ? 5 : 4,
    0.42,
    x,
    y
  );

  // Vòng chọn dưới chân quân địch mảnh, chỉ có viền (không có màu nền fill)
  if (enemy.isSelected) {
    ctx.save();
    ctx.strokeStyle = '#fde047';
    ctx.lineWidth = 1.15;
    ctx.beginPath();
    ctx.ellipse(rx, ry + 11, 14.5, 5.5, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  const enemyWindupColor =
    kind === 'MELEE'
      ? '#ef4444'
      : kind === 'MAGE'
        ? '#e879f9'
        : '#c084fc';

  // CHỈ hiện hiệu ứng vòng tròn thu nhỏ dần khi đòn tấn công sắp kích hoạt kỹ năng
  if (windup > 0 && enemy.windupWillProcSkill) {
    drawSkillWindupCircle(ctx, rx, ry - 5, windup, enemyWindupColor);
  }

  if (enemy.pvpUnitArchetype === 'KING') {
    const heroSprite = getUnitSprite(
      'hero_farel',
      KING_MATRIX,
      {
        K: '#141013',
        Y: '#fde047',
        G: '#f59e0b',
        R: '#dc2626',
        C: '#991b1b',
        B: '#78350f',
        S: '#fed7aa',
        E: '#0f172a',
        A: '#e2e8f0',
        W: '#38bdf8',
        L: '#292524',
      },
      facing,
      hitFlash > 0
    );
    ctx.drawImage(
      heroSprite,
      Math.round(rx - heroSprite.width / 2),
      Math.round(ry - heroSprite.height / 2 - 4 + bob)
    );
  } else if (
    enemy.pvpUnitArchetype === 'SOLDIER_MELEE' ||
    enemy.pvpUnitArchetype === 'SOLDIER_RANGED'
  ) {
    // Trong chế độ Vương Quốc vs Vương Quốc: Sử dụng trực tiếp model asset đã tải của quân lính giống hệt phe ta
    if (customSoldierSprites) {
      const isFlashing = hitFlash > 0;
      const sprite =
        facing === 'RIGHT'
          ? isFlashing
            ? customSoldierSprites.rightFlash
            : customSoldierSprites.rightNormal
          : isFlashing
            ? customSoldierSprites.leftFlash
            : customSoldierSprites.leftNormal;
      ctx.drawImage(
        sprite,
        Math.round(rx - sprite.width / 2),
        Math.round(ry - sprite.height / 2 - 4 + bob)
      );
    } else if (enemy.pvpUnitArchetype === 'SOLDIER_RANGED') {
      const sprite = getUnitSprite(
        'archer',
        ARCHER_MATRIX,
        {
          K: '#141013',
          G: '#0f766e',
          T: '#0d9488',
          C: '#b45309',
          S: '#fed7aa',
          E: '#0f172a',
          W: '#f59e0b',
          L: '#1e293b',
        },
        facing,
        hitFlash > 0
      );
      ctx.drawImage(
        sprite,
        Math.round(rx - sprite.width / 2),
        Math.round(ry - sprite.height / 2 - 2 + bob)
      );
    } else {
      const sprite = getUnitSprite(
        'knight',
        KNIGHT_MATRIX,
        {
          K: '#141013',
          H: '#94a3b8',
          B: '#1d4ed8',
          A: '#e2e8f0',
          G: '#fbbf24',
          S: '#fed7aa',
          E: '#0f172a',
          W: '#f8fafc',
          L: '#334155',
        },
        facing,
        hitFlash > 0
      );
      ctx.drawImage(
        sprite,
        Math.round(rx - sprite.width / 2),
        Math.round(ry - sprite.height / 2 - 2 + bob)
      );
    }
  } else if (kind === 'MELEE') {
    const sprite = getUnitSprite(
      'enemy_melee',
      ENEMY_MELEE_MATRIX,
      {
        K: '#090508',
        W: '#e4e4e7', // Bone horns
        D: '#27272a', // Dark iron armor
        R: '#ef4444', // Glowing crimson eyes
        M: '#991b1b', // Blood-red breastplate
        A: '#cbd5e1', // Heavy war axe blade
        L: '#18181b',
      },
      facing,
      hitFlash > 0
    );
    ctx.drawImage(
      sprite,
      Math.round(rx - sprite.width / 2),
      Math.round(ry - sprite.height / 2 - 2 + bob)
    );
  } else if (kind === 'MAGE') {
    const sprite = getUnitSprite(
      'enemy_mage',
      ENEMY_MAGE_MATRIX,
      {
        K: '#090508',
        M: '#5b21b6', // Pointed arcane hat
        P: '#3b0764', // Dark mage robe
        D: '#0f172a', // Shadowed face
        R: '#f472b6', // Glowing magenta eye
        C: '#38bdf8', // Glowing cyan eye
        V: '#7e22ce', // Lower robe trim
        W: '#78350f', // Wooden arcane staff
        O: '#e879f9', // Staff energy orb
        L: '#1e1b4b',
      },
      facing,
      hitFlash > 0
    );
    ctx.drawImage(
      sprite,
      Math.round(rx - sprite.width / 2),
      Math.round(ry - sprite.height / 2 - 2 + bob)
    );
  } else {
    const sprite = getUnitSprite(
      'enemy_ranged',
      ENEMY_RANGED_MATRIX,
      {
        K: '#090508',
        P: '#4c1d95', // Shadow hood & cloak
        D: '#1e1b4b', // Void mask
        R: '#f43f5e', // Glowing magenta eyes
        V: '#7e22ce', // Dark violet tunic
        W: '#c084fc', // Arcane dark bow
        L: '#1e1b4b',
      },
      facing,
      hitFlash > 0
    );
    ctx.drawImage(
      sprite,
      Math.round(rx - sprite.width / 2),
      Math.round(ry - sprite.height / 2 - 2 + bob)
    );
  }

  // Highlight nhẹ 1 phần mặt & ngực (nếu quay mặt về lửa trại) hoặc sau đầu & lưng (nếu quay lưng) cho cả kẻ địch
  drawUnitDirectionalRimHighlight(
    ctx,
    rx,
    ry,
    facing,
    bob,
    enemy.pvpUnitArchetype === 'KING' ? 'LARGE' : 'NORMAL',
    x,
    y
  );

  // Hiệu ứng tụ lực trên vũ khí / tay cho mọi loại quân địch khi chuẩn bị ra đòn (windup > 0)
  if (windup > 0) {
    drawWeaponWindupCharge(
      ctx,
      rx,
      ry - 3 + bob,
      windup,
      enemyWindupColor,
      facing
    );
  }

  // Subtle ambient poison bubbles on enemy body while poisoned
  if (enemy.statusEffects?.some((ef) => ef.effectId === 'POISON_DOT')) {
    const bubbleY = (tick + idx * 7) % 14;
    ctx.fillStyle = '#4ade80';
    ctx.fillRect(rx - 6, ry - 4 - bubbleY, 3, 3);
    ctx.fillStyle = '#a855f7';
    ctx.fillRect(rx + 4, ry - 2 - ((bubbleY + 6) % 14), 3, 3);
  }

  // Hiệu ứng điện giật Tê Liệt (PARALYZE_DEBUFF) trên người kẻ địch
  if (enemy.statusEffects?.some((ef) => ef.effectId === 'PARALYZE_DEBUFF')) {
    drawParalyzeLightningVfx(ctx, rx, ry, tick, idx);
  }

  drawUnitStatusEffectDots(
    ctx,
    rx,
    ry - 19,
    facing,
    enemy.statusEffects,
    14
  );

  const enemyLabel = enemy.nickname || enemy.unitName || (enemy.pvpUnitArchetype ? enemy.name : undefined);
  drawUnitHealthBar(
    ctx,
    rx,
    ry - 30,
    enemy.pvpUnitArchetype === 'KING' ? 30 : 24,
    hp,
    maxHp,
    '#ef4444',
    enemy.statusEffects,
    enemy.id,
    {
      nickname: enemyLabel,
      isHero: enemy.pvpUnitArchetype === 'KING',
      level: enemy.level ?? enemy.tier ?? 1,
      levelBoxType: 'ENEMY',
    }
  );
}

/**
 * Vẽ hiệu ứng đơn vị địch chết:
 * - Pha 1 (0 -> 260ms): Ngã văng ra đất về hướng ngược lại với kẻ giết mình, xoay dần theo phương chéo của mặt đất 2.5D
 * - Pha 2 (260 -> 750ms): Nằm chéo theo chiều bản đồ 2.5D Isometric trên mặt đất
 * - Pha 3 (750 -> durationMs): Mờ dần rồi biến mất
 */
export function drawDefeatedEnemyCorpse(
  ctx: CanvasRenderingContext2D,
  corpse: DefeatedEnemyCorpse,
  now: number
) {
  ensureCustomSoldierLoaded();
  const elapsed = Math.max(0, now - corpse.createdAt);
  if (elapsed >= corpse.durationMs) return;

  const fallDuration = 260;
  const fadeStart = 750;
  const fallProgress = Math.min(1, elapsed / fallDuration);
  // Ease-out để cú ngã văng xuống mặt đất có lực và dứt khoát
  const easedFall = 1 - Math.pow(1 - fallProgress, 2);
  const alpha =
    elapsed <= fadeStart
      ? 1
      : Math.max(
          0,
          1 - (elapsed - fadeStart) / Math.max(1, corpse.durationMs - fadeStart)
        );

  const rx = Math.round(corpse.x);
  const ry = Math.round(corpse.y);
  const fallDir: 1 | -1 = corpse.fallDir === -1 ? -1 : 1;

  // Góc nghiêng mặt phẳng Isometric 2.5D (tỉ lệ 2:1 -> atan2(0.375, 0.75) ≈ 26.565 độ)
  const isoGroundSlopeAngle = Math.atan2(0.375, 0.75);
  // Góc xoay từ đứng thẳng (0) sang nằm chéo song song với cạnh ô đất 2.5D (±63.435 độ)
  const targetLieAngle = fallDir * (Math.PI / 2 - isoGroundSlopeAngle);
  const rotAngle = targetLieAngle * easedFall;

  // Nảy nhẹ theo quỹ đạo văng rồi đáp xuống đất
  const arcHop =
    fallProgress < 1 ? Math.sin(fallProgress * Math.PI) * -9 : 0;

  let sprite: HTMLCanvasElement;
  if (corpse.pvpUnitArchetype === 'KING') {
    sprite = getUnitSprite(
      'hero_farel',
      KING_MATRIX,
      {
        K: '#141013',
        Y: '#fde047',
        G: '#f59e0b',
        R: '#dc2626',
        C: '#991b1b',
        B: '#78350f',
        S: '#fed7aa',
        E: '#0f172a',
        A: '#e2e8f0',
        W: '#38bdf8',
        L: '#292524',
      },
      corpse.facing,
      elapsed < 90
    );
  } else if (
    (corpse.pvpUnitArchetype === 'SOLDIER_MELEE' ||
      corpse.pvpUnitArchetype === 'SOLDIER_RANGED') &&
    customSoldierSprites
  ) {
    const isFlashing = elapsed < 90;
    sprite =
      corpse.facing === 'RIGHT'
        ? isFlashing
          ? customSoldierSprites.rightFlash
          : customSoldierSprites.rightNormal
        : isFlashing
          ? customSoldierSprites.leftFlash
          : customSoldierSprites.leftNormal;
  } else if (corpse.pvpUnitArchetype === 'SOLDIER_MELEE') {
    sprite = getUnitSprite(
      'knight',
      KNIGHT_MATRIX,
      {
        K: '#141013',
        H: '#94a3b8',
        B: '#1d4ed8',
        A: '#e2e8f0',
        G: '#fbbf24',
        S: '#fed7aa',
        E: '#0f172a',
        W: '#f8fafc',
        L: '#334155',
      },
      corpse.facing,
      elapsed < 90
    );
  } else if (corpse.pvpUnitArchetype === 'SOLDIER_RANGED') {
    sprite = getUnitSprite(
      'archer',
      ARCHER_MATRIX,
      {
        K: '#141013',
        G: '#0f766e',
        T: '#0d9488',
        C: '#b45309',
        S: '#fed7aa',
        E: '#0f172a',
        W: '#f59e0b',
        L: '#1e293b',
      },
      corpse.facing,
      elapsed < 90
    );
  } else if (corpse.kind === 'MELEE') {
    sprite = getUnitSprite(
      'enemy_melee',
      ENEMY_MELEE_MATRIX,
      {
        K: '#090508',
        W: '#e4e4e7',
        D: '#27272a',
        R: '#ef4444',
        M: '#991b1b',
        A: '#cbd5e1',
        L: '#18181b',
      },
      corpse.facing,
      elapsed < 90
    );
  } else if (corpse.kind === 'MAGE') {
    sprite = getUnitSprite(
      'enemy_mage',
      ENEMY_MAGE_MATRIX,
      {
        K: '#090508',
        M: '#5b21b6',
        P: '#3b0764',
        D: '#0f172a',
        R: '#f472b6',
        C: '#38bdf8',
        V: '#7e22ce',
        W: '#78350f',
        O: '#e879f9',
        L: '#1e1b4b',
      },
      corpse.facing,
      elapsed < 90
    );
  } else {
    sprite = getUnitSprite(
      'enemy_ranged',
      ENEMY_RANGED_MATRIX,
      {
        K: '#090508',
        P: '#4c1d95',
        D: '#1e1b4b',
        R: '#f43f5e',
        V: '#7e22ce',
        W: '#c084fc',
        L: '#1e1b4b',
      },
      corpse.facing,
      elapsed < 90
    );
  }

  ctx.save();
  ctx.globalAlpha = alpha;

  // Bóng đổ dưới mặt đất xoay chéo theo đúng trục 2.5D của thi thể
  const shadowRx = 10 + easedFall * 6;
  const shadowRy = 4.2;
  const shadowCenterX = rx + fallDir * easedFall * 8;
  const shadowCenterY = ry + 9 - easedFall * 3.5;
  ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
  ctx.beginPath();
  ctx.ellipse(
    shadowCenterX,
    shadowCenterY,
    shadowRx,
    shadowRy,
    -fallDir * isoGroundSlopeAngle * easedFall,
    0,
    Math.PI * 2
  );
  ctx.fill();

  // Xoay quanh điểm chân sát mặt đất để khi ngã xuống thân model nằm chéo theo mặt phẳng 2.5D
  ctx.translate(rx, ry + 8 + arcHop);
  ctx.rotate(rotAngle);
  // Nén nhẹ theo phương vuông góc khi đã nằm xuống để tạo chiều sâu phối cảnh 2.5D
  ctx.scale(1, 1 - easedFall * 0.1);
  ctx.drawImage(
    sprite,
    Math.round(-sprite.width / 2),
    Math.round(-sprite.height + 4)
  );

  ctx.restore();
}

// ============================================================================
// 5. KỸ NĂNG ĐỊNH HƯỚNG (KIỂU LIÊN MINH HUYỀN THOẠI) & THÁNH KIẾM FAREL
// ============================================================================

/**
 * Vẽ vùng chọn hướng tấn công & vùng ảnh hưởng hình chữ nhật kéo dài (LoL Linear Skillshot Indicator)
 * bắt đầu từ dưới chân Farel hướng theo con trỏ chuột.
 */
export function drawSkillTargetingIndicator(
  ctx: CanvasRenderingContext2D,
  casterX: number,
  casterY: number,
  targetAngle: number,
  aoeLength: number,
  aoeWidth: number,
  tick: number
) {
  const halfW = aoeWidth / 2;
  const pulse = 0.85 + Math.sin(tick * 0.18) * 0.15;

  ctx.save();

  // Vòng tròn định vị dưới chân Farel
  ctx.strokeStyle = `rgba(56, 189, 248, ${(0.75 * pulse).toFixed(2)})`;
  ctx.fillStyle = 'rgba(56, 189, 248, 0.16)';
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.ellipse(casterX, casterY, 17, 7, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Xoay hệ trục theo hướng con trỏ chuột (tương tự indicator Liên Minh Huyền Thoại)
  ctx.translate(casterX, casterY);
  ctx.rotate(targetAngle);

  // Nền hình chữ nhật kéo dài (Gradient xanh lam thánh quang -> vàng kim)
  const grad = ctx.createLinearGradient(0, 0, aoeLength, 0);
  grad.addColorStop(0, 'rgba(56, 189, 248, 0.28)');
  grad.addColorStop(0.65, 'rgba(250, 204, 21, 0.28)');
  grad.addColorStop(1, 'rgba(239, 68, 68, 0.36)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, -halfW, aoeLength, aoeWidth);

  // Đường tâm định hướng chạy dọc hình chữ nhật
  ctx.strokeStyle = 'rgba(254, 240, 138, 0.55)';
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 4]);
  ctx.beginPath();
  ctx.moveTo(6, 0);
  ctx.lineTo(aoeLength - 10, 0);
  ctx.stroke();
  ctx.setLineDash([]);

  // Các mũi tên chevron (>>>) dịch chuyển dọc vùng ảnh hưởng kiểu LoL
  const chevronOffset = (tick * 0.9) % 24;
  ctx.strokeStyle = 'rgba(254, 240, 138, 0.72)';
  ctx.lineWidth = 1.8;
  for (let cx = 16 + chevronOffset; cx < aoeLength - 14; cx += 24) {
    ctx.beginPath();
    ctx.moveTo(cx - 6, -halfW * 0.55);
    ctx.lineTo(cx + 2, 0);
    ctx.lineTo(cx - 6, halfW * 0.55);
    ctx.stroke();
  }

  // Viền ngoài hình chữ nhật sắc nét kèm đầu mũi tên ở cuối tầm kỹ năng
  ctx.strokeStyle = '#fde047';
  ctx.lineWidth = 2;
  ctx.strokeRect(0, -halfW, aoeLength, aoeWidth);

  // Viền sáng mảnh bên trong
  ctx.strokeStyle = '#38bdf8';
  ctx.lineWidth = 1;
  ctx.strokeRect(1.5, -halfW + 1.5, aoeLength - 3, aoeWidth - 3);

  // Đầu mũi tên chỉ hướng ở mép cuối hình chữ nhật
  ctx.fillStyle = 'rgba(254, 240, 138, 0.9)';
  ctx.beginPath();
  ctx.moveTo(aoeLength + 8, 0);
  ctx.lineTo(aoeLength - 4, -7);
  ctx.lineTo(aoeLength - 4, 7);
  ctx.closePath();
  ctx.fill();

  ctx.restore();
}

/**
 * Vẽ thân Thánh Kiếm khổng lồ dọc theo trục +X từ chuôi kiếm (x=0) tới mũi kiếm (x=swordLen)
 */
function drawGiantHolySwordModel(
  ctx: CanvasRenderingContext2D,
  swordLen: number
) {
  const hiltLen = Math.round(swordLen * 0.22); // ~21px
  const bladeStart = hiltLen;
  const tipStart = Math.round(swordLen * 0.82);
  const halfBladeW = 8; // Bản kiếm rộng 16px
  const halfGuardW = 17; // Chắn tay thánh giá rộng 34px

  // 1. Hào quang Thánh Kiếm bao quanh lưỡi kiếm
  ctx.fillStyle = 'rgba(250, 204, 21, 0.28)';
  ctx.beginPath();
  ctx.moveTo(bladeStart - 2, -halfBladeW - 4);
  ctx.lineTo(tipStart, -halfBladeW - 4);
  ctx.lineTo(swordLen + 5, 0);
  ctx.lineTo(tipStart, halfBladeW + 4);
  ctx.lineTo(bladeStart - 2, halfBladeW + 4);
  ctx.closePath();
  ctx.fill();

  // 2. Viền đen 16-bit quanh Lưỡi Kiếm
  ctx.fillStyle = '#141013';
  ctx.beginPath();
  ctx.moveTo(bladeStart, -halfBladeW - 1.5);
  ctx.lineTo(tipStart, -halfBladeW - 1.5);
  ctx.lineTo(swordLen + 2, 0);
  ctx.lineTo(tipStart, halfBladeW + 1.5);
  ctx.lineTo(bladeStart, halfBladeW + 1.5);
  ctx.closePath();
  ctx.fill();

  // 3. Thân Lưỡi Kiếm (Nửa trên sáng trắng-vàng thánh quang, nửa dưới ánh lam-vàng kim)
  ctx.fillStyle = '#fef9c3';
  ctx.beginPath();
  ctx.moveTo(bladeStart, -halfBladeW);
  ctx.lineTo(tipStart, -halfBladeW);
  ctx.lineTo(swordLen, 0);
  ctx.lineTo(bladeStart, 0);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#fde047';
  ctx.beginPath();
  ctx.moveTo(bladeStart, 0);
  ctx.lineTo(swordLen, 0);
  ctx.lineTo(tipStart, halfBladeW);
  ctx.lineTo(bladeStart, halfBladeW);
  ctx.closePath();
  ctx.fill();

  // Sống kiếm & rãnh cổ ngữ vàng cam + ngọc bích giữa thân kiếm
  ctx.fillStyle = '#d97706';
  ctx.fillRect(bladeStart + 2, -2, Math.max(8, tipStart - bladeStart - 4), 4);
  ctx.fillStyle = '#38bdf8';
  ctx.fillRect(bladeStart + 4, -1, Math.max(6, tipStart - bladeStart - 10), 2);

  // 4. Chuôi Kiếm (Grip) & Quả Đấm Chuôi Kiếm (Pommel)
  ctx.fillStyle = '#141013';
  ctx.fillRect(0, -4.5, hiltLen, 9);
  ctx.fillStyle = '#991b1b';
  ctx.fillRect(4, -3, hiltLen - 6, 6);
  ctx.fillStyle = '#fbbf24';
  ctx.fillRect(7, -3, 2, 6);
  ctx.fillRect(12, -3, 2, 6);

  // Quả đấm chuôi kiếm vàng ròng
  ctx.fillStyle = '#141013';
  ctx.fillRect(-2, -6, 7, 12);
  ctx.fillStyle = '#fde047';
  ctx.fillRect(-1, -4.5, 5, 9);

  // 5. Chắn Tay Thánh Giá Cánh Chim (Winged Crossguard) & Bảo Ngọc Giữa Kiếm
  ctx.fillStyle = '#141013';
  ctx.fillRect(hiltLen - 4, -halfGuardW - 1.5, 9, halfGuardW * 2 + 3);
  ctx.fillStyle = '#f59e0b';
  ctx.fillRect(hiltLen - 3, -halfGuardW, 7, halfGuardW * 2);
  ctx.fillStyle = '#fef08a';
  ctx.fillRect(hiltLen - 2, -halfGuardW + 1, 3, halfGuardW * 2 - 2);

  // Viên bảo ngọc xanh lam tỏa sáng ở tâm chắn tay
  ctx.fillStyle = '#0c4a6e';
  ctx.fillRect(hiltLen - 3, -4, 7, 8);
  ctx.fillStyle = '#38bdf8';
  ctx.fillRect(hiltLen - 2, -3, 5, 6);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(hiltLen - 1, -2, 2, 2);
}

/**
 * Vẽ hiệu ứng kỹ năng Thánh Kiếm Farel 2 giai đoạn:
 * - Giai đoạn 1 (Mọc kiếm): Thanh kiếm to mọc thẳng lên từ vị trí dưới chân Farel tới khi mũi kiếm đạt độ cao gấp đôi chiều cao của Farel.
 * - Giai đoạn 2 (Chém xuống): Xoay góc chém từ thẳng đứng (-PI/2) về phía chỉ định (targetAngle) tới khi chạm đất.
 * - Giai đoạn 3 (Chạm đất): Nứt mặt đất hình chữ nhật, lóe sáng và gây [130% ATK] sát thương vật lý.
 */
export function drawHolySwordSkillEffects(
  ctx: CanvasRenderingContext2D,
  effects: HolySwordSkillEffect[],
  now: number
) {
  const UPRIGHT_ANGLE = -Math.PI / 2;

  effects.forEach((fx) => {
    const elapsed = now - fx.createdAt;
    const totalDuration =
      fx.riseDurationMs + fx.slamDurationMs + fx.holdDurationMs;
    if (elapsed < 0 || elapsed >= totalDuration) return;

    const halfW = fx.aoeWidth / 2;

    if (elapsed < fx.riseDurationMs) {
      // ====================================================================
      // PHA 1: THANH KIẾM TO MỌC LÊN TỪ DƯỚI CHÂN FAREL ĐẾN ĐỘ CAO 2X FAREL
      // ====================================================================
      const riseProgress = Math.min(1, elapsed / fx.riseDurationMs);
      const easeRise = 1 - Math.pow(1 - riseProgress, 2.2);

      // Vẽ khung cảnh báo vùng ảnh hưởng hình chữ nhật dưới mặt đất
      ctx.save();
      ctx.translate(fx.originX, fx.originY);
      ctx.rotate(fx.targetAngle);
      ctx.fillStyle = `rgba(250, 204, 21, ${(0.14 + 0.14 * riseProgress).toFixed(2)})`;
      ctx.fillRect(0, -halfW, fx.aoeLength, fx.aoeWidth);
      ctx.strokeStyle = `rgba(253, 224, 71, ${(0.45 + 0.35 * riseProgress).toFixed(2)})`;
      ctx.lineWidth = 1.5;
      ctx.strokeRect(0, -halfW, fx.aoeLength, fx.aoeWidth);
      ctx.restore();

      // Vòng ấn pháp thánh quang mở ra ngay dưới chân Farel
      ctx.save();
      ctx.fillStyle = 'rgba(253, 224, 71, 0.38)';
      ctx.strokeStyle = '#fef08a';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(
        fx.originX,
        fx.originY,
        18 + riseProgress * 6,
        7 + riseProgress * 2,
        0,
        0,
        Math.PI * 2
      );
      ctx.fill();
      ctx.stroke();
      ctx.restore();

      // Cắt mặt phẳng ngang dưới chân (y <= originY + 2) để thanh kiếm mọc từ dưới đất trồi lên
      // Khi easeRise = 1, mũi kiếm đạt chính xác độ cao swordHeight (= 2x chiều cao Farel)
      const currentTipHeight = fx.swordHeight * easeRise;
      const hiltBaseY = fx.originY + (fx.swordHeight - currentTipHeight);

      ctx.save();
      ctx.beginPath();
      ctx.rect(
        fx.originX - 60,
        fx.originY - fx.swordHeight - 28,
        120,
        fx.swordHeight + 30
      );
      ctx.clip();

      ctx.translate(fx.originX, hiltBaseY);
      ctx.rotate(UPRIGHT_ANGLE); // Dựng thẳng đứng hướng lên trời (-90 độ)
      drawGiantHolySwordModel(ctx, fx.swordHeight);
      ctx.restore();
    } else if (elapsed < fx.riseDurationMs + fx.slamDurationMs) {
      // ====================================================================
      // PHA 2: XOAY GÓC CHÉM TỪ ĐỘ CAO 2X FAREL VỀ PHÍA CHỈ ĐỊNH
      // ====================================================================
      const slamProgress = Math.min(
        1,
        (elapsed - fx.riseDurationMs) / fx.slamDurationMs
      );
      const easeSlam = slamProgress * slamProgress;

      // Tính góc xoay từ vị trí dựng đứng (-PI/2) tới góc chỉ định (targetAngle)
      let deltaAngle = fx.targetAngle - UPRIGHT_ANGLE;
      while (deltaAngle > Math.PI) deltaAngle -= Math.PI * 2;
      while (deltaAngle < -Math.PI) deltaAngle += Math.PI * 2;

      // Nếu hướng tấn công gần như thẳng đứng lên trên (|deltaAngle| rất nhỏ),
      // lấy đà ngả nhẹ về sau 35 độ rồi bổ xuống đúng góc chỉ định để vẫn thấy rõ nhát chém
      let startAngle = UPRIGHT_ANGLE;
      if (Math.abs(deltaAngle) < 0.38) {
        const backswingSign = Math.cos(fx.targetAngle) >= 0 ? -1 : 1;
        startAngle = fx.targetAngle + backswingSign * 0.65;
        deltaAngle = fx.targetAngle - startAngle;
      }

      const currentSwordAngle = startAngle + deltaAngle * easeSlam;

      // Vùng ảnh hưởng dưới đất sáng rực dần khi kiếm sắp chạm đất
      ctx.save();
      ctx.translate(fx.originX, fx.originY);
      ctx.rotate(fx.targetAngle);
      ctx.fillStyle = `rgba(239, 68, 68, ${(0.22 + 0.25 * easeSlam).toFixed(2)})`;
      ctx.fillRect(0, -halfW, fx.aoeLength, fx.aoeWidth);
      ctx.strokeStyle = '#fde047';
      ctx.lineWidth = 2;
      ctx.strokeRect(0, -halfW, fx.aoeLength, fx.aoeWidth);
      ctx.restore();

      // Vệt chém bán nguyệt (Holy Slash Trail Arc) quét theo lưỡi kiếm
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(fx.originX, fx.originY);
      ctx.arc(
        fx.originX,
        fx.originY,
        fx.swordHeight * 0.96,
        startAngle,
        currentSwordAngle,
        deltaAngle < 0
      );
      ctx.closePath();
      ctx.fillStyle = 'rgba(254, 240, 138, 0.32)';
      ctx.fill();

      ctx.strokeStyle = '#fde047';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(
        fx.originX,
        fx.originY,
        fx.swordHeight * 0.92,
        startAngle,
        currentSwordAngle,
        deltaAngle < 0
      );
      ctx.stroke();
      ctx.restore();

      // Vẽ Thánh Kiếm đang xoay bổ xuống hướng chỉ định
      ctx.save();
      ctx.translate(fx.originX, fx.originY);
      ctx.rotate(currentSwordAngle);
      drawGiantHolySwordModel(ctx, fx.swordHeight);
      ctx.restore();
    } else {
      // ====================================================================
      // PHA 3: KIẾM CHẠM ĐẤT & KÍCH HOẠT SÁT THƯƠNG TRONG VÙNG CHỮ NHẬT
      // ====================================================================
      const holdProgress = Math.min(
        1,
        (elapsed - fx.riseDurationMs - fx.slamDurationMs) / fx.holdDurationMs
      );
      const alpha = Math.max(0, 1 - holdProgress);

      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(fx.originX, fx.originY);
      ctx.rotate(fx.targetAngle);

      // Dư chấn mặt đất nứt toác phát sáng trong hình chữ nhật vùng ảnh hưởng
      ctx.fillStyle = 'rgba(250, 204, 21, 0.42)';
      ctx.fillRect(0, -halfW, fx.aoeLength, fx.aoeWidth);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
      ctx.fillRect(4, -halfW * 0.35, fx.aoeLength - 8, halfW * 0.7);

      ctx.strokeStyle = '#fef08a';
      ctx.lineWidth = 2.5;
      ctx.strokeRect(0, -halfW, fx.aoeLength, fx.aoeWidth);

      // Thanh Thánh Kiếm cắm/chém nằm dọc theo vùng ảnh hưởng trên mặt đất
      drawGiantHolySwordModel(ctx, fx.swordHeight);
      ctx.restore();
    }
  });
}

export function drawCombatEffects(
  ctx: CanvasRenderingContext2D,
  projectiles: Projectile[],
  hitEffects: HitEffect[],
  particles: HitParticle[],
  damagePopups: DamagePopup[],
  now: number
) {
  // 1. Quy định VFX Đường Đạn & Đuôi Đường Đạn:
  // - Tháp Phòng Thủ: Mỗi loại đường đạn luôn có đuôi đường đạn rõ nét; khi kích hoạt kỹ năng thì cường hóa đuôi đường đạn lên.
  // - Đơn Vị Tầm Xa (Quân Lính): Đòn đánh thường luôn có đuôi nhìn mỏng thanh thoát; khi kích hoạt kỹ năng thì cường hóa cả đuôi và đạn lên.
  projectiles.forEach((p) => {
    const angle = Math.atan2(p.targetY - p.y, p.targetX - p.x);
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(angle);

    if (p.projectileStyle === 'MEGA_ENERGY_ORB') {
      // [Đơn vị tầm xa kích hoạt kỹ năng] Quả cầu năng lượng hủy diệt (Kỹ năng Q của Pháp Sư Bóng Đêm) -> Cường hóa cả đuôi và đạn
      const pulse = 1 + Math.sin(now * 0.028) * 0.15;
      const outerR = 12.2 * pulse;

      // Đuôi sao chổi ma thuật cường hóa đa tầng (Dài & rộng rực rỡ)
      const outerTailGrad = ctx.createLinearGradient(-42, 0, 2, 0);
      outerTailGrad.addColorStop(0, 'rgba(147, 51, 234, 0)');
      outerTailGrad.addColorStop(0.45, 'rgba(192, 38, 211, 0.5)');
      outerTailGrad.addColorStop(0.85, 'rgba(232, 121, 249, 0.85)');
      outerTailGrad.addColorStop(1, 'rgba(56, 189, 248, 0.95)');
      ctx.fillStyle = outerTailGrad;
      ctx.beginPath();
      ctx.moveTo(-42, 0);
      ctx.lineTo(-10, -8.5);
      ctx.lineTo(2, -5.5);
      ctx.lineTo(2, 5.5);
      ctx.lineTo(-10, 8.5);
      ctx.closePath();
      ctx.fill();

      // Lõi đuôi plasma sáng chói bên trong
      const coreTailGrad = ctx.createLinearGradient(-30, 0, 2, 0);
      coreTailGrad.addColorStop(0, 'rgba(56, 189, 248, 0)');
      coreTailGrad.addColorStop(0.6, 'rgba(56, 189, 248, 0.85)');
      coreTailGrad.addColorStop(1, '#ffffff');
      ctx.fillStyle = coreTailGrad;
      ctx.beginPath();
      ctx.moveTo(-30, 0);
      ctx.lineTo(0, -3.6);
      ctx.lineTo(0, 3.6);
      ctx.closePath();
      ctx.fill();

      // Hạt ma pháp lấp lánh dọc theo đuôi cường hóa
      ctx.fillStyle = '#38bdf8';
      ctx.fillRect(-26, -3.5, 2.5, 2.5);
      ctx.fillStyle = '#f0abfc';
      ctx.fillRect(-18, 2, 2.5, 2.5);

      // Vòng hào quang tím-hồng cường hóa bên ngoài quả cầu
      ctx.fillStyle = 'rgba(217, 70, 239, 0.42)';
      ctx.beginPath();
      ctx.arc(0, 0, outerR + 3.5, 0, Math.PI * 2);
      ctx.fill();

      // Vòng hồ quang ma thuật xoay quanh đạn cường hóa
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.arc(0, 0, outerR + 1.8, -0.9, 0.9);
      ctx.stroke();

      // Vòng năng lượng xoáy chính
      ctx.fillStyle = '#a21caf';
      ctx.strokeStyle = '#141013';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.arc(0, 0, outerR, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Lớp plasma hồng-tím rực sáng
      ctx.fillStyle = '#e879f9';
      ctx.beginPath();
      ctx.arc(0, 0, outerR * 0.72, 0, Math.PI * 2);
      ctx.fill();

      // Lõi năng lượng xanh băng & trắng chói lọi
      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.arc(1, 0, outerR * 0.46, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(1.5, -1, outerR * 0.26, 0, Math.PI * 2);
      ctx.fill();
    } else if (p.projectileStyle === 'ENERGY_ORB') {
      // [Đơn vị tầm xa đánh thường] Quả cầu năng lượng thường của Pháp Sư Bóng Đêm -> Đuôi mỏng thanh thoát
      const pulse = 1 + Math.sin(now * 0.03) * 0.12;
      const orbR = 5.4 * pulse;

      // Vệt đuôi năng lượng mỏng gọn cho đòn đánh thường quân lính phép
      const tailGrad = ctx.createLinearGradient(-20, 0, 0, 0);
      tailGrad.addColorStop(0, 'rgba(147, 51, 234, 0)');
      tailGrad.addColorStop(0.55, 'rgba(168, 85, 247, 0.48)');
      tailGrad.addColorStop(1, 'rgba(240, 171, 252, 0.82)');
      ctx.fillStyle = tailGrad;
      ctx.beginPath();
      ctx.moveTo(-20, 0);
      ctx.lineTo(0, -2.1);
      ctx.lineTo(0, 2.1);
      ctx.closePath();
      ctx.fill();

      // Hào quang ngoài
      ctx.fillStyle = 'rgba(232, 121, 249, 0.32)';
      ctx.beginPath();
      ctx.arc(0, 0, orbR + 1.8, 0, Math.PI * 2);
      ctx.fill();

      // Thân quả cầu tím hắc ám
      ctx.fillStyle = '#9333ea';
      ctx.strokeStyle = '#141013';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(0, 0, orbR, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Lõi sáng
      ctx.fillStyle = '#f0abfc';
      ctx.beginPath();
      ctx.arc(0.5, 0, orbR * 0.58, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(1, -0.5, orbR * 0.28, 0, Math.PI * 2);
      ctx.fill();
    } else if (p.projectileStyle === 'MUSKET_BULLET') {
      // [Tháp Súng Hỏa Mai]: Luôn có đuôi đường đạn; khi kích hoạt kỹ năng Đạn Xuyên Phá thì cường hóa đuôi rực lửa xuyên phá
      const isEnhanced = Boolean(p.isSkillEnhanced || p.skillEffect);
      if (isEnhanced) {
        // Đuôi cường hóa siêu thanh đỏ cam - vàng rực kèm vòng xung kích Mach
        const outerGrad = ctx.createLinearGradient(-44, 0, 4, 0);
        outerGrad.addColorStop(0, 'rgba(239, 68, 68, 0)');
        outerGrad.addColorStop(0.4, 'rgba(239, 68, 68, 0.55)');
        outerGrad.addColorStop(0.78, 'rgba(249, 115, 22, 0.92)');
        outerGrad.addColorStop(1, '#fef08a');
        ctx.fillStyle = outerGrad;
        ctx.beginPath();
        ctx.moveTo(-44, 0);
        ctx.lineTo(-8, -4.2);
        ctx.lineTo(3, -3.2);
        ctx.lineTo(3, 3.2);
        ctx.lineTo(-8, 4.2);
        ctx.closePath();
        ctx.fill();

        // Lõi tia lửa trắng-vàng sắc bén ở tâm đuôi
        const coreGrad = ctx.createLinearGradient(-32, 0, 4, 0);
        coreGrad.addColorStop(0, 'rgba(254, 240, 138, 0)');
        coreGrad.addColorStop(0.5, 'rgba(254, 240, 138, 0.9)');
        coreGrad.addColorStop(1, '#ffffff');
        ctx.fillStyle = coreGrad;
        ctx.fillRect(-32, -1.5, 35, 3);

        // Vòng sóng xung kích xuyên giáp quanh thân đạn
        ctx.strokeStyle = 'rgba(251, 146, 60, 0.85)';
        ctx.lineWidth = 1.3;
        ctx.beginPath();
        ctx.ellipse(-6, 0, 2.2, 5.2, 0, 0, Math.PI * 2);
        ctx.stroke();

        // Đầu đạn xuyên phá cường hóa
        ctx.fillStyle = '#141013';
        ctx.fillRect(-4, -3.5, 10, 7);
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(-3, -2.5, 8, 5);
        ctx.fillStyle = '#fde047';
        ctx.fillRect(0, -1.5, 4, 3);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(2, -1, 3, 2);
      } else {
        // Đuôi tiêu chuẩn của Tháp Súng Hỏa Mai: Vệt khói lửa thuốc súng đồng thau rõ nét
        const trailLen = 28;
        const grad = ctx.createLinearGradient(-trailLen, 0, 3, 0);
        grad.addColorStop(0, 'rgba(251, 191, 36, 0)');
        grad.addColorStop(0.5, 'rgba(251, 191, 36, 0.55)');
        grad.addColorStop(0.85, 'rgba(253, 224, 71, 0.88)');
        grad.addColorStop(1, '#ffffff');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.moveTo(-trailLen, 0);
        ctx.lineTo(2, -2.2);
        ctx.lineTo(2, 2.2);
        ctx.closePath();
        ctx.fill();

        // Đầu đạn chì đồng thau sắc gọn
        ctx.fillStyle = '#141013';
        ctx.fillRect(-3, -3, 8, 6);
        ctx.fillStyle = '#f59e0b';
        ctx.fillRect(-2, -2, 6, 4);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(1, -1, 3, 2);
      }
    } else if (p.projectileStyle === 'CANNON_BALL') {
      // [Tháp Pháo Hạng Nặng]: Kỹ năng bị động 100% nâng cấp đòn đánh thường thành Đại Pháo Nổ Lan -> Đuôi khói lửa sao chổi cường hóa mạnh mẽ
      const isEnhanced = p.isSkillEnhanced !== false;
      const tailLen = isEnhanced ? 38 : 26;
      const tailHalfW = isEnhanced ? 8.2 : 6.0;

      // Lớp khói thuốc súng & lửa hồng ngoại ngoài cùng
      const smokeGrad = ctx.createLinearGradient(-tailLen, 0, 0, 0);
      smokeGrad.addColorStop(0, 'rgba(87, 83, 78, 0)');
      smokeGrad.addColorStop(0.35, 'rgba(87, 83, 78, 0.55)');
      smokeGrad.addColorStop(0.72, 'rgba(234, 88, 12, 0.85)');
      smokeGrad.addColorStop(1, 'rgba(253, 224, 71, 0.95)');
      ctx.fillStyle = smokeGrad;
      ctx.beginPath();
      ctx.moveTo(-tailLen, 0);
      ctx.lineTo(-8, -tailHalfW);
      ctx.lineTo(0, -(tailHalfW * 0.75));
      ctx.lineTo(0, tailHalfW * 0.75);
      ctx.lineTo(-8, tailHalfW);
      ctx.closePath();
      ctx.fill();

      // Lõi lửa đại pháo cường hóa bên trong đuôi
      if (isEnhanced) {
        const innerFlameGrad = ctx.createLinearGradient(-tailLen * 0.72, 0, 0, 0);
        innerFlameGrad.addColorStop(0, 'rgba(249, 115, 22, 0)');
        innerFlameGrad.addColorStop(0.55, 'rgba(253, 224, 71, 0.9)');
        innerFlameGrad.addColorStop(1, '#ffffff');
        ctx.fillStyle = innerFlameGrad;
        ctx.beginPath();
        ctx.moveTo(-tailLen * 0.72, 0);
        ctx.lineTo(0, -4.2);
        ctx.lineTo(0, 4.2);
        ctx.closePath();
        ctx.fill();

        // Tàn lửa bắn dọc đuôi đạn pháo
        ctx.fillStyle = '#fde047';
        ctx.fillRect(-24, -4, 2.5, 2.5);
        ctx.fillStyle = '#f97316';
        ctx.fillRect(-16, 2.5, 2.5, 2.5);
      }

      // Vòng lửa ma sát bao quanh quả đạn pháo
      ctx.fillStyle = 'rgba(249, 115, 22, 0.45)';
      ctx.beginPath();
      ctx.arc(0, 0, 9.5, 0, Math.PI * 2);
      ctx.fill();

      // Quả cầu đại bác gang thép đen bóng
      ctx.fillStyle = '#18181b';
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.arc(0, 0, 7.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Ánh kim loại & đốm lửa nóng đỏ trên thân đạn pháo
      ctx.fillStyle = '#52525b';
      ctx.beginPath();
      ctx.arc(-1.8, -2.2, 2.8, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#f97316';
      ctx.beginPath();
      ctx.arc(2.5, 1.5, 2.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fef08a';
      ctx.fillRect(-8, -1.5, 3, 3);
    } else if (p.projectileStyle === 'HEXTECH_ORB') {
      // [Tháp Pháo Hextech - Kỹ năng Q Cầu Năng Lượng Hextech]: Luôn có đuôi năng lượng Hextech cường hóa kèm tia điện xoắn
      const pulse = 1 + Math.sin(now * 0.035) * 0.14;
      const orbR = 7.0 * pulse;

      // Vệt đuôi plasma Hextech đa tầng kéo dài
      const outerTailGrad = ctx.createLinearGradient(-32, 0, 2, 0);
      outerTailGrad.addColorStop(0, 'rgba(14, 165, 233, 0)');
      outerTailGrad.addColorStop(0.45, 'rgba(56, 189, 248, 0.58)');
      outerTailGrad.addColorStop(0.82, 'rgba(125, 211, 252, 0.88)');
      outerTailGrad.addColorStop(1, 'rgba(224, 242, 254, 0.98)');
      ctx.fillStyle = outerTailGrad;
      ctx.beginPath();
      ctx.moveTo(-32, 0);
      ctx.lineTo(-6, -5.6);
      ctx.lineTo(2, -4.2);
      ctx.lineTo(2, 4.2);
      ctx.lineTo(-6, 5.6);
      ctx.closePath();
      ctx.fill();

      // Tia điện vàng-xanh chạy dọc trong đuôi cầu Hextech
      ctx.strokeStyle = '#fde047';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(-24, 0);
      ctx.lineTo(-16, -3.2);
      ctx.lineTo(-9, 3.0);
      ctx.lineTo(-2, 0);
      ctx.stroke();

      // Vòng hồ quang điện xoay quanh quả cầu
      ctx.strokeStyle = '#fde047';
      ctx.lineWidth = 1.35;
      ctx.beginPath();
      ctx.arc(0, 0, orbR + 2.2, -0.85, 0.85);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, 0, orbR + 2.2, Math.PI - 0.85, Math.PI + 0.85);
      ctx.stroke();

      // Quả cầu lõi Hextech xanh ngọc - trắng
      ctx.fillStyle = '#0284c7';
      ctx.strokeStyle = '#082f49';
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      ctx.arc(0, 0, orbR, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.arc(0.5, 0, orbR * 0.68, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(1.2, -0.8, orbR * 0.34, 0, Math.PI * 2);
      ctx.fill();
    } else if (p.projectileStyle === 'HEXTECH_BEAM') {
      // Tia năng lượng cực mạnh (25% Kỹ năng W của Tháp Hextech)
      const beamLen = 44;
      const grad = ctx.createLinearGradient(-beamLen, 0, 10, 0);
      grad.addColorStop(0, 'rgba(56, 189, 248, 0)');
      grad.addColorStop(0.35, 'rgba(56, 189, 248, 0.85)');
      grad.addColorStop(0.75, 'rgba(253, 224, 71, 0.95)');
      grad.addColorStop(1, '#ffffff');
      ctx.fillStyle = grad;
      ctx.fillRect(-beamLen, -4.8, beamLen + 10, 9.6);

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(-beamLen * 0.72, -2.2, beamLen * 0.72 + 10, 4.4);

      ctx.strokeStyle = '#fde047';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(-30, -5);
      ctx.lineTo(-18, 5);
      ctx.lineTo(-8, -5);
      ctx.lineTo(4, 4);
      ctx.stroke();

      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.arc(6, 0, 6.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(6, 0, 3.5, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // Mũi tên của:
      // 1) Tháp Phòng Thủ (Tháp Cung Thủ / Tháp Canh - p.isTowerProjectile === true)
      // 2) Đơn Vị Quân Lính Tầm Xa (Cung Thủ Hoàng Gia / Cung Thủ Bóng Đêm - !p.isTowerProjectile)
      const isEnemyArrow = p.fromTeam === 'ENEMY';
      const hasPoison =
        p.projectileStyle === 'POISON_ARROW' ||
        Boolean(p.skillEffect && p.skillEffect.type === 'POISON');
      const isTowerArrow = Boolean(p.isTowerProjectile);
      const isSkillEnhanced = Boolean(p.isSkillEnhanced || hasPoison);

      if (isTowerArrow) {
        // --- THÁP CUNG THỦ / THÁP CANH: Luôn có đuôi đường đạn rõ nét; khi kích hoạt kỹ năng (Liên Xạ Tam Tiễn) thì cường hóa đuôi rực sáng ---
        if (isSkillEnhanced) {
          // Đuôi cường hóa của Tháp Cung Thủ khi kích hoạt Liên Xạ Tam Tiễn (Dài, rực vàng kim - cam sáng lấp lánh)
          const outerGrad = ctx.createLinearGradient(-40, 0, 2, 0);
          outerGrad.addColorStop(0, 'rgba(245, 158, 11, 0)');
          outerGrad.addColorStop(0.4, 'rgba(251, 191, 36, 0.55)');
          outerGrad.addColorStop(0.8, 'rgba(253, 224, 71, 0.9)');
          outerGrad.addColorStop(1, '#ffffff');
          ctx.fillStyle = outerGrad;
          ctx.beginPath();
          ctx.moveTo(-40, 0);
          ctx.lineTo(-8, -3.8);
          ctx.lineTo(2, -2.4);
          ctx.lineTo(2, 2.4);
          ctx.lineTo(-8, 3.8);
          ctx.closePath();
          ctx.fill();

          // Lõi tia sáng trắng-vàng ở tâm đuôi tên cường hóa
          ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
          ctx.fillRect(-26, -1.1, 26, 2.2);

          // Tàn quang kim sắc dọc đuôi tên tháp
          ctx.fillStyle = '#fde047';
          ctx.fillRect(-24, -3, 2, 2);
          ctx.fillRect(-16, 1.5, 2, 2);
        } else {
          // Đuôi tiêu chuẩn luôn hiển thị của Tháp Cung Thủ / Tháp Canh
          const tailGrad = ctx.createLinearGradient(-26, 0, 0, 0);
          if (isEnemyArrow && p.projectileStyle === 'SHADOW_ARROW') {
            tailGrad.addColorStop(0, 'rgba(168, 85, 247, 0)');
            tailGrad.addColorStop(0.55, 'rgba(192, 132, 252, 0.55)');
            tailGrad.addColorStop(1, 'rgba(240, 171, 252, 0.9)');
          } else {
            tailGrad.addColorStop(0, 'rgba(251, 191, 36, 0)');
            tailGrad.addColorStop(0.55, 'rgba(253, 224, 71, 0.58)');
            tailGrad.addColorStop(1, 'rgba(254, 249, 195, 0.92)');
          }
          ctx.fillStyle = tailGrad;
          ctx.beginPath();
          ctx.moveTo(-26, 0);
          ctx.lineTo(0, -2.2);
          ctx.lineTo(0, 2.2);
          ctx.closePath();
          ctx.fill();
        }

        // Thân & đầu mũi tên trọng tiễn của Tháp
        ctx.fillStyle = '#141013';
        ctx.fillRect(-10, -2.2, 16, 4.4);
        ctx.fillStyle = isSkillEnhanced ? '#f59e0b' : '#92400e';
        ctx.fillRect(-9, -1.2, 13, 2.4);
        ctx.fillStyle = isSkillEnhanced
          ? '#fef08a'
          : isEnemyArrow
            ? '#c084fc'
            : '#38bdf8';
        ctx.fillRect(-10, -3.2, 3.5, 2.2);
        ctx.fillRect(-10, 1.0, 3.5, 2.2);

        ctx.fillStyle = isSkillEnhanced
          ? '#fef08a'
          : isEnemyArrow && p.projectileStyle === 'SHADOW_ARROW'
            ? '#e879f9'
            : '#fde047';
        ctx.beginPath();
        ctx.moveTo(9.5, 0);
        ctx.lineTo(2, -4.0);
        ctx.lineTo(2, 4.0);
        ctx.closePath();
        ctx.fill();
        if (isSkillEnhanced) {
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.moveTo(8.5, 0);
          ctx.lineTo(3.2, -2.0);
          ctx.lineTo(3.2, 2.0);
          ctx.closePath();
          ctx.fill();
        }
      } else if (isSkillEnhanced) {
        // --- ĐƠN VỊ TẦM XA KÍCH HOẠT KỸ NĂNG (VD: Cung Thủ Hoàng Gia bắn [Q] Tên Độc) -> Cường hóa cả ĐUÔI và ĐẠN ---
        // 1. Đuôi kịch độc cường hóa đa tầng (Dài, rộng & phát sáng lục bảo kèm giọt độc)
        const poisonTailGrad = ctx.createLinearGradient(-36, 0, 3, 0);
        poisonTailGrad.addColorStop(0, 'rgba(16, 185, 129, 0)');
        poisonTailGrad.addColorStop(0.45, 'rgba(34, 197, 94, 0.62)');
        poisonTailGrad.addColorStop(0.82, 'rgba(74, 222, 128, 0.92)');
        poisonTailGrad.addColorStop(1, '#dcfce7');
        ctx.fillStyle = poisonTailGrad;
        ctx.beginPath();
        ctx.moveTo(-36, 0);
        ctx.lineTo(-7, -3.6);
        ctx.lineTo(2, -2.4);
        ctx.lineTo(2, 2.4);
        ctx.lineTo(-7, 3.6);
        ctx.closePath();
        ctx.fill();

        // Lõi đuôi xanh ngọc sáng chói
        ctx.fillStyle = 'rgba(220, 252, 231, 0.9)';
        ctx.fillRect(-24, -1.0, 25, 2.0);

        // Hạt sương độc bám theo đuôi tên
        ctx.fillStyle = '#4ade80';
        ctx.fillRect(-22, -3.2, 2.2, 2.2);
        ctx.fillStyle = '#86efac';
        ctx.fillRect(-14, 1.6, 2.2, 2.2);

        // 2. Thân & đầu mũi tên cường hóa kịch độc (Lớn hơn, có hào quang lục bảo bao quanh)
        ctx.fillStyle = 'rgba(74, 222, 128, 0.35)';
        ctx.beginPath();
        ctx.ellipse(0, 0, 11, 4.5, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#052e16';
        ctx.fillRect(-10, -2.4, 16, 4.8);
        ctx.fillStyle = '#16a34a';
        ctx.fillRect(-9, -1.3, 13, 2.6);

        // Lông vũ tẩm độc phát sáng
        ctx.fillStyle = '#86efac';
        ctx.fillRect(-10, -3.5, 3.5, 2.2);
        ctx.fillRect(-10, 1.3, 3.5, 2.2);

        // Đầu mũi tên độc cỡ lớn sắc nhọn
        ctx.fillStyle = '#4ade80';
        ctx.beginPath();
        ctx.moveTo(10.5, 0);
        ctx.lineTo(1.8, -4.5);
        ctx.lineTo(1.8, 4.5);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.moveTo(9, 0);
        ctx.lineTo(3, -2.1);
        ctx.lineTo(3, 2.1);
        ctx.closePath();
        ctx.fill();
      } else {
        // --- ĐƠN VỊ QUÂN LÍNH TẦM XA ĐÁNH THƯỜNG: Luôn có đuôi đường đạn nhìn mỏng thanh thoát ---
        const thinTailGrad = ctx.createLinearGradient(-22, 0, -2, 0);
        if (isEnemyArrow && p.projectileStyle === 'SHADOW_ARROW') {
          thinTailGrad.addColorStop(0, 'rgba(168, 85, 247, 0)');
          thinTailGrad.addColorStop(0.55, 'rgba(192, 132, 252, 0.48)');
          thinTailGrad.addColorStop(1, 'rgba(232, 121, 249, 0.85)');
        } else {
          thinTailGrad.addColorStop(0, 'rgba(253, 224, 71, 0)');
          thinTailGrad.addColorStop(0.55, 'rgba(253, 224, 71, 0.48)');
          thinTailGrad.addColorStop(1, 'rgba(254, 249, 195, 0.85)');
        }
        ctx.fillStyle = thinTailGrad;
        ctx.beginPath();
        ctx.moveTo(-22, 0);
        ctx.lineTo(-2, -1.25);
        ctx.lineTo(-2, 1.25);
        ctx.closePath();
        ctx.fill();

        // Viền đen mũi tên
        ctx.fillStyle = '#141013';
        ctx.fillRect(-9, -2, 15, 4);

        // Thân gỗ / hắc mộc của mũi tên
        ctx.fillStyle =
          isEnemyArrow && p.projectileStyle === 'SHADOW_ARROW'
            ? '#4c1d95'
            : '#92400e';
        ctx.fillRect(-8, -1, 12, 2);

        // Đuôi lông vũ mũi tên
        ctx.fillStyle =
          isEnemyArrow && p.projectileStyle === 'SHADOW_ARROW'
            ? '#c084fc'
            : '#38bdf8';
        ctx.fillRect(-9, -3, 3, 2);
        ctx.fillRect(-9, 1, 3, 2);

        // Đầu mũi tên sắc nhọn
        ctx.fillStyle =
          isEnemyArrow && p.projectileStyle === 'SHADOW_ARROW'
            ? '#e879f9'
            : '#fde047';
        ctx.beginPath();
        ctx.moveTo(8, 0);
        ctx.lineTo(2, -3.5);
        ctx.lineTo(2, 3.5);
        ctx.closePath();
        ctx.fill();
      }
    }
    ctx.restore();
  });

  // 2. Slash Arcs, Farel Crescent Slash, Orb Explosions, Impact Shockwave Rings & Poison Bursts
  hitEffects.forEach((fx) => {
    const progress = Math.min(1, (now - fx.createdAt) / fx.duration);
    const alpha = 1 - progress;
    ctx.save();
    ctx.globalAlpha = alpha;

    if (fx.kind === 'CRESCENT_SLASH') {
      // Hiệu ứng đòn đánh thường của Farel: Nhát chém mặt trăng dày dặn màu trắng vàng (#fde047 / #fef08a / #ffffff),
      // hướng mặt trăng luôn hướng thẳng về phía kẻ địch (trục +X cục bộ quay theo fx.angle về phía mục tiêu)
      ctx.translate(fx.x, fx.y);
      const slashAngle =
        fx.angle !== undefined
          ? fx.angle
          : fx.facing === 'RIGHT'
            ? 0
            : Math.PI;
      ctx.rotate(slashAngle);

      const halfLen = 28 + progress * 9; // Độ dài vầng trăng
      const bowDepth = 11 + progress * 4.5; // Độ cong mặt trăng hướng về phía kẻ địch
      const thickness = Math.max(4.5, 11.2 * (1 - progress * 0.35)); // Dày dặn và uy lực hơn

      // Lớp hào quang vàng kim ngoài cùng (#fde047)
      ctx.fillStyle = '#fde047';
      ctx.beginPath();
      ctx.moveTo(-2, -halfLen);
      ctx.quadraticCurveTo(bowDepth + thickness, 0, -2, halfLen);
      ctx.quadraticCurveTo(bowDepth - thickness * 0.45, 0, -2, -halfLen);
      ctx.closePath();
      ctx.fill();

      // Lớp giữa vàng trắng rực sáng (#fef08a)
      ctx.fillStyle = '#fef08a';
      ctx.beginPath();
      ctx.moveTo(-1, -halfLen * 0.94);
      ctx.quadraticCurveTo(bowDepth + thickness * 0.72, 0, -1, halfLen * 0.94);
      ctx.quadraticCurveTo(bowDepth - thickness * 0.2, 0, -1, -halfLen * 0.94);
      ctx.closePath();
      ctx.fill();

      // Lõi ánh sáng trắng tinh khiết dày sắc nét nằm giữa nhát chém mặt trăng (#ffffff)
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.moveTo(0, -halfLen * 0.86);
      ctx.quadraticCurveTo(bowDepth + thickness * 0.45, 0, 0, halfLen * 0.86);
      ctx.quadraticCurveTo(bowDepth, 0, 0, -halfLen * 0.86);
      ctx.closePath();
      ctx.fill();
    } else if (fx.kind === 'ORB_BURST_SMALL') {
      // Hiệu ứng phát nổ nhỏ khi quả cầu năng lượng thường của Pháp Sư Bóng Đêm trúng mục tiêu
      const r = 5 + progress * 18;
      ctx.fillStyle = 'rgba(232, 121, 249, 0.32)';
      ctx.beginPath();
      ctx.arc(fx.x, fx.y, r * 0.85, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = '#e879f9';
      ctx.lineWidth = 2.5 * (1 - progress);
      ctx.beginPath();
      ctx.arc(fx.x, fx.y, r, 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 1.5 * (1 - progress);
      ctx.beginPath();
      ctx.arc(fx.x, fx.y, r * 0.55, 0, Math.PI * 2);
      ctx.stroke();
    } else if (fx.kind === 'ORB_BURST_LARGE') {
      // Hiệu ứng phát nổ diện rộng (AoE) khi Quả Cầu Năng Lượng Lớn (20% bị động) chạm mục tiêu
      const maxR = 76;
      const r = 14 + progress * (maxR - 14);

      // Nền xung kích ma thuật lan tỏa
      const radGrad = ctx.createRadialGradient(fx.x, fx.y, 2, fx.x, fx.y, r);
      radGrad.addColorStop(0, 'rgba(255, 255, 255, 0.75)');
      radGrad.addColorStop(0.35, 'rgba(232, 121, 249, 0.48)');
      radGrad.addColorStop(0.75, 'rgba(147, 51, 234, 0.28)');
      radGrad.addColorStop(1, 'rgba(56, 189, 248, 0)');
      ctx.fillStyle = radGrad;
      ctx.beginPath();
      ctx.arc(fx.x, fx.y, r, 0, Math.PI * 2);
      ctx.fill();

      // Vòng sóng xung kích ngoài (Hồng tím)
      ctx.strokeStyle = '#e879f9';
      ctx.lineWidth = 3.5 * (1 - progress * 0.5);
      ctx.beginPath();
      ctx.arc(fx.x, fx.y, r, 0, Math.PI * 2);
      ctx.stroke();

      // Vòng sóng xung kích trong (Xanh băng ma thuật)
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2.2 * (1 - progress * 0.5);
      ctx.beginPath();
      ctx.arc(fx.x, fx.y, r * 0.65, 0, Math.PI * 2);
      ctx.stroke();
    } else if (fx.kind === 'SLASH') {
      ctx.strokeStyle = fx.color;
      ctx.lineWidth = 4 * (1 - progress * 0.5);
      ctx.beginPath();
      const startAngle = fx.facing === 'RIGHT' ? -0.9 : Math.PI - 0.9;
      const endAngle = fx.facing === 'RIGHT' ? 0.9 : Math.PI + 0.9;
      ctx.arc(fx.x, fx.y, 18 + progress * 14, startAngle, endAngle);
      ctx.stroke();
    } else if (fx.kind === 'IMPACT_RING') {
      ctx.strokeStyle = fx.color;
      ctx.lineWidth = 3 * (1 - progress);
      ctx.beginPath();
      ctx.arc(fx.x, fx.y, 6 + progress * 24, 0, Math.PI * 2);
      ctx.stroke();
    } else if (fx.kind === 'POISON_BURST') {
      // Rising toxic miasma rings + droplets on the poisoned unit's body
      ctx.strokeStyle = '#4ade80';
      ctx.lineWidth = 2.5 * (1 - progress);
      ctx.beginPath();
      ctx.arc(fx.x, fx.y - progress * 10, 5 + progress * 14, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = '#a855f7';
      const dropOffset = progress * 14;
      ctx.fillRect(fx.x - 7, fx.y - 4 - dropOffset, 3, 3);
      ctx.fillRect(fx.x + 5, fx.y - 8 - dropOffset, 3, 3);
      ctx.fillStyle = '#4ade80';
      ctx.fillRect(fx.x - 1, fx.y - 10 - dropOffset, 4, 4);
    } else if (fx.kind === 'CANNON_EXPLOSION') {
      // Hiệu ứng nổ hoành tráng của Tháp Pháo Hạng Nặng: Vòng sóng xung kích mặt đất + Cầu lửa đa tầng + Vòng khói thuốc súng + Tia mảnh đạn văng
      const maxR = 68;
      const easeOut = 1 - Math.pow(1 - progress, 2.2);
      const baseR = 14 + easeOut * (maxR - 14);
      const plumeHeight = 32 + easeOut * 46; // Cột lửa khói bốc thẳng đứng 2D trên mặt đất Isometric

      // 1. Vệt cháy xém & sóng xung kích elip nằm ngang trên mặt phẳng đất Isometric
      ctx.fillStyle = `rgba(24, 24, 27, ${(0.55 * (1 - progress)).toFixed(2)})`;
      ctx.beginPath();
      ctx.ellipse(fx.x, fx.y + 4, baseR * 0.92, baseR * 0.42, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = '#f97316';
      ctx.lineWidth = 3 * (1 - progress * 0.55);
      ctx.beginPath();
      ctx.ellipse(fx.x, fx.y + 3, baseR * 0.85, baseR * 0.38, 0, 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = '#fde047';
      ctx.lineWidth = 2 * (1 - progress * 0.6);
      ctx.beginPath();
      ctx.ellipse(fx.x, fx.y + 3, baseR * 0.55, baseR * 0.24, 0, 0, Math.PI * 2);
      ctx.stroke();

      // 2. Các đám mây khói đen-xám cuồn cuộn bốc lên cao theo phương thẳng đứng 2D
      const smokePuffs = [
        { ox: -10, oy: -plumeHeight * 0.55, rx: 13 + easeOut * 8, ry: 11 + easeOut * 7, col: 'rgba(39, 39, 42, 0.72)' },
        { ox: 11, oy: -plumeHeight * 0.62, rx: 12 + easeOut * 8, ry: 10 + easeOut * 6, col: 'rgba(63, 63, 70, 0.68)' },
        { ox: 0, oy: -plumeHeight * 0.88, rx: 16 + easeOut * 11, ry: 13 + easeOut * 8, col: 'rgba(24, 24, 27, 0.78)' },
        { ox: -6, oy: -plumeHeight * 1.05, rx: 11 + easeOut * 7, ry: 9 + easeOut * 5, col: 'rgba(82, 82, 91, 0.6)' },
        { ox: 7, oy: -plumeHeight * 1.02, rx: 11 + easeOut * 7, ry: 9 + easeOut * 5, col: 'rgba(63, 63, 70, 0.6)' },
      ];
      smokePuffs.forEach((sp) => {
        ctx.fillStyle = sp.col;
        ctx.beginPath();
        ctx.ellipse(fx.x + sp.ox, fx.y + sp.oy, sp.rx, sp.ry, 0, 0, Math.PI * 2);
        ctx.fill();
      });

      // 3. Cột lửa 2D thẳng đứng (Vertical Plume) bùng lên từ mặt đất lên đỉnh khói
      const plumeGrad = ctx.createLinearGradient(
        fx.x,
        fx.y + 4,
        fx.x,
        fx.y - plumeHeight * 0.92
      );
      plumeGrad.addColorStop(0, 'rgba(255, 255, 255, 0.98)');
      plumeGrad.addColorStop(0.25, 'rgba(254, 240, 138, 0.95)');
      plumeGrad.addColorStop(0.58, 'rgba(249, 115, 22, 0.88)');
      plumeGrad.addColorStop(0.85, 'rgba(220, 38, 38, 0.65)');
      plumeGrad.addColorStop(1, 'rgba(127, 29, 29, 0)');

      ctx.fillStyle = plumeGrad;
      ctx.beginPath();
      const baseHalfW = 14 + easeOut * 10;
      const topHalfW = 7 + easeOut * 8;
      ctx.moveTo(fx.x - baseHalfW, fx.y + 3);
      ctx.quadraticCurveTo(
        fx.x - baseHalfW * 1.15,
        fx.y - plumeHeight * 0.45,
        fx.x - topHalfW,
        fx.y - plumeHeight * 0.85
      );
      ctx.arc(
        fx.x,
        fx.y - plumeHeight * 0.85,
        topHalfW,
        Math.PI,
        0,
        false
      );
      ctx.quadraticCurveTo(
        fx.x + baseHalfW * 1.15,
        fx.y - plumeHeight * 0.45,
        fx.x + baseHalfW,
        fx.y + 3
      );
      ctx.closePath();
      ctx.fill();

      // Lõi lửa trắng-vàng bốc thẳng ở tâm cột nổ
      ctx.fillStyle = 'rgba(254, 249, 195, 0.92)';
      ctx.beginPath();
      ctx.ellipse(
        fx.x,
        fx.y - plumeHeight * 0.36,
        Math.max(4, baseHalfW * 0.48 * (1 - progress * 0.4)),
        plumeHeight * 0.38,
        0,
        0,
        Math.PI * 2
      );
      ctx.fill();

      // 4. Các hạt khói lửa & tàn lửa (Fire & Smoke Particles) bắn vọt thẳng đứng lên không trung
      const sparkOffsets = [
        { dx: -14, dy: -plumeHeight * 0.45, r: 3.2, c: '#fde047' },
        { dx: 15, dy: -plumeHeight * 0.52, r: 3.0, c: '#f97316' },
        { dx: -8, dy: -plumeHeight * 0.95, r: 3.5, c: '#fef08a' },
        { dx: 9, dy: -plumeHeight * 1.02, r: 3.2, c: '#ef4444' },
        { dx: 0, dy: -plumeHeight * 1.18, r: 2.8, c: '#fde047' },
        { dx: -18, dy: -plumeHeight * 0.78, r: 3.8, c: '#52525b' },
        { dx: 19, dy: -plumeHeight * 0.82, r: 3.8, c: '#3f3f46' },
      ];
      sparkOffsets.forEach((sp, sIdx) => {
        const lift = easeOut * (10 + sIdx * 3);
        ctx.fillStyle = sp.c;
        ctx.beginPath();
        ctx.arc(
          fx.x + sp.dx * (0.7 + easeOut * 0.5),
          fx.y + sp.dy - lift,
          Math.max(1.2, sp.r * (1 - progress * 0.45)),
          0,
          Math.PI * 2
        );
        ctx.fill();
      });

      // Tia lửa vọt ngược lên theo hình quạt thẳng đứng
      ctx.strokeStyle = '#fef08a';
      ctx.lineWidth = 2.2 * (1 - progress * 0.4);
      const fanAngles = [-1.95, -1.72, -1.57, -1.42, -1.18];
      fanAngles.forEach((ang, aIdx) => {
        const innerD = 8 + easeOut * 12;
        const outerD = 24 + easeOut * (34 + (aIdx % 2) * 10);
        ctx.beginPath();
        ctx.moveTo(
          fx.x + Math.cos(ang) * innerD * 0.55,
          fx.y + Math.sin(ang) * innerD
        );
        ctx.lineTo(
          fx.x + Math.cos(ang) * outerD * 0.55,
          fx.y + Math.sin(ang) * outerD
        );
        ctx.stroke();
      });
    } else if (fx.kind === 'HEXTECH_SPARK_BURST') {
      // Hiệu ứng phát nổ điện vừa phải khi quả cầu năng lượng Hextech bắn trúng mục tiêu
      const r = 6 + progress * 22;
      const radGrad = ctx.createRadialGradient(fx.x, fx.y, 1, fx.x, fx.y, r);
      radGrad.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
      radGrad.addColorStop(0.45, 'rgba(56, 189, 248, 0.65)');
      radGrad.addColorStop(1, 'rgba(2, 132, 199, 0)');
      ctx.fillStyle = radGrad;
      ctx.beginPath();
      ctx.arc(fx.x, fx.y, r, 0, Math.PI * 2);
      ctx.fill();

      // Vòng xung điện xanh lam & tia hồ quang vàng
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2.4 * (1 - progress);
      ctx.beginPath();
      ctx.arc(fx.x, fx.y, r * 0.85, 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = '#fde047';
      ctx.lineWidth = 1.6 * (1 - progress * 0.4);
      for (let i = 0; i < 4; i++) {
        const ang = (i * Math.PI) / 2 + progress * 1.6;
        const midX = fx.x + Math.cos(ang + 0.25) * (r * 0.5);
        const midY = fx.y + Math.sin(ang + 0.25) * (r * 0.5);
        const endX = fx.x + Math.cos(ang) * (r * 1.05);
        const endY = fx.y + Math.sin(ang) * (r * 1.05);
        ctx.beginPath();
        ctx.moveTo(fx.x, fx.y);
        ctx.lineTo(midX, midY);
        ctx.lineTo(endX, endY);
        ctx.stroke();
      }
    } else if (fx.kind === 'HEXTECH_PARALYZE_BURST') {
      // Hiệu ứng bùng nổ tia năng lượng cực mạnh gây Tê Liệt của Tháp Hextech
      const r = 10 + progress * 38;
      const radGrad = ctx.createRadialGradient(fx.x, fx.y, 2, fx.x, fx.y, r);
      radGrad.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
      radGrad.addColorStop(0.4, 'rgba(253, 224, 71, 0.78)');
      radGrad.addColorStop(0.75, 'rgba(56, 189, 248, 0.5)');
      radGrad.addColorStop(1, 'rgba(14, 165, 233, 0)');
      ctx.fillStyle = radGrad;
      ctx.beginPath();
      ctx.arc(fx.x, fx.y, r, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = '#fde047';
      ctx.lineWidth = 3 * (1 - progress * 0.5);
      ctx.beginPath();
      ctx.arc(fx.x, fx.y, r * 0.88, 0, Math.PI * 2);
      ctx.stroke();

      // 6 tia sét cao áp phóng ra từ tâm vụ nổ
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.8 * (1 - progress * 0.4);
      for (let i = 0; i < 6; i++) {
        const ang = (i * Math.PI) / 3 - progress * 1.2;
        const p1x = fx.x + Math.cos(ang - 0.18) * (r * 0.45);
        const p1y = fx.y + Math.sin(ang - 0.18) * (r * 0.45);
        const p2x = fx.x + Math.cos(ang + 0.15) * (r * 0.8);
        const p2y = fx.y + Math.sin(ang + 0.15) * (r * 0.8);
        const p3x = fx.x + Math.cos(ang) * (r * 1.15);
        const p3y = fx.y + Math.sin(ang) * (r * 1.15);
        ctx.beginPath();
        ctx.moveTo(fx.x, fx.y);
        ctx.lineTo(p1x, p1y);
        ctx.lineTo(p2x, p2y);
        ctx.lineTo(p3x, p3y);
        ctx.stroke();
      }
    } else if (fx.kind === 'HEXTECH_LASER_BEAM') {
      // Tia năng lượng Hextech (Kỹ năng W): Kéo dài trực tiếp từ vị trí nòng súng (fx.x, fx.y) đến kẻ địch (fx.targetX, fx.targetY)
      const tx = fx.targetX ?? fx.x;
      const ty = fx.targetY ?? fx.y;
      const dx = tx - fx.x;
      const dy = ty - fx.y;
      const dist = Math.hypot(dx, dy);
      const beamAngle = Math.atan2(dy, dx);

      ctx.save();
      ctx.translate(fx.x, fx.y);
      ctx.rotate(beamAngle);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      // Hào quang năng lượng xanh lam bên ngoài
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.45)';
      ctx.lineWidth = Math.max(2, 10.5 * (1 - progress * 0.55));
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(dist, 0);
      ctx.stroke();

      // Tia năng lượng chính màu xanh Hextech
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = Math.max(1.5, 5.2 * (1 - progress * 0.45));
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(dist, 0);
      ctx.stroke();

      // Lõi laser vàng - trắng rực ở trung tâm
      ctx.strokeStyle = '#fde047';
      ctx.lineWidth = Math.max(1, 2.5 * (1 - progress * 0.35));
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(dist, 0);
      ctx.stroke();

      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.1;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(dist, 0);
      ctx.stroke();

      // Các đường điện giật mỏng manh xoắn dọc theo tia năng lượng
      const segments = Math.max(4, Math.floor(dist / 22));
      for (let b = 0; b < 2; b++) {
        ctx.strokeStyle = b === 0 ? '#fde047' : '#7dd3fc';
        ctx.lineWidth = 0.85;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        for (let s = 1; s < segments; s++) {
          const sx = (dist * s) / segments;
          const jitter =
            Math.sin(s * 2.7 + progress * 18 + b * 3.1) *
            (b === 0 ? 4.2 : -3.5);
          ctx.lineTo(sx, jitter);
        }
        ctx.lineTo(dist, 0);
        ctx.stroke();
      }

      // Chớp sáng ở đầu nòng súng và điểm chạm mục tiêu
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(0, 0, Math.max(2, 4.8 * (1 - progress * 0.4)), 0, Math.PI * 2);
      ctx.arc(dist, 0, Math.max(2.5, 6 * (1 - progress * 0.3)), 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    ctx.restore();
  });

  // 3. Burst Hit Particles (Crisp outlined pixel sparks)
  particles.forEach((pt) => {
    const alpha = Math.max(0, pt.life / pt.maxLife);
    ctx.save();
    ctx.globalAlpha = alpha;
    const pxX = Math.round(pt.x - pt.size / 2);
    const pxY = Math.round(pt.y - pt.size / 2);
    ctx.fillStyle = '#090d16';
    ctx.fillRect(pxX - 1, pxY - 1, pt.size + 2, pt.size + 2);
    ctx.fillStyle = pt.color;
    ctx.fillRect(pxX, pxY, pt.size, pt.size);
    ctx.restore();
  });

  // 4. Floating Damage & Evasion Numbers (Bay dọc từ dưới chân lên đỉnh đầu đơn vị rồi văng tỏa ra nhiều hướng ngẫu nhiên, giảm 25% tốc độ bay)
  damagePopups.forEach((dp) => {
    const elapsed = now - dp.createdAt;
    const duration = 800;
    const progress = Math.min(1, elapsed / duration);
    const alpha = progress < 0.7 ? 1 : 1 - (progress - 0.7) / 0.3;
    const scale =
      elapsed < 100
        ? 0.78 + (elapsed / 100) * (dp.isCrit ? 0.34 : 0.22)
        : dp.isCrit
        ? 1.0
        : 0.92;

    // Hiệu ứng chấn động nhẹ lúc mới xuất hiện cho sát thương chí mạng
    const shakeX =
      dp.isCrit && elapsed < 120
        ? Math.sin(elapsed * 0.75) * 2.0 * (1 - elapsed / 120)
        : 0;
    const shakeY =
      dp.isCrit && elapsed < 120
        ? Math.cos(elapsed * 0.85) * 1.5 * (1 - elapsed / 120)
        : 0;

    ctx.save();
    ctx.globalAlpha = Math.max(0, alpha);
    ctx.translate(dp.x + shakeX, dp.y + shakeY);
    ctx.scale(scale, scale);
    // Giảm kích thước toàn bộ floating text đi 15% (11px -> 9.35px), riêng chí mạng giảm 25% (13.5px -> 10.1px)
    ctx.font = dp.isCrit
      ? '800 10.1px "JetBrains Mono", monospace'
      : '700 9.35px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';

    if (dp.isCrit) {
      const textW = ctx.measureText(dp.text).width;
      const halfBurstWidth = 7.4;
      const gap = 0.8;
      const totalW = textW + gap + halfBurstWidth;
      const textCenterX = -totalW / 2 + textW / 2;
      const burstOriginX = textCenterX + textW / 2 + gap;

      // Vẽ 1 nửa phải của icon ngôi sao bùng nổ nhiều gai nhọn (Gốc gai to, dày dặn, khỏe khoắn) gắn ở bên phải text sát thương chí mạng
      ctx.save();
      ctx.translate(burstOriginX, -0.2);
      ctx.lineJoin = 'miter';
      ctx.miterLimit = 6;

      // 5 gai nhọn bản gốc to (góc mở rộng, bán kính thung lũng giữa các gai lớn 3.8px giúp gốc mỗi gai dày dặn, không bị ốm)
      const spikeAngles = [-1.18, -0.6, 0, 0.6, 1.18];
      const spikeLengths = [6.6, 8.0, 8.6, 8.0, 6.6];
      const valleyRadius = 3.8;

      ctx.beginPath();
      // Điểm khởi đầu ở mép trên bên trái của nửa ngôi sao nổ (mở rộng bản gốc lên -4.6)
      ctx.moveTo(0, -4.6);
      for (let i = 0; i < spikeAngles.length; i++) {
        const ang = spikeAngles[i];
        const len = spikeLengths[i];
        ctx.lineTo(Math.cos(ang) * len, Math.sin(ang) * len);
        if (i < spikeAngles.length - 1) {
          const midAng = (ang + spikeAngles[i + 1]) * 0.5;
          ctx.lineTo(
            Math.cos(midAng) * valleyRadius,
            Math.sin(midAng) * valleyRadius
          );
        }
      }
      // Điểm kết thúc ở mép dưới bên trái (+4.6) và khép kín đường cắt thẳng đứng bên trái
      ctx.lineTo(0, 4.6);
      ctx.lineTo(0.4, 0);
      ctx.closePath();

      ctx.lineWidth = 1.4;
      ctx.strokeStyle = '#000000';
      ctx.stroke();
      ctx.fillStyle = dp.color;
      ctx.fill();
      ctx.restore();

      // Vẽ số sát thương chí mạng bên trái cụm gai bùng nổ
      ctx.lineWidth = 2.0;
      ctx.strokeStyle = '#000000';
      ctx.strokeText(dp.text, textCenterX, 0);
      ctx.fillStyle = dp.color;
      ctx.fillText(dp.text, textCenterX, 0);
    } else {
      ctx.lineWidth = 1.8;
      ctx.strokeStyle = '#000000';
      ctx.strokeText(dp.text, 0, 0);
      ctx.fillStyle = dp.color;
      ctx.fillText(dp.text, 0, 0);
    }
    ctx.restore();
  });
}

export function getBuildingNameVi(type: BuildingType): string {
  switch (type) {
    case 'TOWN_HALL':
      return 'Nhà Dân';
    case 'BARRACKS':
      return 'Trại Lính';
    case 'FARM':
      return 'Ruộng Lúa';
    case 'WAREHOUSE':
      return 'Nhà Kho';
    case 'HERO_ALTAR':
      return 'Điện Anh Hùng';
    case 'MANOR':
      return 'Trang Viên';
    case 'CONSTRUCTION_CENTER':
      return 'Trung Tâm Xây Dựng';
    case 'TOWER_ARCHER':
      return 'Tháp Cung Thủ';
    case 'TOWER_MUSKET':
      return 'Tháp Súng Hỏa Mai';
    case 'TOWER_CANNON':
      return 'Tháp Pháo Hạng Nặng';
    case 'TOWER_HEXTECH':
      return 'Tháp Pháo Hextech';
    case 'CAMPFIRE':
      return 'Lửa Trại';
  }
}

// Vẽ các Vật Phẩm Trang Viên (Trang trí, Sưu tầm, Làm nông, Nuôi thú) trực tiếp lên Canvas Trang Viên
export function drawManorPlacedObject(
  ctx: CanvasRenderingContext2D,
  obj: PlacedManorObject,
  tick: number,
  isSelected = false
) {
  const x = obj.gridX * TILE_SIZE;
  const y = obj.gridY * TILE_SIZE;
  const worldX = (obj.gridX + 0.5) * TILE_SIZE;
  const worldY = (obj.gridY + 0.5) * TILE_SIZE;
  const animFrame = Math.floor(tick / 22) % 2;

  if (isSelected) {
    ctx.save();
    ctx.strokeStyle = '#fde047';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(x + 2, y + 2, TILE_SIZE - 4, TILE_SIZE - 4);
    ctx.restore();
  }

  // ĐỒNG BỘ 100%: Cây trong Chế Độ Xây Dựng (DECO_TREE) và Cây của Engine vẽ Map (ResourceNode TREE) là CÙNG 1 MODEL DUY NHẤT!
  if (obj.customIcon === 'DECO_TREE') {
    drawResourceNode(
      ctx,
      {
        id: obj.id,
        type: 'TREE',
        gridX: obj.gridX,
        gridY: obj.gridY,
        amount: 500,
        maxAmount: 500,
      },
      tick
    );
    return;
  }

  // Bóng pixel răng cưa động dưới chân vật trang trí (tự động xoay & kéo dài ngược hướng Lửa Trại khi nằm trong tầm sáng)
  const shadowRx =
    obj.customIcon === 'DECO_GRASS_TUFT'
      ? 14
      : obj.customIcon === 'DECO_BUSH' || obj.customIcon === 'DECO_FLOWER_BUSH'
        ? 19
        : 21;
  const shadowRy = obj.customIcon === 'DECO_GRASS_TUFT' ? 4 : 5;
  drawSteppedPixelShadow(
    ctx,
    x + 32,
    y + 49,
    shadowRx,
    shadowRy,
    obj.customIcon === 'DECO_GRASS_TUFT' ? 0.32 : 0.4,
    worldX,
    worldY
  );

  const key = `manor_obj_dynsh_${obj.customIcon}_${animFrame}_sn${activeSnowLevel}`;
  const sprite = getCachedSprite(key, TILE_SIZE, TILE_SIZE, (tCtx) => {
    if (obj.customIcon === 'MANOR_FENCE') {
      // Hàng rào gỗ điền viên & bụi cỏ hoa (dành riêng cho Trang Viên)
      px(
        tCtx,
        3,
        22,
        26,
        6,
        activeSnowLevel === 2
          ? '#e2e8f0'
          : activeSnowLevel === 1
            ? '#335c3e'
            : '#14532d'
      );
      px(tCtx, 5, 10, 4, 15, '#78350f');
      px(tCtx, 14, 10, 4, 15, '#92400e');
      px(tCtx, 23, 10, 4, 15, '#78350f');
      px(tCtx, 3, 13, 26, 3, '#b45309');
      px(tCtx, 3, 19, 26, 3, '#b45309');
      px(tCtx, 7, 23, 3, 3, '#fde047');
      px(tCtx, 20, 24, 3, 3, '#f43f5e');
      if (activeSnowLevel === 1) {
        px(tCtx, 5, 10, 4, 2, '#ffffff');
        px(tCtx, 14, 10, 4, 2, '#ffffff');
        px(tCtx, 23, 10, 4, 2, '#ffffff');
        px(tCtx, 3, 13, 26, 1, '#f8fafc');
      } else if (activeSnowLevel === 2) {
        px(tCtx, 4, 9, 6, 3, '#ffffff');
        px(tCtx, 13, 9, 6, 3, '#ffffff');
        px(tCtx, 22, 9, 6, 3, '#ffffff');
        px(tCtx, 3, 13, 26, 2, '#ffffff');
        px(tCtx, 3, 19, 26, 2, '#f8fafc');
        px(tCtx, 3, 24, 26, 4, '#ffffff');
      }
    } else if (obj.customIcon === 'MANOR_GARDEN') {
      // Luống hoa & thảo dược nông trại (dành riêng cho Trang Viên)
      px(tCtx, 3, 7, 26, 21, '#422006');
      px(
        tCtx,
        4,
        8,
        24,
        19,
        activeSnowLevel === 2 ? '#cbd5e1' : '#5c2d0c'
      );
      for (let ry = 10; ry <= 22; ry += 5) {
        px(
          tCtx,
          5,
          ry,
          22,
          3,
          activeSnowLevel === 2 ? '#e2e8f0' : '#15803d'
        );
        px(tCtx, 6 + animFrame, ry - 1, 3, 2, '#f43f5e');
        px(tCtx, 14, ry - 1, 4, 2, '#fbbf24');
        px(tCtx, 22 - animFrame, ry - 1, 3, 2, '#ec4899');
        if (activeSnowLevel >= 1) {
          px(
            tCtx,
            5,
            ry,
            22,
            activeSnowLevel === 2 ? 2 : 1,
            '#ffffff'
          );
        }
      }
    } else if (obj.customIcon === 'MANOR_FOUNTAIN') {
      // Đài phun nước đá cổ (dành riêng cho Trang Viên)
      px(tCtx, 4, 16, 24, 11, '#475569');
      px(
        tCtx,
        6,
        18,
        20,
        7,
        activeSnowLevel === 2 ? '#bae6fd' : '#0284c7'
      );
      px(tCtx, 8 + animFrame, 20, 14, 3, '#7dd3fc');
      px(tCtx, 13, 8, 6, 11, '#cbd5e1');
      px(tCtx, 9, 9, 14, 3, '#e2e8f0');
      px(tCtx, 14, 3 + animFrame, 4, 6, '#38bdf8');
      px(tCtx, 10, 6 + animFrame, 3, 4, '#bae6fd');
      px(tCtx, 19, 6 + animFrame, 3, 4, '#bae6fd');
      if (activeSnowLevel === 1) {
        px(tCtx, 9, 8, 14, 2, '#ffffff');
        px(tCtx, 4, 16, 24, 2, '#f8fafc');
      } else if (activeSnowLevel === 2) {
        px(tCtx, 8, 8, 16, 3, '#ffffff');
        px(tCtx, 4, 15, 24, 3, '#ffffff');
        px(tCtx, 4, 25, 24, 3, '#f1f5f9');
      }
    } else if (obj.customIcon === 'MANOR_DEER') {
      // Bãi chăn Hươu Sao linh thú (dành riêng cho Trang Viên)
      px(tCtx, 3, 20, 26, 8, '#14532d');
      px(
        tCtx,
        4,
        21,
        24,
        6,
        activeSnowLevel === 2
          ? '#f8fafc'
          : activeSnowLevel === 1
            ? '#cbd5e1'
            : '#22c55e'
      );
      const dx = animFrame * 2;
      px(tCtx, 9 + dx, 13, 11, 6, '#d97706');
      px(tCtx, 11 + dx, 14, 2, 2, '#fef08a');
      px(tCtx, 15 + dx, 15, 2, 2, '#fef08a');
      px(tCtx, 17 + dx, 8, 5, 6, '#d97706');
      px(tCtx, 18 + dx, 4, 2, 4, '#fde047');
      px(tCtx, 21 + dx, 5, 2, 3, '#fde047');
      px(tCtx, 10 + dx, 19, 2, 5, '#92400e');
      px(tCtx, 17 + dx, 19, 2, 5, '#92400e');
      if (activeSnowLevel === 2) {
        px(tCtx, 10 + dx, 13, 8, 1, '#ffffff');
      }
    } else if (obj.customIcon === 'DECO_GRASS_TUFT') {
      // Khóm Cỏ Xanh Mướt — đồng bộ bảng màu & dáng cụm cỏ của Engine vẽ Map (#1a3a16, #3d7d35, #448c3b, #5cb84f)
      px(tCtx, 7, 21, 18, 3, '#1a3a16');
      // Cụm cỏ chính giữa
      px(tCtx, 9, 15, 2, 8, '#1e441b');
      px(tCtx, 11 + animFrame, 11, 2, 12, '#3d7d35');
      px(tCtx, 13 + animFrame, 9, 3, 14, '#448c3b');
      px(tCtx, 16 + animFrame, 11, 2, 12, '#5cb84f');
      px(tCtx, 18, 13, 2, 10, '#448c3b');
      px(tCtx, 20 - animFrame, 15, 2, 8, '#3d7d35');
      // Đỉnh lá cỏ đón nắng
      px(tCtx, 14 + animFrame, 9, 2, 3, '#5cb84f');
      px(tCtx, 14 + animFrame, 9, 1, 2, '#86efac');
      if (activeSnowLevel >= 1) {
        px(tCtx, 11, 10, 8, 2, '#ffffff');
      }
    } else if (obj.customIcon === 'DECO_BUSH') {
      // Bụi Cây Xanh Rậm — đồng bộ bảng màu tán lá của Engine vẽ Map (#0b2915, #14532d, #166534, #3d7d35, #448c3b, #5cb84f)
      px(tCtx, 5, 13, 22, 11, '#0b2915');
      px(tCtx, 7, 10, 18, 13, '#0b2915');
      px(tCtx, 6, 14, 20, 9, '#14532d');
      px(tCtx, 8, 11, 16, 11, '#166534');
      px(tCtx, 9, 10, 14, 9, '#3d7d35');
      px(tCtx, 10, 10, 11, 6, '#448c3b');
      px(tCtx, 11, 10, 6, 3, '#5cb84f');
      px(tCtx, 12, 10, 3, 2, '#86efac');
      if (activeSnowLevel >= 1) {
        px(tCtx, 8, 9, 16, 3, '#ffffff');
      }
    } else if (obj.customIcon === 'DECO_FLOWER_BUSH') {
      // Bụi Hoa Rực Rỡ — đồng bộ hoa Mao Lương Vàng (#facc15/#fef08a), Anh Túc Đỏ (#ef4444/#fca5a5) & Chuông Xanh (#3b82f6/#93c5fd) của Engine vẽ Map
      px(tCtx, 5, 13, 22, 11, '#0b2915');
      px(tCtx, 7, 10, 18, 13, '#1a3a16');
      px(tCtx, 6, 14, 20, 9, '#1e441b');
      px(tCtx, 8, 11, 16, 10, '#3d7d35');
      px(tCtx, 10, 10, 12, 7, '#448c3b');
      // Hoa anh túc đỏ
      px(tCtx, 8 + animFrame, 12, 3, 3, '#ef4444');
      px(tCtx, 8 + animFrame, 12, 1, 1, '#fca5a5');
      // Hoa mao lương vàng
      px(tCtx, 14, 10, 3, 3, '#facc15');
      px(tCtx, 14, 10, 2, 1, '#fef08a');
      px(tCtx, 11, 16, 3, 3, '#f59e0b');
      px(tCtx, 11, 16, 1, 1, '#fef08a');
      // Hoa chuông xanh
      px(tCtx, 19 - animFrame, 13, 3, 3, '#3b82f6');
      px(tCtx, 19 - animFrame, 13, 1, 1, '#93c5fd');
      px(tCtx, 16, 17, 3, 2, '#ef4444');
    } else if (obj.customIcon === 'DECO_ROCK') {
      // Đá Cảnh Rêu Phong — đồng bộ tảng đá của Engine vẽ Map (#1c1917, #44403c, #57534e, #78716c, #a8a29e, #d6d3d1) + rêu cỏ (#448c3b, #5cb84f)
      px(tCtx, 5, 14, 22, 11, '#1c1917');
      px(tCtx, 8, 9, 16, 15, '#1c1917');
      px(tCtx, 6, 15, 20, 9, '#44403c');
      px(tCtx, 9, 10, 14, 13, '#57534e');
      px(tCtx, 11, 9, 9, 10, '#78716c');
      px(tCtx, 11, 9, 7, 2, '#d6d3d1');
      px(tCtx, 9, 11, 3, 4, '#a8a29e');
      // Mảng rêu thảo nguyên bám trên đá
      px(tCtx, 7, 17, 6, 4, '#3d7d35');
      px(tCtx, 8, 17, 4, 2, '#5cb84f');
      px(tCtx, 18, 18, 5, 4, '#448c3b');
      if (activeSnowLevel >= 1) {
        px(tCtx, 9, 9, 12, 2, '#ffffff');
      }
    } else {
      // Tượng Kỳ Lân Hoàng Kim (MANOR_STATUE - dành riêng cho Trang Viên)
      px(tCtx, 5, 21, 22, 7, '#57534e');
      px(tCtx, 6, 22, 20, 5, '#d6d3d1');
      px(tCtx, 9, 11, 14, 10, '#f59e0b');
      px(tCtx, 11, 6, 8, 6, '#fbbf24');
      px(tCtx, 14, 2 + animFrame, 4, 4, '#fef08a');
      px(tCtx, 11, 13, 10, 6, '#fde047');
      if (activeSnowLevel === 1) {
        px(tCtx, 11, 6, 8, 1, '#ffffff');
        px(tCtx, 5, 21, 22, 2, '#f8fafc');
      } else if (activeSnowLevel === 2) {
        px(tCtx, 11, 5, 8, 2, '#ffffff');
        px(tCtx, 9, 10, 14, 2, '#ffffff');
        px(tCtx, 5, 20, 22, 3, '#ffffff');
      }
    }
  });
  ctx.drawImage(sprite, x, y);

  // Highlight nhẹ 1 phần mép vật trang trí hướng về phía Lửa Trại
  const rimKind =
    obj.customIcon === 'DECO_GRASS_TUFT'
      ? 'GRASS'
      : obj.customIcon === 'DECO_ROCK'
        ? 'ROCK'
        : obj.customIcon === 'DECO_BUSH' ||
            obj.customIcon === 'DECO_FLOWER_BUSH'
          ? 'BUSH'
          : 'BUILDING';
  drawObjectDirectionalRimHighlight(ctx, x, y, rimKind, worldX, worldY);
}

// Vẽ icon mini 8-bit đặc trưng cho từng loại vật phẩm rơi ra (Viền đồng bộ với màu phẩm chất colorHex, rà chuột có glow vàng)
export function drawLootMiniPixelIcon(
  ctx: CanvasRenderingContext2D,
  kind: string,
  colorHex: string,
  cx: number,
  cy: number,
  scale = 0.8,
  isHovered = false,
  customIcon?: string
) {
  ctx.save();
  ctx.translate(cx, cy);
  if (scale !== 1) {
    ctx.scale(scale, scale);
  }

  if (isHovered) {
    // Khi rà chuột vào item rơi trên mặt đất: phát sáng hào quang Glow Vàng (#fde047)
    ctx.save();
    ctx.shadowColor = '#fde047';
    ctx.shadowBlur = 14;
    ctx.fillStyle = 'rgba(253, 224, 71, 0.28)';
    ctx.fillRect(-12, -12, 24, 24);
    ctx.strokeStyle = 'rgba(253, 224, 71, 0.92)';
    ctx.lineWidth = 1.6;
    ctx.strokeRect(-11.5, -11.5, 23, 23);
    ctx.restore();
  }

  // Khung nền mini bảo vệ icon (Màu viền luôn đồng bộ với màu phẩm chất colorHex của item)
  ctx.fillStyle = isHovered ? '#2d1a0a' : '#140c06';
  ctx.fillRect(-10, -10, 20, 20);
  ctx.strokeStyle = colorHex;
  ctx.lineWidth = isHovered ? 2.0 : 1.5;
  ctx.strokeRect(-10, -10, 20, 20);

  const iconKey = String(customIcon || '');
  const packMatch = iconKey.match(
    /^PACK_(FOOD|WOOD|STONE|GOLD|DIAMOND)_([1-5])$/
  );

  if (packMatch) {
    const resType = packMatch[1] as
      | 'FOOD'
      | 'WOOD'
      | 'STONE'
      | 'GOLD'
      | 'DIAMOND';
    const tier = Number(packMatch[2]);
    const isChest = tier >= 3;

    const paletteMap: Record<
      typeof resType,
      { bag: string; trim: string; sym: string; shine: string }
    > = {
      FOOD: {
        bag: '#854d0e',
        trim: '#ca8a04',
        sym: '#4ade80',
        shine: '#fef08a',
      },
      WOOD: {
        bag: '#78350f',
        trim: '#b45309',
        sym: '#d97706',
        shine: '#fde68a',
      },
      STONE: {
        bag: '#57534e',
        trim: '#78716c',
        sym: '#d6d3d1',
        shine: '#ffffff',
      },
      GOLD: {
        bag: '#b45309',
        trim: '#f59e0b',
        sym: '#fde047',
        shine: '#ffffff',
      },
      DIAMOND: {
        bag: '#0369a1',
        trim: '#0ea5e9',
        sym: '#38bdf8',
        shine: '#e0f2fe',
      },
    };
    const pal = paletteMap[resType];

    if (!isChest) {
      // Cấp 1 (Túi Nhỏ) & Cấp 2 (Túi Lớn)
      const w = tier === 2 ? 12 : 10;
      const h = tier === 2 ? 10 : 8;
      // Miệng túi & dây buộc
      ctx.fillStyle = pal.sym;
      ctx.fillRect(-Math.floor(w / 3), -7, Math.floor((w * 2) / 3), 2);
      ctx.fillStyle = colorHex;
      ctx.fillRect(-Math.floor(w / 2) + 1, -5, w - 2, 2);
      // Thân túi
      ctx.fillStyle = pal.bag;
      ctx.fillRect(-Math.floor(w / 2), -3, w, h);
      ctx.fillStyle = pal.trim;
      ctx.fillRect(-Math.floor(w / 2) + 1, -2, Math.floor(w / 2), h - 2);
      // Biểu tượng tài nguyên / tiền tệ ở tâm túi
      ctx.fillStyle = pal.sym;
      ctx.fillRect(-2, -1, 4, 4);
      ctx.fillStyle = pal.shine;
      ctx.fillRect(-1, 0, 2, 2);
    } else {
      // Cấp 3 (Rương Nhỏ), Cấp 4 (Rương Vừa), Cấp 5 (Rương Lớn)
      const w = tier === 5 ? 14 : tier === 4 ? 12 : 10;
      const h = tier === 5 ? 11 : 9;
      const topY = -Math.floor(h / 2);
      // Thân rương
      ctx.fillStyle = pal.bag;
      ctx.fillRect(-Math.floor(w / 2), topY, w, h);
      // Nắp rương sáng màu
      ctx.fillStyle = pal.trim;
      ctx.fillRect(-Math.floor(w / 2) + 1, topY + 1, w - 2, 3);
      // Đai viền theo màu phẩm chất
      ctx.fillStyle = colorHex;
      ctx.fillRect(-Math.floor(w / 2), topY + 3, w, 2);
      ctx.fillRect(-Math.floor(w / 2), topY, 2, h);
      ctx.fillRect(Math.floor(w / 2) - 2, topY, 2, h);
      // Biểu tượng khóa & bảo vật ở giữa rương
      ctx.fillStyle = pal.sym;
      ctx.fillRect(-2, topY + 3, 4, 4);
      ctx.fillStyle = pal.shine;
      ctx.fillRect(-1, topY + 4, 2, 2);
    }
  } else if (iconKey === 'MYSTIC_IRON_ORE') {
    // Đá Huyền Thiếc: Khối khoáng thạch sắt đen lấp lánh vân tinh thể lam ngọc
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(-6, -4, 12, 9);
    ctx.fillStyle = '#475569';
    ctx.fillRect(-5, -6, 9, 7);
    ctx.fillStyle = '#0284c7';
    ctx.fillRect(-4, -2, 4, 4);
    ctx.fillRect(1, -4, 3, 4);
    ctx.fillStyle = '#7dd3fc';
    ctx.fillRect(-3, -1, 2, 2);
    ctx.fillRect(1, -3, 2, 2);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-3, -1, 1, 1);
  } else if (kind === 'GOLD') {
    // Túi vàng & đồng xu lấp lánh
    ctx.fillStyle = '#92400e';
    ctx.fillRect(-5, -2, 10, 9);
    ctx.fillStyle = '#d97706';
    ctx.fillRect(-6, 0, 12, 6);
    ctx.fillStyle = '#fde047';
    ctx.fillRect(-4, -5, 8, 3);
    ctx.fillRect(-3, -1, 6, 2);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-2, 1, 3, 3);
  } else if (kind === 'DIAMOND') {
    // Viên Kim Cương xanh ngọc giác cắt
    ctx.fillStyle = '#0284c7';
    ctx.fillRect(-5, -5, 10, 10);
    ctx.fillStyle = '#38bdf8';
    ctx.fillRect(-6, -2, 12, 5);
    ctx.fillRect(-3, -6, 6, 12);
    ctx.fillStyle = '#e0f2fe';
    ctx.fillRect(-3, -3, 4, 4);
  } else if (kind === 'FOOD') {
    // Bó lúa mì vàng óng
    ctx.fillStyle = '#65a30d';
    ctx.fillRect(-4, 1, 8, 6);
    ctx.fillStyle = '#facc15';
    ctx.fillRect(-6, -6, 4, 7);
    ctx.fillRect(-1, -7, 4, 8);
    ctx.fillRect(3, -5, 4, 6);
    ctx.fillStyle = '#dc2626';
    ctx.fillRect(-4, 2, 8, 2);
  } else if (kind === 'WOOD') {
    // Khúc gỗ sồi bó
    ctx.fillStyle = '#78350f';
    ctx.fillRect(-7, -4, 14, 4);
    ctx.fillRect(-6, 1, 12, 4);
    ctx.fillStyle = '#b45309';
    ctx.fillRect(-5, -3, 10, 2);
    ctx.fillRect(-4, 2, 8, 2);
    ctx.fillStyle = '#fde68a';
    ctx.fillRect(4, -3, 2, 2);
    ctx.fillRect(3, 2, 2, 2);
  } else if (kind === 'STONE') {
    // Khối đá khoáng thạch
    ctx.fillStyle = '#57534e';
    ctx.fillRect(-6, -4, 12, 10);
    ctx.fillStyle = '#a8a29e';
    ctx.fillRect(-5, -5, 9, 7);
    ctx.fillStyle = '#e7e5e4';
    ctx.fillRect(-3, -3, 5, 3);
  } else if (kind === 'KINGDOM_ITEM') {
    if (iconKey.startsWith('EXP_POTION')) {
      // Bình thuốc EXP tím
      ctx.fillStyle = '#d97706';
      ctx.fillRect(-2, -8, 4, 3);
      ctx.fillStyle = '#7e22ce';
      ctx.fillRect(-5, -3, 10, 10);
      ctx.fillStyle = '#c084fc';
      ctx.fillRect(-4, -1, 8, 6);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(-3, 0, 2, 3);
    } else {
      // Thẻ Triệu Hồi Quân Đội viền vàng
      ctx.fillStyle = '#fde047';
      ctx.fillRect(-6, -7, 12, 14);
      ctx.fillStyle = '#1d4ed8';
      ctx.fillRect(-5, -6, 10, 12);
      ctx.fillStyle = '#93c5fd';
      ctx.fillRect(-2, -3, 4, 6);
    }
  } else if (kind === 'MANOR_ITEM') {
    // Chậu cây / hoa cảnh Trang Viên
    ctx.fillStyle = '#9a3412';
    ctx.fillRect(-4, 2, 8, 5);
    ctx.fillStyle = '#22c55e';
    ctx.fillRect(-5, -3, 10, 5);
    ctx.fillStyle = '#f472b6';
    ctx.fillRect(-3, -6, 6, 4);
    ctx.fillStyle = '#fde047';
    ctx.fillRect(-1, -5, 2, 2);
  } else if (kind === 'EQUIPMENT') {
    // Thanh kiếm & khiên Trang Bị
    ctx.fillStyle = '#94a3b8';
    ctx.fillRect(-2, -7, 4, 10);
    ctx.fillStyle = '#e2e8f0';
    ctx.fillRect(-1, -7, 2, 8);
    ctx.fillStyle = '#fde047';
    ctx.fillRect(-5, 2, 10, 2);
    ctx.fillStyle = '#b45309';
    ctx.fillRect(-1, 4, 2, 4);
  } else {
    // GEM - Đá quý khảm trang bị
    ctx.fillStyle = '#059669';
    ctx.fillRect(-5, -5, 10, 10);
    ctx.fillStyle = '#34d399';
    ctx.fillRect(-3, -6, 6, 12);
    ctx.fillRect(-6, -3, 12, 6);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-2, -3, 3, 3);
  }

  ctx.restore();
}

// Vẽ vật phẩm rơi trên mặt đất (Giảm 20% kích thước, rà chuột có hiệu ứng Glow Vàng, viền đồng bộ màu phẩm chất)
export function drawGroundLootDrop(
  ctx: CanvasRenderingContext2D,
  drop: {
    x: number;
    y: number;
    kind: string;
    label: string;
    colorHex: string;
    customIcon?: string;
    createdAt?: number;
  },
  tick: number,
  isHovered = false,
  nowMs = performance.now(),
  isoOriginDeltaX = 0,
  isoOriginDeltaY = 0
) {
  const POP_DURATION_MS = 520;
  const elapsed =
    drop.createdAt !== undefined
      ? Math.max(0, nowMs - drop.createdAt)
      : POP_DURATION_MS;
  const isBouncing = elapsed < POP_DURATION_MS;
  const t = isBouncing ? Math.min(1, elapsed / POP_DURATION_MS) : 1;

  // Nội suy điểm mặt đất từ vị trí kẻ địch (t=0) sang vị trí rơi (t=1)
  const groundX = Math.round(drop.x + isoOriginDeltaX * (1 - t));
  const groundY = Math.round(drop.y + isoOriginDeltaY * (1 - t));

  // Độ nảy parabol khi văng ra từ người kẻ địch (1 nhịp nhảy cao + 1 nhịp nảy nhỏ khi chạm đất)
  let jumpOffsetY = 0;
  if (isBouncing) {
    if (t < 0.72) {
      const u = t / 0.72;
      jumpOffsetY = -Math.sin(u * Math.PI) * 30;
    } else {
      const u = (t - 0.72) / 0.28;
      jumpOffsetY = -Math.sin(u * Math.PI) * 8;
    }
  } else {
    jumpOffsetY =
      Math.sin(tick * 0.12 + drop.x * 0.05) * 2.0 - (isHovered ? 3 : 0);
  }

  const iconCenterX = groundX;
  const iconCenterY = Math.round(groundY - 8 + jumpOffsetY);

  ctx.save();

  // Vệt sáng parabol khi item đang nhảy ra từ vị trí kẻ địch
  if (isBouncing && t < 0.75) {
    ctx.strokeStyle = drop.colorHex;
    ctx.globalAlpha = 0.55 * (1 - t);
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(drop.x + isoOriginDeltaX, drop.y + isoOriginDeltaY - 10);
    ctx.quadraticCurveTo(
      groundX + isoOriginDeltaX * 0.35,
      groundY - 34,
      iconCenterX,
      iconCenterY
    );
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  // Bóng đổ dưới mặt đất (giảm ~20% kích thước; khi rà chuột vào thì phát sáng Glow Vàng)
  const shadowScale = isBouncing ? Math.max(0.45, 1 + jumpOffsetY / 45) : 1;
  if (isHovered) {
    ctx.save();
    ctx.shadowColor = '#fde047';
    ctx.shadowBlur = 12;
    ctx.fillStyle = 'rgba(253, 224, 71, 0.25)';
    ctx.fillRect(groundX - 12, groundY - 2, 24, 7);
    ctx.restore();
  } else {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.46)';
    const sw = Math.round(16 * shadowScale);
    const sh = Math.round(5 * shadowScale);
    ctx.fillRect(groundX - Math.floor(sw / 2), groundY + 1, sw, sh);
  }

  // Vẽ icon mini 8-bit của vật phẩm (Đã giảm 20%: scale mặc định 0.8, khi hover 0.94 + Glow Vàng)
  drawLootMiniPixelIcon(
    ctx,
    drop.kind,
    drop.colorHex,
    iconCenterX,
    iconCenterY,
    isHovered ? 0.94 : 0.8,
    isHovered,
    drop.customIcon
  );

  // Nhãn tên vật phẩm kèm khung nổi phía trên icon mini (Đã giảm ~20% kích thước, rà chuột có Glow Vàng)
  ctx.font = isHovered
    ? 'bold 8.5px "Plus Jakarta Sans", sans-serif'
    : 'bold 7.5px "Plus Jakarta Sans", sans-serif';
  ctx.textAlign = 'center';
  const textW =
    Math.ceil(ctx.measureText(drop.label).width) + (isHovered ? 9 : 6);
  const badgeH = isHovered ? 11 : 10;
  const badgeX = Math.round(iconCenterX - textW / 2);
  const badgeY = Math.round(iconCenterY - (isHovered ? 21 : 19));

  if (isHovered) {
    ctx.save();
    ctx.shadowColor = '#fde047';
    ctx.shadowBlur = 10;
    ctx.fillStyle = 'rgba(42, 26, 10, 0.96)';
    ctx.fillRect(badgeX, badgeY, textW, badgeH);
    ctx.restore();
  } else {
    ctx.fillStyle = 'rgba(12, 8, 4, 0.92)';
    ctx.fillRect(badgeX, badgeY, textW, badgeH);
  }
  ctx.strokeStyle = drop.colorHex;
  ctx.lineWidth = isHovered ? 1.4 : 1.0;
  ctx.strokeRect(badgeX, badgeY, textW, badgeH);

  ctx.fillStyle = isHovered ? '#fef08a' : drop.colorHex;
  ctx.fillText(drop.label, iconCenterX, badgeY + (isHovered ? 8.5 : 7.5));

  ctx.restore();
}

// Vẽ hiệu ứng vật phẩm bay thẳng vào Túi Chiến Lợi Phẩm trên góc màn hình sau khi bấm nhặt
export function drawFlyingLootDropToBag(
  ctx: CanvasRenderingContext2D,
  drop: {
    kind: string;
    label: string;
    colorHex: string;
    customIcon?: string;
  },
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
  progress: number
) {
  const t = Math.max(0, Math.min(1, progress));
  // Quỹ đạo cong nhẹ hướng lên khi bay thẳng vào túi chiến lợi phẩm
  const ease = 1 - Math.pow(1 - t, 2.2);
  const arcLift = Math.sin(t * Math.PI) * 44;
  const curX = fromX + (toX - fromX) * ease;
  const curY = fromY + (toY - fromY) * ease - arcLift;
  const scale =
    t < 0.8 ? 1.15 - t * 0.2 : Math.max(0.45, 1 - (t - 0.8) * 2.5);

  ctx.save();

  // Vệt sao băng kéo theo phía sau vật phẩm đang bay về túi
  const tailT = Math.max(0, t - 0.14);
  const tailEase = 1 - Math.pow(1 - tailT, 2.2);
  const tailX = fromX + (toX - fromX) * tailEase;
  const tailY =
    fromY + (toY - fromY) * tailEase - Math.sin(tailT * Math.PI) * 44;

  ctx.strokeStyle = drop.colorHex;
  ctx.globalAlpha = 0.65 * (1 - t * 0.5);
  ctx.lineWidth = 3 * scale;
  ctx.beginPath();
  ctx.moveTo(tailX, tailY);
  ctx.lineTo(curX, curY);
  ctx.stroke();

  // Hạt lấp lánh quanh vật phẩm đang bay
  ctx.fillStyle = drop.colorHex;
  ctx.fillRect(curX - 10, curY - 4, 3, 3);
  ctx.fillRect(curX + 8, curY + 3, 3, 3);
  ctx.globalAlpha = 1;

  // Icon mini vật phẩm đang bay
  drawLootMiniPixelIcon(
    ctx,
    drop.kind,
    drop.colorHex,
    Math.round(curX),
    Math.round(curY),
    scale,
    true,
    drop.customIcon
  );

  // Tên vật phẩm bay kèm theo (Viền đồng bộ màu phẩm chất)
  if (t < 0.88) {
    ctx.globalAlpha = Math.max(0, 1 - t * 0.85);
    ctx.font = 'bold 9px "Plus Jakarta Sans", sans-serif';
    ctx.textAlign = 'center';
    const textW = Math.ceil(ctx.measureText(drop.label).width) + 8;
    ctx.fillStyle = 'rgba(28, 16, 8, 0.92)';
    ctx.fillRect(curX - textW / 2, curY - 24, textW, 12);
    ctx.strokeStyle = drop.colorHex;
    ctx.lineWidth = 1.2;
    ctx.strokeRect(curX - textW / 2, curY - 24, textW, 12);
    ctx.fillStyle = drop.colorHex;
    ctx.fillText(drop.label, curX, curY - 15);
  }

  ctx.restore();
}

/**
 * Vẽ Kỵ Binh Cầm Cờ Chiến Đấu (Armored Warhorse + Knight Holding Waving War Banner)
 * theo phong cách Pixel-Art chi tiết cao (giống đồ họa trang bị) với animation ngựa phi nước đại 4 khung hình.
 */
export function drawWorldMapMarchingCavalry8Bit(
  ctx: CanvasRenderingContext2D,
  centerX: number,
  centerY: number,
  timeMs: number,
  facing: 'LEFT' | 'RIGHT' = 'RIGHT',
  isMoving: boolean = true,
  isOwnedByPlayer: boolean = true
) {
  const p = 1.65; // Kích thước mỗi hạt pixel
  const gallopFrame = isMoving ? Math.floor(timeMs / 95) % 4 : 0;
  const flagWave = Math.floor(timeMs / 110) % 4;
  // Độ nhún thân ngựa và kỵ sĩ khi phi nước đại
  const bodyBobY = isMoving
    ? gallopFrame === 0
      ? -1
      : gallopFrame === 1
        ? -2
        : gallopFrame === 2
          ? 0
          : 1
    : Math.floor(timeMs / 420) % 2 === 0
      ? 0
      : -1;

  ctx.save();
  ctx.translate(Math.round(centerX), Math.round(centerY));

  // Bóng đổ răng cưa pixel dưới chân chiến mã (không bung to)
  drawSteppedPixelShadow(
    ctx,
    0,
    Math.round(11 * p),
    Math.round(11 * p),
    Math.round(3.8 * p),
    0.42
  );

  if (facing === 'LEFT') {
    ctx.scale(-1, 1);
  }

  const px = (gx: number, gy: number, w: number, h: number, color: string) => {
    ctx.fillStyle = color;
    ctx.fillRect(
      Math.round(gx * p),
      Math.round((gy + bodyBobY) * p),
      Math.max(1, Math.ceil(w * p)),
      Math.max(1, Math.ceil(h * p))
    );
  };

  const pxStatic = (
    gx: number,
    gy: number,
    w: number,
    h: number,
    color: string
  ) => {
    ctx.fillStyle = color;
    ctx.fillRect(
      Math.round(gx * p),
      Math.round(gy * p),
      Math.max(1, Math.ceil(w * p)),
      Math.max(1, Math.ceil(h * p))
    );
  };

  // Bụi đất tung lên phía sau vó ngựa khi đang chạy
  if (isMoving) {
    const dustShift = gallopFrame * 1.5;
    pxStatic(-11 - dustShift, 8, 2, 2, 'rgba(214, 199, 178, 0.72)');
    pxStatic(-14 - dustShift, 6, 2, 2, 'rgba(168, 153, 132, 0.55)');
    if (gallopFrame % 2 === 0) {
      pxStatic(-9 - dustShift, 9, 3, 1, 'rgba(245, 235, 214, 0.65)');
    }
  }

  // Bảng màu cờ hiệu & áo choàng (Đỏ Hoàng Kim cho quân của người chơi / Tím Hoàng Gia cho đồng minh/người khác)
  const bannerDark = isOwnedByPlayer ? '#450a0a' : '#2e1065';
  const bannerBase = isOwnedByPlayer ? '#991b1b' : '#581c87';
  const bannerMid = isOwnedByPlayer ? '#dc2626' : '#7e22ce';
  const bannerBright = isOwnedByPlayer ? '#ef4444' : '#a855f7';
  const bannerGold = '#fde047';
  const bannerGoldShadow = '#d97706';

  // ==========================================================================
  // 1. ĐUÔI NGỰA TUNG BAY & CHÂN SAU PHÍA XA
  // ==========================================================================
  const tailLift = isMoving ? (gallopFrame % 2 === 0 ? -1 : 0) : 0;
  // Đuôi chiến mã nhiều lớp màu nâu sẫm -> hổ phách
  px(-12, -1 + tailLift, 4, 2, '#1c0d06');
  px(-14, 0 + tailLift, 4, 3, '#1c0d06');
  px(-11, -1 + tailLift, 3, 1, '#451a03');
  px(-13, 0 + tailLift, 3, 2, '#78350f');
  px(-12, 1 + tailLift, 2, 1, '#9a3412');

  // 4 khung hình chân ngựa phi nước đại (chân sau xa, chân trước xa, chân sau gần, chân trước gần)
  if (gallopFrame === 0) {
    // Khung 0: Vươn rộng về trước và sau
    pxStatic(-8, 4, 2, 4, '#451a03');
    pxStatic(-10, 7, 2, 3, '#1c0d06');
    pxStatic(5, 4, 2, 4, '#451a03');
    pxStatic(7, 7, 2, 3, '#1c0d06');
  } else if (gallopFrame === 1) {
    // Khung 1: Co vó giữa không trung
    pxStatic(-6, 5, 2, 3, '#451a03');
    pxStatic(-5, 7, 2, 2, '#1c0d06');
    pxStatic(4, 5, 2, 3, '#451a03');
    pxStatic(3, 7, 2, 2, '#1c0d06');
  } else if (gallopFrame === 2) {
    // Khung 2: Đạp mạnh xuống đất
    pxStatic(-5, 4, 2, 5, '#451a03');
    pxStatic(-5, 9, 2, 2, '#1c0d06');
    pxStatic(3, 4, 2, 5, '#451a03');
    pxStatic(4, 9, 2, 2, '#1c0d06');
  } else {
    // Khung 3: Thu chân chuẩn bị bật nhảy
    pxStatic(-7, 4, 2, 4, '#451a03');
    pxStatic(-8, 8, 2, 2, '#1c0d06');
    pxStatic(5, 4, 2, 4, '#451a03');
    pxStatic(6, 8, 2, 2, '#1c0d06');
  }

  // ==========================================================================
  // 2. THÂN CHIẾN MÃ BỌC GIÁP (ARMORED WARHORSE)
  // ==========================================================================
  // Viền đen quanh thân ngựa
  px(-8, -2, 15, 7, '#0f0906');
  // Cơ bắp thân ngựa (3 sắc độ nâu đỏ hạt dẻ như chất liệu da trang bị)
  px(-7, -1, 13, 5, '#78350f');
  px(-6, -1, 11, 4, '#9a3412');
  px(-5, 0, 8, 2, '#c2410c');

  // Tấm vải phủ yên & Giáp hông chiến mã (Royal Caparison & Barding)
  px(-6, -1, 8, 4, bannerDark);
  px(-5, -1, 6, 3, bannerBase);
  px(-6, 2, 8, 1, bannerGoldShadow);
  px(-5, 2, 6, 1, bannerGold);

  // Giáp ngực chiến mã (Steel & Gold Chestplate)
  px(3, -1, 4, 5, '#1e293b');
  px(4, 0, 3, 3, '#64748b');
  px(5, 0, 2, 2, '#cbd5e1');
  px(6, 1, 1, 2, '#fde047');

  // Cổ và Đầu Chiến Mã Bọc Thiết Giáp (Armored Horse Head & Chamfron)
  px(4, -6, 5, 6, '#0f0906');
  px(5, -5, 4, 5, '#78350f');
  px(6, -4, 2, 3, '#9a3412');
  // Bờm ngựa vàng/nâu
  px(3, -6, 2, 4, '#451a03');
  px(4, -5, 1, 3, '#d97706');
  // Đầu ngựa + Mặt nạ thép viền vàng (Chamfron)
  px(6, -8, 6, 5, '#0f0906');
  px(7, -7, 4, 3, '#9a3412');
  px(8, -7, 3, 2, '#94a3b8');
  px(9, -7, 2, 1, '#f8fafc');
  px(10, -6, 2, 1, '#fde047'); // Sừng/viền vàng mặt nạ ngựa
  px(8, -6, 1, 1, '#ef4444'); // Mắt chiến mã rực sáng
  // Tai ngựa
  px(6, -9, 2, 2, '#451a03');
  // Dây cương vàng
  px(3, -4, 6, 1, '#fbbf24');

  // Đôi chân phía gần (Gồm khớp đùi, ống chân và móng sắt sáng)
  if (gallopFrame === 0) {
    // Chân sau gần duỗi dài ra sau
    pxStatic(-7, 3, 3, 3, '#78350f');
    pxStatic(-9, 6, 2, 3, '#9a3412');
    pxStatic(-10, 9, 2, 2, '#cbd5e1');
    // Chân trước gần vươn cao về trước
    pxStatic(4, 3, 3, 3, '#78350f');
    pxStatic(7, 5, 2, 3, '#9a3412');
    pxStatic(9, 7, 2, 2, '#cbd5e1');
  } else if (gallopFrame === 1) {
    // Hai chân thu vào dưới bụng
    pxStatic(-5, 3, 3, 3, '#78350f');
    pxStatic(-4, 6, 2, 3, '#9a3412');
    pxStatic(-3, 8, 2, 2, '#cbd5e1');
    pxStatic(3, 3, 3, 3, '#78350f');
    pxStatic(2, 6, 2, 3, '#9a3412');
    pxStatic(1, 8, 2, 2, '#cbd5e1');
  } else if (gallopFrame === 2) {
    // Chân thẳng đứng đạp đất
    pxStatic(-6, 3, 3, 4, '#78350f');
    pxStatic(-6, 7, 2, 3, '#9a3412');
    pxStatic(-6, 9, 2, 2, '#cbd5e1');
    pxStatic(4, 3, 3, 4, '#78350f');
    pxStatic(5, 7, 2, 3, '#9a3412');
    pxStatic(5, 9, 2, 2, '#cbd5e1');
  } else {
    // Bước chuyển nhịp
    pxStatic(-6, 3, 3, 3, '#78350f');
    pxStatic(-7, 6, 2, 3, '#9a3412');
    pxStatic(-8, 9, 2, 2, '#cbd5e1');
    pxStatic(4, 3, 3, 3, '#78350f');
    pxStatic(6, 6, 2, 3, '#9a3412');
    pxStatic(7, 8, 2, 2, '#cbd5e1');
  }

  // ==========================================================================
  // 3. KỴ BINH GIÁP BẠC HOÀNG KIM (ARMORED KNIGHT RIDER)
  // ==========================================================================
  // Áo choàng kỵ sĩ tung bay phía sau lưng
  const capeWave = flagWave % 2 === 0 ? 0 : -1;
  px(-9, -8 + capeWave, 5, 5, bannerDark);
  px(-8, -7 + capeWave, 4, 3, bannerMid);
  px(-7, -7 + capeWave, 2, 2, bannerBright);

  // Chân kỵ sĩ đặt trên bàn đạp yên ngựa
  px(-2, -1, 3, 4, '#1e293b');
  px(-1, 0, 2, 3, '#64748b');
  px(0, 2, 2, 1, '#fde047'); // Bàn đạp vàng

  // Thân giáp ngực & Cầu vai Kỵ Sĩ (Steel Cuirass & Gold Pauldrons)
  px(-4, -9, 7, 7, '#0f172a');
  px(-3, -8, 5, 5, '#475569');
  px(-2, -8, 4, 4, '#94a3b8');
  px(-1, -7, 2, 2, '#f8fafc'); // Điểm sáng kim loại trên giáp ngực
  // Đai lưng & Cầu vai viền vàng
  px(-3, -4, 5, 1, '#fbbf24');
  px(-4, -8, 3, 2, '#d97706');
  px(-3, -8, 2, 1, '#fde047');

  // Mũ trụ Hiệp Sĩ có chùm lông đỏ/tím (Knight Great Helm & Plume)
  px(-3, -14, 6, 6, '#0f172a');
  px(-2, -13, 4, 4, '#64748b');
  px(-1, -13, 3, 3, '#cbd5e1');
  px(0, -12, 2, 1, '#ffffff');
  // Khe mắt mũ trụ & viền chữ T vàng
  px(0, -11, 2, 1, '#0f172a');
  px(-1, -11, 1, 2, '#fbbf24');
  // Chùm lông chiến mã trên đỉnh mũ
  px(-5, -15, 4, 2, bannerDark);
  px(-4, -15, 3, 1, bannerBright);
  px(-2, -15, 2, 1, '#fde047');

  // ==========================================================================
  // 4. TRƯỜNG KỲ CHIẾN ĐẤU TUNG BAY (WAVING WAR BANNER & FLAGPOLE)
  // ==========================================================================
  // Cán cờ dài cầm chắc bên tay phải kỵ sĩ
  px(1, -21, 2, 19, '#271206');
  px(1, -20, 1, 17, '#b45309');
  px(2, -18, 1, 14, '#fde047');
  // Mũi giáo vàng trên đỉnh cột cờ
  px(0, -23, 4, 2, '#92400e');
  px(1, -24, 2, 3, '#fde047');
  px(1, -25, 1, 1, '#ffffff');

  // Lá cờ chiến đấu lớn tung bay ngược chiều gió theo 4 pha sóng lượn
  const w1 = flagWave === 0 || flagWave === 1 ? 0 : 1;
  const w2 = flagWave === 1 || flagWave === 2 ? -1 : 0;
  const w3 = flagWave === 2 || flagWave === 3 ? 1 : -1;

  // Khúc cờ 1 (gắn sát cán cờ)
  px(-4, -21, 5, 7, bannerDark);
  px(-3, -20, 4, 5, bannerMid);
  px(-3, -20, 4, 1, bannerGold);
  px(-3, -16, 4, 1, bannerGoldShadow);

  // Khúc cờ 2 (giữa lá cờ - thêu huy hiệu Kiếm/Vương Miện Hoàng Kim)
  px(-9, -21 + w1, 5, 7, bannerDark);
  px(-8, -20 + w1, 4, 5, bannerBase);
  px(-8, -19 + w1, 4, 3, bannerBright);
  px(-8, -20 + w1, 4, 1, bannerGold);
  px(-8, -16 + w1, 4, 1, bannerGoldShadow);
  // Huy hiệu Hoàng Kim giữa lá cờ
  px(-7, -19 + w1, 2, 3, '#fde047');
  px(-8, -18 + w1, 4, 1, '#fef08a');

  // Khúc cờ 3 (đuôi cờ xẻ đôi tung bay)
  px(-14, -20 + w2, 5, 6, bannerDark);
  px(-13, -19 + w2, 4, 2, bannerMid);
  px(-13, -16 + w2, 4, 2, bannerMid);
  px(-16, -20 + w3, 3, 2, bannerBright);
  px(-16, -16 + w3, 3, 2, bannerBright);
  px(-13, -20 + w2, 3, 1, bannerGold);

  // Bàn tay thép kỵ sĩ nắm chặt cán cờ
  px(0, -7, 3, 2, '#94a3b8');
  px(1, -7, 2, 1, '#e2e8f0');

  ctx.restore();
}
