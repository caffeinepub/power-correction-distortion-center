import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useEffect, useRef, useState } from "react";
import { audioEngine } from "../audio/AudioEngine";

const RING_SCALES = [1, 1.4, 1.8, 2.2] as const;

export function SoundMagnet() {
  const [bluetooth, setBluetooth] = useState(false);
  const [t, setT] = useState(0);
  const rafRef = useRef<number | null>(null);
  const btRef = useRef(false);

  useEffect(() => {
    btRef.current = bluetooth;
  }, [bluetooth]);

  useEffect(() => {
    const tick = () => {
      const val = audioEngine.getDBFS();
      const normalized = Math.max(0, Math.min(1, (val + 60) / 60));
      setT(normalized);
      const maxBoost = btRef.current ? 1.2 : 1.05;
      audioEngine.setSoundMagnetGain(1.0 + (maxBoost - 1.0) * normalized);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const baseSize = 60;
  const maxSize = bluetooth ? 220 : 120;
  const magnetSize = baseSize + (maxSize - baseSize) * t;

  return (
    <div
      data-ocid="magnet.panel"
      className="rounded-lg p-5 space-y-4"
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
          SOUND MAGNET
        </h3>
        <div
          className="px-2 py-0.5 rounded text-xs font-bold"
          style={{
            background: "#14532d",
            color: "#22c55e",
            border: "1px solid #22c55e",
          }}
        >
          SENSOR: ROOM ACTIVE
        </div>
      </div>

      <div className="flex items-center justify-between gap-6">
        <div
          className="relative flex items-center justify-center flex-shrink-0"
          style={{ width: "260px", height: "260px" }}
        >
          {RING_SCALES.map((scale) => (
            <div
              key={scale}
              className="absolute rounded-full"
              style={{
                width: `${magnetSize * scale}px`,
                height: `${magnetSize * scale}px`,
                border: `${1 + (RING_SCALES.indexOf(scale)) * 0.5}px solid rgba(59,130,246,${0.5 - RING_SCALES.indexOf(scale) * 0.1})`,
                boxShadow: `0 0 ${10 + RING_SCALES.indexOf(scale) * 8}px rgba(59,130,246,${0.3 - RING_SCALES.indexOf(scale) * 0.05})`,
                transition: "width 0.15s ease, height 0.15s ease",
              }}
            />
          ))}
          <div
            className="absolute rounded-full"
            style={{
              width: `${magnetSize}px`,
              height: `${magnetSize}px`,
              background:
                "radial-gradient(circle, rgba(59,130,246,0.3), rgba(29,78,216,0.05))",
              boxShadow: bluetooth
                ? "0 0 30px rgba(59,130,246,0.6)"
                : "0 0 15px rgba(59,130,246,0.3)",
              transition: "all 0.15s ease",
            }}
          />
          <div
            className="relative z-10 rounded-full"
            style={{
              width: "16px",
              height: "16px",
              background: "#3b82f6",
              boxShadow: "0 0 15px #3b82f6, 0 0 30px #1d4ed8",
            }}
          />
        </div>

        <div className="flex-1 space-y-4">
          <div className="flex items-center gap-3">
            <Switch
              data-ocid="magnet.switch"
              checked={bluetooth}
              onCheckedChange={setBluetooth}
            />
            <Label style={{ color: bluetooth ? "#60a5fa" : "#64748b" }}>
              Bluetooth:{" "}
              <span
                style={{
                  color: bluetooth ? "#22c55e" : "#ef4444",
                  fontWeight: "bold",
                }}
              >
                {bluetooth ? "CONNECTED" : "DISCONNECTED"}
              </span>
            </Label>
          </div>

          <div className="space-y-2">
            <div className="text-xs font-mono" style={{ color: "#64748b" }}>
              MAGNET STRENGTH
            </div>
            <div
              className="h-3 rounded-full overflow-hidden"
              style={{ background: "#0d1527", border: "1px solid #1e3a6e" }}
            >
              <div
                className="h-full rounded-full"
                style={{
                  width: `${t * 100}%`,
                  background: bluetooth
                    ? "linear-gradient(90deg, #1d4ed8, #60a5fa)"
                    : "linear-gradient(90deg, #1e3a6e, #3b82f6)",
                  boxShadow: bluetooth ? "0 0 8px #3b82f6" : "none",
                  transition: "width 0.15s ease",
                }}
              />
            </div>
            <div className="text-xs font-mono" style={{ color: "#64748b" }}>
              Room sensitivity: {Math.round(t * 100)}% |{" "}
              {bluetooth ? "Full BT Potential" : "Phone Mode"}
            </div>
          </div>

          <div
            className="px-3 py-2 rounded text-xs font-mono space-y-1"
            style={{ background: "#05080f", border: "1px solid #1e3a6e" }}
          >
            <div style={{ color: "#64748b" }}>VIRTUAL SOUND MAGNET</div>
            <div style={{ color: "#93c5fd" }}>Expands with loudness</div>
            <div style={{ color: "#93c5fd" }}>
              Adapts to room acoustics via sensor
            </div>
            <div style={{ color: bluetooth ? "#22c55e" : "#475569" }}>
              {bluetooth
                ? "Bluetooth: Max Potential"
                : "Connect Bluetooth for max power"}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
