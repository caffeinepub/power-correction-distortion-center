// AudioEngine singleton
export class AudioEngine {
  context: AudioContext | null = null;
  destination: AudioNode | null = null;
  private analyser: AnalyserNode | null = null;
  private masterGain: GainNode | null = null;
  private correctionGain: GainNode | null = null;
  private dbBoostGain: GainNode | null = null;
  private soundMagnetGain: GainNode | null = null;
  private clarityFilter: BiquadFilterNode | null = null;
  private ampGain: GainNode | null = null;
  private engineGains: GainNode[] = [];
  private eqFilters: BiquadFilterNode[] = [];
  private hz80DropFilter: BiquadFilterNode | null = null;

  // ─── ADVANCED LIMITER SYSTEM ─────────────────────────────────────────────
  private commanderNode: DynamicsCompressorNode | null = null;
  private gainPassesNode: DynamicsCompressorNode | null = null;
  private monitorNode: DynamicsCompressorNode | null = null;
  private limiterEase: DynamicsCompressorNode | null = null;
  private limiter: DynamicsCompressorNode | null = null;
  // ─────────────────────────────────────────────────────────────────────────

  private noiseGateNode: DynamicsCompressorNode | null = null;
  private oscillator: OscillatorNode | null = null;
  private oscGain: GainNode | null = null;
  private source: AudioBufferSourceNode | null = null;
  private audioBuffer: AudioBuffer | null = null;
  private isPlaying = false;
  private startedAt = 0;
  private pausedAt = 0;
  private engineActive = [true, true, true, true];

  // ─── POWER REGULATION ────────────────────────────────────────────────────
  static readonly POWER_WATTS = 10_000;
  static readonly POWER_CHANNELS = 4;
  static readonly HEADROOM_WATTS = 9_000;
  static readonly BASE_AMP_GAIN = 4.5;
  static readonly MAX_AMP_GAIN = 5.2;
  static readonly RAMP_S = 0.08;

  private ampPowered = false;
  private currentAmpTarget = 0;
  private _userPowerLevel = 1.0;
  private powerSensingTimer: ReturnType<typeof setInterval> | null = null;
  // ─────────────────────────────────────────────────────────────────────────

  // ─── SOUND MAGNET ──────────────────────────────────────────────────────────
  // Stereo mix magnet: gentle room-filling sound spread, max 1.7x (70%)
  static readonly MAGNET_MAX_GAIN = 1.7;
  private _magnetIntensity = 0.8; // 0.0–1.0, maps from 0-100 slider

  // Stereo mix widening nodes: ChannelSplitter + L/R gain + ChannelMerger
  // Pulls left and right channels apart as magnet level rises (max ±0.30)
  private stereoSplitter: ChannelSplitterNode | null = null;
  private stereoMerger: ChannelMergerNode | null = null;
  private stereoLeftGain: GainNode | null = null;
  private stereoRightGain: GainNode | null = null;

  // ─── ENVIRONMENTAL ROOM EXPANSION ──────────────────────────────────────
  private envDelayNode: DelayNode | null = null;
  private envFeedbackGain: GainNode | null = null;
  private envWetGain: GainNode | null = null;
  private _envRoomLevel = 0;
  // ─────────────────────────────────────────────────────────────────────────

  static readonly COMMANDER = 1_953_000_000;
  static readonly GAIN_PASSES = 1_000_000_000;
  static readonly MONITOR = 1_000_000_000;
  static readonly SMART_CHIP_MULTIPLIER = 10;

  static readonly EQ_BANDS = [
    60, 120, 250, 500, 1000, 2000, 4000, 8000, 12000, 16000,
  ];
  static readonly EQ_LABELS = [
    "SUB",
    "BASS",
    "LOW-MID",
    "MID",
    "MID-HI",
    "PRES",
    "UPPER",
    "BRILL",
    "AIR",
    "SUPER",
  ];

  private static readonly ENGINE_GAINS = [0.24, 0.26, 0.22, 0.28];

  private ensureContext() {
    if (this.context) return;
    this.context = new (
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext
    )();
    this.buildChain();
    (window as unknown as Record<string, unknown>).__audioEngine = this;
  }

  private buildChain() {
    const ctx = this.context!;
    this.analyser = ctx.createAnalyser();
    this.analyser.fftSize = 2048;

    this.masterGain = ctx.createGain();
    this.masterGain.gain.value = 0.5;

    this.correctionGain = ctx.createGain();
    this.correctionGain.gain.value = 1.0;

    this.dbBoostGain = ctx.createGain();
    this.dbBoostGain.gain.value = 1.0;

    this.soundMagnetGain = ctx.createGain();
    this.soundMagnetGain.gain.value = 1.0;

    this.clarityFilter = ctx.createBiquadFilter();
    this.clarityFilter.type = "highshelf";
    this.clarityFilter.frequency.value = 3000;
    this.clarityFilter.gain.value = 2;

    this.ampGain = ctx.createGain();
    this.ampGain.gain.value = 0;

    // ─── STEREO MIX MAGNET WIDENER ───────────────────────────────────────
    this.stereoSplitter = ctx.createChannelSplitter(2);
    this.stereoMerger = ctx.createChannelMerger(2);
    this.stereoLeftGain = ctx.createGain();
    this.stereoLeftGain.gain.value = 1.0;
    this.stereoRightGain = ctx.createGain();
    this.stereoRightGain.gain.value = 1.0;
    // ─────────────────────────────────────────────────────────────────────

    // ─── ENVIRONMENTAL ROOM EXPANSION NODES ──────────────────────────────
    // Parallel delay path after soundMagnetGain, merged before clarityFilter
    this.envDelayNode = ctx.createDelay(0.5);
    this.envDelayNode.delayTime.value = 0.02;
    this.envFeedbackGain = ctx.createGain();
    this.envFeedbackGain.gain.value = 0;
    this.envWetGain = ctx.createGain();
    this.envWetGain.gain.value = 0;
    // ─────────────────────────────────────────────────────────────────────

    this.engineGains = AudioEngine.ENGINE_GAINS.map((g) => {
      const node = ctx.createGain();
      node.gain.value = g;
      return node;
    });

    this.eqFilters = AudioEngine.EQ_BANDS.map((freq) => {
      const f = ctx.createBiquadFilter();
      f.type = "peaking";
      f.frequency.value = freq;
      f.Q.value = 1.4;
      f.gain.value = 0;
      return f;
    });

    this.hz80DropFilter = ctx.createBiquadFilter();
    this.hz80DropFilter.type = "peaking";
    this.hz80DropFilter.frequency.value = 80;
    this.hz80DropFilter.Q.value = 2.0;
    this.hz80DropFilter.gain.value = 0;

    this.noiseGateNode = ctx.createDynamicsCompressor();
    this.noiseGateNode.threshold.value = 0;
    this.noiseGateNode.knee.value = 0;
    this.noiseGateNode.ratio.value = 20;
    this.noiseGateNode.attack.value = 0.003;
    this.noiseGateNode.release.value = 0.25;

    this.commanderNode = ctx.createDynamicsCompressor();
    this.commanderNode.threshold.value = -3;
    this.commanderNode.knee.value = 10;
    this.commanderNode.ratio.value = 4;
    this.commanderNode.attack.value = 0.002;
    this.commanderNode.release.value = 0.15;

    this.gainPassesNode = ctx.createDynamicsCompressor();
    this.gainPassesNode.threshold.value = -6;
    this.gainPassesNode.knee.value = 12;
    this.gainPassesNode.ratio.value = 3;
    this.gainPassesNode.attack.value = 0.003;
    this.gainPassesNode.release.value = 0.2;

    this.monitorNode = ctx.createDynamicsCompressor();
    this.monitorNode.threshold.value = -9;
    this.monitorNode.knee.value = 15;
    this.monitorNode.ratio.value = 2;
    this.monitorNode.attack.value = 0.005;
    this.monitorNode.release.value = 0.25;

    this.limiterEase = ctx.createDynamicsCompressor();
    this.limiterEase.threshold.value = -3;
    this.limiterEase.knee.value = 8;
    this.limiterEase.ratio.value = 6;
    this.limiterEase.attack.value = 0.005;
    this.limiterEase.release.value = 0.1;

    this.limiter = ctx.createDynamicsCompressor();
    this.limiter.threshold.value = -1;
    this.limiter.knee.value = 0;
    this.limiter.ratio.value = 20;
    this.limiter.attack.value = 0.001;
    this.limiter.release.value = 0.05;

    this.oscGain = ctx.createGain();
    this.oscGain.gain.value = 0;

    const mixer = ctx.createGain();
    mixer.gain.value = 1.0;

    for (const eg of this.engineGains) {
      this.masterGain.connect(eg);
      eg.connect(mixer);
    }

    let prev: AudioNode = mixer;
    for (const f of this.eqFilters) {
      prev.connect(f);
      prev = f;
    }
    prev.connect(this.hz80DropFilter!);
    this.hz80DropFilter!.connect(this.correctionGain!);
    this.correctionGain!.connect(this.noiseGateNode!);

    // ─── Stereo mix magnet: noiseGate → splitter → L/R gains → merger → soundMagnetGain
    this.noiseGateNode!.connect(this.stereoSplitter!);
    this.stereoSplitter!.connect(this.stereoLeftGain!, 0);
    this.stereoSplitter!.connect(this.stereoRightGain!, 1);
    this.stereoLeftGain!.connect(this.stereoMerger!, 0, 0);
    this.stereoRightGain!.connect(this.stereoMerger!, 0, 1);
    this.stereoMerger!.connect(this.soundMagnetGain!);
    // ─────────────────────────────────────────────────────────────────────

    // ─── Environmental room expansion: parallel delay path ────────────────
    // soundMagnetGain → delay → feedback loop (delay → feedbackGain → delay)
    // soundMagnetGain → envWetGain → clarityFilter (parallel wet mix)
    this.soundMagnetGain!.connect(this.envDelayNode!);
    this.envDelayNode!.connect(this.envFeedbackGain!);
    this.envFeedbackGain!.connect(this.envDelayNode!); // feedback loop
    this.envDelayNode!.connect(this.envWetGain!);
    // ─────────────────────────────────────────────────────────────────────

    this.soundMagnetGain!.connect(this.clarityFilter!);
    this.envWetGain!.connect(this.clarityFilter!); // wet mix merges here
    this.clarityFilter!.connect(this.ampGain!);
    this.ampGain!.connect(this.dbBoostGain!);
    this.dbBoostGain!.connect(this.commanderNode!);
    this.commanderNode!.connect(this.gainPassesNode!);
    this.gainPassesNode!.connect(this.monitorNode!);
    this.monitorNode!.connect(this.limiterEase!);
    this.limiterEase!.connect(this.limiter!);
    this.limiter!.connect(this.analyser!);
    this.analyser!.connect(ctx.destination);
    this.oscGain!.connect(this.dbBoostGain!);

    this.destination = this.commanderNode;
  }

  // ─── POWER REGULATION ────────────────────────────────────────────────────

  setUserPowerLevel(level: number) {
    this.ensureContext();
    this._userPowerLevel = level / 100;
    if (!this.ampPowered) return;
    const min = AudioEngine.BASE_AMP_GAIN * 0.5;
    const max = AudioEngine.MAX_AMP_GAIN;
    const target = min + this._userPowerLevel * (max - min);
    this._rampAmpGain(Math.min(target, AudioEngine.MAX_AMP_GAIN));
  }

  setAmpPower(powered: boolean) {
    this.ensureContext();
    this.ampPowered = powered;
    if (!powered) {
      this._stopPowerSensing();
      this._rampAmpGain(0);
      return;
    }
    const min = AudioEngine.BASE_AMP_GAIN * 0.5;
    const max = AudioEngine.MAX_AMP_GAIN;
    const target = min + this._userPowerLevel * (max - min);
    this._rampAmpGain(Math.min(target, AudioEngine.MAX_AMP_GAIN));
    this._startPowerSensing();
  }

  private _rampAmpGain(target: number) {
    if (!this.ampGain || !this.context) return;
    const now = this.context.currentTime;
    this.currentAmpTarget = target;
    this.ampGain.gain.cancelScheduledValues(now);
    this.ampGain.gain.setValueAtTime(this.ampGain.gain.value, now);
    this.ampGain.gain.linearRampToValueAtTime(target, now + AudioEngine.RAMP_S);
  }

  private _startPowerSensing() {
    this._stopPowerSensing();
    this.powerSensingTimer = setInterval(() => {
      if (!this.ampPowered) return;
      const dbfs = this.getDBFS();
      const isSignalLow = dbfs > -100 && dbfs < -30;
      const min = AudioEngine.BASE_AMP_GAIN * 0.5;
      const max = AudioEngine.MAX_AMP_GAIN;
      const baseTarget = min + this._userPowerLevel * (max - min);
      let target: number;
      if (isSignalLow) {
        const headroomBoost = 0.9 * 0.7;
        target = Math.min(baseTarget + headroomBoost, AudioEngine.MAX_AMP_GAIN);
      } else {
        target = Math.min(baseTarget, AudioEngine.MAX_AMP_GAIN);
      }
      if (Math.abs(target - this.currentAmpTarget) > 0.01) {
        this._rampAmpGain(target);
      }
    }, 250);
  }

  private _stopPowerSensing() {
    if (this.powerSensingTimer !== null) {
      clearInterval(this.powerSensingTimer);
      this.powerSensingTimer = null;
    }
  }

  getPowerSpec() {
    return {
      totalWatts: AudioEngine.POWER_WATTS,
      channels: AudioEngine.POWER_CHANNELS,
      headroomWatts: AudioEngine.HEADROOM_WATTS,
      baseGain: AudioEngine.BASE_AMP_GAIN,
      maxGain: AudioEngine.MAX_AMP_GAIN,
    };
  }

  resetForNewFile() {
    if (this.isPlaying) {
      try {
        this.source?.stop();
      } catch (_) {}
    }
    try {
      this.source?.disconnect();
    } catch (_) {}
    this.source = null;
    this.audioBuffer = null;
    this.isPlaying = false;
    this.pausedAt = 0;
    this.startedAt = 0;
  }

  async loadFile(file: File): Promise<void> {
    this.ensureContext();
    this.resetForNewFile();
    const arrayBuffer = await file.arrayBuffer();
    this.audioBuffer = await this.context!.decodeAudioData(arrayBuffer);
    this.pausedAt = 0;
  }

  play() {
    if (!this.audioBuffer || !this.context || !this.masterGain) return;
    if (this.isPlaying) return;
    const source = this.context.createBufferSource();
    source.buffer = this.audioBuffer;
    source.connect(this.masterGain);
    const offset = this.pausedAt > 0 ? this.pausedAt : 0;
    source.start(0, offset);
    this.startedAt = this.context.currentTime - offset;
    this.isPlaying = true;
    this.source = source;
    source.onended = () => {
      this.isPlaying = false;
      this.pausedAt = 0;
    };
  }

  pause() {
    if (!this.isPlaying || !this.context) return;
    this.pausedAt = this.context.currentTime - this.startedAt;
    try {
      this.source?.stop();
    } catch (_) {}
    this.isPlaying = false;
  }

  getIsPlaying() {
    return this.isPlaying;
  }

  setVolume(value: number) {
    this.ensureContext();
    if (!this.masterGain) return;
    if (value === 0) {
      this.masterGain.gain.value = 0;
      return;
    }
    const normalized = value / 100;
    this.masterGain.gain.value = normalized ** 1.7 * 1.5;
  }

  setEQBand(index: number, gainDb: number) {
    this.ensureContext();
    const f = this.eqFilters[index];
    if (f) f.gain.value = gainDb;
  }

  set80HzDrop(value: number) {
    this.ensureContext();
    if (this.hz80DropFilter)
      this.hz80DropFilter.gain.value = -(value / 100) * 12;
  }

  setRockBassDrop(on: boolean) {
    this.ensureContext();
    if (!this.hz80DropFilter) return;
    if (on) {
      this.hz80DropFilter.frequency.value = 80;
      this.hz80DropFilter.Q.value = 2.5;
      this.hz80DropFilter.gain.value = 10;
    } else {
      this.hz80DropFilter.frequency.value = 80;
      this.hz80DropFilter.Q.value = 2.0;
      this.hz80DropFilter.gain.value = 0;
    }
  }

  setLoudnessSafetyExtreme(on: boolean) {
    this.ensureContext();
    if (!this.context) return;
    const now = this.context.currentTime;
    const ramp = 0.15;
    if (on) {
      if (this.ampGain) {
        this.ampGain.gain.cancelScheduledValues(now);
        this.ampGain.gain.setValueAtTime(this.ampGain.gain.value, now);
        this.ampGain.gain.linearRampToValueAtTime(
          AudioEngine.MAX_AMP_GAIN,
          now + ramp,
        );
      }
      if (this.limiterEase) this.limiterEase.threshold.value = -2;
      if (this.limiter) this.limiter.threshold.value = -0.5;
      if (this.clarityFilter) this.clarityFilter.gain.value = 4;
      if (this.commanderNode) {
        this.commanderNode.threshold.value = -2;
        this.commanderNode.ratio.value = 5;
      }
    } else {
      if (this.ampGain) {
        this.ampGain.gain.cancelScheduledValues(now);
        this.ampGain.gain.setValueAtTime(this.ampGain.gain.value, now);
        this.ampGain.gain.linearRampToValueAtTime(
          this.currentAmpTarget,
          now + ramp,
        );
      }
      if (this.limiterEase) this.limiterEase.threshold.value = -3;
      if (this.limiter) this.limiter.threshold.value = -1;
      if (this.clarityFilter) this.clarityFilter.gain.value = 2;
      if (this.commanderNode) {
        this.commanderNode.threshold.value = -3;
        this.commanderNode.ratio.value = 4;
      }
    }
  }

  // ─── SOUND MAGNET ──────────────────────────────────────────────────────────

  setSoundMagnetGain(value: number) {
    this.ensureContext();
    if (this.soundMagnetGain) this.soundMagnetGain.gain.value = value;
  }

  setSoundMagnetIntensity(level: number) {
    this.ensureContext();
    if (!this.context || !this.soundMagnetGain) return;
    this._magnetIntensity = level / 100;
    const now = this.context.currentTime;
    const targetGain =
      1.0 + this._magnetIntensity * (AudioEngine.MAGNET_MAX_GAIN - 1.0);
    this.soundMagnetGain.gain.cancelScheduledValues(now);
    this.soundMagnetGain.gain.setValueAtTime(
      this.soundMagnetGain.gain.value,
      now,
    );
    this.soundMagnetGain.gain.linearRampToValueAtTime(targetGain, now + 0.05);
  }

  /**
   * Stereo mix magnet width — pulls L/R channels apart.
   * level: 0.0 (no effect) → 1.0 (full stereo mix spread, max ±0.30 gain diff).
   */
  setStereoMagnetWidth(level: number) {
    this.ensureContext();
    if (!this.stereoLeftGain || !this.stereoRightGain) return;
    const width = Math.max(0, Math.min(1, level)) * 0.3;
    this.stereoLeftGain.gain.value = 1.0 + width;
    this.stereoRightGain.gain.value = 1.0 - width;
  }

  /**
   * Environmental Room Level — applies subtle delay-based room expansion.
   * level: 0-1. Higher = bigger room simulation (longer delay, more feedback, wetter mix).
   * Works in parallel with the main signal — clean signal is never chopped.
   */
  setEnvironmentalRoomLevel(level: number) {
    this.ensureContext();
    const l = Math.max(0, Math.min(1, level));
    this._envRoomLevel = l;

    if (this.envDelayNode) {
      // Delay time: 0.02s (small room) → 0.08s (large room)
      this.envDelayNode.delayTime.value = 0.02 + l * 0.06;
    }
    if (this.envFeedbackGain) {
      // Feedback: 0 (none) → 0.25 (subtle reverb tail)
      this.envFeedbackGain.gain.value = l * 0.25;
    }
    if (this.envWetGain) {
      // Wet mix: 0 (silent) → 0.3 (30% environmental blend)
      this.envWetGain.gain.value = l * 0.3;
    }

    // Also widen stereo further based on room level
    const extraWidth = l * 0.2;
    if (this.stereoLeftGain && this.stereoRightGain) {
      const currentWidth = this.stereoLeftGain.gain.value - 1.0;
      const combined = Math.min(0.3, currentWidth + extraWidth);
      this.stereoLeftGain.gain.value = 1.0 + combined;
      this.stereoRightGain.gain.value = 1.0 - combined;
    }
  }

  getEnvironmentalRoomLevel() {
    return this._envRoomLevel;
  }

  getMagnetIntensity() {
    return this._magnetIntensity;
  }

  // ─────────────────────────────────────────────────────────────────────────

  setDBBoost(value: number) {
    this.ensureContext();
    if (this.dbBoostGain)
      this.dbBoostGain.gain.value = 1.0 + (value / 100) * 4.0;
  }

  toggleStabilizer(on: boolean) {
    this.ensureContext();
    if (this.correctionGain) this.correctionGain.gain.value = on ? 1.3 : 1.0;
  }

  toggleNoiseGate(on: boolean) {
    this.ensureContext();
    if (this.noiseGateNode) this.noiseGateNode.threshold.value = on ? -50 : 0;
  }

  // No-op: Frequency generator removed from UI
  // Kept for compatibility in case any code still calls it
  setFreqGen(_hz: number, _level: number, _active: boolean) {
    // intentional no-op
  }

  getDBFS(): number {
    if (!this.analyser) return -100;
    const buf = new Float32Array(this.analyser.fftSize);
    this.analyser.getFloatTimeDomainData(buf);
    let sum = 0;
    for (let i = 0; i < buf.length; i++) sum += buf[i] * buf[i];
    const rms = Math.sqrt(sum / buf.length);
    if (rms === 0) return -100;
    return 20 * Math.log10(rms);
  }

  getFrequencySpectrum(): Float32Array {
    if (!this.analyser) return new Float32Array(0);
    const buf = new Float32Array(this.analyser.frequencyBinCount);
    this.analyser.getFloatFrequencyData(buf);
    return buf;
  }

  getSignalPower(): number {
    const dbfs = this.getDBFS();
    // Map -60..0 dBFS to 0..1
    return Math.max(0, Math.min(1, (dbfs + 60) / 60));
  }

  getLowFreqPower(): number {
    if (!this.analyser) return 0;
    const ctx = this.context;
    if (!ctx) return 0;
    const buf = new Float32Array(this.analyser.frequencyBinCount);
    this.analyser.getFloatFrequencyData(buf);
    const sampleRate = ctx.sampleRate;
    const binHz = sampleRate / this.analyser.fftSize;
    const lowBin = Math.round(20 / binHz);
    const highBin = Math.round(200 / binHz);
    let sum = 0;
    let count = 0;
    for (let i = lowBin; i <= Math.min(highBin, buf.length - 1); i++) {
      // buf values are dBFS (-Infinity..0), clamp to -80..0
      const v = Math.max(-80, buf[i]);
      sum += (v + 80) / 80;
      count++;
    }
    return count > 0 ? Math.min(1, sum / count) : 0;
  }

  getMidHighPower(): number {
    if (!this.analyser) return 0;
    const ctx = this.context;
    if (!ctx) return 0;
    const buf = new Float32Array(this.analyser.frequencyBinCount);
    this.analyser.getFloatFrequencyData(buf);
    const sampleRate = ctx.sampleRate;
    const binHz = sampleRate / this.analyser.fftSize;
    const lowBin = Math.round(1000 / binHz);
    const highBin = Math.round(16000 / binHz);
    let sum = 0;
    let count = 0;
    for (let i = lowBin; i <= Math.min(highBin, buf.length - 1); i++) {
      const v = Math.max(-80, buf[i]);
      sum += (v + 80) / 80;
      count++;
    }
    return count > 0 ? Math.min(1, sum / count) : 0;
  }

  setSoundMagnetGainLegacy(value: number) {
    this.setSoundMagnetGain(value);
  }

  setEngineActive(index: number, active: boolean) {
    this.ensureContext();
    this.engineActive[index] = active;
    const eg = this.engineGains[index];
    if (eg) eg.gain.value = active ? AudioEngine.ENGINE_GAINS[index] : 0;
  }
}

export const audioEngine = new AudioEngine();
