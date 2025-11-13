import { useReducer, useCallback, useEffect } from "react";
import {
  GameState,
  GameAction,
  TetrisPiece,
  ClearedCell,
  Move,
} from "../types/GameTypes";
import type { Difficulty } from "../types/GameTypes";
import {
  createEmptyGrid,
  generateRandomPiecesWithRng,
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
import { randomSeed, type RngState } from "../utils/prng";
import { startGame } from "../utils/leaderboard";

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

const initialSeed: RngState = randomSeed();
const initialGen = generateRandomPiecesWithRng(
  getSavedDifficulty(),
  initialSeed
);

const initialState: GameState = {
  grid: createEmptyGrid(),
  availablePieces: initialGen.pieces,
  selectedPiece: null,
  score: 0,
  clearsCount: 0,
  gameOver: false,
  paused: false,
  startTime: Date.now(),
  clearingCells: [],
  difficulty: getSavedDifficulty(),
  seed: initialSeed,
  rng: initialGen.rng,
  moveLog: [],
  seedFromServer: false,
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
      let nextPieces = updatedPieces;
      let nextRng = state.rng;
      if (allPiecesPlaced) {
        const gen = generateRandomPiecesWithRng(state.difficulty, state.rng);
        nextPieces = gen.pieces;
        nextRng = gen.rng;
      }

      // Check if any remaining pieces can be placed on the board
      const canContinue = canPlaceAnyPiece(nextPieces, finalGrid, {
        allowRotate: rotationEnabled(state.difficulty),
        allowMirror: flipEnabled(state.difficulty),
      });

      const newMove: Move = {
        pieceId: pieceToPlace.id,
        rotation: pieceToPlace.rotation || 0,
        isMirrored: !!pieceToPlace.isMirrored,
        x: action.position.x,
        y: action.position.y,
        timestamp: Date.now(),
      };

      return {
        ...state,
        grid: finalGrid,
        availablePieces: nextPieces,
        selectedPiece: null,
        score: state.score + scoreIncrease,
        clearsCount: state.clearsCount + totalClears,
        clearingCells,
        gameOver: !canContinue,
        rng: nextRng,
        moveLog: [...state.moveLog, newMove],
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

    case "RESTART": {
      const seed = randomSeed();
      const gen = generateRandomPiecesWithRng(state.difficulty, seed);
      return {
        ...initialState,
        difficulty: state.difficulty,
        availablePieces: gen.pieces,
        startTime: Date.now(),
        seed,
        rng: gen.rng,
        moveLog: [],
      };
    }

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
      const seed = randomSeed();
      const gen = generateRandomPiecesWithRng(newDifficulty, seed);
      return {
        ...initialState,
        difficulty: newDifficulty,
        availablePieces: gen.pieces,
        startTime: Date.now(),
        seed,
        rng: gen.rng,
        moveLog: [],
        seedFromServer: false,
      };
    }

    case "SET_DIFFICULTY_WITH_SEED": {
      const { difficulty, seed, seedFromServer } = action as any;
      const gen = generateRandomPiecesWithRng(difficulty, seed);
      return {
        ...initialState,
        difficulty,
        availablePieces: gen.pieces,
        startTime: Date.now(),
        seed,
        rng: gen.rng,
        moveLog: [],
        seedFromServer: !!seedFromServer,
      };
    }

    case "RESET_WITH_SEED": {
      const { seed, seedFromServer } = action as any;
      const gen = generateRandomPiecesWithRng(state.difficulty, seed);
      return {
        ...initialState,
        difficulty: state.difficulty,
        availablePieces: gen.pieces,
        startTime: Date.now(),
        seed,
        rng: gen.rng,
        moveLog: [],
        seedFromServer: !!seedFromServer,
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
    (async () => {
      const res = await startGame();
      if ((res as any)?.seed != null) {
        dispatch({
          type: "RESET_WITH_SEED",
          seed: (res as any).seed,
          seedFromServer: true,
        });
      } else {
        dispatch({ type: "RESTART" });
      }
    })();
  }, []);

  const continueGame = useCallback(() => {
    dispatch({ type: "CONTINUE_GAME" });
  }, []);

  const setDifficulty = useCallback((difficulty: Difficulty) => {
    (async () => {
      const res = await startGame();
      if ((res as any)?.seed != null) {
        dispatch({
          type: "SET_DIFFICULTY_WITH_SEED",
          difficulty,
          seed: (res as any).seed,
          seedFromServer: true,
        });
      } else {
        dispatch({ type: "SET_DIFFICULTY", difficulty });
      }
    })();
  }, []);

  // Auto-clear the clearing overlay after the animation duration
  useEffect(() => {
    if (state.clearingCells.length > 0) {
      const tid = setTimeout(() => dispatch({ type: "CLEARING_DONE" }), 250);
      return () => clearTimeout(tid);
    }
  }, [state.clearingCells.length]);

  // On first mount, try to request a server-issued seed
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await startGame();
      if (!cancelled && (res as any)?.seed != null) {
        dispatch({
          type: "RESET_WITH_SEED",
          seed: (res as any).seed,
          seedFromServer: true,
        });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

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
