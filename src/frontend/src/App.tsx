import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/sonner";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { audioEngine } from "./audio/AudioEngine";
import { BatterySystem } from "./components/BatterySystem";
import { CorrectionPanel } from "./components/CorrectionPanel";
import { DbMeter } from "./components/DbMeter";
import { Equalizer } from "./components/Equalizer";
import { FreqNoisePanel } from "./components/FreqNoisePanel";
import { KickDrum } from "./components/KickDrum";
import { PowerWires } from "./components/PowerWires";
import { SoundEngines } from "./components/SoundEngines";
import { SoundMagnet } from "./components/SoundMagnet";
import { BrutusAmp } from "./components/amp/BrutusAmp";

// ─── Persistence ────────────────────────────────────────────────────────────────────────
const STORAGE_KEY = "pcdc_settings_v5";
const BATTERY_KEY = "pcdc_battery_ready";
const LEGACY_KEYS = [
  "pcdc_settings_v4",
  "pcdc_settings_v3",
  "pcdc_settings_v2",
  "pcdc_settings_v1",
  "pcdc_settings",
];

interface SavedSettings {
  volume: number;
  stabilizer: boolean;
  batteryReady: boolean;
  dbBoost: number;
  eqBands: number[];
  enginesActive: boolean[];
  noiseGate: boolean;
  rockBassDrop: boolean;
  loudnessSafetyExtreme: boolean;
  smoothWarm: boolean;
  bullhornActive: boolean;
  smallSpeakerMode: boolean;
}

function loadSettings(): SavedSettings {
  let batteryReady = false;
  try {
    batteryReady = localStorage.getItem(BATTERY_KEY) === "1";
  } catch (_) {}
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const p = JSON.parse(raw) as SavedSettings;
      return {
        ...p,
        batteryReady: batteryReady || p.batteryReady,
        rockBassDrop: p.rockBassDrop ?? false,
        loudnessSafetyExtreme: p.loudnessSafetyExtreme ?? false,
        smoothWarm: p.smoothWarm ?? false,
        smallSpeakerMode: p.smallSpeakerMode ?? false,
      };
    }
  } catch (_) {}
  for (const k of LEGACY_KEYS) {
    try {
      const raw = localStorage.getItem(k);
      if (raw) {
        const p = JSON.parse(raw) as SavedSettings;
        const m: SavedSettings = {
          ...p,
          batteryReady: batteryReady || p.batteryReady,
          rockBassDrop: p.rockBassDrop ?? false,
          loudnessSafetyExtreme: p.loudnessSafetyExtreme ?? false,
          smoothWarm: p.smoothWarm ?? false,
          smallSpeakerMode: p.smallSpeakerMode ?? false,
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(m));
        try {
          localStorage.removeItem(k);
        } catch (_) {}
        return m;
      }
    } catch (_) {}
  }
  return {
    volume: 50,
    stabilizer: false,
    batteryReady,
    dbBoost: 0,
    eqBands: new Array(10).fill(0),
    enginesActive: [true, true, true, true],
    noiseGate: false,
    rockBassDrop: false,
    loudnessSafetyExtreme: false,
    smoothWarm: false,
    bullhornActive: false,
    smallSpeakerMode: false,
  };
}

function saveSettings(s: SavedSettings) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
    if (s.batteryReady) localStorage.setItem(BATTERY_KEY, "1");
  } catch (_) {}
}

const EQ_FREQS = [60, 120, 250, 500, 1000, 2000, 4000, 8000, 12000, 16000];
const ENG_BASE = [0.26, 0.26, 0.24, 0.24];

export default function App() {
  const saved = loadSettings();

  const [batteryReady, setBatteryReady] = useState(saved.batteryReady);
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasFile, setHasFile] = useState(false);
  const [volume, setVolume] = useState(saved.volume);
  const [stabilizer, setStabilizer] = useState(saved.stabilizer);
  const [dbBoost, setDbBoost] = useState(saved.dbBoost);
  const [eqBands, setEqBands] = useState(saved.eqBands);
  const [enginesActive, setEnginesActive] = useState(saved.enginesActive);
  const [noiseGate, setNoiseGate] = useState(saved.noiseGate);
  const [rockBassDrop, setRockBassDrop] = useState(saved.rockBassDrop);
  const [loudnessSafetyExtreme, setLoudnessSafetyExtreme] = useState(
    saved.loudnessSafetyExtreme,
  );
  const [smoothWarm, setSmoothWarm] = useState(saved.smoothWarm);
  const [bullhornActive, setBullhornActive] = useState(
    saved.bullhornActive ?? false,
  );
  const [smallSpeakerMode, setSmallSpeakerMode] = useState(
    saved.smallSpeakerMode ?? false,
  );
  const fileInputRef = useRef<HTMLInputElement>(null);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const audioBufferRef = useRef<AudioBuffer | null>(null);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);
  const isPlayingRef = useRef(false);
  const pausedAtRef = useRef(0);
  const startedAtRef = useRef(0);

  const sourceInputRef = useRef<GainNode | null>(null);
  const masterGainRef = useRef<GainNode | null>(null);
  const engineGainsRef = useRef<GainNode[]>([]);
  const eqFiltersRef = useRef<BiquadFilterNode[]>([]);
  const hz80FilterRef = useRef<BiquadFilterNode | null>(null);
  const correctionGainRef = useRef<GainNode | null>(null);
  const noiseGateRef = useRef<DynamicsCompressorNode | null>(null);
  const soundMagnetGainRef = useRef<GainNode | null>(null);
  const ampGainRef = useRef<GainNode | null>(null);
  const dbBoostGainRef = useRef<GainNode | null>(null);
  const outputGainRef = useRef<GainNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);

  const S = useRef(saved);
  useEffect(() => {
    S.current = {
      volume,
      stabilizer,
      batteryReady,
      dbBoost,
      eqBands,
      enginesActive,
      noiseGate,
      rockBassDrop,
      loudnessSafetyExtreme,
      smoothWarm,
      bullhornActive,
      smallSpeakerMode,
    };
  });

  useEffect(() => {
    saveSettings({
      volume,
      stabilizer,
      batteryReady,
      dbBoost,
      eqBands,
      enginesActive,
      noiseGate,
      rockBassDrop,
      loudnessSafetyExtreme,
      smoothWarm,
      bullhornActive,
      smallSpeakerMode,
    });
  }, [
    volume,
    stabilizer,
    batteryReady,
    dbBoost,
    eqBands,
    enginesActive,
    noiseGate,
    rockBassDrop,
    loudnessSafetyExtreme,
    smoothWarm,
    bullhornActive,
    smallSpeakerMode,
  ]);

  // ─────────────────────────────────────────────────────────────────────────
  // buildChain
  //
  // Signal chain:
  //   source → sourceInput → engines(A+B+C+D) → mixer → EQ[10] → hz80
  //     → correctionGain → noiseGate → stereo → soundMagnet → env
  //     → clarity → ampGain
  //     → commander → gainPasses → monitor → stabilizerNode → signalCleaner
  //     → limEase → brickWall
  //     → masterGain (volume, clean 0–1.0)
  //     → dbBoostGain (1–5x, after volume)
  //     → outputGain → analyser → speakers
  // ─────────────────────────────────────────────────────────────────────────
  const buildChain = useCallback((ctx: AudioContext) => {
    const s = S.current;

    // Source entry (unity)
    const sourceInput = ctx.createGain();
    sourceInput.gain.value = 1.0;

    // A+ B+ C+ D+ engines
    const engineGains = ENG_BASE.map((g, i) => {
      const n = ctx.createGain();
      n.gain.value = s.enginesActive[i] ? g : 0;
      return n;
    });
    const mixer = ctx.createGain();
    mixer.gain.value = 1.0;

    // 10-band EQ
    const eqFilters = EQ_FREQS.map((freq, i) => {
      const f = ctx.createBiquadFilter();
      f.type = "peaking";
      f.frequency.value = freq;
      f.Q.value = 1.4;
      f.gain.value = s.eqBands[i] ?? 0;
      return f;
    });

    // 80 Hz filter (Rock Concert or Saft Drop)
    const hz80Filter = ctx.createBiquadFilter();
    hz80Filter.type = "peaking";
    hz80Filter.frequency.value = 80;
    hz80Filter.Q.value = s.rockBassDrop ? 1.5 : 1.0;
    hz80Filter.gain.value = s.rockBassDrop ? 8 : 0;

    // Stabilizer / correction gain pass
    const correctionGain = ctx.createGain();
    correctionGain.gain.value = s.stabilizer ? 1.4 : 1.0;

    // Noise gate
    const noiseGate = ctx.createDynamicsCompressor();
    noiseGate.threshold.value = s.noiseGate ? -50 : 0;
    noiseGate.knee.value = 0;
    noiseGate.ratio.value = s.noiseGate ? 20 : 1;
    noiseGate.attack.value = 0.003;
    noiseGate.release.value = 0.25;

    // Stereo widener
    const stereoSplitter = ctx.createChannelSplitter(2);
    const stereoMerger = ctx.createChannelMerger(2);
    const stereoLeft = ctx.createGain();
    stereoLeft.gain.value = 1.0;
    const stereoRight = ctx.createGain();
    stereoRight.gain.value = 1.0;

    // Sound Magnet gain
    const soundMagnetGain = ctx.createGain();
    soundMagnetGain.gain.value = 1.0;

    // Env room expansion (parallel delay)
    const envDelay = ctx.createDelay(0.5);
    envDelay.delayTime.value = 0.02;
    const envFeedback = ctx.createGain();
    envFeedback.gain.value = 0;
    const envWet = ctx.createGain();
    envWet.gain.value = 0;

    // Clarity / presence filter
    const clarityFilter = ctx.createBiquadFilter();
    clarityFilter.type = "highshelf";
    clarityFilter.frequency.value = 3000;
    clarityFilter.gain.value = 3;

    // HBS Amp saft
    const ampGain = ctx.createGain();
    ampGain.gain.value = s.loudnessSafetyExtreme ? 4.0 : 3.5;

    // Correction 1: Commander — fast distortion attack
    const commander = ctx.createDynamicsCompressor();
    commander.threshold.value = -6;
    commander.knee.value = 0;
    commander.ratio.value = 20;
    commander.attack.value = 0.001;
    commander.release.value = 0.05;

    // Correction 2: Gain passes
    const gainPasses = ctx.createDynamicsCompressor();
    gainPasses.threshold.value = -6;
    gainPasses.knee.value = 0;
    gainPasses.ratio.value = 20;
    gainPasses.attack.value = 0.001;
    gainPasses.release.value = 0.05;

    // Correction 3: Monitor
    const monitor = ctx.createDynamicsCompressor();
    monitor.threshold.value = -6;
    monitor.knee.value = 0;
    monitor.ratio.value = 20;
    monitor.attack.value = 0.001;
    monitor.release.value = 0.05;

    // Correction 4: Stabilizer — targets stuttering/background noise
    const stabilizerNode = ctx.createDynamicsCompressor();
    stabilizerNode.threshold.value = -6;
    stabilizerNode.knee.value = 0;
    stabilizerNode.ratio.value = 20;
    stabilizerNode.attack.value = 0.001;
    stabilizerNode.release.value = 0.05;

    // Correction 5: Signal Cleaner — final pass
    const signalCleaner = ctx.createDynamicsCompressor();
    signalCleaner.threshold.value = -6;
    signalCleaner.knee.value = 0;
    signalCleaner.ratio.value = 20;
    signalCleaner.attack.value = 0.001;
    signalCleaner.release.value = 0.05;

    // Limiter Ease: lets clean transients through, catches distortion only
    const limEase = ctx.createDynamicsCompressor();
    limEase.threshold.value = -3;
    limEase.knee.value = 6;
    limEase.ratio.value = 12;
    limEase.attack.value = 0.003;
    limEase.release.value = 0.1;

    // Brick wall: clipping ONLY, final safety
    const brickWall = ctx.createDynamicsCompressor();
    brickWall.threshold.value = -1;
    brickWall.knee.value = 0;
    brickWall.ratio.value = 20;
    brickWall.attack.value = 0.001;
    brickWall.release.value = 0.05;

    // Volume: clean 0–1.0 exponential (no gain multiplier, amp drives loudness)
    const masterGain = ctx.createGain();
    masterGain.gain.value = s.volume === 0 ? 0 : (s.volume / 100) ** 2;

    // DB Boost: 1.0–5.0x (after volume)
    const dbBoostGain = ctx.createGain();
    dbBoostGain.gain.value = 1.0 + (s.dbBoost / 100) * 4.0;

    // Output gain: 2.0x push to speaker
    const outputGain = ctx.createGain();
    outputGain.gain.value = 2.0;

    // Analyser
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 2048;

    // ── Wire chain ──────────────────────────────────────────────────────────────────
    for (const eg of engineGains) {
      sourceInput.connect(eg);
      eg.connect(mixer);
    }
    let prev: AudioNode = mixer;
    for (const f of eqFilters) {
      prev.connect(f);
      prev = f;
    }
    prev.connect(hz80Filter);
    hz80Filter.connect(correctionGain);
    correctionGain.connect(noiseGate);
    noiseGate.connect(stereoSplitter);
    stereoSplitter.connect(stereoLeft, 0);
    stereoSplitter.connect(stereoRight, 1);
    stereoLeft.connect(stereoMerger, 0, 0);
    stereoRight.connect(stereoMerger, 0, 1);
    stereoMerger.connect(soundMagnetGain);
    soundMagnetGain.connect(envDelay);
    envDelay.connect(envFeedback);
    envFeedback.connect(envDelay);
    envDelay.connect(envWet);
    soundMagnetGain.connect(clarityFilter);
    envWet.connect(clarityFilter);
    clarityFilter.connect(ampGain);
    ampGain.connect(commander);
    commander.connect(gainPasses);
    gainPasses.connect(monitor);
    monitor.connect(stabilizerNode);
    stabilizerNode.connect(signalCleaner);
    signalCleaner.connect(limEase);
    limEase.connect(brickWall);
    brickWall.connect(masterGain);
    masterGain.connect(dbBoostGain);
    dbBoostGain.connect(outputGain);
    outputGain.connect(analyser);
    analyser.connect(ctx.destination);

    // Store refs
    sourceInputRef.current = sourceInput;
    masterGainRef.current = masterGain;
    engineGainsRef.current = engineGains;
    eqFiltersRef.current = eqFilters;
    hz80FilterRef.current = hz80Filter;
    correctionGainRef.current = correctionGain;
    noiseGateRef.current = noiseGate;
    soundMagnetGainRef.current = soundMagnetGain;
    ampGainRef.current = ampGain;
    dbBoostGainRef.current = dbBoostGain;
    outputGainRef.current = outputGain;
    analyserRef.current = analyser;

    // Bind to audioEngine singleton
    audioEngine.bindNodes(ctx, {
      sourceInput,
      masterGain,
      engineGains,
      eqFilters,
      hz80Filter,
      correctionGain,
      noiseGate,
      stereoLeft,
      stereoRight,
      soundMagnetGain,
      envDelay,
      envFeedback,
      envWet,
      ampGain,
      commander,
      gainPasses,
      monitor,
      stabilizerNode,
      signalCleaner,
      limEase,
      brickWall,
      dbBoostGain,
      outputGain,
      analyser,
    });

    if (s.batteryReady) audioEngine.setAmpPower(true);
    if (s.smoothWarm) audioEngine.setSmoothWarm(true);
  }, []);

  // ─── File load ─────────────────────────────────────────────────────────────
  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      // Stop any current playback cleanly
      if (isPlayingRef.current) {
        try {
          sourceRef.current?.stop();
        } catch (_) {}
        isPlayingRef.current = false;
        setIsPlaying(false);
      }
      sourceRef.current = null;
      pausedAtRef.current = 0;
      try {
        // Close old context and create a fresh one
        if (audioCtxRef.current) {
          try {
            await audioCtxRef.current.close();
          } catch (_) {}
        }
        const ctx = new AudioContext();
        await ctx.resume();
        audioCtxRef.current = ctx;
        buildChain(ctx);
        const arrayBuf = await file.arrayBuffer();
        audioBufferRef.current = await ctx.decodeAudioData(arrayBuf);
        setHasFile(true);
        toast.success(`Loaded: ${file.name}`);
      } catch (err) {
        console.error("File load error:", err);
        toast.error("Failed to load audio file");
      }
    },
    [buildChain],
  );

  // ─── Play / Pause ───────────────────────────────────────────────────────────
  const handlePlayPause = async () => {
    const ctx = audioCtxRef.current;
    const buf = audioBufferRef.current;
    const si = sourceInputRef.current;

    if (!ctx || !buf) {
      toast.error("Load an audio file first");
      return;
    }

    if (isPlayingRef.current) {
      pausedAtRef.current = ctx.currentTime - startedAtRef.current;
      try {
        sourceRef.current?.stop();
      } catch (_) {}
      sourceRef.current = null;
      isPlayingRef.current = false;
      setIsPlaying(false);
    } else {
      if (ctx.state === "suspended") await ctx.resume();
      if (ctx.state !== "running") {
        toast.error("Audio context failed to start");
        return;
      }
      if (!si) {
        toast.error("Signal chain not ready");
        return;
      }
      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.connect(si);
      const offset = pausedAtRef.current > 0 ? pausedAtRef.current : 0;
      src.start(0, offset);
      startedAtRef.current = ctx.currentTime - offset;
      sourceRef.current = src;
      isPlayingRef.current = true;
      setIsPlaying(true);
      src.onended = () => {
        if (isPlayingRef.current) {
          isPlayingRef.current = false;
          pausedAtRef.current = 0;
          setIsPlaying(false);
        }
      };
    }
  };

  // Volume: exponential curve, amp drives loudness
  const handleVolume = (val: number) => {
    setVolume(val);
    if (masterGainRef.current) {
      masterGainRef.current.gain.value = val === 0 ? 0 : (val / 100) ** 2;
    }
    audioEngine.setVolume(val);
  };

  // Battery ready
  const handleBatteryReady = () => {
    setBatteryReady(true);
    try {
      localStorage.setItem(BATTERY_KEY, "1");
    } catch (_) {}
    if (ampGainRef.current) {
      ampGainRef.current.gain.value = loudnessSafetyExtreme ? 4.0 : 3.5;
    }
    audioEngine.setAmpPower(true);
  };

  const handleStabilizer = (val: boolean) => {
    setStabilizer(val);
    if (correctionGainRef.current)
      correctionGainRef.current.gain.value = val ? 1.4 : 1.0;
    audioEngine.toggleStabilizer(val);
  };

  // Rock Concert: warm 80 Hz boost
  const handleRockBassDrop = (on: boolean) => {
    setRockBassDrop(on);
    if (hz80FilterRef.current) {
      hz80FilterRef.current.Q.value = on ? 1.5 : 1.0;
      hz80FilterRef.current.gain.value = on ? 8 : 0;
    }
    audioEngine.setRockBassDrop(on);
  };

  // Extreme: max amp gain
  const handleLoudnessSafetyExtreme = (on: boolean) => {
    setLoudnessSafetyExtreme(on);
    if (ampGainRef.current && batteryReady) {
      ampGainRef.current.gain.value = on ? 4.0 : 3.5;
    }
    audioEngine.setLoudnessSafetyExtreme(on);
  };

  // DB Boost: 0-100% → 1.0-5.0x
  const handleDbBoostChange = (val: number) => {
    setDbBoost(val);
    if (dbBoostGainRef.current) {
      dbBoostGainRef.current.gain.value = 1.0 + (val / 100) * 4.0;
    }
    audioEngine.setDBBoost(val);
  };

  // Smooth Warm
  const handleSmoothWarm = (on: boolean) => {
    setSmoothWarm(on);
    audioEngine.setSmoothWarm(on);
  };

  const handleBullhorn = (on: boolean) => {
    setBullhornActive(on);
    audioEngine.setBullhorn(on);
  };

  const handleSmallSpeaker = (on: boolean) => {
    setSmallSpeakerMode(on);
    audioEngine.setSmallSpeakerMode(on);
  };

  const handleSave = () => {
    saveSettings({
      volume,
      stabilizer,
      batteryReady,
      dbBoost,
      eqBands,
      enginesActive,
      noiseGate,
      rockBassDrop,
      loudnessSafetyExtreme,
      smoothWarm,
      bullhornActive,
      smallSpeakerMode,
    });
    toast.success("Settings saved!");
  };

  return (
    <div
      className="min-h-screen"
      style={{
        background: "linear-gradient(180deg, #050a14 0%, #0a0f1e 100%)",
        fontFamily: "'Bricolage Grotesque', sans-serif",
      }}
    >
      <Toaster position="top-right" />

      <header
        className="w-full py-5 px-6"
        style={{ background: "#05080f", borderBottom: "2px solid #1e40af" }}
      >
        <div className="max-w-[1400px] mx-auto flex items-center justify-between">
          <h1
            className="text-xl md:text-3xl font-black tracking-widest"
            style={{
              color: "#facc15",
              textShadow: "0 0 30px rgba(250,204,21,0.5)",
              fontFamily: "'Bricolage Grotesque', sans-serif",
            }}
          >
            GERROD / ENGINEER / PRODUCT DB AMPLIFIER
          </h1>
          <div
            className="hidden md:flex items-center gap-2 text-xs font-mono"
            style={{ color: "#475569" }}
          >
            <div
              className="w-2 h-2 rounded-full"
              style={{
                background: batteryReady ? "#22c55e" : "#ef4444",
                boxShadow: batteryReady ? "0 0 6px #22c55e" : "0 0 6px #ef4444",
              }}
            />
            <span>{batteryReady ? "SYSTEM ONLINE" : "CHARGING..."}</span>
          </div>
        </div>
      </header>

      <main className="max-w-[1400px] mx-auto px-4 py-6 space-y-5">
        {!batteryReady ? (
          <BatterySystem onReady={handleBatteryReady} />
        ) : (
          <>
            <BatterySystem
              onReady={() => {}}
              compact
              onSave={handleSave}
              initialReady={batteryReady}
            />
            <PowerWires powered={batteryReady} />

            <BrutusAmp
              powered={batteryReady}
              rockBassDrop={rockBassDrop}
              onRockBassDrop={handleRockBassDrop}
              loudnessSafetyExtreme={loudnessSafetyExtreme}
              onLoudnessSafetyExtreme={handleLoudnessSafetyExtreme}
            />

            {/* ─── TRANSPORT ─── */}
            <div
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
                TRANSPORT
              </h3>

              <div className="flex flex-wrap items-center gap-4">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="audio/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <Button
                  data-ocid="transport.upload_button"
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    background: "#1e40af",
                    color: "#facc15",
                    border: "1px solid #3b82f6",
                  }}
                >
                  LOAD AUDIO
                </Button>
                <Button
                  data-ocid="transport.primary_button"
                  onClick={handlePlayPause}
                  disabled={!hasFile}
                  style={{
                    background: isPlaying ? "#7c2d12" : "#14532d",
                    color: isPlaying ? "#fca5a5" : "#86efac",
                    border: `1px solid ${isPlaying ? "#ef4444" : "#22c55e"}`,
                    opacity: hasFile ? 1 : 0.4,
                  }}
                >
                  {isPlaying ? "PAUSE" : "PLAY"}
                </Button>
                <Button
                  data-ocid="transport.save_button"
                  onClick={handleSave}
                  style={{
                    background: "#1e3a6e",
                    color: "#93c5fd",
                    border: "1px solid #3b82f6",
                  }}
                >
                  SAVE
                </Button>

                {/* SMOOTH WARM toggle */}
                <button
                  type="button"
                  data-ocid="transport.toggle"
                  onClick={() => handleSmoothWarm(!smoothWarm)}
                  style={{
                    padding: "8px 16px",
                    borderRadius: "6px",
                    background: smoothWarm ? "#1a2a10" : "#0d1527",
                    color: smoothWarm ? "#86efac" : "#3b82f6",
                    border: `1px solid ${smoothWarm ? "#22c55e" : "#1e3a6e"}`,
                    fontSize: "12px",
                    fontWeight: "800",
                    letterSpacing: "0.1em",
                    cursor: "pointer",
                    boxShadow: smoothWarm
                      ? "0 0 8px rgba(34,197,94,0.4)"
                      : "none",
                    transition: "all 0.2s",
                  }}
                >
                  {smoothWarm ? "SMOOTH WARM ON" : "SMOOTH WARM"}
                </button>

                {hasFile && (
                  <span
                    className="text-xs font-mono"
                    data-ocid="transport.success_state"
                    style={{ color: "#22c55e" }}
                  >
                    FILE LOADED ✓
                  </span>
                )}
              </div>

              {/* Volume */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm font-bold font-mono">
                  <span style={{ color: "#facc15" }}>VOLUME</span>
                  <span style={{ color: "#e2e8f0" }}>{volume} / 100</span>
                </div>
                <input
                  data-ocid="transport.input"
                  type="range"
                  min="0"
                  max="100"
                  step="1"
                  value={volume}
                  onChange={(e) =>
                    handleVolume(Number.parseInt(e.target.value))
                  }
                  className="w-full"
                  style={{ accentColor: "#facc15", height: "8px" }}
                />
                <div
                  className="flex justify-between text-xs font-mono"
                  style={{ color: "#475569" }}
                >
                  <span>0</span>
                  <span style={{ fontSize: "10px" }}>
                    Engines → Amp 3.5x saft → 5 Corrections → LimiterEase →
                    BrickWall → Volume → DBBoost → Out
                  </span>
                  <span>100</span>
                </div>
              </div>
            </div>

            <DbMeter />

            <CorrectionPanel
              stabilizer={stabilizer}
              onStabilizerChange={handleStabilizer}
            />
            <SoundEngines
              initialActive={enginesActive}
              onActiveChange={setEnginesActive}
            />
            <KickDrum />
            <Equalizer initialBands={eqBands} onBandsChange={setEqBands} />
            <FreqNoisePanel
              initialDbBoost={dbBoost}
              initialNoiseGate={noiseGate}
              onSettingsChange={(s) => {
                handleDbBoostChange(s.dbBoost);
                setNoiseGate(s.noiseGate);
              }}
            />
            {/* ─── BULLHORN MODE ────────────────────────────────────────── */}
            <div
              style={{
                background: bullhornActive
                  ? "linear-gradient(135deg, #0a0f1e 0%, #1a0a05 100%)"
                  : "linear-gradient(135deg, #05080f 0%, #0a0f1e 100%)",
                border: bullhornActive
                  ? "2px solid #dc2626"
                  : "1px solid #1e3a6e",
                borderRadius: "12px",
                padding: "20px 24px",
                marginTop: "16px",
                boxShadow: bullhornActive
                  ? "0 0 24px rgba(220,38,38,0.3), inset 0 0 40px rgba(220,38,38,0.05)"
                  : "none",
                transition: "all 0.3s ease",
              }}
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <span style={{ fontSize: "22px" }}>🔊</span>
                  <div>
                    <div
                      className="font-mono font-black tracking-widest"
                      style={{
                        color: bullhornActive ? "#ef4444" : "#3b82f6",
                        fontSize: "15px",
                        letterSpacing: "0.2em",
                      }}
                    >
                      BULLHORN MODE
                    </div>
                    <div
                      className="font-mono text-xs mt-0.5"
                      style={{ color: "#334155" }}
                    >
                      Stadium PA · Warm Professional Projection
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {/* Status badge */}
                  <span
                    className="font-mono font-black text-xs px-3 py-1"
                    style={{
                      background: bullhornActive
                        ? "rgba(220,38,38,0.15)"
                        : "rgba(30,58,110,0.3)",
                      color: bullhornActive ? "#ef4444" : "#475569",
                      border: `1px solid ${bullhornActive ? "#dc2626" : "#1e3a6e"}`,
                      borderRadius: "4px",
                      letterSpacing: "0.15em",
                      boxShadow: bullhornActive
                        ? "0 0 8px rgba(220,38,38,0.4)"
                        : "none",
                    }}
                  >
                    {bullhornActive ? "ACTIVE" : "OFF"}
                  </span>
                  {/* Toggle */}
                  <button
                    type="button"
                    data-ocid="bullhorn.toggle"
                    onClick={() => handleBullhorn(!bullhornActive)}
                    style={{
                      width: "56px",
                      height: "28px",
                      borderRadius: "14px",
                      background: bullhornActive
                        ? "linear-gradient(90deg, #991b1b, #dc2626)"
                        : "#0d1527",
                      border: `2px solid ${bullhornActive ? "#ef4444" : "#1e3a6e"}`,
                      position: "relative",
                      cursor: "pointer",
                      transition: "all 0.25s ease",
                      boxShadow: bullhornActive
                        ? "0 0 12px rgba(220,38,38,0.5)"
                        : "inset 0 1px 3px rgba(0,0,0,0.5)",
                    }}
                    aria-label="Toggle Bullhorn Mode"
                  >
                    <div
                      style={{
                        width: "20px",
                        height: "20px",
                        borderRadius: "50%",
                        background: bullhornActive ? "#fff" : "#334155",
                        position: "absolute",
                        top: "2px",
                        left: bullhornActive ? "30px" : "2px",
                        transition: "left 0.25s ease",
                        boxShadow: bullhornActive
                          ? "0 0 6px rgba(255,255,255,0.8)"
                          : "none",
                      }}
                    />
                  </button>
                </div>
              </div>

              {/* Active label */}
              {bullhornActive && (
                <div
                  className="font-mono text-xs font-bold tracking-wider mb-3 text-center py-1.5"
                  style={{
                    color: "#ef4444",
                    background: "rgba(220,38,38,0.08)",
                    border: "1px solid rgba(220,38,38,0.2)",
                    borderRadius: "6px",
                    letterSpacing: "0.18em",
                  }}
                >
                  WARM PROFESSIONAL PROJECTION
                </div>
              )}

              {/* Description */}
              <div
                className="font-mono text-xs leading-relaxed"
                style={{ color: "#475569" }}
              >
                Focuses sound like a pro PA system —{" "}
                <span style={{ color: bullhornActive ? "#93c5fd" : "#334155" }}>
                  warm, loud, crystal clear
                </span>
                . Boosts warmth at 200–350 Hz, removes harshness at 4kHz, adds
                presence projection.
              </div>

              {/* Signal chain display */}
              <div
                className="mt-3 font-mono text-xs"
                style={{
                  color: "#1e3a6e",
                  borderTop: "1px solid #0d1527",
                  paddingTop: "10px",
                }}
              >
                DB BOOST → WARM EQ → PROJECTION FILTER → ROOM DELAY → OUTPUT
              </div>
            </div>

            {/* Small Speaker Mode Panel */}
            <div
              style={{
                background: smallSpeakerMode
                  ? "linear-gradient(135deg, #0a1535 0%, #0f0a1e 100%)"
                  : "linear-gradient(135deg, #080e1c 0%, #080e1c 100%)",
                border: `2px solid ${smallSpeakerMode ? "#3b82f6" : "#1e2a3a"}`,
                borderRadius: "10px",
                padding: "20px",
                marginBottom: "18px",
                boxShadow: smallSpeakerMode
                  ? "0 0 24px rgba(59,130,246,0.25), inset 0 0 16px rgba(59,130,246,0.05)"
                  : "0 2px 8px rgba(0,0,0,0.4)",
              }}
            >
              {/* Header row */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span style={{ fontSize: "20px" }}>📱</span>
                  <span
                    className="font-mono font-bold tracking-widest"
                    style={{
                      fontSize: "13px",
                      color: smallSpeakerMode ? "#60a5fa" : "#3b82f6",
                      letterSpacing: "0.15em",
                    }}
                  >
                    SMALL SPEAKER MODE
                  </span>
                  {smallSpeakerMode && (
                    <span
                      className="font-mono font-bold"
                      style={{
                        background: "#1e40af",
                        color: "#bfdbfe",
                        fontSize: "10px",
                        padding: "2px 8px",
                        borderRadius: "4px",
                        border: "1px solid #3b82f6",
                        letterSpacing: "0.1em",
                      }}
                    >
                      120 dB READY
                    </span>
                  )}
                </div>
                <span
                  className="font-mono text-xs"
                  style={{ color: smallSpeakerMode ? "#3b82f6" : "#1e3a6e" }}
                >
                  {smallSpeakerMode ? "ACTIVE" : "OFF"}
                </span>
              </div>

              {/* Toggle */}
              <div className="flex items-center gap-4 mb-4">
                <button
                  type="button"
                  data-ocid="small_speaker.toggle"
                  onClick={() => handleSmallSpeaker(!smallSpeakerMode)}
                  style={{
                    position: "relative",
                    width: "60px",
                    height: "30px",
                    background: smallSpeakerMode
                      ? "linear-gradient(90deg, #1d4ed8 0%, #3b82f6 100%)"
                      : "#0d1527",
                    border: `2px solid ${smallSpeakerMode ? "#3b82f6" : "#1e3a6e"}`,
                    borderRadius: "15px",
                    cursor: "pointer",
                    transition: "all 0.2s",
                    boxShadow: smallSpeakerMode
                      ? "0 0 12px rgba(59,130,246,0.5)"
                      : "none",
                  }}
                >
                  <div
                    style={{
                      position: "absolute",
                      top: "2px",
                      width: "22px",
                      height: "22px",
                      borderRadius: "50%",
                      background: smallSpeakerMode ? "#fff" : "#334155",
                      left: smallSpeakerMode ? "32px" : "2px",
                      transition: "all 0.2s",
                      boxShadow: smallSpeakerMode
                        ? "0 0 8px rgba(59,130,246,0.8)"
                        : "none",
                    }}
                  />
                </button>
                <span
                  className="font-mono text-xs"
                  style={{ color: smallSpeakerMode ? "#93c5fd" : "#334155" }}
                >
                  {smallSpeakerMode
                    ? "Trained for maximum loudness on any speaker size"
                    : "Enable for small Bluetooth speakers"}
                </span>
              </div>

              {/* Signal chain info */}
              {smallSpeakerMode && (
                <div
                  className="font-mono text-xs"
                  style={{
                    color: "#1e40af",
                    borderTop: "1px solid #1e2a3a",
                    paddingTop: "10px",
                  }}
                >
                  <div style={{ color: "#60a5fa", marginBottom: "4px" }}>
                    PSYCHOACOUSTIC CHAIN ACTIVE:
                  </div>
                  <div style={{ color: "#3b82f6" }}>
                    1kHz +3dB → 2kHz +4dB → 3.5kHz +3dB (Fletcher-Munson) → 5kHz
                    +4dB → HARMONIC EXCITER → OUTPUT ×1.8
                  </div>
                </div>
              )}

              {/* Description */}
              <div
                className="font-mono text-xs leading-relaxed mt-3"
                style={{ color: "#475569" }}
              >
                Boosts the frequencies your ear hears loudest — 1–5kHz presence
                zone and 3.5kHz Fletcher-Munson peak. Adds harmonic richness so{" "}
                <span
                  style={{ color: smallSpeakerMode ? "#60a5fa" : "#1e3a6e" }}
                >
                  small speakers punch way above their size.
                </span>
              </div>
            </div>

            <SoundMagnet />
          </>
        )}
      </main>

      <footer
        className="w-full py-4 mt-8"
        style={{ borderTop: "1px solid #1e3a6e", background: "#05080f" }}
      >
        <div className="max-w-[1400px] mx-auto px-6 flex justify-between items-center">
          <span className="text-xs font-mono" style={{ color: "#334155" }}>
            POWER CORRECTION DISTORTION CENTER
          </span>
          <a
            href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-mono"
            style={{ color: "#334155" }}
          >
            &copy; {new Date().getFullYear()} Built with love using caffeine.ai
          </a>
        </div>
      </footer>
    </div>
  );
}
