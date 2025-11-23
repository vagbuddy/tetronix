// Move of api/recalcRunner.mjs into tools/ for developer utilities.
// Usage: `node tools/recalcRunner.mjs` (runs built reconstructOnly)
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const reconstructOnlyPath = path.join(__dirname, 'reconstructOnly.mjs');

(async () => {
  try {
    const mod = await import(pathToFileURL(reconstructOnlyPath).href);
    if (!mod.reconstructScore) {
      console.error('reconstructScore not exported from reconstructOnly.mjs');
      process.exit(2);
    }

    // Full moves array provided by user (kept inline for deterministic test)
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

    const expectedScore = 1500; // from user-provided moves
    const score = mod.reconstructScore(moves);
    console.log('Recalculated score =', score);
    if (score === expectedScore) {
      console.log('PASS: score matches expected', expectedScore);
      process.exit(0);
    } else {
      console.error('FAIL: expected', expectedScore, 'but got', score);
      process.exit(1);
    }
  } catch (err) {
    console.error('Error running recalculation test:', err);
    process.exit(3);
  }
})();
