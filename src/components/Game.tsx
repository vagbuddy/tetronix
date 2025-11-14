import React, { useMemo, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useGameState } from "../hooks/useGameState";
import GameBoard from "./GameBoard";
import PieceSelection from "./PieceSelection";
import GameInfo from "./GameInfo";
import ScoreCorner from "./ScoreCorner";
import GameOverModal from "./GameOverModal";
import DifficultySelector from "./DifficultySelector";
import LanguageSelector from "./LanguageSelector";
import "./Game.css";
import { isMobile } from "../utils/DeviceDetection";
import type { Difficulty } from "../types/GameTypes";

const Game: React.FC = () => {
  const { t } = useTranslation();
  const [showRestartConfirm, setShowRestartConfirm] = useState(false);
  const [showDifficultyConfirm, setShowDifficultyConfirm] = useState(false);
  const [pendingDifficulty, setPendingDifficulty] = useState<Difficulty | null>(
    null
  );
  const {
    state,
    selectPiece,
    deselectPiece,
    placePiece,
    rotatePiece,
    flipPiece,
    startDrag,
    endDrag,
    pause,
    resume,
    restart,
    continueGame,
    setDifficulty,
    elapsedSeconds,
  } = useGameState();

  const rotationEnabled = useMemo(
    () => state.difficulty === "casual" || state.difficulty === "expert",
    [state.difficulty]
  );
  const flipEnabled = useMemo(
    () => state.difficulty === "insane",
    [state.difficulty]
  );

  // Auto-pause when tab loses focus (user switches tab, minimizes browser)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Tab hidden: auto-pause if game is active (not already paused or game over)
        if (!state.paused && !state.gameOver) {
          pause();
        }
      } else {
        // Tab visible: auto-resume if game was paused (and not game over)
        if (state.paused && !state.gameOver) {
          resume();
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [state.paused, state.gameOver, pause, resume]);

  const handleRestartClick = () => {
    const hasPlacedPieces = state.availablePieces.some((p) => p.isPlaced);
    if (!state.gameOver && hasPlacedPieces) {
      setShowRestartConfirm(true);
    } else {
      restart();
    }
  };

  const handleDifficultyClick = (newDifficulty: Difficulty) => {
    const hasPlacedPieces = state.availablePieces.some((p) => p.isPlaced);
    if (newDifficulty === state.difficulty) {
      // Clicking same difficulty: restart with confirmation if game is active
      if (!state.gameOver && hasPlacedPieces) {
        setShowRestartConfirm(true);
      } else {
        restart();
      }
    } else {
      // Changing difficulty: show confirmation if game is active
      if (!state.gameOver && hasPlacedPieces) {
        setPendingDifficulty(newDifficulty);
        setShowDifficultyConfirm(true);
      } else {
        setDifficulty(newDifficulty);
      }
    }
  };

  const confirmRestart = () => {
    setShowRestartConfirm(false);
    restart();
  };

  const confirmDifficultyChange = () => {
    if (pendingDifficulty) {
      setShowDifficultyConfirm(false);
      setDifficulty(pendingDifficulty);
      setPendingDifficulty(null);
    }
  };

  return (
    <div className="game-container">
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: "100%",
        }}
      >
        <DifficultySelector
          difficulty={state.difficulty}
          onDifficultyChange={handleDifficultyClick}
        />
        <LanguageSelector />
      </div>

      <div className="game-content">
        <div className="game-main">
          <GameBoard
            grid={state.grid}
            selectedPiece={state.selectedPiece}
            availablePieces={state.availablePieces}
            clearingCells={state.clearingCells}
            onPiecePlace={placePiece}
            onPieceDeselect={deselectPiece}
          />

          <PieceSelection
            pieces={state.availablePieces}
            selectedPiece={state.selectedPiece}
            onPieceClick={selectPiece}
            onPieceRotate={rotatePiece}
            onPieceFlip={flipPiece}
            onStartDrag={startDrag}
            onEndDrag={endDrag}
            rotationEnabled={rotationEnabled}
            flipEnabled={flipEnabled}
            score={state.score}
          />
        </div>

        {!isMobile() && (
          <div className="game-sidebar">
            <GameInfo
              score={state.score}
              clearsCount={state.clearsCount}
              gameOver={state.gameOver}
              paused={state.paused}
              elapsedSeconds={elapsedSeconds}
              onPause={pause}
              onResume={resume}
              onRestart={handleRestartClick}
              rotationEnabled={rotationEnabled}
            />
          </div>
        )}
      </div>

      {state.paused && (
        <div className="pause-overlay">
          <div className="pause-content">
            <h2>{t("pause")}</h2>
            <p>{t("resume")}</p>
            <button className="resume-button" onClick={resume}>
              {t("resume")}
            </button>
          </div>
        </div>
      )}

      {state.gameOver && (
        <GameOverModal
          score={state.score}
          elapsedSeconds={elapsedSeconds}
          difficulty={state.difficulty as Difficulty}
          onRestart={restart}
          onContinue={continueGame}
        />
      )}

      {showRestartConfirm && (
        <div className="game-over-overlay">
          <div className="game-over-modal">
            <h2>{t("restartConfirm.title")}</h2>
            <p>{t("restartConfirm.message")}</p>
            <div className="game-over-buttons">
              <button className="continue-button" onClick={confirmRestart}>
                {t("restartConfirm.confirm")}
              </button>
              <button
                className="restart-button"
                onClick={() => setShowRestartConfirm(false)}
              >
                {t("restartConfirm.cancel")}
              </button>
            </div>
          </div>
        </div>
      )}

      {showDifficultyConfirm && (
        <div className="game-over-overlay">
          <div className="game-over-modal">
            <h2>{t("difficultyConfirm.title")}</h2>
            <p>{t("difficultyConfirm.message")}</p>
            <div className="game-over-buttons">
              <button
                className="continue-button"
                onClick={confirmDifficultyChange}
              >
                {t("difficultyConfirm.confirm")}
              </button>
              <button
                className="restart-button"
                onClick={() => {
                  setShowDifficultyConfirm(false);
                  setPendingDifficulty(null);
                }}
              >
                {t("difficultyConfirm.cancel")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Game;
