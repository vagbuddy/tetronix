import { describe, it, expect } from "vitest";
import { canPlaceAnyPiece, isValidPlacement, flipPiece } from "../GameLogic";
import type { Cell, TetrisPiece } from "../../types/GameTypes";

describe("canPlaceAnyPiece - Z5 insane mode test", () => {
  it("should correctly detect game over when Z5 cannot be placed", () => {
    // Exact board state from user's game
    // 101 101 010
    // 001 101 110
    // 101 111 100
    //
    // 000 111 110
    // 001 010 010
    // 101 011 110
    //
    // 001 101 110
    // 101 111 010
    // 000 100 011
    const grid: Cell[][] = [
      // Row 0: 101 101 010
      [
        { filled: true, color: "#f0f000" },
        { filled: false },
        { filled: true, color: "#f0f000" },
        { filled: true, color: "#f0f000" },
        { filled: false },
        { filled: true, color: "#f0f000" },
        { filled: false },
        { filled: true, color: "#f0f000" },
        { filled: false },
      ],
      // Row 1: 001 101 110
      [
        { filled: false },
        { filled: false },
        { filled: true, color: "#f0f000" },
        { filled: true, color: "#f0f000" },
        { filled: false },
        { filled: true, color: "#f0f000" },
        { filled: true, color: "#f0f000" },
        { filled: true, color: "#f0f000" },
        { filled: false },
      ],
      // Row 2: 101 111 100
      [
        { filled: true, color: "#f0f000" },
        { filled: false },
        { filled: true, color: "#f0f000" },
        { filled: true, color: "#f0f000" },
        { filled: true, color: "#f0f000" },
        { filled: true, color: "#f0f000" },
        { filled: true, color: "#f0f000" },
        { filled: false },
        { filled: false },
      ],
      // Row 3: 000 111 110
      [
        { filled: false },
        { filled: false },
        { filled: false },
        { filled: true, color: "#f0f000" },
        { filled: true, color: "#f0f000" },
        { filled: true, color: "#f0f000" },
        { filled: true, color: "#f0f000" },
        { filled: true, color: "#f0f000" },
        { filled: false },
      ],
      // Row 4: 001 010 010
      [
        { filled: false },
        { filled: false },
        { filled: true, color: "#f0f000" },
        { filled: false },
        { filled: true, color: "#f0f000" },
        { filled: false },
        { filled: false },
        { filled: true, color: "#f0f000" },
        { filled: false },
      ],
      // Row 5: 101 011 110
      [
        { filled: true, color: "#f0f000" },
        { filled: false },
        { filled: true, color: "#f0f000" },
        { filled: false },
        { filled: true, color: "#f0f000" },
        { filled: true, color: "#f0f000" },
        { filled: true, color: "#f0f000" },
        { filled: true, color: "#f0f000" },
        { filled: false },
      ],
      // Row 6: 001 101 110
      [
        { filled: false },
        { filled: false },
        { filled: true, color: "#f0f000" },
        { filled: true, color: "#f0f000" },
        { filled: false },
        { filled: true, color: "#f0f000" },
        { filled: true, color: "#f0f000" },
        { filled: true, color: "#f0f000" },
        { filled: false },
      ],
      // Row 7: 101 111 010
      [
        { filled: true, color: "#f0f000" },
        { filled: false },
        { filled: true, color: "#f0f000" },
        { filled: true, color: "#f0f000" },
        { filled: true, color: "#f0f000" },
        { filled: true, color: "#f0f000" },
        { filled: false },
        { filled: true, color: "#f0f000" },
        { filled: false },
      ],
      // Row 8: 000 100 011
      [
        { filled: false },
        { filled: false },
        { filled: false },
        { filled: true, color: "#f0f000" },
        { filled: false },
        { filled: false },
        { filled: false },
        { filled: true, color: "#f0f000" },
        { filled: true, color: "#f0f000" },
      ],
    ];

    // Z5 pentomino piece - ALREADY ROTATED 90° CW as it appears in insane mode
    // Base shape (rotated 90° CW): 00010, 01110, 01000
    // Flipped shape: 01000, 01110, 00010
    const z5Piece: TetrisPiece = {
      id: "Z5",
      instanceId: "z5-test-1",
      shape: [
        [0, 0, 0, 0, 0],
        [0, 0, 0, 1, 0],
        [0, 1, 1, 1, 0],
        [0, 1, 0, 0, 0],
        [0, 0, 0, 0, 0],
      ],
      color: "#f00000",
      position: { x: 0, y: 0 },
      rotation: 1,
      isPlaced: false,
      isDragging: false,
    };

    const pieces: TetrisPiece[] = [z5Piece];

    // Insane mode: rotation disabled, flip enabled
    const result = canPlaceAnyPiece(pieces, grid, {
      allowRotate: false,
      allowMirror: true,
    });

    console.log(`\nCan place Z5 on board: ${result}`);
    console.log("Expected: false (GAME OVER)\n");

    // Debug: Check base orientation
    console.log("=== Testing Z5 base orientation ===");
    console.log("Shape:");
    for (let r = 0; r < 5; r++) {
      console.log(`  ${z5Piece.shape[r].join("")}`);
    }
    let foundBase = false;
    for (let y = -4; y < 9; y++) {
      for (let x = -4; x < 9; x++) {
        if (isValidPlacement(z5Piece, { x, y }, grid)) {
          console.log(`✓ Base Z5 fits at { x: ${x}, y: ${y} }`);
          foundBase = true;
        }
      }
    }
    if (!foundBase) {
      console.log("✗ Base Z5 cannot be placed anywhere");
    }

    // Debug: Check flipped orientation
    console.log("\n=== Testing Z5 flipped orientation ===");
    const flipped = flipPiece(z5Piece);
    console.log("Flipped shape:");
    for (let r = 0; r < 5; r++) {
      console.log(`  ${flipped.shape[r].join("")}`);
    }
    let foundFlipped = false;
    for (let y = -4; y < 9; y++) {
      for (let x = -4; x < 9; x++) {
        if (isValidPlacement(flipped, { x, y }, grid)) {
          console.log(`✓ Flipped Z5 fits at { x: ${x}, y: ${y} }`);
          foundFlipped = true;
        }
      }
    }
    if (!foundFlipped) {
      console.log("✗ Flipped Z5 cannot be placed anywhere");
    }

    // Visualize grid
    console.log("\n=== Grid State ===");
    for (let row = 0; row < 9; row++) {
      let line = "";
      for (let col = 0; col < 9; col++) {
        line += grid[row][col].filled ? "1" : "0";
        if ((col + 1) % 3 === 0 && col < 8) line += " ";
      }
      console.log(`Row ${row}: ${line}`);
      if ((row + 1) % 3 === 0 && row < 8) console.log("");
    }

    if (!result) {
      console.log("\n✓ CORRECT: Game over detected - no valid placements");
    } else {
      console.log(
        "\n✗ ERROR: Algorithm says piece can be placed, but should be game over!"
      );
    }

    // Test should detect game over (no valid placements)
    expect(result).toBe(false);
  });
});
