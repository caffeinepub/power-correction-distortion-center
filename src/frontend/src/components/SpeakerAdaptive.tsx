import { useEffect, useRef, useState } from "react";

const PRESETS_KEY = "pcdc_speaker_presets";

interface SpeakerPreset {
  deviceLabel: string;
  deviceId: string;
  savedAt: string;
  settings: Record<string, unknown>;
}

interface SpeakerAdaptiveProps {
  currentSettings: Record<string, unknown>;
  onLoadPreset: (settings: Record<string, unknown>) => void;
}

function loadPresets(): SpeakerPreset[] {
  try {
    const raw = localStorage.getItem(PRESETS_KEY);
    if (raw) return JSON.parse(raw) as SpeakerPreset[];
  } catch (_) {}
  return [];
}

function savePresets(presets: SpeakerPreset[]) {
  try {
    localStorage.setItem(PRESETS_KEY, JSON.stringify(presets));
  } catch (_) {}
}

export function SpeakerAdaptive({
  currentSettings,
  onLoadPreset,
}: SpeakerAdaptiveProps) {
  const [deviceLabel, setDeviceLabel] = useState("DEFAULT OUTPUT");
  const [deviceId, setDeviceId] = useState("");
  const [presets, setPresets] = useState<SpeakerPreset[]>(loadPresets);
  const [autoLoadedPreset, setAutoLoadedPreset] = useState<string | null>(null);
  const autoLoadedRef = useRef<Set<string>>(new Set());

  // Detect audio output device
  useEffect(() => {
    async function detectDevice() {
      try {
        if (!navigator.mediaDevices?.enumerateDevices) return;
        const devices = await navigator.mediaDevices.enumerateDevices();
        const audioOutputs = devices.filter((d) => d.kind === "audiooutput");
        if (audioOutputs.length > 0) {
          const device = audioOutputs[0];
          const label = device.label || "DEFAULT OUTPUT";
          setDeviceLabel(label);
          setDeviceId(device.deviceId);
        }
      } catch (_) {
        setDeviceLabel("DEFAULT OUTPUT");
      }
    }
    detectDevice();

    // Re-detect when devices change
    navigator.mediaDevices?.addEventListener?.("devicechange", detectDevice);
    return () => {
      navigator.mediaDevices?.removeEventListener?.(
        "devicechange",
        detectDevice,
      );
    };
  }, []);

  // Auto-load preset when device is detected
  useEffect(() => {
    if (!deviceId || autoLoadedRef.current.has(deviceId)) return;
    const match = presets.find((p) => p.deviceId === deviceId);
    if (match) {
      autoLoadedRef.current.add(deviceId);
      onLoadPreset(match.settings);
      setAutoLoadedPreset(match.deviceLabel);
      setTimeout(() => setAutoLoadedPreset(null), 4000);
    }
  }, [deviceId, presets, onLoadPreset]);

  function handleSavePreset() {
    const now = new Date().toISOString();
    const existing = presets.filter((p) => p.deviceId !== deviceId);
    const newPreset: SpeakerPreset = {
      deviceLabel,
      deviceId,
      savedAt: now,
      settings: { ...currentSettings },
    };
    const updated = [...existing, newPreset];
    setPresets(updated);
    savePresets(updated);
  }

  function handleLoadPreset(preset: SpeakerPreset) {
    onLoadPreset(preset.settings);
    setAutoLoadedPreset(preset.deviceLabel);
    setTimeout(() => setAutoLoadedPreset(null), 3000);
  }

  function handleDeletePreset(deviceId: string) {
    const updated = presets.filter((p) => p.deviceId !== deviceId);
    setPresets(updated);
    savePresets(updated);
  }

  return (
    <div
      data-ocid="speaker.panel"
      className="rounded-lg p-5 space-y-4"
      style={{ background: "#0a0f1e", border: "2px solid #1e40af" }}
    >
      <h3
        className="text-sm font-bold tracking-widest"
        style={{
          color: "#3b82f6",
          fontFamily: "'Bricolage Grotesque', sans-serif",
        }}
      >
        SPEAKER-ADAPTIVE SYSTEM
      </h3>

      {/* Current device */}
      <div
        className="rounded p-3 flex items-center gap-3"
        style={{ background: "#060c1a", border: "1px solid #1e3a6e" }}
      >
        <div
          className="w-3 h-3 rounded-full flex-shrink-0"
          style={{
            background: autoLoadedPreset ? "#ef4444" : "#3b82f6",
            boxShadow: autoLoadedPreset
              ? "0 0 8px rgba(239,68,68,0.8)"
              : "0 0 6px rgba(59,130,246,0.5)",
          }}
        />
        <div className="flex-1">
          <div
            className="text-xs font-bold tracking-widest"
            style={{ color: "#60a5fa" }}
          >
            SPEAKER: {deviceLabel.toUpperCase()}
          </div>
          <div
            className="text-xs font-mono mt-0.5"
            style={{ color: "#334155" }}
          >
            {deviceId ? `ID: ${deviceId.slice(0, 20)}...` : "NO DEVICE ID"}
          </div>
        </div>
      </div>

      {/* Auto-loaded preset notification */}
      {autoLoadedPreset && (
        <div
          data-ocid="speaker.success_state"
          className="rounded p-2 text-center font-mono text-xs font-bold tracking-wider"
          style={{
            background: "rgba(59,130,246,0.1)",
            border: "1px solid #3b82f6",
            color: "#60a5fa",
            boxShadow: "0 0 12px rgba(59,130,246,0.3)",
          }}
        >
          PRESET LOADED: {autoLoadedPreset.toUpperCase()}
        </div>
      )}

      {/* Save button */}
      <button
        type="button"
        data-ocid="speaker.save_button"
        onClick={handleSavePreset}
        className="w-full py-2 rounded font-mono font-bold text-xs tracking-widest"
        style={{
          background: "#1e3a6e",
          color: "#93c5fd",
          border: "1px solid #3b82f6",
          cursor: "pointer",
          letterSpacing: "0.15em",
        }}
      >
        SAVE PRESET FOR THIS SPEAKER
      </button>

      {/* Saved presets */}
      {presets.length > 0 && (
        <div className="space-y-2">
          <div
            className="text-xs font-bold tracking-widest"
            style={{ color: "#1e40af" }}
          >
            SAVED PRESETS
          </div>
          {presets.map((preset, i) => (
            <div
              key={preset.deviceId}
              data-ocid={`speaker.item.${i + 1}`}
              className="rounded p-3 flex items-center justify-between gap-3"
              style={{
                background: "#060c1a",
                border: `1px solid ${preset.deviceId === deviceId ? "#3b82f6" : "#1e3a6e"}`,
              }}
            >
              <div className="flex-1 min-w-0">
                <div
                  className="text-xs font-bold font-mono truncate"
                  style={{ color: "#60a5fa" }}
                >
                  {preset.deviceLabel.toUpperCase()}
                </div>
                <div
                  className="text-xs font-mono mt-0.5"
                  style={{ color: "#334155" }}
                >
                  {new Date(preset.savedAt).toLocaleDateString()}
                </div>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <button
                  type="button"
                  data-ocid={`speaker.secondary_button.${i + 1}`}
                  onClick={() => handleLoadPreset(preset)}
                  className="text-xs font-mono font-bold px-2 py-1 rounded"
                  style={{
                    background: "#1e3a6e",
                    color: "#93c5fd",
                    border: "1px solid #3b82f6",
                    cursor: "pointer",
                  }}
                >
                  LOAD
                </button>
                <button
                  type="button"
                  data-ocid={`speaker.delete_button.${i + 1}`}
                  onClick={() => handleDeletePreset(preset.deviceId)}
                  className="text-xs font-mono font-bold px-2 py-1 rounded"
                  style={{
                    background: "#3f0a0a",
                    color: "#f87171",
                    border: "1px solid #ef4444",
                    cursor: "pointer",
                  }}
                >
                  DEL
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {presets.length === 0 && (
        <div
          data-ocid="speaker.empty_state"
          className="text-center py-4 text-xs font-mono"
          style={{ color: "#1e3a6e" }}
        >
          NO PRESETS SAVED YET. SAVE ONE FOR INSTANT RECALL.
        </div>
      )}
    </div>
  );
}
