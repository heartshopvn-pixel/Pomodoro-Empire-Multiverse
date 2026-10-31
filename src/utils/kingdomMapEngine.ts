import {
  PlacedBuilding,
  ResourceNode,
} from '../types/game';
import {
  drawTileBackground,
  TILE_SIZE,
} from './pixelSprites';
import { isModelEnabledForStageKey } from './adminShowroomConfig';

// ============================================================================
// HỆ THỐNG BẢN ĐỒ VƯƠNG QUỐC MỞ RỘNG THEO CHUNK 16×16
// Kết hợp 3 kỹ thuật tối ưu hóa 60 FPS:
//   1. Procedural Seed (Sinh địa hình & tài nguyên tất định từ mapSeed theo tọa độ gốc A)
//   2. 16×16 Chunk Offscreen Cache (Lưu đệm từng cụm 16×16 ô = 1024×1024px kèm Frustum Culling)
//   3. Spatial Hash Grid (Truy vấn không gian O(1) cho va chạm, xây dựng và tầm đánh AI)
// ============================================================================

export const KINGDOM_CHUNK_SIZE = 16; // 1 Chunk = 16×16 ô (1024×1024 px)
export const INITIAL_KINGDOM_CHUNKS_X = 1; // Khởi tạo Vương Quốc = 1 Chunk 16×16
export const INITIAL_KINGDOM_CHUNKS_Y = 1;

export type KingdomExpandDirection = 'BC' | 'CD';

// Tạo danh sách các chunk 16x16 đã mở khóa mặc định (ví dụ ['0,0'] khi khởi tạo 1x1)
export function getDefaultUnlockedChunks(
  chunksX = INITIAL_KINGDOM_CHUNKS_X,
  chunksY = INITIAL_KINGDOM_CHUNKS_Y
): string[] {
  const list: string[] = [];
  const nx = Math.max(1, chunksX);
  const ny = Math.max(1, chunksY);
  for (let cy = 0; cy < ny; cy++) {
    for (let cx = 0; cx < nx; cx++) {
      list.push(`${cx},${cy}`);
    }
  }
  return list;
}

// Kiểm tra ô (gx, gy) có nằm trong Chunk 16x16 đã mở khóa hay không (neo theo Điểm Gốc A tại góc dưới bên trái)
export function isTileInUnlockedChunk(
  gx: number,
  gy: number,
  gridRows: number,
  unlockedChunks?: Iterable<string> | Set<string>
): boolean {
  if (!unlockedChunks) return true;
  const set =
    unlockedChunks instanceof Set ? unlockedChunks : new Set(unlockedChunks);
  if (set.size === 0) return true;
  const cx = Math.floor(gx / KINGDOM_CHUNK_SIZE);
  const ay = gridRows - 1 - gy;
  const cy = Math.floor(ay / KINGDOM_CHUNK_SIZE);
  return set.has(`${cx},${cy}`);
}

// Chọn đúng 1 Chunk 16x16 duy nhất tiếp theo để mở khóa theo hướng người chơi bấm (BC hoặc CD)
// Đảm bảo mỗi lần mở rộng chỉ cộng thêm ĐÚNG +1 Chunk 16x16 (tuyệt đối không nhân cấp số nhân theo hàng/cột)
export function pickNextChunkToUnlock(
  unlockedChunks: Iterable<string>,
  direction: KingdomExpandDirection
): {
  targetCx: number;
  targetCy: number;
  currChunksX: number;
  currChunksY: number;
  nextChunksX: number;
  nextChunksY: number;
  expandedRowBC: boolean;
  expandedColCD: boolean;
  nextUnlockedChunks: string[];
} {
  const unlockedSet = new Set(unlockedChunks);
  if (unlockedSet.size === 0) {
    unlockedSet.add('0,0');
  }

  let maxCx = 0;
  let maxCy = 0;
  unlockedSet.forEach((key) => {
    const [cxStr, cyStr] = key.split(',');
    const cx = Number(cxStr) || 0;
    const cy = Number(cyStr) || 0;
    if (cx > maxCx) maxCx = cx;
    if (cy > maxCy) maxCy = cy;
  });

  const currChunksX = maxCx + 1;
  const currChunksY = maxCy + 1;

  if (direction === 'BC') {
    // 1. Ưu tiên lấp đầy 1 chunk 16x16 còn khóa nằm về phía B-C trong khung bao hiện tại (kề với chunk đã mở)
    for (let cy = 1; cy < currChunksY; cy++) {
      for (let cx = 0; cx < currChunksX; cx++) {
        const key = `${cx},${cy}`;
        if (
          !unlockedSet.has(key) &&
          (unlockedSet.has(`${cx},${cy - 1}`) ||
            unlockedSet.has(`${cx - 1},${cy}`))
        ) {
          unlockedSet.add(key);
          return {
            targetCx: cx,
            targetCy: cy,
            currChunksX,
            currChunksY,
            nextChunksX: currChunksX,
            nextChunksY: currChunksY,
            expandedRowBC: false,
            expandedColCD: false,
            nextUnlockedChunks: Array.from(unlockedSet),
          };
        }
      }
    }
    // 2. Nếu chưa có ô trống phía B-C trong khung hiện tại, mở đúng 1 chunk mới (0, currChunksY) về hướng B-C
    const targetCx = 0;
    const targetCy = currChunksY;
    unlockedSet.add(`${targetCx},${targetCy}`);
    return {
      targetCx,
      targetCy,
      currChunksX,
      currChunksY,
      nextChunksX: currChunksX,
      nextChunksY: currChunksY + 1,
      expandedRowBC: true,
      expandedColCD: false,
      nextUnlockedChunks: Array.from(unlockedSet),
    };
  } else {
    // Hướng C-D:
    // 1. Ưu tiên lấp đầy 1 chunk 16x16 còn khóa nằm về phía C-D trong khung bao hiện tại (kề với chunk đã mở)
    for (let cx = 1; cx < currChunksX; cx++) {
      for (let cy = 0; cy < currChunksY; cy++) {
        const key = `${cx},${cy}`;
        if (
          !unlockedSet.has(key) &&
          (unlockedSet.has(`${cx - 1},${cy}`) ||
            unlockedSet.has(`${cx},${cy - 1}`))
        ) {
          unlockedSet.add(key);
          return {
            targetCx: cx,
            targetCy: cy,
            currChunksX,
            currChunksY,
            nextChunksX: currChunksX,
            nextChunksY: currChunksY,
            expandedRowBC: false,
            expandedColCD: false,
            nextUnlockedChunks: Array.from(unlockedSet),
          };
        }
      }
    }
    // 2. Nếu chưa có ô trống phía C-D trong khung hiện tại, mở đúng 1 chunk mới (currChunksX, 0) về hướng C-D
    const targetCx = currChunksX;
    const targetCy = 0;
    unlockedSet.add(`${targetCx},${targetCy}`);
    return {
      targetCx,
      targetCy,
      currChunksX,
      currChunksY,
      nextChunksX: currChunksX + 1,
      nextChunksY: currChunksY,
      expandedRowBC: false,
      expandedColCD: true,
      nextUnlockedChunks: Array.from(unlockedSet),
    };
  }
}

/**
 * Mở khóa chính xác 1 Chunk 16×16 tại tọa độ (targetCx, targetCy) khi người chơi bấm vào nút mở rộng của riêng chunk đó.
 */
export function unlockSpecificKingdomChunk(
  unlockedChunks: Iterable<string>,
  targetCx: number,
  targetCy: number
): {
  targetCx: number;
  targetCy: number;
  currChunksX: number;
  currChunksY: number;
  nextChunksX: number;
  nextChunksY: number;
  shiftRowsByTiles: number;
  nextUnlockedChunks: string[];
} {
  const unlockedSet = new Set(unlockedChunks);
  if (unlockedSet.size === 0) {
    unlockedSet.add('0,0');
  }

  let maxCx = 0;
  let maxCy = 0;
  unlockedSet.forEach((key) => {
    const [cxStr, cyStr] = key.split(',');
    const cx = Number(cxStr) || 0;
    const cy = Number(cyStr) || 0;
    if (cx > maxCx) maxCx = cx;
    if (cy > maxCy) maxCy = cy;
  });

  const currChunksX = maxCx + 1;
  const currChunksY = maxCy + 1;

  unlockedSet.add(`${targetCx},${targetCy}`);
  const nextChunksX = Math.max(currChunksX, targetCx + 1);
  const nextChunksY = Math.max(currChunksY, targetCy + 1);
  const shiftRowsByTiles = Math.max(0, nextChunksY - currChunksY) * KINGDOM_CHUNK_SIZE;

  return {
    targetCx,
    targetCy,
    currChunksX,
    currChunksY,
    nextChunksX,
    nextChunksY,
    shiftRowsByTiles,
    nextUnlockedChunks: Array.from(unlockedSet),
  };
}

/**
 * Tính chi phí Thẻ Lệnh Mở Rộng Đất Vương Quốc cho lần mở rộng tiếp theo.
 * Quy tắc: Tính theo tổng số Chunk 16×16 đã mở (Lần 1 khi có 1 chunk: tốn 1 thẻ; Lần 2 khi có 2 chunk: tốn 2 thẻ; Lần 3: 3 thẻ...).
 */
export function getKingdomExpansionCost(
  unlockedChunksOrCount: number | Iterable<string>,
  fallbackChunksY?: number
): number {
  if (typeof unlockedChunksOrCount !== 'number') {
    const count = new Set(unlockedChunksOrCount).size;
    return Math.max(1, count);
  }
  if (fallbackChunksY !== undefined) {
    return Math.max(1, unlockedChunksOrCount + fallbackChunksY - 1);
  }
  return Math.max(1, unlockedChunksOrCount);
}

/**
 * Hàm băm 32-bit tất định (Deterministic Hash) từ (seed, x, y).
 * Đảm bảo cùng 1 mapSeed và tọa độ (tileFromAX, tileFromAY) luôn sinh ra đúng 1 kết quả.
 */
export function hashCoord32(seed: number, x: number, y: number): number {
  let h = (seed | 0) ^ Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return (h ^ (h >>> 16)) >>> 0;
}

export function hashFloat01(seed: number, x: number, y: number, salt = 0): number {
  return (hashCoord32(seed + salt * 7919, x, y) % 100000) / 100000;
}

/**
 * Tạo mapSeed tất định từ chuỗi ID Vương Quốc nếu bản lưu cũ chưa có mapSeed.
 */
export function deriveSeedFromKingdomId(kingdomId: string): number {
  let h = 2166136261;
  for (let i = 0; i < kingdomId.length; i++) {
    h ^= kingdomId.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) || 133742;
}

/**
 * Sinh địa hình tất định (Procedural Seed) cho toàn bộ các Chunk 16×16 đã mở khóa
 * lấy Điểm A (góc dưới bên trái: gx = 0, gy = gridRows - 1) làm Điểm Gốc (0, 0).
 */
export function generateProceduralKingdomTerrain(
  mapSeed: number,
  chunksX: number,
  chunksY: number,
  existingBuildings: PlacedBuilding[] = [],
  unlockedChunks?: Iterable<string>
): {
  waterTiles: Set<string>;
  roadTiles: Set<string>;
  grassSeedSalt: number;
  gridCols: number;
  gridRows: number;
} {
  const stageKey = 'map_kingdom_default';
  const safeChunksX = Math.max(1, chunksX);
  const safeChunksY = Math.max(1, chunksY);
  const gridCols = safeChunksX * KINGDOM_CHUNK_SIZE;
  const gridRows = safeChunksY * KINGDOM_CHUNK_SIZE;
  const unlockedSet = unlockedChunks
    ? new Set(unlockedChunks)
    : new Set(getDefaultUnlockedChunks(safeChunksX, safeChunksY));

  const buildingTileSet = new Set<string>();
  existingBuildings.forEach((b) => {
    buildingTileSet.add(`${b.gridX},${b.gridY}`);
  });

  // Vị trí Nhà Kho mặc định trong Chunk gốc (0, 0) tính từ điểm A
  const wh = existingBuildings.find((b) => b.type === 'WAREHOUSE');
  const whGx = wh ? wh.gridX : 7;
  const whGy = wh ? wh.gridY : gridRows - 9;
  buildingTileSet.add(`${whGx},${whGy}`);

  const isNearBuildingOrWarehouse = (gx: number, gy: number, radius: number) => {
    if (Math.abs(gx - whGx) <= radius && Math.abs(gy - whGy) <= radius) {
      return true;
    }
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (buildingTileSet.has(`${gx + dx},${gy + dy}`)) return true;
      }
    }
    return false;
  };

  const waterTiles = new Set<string>();
  const roadTiles = new Set<string>();

  const allowWater = isModelEnabledForStageKey('TEX_RIVER_WATER', stageKey);
  const allowRoad = isModelEnabledForStageKey('TEX_ROYAL_ROAD', stageKey);

  // Duyệt qua từng Chunk 16×16 tính từ Điểm Gốc A (chỉ sinh địa hình cho các chunk đã mở khóa)
  for (let cy = 0; cy < safeChunksY; cy++) {
    for (let cx = 0; cx < safeChunksX; cx++) {
      if (!unlockedSet.has(`${cx},${cy}`)) continue;
      const chunkHash = hashCoord32(mapSeed, cx, cy);

      // 1. Sinh cụm hồ nước nhỏ tự nhiên trong mỗi Chunk 16×16 (né vùng trung tâm Chunk gốc)
      if (allowWater) {
        const pondW = 2 + (chunkHash % 3); // 2..4 ô
        const pondH = 2 + ((chunkHash >>> 4) % 2); // 2..3 ô
        // Đặt hồ nước ở góc rìa của chunk để dành không gian xây dựng rộng rãi
        const localStartX =
          cx === 0 && cy === 0
            ? 12 // Ở chunk khởi đầu 16×16, đặt hồ nhỏ ở góc xa (12..14) để không vướng Nhà Kho (7,7)
            : 2 + ((chunkHash >>> 8) % Math.max(1, 13 - pondW));
        const localStartY =
          cx === 0 && cy === 0
            ? 2
            : 2 + ((chunkHash >>> 12) % Math.max(1, 13 - pondH));

        for (let ly = localStartY; ly < localStartY + pondH; ly++) {
          for (let lx = localStartX; lx < localStartX + pondW; lx++) {
            const ax = cx * KINGDOM_CHUNK_SIZE + lx;
            const ay = cy * KINGDOM_CHUNK_SIZE + ly;
            const gx = ax;
            const gy = gridRows - 1 - ay;
            if (gx < 0 || gx >= gridCols || gy < 0 || gy >= gridRows) continue;
            if (isNearBuildingOrWarehouse(gx, gy, 2)) continue;
            // Bo góc tự nhiên
            const isCorner =
              (lx === localStartX || lx === localStartX + pondW - 1) &&
              (ly === localStartY || ly === localStartY + pondH - 1);
            if (isCorner && ((chunkHash + lx + ly) & 1) === 0) continue;
            waterTiles.add(`${gx},${gy}`);
          }
        }
      }

      // 2. Sinh trục đường đá cuội Hoàng Gia xuyên qua các Chunk 16×16 đã mở khóa
      if (allowRoad) {
        const roadLocalY = 7;
        const roadLocalX = 8;

        for (let lx = 2; lx <= 13; lx++) {
          const ax = cx * KINGDOM_CHUNK_SIZE + lx;
          const ay = cy * KINGDOM_CHUNK_SIZE + roadLocalY;
          const gx = ax;
          const gy = gridRows - 1 - ay;
          const key = `${gx},${gy}`;
          if (!waterTiles.has(key) && !buildingTileSet.has(key)) {
            roadTiles.add(key);
          }
        }

        for (let ly = 2; ly <= 13; ly++) {
          const ax = cx * KINGDOM_CHUNK_SIZE + roadLocalX;
          const ay = cy * KINGDOM_CHUNK_SIZE + ly;
          const gx = ax;
          const gy = gridRows - 1 - ay;
          const key = `${gx},${gy}`;
          if (!waterTiles.has(key) && !buildingTileSet.has(key)) {
            roadTiles.add(key);
          }
        }

        // Nếu có các chunk lân cận đã mở khóa, nối thông đường đá giữa các chunk
        if (cx > 0 && unlockedSet.has(`${cx - 1},${cy}`)) {
          for (let lx = 0; lx < 2; lx++) {
            const gx = cx * KINGDOM_CHUNK_SIZE + lx;
            const gy = gridRows - 1 - (cy * KINGDOM_CHUNK_SIZE + roadLocalY);
            const prevGx = cx * KINGDOM_CHUNK_SIZE - 1 - lx;
            if (!waterTiles.has(`${gx},${gy}`) && !buildingTileSet.has(`${gx},${gy}`)) {
              roadTiles.add(`${gx},${gy}`);
            }
            if (
              prevGx >= 0 &&
              !waterTiles.has(`${prevGx},${gy}`) &&
              !buildingTileSet.has(`${prevGx},${gy}`)
            ) {
              roadTiles.add(`${prevGx},${gy}`);
            }
          }
        }
        if (cy > 0 && unlockedSet.has(`${cx},${cy - 1}`)) {
          for (let ly = 0; ly < 2; ly++) {
            const gx = cx * KINGDOM_CHUNK_SIZE + roadLocalX;
            const ay = cy * KINGDOM_CHUNK_SIZE + ly;
            const prevAy = cy * KINGDOM_CHUNK_SIZE - 1 - ly;
            const gy = gridRows - 1 - ay;
            const prevGy = gridRows - 1 - prevAy;
            if (!waterTiles.has(`${gx},${gy}`) && !buildingTileSet.has(`${gx},${gy}`)) {
              roadTiles.add(`${gx},${gy}`);
            }
            if (
              prevGy < gridRows &&
              !waterTiles.has(`${gx},${prevGy}`) &&
              !buildingTileSet.has(`${gx},${prevGy}`)
            ) {
              roadTiles.add(`${gx},${prevGy}`);
            }
          }
        }
      }
    }
  }

  const grassSeedSalt = mapSeed % 8;
  return {
    waterTiles,
    roadTiles,
    grassSeedSalt,
    gridCols,
    gridRows,
  };
}

/**
 * Sinh các Mỏ Tài Nguyên (Gỗ, Đá, Vàng) tất định theo Procedural Seed cho 1 Chunk 16×16 cụ thể (cx, cy).
 * Dùng khi khởi tạo Chunk (0,0) ban đầu hoặc khi mở rộng thêm từng Chunk 16×16 mới theo hướng B-C / C-D.
 */
export function generateProceduralResourcesForChunk(
  mapSeed: number,
  cx: number,
  cy: number,
  gridRows: number,
  waterTiles: Set<string>,
  roadTiles: Set<string>,
  existingBuildings: PlacedBuilding[],
  existingNodes: ResourceNode[]
): ResourceNode[] {
  const stageKey = 'map_kingdom_default';
  const occupied = new Set<string>([...waterTiles, ...roadTiles]);

  existingBuildings.forEach((b) => {
    occupied.add(`${b.gridX},${b.gridY}`);
  });
  existingNodes.forEach((n) => {
    occupied.add(`${n.gridX},${n.gridY}`);
  });

  const wh = existingBuildings.find((b) => b.type === 'WAREHOUSE');
  const whGx = wh ? wh.gridX : 7;
  const whGy = wh ? wh.gridY : gridRows - 9;

  const spawns: Array<{
    type: 'TREE' | 'STONE_DEPOSIT' | 'GOLD_VEIN';
    modelId: 'NODE_TREE' | 'NODE_STONE_DEPOSIT' | 'NODE_GOLD_VEIN';
    count: number;
    amount: number;
  }> = [
    { type: 'TREE', modelId: 'NODE_TREE', count: 5, amount: 100 },
    { type: 'STONE_DEPOSIT', modelId: 'NODE_STONE_DEPOSIT', count: 2, amount: 120 },
    { type: 'GOLD_VEIN', modelId: 'NODE_GOLD_VEIN', count: 2, amount: 150 },
  ];

  const createdNodes: ResourceNode[] = [];
  let salt = 1;

  spawns.forEach((sp) => {
    if (!isModelEnabledForStageKey(sp.modelId, stageKey)) return;
    for (let i = 0; i < sp.count; i++) {
      for (let attempt = 0; attempt < 64; attempt++) {
        const h = hashCoord32(mapSeed + salt * 104729 + attempt * 97, cx * 31 + i, cy * 37 + attempt);
        salt++;
        const lx = 1 + (h % (KINGDOM_CHUNK_SIZE - 2)); // 1..14
        const ly = 1 + ((h >>> 8) % (KINGDOM_CHUNK_SIZE - 2)); // 1..14
        const ax = cx * KINGDOM_CHUNK_SIZE + lx;
        const ay = cy * KINGDOM_CHUNK_SIZE + ly;
        const gx = ax;
        const gy = gridRows - 1 - ay;
        const key = `${gx},${gy}`;
        if (occupied.has(key)) continue;
        if (Math.abs(gx - whGx) <= 2 && Math.abs(gy - whGy) <= 2) continue;

        occupied.add(key);
        createdNodes.push({
          id: `node-c${cx}_${cy}-${sp.type}-${i}-${ax}_${ay}`,
          type: sp.type,
          gridX: gx,
          gridY: gy,
          amount: sp.amount,
        });
        break;
      }
    }
  });

  return createdNodes;
}

// ============================================================================
// 2. 16×16 CHUNK OFFSCREEN CACHE & CAMERA FRUSTUM CULLING
// ============================================================================
const chunkCanvasCache = new Map<string, HTMLCanvasElement>();
const MAX_CACHED_CHUNKS = 128;

export function clearKingdomChunkCache(): void {
  chunkCanvasCache.clear();
}

/**
 * Vẽ mặt đất Vương Quốc theo từng Chunk 16×16 (1024×1024 px) từ bộ nhớ đệm Offscreen Canvas
 * kết hợp loại bỏ các Chunk nằm ngoài khung nhìn Camera (Viewport Frustum Culling).
 * Chỉ vẽ mặt đất cho các Chunk 16×16 nằm trong `unlockedChunks`; các chunk chưa mở trong khung bao sẽ vẽ vùng biên khóa.
 */
export function drawKingdomChunksCached(
  ctx: CanvasRenderingContext2D,
  mapSeed: number,
  chunksX: number,
  chunksY: number,
  snowLevel: 0 | 1 | 2,
  isPlacing: boolean,
  cam: { x: number; y: number; zoom: number },
  viewportW: number,
  viewportH: number,
  isoToWorld: (ix: number, iy: number) => { x: number; y: number },
  drawTileFn: typeof drawTileBackground = drawTileBackground,
  unlockedChunks?: Iterable<string>
): void {
  const safeChunksX = Math.max(1, chunksX);
  const safeChunksY = Math.max(1, chunksY);
  const gridRows = safeChunksY * KINGDOM_CHUNK_SIZE;
  const chunkPixelSize = KINGDOM_CHUNK_SIZE * TILE_SIZE; // 1024px
  const unlockedSet = unlockedChunks
    ? new Set(unlockedChunks)
    : new Set(getDefaultUnlockedChunks(safeChunksX, safeChunksY));

  // Tính khung bao Thế Giới 2D (wx, wy) từ 4 góc khung nhìn Camera Isometric (cộng biên an toàn 192px)
  const padIso = 192;
  const isoLeft = cam.x - padIso;
  const isoRight = cam.x + viewportW / cam.zoom + padIso;
  const isoTop = cam.y - padIso;
  const isoBottom = cam.y + viewportH / cam.zoom + padIso;

  const c1 = isoToWorld(isoLeft, isoTop);
  const c2 = isoToWorld(isoRight, isoTop);
  const c3 = isoToWorld(isoLeft, isoBottom);
  const c4 = isoToWorld(isoRight, isoBottom);

  const minWorldX = Math.min(c1.x, c2.x, c3.x, c4.x);
  const maxWorldX = Math.max(c1.x, c2.x, c3.x, c4.x);
  const minWorldY = Math.min(c1.y, c2.y, c3.y, c4.y);
  const maxWorldY = Math.max(c1.y, c2.y, c3.y, c4.y);

  for (let cy = 0; cy < safeChunksY; cy++) {
    for (let cx = 0; cx < safeChunksX; cx++) {
      const startGx = cx * KINGDOM_CHUNK_SIZE;
      const startGy = gridRows - (cy + 1) * KINGDOM_CHUNK_SIZE;
      const wx0 = startGx * TILE_SIZE;
      const wy0 = startGy * TILE_SIZE;
      const wx1 = wx0 + chunkPixelSize;
      const wy1 = wy0 + chunkPixelSize;

      // Viewport Frustum Culling: Bỏ qua các Chunk 16×16 nằm hoàn toàn ngoài khung nhìn Camera
      if (
        wx1 < minWorldX ||
        wx0 > maxWorldX ||
        wy1 < minWorldY ||
        wy0 > maxWorldY
      ) {
        continue;
      }

      if (!unlockedSet.has(`${cx},${cy}`)) {
        // Chunk 16×16 chưa mở khóa: để trống ngoài đảo (không vẽ mặt đất)
        continue;
      }

      const cacheKey = `s${mapSeed}_c${safeChunksX}x${safeChunksY}_chunk${cx}_${cy}_sn${snowLevel}_pl${isPlacing ? 1 : 0}`;

      let chunkCanvas = chunkCanvasCache.get(cacheKey);
      if (!chunkCanvas) {
        if (chunkCanvasCache.size >= MAX_CACHED_CHUNKS) {
          const oldestKey = chunkCanvasCache.keys().next().value;
          if (oldestKey) chunkCanvasCache.delete(oldestKey);
        }

        chunkCanvas = document.createElement('canvas');
        chunkCanvas.width = chunkPixelSize;
        chunkCanvas.height = chunkPixelSize;
        const cCtx = chunkCanvas.getContext('2d');
        if (cCtx) {
          cCtx.imageSmoothingEnabled = false;
          cCtx.save();
          cCtx.translate(-wx0, -wy0);

          for (let gy = startGy; gy < startGy + KINGDOM_CHUNK_SIZE; gy++) {
            for (let gx = startGx; gx < startGx + KINGDOM_CHUNK_SIZE; gx++) {
              drawTileFn(cCtx, gx, gy, 0, false, false);
            }
          }

          // Vẽ lưới ô đất kim cương Isometric ngay trong Offscreen Chunk để không tốn 256 lệnh strokeRect mỗi frame
          cCtx.strokeStyle = isPlacing
            ? 'rgba(255, 255, 255, 0.14)'
            : 'rgba(255, 255, 255, 0.045)';
          cCtx.lineWidth = 1;
          for (let gy = startGy; gy < startGy + KINGDOM_CHUNK_SIZE; gy++) {
            for (let gx = startGx; gx < startGx + KINGDOM_CHUNK_SIZE; gx++) {
              cCtx.strokeRect(
                gx * TILE_SIZE,
                gy * TILE_SIZE,
                TILE_SIZE,
                TILE_SIZE
              );
            }
          }

          // Viền ranh giới tinh tế giữa các Chunk 16×16
          cCtx.strokeStyle = isPlacing
            ? 'rgba(251, 191, 36, 0.28)'
            : 'rgba(52, 211, 153, 0.18)';
          cCtx.lineWidth = 2;
          cCtx.strokeRect(
            wx0 + 1,
            wy0 + 1,
            chunkPixelSize - 2,
            chunkPixelSize - 2
          );

          cCtx.restore();
        }
        chunkCanvasCache.set(cacheKey, chunkCanvas);
      }

      // Chỉ tốn đúng 1 lệnh drawImage cho toàn bộ 256 ô của Chunk 16×16!
      ctx.drawImage(chunkCanvas, wx0, wy0);
    }
  }
}

// ============================================================================
// 3. SPATIAL HASH GRID (BẢNG BĂM KHÔNG GIAN O(1) CHO ĐƠN VỊ & Ô ĐẤT)
// ============================================================================
export class SpatialHashGrid<T extends { x: number; y: number }> {
  private cellSize: number;
  private buckets = new Map<string, T[]>();

  constructor(cellSize = 128) {
    this.cellSize = cellSize;
  }

  clear(): void {
    this.buckets.clear();
  }

  insert(entity: T): void {
    const cx = Math.floor(entity.x / this.cellSize);
    const cy = Math.floor(entity.y / this.cellSize);
    const key = `${cx},${cy}`;
    const list = this.buckets.get(key);
    if (list) {
      list.push(entity);
    } else {
      this.buckets.set(key, [entity]);
    }
  }

  insertAll(entities: T[]): void {
    for (let i = 0; i < entities.length; i++) {
      this.insert(entities[i]);
    }
  }

  /**
   * Truy vấn tất cả thực thể nằm trong bán kính `radius` quanh `(x, y)` với độ phức tạp O(1) theo ô lưới.
   */
  queryRadius(x: number, y: number, radius: number): T[] {
    const minCx = Math.floor((x - radius) / this.cellSize);
    const maxCx = Math.floor((x + radius) / this.cellSize);
    const minCy = Math.floor((y - radius) / this.cellSize);
    const maxCy = Math.floor((y + radius) / this.cellSize);
    const rSq = radius * radius;
    const results: T[] = [];

    for (let cy = minCy; cy <= maxCy; cy++) {
      for (let cx = minCx; cx <= maxCx; cx++) {
        const bucket = this.buckets.get(`${cx},${cy}`);
        if (!bucket) continue;
        for (let i = 0; i < bucket.length; i++) {
          const item = bucket[i];
          const dx = item.x - x;
          const dy = item.y - y;
          if (dx * dx + dy * dy <= rSq) {
            results.push(item);
          }
        }
      }
    }

    return results;
  }

  /**
   * Tìm nhanh thực thể gần nhất trong bán kính `maxRadius` (O(1) các ô lân cận).
   */
  findNearest(
    x: number,
    y: number,
    maxRadius: number,
    predicate?: (item: T) => boolean
  ): { nearest: T | null; distance: number } {
    const minCx = Math.floor((x - maxRadius) / this.cellSize);
    const maxCx = Math.floor((x + maxRadius) / this.cellSize);
    const minCy = Math.floor((y - maxRadius) / this.cellSize);
    const maxCy = Math.floor((y + maxRadius) / this.cellSize);

    let nearest: T | null = null;
    let bestDistSq = maxRadius * maxRadius;

    for (let cy = minCy; cy <= maxCy; cy++) {
      for (let cx = minCx; cx <= maxCx; cx++) {
        const bucket = this.buckets.get(`${cx},${cy}`);
        if (!bucket) continue;
        for (let i = 0; i < bucket.length; i++) {
          const item = bucket[i];
          if (predicate && !predicate(item)) continue;
          const dx = item.x - x;
          const dy = item.y - y;
          const dSq = dx * dx + dy * dy;
          if (dSq <= bestDistSq) {
            bestDistSq = dSq;
            nearest = item;
          }
        }
      }
    }

    return {
      nearest,
      distance: nearest ? Math.sqrt(bestDistSq) : Infinity,
    };
  }
}

/**
 * Bảng băm tra cứu nhanh O(1) công trình & mỏ tài nguyên theo tọa độ ô `(gx, gy)`.
 */
export class SpatialTileOccupancyMap {
  private buildingByTile = new Map<string, PlacedBuilding>();
  private nodeByTile = new Map<string, ResourceNode>();

  rebuild(buildings: PlacedBuilding[], nodes: ResourceNode[]): void {
    this.buildingByTile.clear();
    this.nodeByTile.clear();
    for (let i = 0; i < buildings.length; i++) {
      const b = buildings[i];
      this.buildingByTile.set(`${b.gridX},${b.gridY}`, b);
    }
    for (let i = 0; i < nodes.length; i++) {
      const n = nodes[i];
      if (n.amount > 0) {
        this.nodeByTile.set(`${n.gridX},${n.gridY}`, n);
      }
    }
  }

  isOccupied(gx: number, gy: number): boolean {
    const key = `${gx},${gy}`;
    return this.buildingByTile.has(key) || this.nodeByTile.has(key);
  }

  hasBuildingAt(gx: number, gy: number): boolean {
    return this.buildingByTile.has(`${gx},${gy}`);
  }

  getBuildingAt(gx: number, gy: number): PlacedBuilding | undefined {
    return this.buildingByTile.get(`${gx},${gy}`);
  }

  hasNodeAt(gx: number, gy: number): boolean {
    return this.nodeByTile.has(`${gx},${gy}`);
  }

  getNodeAt(gx: number, gy: number): ResourceNode | undefined {
    return this.nodeByTile.get(`${gx},${gy}`);
  }
}
