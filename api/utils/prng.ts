// Re-export shared utilities so backend files can import from './utils/prng'
export {
  type RngState,
  generateSeedForUser,
  nextInt,
} from "../../shared/prng.js";
export {
  calculateScore,
  getPiecePool,
  generateRandomPiecesWithRng,
  getTemplateById,
  TETRIS_PIECES,
  PENTOMINO_PIECES,
  CHIRAL_IDS,
} from "../../shared/game.js";
