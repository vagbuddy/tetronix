import React, { useRef, useState, useEffect, useCallback } from "react";
import { useDrop } from "react-dnd/dist/hooks/useDrop";
import { Cell, TetrisPiece } from "../types/GameTypes";
import {
  getPieceCells,
  GRID_WIDTH,
  GRID_HEIGHT,
  CELL_SIZE,
  SUDOKU_BLOCKS,
  isValidPlacement,
} from "../utils/GameLogic";
import "./GameBoard.css";
import { DEBUG_ANCHOR, DEBUG_OVERLAY } from "../config/DebugFlags";

type Anchor = { row: number; col: number };

interface GameBoardProps {
  grid: Cell[][];
  selectedPiece: TetrisPiece | null;
  availablePieces: TetrisPiece[];
  clearingCells?: { x: number; y: number; color?: string }[];
  onPiecePlace: (position: { x: number; y: number }, pieceId?: string) => void;
  onPieceDeselect: () => void;
}

const GameBoard: React.FC<GameBoardProps> = ({
  grid,
  selectedPiece,
  availablePieces,
  clearingCells,
  onPiecePlace,
  onPieceDeselect,
}) => {
  const boardRef = useRef<HTMLDivElement>(null);
  const [hoverPosition, setHoverPosition] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [draggedPiece, setDraggedPiece] = useState<TetrisPiece | null>(null);
  const [cellSize, setCellSize] = useState<number>(CELL_SIZE);
  const [hoverAnchor, setHoverAnchor] = useState<Anchor | null>(null);
  const [isExternalDrag, setIsExternalDrag] = useState<boolean>(false);
  const [suppressClickUntil, setSuppressClickUntil] = useState<number>(0);
  const lastHoverRef = useRef<{
    pos: { x: number; y: number } | null;
    anchor: Anchor | null;
    pieceId: string | null;
  } | null>(null);

  // Refs to hold the latest state for external event handlers
  const gridRef = useRef(grid);
  const availablePiecesRef = useRef(availablePieces);
  const selectedPieceRef = useRef(selectedPiece);
  useEffect(() => {
    gridRef.current = grid;
  }, [grid]);
  useEffect(() => {
    availablePiecesRef.current = availablePieces;
  }, [availablePieces]);
  useEffect(() => {
    selectedPieceRef.current = selectedPiece;
  }, [selectedPiece]);

  const getTopLeftFromClient = (
    clientX: number,
    clientY: number,
    piece?: TetrisPiece | null,
    anchor?: { row: number; col: number } | null
  ) => {
    if (!boardRef.current || !piece) return null;
    const boardRect = boardRef.current.getBoundingClientRect();
    // fractional grid coordinates (may be outside 0..GRID_WIDTH)
    const fx = (clientX - boardRect.left) / cellSize;
    const fy = (clientY - boardRect.top) / cellSize;
    // compute occupied bounding box inside the shape (ignore empty outer rows/cols)
    let minCol = Infinity,
      maxCol = -Infinity,
      minRow = Infinity,
      maxRow = -Infinity;
    for (let r = 0; r < piece.shape.length; r++) {
      for (let c = 0; c < piece.shape[r].length; c++) {
        if (piece.shape[r][c]) {
          minCol = Math.min(minCol, c);
          maxCol = Math.max(maxCol, c);
          minRow = Math.min(minRow, r);
          maxRow = Math.max(maxRow, r);
        }
      }
    }
    if (minCol === Infinity) {
      // empty piece?
      minCol = 0;
      maxCol = 0;
      minRow = 0;
      maxRow = 0;
    }
    const pw = maxCol - minCol + 1;
    const ph = maxRow - minRow + 1;

    let shapeX: number;
    let shapeY: number;
    if (anchor) {
      // Align the selected cell (anchor) of the shape with the grid cell under the pointer
      // Since the pointer is positioned over the center of a cell in the drag preview,
      // use floor to map to the correct grid index rather than rounding to the next cell.
      const occX = Math.floor(fx);
      const occY = Math.floor(fy);
      shapeX = occX - anchor.col;
      shapeY = occY - anchor.row;
    } else {
      // Center the piece on the pointer by default
      const centerOffsetX = (pw - 1) / 2;
      const centerOffsetY = (ph - 1) / 2;
      // Use floor instead of round so skinny shapes (like vertical I with pw=1)
      // can reach board edges consistently.
      const occX = Math.floor(fx - centerOffsetX);
      const occY = Math.floor(fy - centerOffsetY);
      // convert occupied-top-left to shape-top-left by subtracting min offsets
      shapeX = occX - minCol;
      shapeY = occY - minRow;
    }
    // Do NOT clamp shape top-left here. Allow the shape's zero-cells to go
    // outside the board. Placement will be validated later by checking that
    // all filled (1) cells are within bounds.
    return { x: shapeX, y: shapeY };
  };

  useEffect(() => {
    const updateCellSize = () => {
      const containerWidth =
        boardRef.current?.parentElement?.clientWidth || window.innerWidth;
      const maxBoardWidth = Math.min(
        GRID_WIDTH * CELL_SIZE,
        containerWidth - 40
      );
      const calculated = Math.max(20, Math.floor(maxBoardWidth / GRID_WIDTH));
      setCellSize(calculated);
    };

    updateCellSize();
    window.addEventListener("resize", updateCellSize);
    // listen for touch-drop events from PieceSelection (custom drop for pointer/touch drags)
    const handleExternalDrop = (ev: Event) => {
      const custom = ev as CustomEvent;
      const detail = custom.detail as {
        clientX: number;
        clientY: number;
        pieceId: string | null;
        anchorRow?: number;
        anchorCol?: number;
      };
      if (!detail || !boardRef.current) return;
      // Ignore drops that occur outside the board bounds
      const rect = boardRef.current.getBoundingClientRect();
      const inside =
        detail.clientX >= rect.left &&
        detail.clientX <= rect.right &&
        detail.clientY >= rect.top &&
        detail.clientY <= rect.bottom;
      if (!inside) {
        setHoverPosition(null);
        setDraggedPiece(null);
        setHoverAnchor(null);
        setIsExternalDrag(false);
        lastHoverRef.current = null;
        return;
      }
      const piece =
        availablePiecesRef.current.find(
          (p) => p.instanceId === detail.pieceId
        ) || selectedPieceRef.current;
      // Strict: only place where the shadow was last shown; if none, do not place
      const topLeft = lastHoverRef.current?.pos;
      if (
        topLeft &&
        piece &&
        isValidPlacement(piece, topLeft, gridRef.current)
      ) {
        onPiecePlace(topLeft, detail.pieceId ?? undefined);
      }
      setHoverPosition(null);
      setDraggedPiece(null);
      setHoverAnchor(null);
      setIsExternalDrag(false);
      // Prevent the synthetic click that follows touchend from placing again
      setSuppressClickUntil(Date.now() + 400);
      lastHoverRef.current = null;
    };
    const handleExternalHover = (ev: Event) => {
      const custom = ev as CustomEvent;
      const detail = custom.detail as {
        clientX: number;
        clientY: number;
        pieceId: string | null;
        anchorRow?: number;
        anchorCol?: number;
      };
      if (!detail || !boardRef.current) return;
      // Clear hover if pointer is outside the board bounds
      const rect = boardRef.current.getBoundingClientRect();
      const inside =
        detail.clientX >= rect.left &&
        detail.clientX <= rect.right &&
        detail.clientY >= rect.top &&
        detail.clientY <= rect.bottom;
      if (!inside) {
        setHoverPosition(null);
        setHoverAnchor(null);
        setIsExternalDrag(true); // still dragging, but not over board
        lastHoverRef.current = null;
        return;
      }
      const piece =
        availablePiecesRef.current.find(
          (p) => p.instanceId === detail.pieceId
        ) || selectedPieceRef.current;
      const topLeft = getTopLeftFromClient(
        detail.clientX,
        detail.clientY,
        piece,
        detail.anchorRow !== undefined && detail.anchorCol !== undefined
          ? { row: detail.anchorRow, col: detail.anchorCol }
          : null
      );
      setHoverPosition(topLeft);
      if (piece) setDraggedPiece(piece);
      if (detail.anchorRow !== undefined && detail.anchorCol !== undefined) {
        setHoverAnchor({ row: detail.anchorRow, col: detail.anchorCol });
      }
      // Record the last valid hover so drop can use exactly what was shown
      lastHoverRef.current = {
        pos: topLeft,
        anchor:
          detail.anchorRow !== undefined && detail.anchorCol !== undefined
            ? { row: detail.anchorRow, col: detail.anchorCol }
            : null,
        pieceId: detail.pieceId ?? null,
      };
    };
    window.addEventListener(
      "sudoku-tetris-piece-drop",
      handleExternalDrop as EventListener
    );
    window.addEventListener(
      "sudoku-tetris-piece-hover",
      handleExternalHover as EventListener
    );
    return () => {
      window.removeEventListener("resize", updateCellSize);
      window.removeEventListener(
        "sudoku-tetris-piece-drop",
        handleExternalDrop as EventListener
      );
      window.removeEventListener(
        "sudoku-tetris-piece-hover",
        handleExternalHover as EventListener
      );
    };
  }, []);

  // react-dnd drop target: handles hover and drop when using react-dnd backends
  const [, drop] = useDrop<any, any, { isOver: boolean }>(
    () => ({
      accept: "PIECE",
      hover: (item: any, monitor: any) => {
        if (isExternalDrag) return; // don't let dnd override touch-hover
        if (!boardRef.current) return;
        // obtain client coords from monitor with multiple fallbacks
        let client: { x: number; y: number } | null = null;
        if (monitor.getClientOffset) {
          client = monitor.getClientOffset();
        }
        if (!client && monitor.getSourceClientOffset) {
          client = monitor.getSourceClientOffset();
        }
        if (
          !client &&
          monitor.getInitialClientOffset &&
          monitor.getDifferenceFromInitialOffset
        ) {
          const init = monitor.getInitialClientOffset();
          const diff = monitor.getDifferenceFromInitialOffset();
          if (init && diff) {
            client = { x: init.x + diff.x, y: init.y + diff.y };
          }
        }
        if (!client) return;
        const piece = item?.piece || selectedPiece;
        const topLeft = getTopLeftFromClient(client.x, client.y, piece);
        setHoverPosition(topLeft);
        // Record last hover for consistent drop == shadow
        lastHoverRef.current = {
          pos: topLeft,
          anchor: null,
          pieceId: item?.instanceId || selectedPiece?.instanceId || null,
        };
        if (item && item.piece) setDraggedPiece(item.piece);
      },
      drop: (item: any, monitor: any) => {
        if (isExternalDrag) return; // use external drop path
        if (!boardRef.current) return;
        // obtain client coords from monitor with multiple fallbacks
        let client: { x: number; y: number } | null = null;
        if (monitor.getClientOffset) {
          client = monitor.getClientOffset();
        }
        if (!client && monitor.getSourceClientOffset) {
          client = monitor.getSourceClientOffset();
        }
        if (
          !client &&
          monitor.getInitialClientOffset &&
          monitor.getDifferenceFromInitialOffset
        ) {
          const init = monitor.getInitialClientOffset();
          const diff = monitor.getDifferenceFromInitialOffset();
          if (init && diff) {
            client = { x: init.x + diff.x, y: init.y + diff.y };
          }
        }
        const piece = item?.piece || selectedPiece;
        // Strict: place exactly where the shadow last was
        const topLeft = lastHoverRef.current?.pos || hoverPosition;
        if (topLeft && piece && isValidPlacement(piece, topLeft, grid)) {
          onPiecePlace(topLeft, item?.instanceId);
        }
        setHoverPosition(null);
        setDraggedPiece(null);
        lastHoverRef.current = null;
      },
    }),
    [cellSize, isExternalDrag, grid, selectedPiece]
  );

  // attach both boardRef and react-dnd drop ref to the board div
  const setBoardRef = useCallback(
    (node: HTMLDivElement | null) => {
      boardRef.current = node;
      if (node) drop(node);
    },
    [drop]
  );

  // Pointer drag for mobile/desktop
  const handlePointerMove = (e: React.PointerEvent) => {
    // During mobile/touch drags we drive hover via external custom events
    // to keep anchor alignment; don't override with centered math here.
    if ((e as any).pointerType === "touch" || isExternalDrag) return;
    // During react-dnd drags, use the dnd hover computations; don't override
    if (draggedPiece) return;
    if (!selectedPiece || !boardRef.current) return;
    const topLeft = getTopLeftFromClient(e.clientX, e.clientY, selectedPiece);
    setHoverPosition(topLeft);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!boardRef.current) return;
    // Avoid double placement when using external touch drag/drop
    if ((e as any).pointerType === "touch" || isExternalDrag) {
      setHoverPosition(null);
      setDraggedPiece(null);
      setHoverAnchor(null);
      return;
    }
    if (!selectedPiece) return;
    const topLeft = getTopLeftFromClient(e.clientX, e.clientY, selectedPiece);
    if (topLeft && isValidPlacement(selectedPiece, topLeft, grid)) {
      onPiecePlace(topLeft);
    }
    setHoverPosition(null);
    setDraggedPiece(null);
    setHoverAnchor(null);
  };

  const handleMouseMove = (event: React.MouseEvent) => {
    if (isExternalDrag) return; // don't override touch-driven hover
    if (draggedPiece) return; // don't override react-dnd hover
    // Touch drop for mobile
    const handleTouchEnd = (e: React.TouchEvent) => {
      if (!selectedPiece || !boardRef.current) return;
      const touch = e.changedTouches[0];
      const topLeft = getTopLeftFromClient(
        touch.clientX,
        touch.clientY,
        selectedPiece
      );
      if (topLeft && isValidPlacement(selectedPiece, topLeft, grid)) {
        onPiecePlace(topLeft);
      }
      setHoverPosition(null);
      setDraggedPiece(null);
    };
    if (!selectedPiece || !boardRef.current) return;
    const topLeft = getTopLeftFromClient(
      event.clientX,
      event.clientY,
      selectedPiece
    );
    setHoverPosition(topLeft);
  };

  const handleMouseLeave = () => {
    setHoverPosition(null);
    setHoverAnchor(null);
    setIsExternalDrag(false);
  };

  const handleClick = (event: React.MouseEvent) => {
    // Ignore click if coming from an external drag flow or within suppression window
    if (
      isExternalDrag ||
      draggedPiece ||
      Date.now() < suppressClickUntil ||
      !selectedPiece ||
      !boardRef.current
    )
      return;
    // For click placement we use the top-left computed from the click position
    const topLeft = getTopLeftFromClient(
      event.clientX,
      event.clientY,
      selectedPiece
    );
    if (topLeft) {
      onPiecePlace(topLeft);
    } else {
      onPieceDeselect();
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    if (isExternalDrag) return; // ignore native dragover during touch flow
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";

    if (!boardRef.current) return;

    // Prefer using our consistent positioning helper so skinny pieces (like vertical I)
    // can reach edges by allowing negative shape top-left when needed.
    const pieceId = e.dataTransfer.getData("text/plain");
    const piece =
      (pieceId && availablePieces.find((p) => p.instanceId === pieceId)) ||
      selectedPiece ||
      null;
    const topLeft = getTopLeftFromClient(
      e.clientX,
      e.clientY,
      piece || undefined
    );
    setHoverPosition(topLeft);
    // Record last hover for native path as well
    lastHoverRef.current = {
      pos: topLeft,
      anchor: null,
      pieceId: piece?.instanceId || null,
    };
    if (piece && !draggedPiece) setDraggedPiece(piece);
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDragLeave = (e: React.DragEvent) => {
    // Only clear hover if we're actually leaving the board
    if (!boardRef.current?.contains(e.relatedTarget as Node)) {
      setHoverPosition(null);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();

    const pieceId = e.dataTransfer.getData("text/plain");
    if (!boardRef.current) return;

    // Use the same helper as hover so drop == shadow, including edge reaches
    const piece =
      (pieceId && availablePieces.find((p) => p.instanceId === pieceId)) ||
      selectedPiece ||
      null;
    const topLeft = lastHoverRef.current?.pos;
    if (topLeft && piece && isValidPlacement(piece, topLeft, grid)) {
      onPiecePlace(topLeft, pieceId);
    }

    setHoverPosition(null);
    setDraggedPiece(null);
    lastHoverRef.current = null;
  };

  const renderCell = (cell: Cell, row: number, col: number) => {
    const isHovered =
      hoverPosition &&
      selectedPiece &&
      getPieceCells(selectedPiece, hoverPosition).some(
        (pos) => pos.x === col && pos.y === row
      );

    const cellStyle = {
      width: cellSize,
      height: cellSize,
      backgroundColor: cell.filled ? cell.color : "#2a2a2a",
      border: "1px solid #444",
      position: "relative" as const,
    };

    return (
      <div
        key={`${row}-${col}`}
        className={`cell ${cell.filled ? "filled" : ""} ${
          isHovered ? "hovered" : ""
        }`}
        style={cellStyle}
      />
    );
  };

  const renderSudokuBlockBorders = () => {
    return SUDOKU_BLOCKS.map((block, index) => (
      <div
        key={`block-${index}`}
        className="sudoku-block-border"
        style={{
          position: "absolute",
          left: block.startCol * cellSize,
          top: block.startRow * cellSize,
          width: 3 * cellSize,
          height: 3 * cellSize,
          border: "2px solid #666",
          pointerEvents: "none",
          zIndex: 1,
        }}
      />
    ));
  };

  const renderHoverPiece = () => {
    if (!hoverPosition) return null;

    // Use selectedPiece for click mode, or find piece by ID for drag mode
    const piece = selectedPiece || draggedPiece;

    if (!piece) return null;
    const nodes: React.ReactNode[] = [];
    for (let r = 0; r < piece.shape.length; r++) {
      for (let c = 0; c < piece.shape[r].length; c++) {
        if (!piece.shape[r][c]) continue;
        const isAnchor =
          DEBUG_ANCHOR &&
          hoverAnchor &&
          r === hoverAnchor.row &&
          c === hoverAnchor.col;
        nodes.push(
          <div
            key={`hover-${r}-${c}`}
            className={`hover-piece ${isAnchor ? "anchor-debug" : ""}`}
            style={{
              position: "absolute",
              left: (hoverPosition.x + c) * cellSize,
              top: (hoverPosition.y + r) * cellSize,
              width: cellSize,
              height: cellSize,
              backgroundColor: piece.color,
              opacity: 0.6,
              border: "2px dashed #fff",
              zIndex: 5,
              pointerEvents: "none",
            }}
          />
        );
      }
    }
    return nodes;
  };

  const renderClearingOverlay = () => {
    if (!clearingCells || clearingCells.length === 0) return null;
    return clearingCells.map((cell, idx) => (
      <div
        key={`clearing-${idx}`}
        className="clearing-cell"
        data-color={cell.color}
        style={{
          position: "absolute",
          left: cell.x * cellSize,
          top: cell.y * cellSize,
          width: cellSize,
          height: cellSize,
          animation: "cellClearFade 0.45s ease-out forwards",
          pointerEvents: "none",
          zIndex: 6,
          borderRadius: 4,
          boxShadow: "0 0 6px rgba(255,255,255,0.6)",
        }}
      />
    ));
  };

  return (
    <div className="game-board-container">
      <div
        ref={setBoardRef}
        className="game-board"
        style={{
          position: "relative",
          width: GRID_WIDTH * cellSize,
          height: GRID_HEIGHT * cellSize,
          border: "2px solid #fff",
          backgroundColor: "#1a1a1a",
          cursor: selectedPiece ? "crosshair" : "default",
        }}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onClick={handleClick}
        onDragOver={handleDragOver}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        {renderSudokuBlockBorders()}
        {grid.map((row, rowIndex) =>
          row.map((cell, colIndex) => renderCell(cell, rowIndex, colIndex))
        )}
        {renderClearingOverlay()}
        {renderHoverPiece()}
      </div>
      {DEBUG_OVERLAY && (
        <div className="debug-overlay">
          {(() => {
            const piece = selectedPiece || draggedPiece;
            const oob =
              piece && hoverPosition
                ? getPieceCells(piece, hoverPosition).filter(
                    (pos) =>
                      pos.x < 0 ||
                      pos.x >= GRID_WIDTH ||
                      pos.y < 0 ||
                      pos.y >= GRID_HEIGHT
                  ).length
                : null;
            return (
              <div className="row">
                <span className="label">oob:</span> {oob ?? "-"}
              </div>
            );
          })()}
          <div className="row">
            <span className="label">hover:</span>{" "}
            {hoverPosition ? `x:${hoverPosition.x}, y:${hoverPosition.y}` : "-"}
          </div>
          <div className="row">
            <span className="label">anchor:</span>{" "}
            {hoverAnchor ? `r:${hoverAnchor.row}, c:${hoverAnchor.col}` : "-"}
          </div>
          <div className="row">
            <span className="label">lastHover:</span>{" "}
            {lastHoverRef.current?.pos
              ? `x:${lastHoverRef.current?.pos?.x}, y:${lastHoverRef.current?.pos?.y}`
              : "-"}
          </div>
          <div className="row">
            <span className="label">lastAnchor:</span>{" "}
            {lastHoverRef.current?.anchor
              ? `r:${lastHoverRef.current?.anchor?.row}, c:${lastHoverRef.current?.anchor?.col}`
              : "-"}
          </div>
          <div className="row">
            <span className="label">piece:</span>{" "}
            {selectedPiece?.instanceId || draggedPiece?.instanceId || "-"}
          </div>
        </div>
      )}
    </div>
  );
};

export default GameBoard;
