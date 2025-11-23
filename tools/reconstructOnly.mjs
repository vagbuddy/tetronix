// Minimal standalone reconstructScore implementation for developer tools
// Located in tools/ so test/debug helpers are grouped together.
import path from 'path';
import { pathToFileURL, fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Compiled assets live under api/dist after building the api package
const distShared = path.join(__dirname, '..', 'api', 'dist', 'shared', 'game.js');
const distPrng = path.join(__dirname, '..', 'api', 'dist', 'api', 'utils', 'prng.js');

const { calculateScore } = await import(pathToFileURL(distShared).href);
const { getTemplateById, CHIRAL_IDS } = await import(pathToFileURL(distPrng).href);

export function reconstructScore(moves) {
  const GRID_WIDTH = 9;
  const GRID_HEIGHT = 9;

  if (!Array.isArray(moves)) return 0;

  const rotateMatrixCW = (matrix) => matrix[0].map((_, index) => matrix.map((row) => row[index]).reverse());
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

  const createEmptyGrid = () => Array(GRID_HEIGHT).fill(null).map(() => Array(GRID_WIDTH).fill(null).map(() => ({ filled: false })));

  const isValidPlacement = (shape, position, grid) => {
    const cells = getPieceCells(shape, position);
    return cells.every((cell) => {
      if (cell.x < 0 || cell.x >= GRID_WIDTH || cell.y < 0 || cell.y >= GRID_HEIGHT) return false;
      return !grid[cell.y][cell.x].filled;
    });
  };

  const placePieceOnGrid = (grid, shape, position) => {
    const newGrid = grid.map((row) => row.map((cell) => ({ ...cell })));
    const cells = getPieceCells(shape, position);
    for (const cell of cells) {
      if (cell.y >= 0 && cell.y < GRID_HEIGHT && cell.x >= 0 && cell.x < GRID_WIDTH) {
        newGrid[cell.y][cell.x] = { filled: true };
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
        blocks.push({ cells });
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

  let grid = createEmptyGrid();
  let totalRows = 0, totalCols = 0, totalBlocks = 0;
  let totalScore = 0;

  for (let mi = 0; mi < moves.length; mi++) {
    const move = moves[mi];
    console.log(`\nMove ${mi}:`, { pieceId: move.pieceId, rotation: move.rotation, isMirrored: move.isMirrored, x: move.x, y: move.y });
    const { pieceId, rotation = 0, isMirrored = false, x, y } = move;
    const tmpl = getTemplateById(pieceId);
    if (!tmpl) return -1;

    let shape = tmpl.shape.map((r) => [...r]);
    const id = tmpl.id;
    let allowed = 4;
    if (id === 'O' || id === 'X5') allowed = 1;
    else if (['I','S','Z','I5','Z5'].includes(id)) allowed = 2;

    let rot = rotation % allowed;
    if (rot < 0) rot += allowed;

    if (allowed === 2) {
      if (rot === 1) shape = rotateMatrixCW(shape);
    } else {
      for (let r = 0; r < rot; r++) shape = rotateMatrixCW(shape);
    }

    if (isMirrored && CHIRAL_IDS.includes(id)) shape = flipMatrixHorizontal(shape);

    const pos = { x, y };
    const valid = isValidPlacement(shape, pos, grid);
    console.log(`  placement valid: ${valid}`);
    if (!valid) {
      console.log('  Invalid placement at move', mi, '-> returning -1');
      return -1;
    }

    grid = placePieceOnGrid(grid, shape, pos);

    const fullRows = checkFullRows(grid);
    const fullCols = checkFullCols(grid);
    const fullBlocks = checkFullSudokuBlocks(grid);
    console.log(`  clears -> rows:${fullRows.length}, cols:${fullCols.length}, blocks:${fullBlocks.length}`);

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

    // Add per-move score (client adds calculateScore per placement)
    if (fullRows.length > 0 || fullCols.length > 0 || fullBlocks.length > 0) {
      totalScore += calculateScore(fullRows.length, fullCols.length, fullBlocks.length);
    }

    console.log(`  totals so far -> rows:${totalRows}, cols:${totalCols}, blocks:${totalBlocks}`);
  }

  console.log('\nFinal totals:', { totalRows, totalCols, totalBlocks, finalScore: totalScore });
  return totalScore;
}
