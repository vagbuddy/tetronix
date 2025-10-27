import React, { useRef, useState } from "react";
import { Cell, TetrisPiece } from "../types/GameTypes";
import {
  getPieceCells,
  GRID_WIDTH,
  GRID_HEIGHT,
  CELL_SIZE,
  SUDOKU_BLOCKS,
  getGridPositionFromMouse,
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

  const handleMouseMove = (event: React.MouseEvent) => {
    if (!selectedPiece || !boardRef.current) return;

    const boardRect = boardRef.current.getBoundingClientRect();
    const position = getGridPositionFromMouse(
      event.clientX,
      event.clientY,
      boardRect
    );
    setHoverPosition(position);
  };

  const handleMouseLeave = () => {
    setHoverPosition(null);
  };

  const handleClick = (event: React.MouseEvent) => {
    if (!selectedPiece || !boardRef.current) return;

    const boardRect = boardRef.current.getBoundingClientRect();
    const position = getGridPositionFromMouse(
      event.clientX,
      event.clientY,
      boardRect
    );

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
    const position = getGridPositionFromMouse(e.clientX, e.clientY, boardRect);
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
    const position = getGridPositionFromMouse(e.clientX, e.clientY, boardRect);

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
      width: CELL_SIZE,
      height: CELL_SIZE,
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
          left: block.startCol * CELL_SIZE,
          top: block.startRow * CELL_SIZE,
          width: 3 * CELL_SIZE,
          height: 3 * CELL_SIZE,
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
          left: pos.x * CELL_SIZE,
          top: pos.y * CELL_SIZE,
          backgroundColor: piece.color,
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
          width: GRID_WIDTH * CELL_SIZE,
          height: GRID_HEIGHT * CELL_SIZE,
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
