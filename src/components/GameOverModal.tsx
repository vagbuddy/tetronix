import React, { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import "./GameOverModal.css";
import {
  getSavedUsername,
  saveUsername,
  submitGame,
  getLastSubmitAt,
  getTopScores,
} from "../utils/leaderboard";
import type { Difficulty, Move } from "../types/GameTypes";

interface GameOverModalProps {
  score: number;
  playedSeconds: number;
  difficulty?: Difficulty;
  seed: number;
  moves: Move[];
  canSubmit?: boolean;
  onRestart: () => void;
  onContinue: () => void;
}

const GameOverModal: React.FC<GameOverModalProps> = ({
  score,
  playedSeconds,
  difficulty,
  seed,
  moves,
  onRestart,
  onContinue,
  canSubmit,
}) => {
  const { t, i18n } = useTranslation();
  const [name, setName] = useState<string>(getSavedUsername() || "");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const lastSubmitAt = getLastSubmitAt();
  // Cooldown in ms, from env or default 5 min
  const SUBMIT_COOLDOWN_MS =
    Number(import.meta.env.VITE_LEADERBOARD_SUBMIT_COOLDOWN_MS) ||
    5 * 60 * 1000;
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [userRank, setUserRank] = useState<number | null>(null);

  const onSubmitScore = async () => {
    if (!name.trim()) return;
    // UX cooldown: block if last submit within 5 minutes
    if (lastSubmitAt && Date.now() - lastSubmitAt < SUBMIT_COOLDOWN_MS) {
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
        locale: i18n.language,
      });
      if ((res as any)?.ok) {
        saveUsername(trimmed);
        setSubmitted(true);
        // Fetch leaderboard after submit
        const top = await getTopScores(difficulty, 5);
        // Check if user is in top 5
        let found = false;
        let userIdx = -1;
        const userEntry = {
          name: trimmed || "Player",
          score,
          difficulty: difficulty ?? "casual",
          playedSeconds,
          // createdAt: new Date(),
          locale: i18n.language,
        };
        const merged = top.map((entry: any, idx: number) => {
          if (
            !found &&
            entry.score === score &&
            entry.name === userEntry.name
          ) {
            found = true;
            userIdx = idx;
          }
          return entry;
        });
        if (!found) {
          // Insert user in correct place
          let insertIdx = merged.findIndex((e: any) => score > e.score);
          if (insertIdx === -1 && merged.length < 5) insertIdx = merged.length;
          if (insertIdx === -1) insertIdx = 5;
          merged.splice(insertIdx, 0, userEntry);
          userIdx = insertIdx;
        }
        setLeaderboard(merged.slice(0, 5));
        setUserRank(userIdx + 1);
        setShowLeaderboard(true);
      }
    } catch (e) {
      // swallow errors for now; could show a toast
    } finally {
      setSubmitting(false);
    }
  };

  const formatGameTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;

    if (minutes > 0) {
      return `${minutes}:${secs.toString().padStart(2, "0")}`;
    }
    return `${secs}s`;
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
            <span className="stat-value">{formatGameTime(playedSeconds)}</span>
          </div>
        </div>

        {!showLeaderboard && (
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
                    ? Date.now() - lastSubmitAt < SUBMIT_COOLDOWN_MS
                    : false)
                }
              >
                {submitted
                  ? t("submitted", { defaultValue: "Submitted" })
                  : t("submitScore", { defaultValue: "Submit score" })}
              </button>
            </div>
          </div>
        )}

        {showLeaderboard && (
          <div className="leaderboard-modal" style={{ marginTop: 18 }}>
            <h3>{t("Leaderboard", { defaultValue: "Leaderboard" })}</h3>
            <table
              style={{
                width: "100%",
                marginTop: 8,
                color: "#fff",
                background: "#222",
                borderRadius: 8,
              }}
            >
              <thead>
                <tr>
                  <th style={{ textAlign: "left" }}>#</th>
                  <th style={{ textAlign: "left" }}>
                    {t("yourName", { defaultValue: "Name" })}
                  </th>
                  <th style={{ textAlign: "right" }}>
                    {t("finalScore", { defaultValue: "Score" })}
                  </th>
                </tr>
              </thead>
              <tbody>
                {leaderboard.map((entry, idx) => (
                  <tr
                    key={idx}
                    style={
                      userRank !== null && idx === userRank - 1
                        ? { background: "#2a3", fontWeight: 700 }
                        : undefined
                    }
                  >
                    <td>{idx + 1}</td>
                    <td>{entry.name}</td>
                    <td style={{ textAlign: "right" }}>{entry.score}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {userRank && userRank > 5 && (
              <div style={{ marginTop: 8, color: "#aaa" }}>
                {t("yourRank", { defaultValue: "Your rank" })}: {userRank}
              </div>
            )}
          </div>
        )}

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
