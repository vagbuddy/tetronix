import { useReducer, useCallback, useEffect } from "react";
import { GameState, GameAction, TetrisPiece } from "../types/GameTypes";
import {
  createEmptyGrid,
  generateRandomPieces,
  rotatePiece,
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

const initialState: GameState = {
  grid: createEmptyGrid(),
  availablePieces: generateRandomPieces(),
  selectedPiece: null,
  score: 0,
  clearsCount: 0,
  gameOver: false,
  paused: false,
  startTime: Date.now(),
};

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
        ? generateRandomPieces()
        : updatedPieces;

      // Check if any remaining pieces can be placed on the board
      const canContinue = canPlaceAnyPiece(finalPieces, finalGrid);

      return {
        ...state,
        grid: finalGrid,
        availablePieces: finalPieces,
        selectedPiece: null,
        score: state.score + scoreIncrease,
        clearsCount: state.clearsCount + totalClears,
        gameOver: !canContinue,
      };
    }

    case "ROTATE_PIECE": {
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
        availablePieces: generateRandomPieces(),
        startTime: Date.now(),
      };

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

  return {
    state,
    selectPiece,
    deselectPiece,
    placePiece,
    rotatePiece,
    startDrag,
    endDrag,
    pause,
    resume,
    restart,
  };
};
