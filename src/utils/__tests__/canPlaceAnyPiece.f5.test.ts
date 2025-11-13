import { describe, it, expect } from "vitest";
import { canPlaceAnyPiece, PENTOMINO_PIECES } from "../GameLogic";
import type { TetrisPiece } from "../../types/GameTypes";
import { gridFromLines } from "../testHelpers";

describe("canPlaceAnyPiece - F5 edge placement", () => {
  it("finds a valid placement for F5 on the provided board with rotation enabled", () => {
    // Board provided by user, spaces removed per row
    const board = gridFromLines([
      "100111111",
      "100000110",
      "111111110",
      "000111100",
      "000110101",
      "000000000",
      "111101111",
      "111001110",
      "010011111",
    ]);

    const f5Template = PENTOMINO_PIECES.find((p) => p.id === "F5");
    expect(f5Template).toBeTruthy();

    const f5: TetrisPiece = {
      ...f5Template!,
      instanceId: "F5-test",
      isPlaced: false,
      isDragging: false,
      position: { x: 0, y: 0 },
      rotation: 0,
    };

    const can = canPlaceAnyPiece([f5], board, {
      allowRotate: true,
      allowMirror: false,
    });

    expect(can).toBe(true);
  });
});

describe("canPlaceAnyPiece - W5 edge-fit scenario", () => {
  it("returns true because W5 fits with edge padding (base rotation at -1,-1)", () => {
    const board = gridFromLines([
      "001111000",
      "001111110",
      "000001110",
      "011100111",
      "001101111",
      "011101011",
      "000000011",
      "011101011",
      "011000111",
    ]);

    const w5Template = PENTOMINO_PIECES.find((p) => p.id === "W5");
    expect(w5Template).toBeTruthy();
    const w5: TetrisPiece = {
      ...w5Template!,
      instanceId: "W5-test",
      isPlaced: false,
      isDragging: false,
      position: { x: 0, y: 0 },
      rotation: 0,
    };

    // Also compute first found placement for debugging
    const can = canPlaceAnyPiece([w5], board, {
      allowRotate: true,
      allowMirror: false,
    });
    if (can) {
      // brute-force to reveal where it claims it fits
      const GRID_W = 9;
      const GRID_H = 9;
      const rotateCW = (m: number[][]) =>
        m[0].map((_, i) => m.map((r) => r[i]).reverse());
      const allowed = 4;
      for (let rot = 0; rot < allowed; rot++) {
        let shape = w5.shape;
        for (let i = 0; i < rot; i++) shape = rotateCW(shape);
        const sh = shape.length,
          sw = shape[0].length;
        const minY = -(sh - 1),
          maxY = GRID_H - 1;
        const minX = -(sw - 1),
          maxX = GRID_W - 1;
        const fits = (x: number, y: number) => {
          for (let r = 0; r < sh; r++) {
            for (let c = 0; c < sw; c++) {
              if (!shape[r][c]) continue;
              const gx = x + c,
                gy = y + r;
              if (gx < 0 || gx >= GRID_W || gy < 0 || gy >= GRID_H)
                return false;
              if (board[gy][gx].filled) return false;
            }
          }
          return true;
        };
        for (let y = minY; y <= maxY; y++) {
          for (let x = minX; x <= maxX; x++) {
            if (fits(x, y)) {
              // eslint-disable-next-line no-console
              console.log("W5 fits at", { x, y, rot });
              rot = 99; // escape
              break;
            }
          }
        }
      }
    }
    expect(can).toBe(true);
  });
});
