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
      const boardRect = boardRef.current.getBoundingClientRect();
      const gridX = Math.floor((detail.clientX - boardRect.left) / cellSize);
      const gridY = Math.floor((detail.clientY - boardRect.top) / cellSize);
      const position =
        gridX >= 0 && gridX < GRID_WIDTH && gridY >= 0 && gridY < GRID_HEIGHT
          ? { x: gridX, y: gridY }
          : null;
      if (position) {
        onPiecePlace(position, detail.pieceId ?? undefined);
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
        const client = monitor.getClientOffset();
        if (!client) return;
        const boardRect = boardRef.current.getBoundingClientRect();
        const gridX = Math.floor((client.x - boardRect.left) / cellSize);
        const gridY = Math.floor((client.y - boardRect.top) / cellSize);
        const position =
          gridX >= 0 && gridX < GRID_WIDTH && gridY >= 0 && gridY < GRID_HEIGHT
            ? { x: gridX, y: gridY }
            : null;
        setHoverPosition(position);
        if (item && item.piece) setDraggedPiece(item.piece);
      },
      drop: (item: any, monitor: any) => {
        if (!boardRef.current) return;
        const client = monitor.getClientOffset();
        if (!client) return;
        const boardRect = boardRef.current.getBoundingClientRect();
        const gridX = Math.floor((client.x - boardRect.left) / cellSize);
        const gridY = Math.floor((client.y - boardRect.top) / cellSize);
        const position =
          gridX >= 0 && gridX < GRID_WIDTH && gridY >= 0 && gridY < GRID_HEIGHT
            ? { x: gridX, y: gridY }
            : null;
        if (position) {
          onPiecePlace(position, item?.instanceId);
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
    const boardRect = boardRef.current.getBoundingClientRect();
    const gridX = Math.floor((e.clientX - boardRect.left) / cellSize);
    const gridY = Math.floor((e.clientY - boardRect.top) / cellSize);
    const position =
      gridX >= 0 && gridX < GRID_WIDTH && gridY >= 0 && gridY < GRID_HEIGHT
        ? { x: gridX, y: gridY }
        : null;
    setHoverPosition(position);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!selectedPiece || !boardRef.current) return;
    const boardRect = boardRef.current.getBoundingClientRect();
    const gridX = Math.floor((e.clientX - boardRect.left) / cellSize);
    const gridY = Math.floor((e.clientY - boardRect.top) / cellSize);
    const position =
      gridX >= 0 && gridX < GRID_WIDTH && gridY >= 0 && gridY < GRID_HEIGHT
        ? { x: gridX, y: gridY }
        : null;
    if (position) {
      onPiecePlace(position);
    }
    setHoverPosition(null);
    setDraggedPiece(null);
  };

  const handleMouseMove = (event: React.MouseEvent) => {
    // Touch drop for mobile
    const handleTouchEnd = (e: React.TouchEvent) => {
      if (!selectedPiece || !boardRef.current) return;
      const touch = e.changedTouches[0];
      const boardRect = boardRef.current.getBoundingClientRect();
      const gridX = Math.floor((touch.clientX - boardRect.left) / cellSize);
      const gridY = Math.floor((touch.clientY - boardRect.top) / cellSize);
      const position =
        gridX >= 0 && gridX < GRID_WIDTH && gridY >= 0 && gridY < GRID_HEIGHT
          ? { x: gridX, y: gridY }
          : null;
      if (position) {
        onPiecePlace(position);
      }
      setHoverPosition(null);
      setDraggedPiece(null);
    };
    if (!selectedPiece || !boardRef.current) return;

    const boardRect = boardRef.current.getBoundingClientRect();
    const gridX = Math.floor((event.clientX - boardRect.left) / cellSize);
    const gridY = Math.floor((event.clientY - boardRect.top) / cellSize);
    const position =
      gridX >= 0 && gridX < GRID_WIDTH && gridY >= 0 && gridY < GRID_HEIGHT
        ? { x: gridX, y: gridY }
        : null;
    setHoverPosition(position);
  };

  const handleMouseLeave = () => {
    setHoverPosition(null);
  };

  const handleClick = (event: React.MouseEvent) => {
    if (!selectedPiece || !boardRef.current) return;
    const boardRect = boardRef.current.getBoundingClientRect();
    const gridX = Math.floor((event.clientX - boardRect.left) / cellSize);
    const gridY = Math.floor((event.clientY - boardRect.top) / cellSize);
    const position =
      gridX >= 0 && gridX < GRID_WIDTH && gridY >= 0 && gridY < GRID_HEIGHT
        ? { x: gridX, y: gridY }
        : null;

    if (position) {
      onPiecePlace(position);
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
        ref={boardRef}
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
