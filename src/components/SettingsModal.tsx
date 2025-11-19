import React from "react";
import { useTranslation } from "react-i18next";
import LanguageSelector from "./LanguageSelector";
import DisabledAwareButton from "./DisabledAwareButton";
import "./SettingsModal.css";

interface Props {
  open: boolean;
  onClose: () => void;
}

const SettingsModal: React.FC<Props> = ({ open, onClose }) => {
  const { t } = useTranslation();
  if (!open) return null;
  return (
    <div className="settings-overlay" onClick={onClose}>
      <div className="settings-panel" onClick={(e) => e.stopPropagation()}>
        <button
          className="settings-x"
          aria-label={t("settings.close", "Close")}
          onClick={onClose}
        >
          ×
        </button>
        <h2 className="settings-title">
          {t("settings.title", { defaultValue: "Settings" })}
        </h2>

        <div className="settings-body">
          <div className="settings-row">
            <span>{t("settings.language", { defaultValue: "Language" })}</span>
            <LanguageSelector />
          </div>

          {/* future settings can go here */}
        </div>

        <div className="settings-actions">
          <DisabledAwareButton
            className="continue-button"
            onClick={onClose}
            // not disabled here, but when used elsewhere pass `disabled` and `disabledReason`
          >
            {t("settings.close", { defaultValue: "Close" })}
          </DisabledAwareButton>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
