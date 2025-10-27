import React, { useState, useRef } from "react";
import { createPortal } from "react-dom";
import { DragSourceMonitor } from "react-dnd";
import { useDrag } from "react-dnd/dist/hooks/useDrag";
import { TetrisPiece } from "../types/GameTypes";
import { CELL_SIZE } from "../utils/GameLogic";
import "./PieceSelection.css";

type DragItem = {
  instanceId: string;
  piece: TetrisPiece;
};

interface PieceSelectionProps {
  pieces: TetrisPiece[];
  selectedPiece: TetrisPiece | null;
  onPieceClick: (piece: TetrisPiece) => void;
  onPieceRotate: (pieceId: string) => void;
  onStartDrag: (piece: TetrisPiece) => void;
  onEndDrag: () => void;
}

// Draggable piece component
const DraggablePiece: React.FC<{
  piece: TetrisPiece;
  isSelected: boolean;
  onPieceClick: (piece: TetrisPiece) => void;
  onPieceRotate: (pieceId: string) => void;
  setDraggedPiece: (piece: TetrisPiece | null) => void;
  setPointerPos: (pos: { x: number; y: number } | null) => void;
  onStartDrag: (piece: TetrisPiece) => void;
  onEndDrag: () => void;
}> = ({
  piece,
  isSelected,
  onPieceClick,
  onPieceRotate,
  setDraggedPiece,
  setPointerPos,
  onStartDrag,
  onEndDrag,
}) => {
  const [{ isDragging }, dragRef] = useDrag<
    DragItem,
    void,
    { isDragging: boolean }
  >({
    type: "PIECE" as const,
    item: { instanceId: piece.instanceId, piece },
    canDrag: !piece.isPlaced,
    // loosen monitor typing to avoid cross-version type incompatibilities
    collect: (monitor: any) => ({
      isDragging: monitor.isDragging(),
    }),
    end: () => {
      setDraggedPiece(null);
      setPointerPos(null);
      onEndDrag();
    },
  });

  const handlePointerMove = (e: PointerEvent) => {
    e.preventDefault();
    setPointerPos({ x: e.clientX, y: e.clientY });
  };

  const handlePointerUp = (e: PointerEvent) => {
    e.preventDefault();
    try {
      const detail = {
        clientX: e.clientX,
        clientY: e.clientY,
        pieceId: piece.instanceId,
      };
      window.dispatchEvent(
        new CustomEvent("sudoku-tetris-piece-drop", { detail })
      );
    } catch (err) {
      // ignore dispatch errors
    }
    setDraggedPiece(null);
    setPointerPos(null);
    window.removeEventListener("pointermove", handlePointerMove);
    window.removeEventListener("pointerup", handlePointerUp);
    onEndDrag();
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    if (piece.isPlaced) return;

    // Only prevent default on touch to allow native drag on desktop
    if ((e as any).pointerType === "touch") {
      e.preventDefault();
      setDraggedPiece(piece);
      setPointerPos({ x: e.clientX, y: e.clientY });
      window.addEventListener("pointermove", handlePointerMove);
      window.addEventListener("pointerup", handlePointerUp);
      onStartDrag(piece);
    }
  };

  const handleDragStart = (e: React.DragEvent) => {
    try {
      e.dataTransfer.setData("text/plain", piece.instanceId);
      e.dataTransfer.effectAllowed = "copy";
    } catch (err) {
      // ignore
    }
    onStartDrag(piece);
  };

  const handleDragEnd = () => {
    onEndDrag();
  };

  const isPlaced = piece.isPlaced;

  return (
    <div
      ref={dragRef as unknown as React.RefObject<HTMLDivElement>}
      className={`piece-container ${isSelected ? "selected" : ""} ${
        isPlaced ? "placed" : ""
      }`}
      onClick={() => !isPlaced && onPieceClick(piece)}
      draggable={!isPlaced}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onPointerDown={handlePointerDown}
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
        {piece.shape.map((row: number[], rowIndex: number) => (
          <React.Fragment key={rowIndex}>
            {row.map((cell: number, colIndex: number) => (
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
            ))}
          </React.Fragment>
        ))}
      </div>

      {isPlaced && <div className="placed-indicator">✓</div>}

      {/* Mobile controls: visible on small screens */}
      <div className="mobile-controls">
        {!isPlaced && (
          <button
            className="select-button"
            onClick={(e) => {
              e.stopPropagation();
              onPieceClick(piece);
            }}
          >
            Select
          </button>
        )}
        {!isPlaced && (
          <button
            className="rotate-button mobile-rotate"
            onClick={(e) => {
              e.stopPropagation();
              onPieceRotate(piece.instanceId);
            }}
          >
            ↻
          </button>
        )}
      </div>
    </div>
  );
};

const PieceSelection: React.FC<PieceSelectionProps> = ({
  pieces,
  selectedPiece,
  onPieceClick,
  onPieceRotate,
  onStartDrag,
  onEndDrag,
}) => {
  const [draggedPiece, setDraggedPiece] = useState<TetrisPiece | null>(null);
  const [pointerPos, setPointerPos] = useState<{ x: number; y: number } | null>(
    null
  );
  const dragPreviewRef = useRef<HTMLDivElement>(null);

  const renderDragPreview = () => {
    if (!draggedPiece || !pointerPos || typeof document === "undefined")
      return null;
    const preview = (
      <div
        ref={dragPreviewRef}
        className="drag-preview"
        style={{
          position: "fixed",
          left: pointerPos.x - 1.5 * CELL_SIZE,
          top: pointerPos.y - 1.5 * CELL_SIZE,
          width: 3 * CELL_SIZE,
          height: 3 * CELL_SIZE,
          pointerEvents: "none",
          zIndex: 99999,
        }}
      >
        {draggedPiece.shape.map((row: number[], rowIndex: number) => (
          <React.Fragment key={rowIndex}>
            {row.map((cell: number, colIndex: number) => (
              <div
                key={`${rowIndex}-${colIndex}`}
                className="preview-cell"
                style={{
                  position: "absolute",
                  left: colIndex * CELL_SIZE,
                  top: rowIndex * CELL_SIZE,
                  width: CELL_SIZE,
                  height: CELL_SIZE,
                  backgroundColor: cell ? draggedPiece.color : "transparent",
                  border: cell ? "1px solid #444" : "none",
                  opacity: 0.85,
                }}
              />
            ))}
          </React.Fragment>
        ))}
      </div>
    );
    return createPortal(preview, document.body);
  };

  return (
    <div className="piece-selection">
      <h3>Available Pieces</h3>
      <div className="pieces-container">
        {pieces.map((piece) => (
          <DraggablePiece
            key={piece.instanceId}
            piece={piece}
            isSelected={selectedPiece?.instanceId === piece.instanceId}
            onPieceClick={onPieceClick}
            onPieceRotate={onPieceRotate}
            setDraggedPiece={setDraggedPiece}
            setPointerPos={setPointerPos}
            onStartDrag={onStartDrag}
            onEndDrag={onEndDrag}
          />
        ))}
      </div>
      {renderDragPreview()}
    </div>
  );
};

export default PieceSelection;
