import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useEffect, useRef, useState } from "react";
import { AudioEngine, audioEngine } from "../audio/AudioEngine";

const STORAGE_KEY_SPREAD = "pcdc_magnet_intensity";

// Number of concentric field rings
const RING_KEYS = ["r1", "r2", "r3", "r4", "r5", "r6"] as const;
const RING_COUNT = RING_KEYS.length;

function loadSpreadRange(): number {
  try {
    const v = localStorage.getItem(STORAGE_KEY_SPREAD);
    if (v !== null) return Math.max(0, Math.min(100, Number(v)));
  } catch (_) {}
  return 80;
}

// Interpolate between blue and red based on fill level
function fieldColor(fill: number, alpha: number): string {
  // 0 = pure blue (#3b82f6), 1 = pure red (#ef4444)
  const r = Math.round(59 + fill * (239 - 59));
  const g = Math.round(130 + fill * (68 - 130));
  const b = Math.round(246 + fill * (68 - 246));
  return `rgba(${r},${g},${b},${alpha})`;
}

export function SoundMagnet() {
  const [bluetooth, setBluetooth] = useState(false);
  const [spreadRange, setSpreadRange] = useState(loadSpreadRange);
  // smoothT: 0..1, smoothed audio level for visuals
  const [smoothT, setSmoothT] = useState(0);

  const spreadRef = useRef(spreadRange / 100);
  const btRef = useRef(false);
  const smoothTRef = useRef(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Keep refs in sync
  useEffect(() => {
    btRef.current = bluetooth;
  }, [bluetooth]);

  useEffect(() => {
    spreadRef.current = spreadRange / 100;
    try {
      localStorage.setItem(STORAGE_KEY_SPREAD, String(spreadRange));
    } catch (_) {}
    audioEngine.setSoundMagnetIntensity(spreadRange);
  }, [spreadRange]);

  // Poll audio level every 100ms — smooth expansion, not jittery
  useEffect(() => {
    intervalRef.current = setInterval(() => {
      const dbfs = audioEngine.getDBFS();
      // Map -60..0 dBFS → 0..1
      const raw = Math.max(0, Math.min(1, (dbfs + 60) / 60));

      // Smooth: fast attack (signal rising), slow decay (spreading lingers)
      const prev = smoothTRef.current;
      const next =
        raw > prev
          ? prev + (raw - prev) * 0.35 // fast attack
          : prev + (raw - prev) * 0.08; // slow decay — field lingers
      smoothTRef.current = next;
      setSmoothT(next);

      // Apply stereo mix gain — scales with audio level AND spread range
      const intNorm = spreadRef.current;
      const btBoost = btRef.current ? 1.0 : 0.75;
      const maxGain = 1.0 + intNorm * (AudioEngine.MAGNET_MAX_GAIN - 1.0);
      const gainTarget = 1.0 + (maxGain - 1.0) * next * btBoost;
      audioEngine.setSoundMagnetGain(gainTarget);

      // Apply stereo mix widening — L/R channels pulled apart proportional to gain
      audioEngine.setStereoMagnetWidth(
        (gainTarget - 1.0) / (AudioEngine.MAGNET_MAX_GAIN - 1.0),
      );
    }, 100);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  // Derived display values
  const roomFillPct = Math.round(smoothT * spreadRange);
  const isFullSpread = bluetooth && spreadRange >= 70 && smoothT > 0.55;
  const isActive = smoothT > 0.05;

  // Field radius: the whole 280px circle is the room boundary
  // At silence: rings clustered near center. At max: rings fill the 140px radius.
  const FIELD_RADIUS = 140; // half of 280px container
  const CORE_RADIUS = 10;

  return (
    <div
      data-ocid="magnet.panel"
      className="rounded-lg w-full"
      style={{
        background: "#060c1a",
        border: isFullSpread ? "2px solid #ef4444" : "2px solid #1e40af",
        overflow: "hidden",
        transition: "border-color 0.5s ease",
        boxShadow: isFullSpread
          ? "0 0 30px rgba(239,68,68,0.2), 0 0 60px rgba(29,78,216,0.1)"
          : "0 0 20px rgba(29,78,216,0.08)",
      }}
    >
      {/* ─── HEADER ─── */}
      <div
        className="flex items-center justify-between px-6 py-4 flex-wrap gap-3"
        style={{ borderBottom: "1px solid #0f1e3d" }}
      >
        <h3
          className="text-base font-black tracking-widest"
          style={{
            color: "#facc15",
            fontFamily: "'Bricolage Grotesque', sans-serif",
            letterSpacing: "0.15em",
          }}
        >
          SOUND MAGNET
        </h3>
        <div className="flex items-center gap-2 flex-wrap">
          {isFullSpread && (
            <div
              className="px-3 py-1 rounded text-xs font-black tracking-widest"
              style={{
                background: "#7f1d1d",
                color: "#fca5a5",
                border: "1px solid #ef4444",
                boxShadow: "0 0 10px rgba(239,68,68,0.5)",
                animation: "btSpreadPulse 0.9s ease-in-out infinite",
                letterSpacing: "0.12em",
              }}
            >
              BLUETOOTH — FULL SPREAD
            </div>
          )}
          <div
            className="px-3 py-1 rounded text-xs font-bold tracking-widest"
            style={{
              background: isActive ? "#0d1b3e" : "#050d1a",
              color: isActive ? "#3b82f6" : "#1e3a6e",
              border: isActive ? "1px solid #3b82f6" : "1px solid #0f1e3d",
              transition: "all 0.4s ease",
              letterSpacing: "0.1em",
            }}
          >
            ROOM SENSOR {isActive ? "● ACTIVE" : "○ STANDBY"}
          </div>
        </div>
      </div>

      {/* ─── MAIN CONTENT ─── */}
      <div className="flex flex-col lg:flex-row items-center gap-0">
        {/* ─── LARGE FIELD SENSOR DISPLAY ─── */}
        <div
          className="flex items-center justify-center flex-shrink-0"
          style={{
            width: "100%",
            maxWidth: "380px",
            padding: "32px 32px",
          }}
        >
          {/* 280×280 field container */}
          <div
            className="relative flex items-center justify-center"
            style={{
              width: "280px",
              height: "280px",
              flexShrink: 0,
            }}
          >
            {/* Outer boundary ring — the room wall */}
            <div
              className="absolute rounded-full"
              style={{
                width: "280px",
                height: "280px",
                border: "1px solid rgba(59,130,246,0.12)",
                boxShadow: "inset 0 0 40px rgba(29,78,216,0.06)",
              }}
            />

            {/* Concentric field rings — expand outward as volume rises */}
            {RING_KEYS.map((ringKey, idx) => {
              // Each ring expands to a different fraction of the field radius
              // Ring 0 = innermost (smallest), Ring N-1 = outermost (room boundary)
              const ringFraction = (idx + 1) / RING_COUNT; // 1/6, 2/6 ... 6/6
              // The ring is "active" when smoothT exceeds its threshold
              const threshold = ringFraction * 0.85;
              const ringActivation = Math.max(
                0,
                Math.min(
                  1,
                  (smoothT - threshold * 0.1) / (1 - threshold * 0.1 + 0.001),
                ),
              );
              // Effective spread controlled by spreadRange
              const spread = spreadRef.current;
              const maxRingRadius =
                CORE_RADIUS +
                ringFraction * (FIELD_RADIUS - CORE_RADIUS) * spread;
              const minRingRadius = CORE_RADIUS + 4;
              const currentRadius =
                minRingRadius + (maxRingRadius - minRingRadius) * smoothT;
              const diameter = Math.max(CORE_RADIUS * 2, currentRadius * 2);

              // Color: blue at inner rings, shift toward red at outer rings when loud
              const colorShift = ringFraction * smoothT;
              const ringOpacity = Math.max(
                0,
                (0.7 - idx * 0.08) * (0.2 + ringActivation * 0.8),
              );
              const color = fieldColor(colorShift * 0.85, ringOpacity);
              const glowColor = fieldColor(
                colorShift * 0.85,
                ringOpacity * 0.5,
              );
              const borderWidth = Math.max(0.5, 2 - idx * 0.25);
              const glowPx = 4 + idx * 6 + smoothT * 16;

              return (
                <div
                  key={ringKey}
                  className="absolute rounded-full"
                  style={{
                    width: `${diameter}px`,
                    height: `${diameter}px`,
                    border: `${borderWidth}px solid ${color}`,
                    boxShadow: `0 0 ${glowPx}px ${glowColor}`,
                    // CSS transition for smooth movement — not jittery
                    transition:
                      "width 0.18s ease-out, height 0.18s ease-out, border-color 0.3s ease, box-shadow 0.3s ease",
                  }}
                />
              );
            })}

            {/* Central orb — the magnet source */}
            <div
              className="absolute rounded-full"
              style={{
                width: `${CORE_RADIUS * 2 + smoothT * 28}px`,
                height: `${CORE_RADIUS * 2 + smoothT * 28}px`,
                background: isFullSpread
                  ? `radial-gradient(circle, rgba(239,68,68,${0.5 + smoothT * 0.4}), rgba(29,78,216,0.15))`
                  : `radial-gradient(circle, rgba(59,130,246,${0.5 + smoothT * 0.4}), rgba(29,78,216,0.1))`,
                boxShadow: isFullSpread
                  ? `0 0 ${16 + smoothT * 30}px rgba(239,68,68,0.7), 0 0 ${30 + smoothT * 50}px rgba(29,78,216,0.3)`
                  : `0 0 ${12 + smoothT * 24}px rgba(59,130,246,0.7), 0 0 ${24 + smoothT * 40}px rgba(29,78,216,0.3)`,
                transition:
                  "width 0.15s ease-out, height 0.15s ease-out, box-shadow 0.2s ease",
              }}
            />

            {/* Hard center dot */}
            <div
              className="relative z-10 rounded-full"
              style={{
                width: "10px",
                height: "10px",
                background: isFullSpread ? "#ef4444" : "#3b82f6",
                boxShadow: isFullSpread
                  ? "0 0 12px #ef4444, 0 0 24px #1d4ed8"
                  : "0 0 10px #3b82f6, 0 0 20px #1d4ed8",
                transition: "background 0.3s ease, box-shadow 0.3s ease",
              }}
            />

            {/* Room fill % label centered below dot */}
            <div
              className="absolute"
              style={{
                bottom: "18px",
                left: "50%",
                transform: "translateX(-50%)",
                textAlign: "center",
              }}
            >
              <div
                className="text-xs font-black font-mono tracking-widest"
                style={{
                  color: isFullSpread
                    ? "#ef4444"
                    : isActive
                      ? "#3b82f6"
                      : "#1e3a6e",
                  transition: "color 0.3s ease",
                  letterSpacing: "0.12em",
                }}
              >
                {roomFillPct}%
              </div>
              <div
                className="text-xs font-mono"
                style={{
                  color: "#1e3a6e",
                  fontSize: "9px",
                  letterSpacing: "0.1em",
                }}
              >
                ROOM FILL
              </div>
            </div>
          </div>
        </div>

        {/* ─── CONTROLS + READOUTS ─── */}
        <div
          className="flex flex-col gap-5 flex-1 px-6 py-6"
          style={{
            borderLeft: "1px solid #0f1e3d",
            minWidth: 0,
            width: "100%",
          }}
        >
          {/* Bluetooth toggle */}
          <div className="flex items-center gap-3">
            <Switch
              data-ocid="magnet.switch"
              checked={bluetooth}
              onCheckedChange={setBluetooth}
            />
            <Label style={{ color: bluetooth ? "#3b82f6" : "#475569" }}>
              Bluetooth:{" "}
              <span
                style={{
                  color: bluetooth ? "#3b82f6" : "#ef4444",
                  fontWeight: "bold",
                }}
              >
                {bluetooth ? "CONNECTED" : "DISCONNECTED"}
              </span>
            </Label>
          </div>

          {/* Spread range slider */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span
                className="text-xs font-black font-mono tracking-widest"
                style={{ color: "#facc15", letterSpacing: "0.12em" }}
              >
                SPREAD RANGE
              </span>
              <span
                className="text-xs font-mono font-bold"
                style={{
                  color:
                    spreadRange > 80
                      ? "#ef4444"
                      : spreadRange > 50
                        ? "#3b82f6"
                        : "#475569",
                }}
              >
                {spreadRange}%
              </span>
            </div>
            <input
              data-ocid="magnet.input"
              type="range"
              min="0"
              max="100"
              step="1"
              value={spreadRange}
              onChange={(e) => setSpreadRange(Number(e.target.value))}
              className="w-full"
              style={{
                accentColor:
                  spreadRange > 80
                    ? "#ef4444"
                    : spreadRange > 50
                      ? "#3b82f6"
                      : "#1e3a6e",
                height: "8px",
              }}
            />
            <div
              className="flex justify-between text-xs font-mono"
              style={{ color: "#1e3a6e" }}
            >
              <span>NARROW</span>
              <span style={{ color: "#3b82f6" }}>WIDE</span>
              <span style={{ color: "#ef4444" }}>FULL ROOM</span>
            </div>
          </div>

          {/* Room sensor fill bar */}
          <div className="space-y-1">
            <div
              className="text-xs font-mono font-bold tracking-widest"
              style={{ color: "#475569", letterSpacing: "0.1em" }}
            >
              ROOM SENSOR
            </div>
            <div
              className="rounded-full overflow-hidden"
              style={{
                height: "10px",
                background: "#050d1a",
                border: "1px solid #0f1e3d",
              }}
            >
              <div
                style={{
                  height: "100%",
                  width: `${roomFillPct}%`,
                  background: isFullSpread
                    ? "linear-gradient(90deg, #1d4ed8, #3b82f6, #ef4444)"
                    : "linear-gradient(90deg, #1e3a6e, #3b82f6)",
                  borderRadius: "9999px",
                  boxShadow: isActive
                    ? `0 0 ${4 + smoothT * 8}px #3b82f6`
                    : "none",
                  transition: "width 0.2s ease, box-shadow 0.3s ease",
                }}
              />
            </div>
            <div
              className="flex justify-between text-xs font-mono"
              style={{ color: "#1e3a6e", fontSize: "9px" }}
            >
              <span>SILENCE</span>
              <span>
                {Math.round(smoothT * 100)}% audio • {roomFillPct}% room fill
              </span>
              <span>FULL ROOM</span>
            </div>
          </div>

          {/* Status info */}
          <div
            className="rounded px-4 py-3 space-y-1.5 text-xs font-mono"
            style={{
              background: "#050d1a",
              border: isFullSpread ? "1px solid #ef4444" : "1px solid #0f1e3d",
              transition: "border-color 0.4s ease",
            }}
          >
            <div style={{ color: "#1e3a6e", letterSpacing: "0.1em" }}>
              VIRTUAL SOUND MAGNET
            </div>
            <div style={{ color: "#3b82f6" }}>
              ▸ Expands with music — fills the room as volume rises
            </div>
            <div style={{ color: "#3b82f6" }}>
              ▸ Adapts to room acoustics via sensor
            </div>
            <div style={{ color: bluetooth ? "#3b82f6" : "#374151" }}>
              {bluetooth
                ? "● Bluetooth: full stereo mix spread active"
                : "○ Connect Bluetooth for maximum spread"}
            </div>
            <div
              style={{
                color:
                  spreadRange >= 80
                    ? "#ef4444"
                    : spreadRange >= 50
                      ? "#3b82f6"
                      : "#374151",
              }}
            >
              Spread:{" "}
              {spreadRange >= 80
                ? "WIDE — FULL ROOM"
                : spreadRange >= 50
                  ? "MEDIUM SPREAD"
                  : "NARROW SPREAD"}
            </div>
            <div style={{ color: "#1e3a6e" }}>
              Stereo mix:{" "}
              {(
                (1.0 +
                  (spreadRange / 100) *
                    (AudioEngine.MAGNET_MAX_GAIN - 1.0) *
                    smoothT *
                    (bluetooth ? 1.0 : 0.75) -
                  1) *
                100
              ).toFixed(1)}
              % sound spread active
            </div>
          </div>
        </div>
      </div>

      <style>
        {`
          @keyframes btSpreadPulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.45; }
          }
        `}
      </style>
    </div>
  );
}
