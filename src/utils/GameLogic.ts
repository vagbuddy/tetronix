import {
  Cell,
  Position,
  TetrisPiece,
  GameState,
  SudokuBlock,
} from "../types/GameTypes";

export const GRID_WIDTH = 9;
export const GRID_HEIGHT = 9;
export const CELL_SIZE = 40;
export const PIECE_SELECTION_COUNT = 3;

// Tetris pieces that fit in 3x3 sudoku blocks
export const TETRIS_PIECES: Omit<
  TetrisPiece,
  "position" | "rotation" | "isPlaced" | "isDragging" | "instanceId"
>[] = [
  {
    id: "I",
    shape: [
      [0, 0, 0, 0],
      [1, 1, 1, 1],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ],
    color: "#00f0f0",
  },
  {
    id: "O",
    shape: [
      [1, 1, 0],
      [1, 1, 0],
      [0, 0, 0],
    ],
    color: "#f0f000",
  },
  {
    id: "T",
    shape: [
      [0, 1, 0],
      [1, 1, 1],
      [0, 0, 0],
    ],
    color: "#a000f0",
  },
  {
    id: "S",
    shape: [
      [0, 1, 1],
      [1, 1, 0],
      [0, 0, 0],
    ],
    color: "#00f000",
  },
  {
    id: "Z",
    shape: [
      [1, 1, 0],
      [0, 1, 1],
      [0, 0, 0],
    ],
    color: "#f00000",
  },
  {
    id: "J",
    shape: [
      [1, 0, 0],
      [1, 1, 1],
      [0, 0, 0],
    ],
    color: "#0000f0",
  },
  {
    id: "L",
    shape: [
      [0, 0, 1],
      [1, 1, 1],
      [0, 0, 0],
    ],
    color: "#f0a000",
  },
];

// Generate all 3x3 sudoku blocks
export const SUDOKU_BLOCKS: SudokuBlock[] = (() => {
  const blocks: SudokuBlock[] = [];
  for (let blockRow = 0; blockRow < 3; blockRow++) {
    for (let blockCol = 0; blockCol < 3; blockCol++) {
      const cells: Position[] = [];
      for (let row = 0; row < 3; row++) {
        for (let col = 0; col < 3; col++) {
          cells.push({
            x: blockCol * 3 + col,
            y: blockRow * 3 + row,
          });
        }
      }
      blocks.push({
        startRow: blockCol * 3,
        startCol: blockRow * 3,
        cells,
      });
    }
  }
  return blocks;
})();

export const createEmptyGrid = (): Cell[][] => {
  return Array(GRID_HEIGHT)
    .fill(null)
    .map(() =>
      Array(GRID_WIDTH)
        .fill(null)
        .map(() => ({ filled: false }))
    );
};

export const createRandomPiece = (): TetrisPiece => {
  const pieceTemplate =
    TETRIS_PIECES[Math.floor(Math.random() * TETRIS_PIECES.length)];
  return {
    ...pieceTemplate,
    instanceId: `${pieceTemplate.id}-${Date.now()}-${Math.random()
      .toString(36)
      .substr(2, 9)}`,
    position: { x: 0, y: 0 }, // Will be set when placed
    rotation: 0,
    isPlaced: false,
    isDragging: false,
  };
};

export const generateRandomPieces = (): TetrisPiece[] => {
  return Array(PIECE_SELECTION_COUNT)
    .fill(null)
    .map(() => createRandomPiece());
};

// Rotate a 3x3 matrix 90 degrees clockwise
const rotateMatrixCW = (matrix: number[][]): number[][] =>
  matrix[0].map((_, index) => matrix.map((row) => row[index]).reverse());

// Rotate a matrix 90 degrees counter-clockwise
const rotateMatrixCCW = (matrix: number[][]): number[][] =>
  // Use three CW rotations for simplicity and correctness with small matrices
  rotateMatrixCW(rotateMatrixCW(rotateMatrixCW(matrix)));

// Certain pieces have fewer distinct orientations in a 3x3 footprint:
// - O has 1 (square)
// - I, S, Z have 2 (horizontal/vertical)
// - T, J, L have 4
export const rotatePiece = (piece: TetrisPiece): TetrisPiece => {
  const id = piece.id;
  const allowed =
    id === "O" ? 1 : id === "I" || id === "S" || id === "Z" ? 2 : 4;

  // If only one orientation, don't change rotation or shape
  if (allowed === 1) return { ...piece, rotation: 0 };

  const nextRotation = (piece.rotation + 1) % allowed;
  // For pieces with only 2 distinct orientations, rotate CW for 0->1 and CCW for 1->0
  // so they toggle strictly between two states (horizontal/vertical), avoiding 180/270 states.
  let rotatedShape: number[][];
  if (allowed === 2) {
    rotatedShape =
      piece.rotation === 0
        ? rotateMatrixCW(piece.shape)
        : rotateMatrixCCW(piece.shape);
  } else {
    rotatedShape = rotateMatrixCW(piece.shape);
  }

  return {
    ...piece,
    shape: rotatedShape,
    rotation: nextRotation,
  };
};

export const getPieceCells = (
  piece: TetrisPiece,
  position?: Position
): Position[] => {
  const pos = position || piece.position;
  const cells: Position[] = [];

  for (let row = 0; row < piece.shape.length; row++) {
    for (let col = 0; col < piece.shape[row].length; col++) {
      if (piece.shape[row][col]) {
        cells.push({
          x: pos.x + col,
          y: pos.y + row,
        });
      }
    }
  }
  return cells;
};

export const isValidPlacement = (
  piece: TetrisPiece,
  position: Position,
  grid: Cell[][]
): boolean => {
  const cells = getPieceCells(piece, position);

  return cells.every((cell) => {
    // Check bounds
    if (
      cell.x < 0 ||
      cell.x >= GRID_WIDTH ||
      cell.y < 0 ||
      cell.y >= GRID_HEIGHT
    ) {
      return false;
    }

    // Check if cell is already filled
    return !grid[cell.y][cell.x].filled;
  });
};

export const placePieceOnGrid = (
  piece: TetrisPiece,
  position: Position,
  grid: Cell[][]
): Cell[][] => {
  const newGrid = grid.map((row) => row.map((cell) => ({ ...cell })));
  const cells = getPieceCells(piece, position);

  cells.forEach((cell) => {
    if (
      cell.y >= 0 &&
      cell.y < GRID_HEIGHT &&
      cell.x >= 0 &&
      cell.x < GRID_WIDTH
    ) {
      newGrid[cell.y][cell.x] = {
        filled: true,
        color: piece.color,
        pieceId: piece.id,
      };
    }
  });

  return newGrid;
};

export const checkFullRows = (grid: Cell[][]): number[] => {
  const fullRows: number[] = [];

  for (let row = 0; row < GRID_HEIGHT; row++) {
    if (grid[row].every((cell) => cell.filled)) {
      fullRows.push(row);
    }
  }

  return fullRows;
};

export const checkFullCols = (grid: Cell[][]): number[] => {
  const fullCols: number[] = [];

  for (let col = 0; col < GRID_WIDTH; col++) {
    if (grid.every((cell) => cell[col].filled)) {
      fullCols.push(col);
    }
  }

  return fullCols;
};

export const checkFullSudokuBlocks = (grid: Cell[][]): SudokuBlock[] => {
  const fullBlocks: SudokuBlock[] = [];

  SUDOKU_BLOCKS.forEach((block) => {
    if (block.cells.every((cell) => grid[cell.y][cell.x].filled)) {
      fullBlocks.push(block);
    }
  });

  return fullBlocks;
};

export const clearRows = (grid: Cell[][], rows: number[]): Cell[][] => {
  let newGrid = grid.map((row) => row.map((cell) => ({ ...cell })));

  // Clear full rows without gravity (just empty the cells)
  rows.forEach((rowIndex) => {
    for (let col = 0; col < GRID_WIDTH; col++) {
      newGrid[rowIndex][col] = { filled: false };
    }
  });

  return newGrid;
};

export const clearCols = (grid: Cell[][], cols: number[]): Cell[][] => {
  let newGrid = grid.map((col) => col.map((cell) => ({ ...cell })));

  // Clear full cols
  cols.forEach((colIndex) => {
    for (let row = 0; row < GRID_HEIGHT; row++) {
      newGrid[row][colIndex] = { filled: false };
    }
  });

  return newGrid;
};

export const clearSudokuBlocks = (
  grid: Cell[][],
  blocks: SudokuBlock[]
): Cell[][] => {
  let newGrid = grid.map((row) => row.map((cell) => ({ ...cell })));

  blocks.forEach((block) => {
    block.cells.forEach((cell) => {
      newGrid[cell.y][cell.x] = { filled: false };
    });
  });

  return newGrid;
};

export const calculateScore = (
  rowsCleared: number,
  colsCleared: number,
  sudokuBlocksCleared: number
): number => {
  // Base score for each type of clear
  const rowScore = rowsCleared * 100;
  const colScore = colsCleared * 100;
  const blockScore = sudokuBlocksCleared * 500;

  const baseScore = rowScore + colScore + blockScore;

  // Calculate combo multiplier based on different types cleared simultaneously
  let clearTypes = 0;
  if (rowsCleared > 0) clearTypes++;
  if (colsCleared > 0) clearTypes++;
  if (sudokuBlocksCleared > 0) clearTypes++;

  // Multiplier: 1x for single type, 2x for two types, 3x for all three types
  const multiplier = clearTypes;

  return baseScore * multiplier;
};

export const getGridPositionFromMouse = (
  mouseX: number,
  mouseY: number,
  boardRect: DOMRect
): Position | null => {
  const x = mouseX - boardRect.left;
  const y = mouseY - boardRect.top;

  const gridX = Math.floor(x / CELL_SIZE);
  const gridY = Math.floor(y / CELL_SIZE);

  if (gridX >= 0 && gridX < GRID_WIDTH && gridY >= 0 && gridY < GRID_HEIGHT) {
    return { x: gridX, y: gridY };
  }

  return null;
};

export const canPlaceAnyPiece = (
  pieces: TetrisPiece[],
  grid: Cell[][]
): boolean => {
  // Filter to only unplaced pieces
  const unplacedPieces = pieces.filter((piece) => !piece.isPlaced);

  // If no pieces left, can't place any
  if (unplacedPieces.length === 0) {
    return false;
  }

  // Try each piece at every position on the grid
  for (const piece of unplacedPieces) {
    for (let y = 0; y < GRID_HEIGHT; y++) {
      for (let x = 0; x < GRID_WIDTH; x++) {
        if (isValidPlacement(piece, { x, y }, grid)) {
          return true; // Found at least one valid placement
        }
      }
    }
  }

  // No valid placements found for any piece
  return false;
};
