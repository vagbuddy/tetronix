import React from "react";
import { useTranslation } from "react-i18next";
import "./ScoreCorner.css";

const ScoreCorner: React.FC<{ score: number }> = ({ score }) => {
  const { t } = useTranslation();

  return (
    <div className="score-corner">
      <span className="score-label">{t("score")}:</span>
      <span className="score-value">{score}</span>
    </div>
  );
};

export default ScoreCorner;
