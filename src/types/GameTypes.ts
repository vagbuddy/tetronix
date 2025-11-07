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
  | { type: "START_DRAG"; piece: TetrisPiece }
  | { type: "END_DRAG" }
  | { type: "CLEAR_LINES" }
  | { type: "CLEAR_SUDOKU_BLOCKS" }
  | { type: "PAUSE" }
  | { type: "RESUME" }
  | { type: "RESTART" }
  | { type: "CLEARING_DONE" };
