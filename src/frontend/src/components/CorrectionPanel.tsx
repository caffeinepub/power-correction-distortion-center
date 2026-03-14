import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useEffect, useRef, useState } from "react";
import { AudioEngine, audioEngine } from "../audio/AudioEngine";

interface CorrectionPanelProps {
  stabilizer: boolean;
  onStabilizerChange: (val: boolean) => void;
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
  const meterColor = dbfs > -6 ? "#ef4444" : dbfs > -18 ? "#facc15" : "#22c55e";

  const corrections = [
    { label: "COMMANDER", value: AudioEngine.COMMANDER.toLocaleString() },
    {
      label: "GAIN SIGNAL CORRECTION PASSES",
      value: AudioEngine.GAIN_PASSES.toLocaleString(),
    },
    { label: "MONITOR", value: AudioEngine.MONITOR.toLocaleString() },
  ];

  return (
    <div
      data-ocid="correction.panel"
      className="rounded-lg p-5 space-y-4"
      style={{ background: "#0a0f1e", border: "2px solid #1e40af" }}
    >
      <h3
        className="text-sm font-bold tracking-widest"
        style={{
          color: "#facc15",
          fontFamily: "'Bricolage Grotesque', sans-serif",
        }}
      >
        CORRECTION SYSTEM
      </h3>

      <div className="grid grid-cols-1 gap-2">
        {corrections.map((c) => (
          <div
            key={c.label}
            className="flex items-center justify-between px-3 py-2 rounded"
            style={{ background: "#0d1527", border: "1px solid #1e3a6e" }}
          >
            <div className="flex items-center gap-2">
              <div
                className="w-2 h-2 rounded-full"
                style={{ background: "#22c55e", boxShadow: "0 0 6px #22c55e" }}
              />
              <span
                className="text-xs font-bold tracking-wider"
                style={{ color: "#93c5fd" }}
              >
                {c.label}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono" style={{ color: "#facc15" }}>
                {c.value}
              </span>
              <span
                className="text-xs font-bold px-1.5 py-0.5 rounded"
                style={{
                  background: "#14532d",
                  color: "#22c55e",
                  border: "1px solid #22c55e",
                }}
              >
                ACTIVE
              </span>
            </div>
          </div>
        ))}
      </div>

      <div
        className="px-3 py-3 rounded space-y-1"
        style={{ background: "#05080f", border: "1px solid #facc15" }}
      >
        <div className="flex justify-between text-xs font-mono">
          <span style={{ color: "#94a3b8" }}>COMBINED</span>
          <span style={{ color: "#facc15" }}>1,953,000,000,000,000,000</span>
        </div>
        <div className="flex justify-between text-xs font-mono">
          <span style={{ color: "#94a3b8" }}>SMART CHIP x10</span>
          <span style={{ color: "#fbbf24" }}>ACTIVE</span>
        </div>
        <div className="flex justify-between text-sm font-bold font-mono">
          <span style={{ color: "#e2e8f0" }}>TOTAL</span>
          <span style={{ color: "#facc15" }}>19,530,000,000,000,000,000</span>
        </div>
      </div>

      <div className="flex items-center gap-6">
        <div className="flex items-center gap-3">
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
            STABILIZER {stabilizer ? "ON" : "OFF"}
          </Label>
        </div>

        <div className="flex-1 space-y-1">
          <div className="flex justify-between text-xs font-mono">
            <span style={{ color: "#64748b" }}>dBFS METER</span>
            <span style={{ color: meterColor }}>
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
                background: `linear-gradient(90deg, #22c55e, ${meterColor})`,
                boxShadow: `0 0 6px ${meterColor}`,
                transition: "width 0.05s linear",
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
