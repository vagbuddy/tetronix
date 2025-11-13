import React, { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import "./LanguageSelector.css";

const languages = [
  { code: "en", flag: "🇬🇧" },
  { code: "ee", flag: "🇪🇪" },
  { code: "ru", flag: "🇷🇺" },
];

const LanguageSelector: React.FC = () => {
  const { i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Initial language is handled by i18next-browser-languagedetector
  // which loads from localStorage first, then falls back to navigator.
  // No override here to preserve the user’s saved choice.

  // Close dropdown on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const current =
    languages.find((l) => l.code === i18n.language) || languages[0];

  return (
    <div className="lang-selector" ref={ref}>
      <button
        className="lang-selector__button"
        aria-label="Select language"
        onClick={() => setOpen((v) => !v)}
      >
        {current.flag}
      </button>
      {open && (
        <div className="lang-selector__dropdown">
          {languages.map((lang) => (
            <button
              key={lang.code}
              className="lang-selector__option"
              onClick={() => {
                i18n.changeLanguage(lang.code);
                setOpen(false);
              }}
              aria-label={lang.code}
            >
              {lang.flag}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default LanguageSelector;
