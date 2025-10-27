## Quick context

- This is a single-page React + TypeScript app (Create React App). No backend.
- Core gameplay is implemented in `src/hooks/useGameState.ts` (Reducer + actions) and pure helpers in `src/utils/GameLogic.ts`.
- Types are centralized in `src/types/GameTypes.ts` (game state, pieces, grid, actions).

## High-level architecture (what to touch for each change)

- UI & composition: `src/components/*` — `Game.tsx` composes `GameBoard`, `PieceSelection`, and `GameInfo`.
- State & rules: `src/hooks/useGameState.ts` — contains the reducer and dispatchable actions used by components.
- Pure logic & rules: `src/utils/GameLogic.ts` — grid generation, placement validation, rotation, scoring, and block/row clearing. Prefer changing game rules here for predictable behavior and easy unit testing.
- Shape & constants: `GRID_WIDTH`, `GRID_HEIGHT`, `CELL_SIZE`, `TETRIS_PIECES`, and `SUDOKU_BLOCKS` live in `GameLogic.ts`.

## Important patterns & conventions (project-specific)

- Pieces are 3×3 matrices (see `TETRIS_PIECES` in `src/utils/GameLogic.ts`). Rotations are pure functions (`rotatePiece`).
- Each piece instance has `instanceId` (string) used for drag-and-drop identification; dataTransfer stores this id as `'text/plain'` in `PieceSelection.tsx` and `GameBoard.tsx` looks it up on drop.
- Placement API: components call `onPiecePlace(position, pieceId?)` — when dropped, `pieceId` is provided; when clicked, no `pieceId` is passed and the reducer uses the selected piece. See `useGameState` action `'PLACE_PIECE'` for exact behavior.
- Clearing semantics: clearing rows and 3×3 sudoku blocks empties cells without gravity (no falling pieces). This is implemented in `clearRows` and `clearSudokuBlocks` in `GameLogic.ts` and affects score calculation in `calculateScore`.
- Grid coordinates: `x` is column, `y` is row. `getGridPositionFromMouse` maps client coordinates to grid positions used across `GameBoard`.

## Developer workflows & commands

- Start dev server: `npm start` (see `package.json`). App served on http://localhost:3000.
- Run tests: `npm test` (CRA test runner). There are currently no unit tests for logic; add tests pointing at `src/utils/GameLogic.ts` to validate pure functions.
- Build for production: `npm run build`.

## Where to implement common changes

- Change UI or layout: edit components under `src/components/` (e.g., `GameBoard.tsx` for board interactions). The board uses `CELL_SIZE` from `GameLogic.ts` for sizing — keep in sync.
- Change gameplay rules or scoring: edit `src/utils/GameLogic.ts` and update types in `src/types/GameTypes.ts` if shapes/state change.
- Change state flow (actions): edit `src/hooks/useGameState.ts`. The reducer encodes important decisions (e.g., when pieces are regenerated via `generateRandomPieces`).

## Small examples to copy/paste

- Read instanceId in drop handler (found in `src/components/GameBoard.tsx`):
  - `const pieceId = e.dataTransfer.getData('text/plain');` then call `onPiecePlace(position, pieceId)`.
- Validate placement (from reducer flow): call `isValidPlacement(piece, position, grid)` before `placePieceOnGrid`.

## Notes & gotchas

- This app intentionally uses immutable copies of the grid (maps rows/cells) in `GameLogic.ts` — preserve that pattern when changing grid manipulation to avoid subtle shared-state bugs.
- Pieces use `isPlaced` and `isDragging` flags; UI/drag handlers rely on these. If you change drag behavior, update both `PieceSelection` and `useGameState` actions.
- TypeScript `strict: true` is enabled in `tsconfig.json`; keep types in sync when modifying shapes/state.

## If you add tests

- Prefer unit tests for `src/utils/GameLogic.ts` (pure functions). Tests are easiest to author and fast to run.

---

If anything here is unclear or you'd like more detail (examples of patches for scoring changes, a test scaffold for `GameLogic`, or a brief walkthrough of a common code-change), tell me which area to expand.
