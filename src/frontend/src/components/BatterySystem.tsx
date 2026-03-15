import { Button } from "@/components/ui/button";
import { useEffect, useRef, useState } from "react";

interface BatterySystemProps {
  onReady: () => void;
  compact?: boolean;
  onSave?: () => void;
  initialReady?: boolean;
}

const BATTERY_CAPACITY = 8_000_000;
const CHARGER_RATE = 2_000_000;
const HEADROOM = 200_000;
const CHARGE_DURATION_MS = 8000;

export function BatterySystem({
  onReady,
  compact,
  onSave,
  initialReady,
}: BatterySystemProps) {
  const [watts, setWatts] = useState(initialReady ? BATTERY_CAPACITY : 0);
  const [charging, setCharging] = useState(false);
  const [ready, setReady] = useState(initialReady ?? false);
  const rafRef = useRef<number | null>(null);
  const startRef = useRef<number>(0);

  const startCharge = () => {
    if (charging || ready) return;
    setCharging(true);
    startRef.current = performance.now();
    const tick = (now: number) => {
      const elapsed = now - startRef.current;
      const progress = Math.min(elapsed / CHARGE_DURATION_MS, 1);
      setWatts(Math.round(progress * BATTERY_CAPACITY));
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        setCharging(false);
        setReady(true);
        onReady();
      }
    };
    rafRef.current = requestAnimationFrame(tick);
  };

  useEffect(
    () => () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    },
    [],
  );

  const percent = Math.round((watts / BATTERY_CAPACITY) * 100);

  if (compact && ready) {
    return (
      <div
        data-ocid="battery.panel"
        className="flex items-center gap-4 px-6 py-3 rounded"
        style={{ background: "#0d1527", border: "1px solid #2563eb" }}
      >
        <span className="text-xs font-mono" style={{ color: "#facc15" }}>
          &#x26A1; BATTERY
        </span>
        <div
          className="flex-1 h-2 rounded-full overflow-hidden"
          style={{ background: "#1e3a6e" }}
        >
          <div
            className="h-full rounded-full"
            style={{ width: "100%", background: "#22c55e" }}
          />
        </div>
        <span className="text-xs font-mono" style={{ color: "#22c55e" }}>
          FULLY CHARGED
        </span>
        {onSave && (
          <Button
            data-ocid="battery.save_button"
            size="sm"
            onClick={onSave}
            style={{
              background: "#1e40af",
              color: "#facc15",
              border: "1px solid #3b82f6",
            }}
          >
            SAVE
          </Button>
        )}
      </div>
    );
  }

  return (
    <div
      data-ocid="battery.panel"
      className="rounded-lg p-6 space-y-5"
      style={{ background: "#0a0f1e", border: "2px solid #2563eb" }}
    >
      <div className="flex items-center justify-between">
        <h2
          className="text-xl font-bold tracking-wider"
          style={{
            color: "#facc15",
            fontFamily: "'Bricolage Grotesque', sans-serif",
          }}
        >
          &#x26A1; POWER SYSTEM
        </h2>
        <div
          className="flex gap-3 text-xs font-mono"
          style={{ color: "#93c5fd" }}
        >
          <span>CAPACITY: {BATTERY_CAPACITY.toLocaleString()}W</span>
          <span>|</span>
          <span>CHARGER: {CHARGER_RATE.toLocaleString()}W</span>
          <span>|</span>
          <span>HEADROOM: {HEADROOM.toLocaleString()}W</span>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between text-sm font-mono">
          <span
            style={{
              color: charging ? "#facc15" : ready ? "#22c55e" : "#94a3b8",
            }}
          >
            {charging ? "CHARGING..." : ready ? "FULLY CHARGED" : "STANDBY"}
          </span>
          <span style={{ color: "#e2e8f0" }}>
            {watts.toLocaleString()}W / {BATTERY_CAPACITY.toLocaleString()}W
          </span>
        </div>
        <div
          className="relative h-8 rounded overflow-hidden"
          style={{ background: "#1e3a6e", border: "1px solid #3b82f6" }}
        >
          <div
            className="h-full rounded-r"
            style={{
              width: `${percent}%`,
              background: ready
                ? "#22c55e"
                : "linear-gradient(90deg, #1d4ed8, #facc15)",
              boxShadow: charging
                ? "0 0 20px #facc15"
                : ready
                  ? "0 0 15px #22c55e"
                  : "none",
              transition: "width 0.1s linear",
            }}
          />
        </div>
        <div
          className="flex justify-between text-xs font-mono"
          style={{ color: "#64748b" }}
        >
          <span>0W</span>
          <span style={{ color: percent > 50 ? "#facc15" : "#64748b" }}>
            {percent}%
          </span>
          <span>{BATTERY_CAPACITY.toLocaleString()}W</span>
        </div>
      </div>

      {ready ? (
        <div
          className="text-center py-3 rounded font-bold tracking-widest text-lg"
          style={{
            background: "#14532d",
            color: "#22c55e",
            border: "1px solid #22c55e",
          }}
        >
          FULLY CHARGED - SYSTEM READY
        </div>
      ) : (
        <div className="space-y-3">
          <Button
            data-ocid="battery.primary_button"
            onClick={startCharge}
            disabled={charging}
            className="w-full py-4 text-lg font-bold tracking-widest"
            style={{
              background: charging ? "#1e3a6e" : "#1d4ed8",
              color: "#facc15",
              border: "2px solid #facc15",
            }}
          >
            {charging ? "CHARGING..." : "CHARGE SYSTEM"}
          </Button>
          <p
            className="text-center text-sm font-mono"
            style={{ color: "#475569" }}
          >
            All features locked until battery fully charged
          </p>
        </div>
      )}
    </div>
  );
}
