// Background service to process stored game results and update leaderboard
// Implemented in TypeScript so the API can import it with full type support.

import { createRequire } from "module";
const require = createRequire(import.meta.url);
const admin = require("firebase-admin");
import {
  calculateScore,
  nextInt,
  generateRandomPiecesWithRng,
  getPiecePool,
  getTemplateById,
  CHIRAL_IDS,
} from "./utils/prng.js";

// Initialize Firebase (load service account JSON at runtime to avoid JSON import assertions)
// Require that the environment provides Google application default credentials
// via `GOOGLE_APPLICATION_CREDENTIALS` (recommended and secure).
if (!admin.apps || admin.apps.length === 0) {
  if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    throw new Error(
      "GOOGLE_APPLICATION_CREDENTIALS is not set. In Docker, mount your service account to /app/service-account.json and set GOOGLE_APPLICATION_CREDENTIALS=/app/service-account.json"
    );
  }

  // Use application default credentials so the SDK reads the file referenced by the env var
  admin.initializeApp({ credential: admin.credential.applicationDefault() });
} else {
  // already initialized by the main server; reuse the existing app
  // this can happen because the server imports this module dynamically
}

const db = admin.firestore();

type SeedCheck =
  | { valid: true }
  | {
      valid: false;
      reason: string;
      expected?: string[];
      trace?: Array<{
        step: number;
        offered: string[];
        picked?: string;
        rngBefore: number;
      }>;
    };

// Verify that the sequence of placed pieceIds could have been produced by the seed+difficulty
const verifyMovesMatchSeed = (
  moves: any,
  difficulty: string,
  seed: number
): SeedCheck => {
  if (!Array.isArray(moves)) return { valid: false, reason: "no_moves" };
  let s = seed;
  const trace: Array<{
    step: number;
    offered: string[];
    picked?: string;
    rngBefore: number;
  }> = [];

  // initial pool: replicate client RNG consumption semantics so server matches
  // the client exactly (client consumes an extra RNG value for rotation when
  // rotations are disabled in difficulties like 'master' and 'insane').
  const generatePiecesFromSeed = (
    difficulty: string,
    seed: number,
    count = 3
  ) => {
    const pool = getPiecePool(difficulty);
    const out: string[] = [];
    let state = seed;
    const rotationsDisabled =
      difficulty === "master" || difficulty === "insane";
    for (let i = 0; i < count; i++) {
      const sel = nextInt(state, pool.length);
      out.push(pool[sel.value].id);
      state = sel.state;
      if (rotationsDisabled) {
        const rot = nextInt(state, 4);
        state = rot.state;
      }
    }
    return { pieces: out, rng: state };
  };

  // initial pool
  let gen = generatePiecesFromSeed(difficulty, s, 3);
  let available = [...gen.pieces];
  s = gen.rng;

  for (let i = 0; i < moves.length; i++) {
    const move = moves[i];
    const pid = move.pieceId;
    // record state before pick
    trace.push({
      step: i,
      offered: available.slice(0, available.length),
      picked: pid,
      rngBefore: s,
    });
    const idx = available.indexOf(pid);
    if (idx === -1) {
      return {
        valid: false,
        reason: "piece_not_in_available",
        expected: available.slice(0, 6),
        trace,
      };
    }
    // consume piece
    available.splice(idx, 1);
    // when pool exhausted, regenerate
    if (available.length === 0) {
      const g = generatePiecesFromSeed(difficulty, s, 3);
      available = [...g.pieces];
      s = g.rng;
    }
  }
  return { valid: true };
};

export function reconstructScore(moves: any): number {
  const GRID_WIDTH = 9;
  const GRID_HEIGHT = 9;

  if (!Array.isArray(moves)) return 0;

  const rotateMatrixCW = (matrix: any[]) =>
    matrix[0].map((_: any, index: number) =>
      matrix.map((row: any) => row[index]).reverse()
    );
  const rotateMatrixCCW = (matrix: any[]) =>
    rotateMatrixCW(rotateMatrixCW(rotateMatrixCW(matrix)));
  const flipMatrixHorizontal = (matrix: any[]) =>
    matrix.map((row: any[]) => [...row].reverse());

  const getPieceCells = (shape: any[], position?: { x: number; y: number }) => {
    const pos = position || { x: 0, y: 0 };
    const cells: { x: number; y: number }[] = [];
    for (let row = 0; row < shape.length; row++) {
      for (let col = 0; col < shape[row].length; col++) {
        if (shape[row][col]) cells.push({ x: pos.x + col, y: pos.y + row });
      }
    }
    return cells;
  };

  const createEmptyGrid = () =>
    Array(GRID_HEIGHT)
      .fill(null)
      .map(() =>
        Array(GRID_WIDTH)
          .fill(null)
          .map(() => ({ filled: false }))
      );

  const isValidPlacement = (
    shape: any[],
    position: { x: number; y: number },
    grid: any[]
  ) => {
    const cells = getPieceCells(shape, position);
    return cells.every((cell) => {
      if (
        cell.x < 0 ||
        cell.x >= GRID_WIDTH ||
        cell.y < 0 ||
        cell.y >= GRID_HEIGHT
      )
        return false;
      return !grid[cell.y][cell.x].filled;
    });
  };

  const placePieceOnGrid = (
    grid: any[],
    shape: any[],
    position: { x: number; y: number },
    color?: string
  ) => {
    const newGrid = grid.map((row: any[]) =>
      row.map((cell: any) => ({ ...cell }))
    );
    const cells = getPieceCells(shape, position);
    for (const cell of cells) {
      if (
        cell.y >= 0 &&
        cell.y < GRID_HEIGHT &&
        cell.x >= 0 &&
        cell.x < GRID_WIDTH
      ) {
        newGrid[cell.y][cell.x] = { filled: true, color: color || "#000" };
      }
    }
    return newGrid;
  };

  const checkFullRows = (grid: any[]) => {
    const fullRows: number[] = [];
    for (let r = 0; r < GRID_HEIGHT; r++)
      if (grid[r].every((c: any) => c.filled)) fullRows.push(r);
    return fullRows;
  };
  const checkFullCols = (grid: any[]) => {
    const fullCols: number[] = [];
    for (let c = 0; c < GRID_WIDTH; c++)
      if (grid.every((row: any[]) => row[c].filled)) fullCols.push(c);
    return fullCols;
  };

  const SUDOKU_BLOCKS = (() => {
    const blocks: any[] = [];
    for (let br = 0; br < 3; br++) {
      for (let bc = 0; bc < 3; bc++) {
        const cells: { x: number; y: number }[] = [];
        for (let r = 0; r < 3; r++)
          for (let c = 0; c < 3; c++)
            cells.push({ x: bc * 3 + c, y: br * 3 + r });
        blocks.push({ startRow: bc * 3, startCol: br * 3, cells });
      }
    }
    return blocks;
  })();

  const checkFullSudokuBlocks = (grid: any[]) => {
    const full: any[] = [];
    for (const block of SUDOKU_BLOCKS)
      if (block.cells.every((cell: any) => grid[cell.y][cell.x].filled))
        full.push(block);
    return full;
  };

  const clearRows = (grid: any[], rows: number[]) => {
    const newGrid = grid.map((row: any[]) =>
      row.map((cell: any) => ({ ...cell }))
    );
    for (const r of rows)
      for (let c = 0; c < GRID_WIDTH; c++) newGrid[r][c] = { filled: false };
    return newGrid;
  };
  const clearCols = (grid: any[], cols: number[]) => {
    const newGrid = grid.map((row: any[]) =>
      row.map((cell: any) => ({ ...cell }))
    );
    for (const c of cols)
      for (let r = 0; r < GRID_HEIGHT; r++) newGrid[r][c] = { filled: false };
    return newGrid;
  };
  const clearSudokuBlocks = (grid: any[], blocks: any[]) => {
    const newGrid = grid.map((row: any[]) =>
      row.map((cell: any) => ({ ...cell }))
    );
    for (const block of blocks)
      for (const cell of block.cells)
        newGrid[cell.y][cell.x] = { filled: false };
    return newGrid;
  };

  let grid = createEmptyGrid();
  let totalRows = 0,
    totalCols = 0,
    totalBlocks = 0;
  let totalScore = 0;

  for (const move of moves) {
    const { pieceId, rotation = 0, isMirrored = false, x, y } = move;
    const tmpl = getTemplateById(pieceId);
    if (!tmpl) return -1;

    let shape = tmpl.shape.map((r: any[]) => [...r]);
    const id = tmpl.id;
    let allowed = 4;
    if (id === "O" || id === "X5") allowed = 1;
    else if (["I", "S", "Z", "I5", "Z5"].includes(id)) allowed = 2;

    let rot = rotation % allowed;
    if (rot < 0) rot += allowed;

    if (allowed === 2) {
      if (rot === 1) shape = rotateMatrixCW(shape);
    } else {
      for (let r = 0; r < rot; r++) shape = rotateMatrixCW(shape);
    }

    if (isMirrored && CHIRAL_IDS.includes(id))
      shape = flipMatrixHorizontal(shape);

    const pos = { x, y };
    if (!isValidPlacement(shape, pos, grid)) return -1;

    grid = placePieceOnGrid(grid, shape, pos);

    const fullRows = checkFullRows(grid);
    const fullCols = checkFullCols(grid);
    const fullBlocks = checkFullSudokuBlocks(grid);

    if (fullRows.length > 0) {
      grid = clearRows(grid, fullRows);
      totalRows += fullRows.length;
    }
    if (fullCols.length > 0) {
      grid = clearCols(grid, fullCols);
      totalCols += fullCols.length;
    }
    if (fullBlocks.length > 0) {
      grid = clearSudokuBlocks(grid, fullBlocks);
      totalBlocks += fullBlocks.length;
    }

    // Add score for this move (calculate per-move, then sum). This mirrors client
    // behavior which applies calculateScore to the clears produced by each placement.
    if (fullRows.length > 0 || fullCols.length > 0 || fullBlocks.length > 0) {
      totalScore += calculateScore(
        fullRows.length,
        fullCols.length,
        fullBlocks.length
      );
    }
  }

  return totalScore;
}

export async function processGames(): Promise<void> {
  const resultsSnap = await db.collection("results").get();
  let updated = 0,
    checked = 0;
  for (const doc of resultsSnap.docs) {
    const result = doc.data();
    checked++;
    const {
      moves,
      score,
      name,
      difficulty = "casual",
      uid,
      seed,
    } = result as any;

    const recalculatedScore = reconstructScore(moves);
    const seedCheck = verifyMovesMatchSeed(moves, difficulty, seed);

    if (recalculatedScore === -1) {
      await db
        .collection("results")
        .doc(doc.id)
        .update({
          verified: false,
          verifyReason: "invalid_placement",
          recalculatedScore: -1,
          verifiedAt: admin.firestore.FieldValue.serverTimestamp(),
        })
        .catch(() => {});
      console.log(`Invalid placement for result ${doc.id}`);
      continue;
    }

    if (!seedCheck.valid) {
      await db
        .collection("results")
        .doc(doc.id)
        .update({
          verified: false,
          verifyReason: seedCheck.reason,
          recalculatedScore,
          verifyDetails:
            seedCheck.expected || seedCheck.trace
              ? {
                  expected: seedCheck.expected,
                  trace: seedCheck.trace,
                }
              : undefined,
          verifiedAt: admin.firestore.FieldValue.serverTimestamp(),
        })
        .catch(() => {});
      console.log(
        `Seed mismatch [${seed}] for result ${doc.id}: reason=${seedCheck.reason}`
      );
      continue;
    }

    if (score === recalculatedScore) {
      const leaderboardDocId = `${uid}_${seed}`;
      await db
        .collection("leaderboard")
        .doc(leaderboardDocId)
        .set(
          {
            uid,
            seed,
            name: (name || "Player").slice(0, 24),
            difficulty: difficulty || "casual",
            score,
            createdAt:
              result.createdAt || admin.firestore.FieldValue.serverTimestamp(),
          },
          { merge: true }
        );
      await db
        .collection("results")
        .doc(doc.id)
        .update({
          verified: true,
          verifiedAt: admin.firestore.FieldValue.serverTimestamp(),
        })
        .catch(() => {});
      updated++;
    } else {
      await db
        .collection("results")
        .doc(doc.id)
        .update({
          verified: false,
          verifyReason: "score_mismatch",
          recalculatedScore,
          verifiedAt: admin.firestore.FieldValue.serverTimestamp(),
        })
        .catch(() => {});
      console.log(
        `Invalid score for result ${doc.id}: stored=${score}, recalculated=${recalculatedScore}`
      );
    }
  }
  console.log(
    `Checked ${checked} results, updated ${updated} leaderboard entries.`
  );
}
