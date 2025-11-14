import React from "react";
import { useTranslation } from "react-i18next";
import "./GameInfo.css";

interface GameInfoProps {
  score: number;
  clearsCount: number;
  gameOver: boolean;
  paused: boolean;
  elapsedSeconds: number;
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
  elapsedSeconds,
  onPause,
  onResume,
  onRestart,
  rotationEnabled,
}) => {
  const { t } = useTranslation();

  const formatSeconds = (totalSeconds: number): string => {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    if (minutes > 0) return `${minutes}:${seconds.toString().padStart(2, "0")}`;
    return `${seconds}s`;
  };

  return (
    <div className="game-info">
      <div className="score-section">
        <h2>
          {t("score")}: {score.toLocaleString()}
        </h2>
        <div className="stats">
          <div className="stat">
            <span className="stat-label">{t("clears")}:</span>
            <span className="stat-value">{clearsCount}</span>
          </div>
          <div className="stat">
            <span className="stat-label">{t("timePlayed")}</span>
            <span className="stat-value">{formatSeconds(elapsedSeconds)}</span>
          </div>
        </div>
      </div>

      <div className="controls">
        {!gameOver && (
          <button
            className="control-button"
            onClick={paused ? onResume : onPause}
          >
            {paused ? t("resume") : t("pause")}
          </button>
        )}
        <button className="control-button restart-button" onClick={onRestart}>
          {t("restart")}
        </button>
      </div>

      <div className="instructions">
        <h3>{t("howToPlay")}</h3>
        <div className="instruction-list">
          <div className="instruction-item">
            <span className="instruction-icon">🖱️</span>
            {t("instructions.click")}
          </div>
          {rotationEnabled ? (
            <div className="instruction-item">
              <span className="instruction-icon">🔄</span>
              {t("instructions.rotate")}
            </div>
          ) : (
            <div className="instruction-item">
              <span className="instruction-icon">🚫</span>
              {t("instructions.rotationDisabled")}
            </div>
          )}
          <div className="instruction-item">
            <span className="instruction-icon">🎯</span>
            {t("instructions.clear")}
          </div>
          <div className="instruction-item">
            <span className="instruction-icon">🧩</span>
            {t("instructions.newBatch")}
          </div>
        </div>
      </div>

      <div className="game-rules">
        <h3>{t("scoring")}</h3>
        <ul>
          <li>{t("scoringRules.rowColumn")}</li>
          <li>{t("scoringRules.block")}</li>
          <li>
            <strong>{t("scoringRules.comboMultiplier")}</strong>
            <ul>
              <li>{t("scoringRules.combo1")}</li>
              <li>{t("scoringRules.combo2")}</li>
              <li>{t("scoringRules.combo3")}</li>
            </ul>
          </li>
          <li>{t("scoringRules.pentomino")}</li>
          <li>{t("scoringRules.rotation")}</li>
        </ul>
      </div>

      <div className="game-rules">
        <h3>{t("rules")}</h3>
        <ul>
          <li>{t("rulesText.newBatch")}</li>
          <li>{t("rulesText.noGravity")}</li>
          <li>{t("rulesText.gameOver")}</li>
          <li>
            {t("rulesText.difficultyEffects")}
            <ul>
              <li>{t("rulesText.casualMaster")}</li>
              <li>{t("rulesText.expert")}</li>
              <li>{t("rulesText.insane")}</li>
            </ul>
          </li>
        </ul>
      </div>
    </div>
  );
};

export default GameInfo;
