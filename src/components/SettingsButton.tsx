import React from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSliders } from "@fortawesome/free-solid-svg-icons"; // Font Awesome sliders glyph
import "./SettingsButton.css";

type Props = {
  onClick?: () => void;
};

const SettingsButton: React.FC<Props> = ({ onClick }) => {
  const handleClick = () => {
    if (onClick) {
      onClick();
      return;
    }
    // Fallback: placeholder for settings functionality/modal trigger
    console.log("Settings clicked");
  };

  return (
    <button
      className="settings-button"
      onClick={handleClick}
      aria-label="Settings"
      type="button"
    >
      <FontAwesomeIcon icon={faSliders} />
    </button>
  );
};

export default SettingsButton;
