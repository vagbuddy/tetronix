import React, { useEffect, useState, useMemo } from "react";
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
import SettingsModal from "./SettingsModal";
import "./Game.css";
import { isMobile } from "../utils/DeviceDetection";
import type { Difficulty } from "../types/GameTypes";
import { CELL_SIZE } from "../utils/GameLogic";

const Game: React.FC = () => {
  const { t } = useTranslation();
  const [showRestartConfirm, setShowRestartConfirm] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showDifficultyConfirm, setShowDifficultyConfirm] = useState(false);
  const [pendingDifficulty, setPendingDifficulty] = useState<Difficulty | null>(
    null
  );
  const [currentCellSize, setCurrentCellSize] = useState<number>(CELL_SIZE);
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
    hasSaved,
    discardSavedAndRestart,
    loadedFromStorage,
  } = useGameState();
  const [allowReopenGameOver, setAllowReopenGameOver] = useState(false);
  const [reopenedGameOverVisible, setReopenedGameOverVisible] = useState(false);
  const [submittedSnapshot, setSubmittedSnapshot] = useState<{
    leaderboard?: any[];
    userRank?: number;
  } | null>(null);

  const handleScoreClick = () => {
    if (allowReopenGameOver) setReopenedGameOverVisible(true);
  };

  // Initialize the prompt visibility from whether a saved game was loaded
  // at startup to avoid rendering the pause modal briefly on first paint.
  const [showLoadPrompt, setShowLoadPrompt] = useState<boolean>(
    !!loadedFromStorage
  );

  // Timer state for live updating
  const [liveElapsed, setLiveElapsed] = useState(0);
  const intervalRef = React.useRef<number | null>(null);

  // Update timer every second while game is running
  useEffect(() => {
    // Clear any existing interval before proceeding
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    if (!state.startTime) {
      setLiveElapsed(0);
      return;
    }

    // If paused or game over, freeze timer at pause time (if available) or endTime
    if (state.paused || state.gameOver) {
      const stopAt = state.paused
        ? state.pausedAt || state.endTime || Date.now()
        : state.endTime || Date.now();
      setLiveElapsed(Math.floor((stopAt - state.startTime!) / 1000));
      return;
    }

    // Only run interval when game is active
    setLiveElapsed(Math.floor((Date.now() - state.startTime!) / 1000));
    intervalRef.current = window.setInterval(() => {
      setLiveElapsed(Math.floor((Date.now() - state.startTime!) / 1000));
    }, 1000) as unknown as number;
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [state.startTime, state.endTime, state.paused, state.gameOver]);

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

  const isGameStarted = () => {
    return (
      state.score > 0 ||
      state.grid.some((row) => row.some((cell: any) => cell && cell.filled)) ||
      state.availablePieces.some((p) => p.isPlaced)
    );
  };

  const handleRestartClick = () => {
    if (!state.gameOver && isGameStarted()) {
      setShowRestartConfirm(true);
    } else {
      restart();
    }
  };

  const handleDifficultyClick = (newDifficulty: Difficulty) => {
    if (newDifficulty === state.difficulty) {
      // Clicking same difficulty: restart with confirmation if game is active
      if (!state.gameOver && isGameStarted()) {
        setShowRestartConfirm(true);
      } else {
        restart();
      }
    } else {
      // Changing difficulty: show confirmation if game is active
      if (!state.gameOver && isGameStarted()) {
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
            onCellSizeChange={setCurrentCellSize}
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
            cellSize={currentCellSize}
            onScoreClick={handleScoreClick}
          />
        </div>

        {!isMobile() && (
          <div className="game-sidebar">
            <GameInfo
              score={state.score}
              clearsCount={state.clearsCount}
              gameOver={state.gameOver}
              onScoreClick={handleScoreClick}
              paused={state.paused}
              elapsedSeconds={liveElapsed}
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
          playedSeconds={
            state.startTime
              ? Math.floor(
                  ((state.endTime || Date.now()) - state.startTime) / 1000
                )
              : 0
          }
          difficulty={state.difficulty as Difficulty}
          seed={state.seed}
          moves={state.moveLog}
          canSubmit={!!state.seedFromServer}
          onRestart={() => {
            // clear any reopen state when restarting
            setAllowReopenGameOver(false);
            setSubmittedSnapshot(null);
            restart();
          }}
          onContinue={() => {
            continueGame();
            setAllowReopenGameOver(true);
          }}
          onSubmitted={(leaderboard, userRank) => {
            setSubmittedSnapshot({ leaderboard, userRank });
          }}
        />
      )}

      {reopenedGameOverVisible && (
        <GameOverModal
          score={state.score}
          playedSeconds={
            state.startTime
              ? Math.floor(
                  ((state.endTime || Date.now()) - state.startTime) / 1000
                )
              : 0
          }
          difficulty={state.difficulty as Difficulty}
          seed={state.seed}
          moves={state.moveLog}
          canSubmit={!!state.seedFromServer && !submittedSnapshot}
          initialLeaderboard={submittedSnapshot?.leaderboard}
          initialUserRank={submittedSnapshot?.userRank}
          onRestart={() => {
            setAllowReopenGameOver(false);
            setSubmittedSnapshot(null);
            setReopenedGameOverVisible(false);
            restart();
          }}
          onContinue={() => {
            setReopenedGameOverVisible(false);
          }}
          onSubmitted={(leaderboard, userRank) => {
            setSubmittedSnapshot({ leaderboard, userRank });
          }}
        />
      )}

      {showSettings && (
        <SettingsModal
          open={showSettings}
          onClose={() => setShowSettings(false)}
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
