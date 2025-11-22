import {
  seedFromString,
  randomSeed,
  type RngState,
  clampUint32,
  xorshift32,
  nextFloat,
  nextInt,
} from "../../shared/prng";

// Backend-specific utilities that build on the shared PRNG implementation
export { RngState };

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
