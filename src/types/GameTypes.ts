export interface Position {
  x: number;
  y: number;
}

export interface Cell {
  filled: boolean;
  color?: string;
  pieceId?: string;
}

export interface ClearedCell {
  x: number;
  y: number;
  color?: string;
}

export interface GameState {
  grid: Cell[][];
  availablePieces: TetrisPiece[];
  selectedPiece: TetrisPiece | null;
  score: number;
  clearsCount: number;
  gameOver: boolean;
  paused: boolean;
  startTime: number;
  clearingCells: ClearedCell[]; // transient overlay for clear animation
  difficulty: Difficulty;
}

export interface TetrisPiece {
  id: string;
  instanceId: string; // Unique identifier for each piece instance
  shape: number[][];
  color: string;
  position: Position;
  rotation: number;
  isPlaced: boolean;
  isDragging: boolean;
  isMirrored?: boolean; // For chiral pentominoes (F5, L5, N5, P5, Y5, Z5)
}

export interface SudokuBlock {
  startRow: number;
  startCol: number;
  cells: Position[];
}

export type GameAction =
  | { type: "SELECT_PIECE"; piece: TetrisPiece }
  | { type: "DESELECT_PIECE" }
  | { type: "PLACE_PIECE"; position: Position; pieceId?: string }
  | { type: "ROTATE_PIECE"; pieceId: string }
  | { type: "FLIP_PIECE"; pieceId: string }
  | { type: "START_DRAG"; piece: TetrisPiece }
  | { type: "END_DRAG" }
  | { type: "CLEAR_LINES" }
  | { type: "CLEAR_SUDOKU_BLOCKS" }
  | { type: "PAUSE" }
  | { type: "RESUME" }
  | { type: "RESTART" }
  | { type: "CONTINUE_GAME" }
  | { type: "SET_DIFFICULTY"; difficulty: Difficulty }
  | { type: "CLEARING_DONE" };

// Difficulty levels and rules summary:
// casual: base tetrominoes, rotation enabled
// master: base tetrominoes, no user rotation, random starting orientation
// expert: tetrominoes + pentominoes, rotation enabled
// insane: tetrominoes + pentominoes, no rotation, random orientation
export type Difficulty = "casual" | "master" | "expert" | "insane";
