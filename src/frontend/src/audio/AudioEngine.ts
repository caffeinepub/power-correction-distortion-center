// AudioEngine singleton — all Web Audio API logic lives here
export class AudioEngine {
  private ctx: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private masterGain: GainNode | null = null;
  private correctionGain: GainNode | null = null;
  private dbBoostGain: GainNode | null = null;
  private soundMagnetGain: GainNode | null = null;
  private engineGains: GainNode[] = [];
  private eqFilters: BiquadFilterNode[] = [];
  private limiter: DynamicsCompressorNode | null = null;
  private noiseGateNode: DynamicsCompressorNode | null = null;
  private oscillator: OscillatorNode | null = null;
  private oscGain: GainNode | null = null;
  private source: AudioBufferSourceNode | null = null;
  private audioBuffer: AudioBuffer | null = null;
  private isPlaying = false;
  private startedAt = 0;
  private pausedAt = 0;
  private engineActive = [true, true, true, true];

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

  private static readonly ENGINE_GAINS = [1.2, 1.3, 1.1, 1.4];

  private ensureContext() {
    if (this.ctx) return;
    this.ctx = new (
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext
    )();
    this.buildChain();
  }

  private buildChain() {
    const ctx = this.ctx!;
    this.analyser = ctx.createAnalyser();
    this.analyser.fftSize = 2048;

    this.masterGain = ctx.createGain();
    this.masterGain.gain.value = 1.0;
    this.correctionGain = ctx.createGain();
    this.correctionGain.gain.value = 1.0;
    this.dbBoostGain = ctx.createGain();
    this.dbBoostGain.gain.value = 1.0;
    this.soundMagnetGain = ctx.createGain();
    this.soundMagnetGain.gain.value = 1.0;

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

    this.noiseGateNode = ctx.createDynamicsCompressor();
    this.noiseGateNode.threshold.value = -100;
    this.noiseGateNode.knee.value = 0;
    this.noiseGateNode.ratio.value = 20;
    this.noiseGateNode.attack.value = 0.003;
    this.noiseGateNode.release.value = 0.25;

    this.limiter = ctx.createDynamicsCompressor();
    this.limiter.threshold.value = -1;
    this.limiter.knee.value = 0;
    this.limiter.ratio.value = 20;
    this.limiter.attack.value = 0.001;
    this.limiter.release.value = 0.05;

    this.oscGain = ctx.createGain();
    this.oscGain.gain.value = 0;

    const mixer = ctx.createGain();
    mixer.gain.value = 0.25;

    for (const eg of this.engineGains) {
      this.masterGain.connect(eg);
      eg.connect(mixer);
    }

    let prev: AudioNode = mixer;
    for (const f of this.eqFilters) {
      prev.connect(f);
      prev = f;
    }

    prev.connect(this.dbBoostGain);
    this.dbBoostGain.connect(this.correctionGain);
    this.correctionGain.connect(this.noiseGateNode);
    this.noiseGateNode.connect(this.soundMagnetGain);
    this.soundMagnetGain.connect(this.limiter);
    this.limiter.connect(this.analyser);
    this.analyser.connect(ctx.destination);
    this.oscGain.connect(this.limiter);
  }

  async loadFile(file: File): Promise<void> {
    this.ensureContext();
    const arrayBuffer = await file.arrayBuffer();
    this.audioBuffer = await this.ctx!.decodeAudioData(arrayBuffer);
    this.pausedAt = 0;
  }

  play() {
    if (!this.audioBuffer || !this.ctx || !this.masterGain) return;
    if (this.isPlaying) return;
    this.source = this.ctx.createBufferSource();
    this.source.buffer = this.audioBuffer;
    this.source.connect(this.masterGain);
    this.source.start(0, this.pausedAt);
    this.startedAt = this.ctx.currentTime - this.pausedAt;
    this.isPlaying = true;
    this.source.onended = () => {
      this.isPlaying = false;
      this.pausedAt = 0;
    };
  }

  pause() {
    if (!this.isPlaying || !this.ctx) return;
    this.pausedAt = this.ctx.currentTime - this.startedAt;
    this.source?.stop();
    this.isPlaying = false;
  }

  getIsPlaying() {
    return this.isPlaying;
  }

  setVolume(value: number) {
    this.ensureContext();
    if (this.masterGain) this.masterGain.gain.value = value / 100;
  }

  setEQBand(index: number, gainDb: number) {
    this.ensureContext();
    const f = this.eqFilters[index];
    if (f) f.gain.value = gainDb;
  }

  setDBBoost(value: number) {
    this.ensureContext();
    if (this.dbBoostGain)
      this.dbBoostGain.gain.value = 1.0 + (value / 100) * 2.0;
  }

  toggleStabilizer(on: boolean) {
    this.ensureContext();
    if (this.correctionGain) this.correctionGain.gain.value = on ? 1.4 : 1.0;
  }

  toggleNoiseGate(on: boolean) {
    this.ensureContext();
    if (this.noiseGateNode)
      this.noiseGateNode.threshold.value = on ? -50 : -100;
  }

  setFreqGen(hz: number, level: number, active: boolean) {
    this.ensureContext();
    if (!active) {
      if (this.oscillator) {
        try {
          this.oscillator.stop();
        } catch (_) {}
        this.oscillator = null;
      }
      if (this.oscGain) this.oscGain.gain.value = 0;
      return;
    }
    if (!this.oscillator) {
      this.oscillator = this.ctx!.createOscillator();
      this.oscillator.type = "sine";
      this.oscillator.frequency.value = hz;
      this.oscillator.connect(this.oscGain!);
      this.oscillator.start();
    } else {
      this.oscillator.frequency.value = hz;
    }
    if (this.oscGain) this.oscGain.gain.value = level / 100;
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

  setSoundMagnetGain(value: number) {
    this.ensureContext();
    if (this.soundMagnetGain) this.soundMagnetGain.gain.value = value;
  }

  setEngineActive(index: number, active: boolean) {
    this.ensureContext();
    this.engineActive[index] = active;
    const eg = this.engineGains[index];
    if (eg) eg.gain.value = active ? AudioEngine.ENGINE_GAINS[index] : 0;
  }
}

export const audioEngine = new AudioEngine();
