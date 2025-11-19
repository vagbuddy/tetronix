import React from "react";

interface Props extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  disabled?: boolean;
  disabledReason?: string;
}

const DisabledAwareButton: React.FC<Props> = ({
  disabled,
  disabledReason,
  children,
  className,
  onClick,
  ...rest
}) => {
  const handleOverlayClick = (e: React.MouseEvent | React.KeyboardEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const reason = disabledReason || "Button is disabled";
    // Log a concise debug message; use warn so it stands out in console
    // Include a timestamp to make it easier to spot transient events
    console.warn(
      `[DisabledAwareButton] ${reason} — ${new Date().toISOString()}`
    );
  };

  return (
    <div
      className={`disabled-button-wrapper`}
      style={{ display: "inline-block", position: "relative" }}
    >
      <button
        {...rest}
        className={className}
        disabled={disabled}
        onClick={disabled ? undefined : onClick}
      >
        {children}
      </button>

      {disabled && (
        <div
          className="disabled-overlay"
          role="button"
          tabIndex={0}
          onClick={handleOverlayClick}
          onKeyDown={(e) => {
            const ke = e as React.KeyboardEvent;
            if (ke.key === "Enter" || ke.key === " ") handleOverlayClick(ke);
          }}
          aria-label={disabledReason || "Disabled"}
        />
      )}
    </div>
  );
};

export default DisabledAwareButton;
