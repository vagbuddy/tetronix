import { useReducer, useCallback, useEffect } from "react";
import { GameState, GameAction, TetrisPiece } from "../types/GameTypes";
import {
  createEmptyGrid,
  generateRandomPieces,
  rotatePiece,
  isValidPlacement,
  placePieceOnGrid,
  checkFullRows,
  checkFullSudokuBlocks,
  clearRows,
  clearSudokuBlocks,
  calculateScore,
} from "../utils/GameLogic";

const initialState: GameState = {
  grid: createEmptyGrid(),
  availablePieces: generateRandomPieces(),
  selectedPiece: null,
  score: 0,
  level: 1,
  linesCleared: 0,
  gameOver: false,
  paused: false,
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
      const fullSudokuBlocks = checkFullSudokuBlocks(newGrid);

      let finalGrid = newGrid;
      let scoreIncrease = 0;
      let linesIncrease = 0;

      // Clear full rows
      if (fullRows.length > 0) {
        finalGrid = clearRows(finalGrid, fullRows);
        linesIncrease = fullRows.length;
      }

      // Clear full sudoku blocks
      if (fullSudokuBlocks.length > 0) {
        finalGrid = clearSudokuBlocks(finalGrid, fullSudokuBlocks);
      }

      scoreIncrease = calculateScore(
        linesIncrease,
        fullSudokuBlocks.length,
        state.level
      );

      // Check if all pieces are placed - if so, generate new pieces
      const allPiecesPlaced = updatedPieces.every((p) => p.isPlaced);
      const finalPieces = allPiecesPlaced
        ? generateRandomPieces()
        : updatedPieces;

      return {
        ...state,
        grid: finalGrid,
        availablePieces: finalPieces,
        selectedPiece: null,
        score: state.score + scoreIncrease,
        linesCleared: state.linesCleared + linesIncrease,
        level: Math.floor((state.linesCleared + linesIncrease) / 10) + 1,
        gameOver: false, // Never game over, just keep generating new pieces
      };
    }

    case "ROTATE_PIECE": {
      const updatedPieces = state.availablePieces.map((piece) =>
        piece.instanceId === action.pieceId ? rotatePiece(piece) : piece
      );

      return {
        ...state,
        availablePieces: updatedPieces,
        selectedPiece:
          state.selectedPiece?.instanceId === action.pieceId
            ? rotatePiece(state.selectedPiece)
            : state.selectedPiece,
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
