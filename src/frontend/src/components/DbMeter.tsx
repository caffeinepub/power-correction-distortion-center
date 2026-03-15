import { useEffect, useRef, useState } from "react";
import { audioEngine } from "../audio/AudioEngine";

// Maps dBFS (-100..0) to display dB scale (60..140)
// 0 dBFS = 140 dB | -80 dBFS = 60 dB
const DBFS_TO_DISPLAY = (dbfs: number) =>
  Math.max(60, Math.min(140, dbfs + 140));

const SEGMENTS = [
  { min: 60, max: 85, color: "#22c55e" },
  { min: 85, max: 110, color: "#facc15" },
  { min: 110, max: 125, color: "#f97316" },
  { min: 125, max: 140, color: "#ef4444" },
];

const TICKS = [60, 70, 80, 90, 100, 110, 120, 130, 140];

export function DbMeter() {
  const [level, setLevel] = useState(60);
  const [peak, setPeak] = useState(60);
  const peakRef = useRef(60);
  const peakHoldRef = useRef(0);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const PEAK_HOLD_MS = 2000;

    const tick = () => {
      const dbfs = audioEngine.getDBFS();
      const display = DBFS_TO_DISPLAY(dbfs);

      setLevel(display);

      const now = performance.now();
      if (display > peakRef.current) {
        peakRef.current = display;
        peakHoldRef.current = now;
        setPeak(display);
      } else if (now - peakHoldRef.current > PEAK_HOLD_MS) {
        peakRef.current = Math.max(60, peakRef.current - 0.5);
        setPeak(peakRef.current);
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  const pct = (val: number) => ((val - 60) / 80) * 100;

  return (
    <div
      className="rounded-lg p-5 space-y-3"
      style={{ background: "#0a0f1e", border: "2px solid #1e40af" }}
    >
      <div className="flex items-center justify-between">
        <h3
          className="text-sm font-bold tracking-widest"
          style={{
            color: "#facc15",
            fontFamily: "'Bricolage Grotesque', sans-serif",
          }}
        >
          REAL-TIME DB METER
        </h3>
        <div className="flex items-center gap-3">
          <span className="text-xs font-mono" style={{ color: "#93c5fd" }}>
            LIVE:{" "}
            <span
              style={{
                color:
                  level >= 125
                    ? "#ef4444"
                    : level >= 110
                      ? "#f97316"
                      : "#22c55e",
                fontWeight: 700,
              }}
            >
              {level.toFixed(1)} dB
            </span>
          </span>
          <span className="text-xs font-mono" style={{ color: "#64748b" }}>
            PEAK:{" "}
            <span
              style={{
                color: peak >= 125 ? "#ef4444" : "#facc15",
                fontWeight: 700,
              }}
            >
              {peak.toFixed(1)} dB
            </span>
          </span>
        </div>
      </div>

      {/* Meter bar */}
      <div className="relative" style={{ height: 28 }}>
        {/* Track */}
        <div
          className="absolute inset-0 rounded"
          style={{ background: "#0f172a", border: "1px solid #1e3a6e" }}
        />

        {/* Color segments */}
        {SEGMENTS.map((seg) => {
          const segStart = pct(seg.min);
          const segWidth = pct(seg.max) - pct(seg.min);
          const fillEnd = pct(level);
          const visibleWidth = Math.max(
            0,
            Math.min(segWidth, fillEnd - segStart),
          );
          return (
            <div
              key={seg.min}
              className="absolute top-0 bottom-0"
              style={{
                left: `${segStart}%`,
                width: `${visibleWidth}%`,
                background: seg.color,
                opacity: 0.9,
                transition: "width 0.04s linear",
                boxShadow: visibleWidth > 0 ? `0 0 8px ${seg.color}88` : "none",
              }}
            />
          );
        })}

        {/* Peak indicator */}
        <div
          className="absolute top-0 bottom-0"
          style={{
            left: `calc(${pct(peak)}% - 2px)`,
            width: 3,
            background: peak >= 125 ? "#ef4444" : "#facc15",
            boxShadow: `0 0 6px ${peak >= 125 ? "#ef4444" : "#facc15"}`,
            transition: "left 0.1s linear",
          }}
        />
      </div>

      {/* Tick marks */}
      <div className="relative" style={{ height: 20 }}>
        {TICKS.map((tick) => (
          <div
            key={tick}
            className="absolute flex flex-col items-center"
            style={{ left: `${pct(tick)}%`, transform: "translateX(-50%)" }}
          >
            <div style={{ width: 1, height: 6, background: "#334155" }} />
            <span
              className="text-xs font-mono"
              style={{
                color:
                  tick >= 125
                    ? "#ef4444"
                    : tick >= 110
                      ? "#f97316"
                      : tick >= 85
                        ? "#facc15"
                        : "#64748b",
                fontSize: 9,
                marginTop: 1,
              }}
            >
              {tick}
            </span>
          </div>
        ))}
      </div>

      {/* Scale legend */}
      <div
        className="flex justify-between text-xs font-mono"
        style={{ color: "#334155", fontSize: 9 }}
      >
        <span style={{ color: "#22c55e" }}>60–85 dB CLEAN</span>
        <span style={{ color: "#facc15" }}>85–110 dB LOUD</span>
        <span style={{ color: "#f97316" }}>110–125 dB HOT</span>
        <span style={{ color: "#ef4444" }}>125–140 dB MAX</span>
      </div>
    </div>
  );
}
