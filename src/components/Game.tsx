import React from "react";
import { useGameState } from "../hooks/useGameState";
import GameBoard from "./GameBoard";
import PieceSelection from "./PieceSelection";
import GameInfo from "./GameInfo";
import "./Game.css";

const Game: React.FC = () => {
  const {
    state,
    selectPiece,
    deselectPiece,
    placePiece,
    rotatePiece,
    startDrag,
    endDrag,
    pause,
    resume,
    restart,
  } = useGameState();

  return (
    <div className="game-container">
      {/* <div className="game-header">
        <h1>Sudoku Tetris Puzzle</h1>
        <p>Drag and drop Tetris pieces to fill the Sudoku board!</p>
      </div> */}

      <div className="game-content">
        <div className="game-main">
          <GameBoard
            grid={state.grid}
            selectedPiece={state.selectedPiece}
            availablePieces={state.availablePieces}
            onPiecePlace={placePiece}
            onPieceDeselect={deselectPiece}
          />

          <PieceSelection
            pieces={state.availablePieces}
            selectedPiece={state.selectedPiece}
            onPieceClick={selectPiece}
            onPieceRotate={rotatePiece}
            onStartDrag={startDrag}
            onEndDrag={endDrag}
          />
        </div>

        {/* <div className="game-sidebar">
          <GameInfo
            score={state.score}
            level={state.level}
            linesCleared={state.linesCleared}
            gameOver={state.gameOver}
            paused={state.paused}
            onPause={pause}
            onResume={resume}
            onRestart={restart}
          />
        </div> */}
      </div>

      {state.paused && (
        <div className="pause-overlay">
          <div className="pause-content">
            <h2>Game Paused</h2>
            <p>Click Resume to continue playing</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default Game;
