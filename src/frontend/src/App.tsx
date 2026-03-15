import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/sonner";
import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";
import { audioEngine } from "./audio/AudioEngine";
import { BatterySystem } from "./components/BatterySystem";
import { BrutusAmp } from "./components/BrutusAmp";
import { CorrectionPanel } from "./components/CorrectionPanel";
import { DbMeter } from "./components/DbMeter";
import { Equalizer } from "./components/Equalizer";
import { FreqNoisePanel } from "./components/FreqNoisePanel";
import { SoundEngines } from "./components/SoundEngines";
import { SoundMagnet } from "./components/SoundMagnet";
import { MackieMixer } from "./components/mixer/MackieMixer";

const STORAGE_KEY = "pcdc_settings_v1";

interface SavedSettings {
  volume: number;
  stabilizer: boolean;
}

function loadSettings(): SavedSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as SavedSettings;
  } catch (_) {}
  return { volume: 100, stabilizer: false };
}

export default function App() {
  const [batteryReady, setBatteryReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasFile, setHasFile] = useState(false);
  const [volume, setVolume] = useState(() => loadSettings().volume);
  const [stabilizer, setStabilizer] = useState(() => loadSettings().stabilizer);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      try {
        await audioEngine.loadFile(file);
        setHasFile(true);
        toast.success(`Loaded: ${file.name}`);
      } catch {
        toast.error("Failed to load audio file");
      }
    },
    [],
  );

  const handlePlayPause = () => {
    if (!hasFile) {
      toast.error("Load an audio file first");
      return;
    }
    if (isPlaying) {
      audioEngine.pause();
      setIsPlaying(false);
    } else {
      audioEngine.play();
      setIsPlaying(true);
    }
  };

  const handleVolume = (val: number) => {
    setVolume(val);
    audioEngine.setVolume(val);
  };

  const handleSave = () => {
    const s: SavedSettings = { volume, stabilizer };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
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

      {/* Header */}
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
          <BatterySystem onReady={() => setBatteryReady(true)} />
        ) : (
          <>
            <BatterySystem onReady={() => {}} compact onSave={handleSave} />
            <BrutusAmp powered={batteryReady} />

            {/* Transport + Volume panel */}
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
                  ref={fileRef}
                  type="file"
                  accept="audio/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <Button
                  data-ocid="transport.upload_button"
                  onClick={() => fileRef.current?.click()}
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
                {hasFile && (
                  <span
                    className="text-xs font-mono"
                    data-ocid="transport.success_state"
                    style={{ color: "#22c55e" }}
                  >
                    FILE LOADED
                  </span>
                )}
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm font-bold font-mono">
                  <span style={{ color: "#facc15" }}>VOLUME</span>
                  <span style={{ color: "#e2e8f0" }}>{volume} / 200</span>
                </div>
                <input
                  data-ocid="transport.input"
                  type="range"
                  min="0"
                  max="200"
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
                    Clamped by correction system | Output to Bluetooth &amp;
                    Phone
                  </span>
                  <span>200</span>
                </div>
              </div>
            </div>

            {/* Real dB Meter */}
            <DbMeter />

            <CorrectionPanel
              stabilizer={stabilizer}
              onStabilizerChange={setStabilizer}
            />
            <SoundEngines />
            <Equalizer />
            <FreqNoisePanel />
            <SoundMagnet />
            <MackieMixer />
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
