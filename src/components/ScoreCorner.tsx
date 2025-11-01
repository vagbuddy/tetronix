import React from "react";
import "./ScoreCorner.css";

const ScoreCorner: React.FC<{ score: number }> = ({ score }) => (
  <div className="score-corner">
    <span className="score-label">Score:</span>
    <span className="score-value">{score}</span>
  </div>
);

export default ScoreCorner;
