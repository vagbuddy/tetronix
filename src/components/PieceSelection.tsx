import React, { useState, useRef } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faRotate,
  faRotateRight,
  faLeftRight,
} from "@fortawesome/free-solid-svg-icons";
import { DEBUG_ANCHOR } from "../config/DebugFlags";
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

type Anchor = { row: number; col: number };

interface PieceSelectionProps {
  pieces: TetrisPiece[];
  selectedPiece: TetrisPiece | null;
  onPieceClick: (piece: TetrisPiece) => void;
  onPieceRotate: (pieceId: string) => void;
  onPieceFlip: (pieceId: string) => void;
  onStartDrag: (piece: TetrisPiece) => void;
  onEndDrag: () => void;
  rotationEnabled: boolean;
  flipEnabled: boolean;
  score: number;
}

// Draggable piece component
const DraggablePiece: React.FC<{
  piece: TetrisPiece;
  isSelected: boolean;
  onPieceClick: (piece: TetrisPiece) => void;
  onPieceRotate: (pieceId: string) => void;
  onPieceFlip: (pieceId: string) => void;
  setDraggedPiece: (piece: TetrisPiece | null) => void;
  setPointerPos: (pos: { x: number; y: number } | null) => void;
  setDragAnchor: (anchor: Anchor | null) => void;
  onStartDrag: (piece: TetrisPiece) => void;
  onEndDrag: () => void;
  rotationEnabled: boolean;
  flipEnabled: boolean;
}> = ({
  piece,
  isSelected,
  onPieceClick,
  onPieceRotate,
  onPieceFlip,
  setDraggedPiece,
  setPointerPos,
  setDragAnchor,
  onStartDrag,
  onEndDrag,
  rotationEnabled,
  flipEnabled,
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

  const previewRef = useRef<HTMLDivElement>(null);
  const anchorRef = useRef<Anchor | null>(null);
  const dragStartPos = useRef<{ x: number; y: number } | null>(null);
  const hasMoved = useRef(false);

  // Ensure the anchor points to a filled cell in the shape; if user tapped an empty
  // spot inside the footprint, snap to the nearest filled cell by Manhattan distance.
  const resolveFilledAnchor = (desired: Anchor): Anchor => {
    const h = piece.shape.length;
    const w = piece.shape[0]?.length || 0;
    if (
      desired.row >= 0 &&
      desired.row < h &&
      desired.col >= 0 &&
      desired.col < w &&
      piece.shape[desired.row][desired.col]
    ) {
      return desired;
    }
    let best: Anchor | null = null;
    let bestDist = Infinity;
    for (let r = 0; r < h; r++) {
      for (let c = 0; c < w; c++) {
        if (piece.shape[r][c]) {
          const dist = Math.abs(r - desired.row) + Math.abs(c - desired.col);
          if (dist < bestDist) {
            bestDist = dist;
            best = { row: r, col: c };
          }
        }
      }
    }
    return best || { row: 1, col: 1 };
  };

  const handlePointerMove = (e: PointerEvent) => {
    e.preventDefault();

    // Check if we've moved enough to consider it a drag (5px threshold)
    if (dragStartPos.current && !hasMoved.current) {
      const dx = e.clientX - dragStartPos.current.x;
      const dy = e.clientY - dragStartPos.current.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const thresholdPx = 5;

      if (distance > thresholdPx) {
        hasMoved.current = true;
        // Now actually start the drag
        setDraggedPiece(piece);
        onStartDrag(piece);
      } else {
        // Not moved enough yet, don't start drag
        return;
      }
    }

    setPointerPos({ x: e.clientX, y: e.clientY });
    try {
      const detail = {
        clientX: e.clientX,
        clientY: e.clientY,
        pieceId: piece.instanceId,
        anchorRow: anchorRef.current?.row,
        anchorCol: anchorRef.current?.col,
      };
      window.dispatchEvent(
        new CustomEvent("sudoku-tetris-piece-hover", { detail })
      );
    } catch (err) {
      // ignore
    }
  };

  const handlePointerUp = (e: PointerEvent) => {
    e.preventDefault();

    // If we haven't moved, treat it as a click to select the piece
    if (!hasMoved.current) {
      onPieceClick(piece);
      dragStartPos.current = null;
      hasMoved.current = false;
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      return;
    }

    try {
      const detail = {
        clientX: e.clientX,
        clientY: e.clientY,
        pieceId: piece.instanceId,
        anchorRow: anchorRef.current?.row,
        anchorCol: anchorRef.current?.col,
      };
      window.dispatchEvent(
        new CustomEvent("sudoku-tetris-piece-drop", { detail })
      );
    } catch (err) {
      // ignore dispatch errors
    }
    setDraggedPiece(null);
    setPointerPos(null);
    setDragAnchor(null);
    anchorRef.current = null;
    dragStartPos.current = null;
    hasMoved.current = false;
    window.removeEventListener("pointermove", handlePointerMove);
    window.removeEventListener("pointerup", handlePointerUp);
    // Don't call onEndDrag() here - keep the piece selected after drag
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    if (piece.isPlaced) return;
    // If the user tapped the rotate or flip button, don't initiate drag
    const target = e.target as HTMLElement;
    if (
      target &&
      (target.closest(".rotate-button") || target.closest(".flip-button"))
    ) {
      return;
    }

    // Prevent default behavior to avoid conflicts
    e.preventDefault();

    // Record the starting position
    dragStartPos.current = { x: e.clientX, y: e.clientY };
    hasMoved.current = false;

    // Compute which cell within the preview was clicked
    const rect = previewRef.current?.getBoundingClientRect();
    if (rect) {
      const cellPx = CELL_SIZE * 0.5;
      const maxCol = (piece.shape[0]?.length || 1) - 1;
      const maxRow = piece.shape.length - 1;
      const col = Math.max(
        0,
        Math.min(maxCol, Math.floor((e.clientX - rect.left) / cellPx))
      );
      const row = Math.max(
        0,
        Math.min(maxRow, Math.floor((e.clientY - rect.top) / cellPx))
      );
      const anchor = resolveFilledAnchor({ row, col });
      anchorRef.current = anchor;
      setDragAnchor(anchor);
    } else {
      const fallback = resolveFilledAnchor({ row: 1, col: 1 });
      anchorRef.current = fallback;
      setDragAnchor(fallback);
    }

    // Don't start drag immediately - wait for movement
    setPointerPos({ x: e.clientX, y: e.clientY });
    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
  };

  const handleDragStart = (e: React.DragEvent) => {
    // If starting drag from rotate or flip button, cancel drag
    const target = e.target as HTMLElement;
    if (
      target &&
      (target.closest(".rotate-button") || target.closest(".flip-button"))
    ) {
      try {
        e.preventDefault();
      } catch {}
      return;
    }
    try {
      e.dataTransfer.setData("text/plain", piece.instanceId);
      e.dataTransfer.effectAllowed = "copy";
    } catch (err) {
      // ignore
    }
    // attempt to compute anchor for mouse-drag as well
    const rect = previewRef.current?.getBoundingClientRect();
    if (rect) {
      const cellPx = CELL_SIZE * 0.5;
      const maxCol = (piece.shape[0]?.length || 1) - 1;
      const maxRow = piece.shape.length - 1;
      const col = Math.max(
        0,
        Math.min(maxCol, Math.floor((e.clientX - rect.left) / cellPx))
      );
      const row = Math.max(
        0,
        Math.min(maxRow, Math.floor((e.clientY - rect.top) / cellPx))
      );
      const anchor = resolveFilledAnchor({ row, col });
      anchorRef.current = anchor;
      setDragAnchor(anchor);
    } else {
      const fallback = resolveFilledAnchor({ row: 1, col: 1 });
      anchorRef.current = fallback;
      setDragAnchor(fallback);
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
      // Disable native HTML5 drag to avoid conflicts with react-dnd positioning
      draggable={false}
      // onDragStart/onDragEnd intentionally omitted to prevent native drag path
      onPointerDown={handlePointerDown}
    >
      <div className="piece-header">
        <span className="piece-name">{piece.id}</span>
        <div className="piece-controls">
          {/* Show flip when flipEnabled (expert & insane) and base chiral (exclude mirrored variants) */}
          {!isPlaced &&
            flipEnabled &&
            ["F5", "L5", "N5", "P5", "Y5", "Z5"].includes(piece.id) && (
              <button
                className="flip-button"
                aria-label="Flip piece"
                title="Flip (Mirror)"
                onPointerDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  // Mirror the anchor horizontally
                  if (anchorRef.current) {
                    const { row, col } = anchorRef.current;
                    const size = piece.shape[0].length - 1;
                    const flipped = { row, col: size - col };
                    anchorRef.current = flipped;
                    setDragAnchor(flipped);
                  }
                  onPieceFlip(piece.instanceId);
                }}
              >
                <FontAwesomeIcon icon={faLeftRight} />
              </button>
            )}
          {!isPlaced && rotationEnabled && (
            <button
              className="rotate-button"
              aria-label="Rotate piece"
              title="Rotate"
              onPointerDown={(e) => {
                // Prevent drag starting from rotate button on touch
                e.preventDefault();
                e.stopPropagation();
              }}
              onClick={(e) => {
                e.stopPropagation();
                // Rotate local drag anchor so the touched cell remains under the finger
                if (anchorRef.current) {
                  const { row, col } = anchorRef.current;
                  const size = piece.shape.length - 1;
                  const isTwoState =
                    piece.id === "I" || piece.id === "S" || piece.id === "Z";
                  const goingCCW = isTwoState && piece.rotation === 1;
                  const rotated = goingCCW
                    ? { row: size - col, col: row }
                    : { row: col, col: size - row };
                  anchorRef.current = rotated;
                  setDragAnchor(rotated);
                }
                onPieceRotate(piece.instanceId);
              }}
            >
              <FontAwesomeIcon icon={faRotateRight} />
            </button>
          )}
        </div>
      </div>

      <div
        className="piece-preview"
        style={{
          width: 5 * CELL_SIZE * 0.5,
          height: 5 * CELL_SIZE * 0.5,
          position: "relative",
        }}
        ref={previewRef}
      >
        {piece.shape.map((row: number[], rowIndex: number) => {
          // Calculate offset to center the piece in 5x5 grid
          const pieceWidth = piece.shape[0].length;
          const pieceHeight = piece.shape.length;
          const offsetX = Math.floor((5 - pieceWidth) / 2);
          const offsetY = Math.floor((5 - pieceHeight) / 2);

          return (
            <React.Fragment key={rowIndex}>
              {row.map((cell: number, colIndex: number) => (
                <div
                  key={`${rowIndex}-${colIndex}`}
                  className="preview-cell"
                  style={{
                    position: "absolute",
                    left: (colIndex + offsetX) * CELL_SIZE * 0.5,
                    top: (rowIndex + offsetY) * CELL_SIZE * 0.5,
                    width: CELL_SIZE * 0.5,
                    height: CELL_SIZE * 0.5,
                    backgroundColor: cell ? piece.color : "transparent",
                    border: cell ? "1px solid #444" : "none",
                    opacity: isPlaced ? 0.3 : 1,
                  }}
                />
              ))}
            </React.Fragment>
          );
        })}
      </div>

      {isPlaced && <div className="placed-indicator">✓</div>}
    </div>
  );
};

const PieceSelection: React.FC<PieceSelectionProps> = ({
  pieces,
  selectedPiece,
  onPieceClick,
  onPieceRotate,
  onPieceFlip,
  onStartDrag,
  onEndDrag,
  rotationEnabled,
  flipEnabled,
  score,
}) => {
  const [draggedPiece, setDraggedPiece] = useState<TetrisPiece | null>(null);
  const [pointerPos, setPointerPos] = useState<{ x: number; y: number } | null>(
    null
  );
  const [dragAnchor, setDragAnchor] = useState<Anchor | null>(null);
  const dragPreviewRef = useRef<HTMLDivElement>(null);

  const renderDragPreview = () => {
    if (!draggedPiece || !pointerPos || typeof document === "undefined")
      return null;
    const shapeWidth = draggedPiece.shape[0].length;
    const shapeHeight = draggedPiece.shape.length;
    const defaultAnchorCol = Math.floor((shapeWidth - 1) / 2);
    const defaultAnchorRow = Math.floor((shapeHeight - 1) / 2);
    const preview = (
      <div
        ref={dragPreviewRef}
        className="drag-preview"
        style={{
          position: "fixed",
          left:
            pointerPos.x -
            ((dragAnchor?.col ?? defaultAnchorCol) + 0.5) * CELL_SIZE,
          top:
            pointerPos.y -
            ((dragAnchor?.row ?? defaultAnchorRow) + 0.5) * CELL_SIZE,
          width: shapeWidth * CELL_SIZE,
          height: shapeHeight * CELL_SIZE,
          pointerEvents: "none",
          zIndex: 99999,
        }}
      >
        {draggedPiece.shape.map((row: number[], rowIndex: number) => (
          <React.Fragment key={rowIndex}>
            {row.map((cell: number, colIndex: number) => (
              <div
                key={`${rowIndex}-${colIndex}`}
                className={`preview-cell ${
                  DEBUG_ANCHOR &&
                  dragAnchor &&
                  cell &&
                  rowIndex === dragAnchor.row &&
                  colIndex === dragAnchor.col
                    ? "anchor-debug"
                    : ""
                }`}
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
      <div className="piece-selection-header">
        <h3>Available Pieces</h3>
        <div className="score-display">
          <span className="score-label">Score:</span>
          <span className="score-value">{score}</span>
        </div>
      </div>
      <div className="pieces-container">
        {pieces.map((piece) => (
          <DraggablePiece
            key={piece.instanceId}
            piece={piece}
            isSelected={selectedPiece?.instanceId === piece.instanceId}
            onPieceClick={onPieceClick}
            onPieceRotate={onPieceRotate}
            onPieceFlip={onPieceFlip}
            setDraggedPiece={setDraggedPiece}
            setPointerPos={setPointerPos}
            setDragAnchor={setDragAnchor}
            onStartDrag={onStartDrag}
            onEndDrag={onEndDrag}
            rotationEnabled={rotationEnabled}
            flipEnabled={flipEnabled}
          />
        ))}
      </div>
      {renderDragPreview()}
    </div>
  );
};

export default PieceSelection;
