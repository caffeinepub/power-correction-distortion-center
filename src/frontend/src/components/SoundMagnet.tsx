import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useEffect, useRef, useState } from "react";
import { AudioEngine, audioEngine } from "../audio/AudioEngine";

const RING_KEYS = ["r1", "r2", "r3", "r4", "r5", "r6"] as const;
const RING_COUNT = RING_KEYS.length;

const ENV_RING_KEYS = ["e1", "e2", "e3"] as const;

function fieldColor(fill: number, alpha: number): string {
  const r = Math.round(59 + fill * (239 - 59));
  const g = Math.round(130 + fill * (68 - 130));
  const b = Math.round(246 + fill * (68 - 246));
  return `rgba(${r},${g},${b},${alpha})`;
}

export function SoundMagnet() {
  const [bluetooth, setBluetooth] = useState(false);
  const spreadRange = 100;
  const [smoothT, setSmoothT] = useState(0);
  const [lowFreqPower, setLowFreqPower] = useState(0);
  const [midHighPower, setMidHighPower] = useState(0);
  const [signalPower, setSignalPower] = useState(0);
  const [autoPowerStatus, setAutoPowerStatus] = useState<string | null>(null);

  const spreadRef = useRef(1.0);
  const btRef = useRef(false);
  const smoothTRef = useRef(0);
  const lowFreqRef = useRef(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoPowerTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    btRef.current = bluetooth;
  }, [bluetooth]);

  // Poll audio engine every 100ms — no microphone needed
  useEffect(() => {
    intervalRef.current = setInterval(() => {
      const sp = audioEngine.getSignalPower();
      const lf = audioEngine.getLowFreqPower();
      const mh = audioEngine.getMidHighPower();

      setSignalPower(sp);
      setLowFreqPower(lf);
      setMidHighPower(mh);

      // Smooth the signal power for ring animation
      const prev = smoothTRef.current;
      const next =
        sp > prev ? prev + (sp - prev) * 0.35 : prev + (sp - prev) * 0.08;
      smoothTRef.current = next;
      setSmoothT(next);

      lowFreqRef.current = lf;

      // Apply magnet gain
      const intNorm = spreadRef.current;
      const btBoost = btRef.current ? 1.0 : 0.75;
      const maxGain = 1.0 + intNorm * (AudioEngine.MAGNET_MAX_GAIN - 1.0);
      const gainTarget = 1.0 + (maxGain - 1.0) * next * btBoost;
      audioEngine.setSoundMagnetGain(gainTarget);

      // Stereo width uses signal + low freq (room fill)
      const combinedLevel =
        ((gainTarget - 1.0) / (AudioEngine.MAGNET_MAX_GAIN - 1.0)) * 0.7 +
        lf * 0.3;
      audioEngine.setStereoMagnetWidth(Math.min(1, combinedLevel));

      // Env room level driven by low freq content
      audioEngine.setEnvironmentalRoomLevel(lf);

      // Auto-amp-power trigger on low signal
      if (sp < 0.1 && sp > 0.001) {
        audioEngine.setUserPowerLevel(100);
        setAutoPowerStatus("⚡ AMP POWER AUTO-APPLIED");
        if (autoPowerTimerRef.current) clearTimeout(autoPowerTimerRef.current);
        autoPowerTimerRef.current = setTimeout(() => {
          setAutoPowerStatus(null);
          autoPowerTimerRef.current = null;
        }, 2500);
      }
    }, 100);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const isSensing = signalPower > 0.02;
  const isActive = smoothT > 0.05;
  const isFullSpread = bluetooth && spreadRange >= 70 && smoothT > 0.55;
  const isFullEnvBluetooth = bluetooth && isSensing && isActive;

  const roomFillPct = Math.round(smoothT * spreadRange);
  const envFillPct = Math.round(lowFreqPower * 100);

  const FIELD_RADIUS = 140;
  const CORE_RADIUS = 10;

  const sensorLabel = isSensing
    ? "AUDIO SENSOR 2022 ● SENSING"
    : "AUDIO SENSOR 2022 ○ STANDBY";

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
          SOUND MAGNET ENVIRONMENTAL MIX
        </h3>
        <div className="flex items-center gap-2 flex-wrap">
          {isFullEnvBluetooth && (
            <div
              className="px-3 py-1 rounded text-xs font-black tracking-widest"
              style={{
                background: "#7f1d1d",
                color: "#fca5a5",
                border: "1px solid #ef4444",
                boxShadow: "0 0 10px rgba(239,68,68,0.5)",
                animation: "btSpreadPulse 0.9s ease-in-out infinite",
                letterSpacing: "0.1em",
                fontSize: "10px",
              }}
            >
              FULL ENVIRONMENTAL SPREAD — BLUETOOTH + SIGNAL ACTIVE
            </div>
          )}
          {!isFullEnvBluetooth && isFullSpread && (
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
              background: isSensing ? "#0d1b3e" : "#050d1a",
              color: isSensing
                ? isFullSpread
                  ? "#ef4444"
                  : "#3b82f6"
                : "#1e3a6e",
              border: isSensing
                ? isFullSpread
                  ? "1px solid #ef4444"
                  : "1px solid #3b82f6"
                : "1px solid #0f1e3d",
              transition: "all 0.4s ease",
              letterSpacing: "0.1em",
              fontSize: "10px",
            }}
          >
            {sensorLabel}
          </div>
        </div>
      </div>

      {/* ─── MAIN CONTENT ─── */}
      <div className="flex flex-col lg:flex-row items-center gap-0">
        {/* ─── FIELD SENSOR DISPLAY ─── */}
        <div
          className="flex items-center justify-center flex-shrink-0"
          style={{
            width: "100%",
            maxWidth: "380px",
            padding: "32px 32px",
          }}
        >
          <div
            className="relative flex items-center justify-center"
            style={{ width: "280px", height: "280px", flexShrink: 0 }}
          >
            {/* Outer boundary ring */}
            <div
              className="absolute rounded-full"
              style={{
                width: "280px",
                height: "280px",
                border: "1px solid rgba(59,130,246,0.12)",
                boxShadow: "inset 0 0 40px rgba(29,78,216,0.06)",
              }}
            />

            {/* ATMOSPHERE ring (dashed, outermost) — always visible when sensing */}
            {isSensing && (
              <div
                className="absolute rounded-full"
                style={{
                  width: "270px",
                  height: "270px",
                  border: `1.5px dashed rgba(239,68,68,${0.15 + lowFreqPower * 0.45})`,
                  boxShadow:
                    lowFreqPower > 0.3
                      ? `0 0 ${8 + lowFreqPower * 20}px rgba(239,68,68,${lowFreqPower * 0.3})`
                      : "none",
                  transition: "border-color 0.3s ease, box-shadow 0.3s ease",
                  animation:
                    lowFreqPower > 0.1
                      ? "envPulse 2s ease-in-out infinite"
                      : "none",
                }}
              />
            )}

            {/* ENV OUTER RINGS (red, dashed) — bass/room boundary */}
            {isSensing &&
              ENV_RING_KEYS.map((key, idx) => {
                const envFraction = (idx + 1) / ENV_RING_KEYS.length;
                const envRadius =
                  CORE_RADIUS +
                  (FIELD_RADIUS - CORE_RADIUS) * (0.45 + envFraction * 0.45);
                const envDiameter = envRadius * 2;
                const envAlpha =
                  (0.25 - idx * 0.06) * (0.2 + lowFreqPower * 0.8);
                const envGlow = 3 + idx * 4 + lowFreqPower * 12;

                return (
                  <div
                    key={key}
                    className="absolute rounded-full"
                    style={{
                      width: `${envDiameter}px`,
                      height: `${envDiameter}px`,
                      border: `1px dashed rgba(239,68,68,${envAlpha})`,
                      boxShadow:
                        lowFreqPower > 0.15
                          ? `0 0 ${envGlow}px rgba(239,68,68,${envAlpha * 0.8})`
                          : "none",
                      transition:
                        "width 0.3s ease, height 0.3s ease, border-color 0.3s ease, box-shadow 0.4s ease",
                    }}
                  />
                );
              })}

            {/* INNER RINGS (blue) — music signal expanding outward */}
            {RING_KEYS.map((ringKey, idx) => {
              const ringFraction = (idx + 1) / RING_COUNT;
              const threshold = ringFraction * 0.85;
              const ringActivation = Math.max(
                0,
                Math.min(
                  1,
                  (smoothT - threshold * 0.1) / (1 - threshold * 0.1 + 0.001),
                ),
              );
              const spread = spreadRef.current;
              const maxRingRadius =
                CORE_RADIUS +
                ringFraction * (FIELD_RADIUS - CORE_RADIUS) * spread;
              const minRingRadius = CORE_RADIUS + 4;
              const currentRadius =
                minRingRadius + (maxRingRadius - minRingRadius) * smoothT;
              const diameter = Math.max(CORE_RADIUS * 2, currentRadius * 2);

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
                    transition:
                      "width 0.18s ease-out, height 0.18s ease-out, border-color 0.3s ease, box-shadow 0.3s ease",
                  }}
                />
              );
            })}

            {/* Central orb */}
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

            {/* Center dot */}
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

            {/* Fill label */}
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
                  color: isSensing ? "#ef4444" : "#1e3a6e",
                  fontSize: "9px",
                  letterSpacing: "0.1em",
                  transition: "color 0.3s ease",
                }}
              >
                {isSensing ? "ENV FILL" : "ROOM FILL"}
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
          {/* ─── LIVE READOUTS ─── */}
          <div
            className="rounded px-4 py-3 space-y-2"
            style={{
              background: "#050d1a",
              border: isSensing ? "1px solid #3b82f6" : "1px solid #0f1e3d",
              transition: "border-color 0.4s ease",
            }}
          >
            <div
              className="text-xs font-black font-mono tracking-widest"
              style={{
                color: "#facc15",
                letterSpacing: "0.14em",
                fontSize: "10px",
              }}
            >
              AUDIO SENSOR 2022 ● LIVE READINGS
            </div>

            {/* Signal Power */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span
                  className="text-xs font-mono"
                  style={{ color: "#3b82f6", fontSize: "10px" }}
                >
                  SIGNAL POWER
                </span>
                <span
                  className="text-xs font-mono font-bold"
                  style={{ color: signalPower > 0.6 ? "#ef4444" : "#3b82f6" }}
                >
                  {Math.round(signalPower * 100)}%
                </span>
              </div>
              <div
                className="rounded-full overflow-hidden"
                style={{
                  height: "6px",
                  background: "#050d1a",
                  border: "1px solid #0f1e3d",
                }}
              >
                <div
                  style={{
                    height: "100%",
                    width: `${Math.round(signalPower * 100)}%`,
                    background:
                      signalPower > 0.6
                        ? "linear-gradient(90deg, #1d4ed8, #ef4444)"
                        : "linear-gradient(90deg, #1e3a6e, #3b82f6)",
                    borderRadius: "9999px",
                    transition: "width 0.15s ease",
                  }}
                />
              </div>
            </div>

            {/* Low Freq ENV */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span
                  className="text-xs font-mono"
                  style={{ color: "#ef4444", fontSize: "10px" }}
                >
                  LOW FREQ ENV
                </span>
                <span
                  className="text-xs font-mono font-bold"
                  style={{ color: "#ef4444" }}
                >
                  {Math.round(lowFreqPower * 100)}%
                </span>
              </div>
              <div
                className="rounded-full overflow-hidden"
                style={{
                  height: "6px",
                  background: "#050d1a",
                  border: "1px solid #3b0000",
                }}
              >
                <div
                  style={{
                    height: "100%",
                    width: `${Math.round(lowFreqPower * 100)}%`,
                    background: "linear-gradient(90deg, #7f1d1d, #ef4444)",
                    borderRadius: "9999px",
                    transition: "width 0.15s ease",
                  }}
                />
              </div>
            </div>

            {/* Presence */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span
                  className="text-xs font-mono"
                  style={{ color: "#1d4ed8", fontSize: "10px" }}
                >
                  PRESENCE
                </span>
                <span
                  className="text-xs font-mono font-bold"
                  style={{ color: midHighPower > 0.5 ? "#3b82f6" : "#1d4ed8" }}
                >
                  {Math.round(midHighPower * 100)}%
                </span>
              </div>
              <div
                className="rounded-full overflow-hidden"
                style={{
                  height: "6px",
                  background: "#050d1a",
                  border: "1px solid #1e3a6e",
                }}
              >
                <div
                  style={{
                    height: "100%",
                    width: `${Math.round(midHighPower * 100)}%`,
                    background:
                      "linear-gradient(90deg, #1e3a6e, #1d4ed8, #3b82f6)",
                    borderRadius: "9999px",
                    transition: "width 0.15s ease",
                  }}
                />
              </div>
            </div>
          </div>

          {/* Bluetooth toggle */}
          <div className="flex items-center gap-3">
            <Switch
              data-ocid="magnet.switch"
              checked={bluetooth}
              onCheckedChange={setBluetooth}
            />
            <Label style={{ color: bluetooth ? "#3b82f6" : "#1e3a6e" }}>
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

          {/* Room sensor fill bar */}
          <div className="space-y-1">
            <div
              className="text-xs font-mono font-bold tracking-widest"
              style={{ color: "#1e40af", letterSpacing: "0.1em" }}
            >
              AUDIO SENSOR 2022
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
          </div>

          {/* ENV level bar */}
          {isSensing && (
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <div
                  className="text-xs font-mono font-bold tracking-widest"
                  style={{ color: "#ef4444", letterSpacing: "0.1em" }}
                >
                  ENV LEVEL
                </div>
                <div
                  className="text-xs font-mono font-bold"
                  style={{ color: "#ef4444" }}
                >
                  {envFillPct}%
                </div>
              </div>
              <div
                className="rounded-full overflow-hidden"
                style={{
                  height: "8px",
                  background: "#050d1a",
                  border: "1px solid #3b0000",
                }}
              >
                <div
                  style={{
                    height: "100%",
                    width: `${envFillPct}%`,
                    background: "linear-gradient(90deg, #7f1d1d, #ef4444)",
                    borderRadius: "9999px",
                    boxShadow:
                      lowFreqPower > 0.1
                        ? `0 0 ${4 + lowFreqPower * 10}px rgba(239,68,68,0.6)`
                        : "none",
                    transition: "width 0.15s ease, box-shadow 0.3s ease",
                  }}
                />
              </div>
              <div
                className="text-xs font-mono"
                style={{
                  color: "#7f1d1d",
                  fontSize: "9px",
                  letterSpacing: "0.08em",
                }}
              >
                LOW FREQ ENVIRONMENT FILL
              </div>
            </div>
          )}

          {/* Auto power status */}
          {autoPowerStatus && (
            <div
              className="py-2 px-3 rounded text-xs font-black font-mono text-center tracking-widest"
              style={{
                background: "#1a0000",
                border: "1px solid #ef4444",
                color: "#facc15",
                boxShadow: "0 0 10px rgba(239,68,68,0.4)",
                letterSpacing: "0.12em",
                animation: "btSpreadPulse 0.6s ease-in-out infinite",
              }}
            >
              {autoPowerStatus}
            </div>
          )}

          {/* Status info box */}
          <div
            className="rounded px-4 py-3 space-y-1.5 text-xs font-mono"
            style={{
              background: "#050d1a",
              border: isFullSpread ? "1px solid #ef4444" : "1px solid #0f1e3d",
              transition: "border-color 0.4s ease",
            }}
          >
            <div
              style={{
                color: "#facc15",
                letterSpacing: "0.12em",
                fontWeight: "900",
                fontSize: "10px",
              }}
            >
              AUDIO SENSOR 2022 — THE SMART SENSOR
            </div>
            <div style={{ color: "#3b82f6" }}>
              ▸ Reads live audio signal — no microphone needed
            </div>
            <div style={{ color: "#3b82f6" }}>
              ▸ Senses frequency power, bass content, and presence
            </div>
            <div style={{ color: "#3b82f6" }}>
              ▸ Music expands through the air — becomes the atmosphere
            </div>
            <div style={{ color: bluetooth ? "#3b82f6" : "#1e40af" }}>
              ▸ Reaches maximum environmental potential on Bluetooth
            </div>
            {isSensing && (
              <div
                style={{
                  color: envFillPct > 50 ? "#ef4444" : "#1e40af",
                  transition: "color 0.3s ease",
                }}
              >
                ENV LEVEL: {envFillPct}%
              </div>
            )}
            <div
              style={{
                color:
                  spreadRange >= 80
                    ? "#ef4444"
                    : spreadRange >= 50
                      ? "#3b82f6"
                      : "#1e40af",
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
          @keyframes envPulse {
            0%, 100% { opacity: 1; transform: scale(1); }
            50% { opacity: 0.6; transform: scale(0.985); }
          }
        `}
      </style>
    </div>
  );
}
