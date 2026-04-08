import type { MouseEventHandler, ReactNode } from "react";

interface CanvasBottomBarProps {
  canAddBlock?: boolean;
  onAddBlock?: MouseEventHandler<HTMLButtonElement>;
  onFitView: () => void;
  onRun?: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  scale: number;
}

export function CanvasBottomBar({
  canAddBlock,
  onAddBlock,
  onFitView,
  onRun,
  onZoomIn,
  onZoomOut,
  scale,
}: CanvasBottomBarProps) {
  return (
    <div
      data-testid="flow-builder-bottom-bar"
      style={{
        alignItems: "center",
        backdropFilter: "blur(16px)",
        background: "var(--fb-toolbar-bg, rgba(17, 24, 39, 0.92))",
        border: "1px solid var(--fb-toolbar-border, rgba(255, 255, 255, 0.08))",
        borderRadius: 22,
        bottom: 20,
        boxShadow: "var(--fb-toolbar-shadow, 0 22px 48px rgba(15, 23, 42, 0.24))",
        color: "var(--fb-toolbar-text, #f8fafc)",
        display: "flex",
        gap: 6,
        left: "50%",
        minHeight: 56,
        padding: 8,
        pointerEvents: "auto",
        position: "absolute",
        transform: "translateX(-50%)",
        zIndex: 9,
      }}
    >
      <ControlButton ariaLabel="Zoom out" label="−" onClick={onZoomOut} />
      <ControlButton ariaLabel="Zoom in" label="+" onClick={onZoomIn} />
      <ControlButton
        ariaLabel="Fit view"
        dataTestId="flow-builder-fit-view"
        icon={<FitIcon />}
        label={`${Math.round(scale * 100)}%`}
        onClick={onFitView}
      />
      {onRun ? (
        <>
          <Divider />
          <button type="button" onClick={onRun} style={primaryButtonStyle}>
            <PlayIcon />
            <span>Run</span>
          </button>
        </>
      ) : null}
      {canAddBlock ? (
        <>
          <Divider />
          <button type="button" onClick={onAddBlock} style={ghostButtonStyle}>
            <span style={{ fontSize: 20, lineHeight: 1 }}>+</span>
            <span>Block</span>
          </button>
        </>
      ) : null}
    </div>
  );
}

function ControlButton({
  ariaLabel,
  dataTestId,
  icon,
  label,
  onClick,
}: {
  ariaLabel: string;
  dataTestId?: string;
  icon?: ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      aria-label={ariaLabel}
      data-testid={dataTestId}
      type="button"
      onClick={onClick}
      style={ghostButtonStyle}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

function Divider() {
  return (
    <div
      aria-hidden="true"
      style={{
        background: "var(--fb-toolbar-divider, rgba(255, 255, 255, 0.08))",
        borderRadius: 999,
        height: 28,
        width: 1,
      }}
    />
  );
}

function FitIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 16 16" style={{ height: 14, width: 14 }}>
      <path
        d="M3 6V3h3M10 3h3v3M13 10v3h-3M6 13H3v-3"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />
    </svg>
  );
}

function PlayIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 16 16" style={{ height: 16, width: 16 }}>
      <path d="M5 3.8v8.4L12 8 5 3.8Z" fill="currentColor" />
    </svg>
  );
}

const ghostButtonStyle = {
  alignItems: "center",
  background: "var(--fb-toolbar-button-bg, rgba(255, 255, 255, 0.04))",
  border: 0,
  borderRadius: 16,
  color: "inherit",
  cursor: "pointer",
  display: "inline-flex",
  fontSize: 14,
  fontWeight: 600,
  gap: 8,
  height: 40,
  justifyContent: "center",
  minWidth: 40,
  padding: "0 14px",
};

const primaryButtonStyle = {
  ...ghostButtonStyle,
  background: "var(--fb-toolbar-primary-bg, #2563eb)",
  color: "var(--fb-toolbar-primary-text, #eff6ff)",
  minWidth: 108,
};
