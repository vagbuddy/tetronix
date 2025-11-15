import {
  useReducer,
  useCallback,
  useEffect,
  useMemo,
  useState,
  useRef,
} from "react";
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
const SAVE_KEY = "tetronix:game_v1";

const isValidDifficulty = (v: any): v is Difficulty =>
  v === "casual" || v === "master" || v === "expert" || v === "insane";

const loadSavedState = (): GameState | undefined => {
  try {
    if (typeof window === "undefined") return undefined;
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return undefined;
    const parsed = JSON.parse(raw);
    const s = parsed?.state;
    if (!s) return undefined;

    // Basic validation
    if (!Array.isArray(s.grid) || !Array.isArray(s.availablePieces))
      return undefined;
    if (typeof s.score !== "number" || typeof s.clearsCount !== "number")
      return undefined;
    if (!isValidDifficulty(s.difficulty)) return undefined;

    // Rehydrate and normalize: avoid restoring transient fields like clearingCells
    const restored: GameState = {
      grid: s.grid,
      availablePieces: s.availablePieces,
      selectedPiece: s.selectedPiece || null,
      score: s.score || 0,
      clearsCount: s.clearsCount || 0,
      gameOver: !!s.gameOver,
      // When loading from storage, keep the game paused until user confirms
      paused: true,
      startTime: typeof s.startTime === "number" ? s.startTime : Date.now(),
      totalElapsed: typeof s.totalElapsed === "number" ? s.totalElapsed : 0,
      // Do not restore absolute lastStartTime; require user to resume
      lastStartTime: null,
      clearingCells: [],
      difficulty: s.difficulty,
    };

    return restored;
  } catch (e) {
    return undefined;
  }
};

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
  totalElapsed: 0,
  lastStartTime: Date.now(),
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

    case "PAUSE": {
      // Add elapsed time since lastStartTime to totalElapsed
      let elapsed = state.totalElapsed;
      if (state.lastStartTime) {
        elapsed += Math.floor((Date.now() - state.lastStartTime) / 1000);
      }
      return {
        ...state,
        paused: true,
        totalElapsed: elapsed,
        lastStartTime: null,
      };
    }

    case "RESUME": {
      // Set lastStartTime to now
      return { ...state, paused: false, lastStartTime: Date.now() };
    }

    case "RESTART":
      return {
        ...initialState,
        difficulty: state.difficulty,
        availablePieces: generateRandomPieces(state.difficulty),
        startTime: Date.now(),
        totalElapsed: 0,
        lastStartTime: Date.now(),
      };

    case "CONTINUE_GAME":
      // Allow user to dismiss game over screen and continue playing
      // Ensure the timer restarts by setting lastStartTime to now
      return { ...state, gameOver: false, lastStartTime: Date.now() };

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
        totalElapsed: 0,
        lastStartTime: Date.now(),
      };
    }

    case "CLEARING_DONE":
      return { ...state, clearingCells: [] };

    default:
      return state;
  }
};

export const useGameState = () => {
  // Try to load saved state (synchronously) so we can show a continue prompt
  const saved = typeof window !== "undefined" ? loadSavedState() : undefined;
  const initialLoadedFromStorage = !!saved;
  const initialLoadedRef = useRef(initialLoadedFromStorage);
  const [hasSaved, setHasSaved] = useState<boolean>(initialLoadedFromStorage);

  const [state, dispatch] = useReducer(gameReducer, saved || initialState);
  const skipSaveRef = useRef(false);

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

  const discardSavedAndRestart = useCallback(() => {
    // Prevent the next automatic persist from re-creating the saved game
    skipSaveRef.current = true;
    try {
      if (typeof window !== "undefined") {
        localStorage.removeItem(SAVE_KEY);
      }
    } catch {}
    setHasSaved(false);
    // restart will reset to initialState but keep difficulty
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

  // Persist game state to localStorage on changes. We avoid saving transient
  // fields like `clearingCells` and `lastStartTime` (stored as absolute timestamp).
  useEffect(() => {
    try {
      if (typeof window === "undefined") return;
      // If we're skipping one persistence (e.g. user just discarded saved state),
      // consume the flag and avoid writing to storage this cycle.
      if (skipSaveRef.current) {
        skipSaveRef.current = false;
        return;
      }
      const toSave = {
        version: 1,
        savedAt: Date.now(),
        state: {
          ...state,
          // don't persist transient animation overlay
          clearingCells: [],
          // persist totalElapsed instead of absolute lastStartTime
          lastStartTime: null,
        },
      };
      localStorage.setItem(SAVE_KEY, JSON.stringify(toSave));
      // mark that a saved game exists
      setHasSaved(true);
    } catch (e) {
      // ignore storage errors
    }
  }, [state]);

  // Tick every second while the game is active so components that compute
  // elapsed time from Date.now() re-evaluate (elapsedSeconds uses Date.now()).
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (state.paused || state.gameOver || !state.lastStartTime)
      return undefined;
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, [state.paused, state.gameOver, state.lastStartTime]);

  // Calculate elapsed seconds for display
  const elapsedSeconds = useMemo(() => {
    if (state.gameOver || state.paused || !state.lastStartTime) {
      return state.totalElapsed;
    }
    return (
      state.totalElapsed + Math.floor((Date.now() - state.lastStartTime) / 1000)
    );
  }, [
    state.totalElapsed,
    state.lastStartTime,
    state.paused,
    state.gameOver,
    tick,
  ]);

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
    elapsedSeconds,
    // persistence helpers
    hasSaved,
    discardSavedAndRestart,
    // whether a saved state was present at initialization (useful to avoid UI flicker)
    loadedFromStorage: initialLoadedRef.current,
  };
};
