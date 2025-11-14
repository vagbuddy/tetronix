import React from "react";
import { useTranslation } from "react-i18next";
import "./DifficultySelector.css";
import type { Difficulty } from "../types/GameTypes";

interface DifficultySelectorProps {
  difficulty: Difficulty;
  onDifficultyChange: (difficulty: Difficulty) => void;
  leftSlot?: React.ReactNode;
  rightSlot?: React.ReactNode;
}

const DifficultySelector: React.FC<DifficultySelectorProps> = ({
  difficulty,
  onDifficultyChange,
  leftSlot,
  rightSlot,
}) => {
  const { t } = useTranslation();

  const difficulties: Array<{
    value: Difficulty;
    label: string;
  }> = [
    { value: "casual", label: t("difficulty.casual") },
    { value: "master", label: t("difficulty.master") },
    { value: "expert", label: t("difficulty.expert") },
    { value: "insane", label: t("difficulty.insane") },
  ];

  return (
    <div className="difficulty-selector difficulty-selector--with-slots">
      {leftSlot && (
        <div className="difficulty-slot difficulty-slot-left">{leftSlot}</div>
      )}
      <div className="difficulty-options">
        {difficulties.map((diff) => (
          <label
            key={diff.value}
            className={`difficulty-option ${
              difficulty === diff.value ? "selected" : ""
            }`}
            data-difficulty={diff.value}
            onClick={() => onDifficultyChange(diff.value)}
            style={{ cursor: "pointer" }}
          >
            <input
              type="radio"
              name="difficulty"
              value={diff.value}
              checked={difficulty === diff.value}
              readOnly
            />
            <span className="difficulty-content">
              <span className="difficulty-text">{diff.label}</span>
            </span>
          </label>
        ))}
      </div>
      {rightSlot && (
        <div className="difficulty-slot difficulty-slot-right">{rightSlot}</div>
      )}
    </div>
  );
};

export default DifficultySelector;
