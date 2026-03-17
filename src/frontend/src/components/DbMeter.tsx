import { useEffect, useRef, useState } from "react";
import { audioEngine } from "../audio/AudioEngine";

const DBFS_TO_DISPLAY = (dbfs: number) =>
  Math.max(60, Math.min(120, dbfs + 120));

const GREEN = "#22c55e";
const TICKS = [60, 70, 80, 90, 100, 110, 120];

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

  const pct = (val: number) => ((val - 60) / 60) * 100;

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
            <span style={{ color: GREEN, fontWeight: 700 }}>
              {level.toFixed(1)} dB
            </span>
          </span>
          <span className="text-xs font-mono" style={{ color: "#64748b" }}>
            PEAK:{" "}
            <span style={{ color: GREEN, fontWeight: 700 }}>
              {peak.toFixed(1)} dB
            </span>
          </span>
        </div>
      </div>

      {/* Meter bar */}
      <div className="relative" style={{ height: 28 }}>
        <div
          className="absolute inset-0 rounded"
          style={{ background: "#0f172a", border: "1px solid #1e3a6e" }}
        />
        {/* Full green fill */}
        <div
          className="absolute top-0 bottom-0 left-0 rounded"
          style={{
            width: `${pct(level)}%`,
            background: GREEN,
            opacity: 0.9,
            transition: "width 0.04s linear",
            boxShadow: pct(level) > 0 ? `0 0 10px ${GREEN}88` : "none",
          }}
        />
        {/* Peak indicator — always green */}
        <div
          className="absolute top-0 bottom-0"
          style={{
            left: `calc(${pct(peak)}% - 2px)`,
            width: 3,
            background: GREEN,
            boxShadow: `0 0 6px ${GREEN}`,
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
            <div style={{ width: 1, height: 6, background: GREEN }} />
            <span
              className="text-xs font-mono"
              style={{ color: GREEN, fontSize: 9, marginTop: 1 }}
            >
              {tick}
            </span>
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="flex justify-center text-xs font-mono">
        <span style={{ color: GREEN, fontSize: 9 }}>60–120 dB ALL GREEN</span>
      </div>
    </div>
  );
}
