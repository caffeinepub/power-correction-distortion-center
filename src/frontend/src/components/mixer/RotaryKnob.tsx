import { useCallback, useEffect, useRef } from "react";

export interface RotaryKnobProps {
  value: number;
  onChange: (v: number) => void;
  color: string;
  indicatorColor: string;
  label: string;
  min?: number;
  max?: number;
  size?: number;
}

export function RotaryKnob({
  value,
  onChange,
  color,
  indicatorColor,
  label,
  min = 0,
  max = 100,
  size = 64,
}: RotaryKnobProps) {
  const dragging = useRef(false);
  const lastY = useRef(0);
  const lastTouch = useRef(0);

  // Map value to rotation: min -> -135deg, max -> +135deg
  const rotation = ((value - min) / (max - min)) * 270 - 135;

  // Indicator dot position on the knob circumference
  const rad = (rotation * Math.PI) / 180;
  const r = size / 2 - 6;
  const dotX = size / 2 + r * Math.sin(rad);
  const dotY = size / 2 - r * Math.cos(rad);

  const applyDelta = useCallback(
    (dy: number) => {
      const range = max - min;
      const delta = (-dy / 120) * range;
      const next = Math.max(min, Math.min(max, value + delta));
      onChange(Math.round(next));
    },
    [value, onChange, min, max],
  );

  // Mouse handlers
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    dragging.current = true;
    lastY.current = e.clientY;
    e.preventDefault();
  }, []);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dragging.current) return;
      const dy = e.clientY - lastY.current;
      lastY.current = e.clientY;
      applyDelta(dy);
    };
    const onUp = () => {
      dragging.current = false;
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
    return () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };
  }, [applyDelta]);

  // Touch handlers
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    lastTouch.current = e.touches[0].clientY;
    e.preventDefault();
  }, []);

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      const dy = e.touches[0].clientY - lastTouch.current;
      lastTouch.current = e.touches[0].clientY;
      applyDelta(dy);
      e.preventDefault();
    },
    [applyDelta],
  );

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "4px",
        userSelect: "none",
      }}
    >
      <div
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        style={{
          width: `${size}px`,
          height: `${size}px`,
          borderRadius: "50%",
          background: `radial-gradient(circle at 38% 35%, ${color}cc, ${color}88, #0a0a0a)`,
          border: `2px solid ${color}`,
          cursor: "ns-resize",
          position: "relative",
          boxShadow: `0 0 10px ${color}66, inset 0 2px 4px rgba(255,255,255,0.08)`,
          touchAction: "none",
        }}
      >
        {/* Outer tick ring: subtle arc marks */}
        <svg
          aria-hidden="true"
          width={size}
          height={size}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            pointerEvents: "none",
          }}
        >
          {[-135, -90, -45, 0, 45, 90, 135].map((deg) => {
            const tickRad = (deg * Math.PI) / 180;
            const r1 = size / 2 - 3;
            const r2 = size / 2 - 7;
            const x1 = size / 2 + r1 * Math.sin(tickRad);
            const y1 = size / 2 - r1 * Math.cos(tickRad);
            const x2 = size / 2 + r2 * Math.sin(tickRad);
            const y2 = size / 2 - r2 * Math.cos(tickRad);
            return (
              <line
                key={deg}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke="rgba(255,255,255,0.15)"
                strokeWidth="1"
              />
            );
          })}
        </svg>

        {/* Indicator dot */}
        <div
          style={{
            position: "absolute",
            width: "7px",
            height: "7px",
            borderRadius: "50%",
            background: indicatorColor,
            boxShadow: `0 0 6px ${indicatorColor}, 0 0 10px ${indicatorColor}88`,
            left: `${dotX - 3.5}px`,
            top: `${dotY - 3.5}px`,
            pointerEvents: "none",
            transition: "left 0.04s, top 0.04s",
          }}
        />

        {/* Center cap */}
        <div
          style={{
            position: "absolute",
            width: "18px",
            height: "18px",
            borderRadius: "50%",
            background: "radial-gradient(circle at 40% 35%, #444, #111)",
            border: "1px solid rgba(255,255,255,0.1)",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            pointerEvents: "none",
          }}
        />
      </div>

      <span
        style={{
          fontSize: "9px",
          color: "rgba(255,255,255,0.5)",
          fontFamily: "monospace",
          letterSpacing: "0.08em",
          textTransform: "uppercase",
        }}
      >
        {label}
      </span>

      <span
        style={{
          fontSize: "9px",
          color: indicatorColor,
          fontFamily: "monospace",
          opacity: 0.8,
        }}
      >
        {value}
      </span>
    </div>
  );
}
