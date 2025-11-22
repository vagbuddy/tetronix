// Shared game utilities used by frontend and backend

// Piece templates used across frontend/backend
export const TETRIS_PIECES = [
  {
    id: "I",
    shape: [
      [0, 0, 0, 0],
      [1, 1, 1, 1],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ],
  },
  {
    id: "O",
    shape: [
      [1, 1, 0],
      [1, 1, 0],
      [0, 0, 0],
    ],
  },
  {
    id: "T",
    shape: [
      [0, 1, 0],
      [1, 1, 1],
      [0, 0, 0],
    ],
  },
  {
    id: "S",
    shape: [
      [0, 1, 1],
      [1, 1, 0],
      [0, 0, 0],
    ],
  },
  {
    id: "Z",
    shape: [
      [1, 1, 0],
      [0, 1, 1],
      [0, 0, 0],
    ],
  },
  {
    id: "J",
    shape: [
      [1, 0, 0],
      [1, 1, 1],
      [0, 0, 0],
    ],
  },
  {
    id: "L",
    shape: [
      [0, 0, 1],
      [1, 1, 1],
      [0, 0, 0],
    ],
  },
];

export const PENTOMINO_PIECES = [
  {
    id: "I5",
    shape: [
      [0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0],
      [1, 1, 1, 1, 1],
      [0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0],
    ],
  },
  {
    id: "L5",
    shape: [
      [0, 0, 0, 0, 0],
      [0, 1, 0, 0, 0],
      [0, 1, 0, 0, 0],
      [0, 1, 0, 0, 0],
      [0, 1, 1, 0, 0],
    ],
  },
  {
    id: "N5",
    shape: [
      [0, 0, 0, 0, 0],
      [0, 0, 1, 0, 0],
      [0, 1, 1, 0, 0],
      [0, 1, 0, 0, 0],
      [0, 1, 0, 0, 0],
    ],
  },
  {
    id: "P5",
    shape: [
      [0, 0, 0, 0, 0],
      [0, 1, 1, 0, 0],
      [0, 1, 1, 0, 0],
      [0, 1, 0, 0, 0],
      [0, 0, 0, 0, 0],
    ],
  },
  {
    id: "T5",
    shape: [
      [0, 0, 0, 0, 0],
      [0, 1, 1, 1, 0],
      [0, 0, 1, 0, 0],
      [0, 0, 1, 0, 0],
      [0, 0, 0, 0, 0],
    ],
  },
  {
    id: "U5",
    shape: [
      [0, 0, 0, 0, 0],
      [0, 1, 0, 1, 0],
      [0, 1, 1, 1, 0],
      [0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0],
    ],
  },
  {
    id: "V5",
    shape: [
      [0, 0, 0, 0, 0],
      [0, 1, 0, 0, 0],
      [0, 1, 0, 0, 0],
      [0, 1, 1, 1, 0],
      [0, 0, 0, 0, 0],
    ],
  },
  {
    id: "W5",
    shape: [
      [0, 0, 0, 0, 0],
      [0, 1, 0, 0, 0],
      [0, 1, 1, 0, 0],
      [0, 0, 1, 1, 0],
      [0, 0, 0, 0, 0],
    ],
  },
  {
    id: "X5",
    shape: [
      [0, 0, 0, 0, 0],
      [0, 0, 1, 0, 0],
      [0, 1, 1, 1, 0],
      [0, 0, 1, 0, 0],
      [0, 0, 0, 0, 0],
    ],
  },
  {
    id: "Y5",
    shape: [
      [0, 0, 0, 0, 0],
      [0, 0, 1, 0, 0],
      [0, 1, 1, 0, 0],
      [0, 0, 1, 0, 0],
      [0, 0, 1, 0, 0],
    ],
  },
  {
    id: "Z5",
    shape: [
      [0, 0, 0, 0, 0],
      [0, 1, 1, 0, 0],
      [0, 0, 1, 0, 0],
      [0, 0, 1, 1, 0],
      [0, 0, 0, 0, 0],
    ],
  },
  {
    id: "F5",
    shape: [
      [0, 0, 0, 0, 0],
      [0, 0, 1, 1, 0],
      [0, 1, 1, 0, 0],
      [0, 0, 1, 0, 0],
      [0, 0, 0, 0, 0],
    ],
  },
];

export const CHIRAL_IDS = ["F5", "L5", "N5", "P5", "Y5", "Z5"];

export const getTemplateById = (id: string) => {
  return (
    TETRIS_PIECES.find((p) => p.id === id) ||
    PENTOMINO_PIECES.find((p) => p.id === id) ||
    null
  );
};

export const getPiecePool = (difficulty: string) => {
  switch (difficulty) {
    case "expert":
      // expert shows mirrored pentomino variants
      return [
        ...TETRIS_PIECES,
        ...PENTOMINO_PIECES,
        ...PENTOMINO_PIECES.filter((p) => CHIRAL_IDS.includes(p.id)).map(
          (p) => ({
            id: `${p.id}M`,
            shape: p.shape.map((row) => [...row].reverse()),
          })
        ),
      ];
    case "insane":
      return [...TETRIS_PIECES, ...PENTOMINO_PIECES];
    case "master":
    case "casual":
    default:
      return TETRIS_PIECES;
  }
};

// Generate deterministic piece ids using an injected RNG nextInt-like function
export const generateRandomPiecesWithRng = (
  difficulty: string,
  rng: number,
  nextIntFn: (s: number, max: number) => { state: number; value: number },
  count = 3
) => {
  const pool = getPiecePool(difficulty);
  const out: string[] = [];
  let s = rng;
  for (let i = 0; i < count; i++) {
    const sel = nextIntFn(s, pool.length);
    out.push(pool[sel.value].id);
    s = sel.state;
  }
  return { pieces: out, rng: s };
};

// Calculates score based on rows, cols, and sudoku blocks cleared
export const calculateScore = (
  rowsCleared: number,
  colsCleared: number,
  sudokuBlocksCleared: number
): number => {
  // Base score for each type of clear
  const rowScore = rowsCleared * 100;
  const colScore = colsCleared * 100;
  const blockScore = sudokuBlocksCleared * 500;

  const baseScore = rowScore + colScore + blockScore;

  // Calculate combo multiplier based on different types cleared simultaneously
  let clearTypes = 0;
  if (rowsCleared > 0) clearTypes++;
  if (colsCleared > 0) clearTypes++;
  if (sudokuBlocksCleared > 0) clearTypes++;

  // Multiplier: 1x for single type, 2x for two types, 3x for all three types
  const multiplier = clearTypes;

  return baseScore * multiplier;
};

export default { calculateScore };
