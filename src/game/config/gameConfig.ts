export const WORLD_W = 320
export const WORLD_H = 180
// World bounds are for entity centers; pad is the allowed margin from screen edge.
export const WORLD_BOUNDS_PAD = 12

export const GAME_CONFIG = {
  // Fixed internal resolution for pixel-perfect scaling.
  width: WORLD_W,
  height: WORLD_H,
  backgroundColor: '#0b0f1a',
  groundHeight: 80,
} as const
