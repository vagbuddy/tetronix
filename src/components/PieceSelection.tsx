import React from "react";
import { TetrisPiece } from "../types/GameTypes";
import { getPieceCells, CELL_SIZE } from "../utils/GameLogic";
import "./PieceSelection.css";

interface PieceSelectionProps {
  pieces: TetrisPiece[];
  selectedPiece: TetrisPiece | null;
  onPieceClick: (piece: TetrisPiece) => void;
  onPieceRotate: (pieceId: string) => void;
  onStartDrag: (piece: TetrisPiece) => void;
  onEndDrag: () => void;
}

const PieceSelection: React.FC<PieceSelectionProps> = ({
  pieces,
  selectedPiece,
  onPieceClick,
  onPieceRotate,
  onStartDrag,
  onEndDrag,
}) => {
  const renderPiece = (piece: TetrisPiece) => {
    const isSelected = selectedPiece?.instanceId === piece.instanceId;
    const isPlaced = piece.isPlaced;

    const handleDragStart = (e: React.DragEvent) => {
      if (isPlaced) {
        e.preventDefault();
        return;
      }
      e.dataTransfer.setData("text/plain", piece.instanceId);
      e.dataTransfer.effectAllowed = "copy";
      onStartDrag(piece);
    };

    const handleDragEnd = () => {
      onEndDrag();
    };

    return (
      <div
        key={piece.instanceId}
        className={`piece-container ${isSelected ? "selected" : ""} ${
          isPlaced ? "placed" : ""
        }`}
        onClick={() => !isPlaced && onPieceClick(piece)}
        draggable={!isPlaced}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="piece-header">
          <span className="piece-name">{piece.id}</span>
          {!isPlaced && (
            <button
              className="rotate-button"
              onClick={(e) => {
                e.stopPropagation();
                onPieceRotate(piece.instanceId);
              }}
            >
              ↻
            </button>
          )}
        </div>

        <div
          className="piece-preview"
          style={{
            width: 3 * CELL_SIZE * 0.5,
            height: 3 * CELL_SIZE * 0.5,
            position: "relative",
          }}
        >
          {piece.shape.map((row, rowIndex) =>
            row.map((cell, colIndex) => (
              <div
                key={`${rowIndex}-${colIndex}`}
                className="preview-cell"
                style={{
                  position: "absolute",
                  left: colIndex * CELL_SIZE * 0.5,
                  top: rowIndex * CELL_SIZE * 0.5,
                  width: CELL_SIZE * 0.5,
                  height: CELL_SIZE * 0.5,
                  backgroundColor: cell ? piece.color : "transparent",
                  border: cell ? "1px solid #444" : "none",
                  opacity: isPlaced ? 0.3 : 1,
                }}
              />
            ))
          )}
        </div>

        {isPlaced && <div className="placed-indicator">✓</div>}
      </div>
    );
  };

  return (
    <div className="piece-selection">
      <h3>Available Pieces</h3>
      <div className="pieces-container">{pieces.map(renderPiece)}</div>
    </div>
  );
};

export default PieceSelection;
