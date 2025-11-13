import React, { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import "./GameOverModal.css";
import {
  getSavedUsername,
  saveUsername,
  submitGame,
  getLastSubmitAt,
} from "../utils/leaderboard";
import type { Difficulty, Move } from "../types/GameTypes";

interface GameOverModalProps {
  score: number;
  startTime: number;
  difficulty?: Difficulty;
  seed: number;
  moves: Move[];
  canSubmit?: boolean;
  onRestart: () => void;
  onContinue: () => void;
}

const GameOverModal: React.FC<GameOverModalProps> = ({
  score,
  startTime,
  difficulty,
  seed,
  moves,
  onRestart,
  onContinue,
  canSubmit,
}) => {
  const { t } = useTranslation();
  const [name, setName] = useState<string>(getSavedUsername() || "");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const lastSubmitAt = getLastSubmitAt();

  const playedSeconds = useMemo(
    () => Math.floor((Date.now() - startTime) / 1000),
    [startTime]
  );

  const onSubmitScore = async () => {
    if (!name.trim()) return;
    // UX cooldown: block if last submit within 5 minutes
    if (lastSubmitAt && Date.now() - lastSubmitAt < 5 * 60 * 1000) {
      return;
    }
    setSubmitting(true);
    try {
      const trimmed = name.trim();
      const res = await submitGame({
        name: name.trim(),
        userScore: score,
        difficulty: (difficulty ?? "casual") as Difficulty,
        playedSeconds,
        seed,
        moves,
      });
      if ((res as any)?.ok) {
        saveUsername(trimmed);
        setSubmitted(true);
      }
    } catch (e) {
      // swallow errors for now; could show a toast
    } finally {
      setSubmitting(false);
    }
  };

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
        <h2>{t("gameOver")}</h2>
        <p className="game-over-message">{t("noMoreMoves")}</p>

        <div className="game-over-stats">
          <div className="stat-item">
            <span className="stat-label">{t("finalScore")}</span>
            <span className="stat-value">{score}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">{t("timePlayed")}</span>
            <span className="stat-value">{formatGameTime(startTime)}</span>
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
              disabled={
                !name.trim() ||
                submitting ||
                submitted ||
                canSubmit === false ||
                (lastSubmitAt
                  ? Date.now() - lastSubmitAt < 5 * 60 * 1000
                  : false)
              }
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
