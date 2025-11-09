import React from "react";
import "./DifficultySelector.css";
import type { Difficulty } from "../types/GameTypes";

interface DifficultySelectorProps {
  difficulty: Difficulty;
  onDifficultyChange: (difficulty: Difficulty) => void;
}

const DifficultySelector: React.FC<DifficultySelectorProps> = ({
  difficulty,
  onDifficultyChange,
}) => {
  const difficulties: Array<{
    value: Difficulty;
    label: string;
  }> = [
    { value: "casual", label: "Casual" },
    { value: "master", label: "Master" },
    { value: "expert", label: "Expert" },
    { value: "insane", label: "Insane" },
  ];

  return (
    <div className="difficulty-selector">
      <div className="difficulty-options">
        {difficulties.map((diff) => (
          <label
            key={diff.value}
            className={`difficulty-option ${
              difficulty === diff.value ? "selected" : ""
            }`}
            data-difficulty={diff.value}
          >
            <input
              type="radio"
              name="difficulty"
              value={diff.value}
              checked={difficulty === diff.value}
              onChange={(e) => onDifficultyChange(e.target.value as Difficulty)}
            />
            <span className="difficulty-content">
              <span className="difficulty-text">{diff.label}</span>
            </span>
          </label>
        ))}
      </div>
    </div>
  );
};

export default DifficultySelector;
