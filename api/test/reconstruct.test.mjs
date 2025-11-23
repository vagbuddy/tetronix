import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { test } from 'node:test';
import assert from 'node:assert/strict';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const mod = await import(pathToFileURL(path.join(__dirname, '..', '..', 'tools', 'reconstructOnly.mjs')).href);
if (!mod.reconstructScore) throw new Error('reconstructScore not exported from reconstructOnly.mjs');

const moves = [
  { isMirrored: false, pieceId: "I", rotation: 1, x: 6, y: 5 },
  { isMirrored: false, pieceId: "I", rotation: 0, x: 4, y: 7 },
  { isMirrored: false, pieceId: "Z", rotation: 1, x: 2, y: 6 },
  { isMirrored: false, pieceId: "L", rotation: 0, x: 0, y: 7 },
  { isMirrored: false, pieceId: "I", rotation: 1, x: -1, y: 1 },
  { isMirrored: false, pieceId: "L", rotation: 0, x: 5, y: 0 },
  { isMirrored: false, pieceId: "Z", rotation: 0, x: 0, y: 5 },
  { isMirrored: false, pieceId: "O", rotation: 0, x: 0, y: 7 },
  { isMirrored: false, pieceId: "J", rotation: 2, x: 5, y: 6 },
  { isMirrored: false, pieceId: "L", rotation: 1, x: 2, y: 6 },
  { isMirrored: false, pieceId: "O", rotation: 0, x: 5, y: 6 },
  { isMirrored: false, pieceId: "L", rotation: 2, x: 6, y: 3 },
  { isMirrored: false, pieceId: "S", rotation: 1, x: 3, y: 3 },
  { isMirrored: false, pieceId: "L", rotation: 1, x: 3, y: 0 },
  { isMirrored: false, pieceId: "J", rotation: 2, x: 6, y: 1 },
  { isMirrored: false, pieceId: "J", rotation: 1, x: -1, y: 0 },
  { isMirrored: false, pieceId: "L", rotation: 1, x: 1, y: 3 },
  { isMirrored: false, pieceId: "L", rotation: 1, x: 1, y: 0 },
  { isMirrored: false, pieceId: "L", rotation: 3, x: 2, y: 2 },
  { isMirrored: false, pieceId: "T", rotation: 1, x: 0, y: 0 },
  { isMirrored: false, pieceId: "L", rotation: 1, x: 6, y: 5 },
  { isMirrored: false, pieceId: "J", rotation: 2, x: 5, y: 1 },
  { isMirrored: false, pieceId: "I", rotation: 1, x: 5, y: 5 },
  { isMirrored: false, pieceId: "J", rotation: 1, x: 6, y: 1 },
  { isMirrored: false, pieceId: "I", rotation: 0, x: 5, y: -1 }
];

test('reconstructOnly reproduces expected score', () => {
  const expected = 1500;
  const score = mod.reconstructScore(moves);
  assert.strictEqual(score, expected);
});
