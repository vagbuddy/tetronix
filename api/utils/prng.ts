// PRNG utilities matching frontend implementation
const FNV1A_OFFSET_BASIS = 2166136261;
const FNV1A_PRIME = 16777619;
const SHIFT_FOR_LOW_BIT_DIFFUSION = 13;
const SHIFT_FOR_HIGH_BIT_DIFFUSION = 17;
const SHIFT_FOR_FINAL_MIX = 5;

export type RngState = number;

export const clampUint32 = (x: number): number => x >>> 0;

export const seedFromString = (s: string): RngState => {
  let h = FNV1A_OFFSET_BASIS >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, FNV1A_PRIME);
  }
  return clampUint32(h || 1);
};

export const randomSeed = (): RngState => {
  const v = Math.floor(Math.random() * 0xffffffff) >>> 0;
  return v === 0 ? 1 : v;
};

export const xorshift32 = (state: RngState): RngState => {
  let x = state >>> 0;
  x ^= x << SHIFT_FOR_LOW_BIT_DIFFUSION;
  x ^= x >>> SHIFT_FOR_HIGH_BIT_DIFFUSION;
  x ^= x << SHIFT_FOR_FINAL_MIX;
  return x >>> 0;
};

// Generate a deterministic seed based on uid and timestamp
export const generateSeedForUser = (uid: string): number => {
  const timestamp = Date.now();
  const combined = `${uid}_${timestamp}_${Math.random()}`;
  return seedFromString(combined);
};

// Ported from frontend: src/utils/GameLogic.ts
// Calculates score based on rows, cols, and sudoku blocks cleared
export const calculateScore = (
  rowsCleared: number,
  colsCleared: number,
  sudokuBlocksCleared: number
): number => {
  const rowScore = rowsCleared * 100;
  const colScore = colsCleared * 100;
  const blockScore = sudokuBlocksCleared * 500;
  const baseScore = rowScore + colScore + blockScore;
  let clearTypes = 0;
  if (rowsCleared > 0) clearTypes++;
  if (colsCleared > 0) clearTypes++;
  if (sudokuBlocksCleared > 0) clearTypes++;
  const multiplier = clearTypes;
  return baseScore * multiplier;
};
