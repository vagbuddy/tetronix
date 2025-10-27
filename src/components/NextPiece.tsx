import React from 'react';
import { TetrisPiece } from '../types/GameTypes';
import { CELL_SIZE } from '../utils/GameLogic';
import './NextPiece.css';

interface NextPieceProps {
  piece: TetrisPiece | null;
}

const NextPiece: React.FC<NextPieceProps> = ({ piece }) => {
  if (!piece) return null;

  const renderPreviewCell = (row: number, col: number) => {
    const isFilled = piece.shape[row] && piece.shape[row][col];
    
    return (
      <div
        key={`${row}-${col}`}
        className="preview-cell"
        style={{
          width: CELL_SIZE * 0.6,
          height: CELL_SIZE * 0.6,
          backgroundColor: isFilled ? piece.color : 'transparent',
          border: isFilled ? '1px solid #444' : 'none',
          position: 'absolute',
          left: col * CELL_SIZE * 0.6,
          top: row * CELL_SIZE * 0.6
        }}
      />
    );
  };

  return (
    <div className="next-piece-container">
      <h3>Next Piece</h3>
      <div 
        className="next-piece-preview"
        style={{
          position: 'relative',
          width: 3 * CELL_SIZE * 0.6,
          height: 3 * CELL_SIZE * 0.6,
          margin: '0 auto',
          backgroundColor: '#2a2a2a',
          border: '1px solid #444'
        }}
      >
        {piece.shape.map((row, rowIndex) =>
          row.map((_, colIndex) => renderPreviewCell(rowIndex, colIndex))
        )}
      </div>
    </div>
  );
};

export default NextPiece;
