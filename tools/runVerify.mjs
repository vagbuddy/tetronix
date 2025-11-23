import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const prngPath = path.join(__dirname, '..', 'api', 'dist', 'api', 'utils', 'prng.js');
const { generateRandomPiecesWithRng, getPiecePool } = await import(pathToFileURL(prngPath).href);

// Moves copied from unit test (tools/recalcRunner.mjs)
const moves = [
  { isMirrored: false, pieceId: "I", rotation: 1, timestamp: "2025-11-22T05:08:40.923Z", x: 6, y: 5 },
  { isMirrored: false, pieceId: "I", rotation: 0, timestamp: "2025-11-22T05:08:42.056Z", x: 4, y: 7 },
  { isMirrored: false, pieceId: "Z", rotation: 1, timestamp: "2025-11-22T05:08:43.810Z", x: 2, y: 6 },
  { isMirrored: false, pieceId: "L", rotation: 0, timestamp: "2025-11-22T05:08:45.325Z", x: 0, y: 7 },
  { isMirrored: false, pieceId: "I", rotation: 1, timestamp: "2025-11-22T05:08:48.067Z", x: -1, y: 1 },
  { isMirrored: false, pieceId: "L", rotation: 0, timestamp: "2025-11-22T05:08:49.994Z", x: 5, y: 0 },
  { isMirrored: false, pieceId: "Z", rotation: 0, timestamp: "2025-11-22T05:08:53.912Z", x: 0, y: 5 },
  { isMirrored: false, pieceId: "O", rotation: 0, timestamp: "2025-11-22T05:08:55.956Z", x: 0, y: 7 },
  { isMirrored: false, pieceId: "J", rotation: 2, timestamp: "2025-11-22T05:08:57.912Z", x: 5, y: 6 },
  { isMirrored: false, pieceId: "L", rotation: 1, timestamp: "2025-11-22T05:08:59.830Z", x: 2, y: 6 },
  { isMirrored: false, pieceId: "O", rotation: 0, timestamp: "2025-11-22T05:09:01.462Z", x: 5, y: 6 },
  { isMirrored: false, pieceId: "L", rotation: 2, timestamp: "2025-11-22T05:09:03.761Z", x: 6, y: 3 },
  { isMirrored: false, pieceId: "S", rotation: 1, timestamp: "2025-11-22T05:09:10.082Z", x: 3, y: 3 },
  { isMirrored: false, pieceId: "L", rotation: 1, timestamp: "2025-11-22T05:09:12.293Z", x: 3, y: 0 },
  { isMirrored: false, pieceId: "J", rotation: 2, timestamp: "2025-11-22T05:09:14.755Z", x: 6, y: 1 },
  { isMirrored: false, pieceId: "J", rotation: 1, timestamp: "2025-11-22T05:09:16.983Z", x: -1, y: 0 },
  { isMirrored: false, pieceId: "L", rotation: 1, timestamp: "2025-11-22T05:09:21.791Z", x: 1, y: 3 },
  { isMirrored: false, pieceId: "L", rotation: 1, timestamp: "2025-11-22T05:09:24.199Z", x: 1, y: 0 },
  { isMirrored: false, pieceId: "L", rotation: 3, timestamp: "2025-11-22T05:09:28.213Z", x: 2, y: 2 },
  { isMirrored: false, pieceId: "T", rotation: 1, timestamp: "2025-11-22T05:09:35.331Z", x: 0, y: 0 },
  { isMirrored: false, pieceId: "L", rotation: 1, timestamp: "2025-11-22T05:09:37.483Z", x: 6, y: 5 },
  { isMirrored: false, pieceId: "J", rotation: 2, timestamp: "2025-11-22T05:09:42.175Z", x: 5, y: 1 },
  { isMirrored: false, pieceId: "I", rotation: 1, timestamp: "2025-11-22T05:09:44.651Z", x: 5, y: 5 },
  { isMirrored: false, pieceId: "J", rotation: 1, timestamp: "2025-11-22T05:09:47.549Z", x: 6, y: 1 },
  { isMirrored: false, pieceId: "I", rotation: 0, timestamp: "2025-11-22T05:09:50.895Z", x: 5, y: -1 }
];

const seed = 418034676;
const difficulty = 'master';

function verifyMovesMatchSeed(moves, difficulty, seed) {
  if (!Array.isArray(moves)) return { valid: false, reason: 'no_moves' };
  let s = seed;
  const trace = [];

  let gen = generateRandomPiecesWithRng(difficulty, s, (st, max) => {
    // wrap nextInt call signature for dist import
    return require('url').pathToFileURL('');
  }, 3);
}

// Instead of trying to wrap nextInt via dynamic, import nextInt directly
const prngCorePath = path.join(__dirname, '..', 'api', 'dist', 'shared', 'prng.js');
const { nextInt } = await import(pathToFileURL(prngCorePath).href);

function verifyMoves(moves, difficulty, seed) {
  if (!Array.isArray(moves)) return { valid: false, reason: 'no_moves' };
  let s = seed;
  const trace = [];

  let gen = generateRandomPiecesWithRng(difficulty, s, nextInt, 3);
  let available = [...gen.pieces];
  s = gen.rng;

  for (let i = 0; i < moves.length; i++) {
    const move = moves[i];
    const pid = move.pieceId;
    trace.push({ step: i, offered: available.slice(), picked: pid, rngBefore: s });
    const idx = available.indexOf(pid);
    if (idx === -1) {
      return { valid: false, reason: 'piece_not_in_available', expected: available.slice(0, 6), trace };
    }
    available.splice(idx, 1);
    if (available.length === 0) {
      const g = generateRandomPiecesWithRng(difficulty, s, nextInt, 3);
      available = [...g.pieces];
      s = g.rng;
    }
  }
  return { valid: true, trace };
}

const result = verifyMoves(moves, difficulty, seed);
console.log('Verify result:', JSON.stringify(result, null, 2));

if (!result.valid) {
  const failStep = result.trace[result.trace.length - 1];
  console.log('\nFailing step details:');
  console.log(JSON.stringify(failStep, null, 2));
  console.log('\nAt failure, offered pool was:', failStep.offered);
}
