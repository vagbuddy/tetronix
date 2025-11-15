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
import SettingsButton from "./SettingsButton";
import "./Game.css";
import { isMobile } from "../utils/DeviceDetection";
import type { Difficulty } from "../types/GameTypes";

const Game: React.FC = () => {
  const { t } = useTranslation();
  const [showRestartConfirm, setShowRestartConfirm] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
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
    hasSaved,
    discardSavedAndRestart,
    loadedFromStorage,
  } = useGameState();

  // Initialize the prompt visibility from whether a saved game was loaded
  // at startup to avoid rendering the pause modal briefly on first paint.
  const [showLoadPrompt, setShowLoadPrompt] = useState<boolean>(
    !!loadedFromStorage
  );
  // Show the load prompt only if a saved game was present at initial load.
  // This avoids re-prompting on subsequent autosaves.
  useEffect(() => {
    if (!loadedFromStorage) return;

    // If the saved board is empty (no filled cells and no placed pieces),
    // there's nothing to continue — discard saved game and start fresh.
    const boardHasAnyFilled = state.grid.some((row) =>
      row.some((cell: any) => cell && cell.filled)
    );
    const anyPlacedPieces = state.availablePieces.some((p) => p.isPlaced);
    if (!boardHasAnyFilled && !anyPlacedPieces) {
      discardSavedAndRestart();
      setShowLoadPrompt(false);
      return;
    }

    setShowLoadPrompt(true);
    // run only on initial mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
      <DifficultySelector
        difficulty={state.difficulty}
        onDifficultyChange={handleDifficultyClick}
        rightSlot={<SettingsButton onClick={() => setShowSettings(true)} />}
      />

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

      {state.paused && !showLoadPrompt && (
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

      {showSettings && (
        <div className="game-over-overlay">
          <div className="game-over-modal">
            <h2>Settings</h2>
            <div style={{ marginBottom: 12 }}>
              <LanguageSelector />
            </div>
            <div className="game-over-buttons">
              <button
                className="continue-button"
                onClick={() => setShowSettings(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
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

      {showLoadPrompt && (
        <div className="game-over-overlay">
          <div className="game-over-modal">
            <h2>{t("loadPrompt.title")}</h2>
            <p>{t("loadPrompt.message")}</p>
            <div className="game-over-buttons">
              <button
                className="continue-button"
                onClick={() => {
                  // Continue uses the loaded state; unhide prompt and resume if paused
                  setShowLoadPrompt(false);
                  if (state.paused && !state.gameOver) {
                    resume();
                  }
                }}
              >
                {t("loadPrompt.continue")}
              </button>
              <button
                className="restart-button"
                onClick={() => {
                  // Discard saved game and start fresh
                  discardSavedAndRestart();
                  setShowLoadPrompt(false);
                }}
              >
                {t("loadPrompt.startNew")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Game;
