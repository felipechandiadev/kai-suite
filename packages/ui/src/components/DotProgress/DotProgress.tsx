'use client';

import React, { useEffect, useState } from "react";
import "./dot-progress.css";

interface DotProgressProps {
  size?: number;
  gap?: number;
  colorPrimary?: string;
  colorNeutral?: string;
  className?: string;
  interval?: number;
  totalSteps?: number;
  activeStep?: number;
}

const DEFAULT_SIZE = 16;
const DEFAULT_GAP = 8;
const DEFAULT_PRIMARY = "var(--color-primary)";
const DEFAULT_NEUTRAL = "var(--color-neutral)";
const DEFAULT_INTERVAL = 350;

const DotProgress: React.FC<DotProgressProps> = ({
  size = DEFAULT_SIZE,
  gap = DEFAULT_GAP,
  colorPrimary = DEFAULT_PRIMARY,
  colorNeutral = DEFAULT_NEUTRAL,
  className = "",
  interval = DEFAULT_INTERVAL,
  totalSteps = 5,
  activeStep,
}) => {
  const [active, setActive] = useState(activeStep ?? 0);

  useEffect(() => {
    if (activeStep !== undefined) {
      setActive(activeStep);
      return;
    }
    const timer = setInterval(() => {
      setActive((prev) => (prev + 1) % totalSteps);
    }, interval);
    return () => clearInterval(timer);
  }, [interval, totalSteps, activeStep]);

  return (
    <span
      className={`inline-flex items-center ${className}`}
      style={{ gap }}
      data-test-id="dot-progress-root"
      role="status"
      aria-hidden
    >
      {[...Array(totalSteps)].map((_, i) => {
        const isActive = i === active;
        const pulse = isActive && activeStep === undefined;
        return (
          <span
            key={i}
            className={pulse ? "fs-dot-progress__dot--pulse" : undefined}
            style={{
              width: size,
              height: size,
              borderRadius: "50%",
              backgroundColor: isActive ? colorPrimary : colorNeutral,
              display: "inline-block",
              flexShrink: 0,
              transition: "background-color 0.2s",
              cursor: "default",
            }}
          />
        );
      })}
    </span>
  );
};

export default DotProgress;
