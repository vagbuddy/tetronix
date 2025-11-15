import React from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEllipsisVertical } from "@fortawesome/free-solid-svg-icons";
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
      aria-label="More"
      type="button"
    >
      <FontAwesomeIcon icon={faEllipsisVertical} />
    </button>
  );
};

export default SettingsButton;
