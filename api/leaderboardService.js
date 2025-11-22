// Background service to process stored game results and update leaderboard
// Run with: node api/leaderboardService.js

import { initializeApp, credential as _credential, firestore } from 'firebase-admin';
import { calculateScore, nextInt, generateRandomPiecesWithRng, getPiecePool, getTemplateById, CHIRAL_IDS } from './utils/prng';


// Initialize Firebase
import serviceAccount from './service-account.json';
initializeApp({
  credential: _credential.cert(serviceAccount),
});

const db = firestore();

// Verify that the sequence of placed pieceIds could have been produced by the seed+difficulty
// Uses shared `generateRandomPiecesWithRng` (which expects a nextInt-like function)
const verifyMovesMatchSeed = (moves, difficulty, seed) => {
  if (!Array.isArray(moves)) return { valid: false, reason: 'no_moves' };
  let s = seed;
  let gen = generateRandomPiecesWithRng(difficulty, s, nextInt, 3);
  let available = [...gen.pieces];
  s = gen.rng;

  for (const move of moves) {
    const pid = move.pieceId;
    const idx = available.indexOf(pid);
    if (idx === -1) {
      return { valid: false, reason: 'piece_not_in_available', expected: available.slice(0, 6) };
    }
    // consume piece
    available.splice(idx, 1);
    // when pool exhausted, regenerate
    if (available.length === 0) {
      const g = generateRandomPiecesWithRng(difficulty, s, nextInt, 3);
      available = [...g.pieces];
      s = g.rng;
    }
  }
  return { valid: true };
};

// Helper: Reconstruct score from moves by replaying placements on a 9x9 grid.
// This mirrors the frontend `GameLogic` placement behavior (rotation, mirror,
// placement, and clears). It does not rely on the seed for piece sequence; it
// validates moves by applying the move's `pieceId`, `rotation`, `isMirrored`,
// and `x,y` to the grid and computes clears the same way the frontend does.
function reconstructScore(moves) {
  const GRID_WIDTH = 9;
  const GRID_HEIGHT = 9;

  if (!Array.isArray(moves)) return 0;

  // Use shared piece templates and helpers from `./utils/prng`/`shared/game`
  // `getTemplateById`, `getPiecePool`, `generateRandomPiecesWithRng`, and `CHIRAL_IDS`
  // are imported at the top of this file and should be used here to avoid
  // duplication and divergence between frontend/backend logic.

  const rotateMatrixCW = (matrix) =>
    matrix[0].map((_, index) => matrix.map((row) => row[index]).reverse());
  const rotateMatrixCCW = (matrix) => rotateMatrixCW(rotateMatrixCW(rotateMatrixCW(matrix)));
  const flipMatrixHorizontal = (matrix) => matrix.map((row) => [...row].reverse());

  const getPieceCells = (shape, position) => {
    const pos = position || { x: 0, y: 0 };
    const cells = [];
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
      .map(() => Array(GRID_WIDTH).fill(null).map(() => ({ filled: false })));

  const isValidPlacement = (shape, position, grid) => {
    const cells = getPieceCells(shape, position);
    return cells.every((cell) => {
      if (cell.x < 0 || cell.x >= GRID_WIDTH || cell.y < 0 || cell.y >= GRID_HEIGHT) return false;
      return !grid[cell.y][cell.x].filled;
    });
  };

  const placePieceOnGrid = (grid, shape, position, color) => {
    const newGrid = grid.map((row) => row.map((cell) => ({ ...cell })));
    const cells = getPieceCells(shape, position);
    for (const cell of cells) {
      if (cell.y >= 0 && cell.y < GRID_HEIGHT && cell.x >= 0 && cell.x < GRID_WIDTH) {
        newGrid[cell.y][cell.x] = { filled: true, color: color || '#000' };
      }
    }
    return newGrid;
  };

  const checkFullRows = (grid) => {
    const fullRows = [];
    for (let r = 0; r < GRID_HEIGHT; r++) if (grid[r].every((c) => c.filled)) fullRows.push(r);
    return fullRows;
  };
  const checkFullCols = (grid) => {
    const fullCols = [];
    for (let c = 0; c < GRID_WIDTH; c++) if (grid.every((row) => row[c].filled)) fullCols.push(c);
    return fullCols;
  };
  const SUDOKU_BLOCKS = (() => {
    const blocks = [];
    for (let br = 0; br < 3; br++) {
      for (let bc = 0; bc < 3; bc++) {
        const cells = [];
        for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) cells.push({ x: bc * 3 + c, y: br * 3 + r });
        blocks.push({ startRow: bc * 3, startCol: br * 3, cells });
      }
    }
    return blocks;
  })();

  const checkFullSudokuBlocks = (grid) => {
    const full = [];
    for (const block of SUDOKU_BLOCKS) if (block.cells.every((cell) => grid[cell.y][cell.x].filled)) full.push(block);
    return full;
  };

  const clearRows = (grid, rows) => {
    const newGrid = grid.map((row) => row.map((cell) => ({ ...cell })));
    for (const r of rows) for (let c = 0; c < GRID_WIDTH; c++) newGrid[r][c] = { filled: false };
    return newGrid;
  };
  const clearCols = (grid, cols) => {
    const newGrid = grid.map((row) => row.map((cell) => ({ ...cell })));
    for (const c of cols) for (let r = 0; r < GRID_HEIGHT; r++) newGrid[r][c] = { filled: false };
    return newGrid;
  };
  const clearSudokuBlocks = (grid, blocks) => {
    const newGrid = grid.map((row) => row.map((cell) => ({ ...cell })));
    for (const block of blocks) for (const cell of block.cells) newGrid[cell.y][cell.x] = { filled: false };
    return newGrid;
  };

  // Replay moves
  let grid = createEmptyGrid();
  let totalRows = 0, totalCols = 0, totalBlocks = 0;

  for (const move of moves) {
    // Expect move to have pieceId, rotation, isMirrored, x, y
    const { pieceId, rotation = 0, isMirrored = false, x, y } = move;
    const tmpl = getTemplateById(pieceId);
    if (!tmpl) {
      // Unknown piece id => invalid
      return -1; // mark as invalid
    }

    // Build rotated/mirrored shape according to rotation count
    let shape = tmpl.shape.map((r) => [...r]);
    // Determine allowed rotations: most pieces allow 4, some 2, some 1
    const id = tmpl.id;
    let allowed = 4;
    if (id === 'O' || id === 'X5') allowed = 1;
    else if (['I','S','Z','I5','Z5'].includes(id)) allowed = 2;

    // Normalize rotation into 0..allowed-1
    let rot = rotation % allowed;
    if (rot < 0) rot += allowed;

    if (allowed === 2) {
      // For 2-orientation pieces, treat rotation 0->1 as CW, 1->0 as CCW when needed
      if (rot === 1) shape = rotateMatrixCW(shape);
    } else {
      for (let r = 0; r < rot; r++) shape = rotateMatrixCW(shape);
    }

    if (isMirrored && CHIRAL_IDS.includes(id)) {
      shape = flipMatrixHorizontal(shape);
    }

    const pos = { x: x, y: y };
    // Validate placement
    if (!isValidPlacement(shape, pos, grid)) {
      return -1; // invalid placement => cheat
    }

    // Place piece
    grid = placePieceOnGrid(grid, shape, pos);

    // Check clears
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
  }

  // Compute final score using shared calculateScore function
  return calculateScore(totalRows, totalCols, totalBlocks);
}

export async function processGames() {
  // Fetch all results from Firestore (collection: 'results')
  const resultsSnap = await db.collection('results').get();
  let updated = 0, checked = 0;
  for (const doc of resultsSnap.docs) {
    const result = doc.data();
    checked++;
    const { moves, score, name, difficulty = 'casual', uid, seed } = result;

    // Recalculate score by replaying moves
    const recalculatedScore = reconstructScore(moves);

    // Verify that moves match seed-generated piece sequence
    const seedCheck = verifyMovesMatchSeed(moves, difficulty, seed);

    if (recalculatedScore === -1) {
      // Invalid placements detected during replay
      await db.collection('results').doc(doc.id).update({
        verified: false,
        verifyReason: 'invalid_placement',
        recalculatedScore: -1,
        verifiedAt: firestore.FieldValue.serverTimestamp(),
      }).catch(() => {});
      console.log(`Invalid placement for result ${doc.id}`);
      continue;
    }

    if (!seedCheck.valid) {
      // Seed / piece sequence mismatch
      await db.collection('results').doc(doc.id).update({
        verified: false,
        verifyReason: seedCheck.reason,
        recalculatedScore,
        verifyDetails: seedCheck.expected ? { expected: seedCheck.expected } : undefined,
        verifiedAt: firestore.FieldValue.serverTimestamp(),
      }).catch(() => {});
      console.log(`Seed mismatch for result ${doc.id}: reason=${seedCheck.reason}`);
      continue;
    }

    if (score === recalculatedScore) {
      // Score is valid and seed matches — add to leaderboard
      const leaderboardDocId = `${uid}_${seed}`;
      await db.collection('leaderboard').doc(leaderboardDocId).set({
        uid,
        seed,
        name: (name || 'Player').slice(0, 24),
        difficulty: difficulty || 'casual',
        score,
        createdAt: result.createdAt || firestore.FieldValue.serverTimestamp(),
      }, { merge: true });
      // mark as verified
      await db.collection('results').doc(doc.id).update({
        verified: true,
        verifiedAt: firestore.FieldValue.serverTimestamp(),
      }).catch(() => {});
      updated++;
    } else {
      // Score mismatch
      await db.collection('results').doc(doc.id).update({
        verified: false,
        verifyReason: 'score_mismatch',
        recalculatedScore,
        verifiedAt: firestore.FieldValue.serverTimestamp(),
      }).catch(() => {});
      console.log(`Invalid score for result ${doc.id}: stored=${score}, recalculated=${recalculatedScore}`);
    }
  }
  console.log(`Checked ${checked} results, updated ${updated} leaderboard entries.`);
}

// NOTE: Do not auto-run `processGames` when this module is imported. The
// server will import and call `processGames()` explicitly. If you want to run
// this file standalone for debugging, run it with `node api/leaderboardService.js`.
