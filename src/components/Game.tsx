import React, { useMemo } from "react";
import { useGameState } from "../hooks/useGameState";
import GameBoard from "./GameBoard";
import PieceSelection from "./PieceSelection";
import GameInfo from "./GameInfo";
import ScoreCorner from "./ScoreCorner";
import GameOverModal from "./GameOverModal";
import DifficultySelector from "./DifficultySelector";
import "./Game.css";
import { isMobile } from "../utils/DeviceDetection";
import type { Difficulty } from "../types/GameTypes";

const Game: React.FC = () => {
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
  } = useGameState();

  const rotationEnabled = useMemo(
    () => state.difficulty === "casual" || state.difficulty === "expert",
    [state.difficulty]
  );
  const flipEnabled = useMemo(
    () => state.difficulty === "insane",
    [state.difficulty]
  );

  return (
    <div className="game-container">
      <DifficultySelector
        difficulty={state.difficulty}
        onDifficultyChange={setDifficulty}
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
              onPause={pause}
              onResume={resume}
              onRestart={restart}
              rotationEnabled={rotationEnabled}
            />
          </div>
        )}
      </div>

      {state.paused && (
        <div className="pause-overlay">
          <div className="pause-content">
            <h2>Game Paused</h2>
            <p>Click Resume to continue playing</p>
            <button className="resume-button" onClick={resume}>
              Resume
            </button>
          </div>
        </div>
      )}

      {state.gameOver && (
        <GameOverModal
          score={state.score}
          startTime={state.startTime}
          onRestart={restart}
          onContinue={continueGame}
        />
      )}
    </div>
  );
};

export default Game;
