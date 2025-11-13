import type { Cell, TetrisPiece } from "../types/GameTypes";
import {
  GRID_HEIGHT,
  GRID_WIDTH,
  TETRIS_PIECES,
  PENTOMINO_PIECES,
  MIRRORED_PENTOMINO_PIECES,
} from "./GameLogic";

export const gridFromLines = (lines: string[]): Cell[][] => {
  if (lines.length !== GRID_HEIGHT) {
    throw new Error(`Expected ${GRID_HEIGHT} rows, got ${lines.length}`);
  }
  const grid: Cell[][] = Array.from({ length: GRID_HEIGHT }, () =>
    Array.from({ length: GRID_WIDTH }, () => ({ filled: false }))
  );
  for (let y = 0; y < GRID_HEIGHT; y++) {
    const row = lines[y];
    if (row.length !== GRID_WIDTH) {
      throw new Error(
        `Row ${y} expected length ${GRID_WIDTH}, got ${row.length}`
      );
    }
    for (let x = 0; x < GRID_WIDTH; x++) {
      grid[y][x].filled = row[x] === "1";
    }
  }
  return grid;
};

export const pieceById = (id: string, colorOverride?: string): TetrisPiece => {
  const template =
    TETRIS_PIECES.find((p) => p.id === id) ||
    PENTOMINO_PIECES.find((p) => p.id === id) ||
    MIRRORED_PENTOMINO_PIECES.find((p) => p.id === id);
  if (!template) throw new Error(`Unknown piece id: ${id}`);
  return {
    ...template,
    color: colorOverride ?? template.color,
    instanceId: `test-${id}-${Math.random().toString(36).slice(2, 8)}`,
    isPlaced: false,
    isDragging: false,
    position: { x: 0, y: 0 },
    rotation: 0,
  };
};

export const piecesByIds = (
  ids: string[],
  colorOverride?: string
): TetrisPiece[] => ids.map((id) => pieceById(id, colorOverride));
