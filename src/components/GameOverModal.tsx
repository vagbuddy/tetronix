import React, { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import "./GameOverModal.css";
import {
  getSavedUsername,
  saveUsername,
  submitScore,
} from "../utils/leaderboard";
import type { Difficulty } from "../types/GameTypes";

interface GameOverModalProps {
  score: number;
  startTime: number;
  difficulty?: Difficulty;
  onRestart: () => void;
  onContinue: () => void;
}

const GameOverModal: React.FC<GameOverModalProps> = ({
  score,
  startTime,
  difficulty,
  onRestart,
  onContinue,
}) => {
  const { t } = useTranslation();
  const [name, setName] = useState<string>(getSavedUsername() || "");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Freeze played time at the moment the modal mounts (game over)
  const playedSeconds = useMemo(() => {
    return Math.floor((Date.now() - startTime) / 1000);
    // startTime is stable for a game session; we compute once on mount
  }, [startTime]);

  const onSubmitScore = async () => {
    if (!name.trim()) return;
    setSubmitting(true);
    try {
      saveUsername(name.trim());
      await submitScore({
        name: name.trim(),
        score,
        difficulty: (difficulty ?? "casual") as Difficulty,
        playedSeconds,
      });
      setSubmitted(true);
    } catch (e) {
      // swallow errors for now; could show a toast
    } finally {
      setSubmitting(false);
    }
  };

  const formatSeconds = (totalSeconds: number): string => {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    if (minutes > 0) return `${minutes}:${seconds.toString().padStart(2, "0")}`;
    return `${seconds}s`;
  };
  const playedLabel = useMemo(
    () => formatSeconds(playedSeconds),
    [playedSeconds]
  );

  return (
    <div className="game-over-overlay">
      <div className="game-over-modal">
        <h2>{t("gameOver")}</h2>
        <p className="game-over-message">{t("noMoreMoves")}</p>

        <div className="game-over-stats">
          <div className="stat-item">
            <span className="stat-label">{t("finalScore")}</span>
            <span className="stat-value">{score}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">{t("timePlayed")}</span>
            <span className="stat-value">{playedLabel}</span>
          </div>
        </div>

        <div className="leaderboard-submit" style={{ marginTop: 12 }}>
          <label style={{ display: "block", marginBottom: 6 }}>
            {t("yourName", { defaultValue: "Your name" })}
          </label>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              type="text"
              value={name}
              maxLength={24}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("yourName", { defaultValue: "Your name" })}
              style={{
                flex: 1,
                padding: 8,
                borderRadius: 6,
                border: "1px solid #555",
                background: "#222",
                color: "#eee",
              }}
            />
            <button
              className="submit-score-button"
              onClick={onSubmitScore}
              disabled={!name.trim() || submitting || submitted}
            >
              {submitted
                ? t("submitted", { defaultValue: "Submitted" })
                : t("submitScore", { defaultValue: "Submit score" })}
            </button>
          </div>
        </div>

        <div className="game-over-buttons">
          <button className="continue-button" onClick={onContinue}>
            {t("continue")}
          </button>
          <button className="restart-button" onClick={onRestart}>
            {t("restart")}
          </button>
        </div>
      </div>
    </div>
  );
};

export default GameOverModal;
