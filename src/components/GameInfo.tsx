import React from "react";
import "./GameInfo.css";

interface GameInfoProps {
  score: number;
  clearsCount: number;
  gameOver: boolean;
  paused: boolean;
  onPause: () => void;
  onResume: () => void;
  onRestart: () => void;
}

const GameInfo: React.FC<GameInfoProps> = ({
  score,
  clearsCount,
  gameOver,
  paused,
  onPause,
  onResume,
  onRestart,
}) => {
  return (
    <div className="game-info">
      <div className="score-section">
        <h2>Score: {score.toLocaleString()}</h2>
        <div className="stats">
          <div className="stat">
            <span className="stat-label">Clears:</span>
            <span className="stat-value">{clearsCount}</span>
          </div>
        </div>
      </div>

      <div className="controls">
        {!gameOver && (
          <button
            className="control-button"
            onClick={paused ? onResume : onPause}
          >
            {paused ? "Resume" : "Pause"}
          </button>
        )}
        <button className="control-button" onClick={onRestart}>
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
            Fill complete rows, columns, or 3×3 blocks to clear them
          </div>
        </div>
      </div>

      <div className="game-rules">
        <h3>Scoring</h3>
        <ul>
          <li>Row/Column: 100 points each</li>
          <li>3×3 Block: 500 points each</li>
          <li>
            <strong>Combo Multiplier:</strong>
            <ul>
              <li>1 type cleared: ×1</li>
              <li>2 types cleared: ×2</li>
              <li>3 types cleared: ×3</li>
            </ul>
          </li>
          <li>Example: 1 row + 1 block = (100+500) × 2 = 1,200 pts</li>
        </ul>
      </div>

      <div className="game-rules">
        <h3>Rules</h3>
        <ul>
          <li>Place all 3 pieces on the board</li>
          <li>Pieces cannot overlap with placed pieces</li>
          <li>Cleared areas stay empty - pieces don't fall</li>
          <li>New pieces automatically appear when all are placed</li>
          <li>Game over when no pieces can be placed</li>
        </ul>
      </div>
    </div>
  );
};

export default GameInfo;
