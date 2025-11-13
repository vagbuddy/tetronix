import { useReducer, useCallback, useEffect } from "react";
import {
  GameState,
  GameAction,
  TetrisPiece,
  ClearedCell,
} from "../types/GameTypes";
import type { Difficulty } from "../types/GameTypes";
import {
  createEmptyGrid,
  generateRandomPieces,
  rotatePiece,
  flipPiece,
  isValidPlacement,
  placePieceOnGrid,
  checkFullRows,
  checkFullCols,
  checkFullSudokuBlocks,
  clearRows,
  clearCols,
  clearSudokuBlocks,
  calculateScore,
  canPlaceAnyPiece,
} from "../utils/GameLogic";

const DIFFICULTY_KEY = "tetronix:difficulty";

const getSavedDifficulty = (): Difficulty => {
  try {
    if (typeof window === "undefined") return "casual";
    const v = localStorage.getItem(DIFFICULTY_KEY);
    if (v === "casual" || v === "master" || v === "expert" || v === "insane") {
      return v as Difficulty;
    }
  } catch {}
  return "casual";
};

const initialState: GameState = {
  grid: createEmptyGrid(),
  availablePieces: generateRandomPieces(getSavedDifficulty()),
  selectedPiece: null,
  score: 0,
  clearsCount: 0,
  gameOver: false,
  paused: false,
  startTime: Date.now(),
  clearingCells: [],
  difficulty: getSavedDifficulty(),
};

const rotationEnabled = (difficulty: Difficulty) =>
  difficulty === "casual" || difficulty === "expert";

// Flipping is allowed only in INSANE (rotation disabled). Expert shows mirrored
// variants as separate pieces, but flip control is disabled.
const flipEnabled = (difficulty: Difficulty) => difficulty === "insane";

const gameReducer = (state: GameState, action: GameAction): GameState => {
  switch (action.type) {
    case "SELECT_PIECE": {
      return {
        ...state,
        selectedPiece: action.piece,
      };
    }

    case "DESELECT_PIECE": {
      return {
        ...state,
        selectedPiece: null,
      };
    }

    case "PLACE_PIECE": {
      // Find the piece to place (either selected or by instanceId)
      let piece = state.selectedPiece;
      if (!piece && action.pieceId) {
        piece =
          state.availablePieces.find((p) => p.instanceId === action.pieceId) ||
          null;
      }

      if (!piece) return state;

      // At this point, piece is guaranteed to be non-null
      const pieceToPlace = piece;

      // Prevent duplicate placements for the same piece instance
      if (pieceToPlace.isPlaced) {
        return state;
      }

      // Check if placement is valid
      if (!isValidPlacement(pieceToPlace, action.position, state.grid)) {
        return state;
      }

      // Place the piece on the grid
      const newGrid = placePieceOnGrid(
        pieceToPlace,
        action.position,
        state.grid
      );

      // Update the piece as placed
      const updatedPieces = state.availablePieces.map((p) =>
        p.instanceId === pieceToPlace.instanceId
          ? { ...p, isPlaced: true, position: action.position }
          : p
      );

      // Check for line and block clears
      const fullRows = checkFullRows(newGrid);
      const fullCols = checkFullCols(newGrid);
      const fullSudokuBlocks = checkFullSudokuBlocks(newGrid);

      let finalGrid = newGrid;
      let scoreIncrease = 0;
      let totalClears = 0;

      // Build clearing overlay cells from the about-to-be-cleared grid
      const toClear: { [key: string]: true } = {};
      const pushCell = (x: number, y: number) => {
        if (x >= 0 && x < newGrid[0].length && y >= 0 && y < newGrid.length) {
          toClear[`${x},${y}`] = true;
        }
      };
      // rows
      for (const r of fullRows) {
        for (let x = 0; x < newGrid[0].length; x++) pushCell(x, r);
      }
      // cols
      for (const c of fullCols) {
        for (let y = 0; y < newGrid.length; y++) pushCell(c, y);
      }
      // 3x3 blocks
      for (const block of fullSudokuBlocks) {
        for (const cell of block.cells) pushCell(cell.x, cell.y);
      }
      const clearingCells: ClearedCell[] = Object.keys(toClear).map((key) => {
        const [xs, ys] = key.split(",");
        const x = Number(xs);
        const y = Number(ys);
        const color = newGrid[y][x].color;
        return { x, y, color };
      });

      // Clear full rows
      if (fullRows.length > 0) {
        finalGrid = clearRows(finalGrid, fullRows);
        totalClears += fullRows.length;
      }

      // Clear full cols
      if (fullCols.length > 0) {
        finalGrid = clearCols(finalGrid, fullCols);
        totalClears += fullCols.length;
      }

      // Clear full sudoku blocks
      if (fullSudokuBlocks.length > 0) {
        finalGrid = clearSudokuBlocks(finalGrid, fullSudokuBlocks);
        totalClears += fullSudokuBlocks.length;
      }

      scoreIncrease = calculateScore(
        fullRows.length,
        fullCols.length,
        fullSudokuBlocks.length
      );

      // Check if all pieces are placed - if so, generate new pieces
      const allPiecesPlaced = updatedPieces.every((p) => p.isPlaced);
      const finalPieces = allPiecesPlaced
        ? generateRandomPieces(state.difficulty)
        : updatedPieces;

      // Check if any remaining pieces can be placed on the board
      const canContinue = canPlaceAnyPiece(finalPieces, finalGrid, {
        allowRotate: rotationEnabled(state.difficulty),
        allowMirror: flipEnabled(state.difficulty),
      });

      return {
        ...state,
        grid: finalGrid,
        availablePieces: finalPieces,
        selectedPiece: null,
        score: state.score + scoreIncrease,
        clearsCount: state.clearsCount + totalClears,
        clearingCells,
        gameOver: !canContinue,
      };
    }

    case "ROTATE_PIECE": {
      if (!rotationEnabled(state.difficulty)) {
        return state; // rotation disabled for this difficulty
      }
      let newSelected = state.selectedPiece;
      const updatedPieces = state.availablePieces.map((piece) => {
        if (piece.instanceId === action.pieceId) {
          const rotated = rotatePiece(piece);
          if (state.selectedPiece?.instanceId === action.pieceId) {
            newSelected = rotated;
          }
          return rotated;
        }
        return piece;
      });

      return {
        ...state,
        availablePieces: updatedPieces,
        selectedPiece: newSelected,
      };
    }

    case "FLIP_PIECE": {
      // Allow flip only when flipEnabled for current difficulty
      if (!flipEnabled(state.difficulty)) {
        return state;
      }
      let newSelected = state.selectedPiece;
      const updatedPieces = state.availablePieces.map((piece) => {
        if (piece.instanceId === action.pieceId) {
          const flipped = flipPiece(piece);
          if (state.selectedPiece?.instanceId === action.pieceId) {
            newSelected = flipped;
          }
          return flipped;
        }
        return piece;
      });

      return {
        ...state,
        availablePieces: updatedPieces,
        selectedPiece: newSelected,
      };
    }

    case "START_DRAG": {
      const updatedPieces = state.availablePieces.map((piece) =>
        piece.instanceId === action.piece.instanceId
          ? { ...piece, isDragging: true }
          : piece
      );

      return {
        ...state,
        availablePieces: updatedPieces,
        selectedPiece: action.piece,
      };
    }

    case "END_DRAG": {
      const updatedPieces = state.availablePieces.map((piece) =>
        piece.isDragging ? { ...piece, isDragging: false } : piece
      );

      return {
        ...state,
        availablePieces: updatedPieces,
        selectedPiece: null,
      };
    }

    case "PAUSE":
      return { ...state, paused: true };

    case "RESUME":
      return { ...state, paused: false };

    case "RESTART":
      return {
        ...initialState,
        difficulty: state.difficulty,
        availablePieces: generateRandomPieces(state.difficulty),
        startTime: Date.now(),
      };

    case "CONTINUE_GAME":
      // Allow user to dismiss game over screen and continue playing
      return { ...state, gameOver: false };

    case "SET_DIFFICULTY": {
      // Changing difficulty restarts the game with new pool/rules
      const newDifficulty = action.difficulty;
      try {
        if (typeof window !== "undefined") {
          localStorage.setItem(DIFFICULTY_KEY, newDifficulty);
        }
      } catch {}
      return {
        ...initialState,
        difficulty: newDifficulty,
        availablePieces: generateRandomPieces(newDifficulty),
        startTime: Date.now(),
      };
    }

    case "CLEARING_DONE":
      return { ...state, clearingCells: [] };

    default:
      return state;
  }
};

export const useGameState = () => {
  const [state, dispatch] = useReducer(gameReducer, initialState);

  const selectPiece = useCallback((piece: TetrisPiece) => {
    dispatch({ type: "SELECT_PIECE", piece });
  }, []);

  const deselectPiece = useCallback(() => {
    dispatch({ type: "DESELECT_PIECE" });
  }, []);

  const placePiece = useCallback(
    (position: { x: number; y: number }, pieceId?: string) => {
      dispatch({ type: "PLACE_PIECE", position, pieceId });
    },
    []
  );

  const rotatePiece = useCallback((pieceId: string) => {
    dispatch({ type: "ROTATE_PIECE", pieceId });
  }, []);

  const flipPiece = useCallback((pieceId: string) => {
    dispatch({ type: "FLIP_PIECE", pieceId });
  }, []);

  const startDrag = useCallback((piece: TetrisPiece) => {
    dispatch({ type: "START_DRAG", piece });
  }, []);

  const endDrag = useCallback(() => {
    dispatch({ type: "END_DRAG" });
  }, []);

  const pause = useCallback(() => {
    dispatch({ type: "PAUSE" });
  }, []);

  const resume = useCallback(() => {
    dispatch({ type: "RESUME" });
  }, []);

  const restart = useCallback(() => {
    dispatch({ type: "RESTART" });
  }, []);

  const continueGame = useCallback(() => {
    dispatch({ type: "CONTINUE_GAME" });
  }, []);

  const setDifficulty = useCallback((difficulty: Difficulty) => {
    dispatch({ type: "SET_DIFFICULTY", difficulty });
  }, []);

  // Auto-clear the clearing overlay after the animation duration
  useEffect(() => {
    if (state.clearingCells.length > 0) {
      const tid = setTimeout(() => dispatch({ type: "CLEARING_DONE" }), 250);
      return () => clearTimeout(tid);
    }
  }, [state.clearingCells.length]);

  return {
    state,
    selectPiece,
    deselectPiece,
    placePiece,
    rotatePiece,
    flipPiece,
    startDrag,
    endDrag,
    pause,
    resume,
    restart,
    continueGame,
    setDifficulty,
  };
};
