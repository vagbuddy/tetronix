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
  rotationEnabled: boolean;
}

const GameInfo: React.FC<GameInfoProps> = ({
  score,
  clearsCount,
  gameOver,
  paused,
  onPause,
  onResume,
  onRestart,
  rotationEnabled,
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
            Click a piece, then click the board to place it
          </div>
          {rotationEnabled ? (
            <div className="instruction-item">
              <span className="instruction-icon">🔄</span>
              Use the rotate button to turn pieces before placing
            </div>
          ) : (
            <div className="instruction-item">
              <span className="instruction-icon">�</span>
              Rotation disabled in this mode; orientation is random
            </div>
          )}
          <div className="instruction-item">
            <span className="instruction-icon">🎯</span>
            Fill rows, columns, or 3×3 blocks to clear them
          </div>
          <div className="instruction-item">
            <span className="instruction-icon">🧩</span>
            Place all pieces to receive a new batch
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
          <li>Pentomino shapes appear in Hard & Impossible.</li>
          <li>Rotation available only in Casual & Expert.</li>
        </ul>
      </div>

      <div className="game-rules">
        <h3>Rules</h3>
        <ul>
          <li>Place all pieces to receive a new batch.</li>
          <li>No gravity: cleared cells remain empty.</li>
          <li>Game over when no remaining piece fits.</li>
          <li>
            Difficulty effects:
            <ul>
              <li>
                Casual/Master: tetrominoes only. Casual has rotation, Master
                doesn't (random start orientation).
              </li>
              <li>Expert: tetrominoes + pentominoes, rotation enabled.</li>
              <li>
                Insane: tetrominoes + pentominoes, rotation disabled (random
                orientation).
              </li>
            </ul>
          </li>
        </ul>
      </div>
    </div>
  );
};

export default GameInfo;
