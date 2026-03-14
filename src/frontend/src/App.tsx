import { Toaster } from "@/components/ui/sonner";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

// ─── Audio constants ───────────────────────────────────────────────
const COMMANDER = 125_000_000_000;
const CORRECTION_PASSES = 125_000_000_000;
const MONITOR = 125_000_000_000;
const COMBINED_CORRECTION = COMMANDER * CORRECTION_PASSES * MONITOR; // 1.953125e33
const METER_MIN = -60; // dBFS floor
const METER_MAX = 0; // dBFS ceiling

function buildStabilizerCurve(samples = 4096): Float32Array {
  const curve = new Float32Array(samples);
  const norm = Math.log1p(COMBINED_CORRECTION) / 50;
  for (let i = 0; i < samples; i++) {
    const x = (i * 2) / (samples - 1) - 1;
    curve[i] = Math.tanh(x * norm);
  }
  return curve;
}

function formatTime(secs: number): string {
  if (!Number.isFinite(secs)) return "0:00";
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

// Standard broadcast dBFS color zones
const METER_ZONES = [
  { from: -60, to: -20, color: "#3b82f6" }, // safe — blue
  { from: -20, to: -6, color: "#eab308" }, // nominal — yellow
  { from: -6, to: -3, color: "#f97316" }, // hot — orange
  { from: -3, to: 0, color: "#ef4444" }, // clipping danger — red
];

export default function App() {
  const audioCtxRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
  const audioBufferRef = useRef<AudioBuffer | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const gainVolumeRef = useRef<GainNode | null>(null);
  const stabilizerNodeRef = useRef<WaveShaperNode | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);
  const startTimeRef = useRef<number>(0);
  const pauseOffsetRef = useRef<number>(0);

  const [fileName, setFileName] = useState<string>("NO FILE LOADED");
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [loudBooster, setLoudBooster] = useState(0);
  const [stabilizerOn, setStabilizerOn] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  // Real dBFS value — starts at floor (-60)
  const [meterDb, setMeterDb] = useState<number>(METER_MIN);

  const getCtx = useCallback((): AudioContext => {
    if (!audioCtxRef.current) audioCtxRef.current = new AudioContext();
    return audioCtxRef.current;
  }, []);

  const buildGraph = useCallback(
    (stabOn: boolean, boosterVal: number) => {
      const ctx = getCtx();
      const cleanupNodes = [gainVolumeRef, analyserRef, stabilizerNodeRef];
      for (const r of cleanupNodes) {
        try {
          (r.current as AudioNode)?.disconnect();
        } catch {}
      }

      const gainNode = ctx.createGain();
      gainNode.gain.value = 10 ** (boosterVal / 20);
      gainVolumeRef.current = gainNode;

      const analyser = ctx.createAnalyser();
      analyser.fftSize = 2048;
      analyserRef.current = analyser;

      if (stabOn) {
        const stabilizer = ctx.createWaveShaper();
        stabilizer.curve = buildStabilizerCurve() as Float32Array<ArrayBuffer>;
        stabilizer.oversample = "4x";
        stabilizerNodeRef.current = stabilizer;
        stabilizer.connect(gainNode);
      }

      gainNode.connect(analyser);
      analyser.connect(ctx.destination);

      return stabOn ? (stabilizerNodeRef.current as AudioNode) : gainNode;
    },
    [getCtx],
  );

  const connectSource = useCallback(
    (src: AudioBufferSourceNode, stabOn: boolean, boosterVal: number) => {
      const inputNode = buildGraph(stabOn, boosterVal);
      src.connect(inputNode);
    },
    [buildGraph],
  );

  const loadFile = useCallback(
    async (file: File) => {
      try {
        const ctx = getCtx();
        if (ctx.state === "suspended") await ctx.resume();
        const arrayBuffer = await file.arrayBuffer();
        const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
        audioBufferRef.current = audioBuffer;
        setFileName(file.name);
        setDuration(audioBuffer.duration);
        setCurrentTime(0);
        pauseOffsetRef.current = 0;
        setIsPlaying(false);
        if (sourceNodeRef.current) {
          try {
            sourceNodeRef.current.stop();
          } catch {}
          sourceNodeRef.current.disconnect();
          sourceNodeRef.current = null;
        }
        toast.success(`Loaded: ${file.name}`);
      } catch (e) {
        toast.error("Failed to load audio file");
        console.error(e);
      }
    },
    [getCtx],
  );

  const play = useCallback(async () => {
    if (!audioBufferRef.current) {
      toast.error("Load a file first");
      return;
    }
    const ctx = getCtx();
    if (ctx.state === "suspended") await ctx.resume();
    if (sourceNodeRef.current) {
      try {
        sourceNodeRef.current.stop();
      } catch {}
      sourceNodeRef.current.disconnect();
    }
    const src = ctx.createBufferSource();
    src.buffer = audioBufferRef.current;
    src.onended = () => {
      setIsPlaying(false);
      setCurrentTime(0);
      pauseOffsetRef.current = 0;
    };
    sourceNodeRef.current = src;
    connectSource(src, stabilizerOn, loudBooster);
    src.start(0, pauseOffsetRef.current);
    startTimeRef.current = ctx.currentTime - pauseOffsetRef.current;
    setIsPlaying(true);
  }, [getCtx, connectSource, stabilizerOn, loudBooster]);

  const pause = useCallback(() => {
    if (!isPlaying || !audioCtxRef.current) return;
    const elapsed = audioCtxRef.current.currentTime - startTimeRef.current;
    pauseOffsetRef.current = Math.min(elapsed, duration);
    try {
      sourceNodeRef.current?.stop();
    } catch {}
    sourceNodeRef.current = null;
    setIsPlaying(false);
  }, [isPlaying, duration]);

  const stop = useCallback(() => {
    try {
      sourceNodeRef.current?.stop();
    } catch {}
    sourceNodeRef.current = null;
    pauseOffsetRef.current = 0;
    setIsPlaying(false);
    setCurrentTime(0);
  }, []);

  useEffect(() => {
    if (gainVolumeRef.current)
      gainVolumeRef.current.gain.value = 10 ** (loudBooster / 20);
  }, [loudBooster]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: intentional one-dep effect
  useEffect(() => {
    if (isPlaying) {
      pause();
      setTimeout(() => play(), 50);
    } else {
      buildGraph(stabilizerOn, loudBooster);
    }
  }, [stabilizerOn]);

  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      if (audioCtxRef.current) {
        const t = audioCtxRef.current.currentTime - startTimeRef.current;
        setCurrentTime(Math.min(t, duration));
      }
    }, 100);
    return () => clearInterval(interval);
  }, [isPlaying, duration]);

  // ─── VU Meter draw loop (real dBFS) ───────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx2d = canvas.getContext("2d");
    if (!ctx2d) return;

    const TICKS = [-60, -50, -40, -30, -20, -10, -6, -3, 0];

    const dbToY = (db: number, meterH: number): number => {
      const pct = (db - METER_MIN) / (METER_MAX - METER_MIN);
      return meterH - meterH * pct + 20;
    };

    const draw = () => {
      animFrameRef.current = requestAnimationFrame(draw);
      const w = canvas.width;
      const h = canvas.height;
      ctx2d.clearRect(0, 0, w, h);
      ctx2d.fillStyle = "#080a0e";
      ctx2d.fillRect(0, 0, w, h);

      // ── Real RMS dBFS measurement ──────────────────────────────────
      let dbLevel = METER_MIN;
      if (analyserRef.current) {
        const buf = new Float32Array(analyserRef.current.fftSize);
        analyserRef.current.getFloatTimeDomainData(buf);
        let sum = 0;
        for (let i = 0; i < buf.length; i++) sum += buf[i] * buf[i];
        const rms = Math.sqrt(sum / buf.length);
        dbLevel =
          rms > 0
            ? Math.max(METER_MIN, Math.min(METER_MAX, 20 * Math.log10(rms)))
            : METER_MIN;
      }
      setMeterDb(Math.round(dbLevel));

      const meterH = h - 60;
      const barX = 32;
      const barW = w - 38;

      // ── Tick lines & labels ────────────────────────────────────────
      ctx2d.font = "9px 'JetBrains Mono', monospace";
      ctx2d.textAlign = "left";
      for (const db of TICKS) {
        const ty = dbToY(db, meterH);
        ctx2d.strokeStyle =
          db >= -6 ? "#3a2020" : db >= -20 ? "#3a3820" : "#1e2a38";
        ctx2d.lineWidth = db === 0 || db === -20 ? 1.5 : 1;
        ctx2d.beginPath();
        ctx2d.moveTo(0, ty);
        ctx2d.lineTo(w, ty);
        ctx2d.stroke();
        ctx2d.fillStyle =
          db >= -3
            ? "#ef4444"
            : db >= -6
              ? "#f97316"
              : db >= -20
                ? "#eab308"
                : "#4a5568";
        const label = db === 0 ? "0" : `${db}`;
        ctx2d.fillText(label, 1, ty - 2);
      }

      // ── Colour-zone fill bar ──────────────────────────────────────
      for (const zone of METER_ZONES) {
        if (dbLevel <= zone.from) continue;
        const fillTop = Math.min(dbLevel, zone.to);
        const yTop = dbToY(fillTop, meterH);
        const yBot = dbToY(zone.from, meterH);
        ctx2d.fillStyle = zone.color;
        ctx2d.fillRect(barX, yTop, barW, yBot - yTop);
      }

      // ── Peak indicator line ───────────────────────────────────────
      if (dbLevel > METER_MIN) {
        const peakY = dbToY(dbLevel, meterH);
        const peakColor =
          dbLevel >= -3
            ? "#ef4444"
            : dbLevel >= -6
              ? "#f97316"
              : dbLevel >= -20
                ? "#eab308"
                : "#3b82f6";
        ctx2d.shadowColor = peakColor;
        ctx2d.shadowBlur = 8;
        ctx2d.fillStyle = peakColor;
        ctx2d.fillRect(barX, peakY, barW, 2);
        ctx2d.shadowBlur = 0;
      }

      // ── Border ────────────────────────────────────────────────────
      ctx2d.strokeStyle = "#2a3040";
      ctx2d.lineWidth = 1;
      ctx2d.strokeRect(barX, 20, barW, meterH);

      // ── Footer label ─────────────────────────────────────────────
      ctx2d.fillStyle = "#4a5568";
      ctx2d.font = "9px 'JetBrains Mono', monospace";
      ctx2d.textAlign = "center";
      ctx2d.fillText("dBFS", w / 2, h - 4);
    };

    animFrameRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, []);

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };
  const onDragLeave = () => setIsDragging(false);
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) loadFile(file);
  };

  const progressPct = duration > 0 ? (currentTime / duration) * 100 : 0;

  // dBFS-aware peak display colour
  const peakColor =
    meterDb >= -3
      ? "#ef4444"
      : meterDb >= -6
        ? "#f97316"
        : meterDb >= -20
          ? "#eab308"
          : "#3b82f6";

  // Volume booster display color
  const boosterColor =
    loudBooster > 170
      ? "#ef4444"
      : loudBooster >= 130
        ? "#f97316"
        : loudBooster >= 70
          ? "#eab308"
          : "#3b82f6";

  const btnBase: React.CSSProperties = {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: "0.7rem",
    letterSpacing: "0.15em",
    fontWeight: 700,
    borderRadius: 2,
    cursor: "pointer",
    padding: "8px 16px",
  };

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{
        background: "#07090d",
        fontFamily: "'JetBrains Mono', monospace",
      }}
    >
      <Toaster />

      {/* HEADER */}
      <header
        style={{
          background: "linear-gradient(180deg, #0d0f14 0%, #0a0c10 100%)",
          borderBottom: "2px solid #1a2030",
        }}
      >
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex gap-2">
              <div className="rack-screw" />
              <div className="rack-screw" />
            </div>
            <div>
              <h1
                style={{
                  fontFamily: "'Bricolage Grotesque', sans-serif",
                  fontSize: "1.1rem",
                  fontWeight: 800,
                  letterSpacing: "0.12em",
                  color: "#60a5fa",
                  textShadow: "0 0 20px rgba(96,165,250,0.4)",
                }}
              >
                POWER CORRECTION DISTORTION CENTER
              </h1>
              <p
                style={{
                  fontSize: "0.65rem",
                  color: "#3a4a5a",
                  letterSpacing: "0.2em",
                }}
              >
                AUDIO SIGNAL RESEARCH SYSTEM • WEB AUDIO API
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="led active-green" />
            <span
              style={{
                fontSize: "0.6rem",
                color: "#3a4a5a",
                letterSpacing: "0.2em",
              }}
            >
              POWER ON
            </span>
            <div className="flex gap-2">
              <div className="rack-screw" />
              <div className="rack-screw" />
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-6 flex flex-col gap-4">
        {/* File Drop Zone */}
        <div
          className="rack-panel rack-unit-border p-4"
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          style={{
            border: isDragging ? "2px solid #3b82f6" : undefined,
            transition: "border 0.2s",
          }}
        >
          <div
            style={{
              fontSize: "0.6rem",
              color: "#3a4a5a",
              letterSpacing: "0.2em",
              marginBottom: 8,
            }}
          >
            ─── FILE INPUT MODULE ───
          </div>
          <button
            type="button"
            className="flex flex-col items-center justify-center gap-3 w-full"
            style={{
              border: "1px dashed #2a3040",
              borderRadius: 2,
              padding: "20px 12px",
              background: isDragging ? "rgba(59,130,246,0.04)" : "#0a0c10",
              cursor: "pointer",
              fontFamily: "inherit",
            }}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="audio/*"
              style={{ display: "none" }}
              data-ocid="player.upload_button"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) loadFile(f);
              }}
            />
            <svg
              width="32"
              height="32"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#2a3a4a"
              strokeWidth="1.5"
              aria-hidden="true"
            >
              <path d="M9 18V5l12-2v13" />
              <circle cx="6" cy="18" r="3" />
              <circle cx="18" cy="16" r="3" />
            </svg>
            <div
              style={{
                fontSize: "0.65rem",
                color: "#3a4a5a",
                textAlign: "center",
                letterSpacing: "0.1em",
              }}
            >
              DRAG &amp; DROP OR CLICK TO LOAD
              <br />
              <span style={{ color: "#22334a" }}>MP3 · WAV · OGG · FLAC</span>
            </div>
          </button>
          <div
            style={{
              marginTop: 10,
              fontSize: "0.65rem",
              color: "#3b82f6",
              letterSpacing: "0.05em",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            ► {fileName}
          </div>
        </div>

        {/* Transport */}
        <div className="rack-panel rack-unit-border p-4">
          <div
            style={{
              fontSize: "0.6rem",
              color: "#3a4a5a",
              letterSpacing: "0.2em",
              marginBottom: 12,
            }}
          >
            ─── TRANSPORT CONTROLS ───
          </div>
          <div style={{ marginBottom: 10 }}>
            <div
              style={{
                height: 6,
                background: "#0d1020",
                borderRadius: 3,
                overflow: "hidden",
                border: "1px solid #1a2030",
              }}
            >
              <div
                style={{
                  height: "100%",
                  width: `${progressPct}%`,
                  background: "linear-gradient(90deg, #1d4ed8, #60a5fa)",
                  transition: "width 0.1s",
                  boxShadow: "0 0 6px rgba(96,165,250,0.4)",
                }}
              />
            </div>
            <div
              className="flex justify-between"
              style={{ marginTop: 4, fontSize: "0.6rem", color: "#3a4a5a" }}
            >
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>
          <div className="flex gap-3 justify-center">
            <button
              type="button"
              data-ocid="player.primary_button"
              onClick={play}
              disabled={isPlaying}
              style={{
                ...btnBase,
                padding: "8px 20px",
                background: isPlaying
                  ? "#0f1a2e"
                  : "linear-gradient(180deg, #3b82f6 0%, #1d4ed8 100%)",
                border: "1px solid #2563eb",
                color: isPlaying ? "#1a2a4a" : "#e8f0ff",
                cursor: isPlaying ? "not-allowed" : "pointer",
                boxShadow: isPlaying ? "none" : "0 0 8px rgba(59,130,246,0.3)",
              }}
            >
              ▶ PLAY
            </button>
            <button
              type="button"
              data-ocid="player.secondary_button"
              onClick={pause}
              disabled={!isPlaying}
              style={{
                ...btnBase,
                background: !isPlaying
                  ? "#1a1a0a"
                  : "linear-gradient(180deg, #facc15 0%, #b08800 100%)",
                border: "1px solid #aa8800",
                color: !isPlaying ? "#3a3a1a" : "#0a0800",
                cursor: !isPlaying ? "not-allowed" : "pointer",
              }}
            >
              ⏸ PAUSE
            </button>
            <button
              type="button"
              data-ocid="player.button"
              onClick={stop}
              style={{
                ...btnBase,
                background: "linear-gradient(180deg, #3a3040 0%, #252030 100%)",
                border: "1px solid #3a3040",
                color: "#aa99bb",
              }}
            >
              ■ STOP
            </button>
          </div>
        </div>

        {/* Power Correction System + VU Meter */}
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Correction System */}
          <div className="rack-panel rack-unit-border p-4 flex-1">
            <div
              style={{
                fontSize: "0.6rem",
                color: "#3a4a5a",
                letterSpacing: "0.2em",
                marginBottom: 12,
              }}
            >
              ─── POWER CORRECTION SYSTEM ───
            </div>

            {/* Stabilizer toggle */}
            <div className="flex items-center justify-between mb-5">
              <div>
                <div
                  style={{
                    fontSize: "0.8rem",
                    fontWeight: 700,
                    color: stabilizerOn ? "#60a5fa" : "#4a5568",
                    letterSpacing: "0.1em",
                    textShadow: stabilizerOn
                      ? "0 0 8px rgba(96,165,250,0.4)"
                      : "none",
                    transition: "all 0.3s",
                  }}
                >
                  STABILIZER
                </div>
                <div
                  style={{
                    fontSize: "0.55rem",
                    color: "#2a3040",
                    letterSpacing: "0.1em",
                  }}
                >
                  WAVEFORM CORRECTION
                </div>
              </div>
              <label className="toggle-switch" data-ocid="stabilizer.switch">
                <input
                  type="checkbox"
                  checked={stabilizerOn}
                  onChange={(e) => setStabilizerOn(e.target.checked)}
                />
                <div className="toggle-track" />
              </label>
            </div>

            {/* Combined correction panel */}
            <div
              style={{
                padding: "12px 14px",
                background: stabilizerOn ? "rgba(59,130,246,0.06)" : "#0a0c10",
                border: `1px solid ${stabilizerOn ? "#3b82f644" : "#1a2030"}`,
                borderRadius: 2,
                transition: "all 0.3s",
                marginBottom: 10,
              }}
            >
              <div className="flex items-center gap-2 mb-3">
                <div className={`led ${stabilizerOn ? "active-green" : ""}`} />
                <span
                  style={{
                    fontSize: "0.65rem",
                    fontWeight: 700,
                    color: stabilizerOn ? "#facc15" : "#3a4a5a",
                    letterSpacing: "0.1em",
                  }}
                >
                  GAIN SIGNAL CORRECTION — ALL COMBINED
                </span>
              </div>
              {[
                ["COMMANDER", "× 125,000,000,000"],
                ["GAIN CORRECTION PASSES", "× 125,000,000,000"],
                ["MONITOR", "× 125,000,000,000"],
              ].map(([label, val], i) => (
                <div
                  key={label}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: i < 2 ? 4 : 8,
                    fontSize: "0.6rem",
                    fontFamily: "'JetBrains Mono', monospace",
                  }}
                >
                  <span
                    style={{
                      color: stabilizerOn ? "#93c5fd" : "#2a3a4a",
                      letterSpacing: "0.08em",
                    }}
                  >
                    {label}
                  </span>
                  <span style={{ color: stabilizerOn ? "#facc15" : "#3a4a2a" }}>
                    {val}
                  </span>
                </div>
              ))}
              <div
                style={{
                  borderTop: `1px solid ${stabilizerOn ? "#2563eb55" : "#1a2030"}`,
                  marginBottom: 8,
                }}
              />
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  fontSize: "0.65rem",
                  fontFamily: "'JetBrains Mono', monospace",
                }}
              >
                <span
                  style={{
                    fontWeight: 700,
                    color: stabilizerOn ? "#60a5fa" : "#2a3040",
                    letterSpacing: "0.08em",
                  }}
                >
                  COMBINED
                </span>
                <span
                  style={{
                    fontWeight: 700,
                    color: stabilizerOn ? "#facc15" : "#3a4a2a",
                    letterSpacing: "0.05em",
                  }}
                >
                  = 1.953125e33 → GAIN STAGE
                </span>
              </div>
            </div>

            {/* ─── VOLUME BOOSTER ─── */}
            <div
              style={{
                padding: "12px 14px",
                background: "#0a0c10",
                border: "1px solid #1a2030",
                borderRadius: 2,
                marginBottom: 10,
              }}
            >
              <div
                style={{
                  fontSize: "0.6rem",
                  color: "#3a4a5a",
                  letterSpacing: "0.2em",
                  marginBottom: 10,
                  textAlign: "center",
                }}
              >
                ─── VOLUME BOOSTER ───
              </div>
              <input
                type="range"
                min={0}
                max={200}
                step={1}
                value={loudBooster}
                data-ocid="player.input"
                className="vol-slider"
                style={{ width: "100%", marginBottom: 10 }}
                onChange={(e) => setLoudBooster(Number(e.target.value))}
              />
              <div className="flex items-end gap-2">
                <div
                  style={{
                    fontSize: "2.4rem",
                    fontWeight: 700,
                    color: boosterColor,
                    textShadow: `0 0 14px ${boosterColor}66`,
                    lineHeight: 1,
                    transition: "color 0.3s",
                  }}
                >
                  {loudBooster}
                </div>
                <div
                  style={{
                    fontSize: "0.65rem",
                    color: "#3a4a5a",
                    letterSpacing: "0.1em",
                    paddingBottom: 4,
                  }}
                >
                  / 200
                </div>
              </div>
            </div>

            {/* Status readout */}
            <div
              style={{
                padding: "10px 12px",
                background: stabilizerOn ? "rgba(59,130,246,0.04)" : "#0a0c10",
                border: `1px solid ${stabilizerOn ? "#2563eb33" : "#1a2030"}`,
                borderRadius: 2,
                transition: "all 0.3s",
              }}
            >
              {stabilizerOn ? (
                <div
                  style={{
                    fontSize: "0.6rem",
                    fontFamily: "'JetBrains Mono', monospace",
                  }}
                >
                  <div
                    className="pulse-glow"
                    style={{
                      color: "#60a5fa",
                      letterSpacing: "0.05em",
                      marginBottom: 4,
                    }}
                  >
                    GAIN STAGE CORRECTION: 1.953125e33 — ACTIVE
                  </div>
                  <div
                    style={{
                      fontSize: "0.55rem",
                      color: "#1d4ed8",
                      letterSpacing: "0.05em",
                    }}
                  >
                    STATUS: ACTIVE
                  </div>
                </div>
              ) : (
                <div
                  style={{
                    textAlign: "center",
                    padding: "4px 0",
                    fontSize: "0.6rem",
                    color: "#2a3040",
                    letterSpacing: "0.1em",
                  }}
                >
                  <div>CORRECTION SYSTEM STANDBY</div>
                  <div
                    style={{
                      marginTop: 4,
                      fontSize: "0.55rem",
                      color: "#1a2030",
                    }}
                  >
                    ENGAGE STABILIZER TO ACTIVATE
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* VU Meter */}
          <div className="flex flex-col gap-2" style={{ minWidth: 100 }}>
            <div
              className="rack-panel rack-unit-border"
              style={{ flex: 1, padding: "8px 4px" }}
            >
              <div
                style={{
                  fontSize: "0.5rem",
                  color: "#3a4a5a",
                  letterSpacing: "0.15em",
                  textAlign: "center",
                  marginBottom: 4,
                }}
              >
                VU METER
              </div>
              <canvas
                ref={canvasRef}
                width={90}
                height={440}
                data-ocid="meter.canvas_target"
                style={{ display: "block", margin: "0 auto" }}
              />
              <div
                style={{
                  textAlign: "center",
                  marginTop: 4,
                  fontSize: "0.5rem",
                  color: "#2a3040",
                  letterSpacing: "0.1em",
                }}
              >
                RMS dBFS
              </div>
            </div>

            {/* Peak readout */}
            <div
              className="rack-panel rack-unit-border"
              style={{ padding: "8px 4px", textAlign: "center" }}
            >
              <div
                style={{
                  fontSize: "0.5rem",
                  color: "#3a4a5a",
                  letterSpacing: "0.1em",
                  marginBottom: 4,
                }}
              >
                PEAK
              </div>
              <div
                style={{
                  fontSize: "0.75rem",
                  fontWeight: 700,
                  color: peakColor,
                  textShadow: `0 0 8px ${meterDb >= -3 ? "rgba(239,68,68,0.5)" : "rgba(59,130,246,0.4)"}`,
                }}
              >
                {meterDb}
              </div>
              <div
                style={{
                  fontSize: "0.45rem",
                  color: "#2a3040",
                  letterSpacing: "0.1em",
                }}
              >
                dBFS
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer
        style={{
          borderTop: "1px solid #1a2030",
          padding: "12px 16px",
          textAlign: "center",
        }}
      >
        <div
          style={{
            fontSize: "0.55rem",
            color: "#2a3040",
            letterSpacing: "0.1em",
          }}
        >
          © {new Date().getFullYear()}. Built with love using{" "}
          <a
            href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(typeof window !== "undefined" ? window.location.hostname : "")}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: "#3b82f6", textDecoration: "none" }}
          >
            caffeine.ai
          </a>
        </div>
      </footer>
    </div>
  );
}
