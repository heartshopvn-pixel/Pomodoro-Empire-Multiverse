import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  CheckSquare,
  Cloud,
  Compass,
  Eye,
  Layers,
  LogOut,
  RotateCcw,
  Save,
  ShieldAlert,
  Sparkles,
  Square,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { KingState } from '../types/game';
import {
  ALL_STAGE_TARGET_OPTIONS,
  AdminStageAssetMatrix,
  buildShowroom30x30Entities,
  createDefaultAdminStageAssetMatrix,
  getActiveAdminStageAssetMatrix,
  setActiveAdminStageAssetMatrix,
  SHOWROOM_CATEGORIES,
  SHOWROOM_GRID_COLS,
  SHOWROOM_GRID_ROWS,
  SHOWROOM_MODELS_CATALOG,
  ShowroomCategory,
  ShowroomModelItem,
  STAGE_MODE_GROUPS,
  subscribeToLocalStageAssetMatrix,
} from '../utils/adminShowroomConfig';
import {
  applyIsoGroundTransform,
  isoToWorld,
  worldToIso,
} from '../utils/isometric';
import {
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  drawBuilding,
  drawEnemy,
  drawKing,
  drawManorPlacedObject,
  drawResourceNode,
  drawShowroomGroundTile,
  drawVillager,
  TILE_SIZE,
} from '../utils/pixelSprites';
import { soundFX } from '../utils/sound';

interface AdminShowroomScreenProps {
  isCloudConnected: boolean;
  cloudEmail: string | null;
  onConnectGoogleCloud: () => Promise<void>;
  onSaveMatrixToServer: (
    enabledStagesByModelId: Record<string, string[]>
  ) => Promise<{ syncedToCloud: boolean; message: string }>;
  onExitAdmin: () => void;
}

const SHOWROOM_WORLD_W = SHOWROOM_GRID_COLS * TILE_SIZE; // 1920
const SHOWROOM_WORLD_H = SHOWROOM_GRID_ROWS * TILE_SIZE; // 1920

export const AdminShowroomScreen: React.FC<AdminShowroomScreenProps> = ({
  isCloudConnected,
  cloudEmail,
  onConnectGoogleCloud,
  onSaveMatrixToServer,
  onExitAdmin,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Selected model in the 30x30 Showroom
  const [selectedModelId, setSelectedModelId] = useState<string>(
    SHOWROOM_MODELS_CATALOG[0].id
  );

  // Stage Asset Matrix state (editable before confirming server update)
  const [draftMatrix, setDraftMatrix] = useState<AdminStageAssetMatrix>(() => {
    const current = getActiveAdminStageAssetMatrix() || {};
    const cloned: AdminStageAssetMatrix = {};
    Object.entries(current).forEach(([k, v]) => {
      if (Array.isArray(v)) {
        cloned[k] = [...v];
      }
    });
    return cloned;
  });

  // Sync draftMatrix if remote cloud matrix updates while no unsaved edits
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState<boolean>(false);
  const hasUnsavedRef = useRef<boolean>(false);
  hasUnsavedRef.current = hasUnsavedChanges;

  useEffect(() => {
    return subscribeToLocalStageAssetMatrix((nextMatrix) => {
      if (hasUnsavedRef.current || !nextMatrix) return;
      const cloned: AdminStageAssetMatrix = {};
      Object.entries(nextMatrix).forEach(([k, v]) => {
        if (Array.isArray(v)) {
          cloned[k] = [...v];
        }
      });
      setDraftMatrix(cloned);
    });
  }, []);

  // Optional Stage Filter Preview ("Soi theo màn chơi")
  const [previewStageKey, setPreviewStageKey] = useState<string>('ALL');
  const [activeCategoryJump, setActiveCategoryJump] =
    useState<ShowroomCategory>('GROUND_TEXTURE');
  const [zoom, setZoom] = useState<number>(0.95);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [statusBanner, setStatusBanner] = useState<{
    type: 'success' | 'info' | 'warning';
    text: string;
  } | null>({
    type: 'info',
    text: 'Bấm trực tiếp vào bất kỳ ô Đất / Cây / Trang Trí / Công Trình / Quân Địch trên bản đồ Showroom 30×30 để tích chọn màn chơi được phép sinh model đó.',
  });

  // Pre-built static entities for the 30x30 showroom
  const showroomEntities = useMemo(
    () => buildShowroom30x30Entities(TILE_SIZE),
    []
  );

  // Dummy KingState for Row 6 King Lord preview at (5, 25)
  const showroomKingEntity = useMemo<KingState>(() => {
    const kx = 5 * TILE_SIZE + TILE_SIZE / 2;
    const ky = 25 * TILE_SIZE + TILE_SIZE / 2;
    return {
      x: kx,
      y: ky,
      targetX: kx,
      targetY: ky,
      facing: 'RIGHT',
      state: 'IDLE',
      isSelected: false,
      hp: 300,
      maxHp: 300,
      reg: 5,
      atk: 30,
      mag: 20,
      def: 35,
      mar: 30,
      ats: 1.1,
      crt: 15,
      eva: 10,
      crd: 150,
      spd: 100,
      ran: 44,
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
      pow: 520,
      statusEffects: [],
      attackRange: 44,
      attackCooldown: 0,
      windup: 0,
      hitFlash: 0,
      knockbackX: 0,
      knockbackY: 0,
    };
  }, []);

  // Category row Y set for aisle road styling
  const categoryRowYMap = useMemo(() => {
    const map = new Map<number, (typeof SHOWROOM_CATEGORIES)[number]>();
    SHOWROOM_CATEGORIES.forEach((cat) => {
      map.set(cat.gridY, cat);
    });
    return map;
  }, []);

  const selectedModel = useMemo<ShowroomModelItem>(
    () =>
      SHOWROOM_MODELS_CATALOG.find((m) => m.id === selectedModelId) ||
      SHOWROOM_MODELS_CATALOG[0],
    [selectedModelId]
  );

  // Camera state in isometric screen space
  const cameraRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const targetCameraRef = useRef<{ x: number; y: number } | null>(null);
  const isDraggingRef = useRef<boolean>(false);
  const dragStartMouseRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const dragStartCamRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const dragMovedDistanceRef = useRef<number>(0);
  const keysPressedRef = useRef<Set<string>>(new Set());

  // Refs for render loop access without re-binding RAF
  const selectedModelIdRef = useRef<string>(selectedModelId);
  selectedModelIdRef.current = selectedModelId;

  const draftMatrixRef = useRef<AdminStageAssetMatrix>(draftMatrix);
  draftMatrixRef.current = draftMatrix;

  const previewStageKeyRef = useRef<string>(previewStageKey);
  previewStageKeyRef.current = previewStageKey;

  const zoomRef = useRef<number>(zoom);
  zoomRef.current = zoom;

  // Helper to center camera on a given grid coordinate (gx, gy)
  const panCameraToGrid = (gx: number, gy: number, immediate = false) => {
    const z = zoomRef.current;
    const worldX = (gx + 0.5) * TILE_SIZE;
    const worldY = (gy + 0.5) * TILE_SIZE;
    const isoPt = worldToIso(worldX, worldY);
    const camX = isoPt.x - CANVAS_WIDTH / (2 * z);
    const camY = isoPt.y - CANVAS_HEIGHT / (2 * z);
    if (immediate) {
      cameraRef.current = { x: camX, y: camY };
      targetCameraRef.current = null;
    } else {
      targetCameraRef.current = { x: camX, y: camY };
    }
  };

  // Initial camera position centered on Row 1 & Row 2
  useEffect(() => {
    panCameraToGrid(12, 7, true);
  }, []);

  // Keyboard WASD / Arrow navigation
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'SELECT'
      ) {
        return;
      }
      keysPressedRef.current.add(e.key.toLowerCase());
    };
    const onKeyUp = (e: KeyboardEvent) => {
      keysPressedRef.current.delete(e.key.toLowerCase());
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, []);

  // Main 30x30 Isometric Showroom Render Loop
  useEffect(() => {
    let animId = 0;
    let tick = 0;

    const renderShowroom = () => {
      tick++;
      const canvas = canvasRef.current;
      if (!canvas) {
        animId = requestAnimationFrame(renderShowroom);
        return;
      }
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        animId = requestAnimationFrame(renderShowroom);
        return;
      }

      // Update camera from keyboard or smooth target interpolation
      const keys = keysPressedRef.current;
      const panSpeed = 12 / zoomRef.current;
      if (keys.has('w') || keys.has('arrowup')) {
        cameraRef.current.y -= panSpeed;
        targetCameraRef.current = null;
      }
      if (keys.has('s') || keys.has('arrowdown')) {
        cameraRef.current.y += panSpeed;
        targetCameraRef.current = null;
      }
      if (keys.has('a') || keys.has('arrowleft')) {
        cameraRef.current.x -= panSpeed;
        targetCameraRef.current = null;
      }
      if (keys.has('d') || keys.has('arrowright')) {
        cameraRef.current.x += panSpeed;
        targetCameraRef.current = null;
      }

      if (targetCameraRef.current) {
        const dx = targetCameraRef.current.x - cameraRef.current.x;
        const dy = targetCameraRef.current.y - cameraRef.current.y;
        if (Math.hypot(dx, dy) < 1.5) {
          cameraRef.current.x = targetCameraRef.current.x;
          cameraRef.current.y = targetCameraRef.current.y;
          targetCameraRef.current = null;
        } else {
          cameraRef.current.x += dx * 0.16;
          cameraRef.current.y += dy * 0.16;
        }
      }

      const z = zoomRef.current;
      const camX = cameraRef.current.x;
      const camY = cameraRef.current.y;

      ctx.imageSmoothingEnabled = false;
      ctx.fillStyle = '#090d16';
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      ctx.save();
      ctx.scale(z, z);

      // 1. VẼ MẶT ĐẤT ISOMETRIC 30x30
      ctx.save();
      applyIsoGroundTransform(ctx, camX, camY);

      for (let gy = 0; gy < SHOWROOM_GRID_ROWS; gy++) {
        for (let gx = 0; gx < SHOWROOM_GRID_COLS; gx++) {
          const modelAtTile = showroomEntities.tileToModelMap.get(`${gx},${gy}`);
          const isAisleRow = categoryRowYMap.has(gy) && gx >= 2 && gx <= 27;
          const variantOverride =
            modelAtTile?.category === 'GROUND_TEXTURE'
              ? modelAtTile.groundTextureVariant
              : undefined;

          drawShowroomGroundTile(
            ctx,
            gx,
            gy,
            tick,
            variantOverride,
            isAisleRow && !variantOverride
          );

          // Vẽ lưới mỏng trên các hàng trưng bày để Admin dễ phân biệt từng ô 1x1
          if (categoryRowYMap.has(gy)) {
            ctx.strokeStyle = 'rgba(253, 224, 71, 0.18)';
            ctx.lineWidth = 1;
            ctx.strokeRect(
              gx * TILE_SIZE + 1,
              gy * TILE_SIZE + 1,
              TILE_SIZE - 2,
              TILE_SIZE - 2
            );
          }

          // Vẽ bệ khung phát sáng cho các ô có đặt Model trong Showroom
          if (modelAtTile) {
            const isSelected = modelAtTile.id === selectedModelIdRef.current;
            const filterStage = previewStageKeyRef.current;
            const enabledList = draftMatrixRef.current[modelAtTile.id] || [];
            const isEnabledForPreviewStage =
              filterStage === 'ALL'
                ? true
                : modelAtTile.canConfigureStages &&
                  enabledList.includes(filterStage);

            const px = gx * TILE_SIZE;
            const py = gy * TILE_SIZE;

            if (filterStage !== 'ALL' && modelAtTile.canConfigureStages) {
              if (isEnabledForPreviewStage) {
                ctx.fillStyle = 'rgba(16, 185, 129, 0.28)';
                ctx.fillRect(px + 2, py + 2, TILE_SIZE - 4, TILE_SIZE - 4);
                ctx.strokeStyle = '#34d399';
                ctx.lineWidth = 3;
                ctx.strokeRect(px + 2, py + 2, TILE_SIZE - 4, TILE_SIZE - 4);
              } else {
                ctx.fillStyle = 'rgba(15, 23, 42, 0.62)';
                ctx.fillRect(px + 1, py + 1, TILE_SIZE - 2, TILE_SIZE - 2);
              }
            }

            if (isSelected) {
              const pulse = 0.65 + 0.35 * Math.sin(tick * 0.12);
              ctx.strokeStyle = `rgba(250, 204, 21, ${pulse})`;
              ctx.lineWidth = 4;
              ctx.strokeRect(px + 2, py + 2, TILE_SIZE - 4, TILE_SIZE - 4);
            } else if (filterStage === 'ALL') {
              ctx.strokeStyle = modelAtTile.canConfigureStages
                ? 'rgba(56, 189, 248, 0.65)'
                : 'rgba(168, 85, 247, 0.65)';
              ctx.lineWidth = 2;
              ctx.strokeRect(px + 3, py + 3, TILE_SIZE - 6, TILE_SIZE - 6);
            }
          }
        }
      }

      // Viền khung đại sảnh Showroom 30x30
      ctx.strokeStyle = '#eab308';
      ctx.lineWidth = 6;
      ctx.strokeRect(0, 0, SHOWROOM_WORLD_W, SHOWROOM_WORLD_H);
      ctx.restore();

      // 2. VẼ BIỂN TÊN HÀNG PHÂN LOẠI (ROW BANNERS) Ở ĐẦU MỖI HÀNG (gx = 1.5, gy = gridY)
      SHOWROOM_CATEGORIES.forEach((cat) => {
        const bannerIso = worldToIso(
          1.4 * TILE_SIZE,
          (cat.gridY + 0.5) * TILE_SIZE
        );
        const sx = bannerIso.x - camX;
        const sy = bannerIso.y - camY - 26;
        ctx.save();
        ctx.font = 'bold 11px monospace';
        const text = `${cat.titleVi}`;
        const tw = ctx.measureText(text).width + 16;
        ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
        ctx.fillRect(sx - tw / 2, sy - 12, tw, 22);
        ctx.strokeStyle = cat.badgeColorHex;
        ctx.lineWidth = 1.5;
        ctx.strokeRect(sx - tw / 2, sy - 12, tw, 22);
        ctx.fillStyle = '#fef08a';
        ctx.textAlign = 'center';
        ctx.fillText(text, sx, sy + 3);
        ctx.restore();
      });

      // 3. Y-SORT & VẼ TẤT CẢ MODEL TRÊN BẢN ĐỒ SHOWROOM 30x30
      type RenderableItem = {
        sortDepth: number;
        draw: () => void;
      };
      const renderables: RenderableItem[] = [];

      const drawEntityAtIso = (
        worldX: number,
        worldY: number,
        drawWorldFn: () => void
      ) => {
        const isoPt = worldToIso(worldX, worldY);
        ctx.save();
        ctx.translate(isoPt.x - camX - worldX, isoPt.y - camY - worldY);
        drawWorldFn();
        ctx.restore();
      };

      // 3a. Resource Nodes (Row 2)
      showroomEntities.resourceNodes.forEach((node) => {
        const wx = (node.gridX + 0.5) * TILE_SIZE;
        const wy = (node.gridY + 0.5) * TILE_SIZE;
        renderables.push({
          sortDepth: wx + wy,
          draw: () =>
            drawEntityAtIso(wx, wy, () => drawResourceNode(ctx, node, tick)),
        });
      });

      // 3b. Manor Decorations (Row 3)
      showroomEntities.manorObjects.forEach((obj) => {
        const wx = (obj.gridX + 0.5) * TILE_SIZE;
        const wy = (obj.gridY + 0.5) * TILE_SIZE;
        renderables.push({
          sortDepth: wx + wy,
          draw: () =>
            drawEntityAtIso(wx, wy, () =>
              drawManorPlacedObject(ctx, obj, tick, false)
            ),
        });
      });

      // 3c. Buildings (Row 4)
      showroomEntities.buildings.forEach((building) => {
        const wx = (building.gridX + 0.5) * TILE_SIZE;
        const wy = (building.gridY + 0.5) * TILE_SIZE;
        renderables.push({
          sortDepth: wx + wy,
          draw: () =>
            drawEntityAtIso(wx, wy, () =>
              drawBuilding(ctx, building, tick, false)
            ),
        });
      });

      // 3d. Enemies (Row 5)
      showroomEntities.enemies.forEach((enemy) => {
        renderables.push({
          sortDepth: enemy.x + enemy.y,
          draw: () =>
            drawEntityAtIso(enemy.x, enemy.y, () =>
              drawEnemy(ctx, enemy, tick)
            ),
        });
      });

      // 3e. King & Allied Units (Row 6)
      renderables.push({
        sortDepth: showroomKingEntity.x + showroomKingEntity.y,
        draw: () =>
          drawEntityAtIso(showroomKingEntity.x, showroomKingEntity.y, () =>
            drawKing(ctx, showroomKingEntity, tick, 1, 'Đức Vua')
          ),
      });

      showroomEntities.villagers.forEach((unit) => {
        renderables.push({
          sortDepth: unit.x + unit.y,
          draw: () =>
            drawEntityAtIso(unit.x, unit.y, () =>
              drawVillager(ctx, unit, tick, unit.tier || 1, unit.nickname)
            ),
        });
      });

      renderables.sort((a, b) => a.sortDepth - b.sortDepth);
      renderables.forEach((item) => item.draw());

      // 4. VẼ NHÃN TÊN MODEL + SỐ MÀN CHƠI ĐÃ TÍCH NGAY DƯỚI CHÂN MỖI Ô TRƯNG BÀY
      SHOWROOM_MODELS_CATALOG.forEach((entry) => {
        const wx = (entry.gridX + 0.5) * TILE_SIZE;
        const wy = (entry.gridY + 0.5) * TILE_SIZE;
        const isoPt = worldToIso(wx, wy);
        const sx = isoPt.x - camX;
        const sy = isoPt.y - camY + 22;

        // Skip offscreen labels
        if (
          sx < -140 ||
          sx > CANVAS_WIDTH / z + 140 ||
          sy < -80 ||
          sy > CANVAS_HEIGHT / z + 80
        ) {
          return;
        }

        const isSelected = entry.id === selectedModelIdRef.current;
        const enabledStages = draftMatrixRef.current[entry.id] || [];
        const filterStage = previewStageKeyRef.current;
        const isMatchedFilter =
          filterStage !== 'ALL' &&
          entry.canConfigureStages &&
          enabledStages.includes(filterStage);

        ctx.save();
        ctx.font = isSelected ? 'bold 10px monospace' : '10px monospace';
        const badgeText = entry.canConfigureStages
          ? `${entry.nameVi} [${enabledStages.length}/${ALL_STAGE_TARGET_OPTIONS.length}]`
          : `${entry.nameVi} [Quân Ta]`;
        const textWidth = ctx.measureText(badgeText).width + 10;

        ctx.fillStyle = isSelected
          ? 'rgba(120, 53, 15, 0.96)'
          : isMatchedFilter
          ? 'rgba(6, 78, 59, 0.94)'
          : 'rgba(15, 23, 42, 0.86)';
        ctx.fillRect(sx - textWidth / 2, sy - 9, textWidth, 16);

        ctx.strokeStyle = isSelected
          ? '#facc15'
          : isMatchedFilter
          ? '#34d399'
          : entry.canConfigureStages
          ? 'rgba(148, 163, 184, 0.5)'
          : 'rgba(168, 85, 247, 0.5)';
        ctx.lineWidth = isSelected ? 1.5 : 1;
        ctx.strokeRect(sx - textWidth / 2, sy - 9, textWidth, 16);

        ctx.fillStyle = isSelected
          ? '#fef08a'
          : isMatchedFilter
          ? '#a7f3d0'
          : '#e2e8f0';
        ctx.textAlign = 'center';
        ctx.fillText(badgeText, sx, sy + 2);
        ctx.restore();
      });

      ctx.restore();
      animId = requestAnimationFrame(renderShowroom);
    };

    animId = requestAnimationFrame(renderShowroom);
    return () => cancelAnimationFrame(animId);
  }, [showroomEntities, showroomKingEntity, categoryRowYMap]);

  // Mouse handlers on the 30x30 Isometric Canvas
  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    isDraggingRef.current = true;
    dragMovedDistanceRef.current = 0;
    dragStartMouseRef.current = { x: e.clientX, y: e.clientY };
    dragStartCamRef.current = {
      x: cameraRef.current.x,
      y: cameraRef.current.y,
    };
    targetCameraRef.current = null;
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDraggingRef.current) return;
    const dx = e.clientX - dragStartMouseRef.current.x;
    const dy = e.clientY - dragStartMouseRef.current.y;
    dragMovedDistanceRef.current = Math.hypot(dx, dy);
    cameraRef.current = {
      x: dragStartCamRef.current.x - dx / zoomRef.current,
      y: dragStartCamRef.current.y - dy / zoomRef.current,
    };
  };

  const handleCanvasMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const wasClick = dragMovedDistanceRef.current < 7;
    isDraggingRef.current = false;
    if (!wasClick) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = CANVAS_WIDTH / rect.width;
    const scaleY = CANVAS_HEIGHT / rect.height;
    const canvasX = (e.clientX - rect.left) * scaleX;
    const canvasY = (e.clientY - rect.top) * scaleY;

    const z = zoomRef.current;
    const isoX = canvasX / z + cameraRef.current.x;
    const isoY = canvasY / z + cameraRef.current.y;
    const worldPt = isoToWorld(isoX, isoY);
    const clickedGx = Math.floor(worldPt.x / TILE_SIZE);
    const clickedGy = Math.floor(worldPt.y / TILE_SIZE);

    // Check exact tile or closest model within 1.45 tiles (for tall sprites like buildings/trees)
    let matchedModel = showroomEntities.tileToModelMap.get(
      `${clickedGx},${clickedGy}`
    );
    if (!matchedModel) {
      let bestDist = 1.45 * TILE_SIZE;
      SHOWROOM_MODELS_CATALOG.forEach((entry) => {
        const cx = (entry.gridX + 0.5) * TILE_SIZE;
        const cy = (entry.gridY + 0.5) * TILE_SIZE;
        const d = Math.hypot(worldPt.x - cx, worldPt.y - cy);
        if (d < bestDist) {
          bestDist = d;
          matchedModel = entry;
        }
      });
    }

    if (matchedModel) {
      soundFX.playClick();
      setSelectedModelId(matchedModel.id);
      setActiveCategoryJump(matchedModel.category);
    }
  };

  // Toggle a single stage checkbox for the currently selected model
  const handleToggleStageForModel = (modelId: string, stageKey: string) => {
    soundFX.playClick();
    setHasUnsavedChanges(true);
    setDraftMatrix((prev) => {
      const currentList = prev[modelId] || [];
      const exists = currentList.includes(stageKey);
      const nextList = exists
        ? currentList.filter((k) => k !== stageKey)
        : [...currentList, stageKey];
      return {
        ...prev,
        [modelId]: nextList,
      };
    });
  };

  // Batch toggle an entire stage mode group for the selected model
  const handleToggleStageGroupForModel = (
    modelId: string,
    groupStageKeys: string[],
    enableAll: boolean
  ) => {
    soundFX.playClick();
    setHasUnsavedChanges(true);
    setDraftMatrix((prev) => {
      const currentSet = new Set(prev[modelId] || []);
      groupStageKeys.forEach((k) => {
        if (enableAll) currentSet.add(k);
        else currentSet.delete(k);
      });
      return {
        ...prev,
        [modelId]: Array.from(currentSet),
      };
    });
  };

  // Reset to default Stage Design Handbook matrix
  const handleResetToHandbookDefault = () => {
    soundFX.playClick();
    const def = createDefaultAdminStageAssetMatrix();
    setDraftMatrix(def);
    setHasUnsavedChanges(true);
    setStatusBanner({
      type: 'info',
      text: 'Đã khôi phục cấu hình mặc định theo Sổ Tay Thiết Kế Màn Chơi. Bấm "Xác Nhận Cập Nhật Server" để áp dụng.',
    });
  };

  // Confirm & push matrix to Local + Firestore Server
  const handleConfirmUpdateServer = async () => {
    if (isSaving) return;
    soundFX.playUpgrade();
    setIsSaving(true);
    try {
      setActiveAdminStageAssetMatrix(draftMatrix, true);
      const res = await onSaveMatrixToServer(draftMatrix);
      setHasUnsavedChanges(false);
      setStatusBanner({
        type: res.syncedToCloud ? 'success' : 'warning',
        text: res.message,
      });
    } catch (err) {
      setStatusBanner({
        type: 'warning',
        text: `Đã lưu cục bộ trên trình duyệt! Lỗi đồng bộ Cloud: ${
          err instanceof Error ? err.message : String(err)
        }`,
      });
    } finally {
      setIsSaving(false);
    }
  };

  const selectedEnabledStages = draftMatrix[selectedModel.id] || [];

  return (
    <div className="fixed inset-0 bg-[#070a12] text-amber-50 flex flex-col font-mono select-none overflow-hidden">
      {/* TOP BAR: TIÊU ĐỀ ADMIN SHOWROOM 30x30 + QUICK JUMP + STAGE FILTER + CẬP NHẬT SERVER */}
      <header className="bg-[#111827] border-b-2 border-amber-700/80 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 z-20 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-amber-900/60 border-2 border-amber-400 flex items-center justify-center">
            <Layers className="w-5 h-5 text-amber-300" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm md:text-base font-bold uppercase tracking-wider text-amber-300">
                ADMIN SHOWROOM 30×30 · QUẢN TRỊ MODEL &amp; MÀN CHƠI
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-bold uppercase bg-emerald-950 text-emerald-300 border border-emerald-600">
                Tài khoản: admin
              </span>
            </div>
            <p className="text-[11px] text-slate-300">
              Module vẽ map tự động đọc Sổ Tay Thiết Kế Màn Chơi kết hợp trực tiếp với các tích chọn tại Showroom này
            </p>
          </div>
        </div>

        {/* BỘ LỌC SOI THEO MÀN CHƠI & NÚT CẬP NHẬT SERVER */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-700 px-2.5 py-1.5">
            <Eye className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="text-[11px] text-slate-300 uppercase">
              Soi màn chơi:
            </span>
            <select
              value={previewStageKey}
              onChange={(e) => setPreviewStageKey(e.target.value)}
              className="bg-slate-950 text-amber-200 text-xs border border-amber-700/60 px-2 py-0.5 focus:outline-none"
            >
              <option value="ALL">Tất cả Model (28 mẫu)</option>
              {STAGE_MODE_GROUPS.map((grp) => (
                <optgroup key={grp.groupModeId} label={grp.groupModeTitleVi}>
                  {grp.stages.map((st) => (
                    <option key={st.stageKey} value={st.stageKey}>
                      {st.titleVi}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>

          {/* KẾT NỐI GOOGLE CLOUD ĐỂ GHI LÊN FIRESTORE NẾU CHƯA ĐĂNG NHẬP GOOGLE */}
          {!isCloudConnected ? (
            <button
              onClick={() => void onConnectGoogleCloud()}
              className="px-2.5 py-1.5 bg-sky-950 hover:bg-sky-900 text-sky-200 border border-sky-500 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              title="Kết nối Google để lưu cấu hình lên Firestore Cloud cho toàn bộ người chơi"
            >
              <Cloud className="w-3.5 h-3.5 text-sky-400" />
              <span>Kết Nối Cloud Server</span>
            </button>
          ) : (
            <div className="px-2.5 py-1.5 bg-emerald-950/70 border border-emerald-600/70 text-[11px] text-emerald-300 flex items-center gap-1.5">
              <Cloud className="w-3.5 h-3.5 text-emerald-400" />
              <span>Cloud: {cloudEmail || 'Đã kết nối'}</span>
            </div>
          )}

          <button
            onClick={handleResetToHandbookDefault}
            className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600 text-xs font-bold flex items-center gap-1 cursor-pointer"
            title="Khôi phục tích chọn mặc định theo Sổ Tay Thiết Kế Màn Chơi"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Mặc Định Sổ Tay</span>
          </button>

          <button
            onClick={() => void handleConfirmUpdateServer()}
            disabled={isSaving}
            className={`px-3.5 py-1.5 border-2 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer transition-colors ${
              hasUnsavedChanges
                ? 'bg-amber-600 hover:bg-amber-500 text-slate-950 border-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.5)]'
                : 'bg-emerald-800 hover:bg-emerald-700 text-amber-100 border-emerald-400'
            }`}
          >
            <Save className="w-4 h-4" />
            <span>
              {isSaving
                ? 'Đang Cập Nhật...'
                : hasUnsavedChanges
                ? 'Xác Nhận Cập Nhật Server *'
                : 'Xác Nhận Cập Nhật Server'}
            </span>
          </button>

          <button
            onClick={onExitAdmin}
            className="px-2.5 py-1.5 bg-rose-950 hover:bg-rose-900 text-rose-200 border border-rose-600 text-xs font-bold flex items-center gap-1 cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Đăng Xuất</span>
          </button>
        </div>
      </header>

      {/* THANH NHẢY NHANH THEO 6 HÀNG PHÂN LOẠI TRÊN MAP 30x30 */}
      <div className="bg-[#0d1322] border-b border-slate-800 px-4 py-1.5 flex flex-wrap items-center justify-between gap-2 z-10">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] text-amber-400 font-bold uppercase flex items-center gap-1 mr-1">
            <Compass className="w-3.5 h-3.5" />
            Di chuyển nhanh đến Hàng:
          </span>
          {SHOWROOM_CATEGORIES.map((cat) => {
            const isActive = activeCategoryJump === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => {
                  soundFX.playClick();
                  setActiveCategoryJump(cat.id);
                  panCameraToGrid(12, cat.gridY, false);
                  const firstInRow = SHOWROOM_MODELS_CATALOG.find(
                    (m) => m.category === cat.id
                  );
                  if (firstInRow) {
                    setSelectedModelId(firstInRow.id);
                  }
                }}
                className={`px-2.5 py-1 text-[11px] font-bold border cursor-pointer transition-colors ${
                  isActive
                    ? 'bg-amber-900/80 text-amber-200 border-amber-400'
                    : 'bg-slate-900/90 hover:bg-slate-800 text-slate-300 border-slate-700'
                }`}
              >
                {cat.shortTitleVi} (y={cat.gridY})
              </button>
            );
          })}
        </div>

        {/* ZOOM CONTROLS */}
        <div className="flex items-center gap-1">
          <button
            onClick={() =>
              setZoom((z) => Math.max(0.6, +(z - 0.15).toFixed(2)))
            }
            className="p-1 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 cursor-pointer"
            title="Thu nhỏ"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <span className="text-[11px] text-amber-300 px-2 font-bold">
            {Math.round(zoom * 100)}%
          </span>
          <button
            onClick={() =>
              setZoom((z) => Math.min(1.4, +(z + 0.15).toFixed(2)))
            }
            className="p-1 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 cursor-pointer"
            title="Phóng to"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* STATUS BANNER */}
      {statusBanner && (
        <div
          className={`px-4 py-1.5 text-xs flex items-center justify-between border-b ${
            statusBanner.type === 'success'
              ? 'bg-emerald-950/90 text-emerald-200 border-emerald-600'
              : statusBanner.type === 'warning'
              ? 'bg-amber-950/90 text-amber-200 border-amber-600'
              : 'bg-slate-900/95 text-sky-200 border-slate-700'
          }`}
        >
          <div className="flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 shrink-0 text-amber-400" />
            <span>{statusBanner.text}</span>
          </div>
          <button
            onClick={() => setStatusBanner(null)}
            className="text-[11px] underline ml-4 cursor-pointer opacity-80 hover:opacity-100"
          >
            Đóng
          </button>
        </div>
      )}

      {/* MAIN WORKSPACE: BÊN TRÁI LÀ CANVAS SHOWROOM 30x30 ISOMETRIC, BÊN PHẢI LÀ BẢNG TÍCH CHỌN MÀN CHƠI */}
      <div className="flex-1 flex flex-col lg:flex-row min-h-0 overflow-hidden">
        {/* 30x30 ISOMETRIC SHOWROOM CANVAS */}
        <div className="flex-1 relative bg-[#090d16] overflow-hidden flex items-center justify-center">
          <canvas
            ref={canvasRef}
            width={CANVAS_WIDTH}
            height={CANVAS_HEIGHT}
            onMouseDown={handleCanvasMouseDown}
            onMouseMove={handleCanvasMouseMove}
            onMouseUp={handleCanvasMouseUp}
            onContextMenu={(e) => e.preventDefault()}
            className="w-full h-full object-contain cursor-grab active:cursor-grabbing"
          />

          {/* CHÚ THÍCH ĐIỀU KHIỂN GÓC DƯỚI TRÁI CANVAS */}
          <div className="absolute bottom-3 left-3 bg-slate-950/90 border border-amber-700/60 px-3 py-2 text-[11px] text-slate-300 pointer-events-none space-y-0.5">
            <div className="text-amber-300 font-bold uppercase">
              Bản Đồ Showroom 30×30 Ô (Isometric 2.5D)
            </div>
            <div>
              • <span className="text-amber-200">Click Chuột Trái</span> vào một
              ô model để mở danh sách tích chọn màn chơi
            </div>
            <div>
              • <span className="text-amber-200">Kéo Chuột</span> hoặc bấm phím{' '}
              <span className="text-amber-200">W A S D / Mũi tên</span> để di
              chuyển camera
            </div>
          </div>

          {/* DANH SÁCH MODEL TRONG HÀNG ĐANG CHỌN (GÓC DƯỚI PHẢI CANVAS) */}
          <div className="absolute bottom-3 right-3 bg-slate-950/92 border border-slate-700 p-2 max-w-md hidden xl:block">
            <div className="text-[10px] font-bold uppercase text-amber-300 mb-1">
              Chọn nhanh Model trong hàng hiện tại:
            </div>
            <div className="flex flex-wrap gap-1">
              {SHOWROOM_MODELS_CATALOG.filter(
                (m) => m.category === selectedModel.category
              ).map((m) => {
                const isSel = m.id === selectedModel.id;
                return (
                  <button
                    key={m.id}
                    onClick={() => {
                      soundFX.playClick();
                      setSelectedModelId(m.id);
                      panCameraToGrid(m.gridX, m.gridY, false);
                    }}
                    className={`px-2 py-0.5 text-[10px] border cursor-pointer ${
                      isSel
                        ? 'bg-amber-600 text-slate-950 font-bold border-amber-300'
                        : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-700'
                    }`}
                  >
                    {m.nameVi}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* SIDEBAR BÊN PHẢI: CHI TIẾT MODEL ĐANG CHỌN & DANH SÁCH MÀN CHƠI THEO NHÓM CHẾ ĐỘ CHƠI */}
        <aside className="w-full lg:w-[430px] xl:w-[460px] bg-[#111827] border-t-2 lg:border-t-0 lg:border-l-2 border-amber-700/80 flex flex-col h-[46vh] lg:h-auto shrink-0">
          {/* THÔNG TIN MODEL ĐANG CHỌN */}
          <div className="p-4 bg-slate-950/80 border-b border-slate-800">
            <div className="flex items-start justify-between gap-2">
              <div>
                <span className="inline-block px-2 py-0.5 text-[10px] font-bold uppercase bg-amber-950 text-amber-300 border border-amber-700 mb-1">
                  Ô tọa độ ({selectedModel.gridX}, {selectedModel.gridY}) · Mã:{' '}
                  {selectedModel.id}
                </span>
                <h2 className="text-base font-bold text-amber-300">
                  {selectedModel.nameVi}
                </h2>
              </div>
              <button
                onClick={() =>
                  panCameraToGrid(
                    selectedModel.gridX,
                    selectedModel.gridY,
                    false
                  )
                }
                className="px-2 py-1 bg-slate-800 hover:bg-slate-700 border border-slate-600 text-[11px] text-amber-200 cursor-pointer shrink-0"
              >
                Tâm Camera
              </button>
            </div>
            <p className="text-xs text-slate-300 mt-1.5 leading-relaxed">
              {selectedModel.subLabelVi}
            </p>
          </div>

          {/* NỘI DUNG TÍCH CHỌN MÀN CHƠI (HOẶC THÔNG BÁO ĐỐI VỚI ANH HÙNG / QUÂN LÍNH) */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {!selectedModel.canConfigureStages ? (
              <div className="bg-purple-950/40 border-2 border-purple-600/70 p-4 space-y-2">
                <div className="flex items-center gap-2 text-purple-300 font-bold text-sm uppercase">
                  <ShieldAlert className="w-5 h-5 text-purple-400 shrink-0" />
                  <span>Model Anh Hùng &amp; Quân Lính Đồng Minh</span>
                </div>
                <p className="text-xs text-slate-200 leading-relaxed">
                  Theo quy tắc thiết kế, các model{' '}
                  <strong className="text-amber-300">
                    Anh Hùng (Đức Vua, Farel)
                  </strong>{' '}
                  và{' '}
                  <strong className="text-amber-300">
                    Quân Lính (Cấm Vệ Quân, Cung Thủ, Nông Dân)
                  </strong>{' '}
                  thuộc quyền điều phối quân đội của người chơi trước trận đánh,
                  không tự động rải ngẫu nhiên bởi module vẽ map màn chơi.
                </p>
                <p className="text-[11px] text-purple-300">
                  • Hãy bấm chọn các ô thuộc Hàng 1 (Ô Đất), Hàng 2 (Cây &amp;
                  Đá), Hàng 3 (Trang Trí), Hàng 4 (Công Trình), hoặc Hàng 5
                  (Quân Địch) để quy định màn chơi xuất hiện.
                </p>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between bg-slate-900/90 border border-slate-700 px-3 py-2">
                  <span className="text-xs text-slate-200 font-bold">
                    Số màn chơi cho phép đặt model này:
                  </span>
                  <span className="px-2 py-0.5 bg-amber-950 border border-amber-500 text-amber-300 text-xs font-bold">
                    {selectedEnabledStages.length} /{' '}
                    {ALL_STAGE_TARGET_OPTIONS.length} màn chơi
                  </span>
                </div>

                {STAGE_MODE_GROUPS.map((group) => {
                  const groupKeys = group.stages.map((s) => s.stageKey);
                  const enabledInGroupCount = groupKeys.filter((k) =>
                    selectedEnabledStages.includes(k)
                  ).length;
                  const allGroupEnabled =
                    enabledInGroupCount === groupKeys.length;

                  return (
                    <div
                      key={group.groupModeId}
                      className="bg-slate-900/60 border border-slate-700/90 overflow-hidden"
                    >
                      {/* HEADER NHÓM CHẾ ĐỘ CHƠI */}
                      <div className="bg-slate-950 px-3 py-2.5 border-b border-slate-800 flex items-center justify-between gap-2">
                        <div>
                          <div className="text-xs font-bold uppercase text-amber-300">
                            {group.groupModeTitleVi}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            {group.descriptionVi}
                          </div>
                        </div>
                        <button
                          onClick={() =>
                            handleToggleStageGroupForModel(
                              selectedModel.id,
                              groupKeys,
                              !allGroupEnabled
                            )
                          }
                          className="px-2 py-1 text-[10px] font-bold uppercase bg-slate-800 hover:bg-slate-700 text-amber-200 border border-slate-600 cursor-pointer shrink-0"
                        >
                          {allGroupEnabled ? 'Bỏ chọn nhóm' : 'Tích cả nhóm'}
                        </button>
                      </div>

                      {/* DANH SÁCH MÀN CHƠI TRONG NHÓM */}
                      <div className="divide-y divide-slate-800/70">
                        {group.stages.map((stage) => {
                          const isChecked = selectedEnabledStages.includes(
                            stage.stageKey
                          );
                          return (
                            <label
                              key={stage.stageKey}
                              onClick={() =>
                                handleToggleStageForModel(
                                  selectedModel.id,
                                  stage.stageKey
                                )
                              }
                              className={`flex items-center justify-between gap-3 px-3 py-2.5 cursor-pointer transition-colors ${
                                isChecked
                                  ? 'bg-emerald-950/35 hover:bg-emerald-950/55'
                                  : 'hover:bg-slate-800/50'
                              }`}
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                {isChecked ? (
                                  <CheckSquare className="w-4 h-4 text-emerald-400 shrink-0" />
                                ) : (
                                  <Square className="w-4 h-4 text-slate-500 shrink-0" />
                                )}
                                <div className="truncate">
                                  <div
                                    className={`text-xs font-bold truncate ${
                                      isChecked
                                        ? 'text-emerald-200'
                                        : 'text-slate-300'
                                    }`}
                                  >
                                    {stage.titleVi}
                                  </div>
                                  <div className="text-[10px] text-slate-400 truncate">
                                    {stage.subLabelVi}
                                  </div>
                                </div>
                              </div>

                              <span
                                className={`px-2 py-0.5 text-[10px] font-bold uppercase border shrink-0 ${
                                  isChecked
                                    ? 'bg-emerald-900/60 text-emerald-300 border-emerald-500/70'
                                    : 'bg-slate-900 text-slate-500 border-slate-700'
                                }`}
                              >
                                {isChecked ? 'Cho phép' : 'Tắt'}
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </>
            )}
          </div>

          {/* FOOTER SIDEBAR: NÚT XÁC NHẬN CẬP NHẬT TOÀN SERVER */}
          <div className="p-3 bg-slate-950 border-t border-slate-800 flex items-center justify-between gap-2">
            <div className="text-[11px] text-slate-400">
              {hasUnsavedChanges ? (
                <span className="text-amber-300 font-bold">
                  • Có thay đổi mới chưa lưu lên Server
                </span>
              ) : (
                <span className="text-emerald-400">
                  • Đồng bộ với cấu hình hiện tại
                </span>
              )}
            </div>
            <button
              onClick={() => void handleConfirmUpdateServer()}
              disabled={isSaving}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold text-xs uppercase border-2 border-amber-300 flex items-center gap-1.5 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>
                {isSaving ? 'Đang Lưu...' : 'Xác Nhận Cập Nhật Server'}
              </span>
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
};
