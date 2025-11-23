import fs from 'fs';
import path from 'path';
import { pathToFileURL, fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dataPath = path.join(__dirname, '..', 'api', 'test', 'results.json');
const raw = fs.readFileSync(dataPath, 'utf8');
const all = JSON.parse(raw);

// Import nextInt and reconstruct helper
const prngPath = path.join(__dirname, '..', 'api', 'dist', 'shared', 'prng.js');
const gameDistPath = path.join(__dirname, '..', 'api', 'dist', 'shared', 'game.js');
const { nextInt } = await import(pathToFileURL(prngPath).href);
const { getPiecePool } = await import(pathToFileURL(gameDistPath).href);

// Import reconstructScore from tools/reconstructOnly.mjs
const reconstructPath = path.join(__dirname, 'reconstructOnly.mjs');
const { reconstructScore } = await import(pathToFileURL(reconstructPath).href);

function generatePiecesFromSeed(difficulty, seed, count = 3) {
  const pool = getPiecePool(difficulty);
  const out = [];
  let state = seed;
  const rotationsDisabled = difficulty === 'master' || difficulty === 'insane';
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
}

function verifyMoves(moves, difficulty, seed) {
  if (!Array.isArray(moves)) return { valid: false, reason: 'no_moves' };
  let s = seed;
  const trace = [];

  const gen = generatePiecesFromSeed(difficulty, s, 3);
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
      const g = generatePiecesFromSeed(difficulty, s, 3);
      available = [...g.pieces];
      s = g.rng;
    }
  }
  return { valid: true, trace };
}

let total = 0, passed = 0, failed = 0;
for (const [docId, result] of Object.entries(all)) {
  total++;
  console.log('\n=== Result:', docId, '===');
  const { moves, seed, difficulty, score } = result;
  const rec = reconstructScore(moves);
  console.log(' Reconstructed score:', rec, ' Stored score:', score);
  const scoreMatch = rec === score;
  console.log(' Score match:', scoreMatch);

  const seedCheck = verifyMoves(moves, difficulty || 'casual', seed);
  console.log(' Seed check valid:', seedCheck.valid);
  if (!seedCheck.valid) {
    console.log('  Reason:', seedCheck.reason);
    console.log('  Expected (offered at failure):', seedCheck.expected);
    const failing = seedCheck.trace[seedCheck.trace.length - 1];
    console.log('  Failing step:', failing.step);
    console.log('  Offered:', JSON.stringify(failing.offered));
    console.log('  Picked:', failing.picked);
  }

  if (scoreMatch && seedCheck.valid) {
    console.log(' => VALID result');
    passed++;
  } else {
    console.log(' => INVALID result');
    failed++;
  }
}

console.log('\nSummary: total=', total, 'passed=', passed, 'failed=', failed);
