import React from "react";
import "./GameOverModal.css";

interface GameOverModalProps {
  score: number;
  startTime: number;
  onRestart: () => void;
  onContinue: () => void;
}

const GameOverModal: React.FC<GameOverModalProps> = ({
  score,
  startTime,
  onRestart,
  onContinue,
}) => {
  const formatGameTime = (startTime: number): string => {
    const elapsedMs = Date.now() - startTime;
    const totalSeconds = Math.floor(elapsedMs / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;

    if (minutes > 0) {
      return `${minutes}:${seconds.toString().padStart(2, "0")}`;
    }
    return `${seconds}s`;
  };

  return (
    <div className="game-over-overlay">
      <div className="game-over-modal">
        <h2>Game Over!</h2>
        <p className="game-over-message">No more moves available</p>

        <div className="game-over-stats">
          <div className="stat-item">
            <span className="stat-label">Final Score</span>
            <span className="stat-value">{score}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Time Played</span>
            <span className="stat-value">{formatGameTime(startTime)}</span>
          </div>
        </div>

        <div className="game-over-buttons">
          <button className="continue-button" onClick={onContinue}>
            Continue
          </button>
          <button className="restart-button" onClick={onRestart}>
            Restart
          </button>
        </div>
      </div>
    </div>
  );
};

export default GameOverModal;
