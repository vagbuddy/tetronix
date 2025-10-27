import React from 'react';
import './GameInfo.css';

interface GameInfoProps {
  score: number;
  level: number;
  linesCleared: number;
  gameOver: boolean;
  paused: boolean;
  onPause: () => void;
  onResume: () => void;
  onRestart: () => void;
}

const GameInfo: React.FC<GameInfoProps> = ({
  score,
  level,
  linesCleared,
  gameOver,
  paused,
  onPause,
  onResume,
  onRestart
}) => {
  return (
    <div className="game-info">
      <div className="score-section">
        <h2>Score: {score.toLocaleString()}</h2>
        <div className="stats">
          <div className="stat">
            <span className="stat-label">Level:</span>
            <span className="stat-value">{level}</span>
          </div>
          <div className="stat">
            <span className="stat-label">Lines:</span>
            <span className="stat-value">{linesCleared}</span>
          </div>
        </div>
      </div>
      
      <div className="controls">
        {!gameOver && (
          <button 
            className="control-button"
            onClick={paused ? onResume : onPause}
          >
            {paused ? 'Resume' : 'Pause'}
          </button>
        )}
        <button 
          className="control-button restart-button"
          onClick={onRestart}
        >
          Restart
        </button>
      </div>
      
      <div className="instructions">
        <h3>How to Play</h3>
        <div className="instruction-list">
          <div className="instruction-item">
            <span className="instruction-icon">🖱️</span>
            Click on a piece to select it
          </div>
          <div className="instruction-item">
            <span className="instruction-icon">🔄</span>
            Click rotate button to turn pieces
          </div>
          <div className="instruction-item">
            <span className="instruction-icon">📍</span>
            Click on the board to place pieces
          </div>
          <div className="instruction-item">
            <span className="instruction-icon">🎯</span>
            Fill complete rows or 3×3 blocks to clear them
          </div>
        </div>
      </div>
      
      <div className="game-rules">
        <h3>Rules</h3>
        <ul>
          <li>Place all 3 pieces on the board</li>
          <li>Pieces cannot overlap with placed pieces</li>
          <li>Fill complete rows to clear them (no gravity)</li>
          <li>Fill complete 3×3 sudoku blocks to clear them</li>
          <li>Cleared areas stay empty - pieces don't fall</li>
          <li>Both give points and increase your level</li>
          <li>New pieces automatically appear when all are placed</li>
        </ul>
      </div>
    </div>
  );
};

export default GameInfo;