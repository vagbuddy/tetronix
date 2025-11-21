// Background service to process stored game results and update leaderboard
// Run with: node api/leaderboardService.js
// Schedule every 20 minutes (e.g. with cron: */20 * * * * node /path/to/leaderboardService.js)

import { initializeApp, credential as _credential, firestore } from 'firebase-admin';
import { calculateScore } from './utils/prng';

// Initialize Firebase
import serviceAccount from './service-account.json';
initializeApp({
  credential: _credential.cert(serviceAccount),
});

const db = firestore();

// Helper: Reconstruct score from moves (stub, needs real logic)
function reconstructScore(moves) {
  // This should match the frontend's logic for calculating score from moves
  // For now, just a placeholder: count clears in moves
  let rowsCleared = 0, colsCleared = 0, sudokuBlocksCleared = 0;
  if (!Array.isArray(moves)) return 0;
  for (const move of moves) {
    // You must adjust this logic to match your real move structure
    if (move.rowsCleared) rowsCleared += move.rowsCleared;
    if (move.colsCleared) colsCleared += move.colsCleared;
    if (move.sudokuBlocksCleared) sudokuBlocksCleared += move.sudokuBlocksCleared;
  }
  return calculateScore(rowsCleared, colsCleared, sudokuBlocksCleared);
}

async function processGames() {
  // Fetch all results from Firestore (collection: 'results')
  const resultsSnap = await db.collection('results').get();
  let updated = 0, checked = 0;
  for (const doc of resultsSnap.docs) {
    const result = doc.data();
    checked++;
    const { moves, score, name, difficulty, uid, seed } = result;
    // TODO: Validate seed and moves as needed
    const recalculatedScore = reconstructScore(moves);
    if (score === recalculatedScore) {
      // Score is valid, add to leaderboard (collection: 'leaderboard')
      const leaderboardDocId = `${uid}_${seed}`;
      await db.collection('leaderboard').doc(leaderboardDocId).set({
        uid,
        seed,
        name: (name || 'Player').slice(0, 24),
        difficulty: difficulty || 'casual',
        score,
        createdAt: result.createdAt || firestore.FieldValue.serverTimestamp(),
      }, { merge: true });
      updated++;
    } else {
      console.log(`Invalid score for result ${doc.id}: stored=${score}, recalculated=${recalculatedScore}`);
    }
  }
  console.log(`Checked ${checked} results, updated ${updated} leaderboard entries.`);
}

processGames().then(() => {
  console.log('Leaderboard update complete.');
  process.exit(0);
}).catch(err => {
  console.error('Error updating leaderboard:', err);
  process.exit(1);
});
