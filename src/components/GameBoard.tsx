import React, { useRef, useState, useEffect, useCallback } from "react";
import { useDrop } from "react-dnd/dist/hooks/useDrop";
import { Cell, TetrisPiece } from "../types/GameTypes";
import {
  getPieceCells,
  GRID_WIDTH,
  GRID_HEIGHT,
  CELL_SIZE,
  SUDOKU_BLOCKS,
} from "../utils/GameLogic";
import "./GameBoard.css";

interface GameBoardProps {
  grid: Cell[][];
  selectedPiece: TetrisPiece | null;
  availablePieces: TetrisPiece[];
  onPiecePlace: (position: { x: number; y: number }, pieceId?: string) => void;
  onPieceDeselect: () => void;
}

const GameBoard: React.FC<GameBoardProps> = ({
  grid,
  selectedPiece,
  availablePieces,
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

  const getTopLeftFromClient = (
    clientX: number,
    clientY: number,
    piece?: TetrisPiece | null
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

    // Align the piece so its center (in grid coords) is as close as possible to the
    // pointer fractional position. This matches a preview that's centered on the pointer.
    // Compute centered top-left, round to nearest integer, then clamp to board bounds.
    const centerOffsetX = (pw - 1) / 2;
    const centerOffsetY = (ph - 1) / 2;
    // desired occupied-top-left (where the bounding box should be placed)
    let occX = Math.round(fx - centerOffsetX);
    let occY = Math.round(fy - centerOffsetY);
    occX = Math.max(0, Math.min(GRID_WIDTH - pw, occX));
    occY = Math.max(0, Math.min(GRID_HEIGHT - ph, occY));
    // convert occupied-top-left to shape-top-left by subtracting min offsets
    const shapeX = occX - minCol;
    const shapeY = occY - minRow;
    // clamp shape top-left so shape indices remain within board
    const minShapeX = -minCol;
    const maxShapeX = GRID_WIDTH - (maxCol + 1);
    const minShapeY = -minRow;
    const maxShapeY = GRID_HEIGHT - (maxRow + 1);
    const finalX = Math.max(minShapeX, Math.min(maxShapeX, shapeX));
    const finalY = Math.max(minShapeY, Math.min(maxShapeY, shapeY));
    return { x: finalX, y: finalY };
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
      };
      if (!detail || !boardRef.current) return;
      const piece =
        availablePieces.find((p) => p.instanceId === detail.pieceId) ||
        selectedPiece;
      const topLeft = getTopLeftFromClient(
        detail.clientX,
        detail.clientY,
        piece
      );
      if (topLeft) {
        onPiecePlace(topLeft, detail.pieceId ?? undefined);
      }
      setHoverPosition(null);
      setDraggedPiece(null);
    };
    window.addEventListener(
      "sudoku-tetris-piece-drop",
      handleExternalDrop as EventListener
    );
    return () => window.removeEventListener("resize", updateCellSize);
  }, []);

  // react-dnd drop target: handles hover and drop when using react-dnd backends
  const [, drop] = useDrop<any, any, { isOver: boolean }>(
    () => ({
      accept: "PIECE",
      hover: (item: any, monitor: any) => {
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
        if (item && item.piece) setDraggedPiece(item.piece);
      },
      drop: (item: any, monitor: any) => {
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
        if (topLeft) {
          onPiecePlace(topLeft, item?.instanceId);
        }
        setHoverPosition(null);
        setDraggedPiece(null);
      },
    }),
    [cellSize]
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
    if (!selectedPiece || !boardRef.current) return;
    const topLeft = getTopLeftFromClient(e.clientX, e.clientY, selectedPiece);
    setHoverPosition(topLeft);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!selectedPiece || !boardRef.current) return;
    const topLeft = getTopLeftFromClient(e.clientX, e.clientY, selectedPiece);
    if (topLeft) {
      onPiecePlace(topLeft);
    }
    setHoverPosition(null);
    setDraggedPiece(null);
  };

  const handleMouseMove = (event: React.MouseEvent) => {
    // Touch drop for mobile
    const handleTouchEnd = (e: React.TouchEvent) => {
      if (!selectedPiece || !boardRef.current) return;
      const touch = e.changedTouches[0];
      const topLeft = getTopLeftFromClient(
        touch.clientX,
        touch.clientY,
        selectedPiece
      );
      if (topLeft) {
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
  };

  const handleClick = (event: React.MouseEvent) => {
    if (!selectedPiece || !boardRef.current) return;
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
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";

    if (!boardRef.current) return;

    const boardRect = boardRef.current.getBoundingClientRect();
    const gridX = Math.floor((e.clientX - boardRect.left) / cellSize);
    const gridY = Math.floor((e.clientY - boardRect.top) / cellSize);
    const position =
      gridX >= 0 && gridX < GRID_WIDTH && gridY >= 0 && gridY < GRID_HEIGHT
        ? { x: gridX, y: gridY }
        : null;
    setHoverPosition(position);

    // Find the dragged piece by instanceId
    const pieceId = e.dataTransfer.getData("text/plain");
    if (pieceId && !draggedPiece) {
      const piece = availablePieces.find((p) => p.instanceId === pieceId);
      if (piece) {
        setDraggedPiece(piece);
      }
    }
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

    const boardRect = boardRef.current.getBoundingClientRect();
    const gridX = Math.floor((e.clientX - boardRect.left) / cellSize);
    const gridY = Math.floor((e.clientY - boardRect.top) / cellSize);
    const position =
      gridX >= 0 && gridX < GRID_WIDTH && gridY >= 0 && gridY < GRID_HEIGHT
        ? { x: gridX, y: gridY }
        : null;

    if (position) {
      onPiecePlace(position, pieceId);
    }

    setHoverPosition(null);
    setDraggedPiece(null);
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

    return getPieceCells(piece, hoverPosition).map((pos, index) => (
      <div
        key={`hover-${index}`}
        className="hover-piece"
        style={{
          position: "absolute",
          left: pos.x * cellSize,
          top: pos.y * cellSize,
          width: cellSize,
          height: cellSize,
          backgroundColor: piece.color,
          opacity: 0.6,
          border: "2px dashed #fff",
          zIndex: 5,
          pointerEvents: "none",
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
        {renderHoverPiece()}
      </div>
    </div>
  );
};

export default GameBoard;
