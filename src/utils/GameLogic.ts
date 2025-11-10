import {
  Cell,
  Position,
  TetrisPiece,
  GameState,
  SudokuBlock,
} from "../types/GameTypes";
import type { Difficulty } from "../types/GameTypes";

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

// Chiral pentomino IDs (defined below in PENTOMINO_PIECES). We declare the list now
// and build the mirrored set AFTER the base list is declared to avoid temporal dead-zone issues.
const CHIRAL_IDS = ["F5", "L5", "N5", "P5", "Y5", "Z5"] as const;
type ChiralId = (typeof CHIRAL_IDS)[number];

// Classic pentomino pieces (12 total, using standard pentomino naming)
export const PENTOMINO_PIECES: Omit<
  TetrisPiece,
  "position" | "rotation" | "isPlaced" | "isDragging" | "instanceId"
>[] = [
  // I pentomino (5 in a line)
  {
    id: "I5",
    shape: [
      [0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0],
      [1, 1, 1, 1, 1],
      [0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0],
    ],
    color: "#2dd4bf",
  },
  // L pentomino
  {
    id: "L5",
    shape: [
      [0, 0, 0, 0, 0],
      [0, 1, 0, 0, 0],
      [0, 1, 0, 0, 0],
      [0, 1, 0, 0, 0],
      [0, 1, 1, 0, 0],
    ],
    color: "#fb923c",
  },
  // N pentomino
  {
    id: "N5",
    shape: [
      [0, 0, 0, 0, 0],
      [0, 0, 1, 0, 0],
      [0, 1, 1, 0, 0],
      [0, 1, 0, 0, 0],
      [0, 1, 0, 0, 0],
    ],
    color: "#a78bfa",
  },
  // P pentomino
  {
    id: "P5",
    shape: [
      [0, 0, 0, 0, 0],
      [0, 1, 1, 0, 0],
      [0, 1, 1, 0, 0],
      [0, 1, 0, 0, 0],
      [0, 0, 0, 0, 0],
    ],
    color: "#f59e0b",
  },
  // T pentomino
  {
    id: "T5",
    shape: [
      [0, 0, 0, 0, 0],
      [0, 1, 1, 1, 0],
      [0, 0, 1, 0, 0],
      [0, 0, 1, 0, 0],
      [0, 0, 0, 0, 0],
    ],
    color: "#8b5cf6",
  },
  // U pentomino
  {
    id: "U5",
    shape: [
      [0, 0, 0, 0, 0],
      [0, 1, 0, 1, 0],
      [0, 1, 1, 1, 0],
      [0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0],
    ],
    color: "#06b6d4",
  },
  // V pentomino
  {
    id: "V5",
    shape: [
      [0, 0, 0, 0, 0],
      [0, 1, 0, 0, 0],
      [0, 1, 0, 0, 0],
      [0, 1, 1, 1, 0],
      [0, 0, 0, 0, 0],
    ],
    color: "#10b981",
  },
  // W pentomino
  {
    id: "W5",
    shape: [
      [0, 0, 0, 0, 0],
      [0, 1, 0, 0, 0],
      [0, 1, 1, 0, 0],
      [0, 0, 1, 1, 0],
      [0, 0, 0, 0, 0],
    ],
    color: "#22c55e",
  },
  // X pentomino (plus shape)
  {
    id: "X5",
    shape: [
      [0, 0, 0, 0, 0],
      [0, 0, 1, 0, 0],
      [0, 1, 1, 1, 0],
      [0, 0, 1, 0, 0],
      [0, 0, 0, 0, 0],
    ],
    color: "#ef4444",
  },
  // Y pentomino
  {
    id: "Y5",
    shape: [
      [0, 0, 0, 0, 0],
      [0, 0, 1, 0, 0],
      [0, 1, 1, 0, 0],
      [0, 0, 1, 0, 0],
      [0, 0, 1, 0, 0],
    ],
    color: "#eab308",
  },
  // Z pentomino
  {
    id: "Z5",
    shape: [
      [0, 0, 0, 0, 0],
      [0, 1, 1, 0, 0],
      [0, 0, 1, 0, 0],
      [0, 0, 1, 1, 0],
      [0, 0, 0, 0, 0],
    ],
    color: "#f43f5e",
  },
  // F pentomino
  {
    id: "F5",
    shape: [
      [0, 0, 0, 0, 0],
      [0, 0, 1, 1, 0],
      [0, 1, 1, 0, 0],
      [0, 0, 1, 0, 0],
      [0, 0, 0, 0, 0],
    ],
    color: "#ec4899",
  },
];

// Build mirrored chiral pentomino variants now that base list exists.
export const MIRRORED_PENTOMINO_PIECES: Omit<
  TetrisPiece,
  "position" | "rotation" | "isPlaced" | "isDragging" | "instanceId"
>[] = PENTOMINO_PIECES.filter((p) => CHIRAL_IDS.includes(p.id as ChiralId)).map(
  (p) => ({
    id: `${p.id}M`,
    shape: p.shape.map((row) => [...row].reverse()),
    color: p.color,
  })
);

export const getPiecePool = (difficulty: Difficulty) => {
  switch (difficulty) {
    case "expert":
      // Expert: rotation enabled, flip disabled, but mirrored pentomino variants should appear
      return [
        ...TETRIS_PIECES,
        ...PENTOMINO_PIECES,
        ...MIRRORED_PENTOMINO_PIECES,
      ];
    case "insane":
      // In INSANE, rotation is disabled but flip is allowed. Exclude mirrored
      // variants from the pool to avoid duplicates since players can flip.
      return [...TETRIS_PIECES, ...PENTOMINO_PIECES];
    case "master":
    case "casual":
    default:
      return TETRIS_PIECES;
  }
};

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

export const createRandomPiece = (difficulty: Difficulty): TetrisPiece => {
  const pool = getPiecePool(difficulty);
  const template = pool[Math.floor(Math.random() * pool.length)];

  // Base piece
  let piece: TetrisPiece = {
    ...template,
    instanceId: `${template.id}-${Date.now()}-${Math.random()
      .toString(36)
      .substr(2, 9)}`,
    position: { x: 0, y: 0 },
    rotation: 0,
    isPlaced: false,
    isDragging: false,
  };

  // For modes without rotation, randomize initial orientation for variety
  const rotationsDisabled = difficulty === "master" || difficulty === "insane";
  if (rotationsDisabled) {
    const times = Math.floor(Math.random() * 4); // 0..3 clockwise rotations
    for (let i = 0; i < times; i++) {
      piece = rotatePiece(piece);
    }
  }

  return piece;
};

export const generateRandomPieces = (difficulty: Difficulty): TetrisPiece[] => {
  return Array(PIECE_SELECTION_COUNT)
    .fill(null)
    .map(() => createRandomPiece(difficulty));
};

// Rotate a 3x3 matrix 90 degrees clockwise
const rotateMatrixCW = (matrix: number[][]): number[][] =>
  matrix[0].map((_, index) => matrix.map((row) => row[index]).reverse());

// Rotate a matrix 90 degrees counter-clockwise
const rotateMatrixCCW = (matrix: number[][]): number[][] =>
  // Use three CW rotations for simplicity and correctness with small matrices
  rotateMatrixCW(rotateMatrixCW(rotateMatrixCW(matrix)));

// Certain pieces have fewer distinct orientations:
// - O has 1 (square)
// - I, S, Z have 2 (horizontal/vertical)
// Certain pieces have fewer distinct orientations:
// Tetrominoes:
// - O has 1 (square)
// - I, S, Z have 2 (horizontal/vertical)
// - T, J, L have 4
// Pentominoes:
// - I5, Z5 have 2 orientations (line pieces)
// - X5 has 1 (symmetric plus)
// - Others have 4
export const rotatePiece = (piece: TetrisPiece): TetrisPiece => {
  const id = piece.id;

  // Determine allowed rotations based on piece type
  let allowed = 4; // default
  if (id === "O" || id === "X5") {
    allowed = 1; // symmetric pieces (O square, X5 plus)
  } else if (
    id === "I" ||
    id === "S" ||
    id === "Z" ||
    id === "I5" ||
    id === "Z5"
  ) {
    allowed = 2; // pieces with 2 distinct orientations
  }

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

// Chiral pentominoes that can be flipped: F5, L5, N5, P5, Y5, Z5
const CHIRAL_PENTOMINOES = ["F5", "L5", "N5", "P5", "Y5", "Z5"];

// Flip a piece horizontally (mirror)
const flipMatrixHorizontal = (matrix: number[][]): number[][] => {
  return matrix.map((row) => [...row].reverse());
};

export const flipPiece = (piece: TetrisPiece): TetrisPiece => {
  const id = piece.id;

  // Only chiral pentominoes can be flipped
  if (!CHIRAL_PENTOMINOES.includes(id)) {
    return piece;
  }

  const flippedShape = flipMatrixHorizontal(piece.shape);

  return {
    ...piece,
    shape: flippedShape,
    isMirrored: !piece.isMirrored,
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
  grid: Cell[][],
  opts?: { allowRotate?: boolean; allowMirror?: boolean }
): boolean => {
  const allowRotate = !!opts?.allowRotate;
  const allowMirror = !!opts?.allowMirror;
  // Filter to only unplaced pieces
  const unplacedPieces = pieces.filter((piece) => !piece.isPlaced);

  // If no pieces left, can't place any
  if (unplacedPieces.length === 0) {
    return false;
  }

  // Helper: enumerate all orientation variants (rotations + optional mirror)
  const enumerateOrientations = (piece: TetrisPiece): TetrisPiece[] => {
    const variants: TetrisPiece[] = [];
    // Start from a base copy
    const base: TetrisPiece = { ...piece };

    // Determine rotation count rules (reuse logic from rotatePiece without mutating original)
    let allowed = 4;
    if (base.id === "O" || base.id === "X5") allowed = 1;
    else if (
      base.id === "I" ||
      base.id === "S" ||
      base.id === "Z" ||
      base.id === "I5" ||
      base.id === "Z5"
    )
      allowed = 2;

    const performRotate = (shape: number[][], times: number): number[][] => {
      let rotated = shape.map((r) => [...r]);
      for (let i = 0; i < times; i++) {
        rotated = rotateMatrixCW(rotated);
      }
      return rotated;
    };

    const chiral = ["F5", "L5", "N5", "P5", "Y5", "Z5"].includes(base.id);

    const addVariant = (
      shape: number[][],
      rotation: number,
      isMirrored?: boolean
    ) => {
      variants.push({ ...base, shape, rotation, isMirrored });
    };

    // When mirror is allowed, we need to check all rotations of both normal AND mirrored versions
    // because flipping changes the piece fundamentally, and each orientation of the flipped piece
    // is different from the original
    const rotationCount = allowRotate ? allowed : allowMirror ? allowed : 1;

    for (let rot = 0; rot < rotationCount; rot++) {
      // performRotate with rot=0 returns the piece's current shape without modification
      const shape = performRotate(base.shape, rot);
      addVariant(shape, rot, false);
      // If chiral and mirroring allowed, also include mirrored version of this rotation
      if (chiral && allowMirror) {
        const mirrored = shape.map((row) => [...row].reverse());
        addVariant(mirrored, rot, true);
      }
    }

    return variants;
  };

  // Try each piece in each orientation at every position
  for (const piece of unplacedPieces) {
    const orientations = enumerateOrientations(piece);
    for (const oriented of orientations) {
      for (let y = 0; y < GRID_HEIGHT; y++) {
        for (let x = 0; x < GRID_WIDTH; x++) {
          if (isValidPlacement(oriented, { x, y }, grid)) {
            return true; // Found at least one valid placement
          }
        }
      }
    }
  }

  // No valid placements found for any orientation of any piece
  return false;
};
