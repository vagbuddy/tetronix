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
import { startGame, verifySeed } from "../utils/leaderboard";

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
      startTime: typeof s.startTime === "number" ? s.startTime : undefined,
      endTime: typeof s.endTime === "number" ? s.endTime : undefined,
      clearingCells: [],
      difficulty: s.difficulty,
      seed: typeof s.seed === "number" ? s.seed : randomSeed(),
      rng: typeof s.rng === "number" ? s.rng : randomSeed(),
      moveLog: Array.isArray(s.moveLog) ? s.moveLog : [],
      seedFromServer: !!s.seedFromServer,
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
  startTime: undefined,
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
        timestamp: new Date(),
      };

      // Set startTime only on first move
      const isFirstMove = state.moveLog.length === 0;
      return {
        ...state,
        grid: finalGrid,
        availablePieces: nextPieces,
        selectedPiece: null,
        score: state.score + scoreIncrease,
        clearsCount: state.clearsCount + totalClears,
        clearingCells,
        gameOver: !canContinue,
        endTime: !canContinue ? Date.now() : state.endTime,
        rng: nextRng,
        moveLog: [...state.moveLog, newMove],
        startTime: isFirstMove ? Date.now() : state.startTime,
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
      return { ...state, paused: true, pausedAt: Date.now() };

    case "RESUME": {
      // When resuming, adjust startTime to exclude time spent paused so
      // the elapsed timer doesn't count the paused duration.
      if (state.pausedAt && typeof state.startTime === "number") {
        const pausedDuration = Date.now() - state.pausedAt;
        return {
          ...state,
          paused: false,
          pausedAt: undefined,
          startTime: state.startTime + pausedDuration,
        };
      }
      return { ...state, paused: false, pausedAt: undefined };
    }

    case "RESTART": {
      const seed = randomSeed();
      const gen = generateRandomPiecesWithRng(state.difficulty, seed);
      return {
        ...initialState,
        difficulty: state.difficulty,
        availablePieces: gen.pieces,
        startTime: undefined,
        pausedAt: undefined,
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
        startTime: undefined,
        pausedAt: undefined,
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
        startTime: undefined,
        pausedAt: undefined,
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
        startTime: undefined,
        pausedAt: undefined,
        seed,
        rng: gen.rng,
        moveLog: [],
        seedFromServer: !!seedFromServer,
      };
    }

    case "CLEARING_DONE":
      return { ...state, clearingCells: [] };

    case "MARK_SEED_VERIFIED":
      if (state.seedFromServer) {
        return state;
      }
      return { ...state, seedFromServer: true };

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
  // Guard to prevent concurrent startGame calls (avoids duplicate server requests
  // and duplicate restarts if UI triggers the action twice rapidly).
  const startGamePendingRef = useRef(false);
  const needsSeedVerification =
    saved && !saved.seedFromServer && typeof saved.seed === "number"
      ? saved.seed
      : null;
  const [pendingSeedVerification, setPendingSeedVerification] = useState<
    number | null
  >(needsSeedVerification);
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
    setPendingSeedVerification(null);
    if (startGamePendingRef.current) return;
    startGamePendingRef.current = true;
    (async () => {
      try {
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
      } finally {
        startGamePendingRef.current = false;
      }
    })();
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
    setPendingSeedVerification(null);
    // restart will reset to initialState but keep difficulty
    dispatch({ type: "RESTART" });
  }, []);

  const continueGame = useCallback(() => {
    dispatch({ type: "CONTINUE_GAME" });
  }, []);

  const setDifficulty = useCallback((difficulty: Difficulty) => {
    setPendingSeedVerification(null);
    if (startGamePendingRef.current) return;
    startGamePendingRef.current = true;
    (async () => {
      try {
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
      } finally {
        startGamePendingRef.current = false;
      }
    })();
  }, []);

  // Re-verify saved seeds that were issued by the server but lacked the flag
  // (e.g., because the initial verification attempt happened offline).
  useEffect(() => {
    if (
      pendingSeedVerification == null ||
      state.seedFromServer ||
      typeof window === "undefined"
    ) {
      return;
    }

    let cancelled = false;
    let retryHandle: number | null = null;
    let attempt = 0;
    const fatalReasons = new Set([
      "seed_not_found",
      "seed_already_used",
      "missing-params",
    ]);

    const scheduleRetry = () => {
      const delay = Math.min(
        60000,
        5000 * Math.pow(2, Math.max(0, attempt - 1))
      );
      retryHandle = window.setTimeout(runVerification, delay);
    };

    const runVerification = async () => {
      attempt += 1;
      const res = await verifySeed(pendingSeedVerification);
      if (cancelled) return;

      if (res?.valid) {
        dispatch({ type: "MARK_SEED_VERIFIED" });
        setPendingSeedVerification(null);
        return;
      }

      if (res?.reason && fatalReasons.has(res.reason)) {
        setPendingSeedVerification(null);
        return;
      }

      scheduleRetry();
    };

    runVerification();

    return () => {
      cancelled = true;
      if (retryHandle != null) {
        clearTimeout(retryHandle);
      }
    };
  }, [pendingSeedVerification, state.seedFromServer, dispatch]);

  useEffect(() => {
    if (state.seedFromServer && pendingSeedVerification !== null) {
      setPendingSeedVerification(null);
    }
  }, [state.seedFromServer, pendingSeedVerification]);

  // Persist meaningful game state to localStorage so users can resume later.
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (skipSaveRef.current) {
      skipSaveRef.current = false;
      return;
    }

    try {
      const payload = {
        state: {
          ...state,
          clearingCells: [],
        },
        version: 1,
        savedAt: Date.now(),
      };
      localStorage.setItem(SAVE_KEY, JSON.stringify(payload));
      setHasSaved(true);
    } catch {
      /* ignore quota errors */
    }
  }, [state]);

  // Auto-clear the clearing overlay after the animation duration
  useEffect(() => {
    if (state.clearingCells.length > 0) {
      const tid = setTimeout(() => dispatch({ type: "CLEARING_DONE" }), 250);
      return () => clearTimeout(tid);
    }
  }, [state.clearingCells.length]);

  // On first mount, try to request a server-issued seed
  useEffect(() => {
    if (initialLoadedRef.current) {
      return;
    }

    if (startGamePendingRef.current) return;
    startGamePendingRef.current = true;

    let cancelled = false;
    (async () => {
      try {
        const res = await startGame();
        if (!cancelled && (res as any)?.seed != null) {
          dispatch({
            type: "RESET_WITH_SEED",
            seed: (res as any).seed,
            seedFromServer: true,
          });
        }
      } finally {
        startGamePendingRef.current = false;
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
    // persistence helpers
    hasSaved,
    discardSavedAndRestart,
    // whether a saved state was present at initialization (useful to avoid UI flicker)
    loadedFromStorage: initialLoadedRef.current,
  };
};
