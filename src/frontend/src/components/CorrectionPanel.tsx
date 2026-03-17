import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useEffect, useRef, useState } from "react";
import { AudioEngine, audioEngine } from "../audio/AudioEngine";

interface CorrectionPanelProps {
  stabilizer: boolean;
  onStabilizerChange: (val: boolean) => void;
}

function formatBig(n: number): string {
  if (n >= 1e9) return `${(n / 1e9).toFixed(1).replace(/\.0$/, "")}B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(1).replace(/\.0$/, "")}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(1).replace(/\.0$/, "")}K`;
  return n.toLocaleString();
}

export function CorrectionPanel({
  stabilizer,
  onStabilizerChange,
}: CorrectionPanelProps) {
  const [dbfs, setDbfs] = useState(-100);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const tick = () => {
      setDbfs(audioEngine.getDBFS());
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const meterPercent = Math.max(0, Math.min(100, ((dbfs + 60) / 60) * 100));

  const corrections = [
    { label: "COMMANDER", value: formatBig(AudioEngine.COMMANDER) },
    { label: "GAIN CORRECTION", value: formatBig(AudioEngine.GAIN_PASSES) },
    { label: "MONITOR", value: formatBig(AudioEngine.MONITOR) },
    { label: "STABILIZER", value: formatBig(AudioEngine.STABILIZER_VAL) },
    {
      label: "SIGNAL CLEANER",
      value: formatBig(AudioEngine.SIGNAL_CLEANER_VAL),
    },
  ];

  // Unified correction force: all 5 corrections multiplied together
  const correctionForceDisplay = "1.3e45";

  return (
    <div
      data-ocid="correction.panel"
      className="rounded-lg p-4 space-y-3"
      style={{ background: "#0a0f1e", border: "2px solid #1e40af" }}
    >
      <h3
        className="text-xs font-bold tracking-widest"
        style={{
          color: "#facc15",
          fontFamily: "'Bricolage Grotesque', sans-serif",
        }}
      >
        CORRECTION SYSTEM — UNIFIED FORCE ATTACKING DISTORTION
      </h3>

      <div className="grid grid-cols-1 gap-1.5">
        {corrections.map((c) => (
          <div
            key={c.label}
            className="flex items-center justify-between px-3 py-1.5 rounded"
            style={{ background: "#0d1527", border: "1px solid #1e3a6e" }}
          >
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <div
                className="w-2 h-2 flex-shrink-0 rounded-full"
                style={{ background: "#3b82f6", boxShadow: "0 0 6px #3b82f6" }}
              />
              <span
                className="text-xs font-bold tracking-wider truncate"
                style={{ color: "#93c5fd" }}
              >
                {c.label}
              </span>
            </div>
            <div className="flex items-center gap-1.5 flex-shrink-0 ml-2">
              <span
                className="text-xs font-mono font-bold"
                style={{
                  color: "#facc15",
                  minWidth: "3.5rem",
                  textAlign: "right",
                }}
              >
                {c.value}
              </span>
              <span
                className="text-xs font-bold px-1 py-0.5 rounded"
                style={{
                  background: "#0d1b3e",
                  color: "#3b82f6",
                  border: "1px solid #1e40af",
                  fontSize: "0.6rem",
                }}
              >
                ON
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Unified Correction Force display */}
      <div
        className="px-3 py-2 rounded flex items-center justify-between gap-2"
        style={{ background: "#05080f", border: "2px solid #ef4444" }}
      >
        <span
          className="text-xs font-bold tracking-widest"
          style={{ color: "#facc15" }}
        >
          CORRECTION FORCE
        </span>
        <span
          className="text-sm font-mono font-bold"
          style={{ color: "#ef4444", letterSpacing: "0.05em" }}
        >
          {correctionForceDisplay}
        </span>
      </div>

      <div
        className="px-3 py-2 rounded space-y-1"
        style={{ background: "#05080f", border: "1px solid #facc15" }}
      >
        <div className="flex justify-between items-center text-xs font-mono gap-2">
          <span style={{ color: "#94a3b8", flexShrink: 0 }}>
            ×10 SMART CHIP
          </span>
          <span
            style={{
              color: "#fbbf24",
              fontSize: "0.65rem",
              textAlign: "right",
            }}
          >
            MAX DISTORTION KILL
          </span>
        </div>
        <div className="text-xs font-mono" style={{ color: "#64748b" }}>
          UNIFIED FORCE → LIMITER EASE → BRICK WALL
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 flex-shrink-0">
          <Switch
            data-ocid="correction.switch"
            checked={stabilizer}
            onCheckedChange={(v) => {
              onStabilizerChange(v);
              audioEngine.toggleStabilizer(v);
            }}
          />
          <Label
            className="text-xs font-bold tracking-wider"
            style={{ color: stabilizer ? "#facc15" : "#64748b" }}
          >
            STAB {stabilizer ? "ON" : "OFF"}
          </Label>
        </div>

        <div className="flex-1 space-y-1 min-w-0">
          <div className="flex justify-between text-xs font-mono">
            <span style={{ color: "#64748b" }}>dBFS</span>
            <span style={{ color: "#3b82f6" }}>
              {dbfs > -99 ? dbfs.toFixed(1) : "-inf"} dBFS
            </span>
          </div>
          <div
            className="h-3 rounded-full overflow-hidden"
            style={{ background: "#0d1527", border: "1px solid #1e3a6e" }}
          >
            <div
              className="h-full rounded-full"
              style={{
                width: `${meterPercent}%`,
                background: "linear-gradient(90deg, #1e3a6e, #3b82f6)",
                boxShadow: "0 0 6px #3b82f6",
                transition: "width 0.05s linear",
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
