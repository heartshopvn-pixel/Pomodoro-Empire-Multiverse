import { SHOWROOM_GRID_COLS, SHOWROOM_GRID_ROWS } from './adminShowroomConfig';
import { TILE_SIZE } from './pixelSprites';

const ISO_ORIGIN_X = (SHOWROOM_GRID_COLS * TILE_SIZE) / 2; // 960
const ISO_ORIGIN_Y = (SHOWROOM_GRID_ROWS * TILE_SIZE) / 2; // 960
export const ISO_COS = 0.75; // 64x64 tile -> 96x48 diamond (2:1 isometric ratio)
export const ISO_SIN = 0.375;

export function worldToIso(wx: number, wy: number): { x: number; y: number } {
  const dx = wx - ISO_ORIGIN_X;
  const dy = wy - ISO_ORIGIN_Y;
  return {
    x: ISO_ORIGIN_X + (dx - dy) * ISO_COS,
    y: ISO_ORIGIN_Y + (dx + dy) * ISO_SIN,
  };
}

export function isoToWorld(ix: number, iy: number): { x: number; y: number } {
  const du = (ix - ISO_ORIGIN_X) / ISO_COS;
  const dv = (iy - ISO_ORIGIN_Y) / ISO_SIN;
  return {
    x: ISO_ORIGIN_X + (du + dv) * 0.5,
    y: ISO_ORIGIN_Y + (dv - du) * 0.5,
  };
}

export function applyIsoGroundTransform(
  ctx: CanvasRenderingContext2D,
  camX: number,
  camY: number
) {
  ctx.translate(-camX, -camY);
  ctx.translate(ISO_ORIGIN_X, ISO_ORIGIN_Y);
  ctx.transform(ISO_COS, ISO_SIN, -ISO_COS, ISO_SIN, 0, 0);
  ctx.translate(-ISO_ORIGIN_X, -ISO_ORIGIN_Y);
}
