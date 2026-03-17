// AudioEngine singleton
export class AudioEngine {
  context: AudioContext | null = null;
  destination: AudioNode | null = null;
  private analyser: AnalyserNode | null = null;

  // ─── GAIN STAGES ─────────────────────────────────────────────────────────
  private masterGain: GainNode | null = null; // volume (user 0–1.0, clean)
  private sourceInput: GainNode | null = null; // source entry point (BEFORE engines)
  private correctionGain: GainNode | null = null;
  private ampGain: GainNode | null = null;
  private dbBoostGain: GainNode | null = null;
  private outputGain: GainNode | null = null;
  private soundMagnetGain: GainNode | null = null;
  private clarityFilter: BiquadFilterNode | null = null;
  private engineGains: GainNode[] = [];
  private eqFilters: BiquadFilterNode[] = [];
  private hz80DropFilter: BiquadFilterNode | null = null;
  private _hz80DropValue = 0;
  private warmBassFilter: BiquadFilterNode | null = null;
  private warmHighFilter: BiquadFilterNode | null = null;
  private warmComp: DynamicsCompressorNode | null = null;
  // ─────────────────────────────────────────────────────────────────────────

  // ─── LIMITER CHAIN ───────────────────────────────────────────────────────
  private commanderNode: DynamicsCompressorNode | null = null;
  private gainPassesNode: DynamicsCompressorNode | null = null;
  private monitorNode: DynamicsCompressorNode | null = null;
  private stabilizerNode: DynamicsCompressorNode | null = null;
  private signalCleanerNode: DynamicsCompressorNode | null = null;
  private limiterEase: DynamicsCompressorNode | null = null;
  private limiter: DynamicsCompressorNode | null = null;
  // ─────────────────────────────────────────────────────────────────────────

  private noiseGateNode: DynamicsCompressorNode | null = null;
  private oscGain: GainNode | null = null;

  // ─── BULLHORN MODE ───────────────────────────────────────────────────────
  // Bullhorn filters sit between ampGain and commanderNode so the FULL
  // correction center (commander → gainPasses → monitor → stabilizer →
  // signalCleaner → limiterEase → brickWall) processes the shaped signal.
  bullhornActive = false;
  private bullhornLowShelf: BiquadFilterNode | null = null;
  private bullhornMidBoost: BiquadFilterNode | null = null;
  private bullhornHarshCut: BiquadFilterNode | null = null;
  private bullhornHighShelf: BiquadFilterNode | null = null;
  private bullhornPresence: BiquadFilterNode | null = null;
  private bullhornDelayNode: DelayNode | null = null;
  private bullhornFeedbackGain: GainNode | null = null;
  private bullhornWetGain: GainNode | null = null;
  // ─────────────────────────────────────────────────────────────────────────

  // ─── SMALL SPEAKER MODE ──────────────────────────────────────────────────
  private ssPresence1: BiquadFilterNode | null = null; // 2kHz +4dB
  private ssPresence2: BiquadFilterNode | null = null; // 5kHz +4dB
  private ssUpperMid: BiquadFilterNode | null = null; // 1kHz +3dB
  private ssFletcher: BiquadFilterNode | null = null; // 3.5kHz +3dB
  private ssWaveShaper: WaveShaperNode | null = null; // harmonic exciter
  private ssOutputBoost: GainNode | null = null; // output push 1.0 / 1.8
  private _smallSpeakerOn = false;
  // ─────────────────────────────────────────────────────────────────────────

  // ─── CLEAN BASS FILTERS ──────────────────────────────────────────────────
  private bassShelf120: BiquadFilterNode | null = null; // 120Hz +2dB shelf
  private bassCut250: BiquadFilterNode | null = null; // 250Hz -2dB cut
  private subBassShelf: BiquadFilterNode | null = null; // 40Hz -6dB shelf
  // ─────────────────────────────────────────────────────────────────────────

  private source: AudioBufferSourceNode | null = null;
  private audioBuffer: AudioBuffer | null = null;
  private isPlaying = false;
  private startedAt = 0;
  private pausedAt = 0;
  private engineActive = [true, true, true, true];
  private _smoothWarmOn = false;

  // ─── POWER ───────────────────────────────────────────────────────────────
  static readonly POWER_WATTS = 10_000;
  static readonly POWER_CHANNELS = 4;
  static readonly HEADROOM_WATTS = 9_000;
  static readonly BASE_AMP_GAIN = 2.0;
  static readonly SAFT_GAIN = 3.5;
  static readonly MAX_AMP_GAIN = 4.0;
  static readonly RAMP_S = 0.08;

  private ampPowered = false;
  private currentAmpTarget = 0;
  private _userPowerLevel = 1.0;
  private powerSensingTimer: ReturnType<typeof setInterval> | null = null;
  // ─────────────────────────────────────────────────────────────────────────

  // ─── SOUND MAGNET ────────────────────────────────────────────────────────
  static readonly MAGNET_MAX_GAIN = 1.7;
  private _magnetIntensity = 0.8;

  private stereoSplitter: ChannelSplitterNode | null = null;
  private stereoMerger: ChannelMergerNode | null = null;
  private stereoLeftGain: GainNode | null = null;
  private stereoRightGain: GainNode | null = null;

  private envDelayNode: DelayNode | null = null;
  private envFeedbackGain: GainNode | null = null;
  private envWetGain: GainNode | null = null;
  private _envRoomLevel = 0;
  // ─────────────────────────────────────────────────────────────────────────

  // Correction constants
  static readonly COMMANDER = 9_000_000_000;
  static readonly GAIN_PASSES = 90_000_000;
  static readonly CORRECTION_FORCE = 1.3122e45;
  static readonly MONITOR = 9_000_000_000;
  static readonly STABILIZER_VAL = 90_000_000;
  static readonly SIGNAL_CLEANER_VAL = 2_000_000_000;
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

  private static readonly ENGINE_GAINS = [0.26, 0.26, 0.24, 0.24];

  // ─────────────────────────────────────────────────────────────────────────
  bindNodes(
    ctx: AudioContext,
    nodes: {
      sourceInput: GainNode;
      masterGain: GainNode;
      engineGains: GainNode[];
      eqFilters: BiquadFilterNode[];
      hz80Filter: BiquadFilterNode;
      correctionGain: GainNode;
      noiseGate: DynamicsCompressorNode;
      stereoLeft: GainNode;
      stereoRight: GainNode;
      soundMagnetGain: GainNode;
      envDelay: DelayNode;
      envFeedback: GainNode;
      envWet: GainNode;
      ampGain: GainNode;
      commander: DynamicsCompressorNode;
      gainPasses: DynamicsCompressorNode;
      monitor: DynamicsCompressorNode;
      stabilizerNode: DynamicsCompressorNode;
      signalCleaner: DynamicsCompressorNode;
      limEase: DynamicsCompressorNode;
      brickWall: DynamicsCompressorNode;
      dbBoostGain: GainNode;
      outputGain: GainNode;
      analyser: AnalyserNode;
    },
  ) {
    this.context = ctx;
    this.sourceInput = nodes.sourceInput;
    this.masterGain = nodes.masterGain;
    this.engineGains = nodes.engineGains;
    this.eqFilters = nodes.eqFilters;
    this.hz80DropFilter = nodes.hz80Filter;
    this.correctionGain = nodes.correctionGain;
    this.noiseGateNode = nodes.noiseGate;
    this.stereoLeftGain = nodes.stereoLeft;
    this.stereoRightGain = nodes.stereoRight;
    this.soundMagnetGain = nodes.soundMagnetGain;
    this.envDelayNode = nodes.envDelay;
    this.envFeedbackGain = nodes.envFeedback;
    this.envWetGain = nodes.envWet;
    this.ampGain = nodes.ampGain;
    this.commanderNode = nodes.commander;
    this.gainPassesNode = nodes.gainPasses;
    this.monitorNode = nodes.monitor;
    this.stabilizerNode = nodes.stabilizerNode;
    this.signalCleanerNode = nodes.signalCleaner;
    this.limiterEase = nodes.limEase;
    this.limiter = nodes.brickWall;
    this.dbBoostGain = nodes.dbBoostGain;
    this.outputGain = nodes.outputGain;
    this.analyser = nodes.analyser;
    this.destination = nodes.sourceInput;
    this.ampPowered = nodes.ampGain.gain.value > 0;
    this.currentAmpTarget = nodes.ampGain.gain.value;
    this._stopPowerSensing();
    if (this.ampPowered) this._startPowerSensing();
  }

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

    this.sourceInput = ctx.createGain();
    this.sourceInput.gain.value = 1.0;

    this.masterGain = ctx.createGain();
    this.masterGain.gain.value = 1.0;
    this.correctionGain = ctx.createGain();
    this.correctionGain.gain.value = 1.0;
    this.dbBoostGain = ctx.createGain();
    this.dbBoostGain.gain.value = 1.0;
    this.soundMagnetGain = ctx.createGain();
    this.soundMagnetGain.gain.value = 1.0;
    this.clarityFilter = ctx.createBiquadFilter();
    this.clarityFilter.type = "highshelf";
    this.clarityFilter.frequency.value = 3000;
    this.clarityFilter.gain.value = 3;
    this.ampGain = ctx.createGain();
    this.ampGain.gain.value = 0;
    this.outputGain = ctx.createGain();
    this.outputGain.gain.value = 2.0;

    // ── BULLHORN NODES (warm PA projection)
    // Initialized here; dynamically inserted between ampGain and commanderNode
    // via setBullhorn() so the FULL correction center processes the shaped signal.
    this.bullhornLowShelf = ctx.createBiquadFilter();
    this.bullhornLowShelf.type = "lowshelf";
    this.bullhornLowShelf.frequency.value = 200;
    this.bullhornLowShelf.gain.value = 4;
    this.bullhornMidBoost = ctx.createBiquadFilter();
    this.bullhornMidBoost.type = "peaking";
    this.bullhornMidBoost.frequency.value = 350;
    this.bullhornMidBoost.Q.value = 1.0;
    this.bullhornMidBoost.gain.value = 3;
    this.bullhornHarshCut = ctx.createBiquadFilter();
    this.bullhornHarshCut.type = "peaking";
    this.bullhornHarshCut.frequency.value = 4000;
    this.bullhornHarshCut.Q.value = 1.0;
    this.bullhornHarshCut.gain.value = -3;
    this.bullhornHighShelf = ctx.createBiquadFilter();
    this.bullhornHighShelf.type = "highshelf";
    this.bullhornHighShelf.frequency.value = 6000;
    this.bullhornHighShelf.gain.value = -2;
    this.bullhornPresence = ctx.createBiquadFilter();
    this.bullhornPresence.type = "bandpass";
    this.bullhornPresence.frequency.value = 1500;
    this.bullhornPresence.Q.value = 0.8;
    this.bullhornDelayNode = ctx.createDelay(0.1);
    this.bullhornDelayNode.delayTime.value = 0.02;
    this.bullhornFeedbackGain = ctx.createGain();
    this.bullhornFeedbackGain.gain.value = 0.15;
    this.bullhornWetGain = ctx.createGain();
    this.bullhornWetGain.gain.value = 0.35;

    this.stereoSplitter = ctx.createChannelSplitter(2);
    this.stereoMerger = ctx.createChannelMerger(2);
    this.stereoLeftGain = ctx.createGain();
    this.stereoLeftGain.gain.value = 1.0;
    this.stereoRightGain = ctx.createGain();
    this.stereoRightGain.gain.value = 1.0;
    this.envDelayNode = ctx.createDelay(0.5);
    this.envDelayNode.delayTime.value = 0.02;
    this.envFeedbackGain = ctx.createGain();
    this.envFeedbackGain.gain.value = 0;
    this.envWetGain = ctx.createGain();
    this.envWetGain.gain.value = 0;
    this.engineGains = AudioEngine.ENGINE_GAINS.map((g) => {
      const n = ctx.createGain();
      n.gain.value = g;
      return n;
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
    this.hz80DropFilter.Q.value = 0.8;
    this.hz80DropFilter.gain.value = 0;
    this.noiseGateNode = ctx.createDynamicsCompressor();
    this.noiseGateNode.threshold.value = 0;
    this.noiseGateNode.knee.value = 0;
    this.noiseGateNode.ratio.value = 1;
    this.noiseGateNode.attack.value = 0.003;
    this.noiseGateNode.release.value = 0.25;

    // Commander — fast, targets distortion
    this.commanderNode = ctx.createDynamicsCompressor();
    this.commanderNode.threshold.value = -6;
    this.commanderNode.knee.value = 0;
    this.commanderNode.ratio.value = 20;
    this.commanderNode.attack.value = 0.001;
    this.commanderNode.release.value = 0.05;

    // Gain passes — secondary distortion cleanup
    this.gainPassesNode = ctx.createDynamicsCompressor();
    this.gainPassesNode.threshold.value = -6;
    this.gainPassesNode.knee.value = 0;
    this.gainPassesNode.ratio.value = 20;
    this.gainPassesNode.attack.value = 0.001;
    this.gainPassesNode.release.value = 0.05;

    // Monitor correction
    this.monitorNode = ctx.createDynamicsCompressor();
    this.monitorNode.threshold.value = -6;
    this.monitorNode.knee.value = 0;
    this.monitorNode.ratio.value = 20;
    this.monitorNode.attack.value = 0.001;
    this.monitorNode.release.value = 0.05;

    // Stabilizer — targets stuttering and background noise
    this.stabilizerNode = ctx.createDynamicsCompressor();
    this.stabilizerNode.threshold.value = -6;
    this.stabilizerNode.knee.value = 0;
    this.stabilizerNode.ratio.value = 20;
    this.stabilizerNode.attack.value = 0.001;
    this.stabilizerNode.release.value = 0.05;

    // Signal Cleaner — final distortion pass before limiter ease
    this.signalCleanerNode = ctx.createDynamicsCompressor();
    this.signalCleanerNode.threshold.value = -6;
    this.signalCleanerNode.knee.value = 0;
    this.signalCleanerNode.ratio.value = 20;
    this.signalCleanerNode.attack.value = 0.001;
    this.signalCleanerNode.release.value = 0.05;

    // Limiter Ease: slow attack = clean transients pass through
    this.limiterEase = ctx.createDynamicsCompressor();
    this.limiterEase.threshold.value = -3;
    this.limiterEase.knee.value = 6;
    this.limiterEase.ratio.value = 12;
    this.limiterEase.attack.value = 0.003;
    this.limiterEase.release.value = 0.1;

    // Brick wall: clipping ONLY, final safety net
    this.limiter = ctx.createDynamicsCompressor();
    this.limiter.threshold.value = -1;
    this.limiter.knee.value = 0;
    this.limiter.ratio.value = 20;
    this.limiter.attack.value = 0.001;
    this.limiter.release.value = 0.05;

    // Smooth warm filters (inactive by default)
    this.warmBassFilter = ctx.createBiquadFilter();
    this.warmBassFilter.type = "peaking";
    this.warmBassFilter.frequency.value = 350;
    this.warmBassFilter.Q.value = 0.8;
    this.warmBassFilter.gain.value = 0;
    this.warmHighFilter = ctx.createBiquadFilter();
    this.warmHighFilter.type = "peaking";
    this.warmHighFilter.frequency.value = 7000;
    this.warmHighFilter.Q.value = 1.0;
    this.warmHighFilter.gain.value = 0;
    this.warmComp = ctx.createDynamicsCompressor();
    this.warmComp.threshold.value = -12;
    this.warmComp.knee.value = 6;
    this.warmComp.ratio.value = 3;
    this.warmComp.attack.value = 0.01;
    this.warmComp.release.value = 0.3;

    // ─── CLEAN BASS FILTERS (always in chain) ────────────────────────────────
    this.bassShelf120 = ctx.createBiquadFilter();
    this.bassShelf120.type = "lowshelf";
    this.bassShelf120.frequency.value = 120;
    this.bassShelf120.gain.value = 2; // always-on rock concert warmth

    this.bassCut250 = ctx.createBiquadFilter();
    this.bassCut250.type = "peaking";
    this.bassCut250.frequency.value = 250;
    this.bassCut250.Q.value = 0.9;
    this.bassCut250.gain.value = -2; // always-on boxy cut

    this.subBassShelf = ctx.createBiquadFilter();
    this.subBassShelf.type = "lowshelf";
    this.subBassShelf.frequency.value = 40;
    this.subBassShelf.gain.value = -6; // always-on sub-bass tighten

    // ─── SMALL SPEAKER MODE (inactive by default, always in chain) ────────
    this.ssPresence1 = ctx.createBiquadFilter();
    this.ssPresence1.type = "peaking";
    this.ssPresence1.frequency.value = 2000;
    this.ssPresence1.Q.value = 1.2;
    this.ssPresence1.gain.value = 0;

    this.ssPresence2 = ctx.createBiquadFilter();
    this.ssPresence2.type = "peaking";
    this.ssPresence2.frequency.value = 5000;
    this.ssPresence2.Q.value = 1.2;
    this.ssPresence2.gain.value = 0;

    this.ssUpperMid = ctx.createBiquadFilter();
    this.ssUpperMid.type = "peaking";
    this.ssUpperMid.frequency.value = 1000;
    this.ssUpperMid.Q.value = 1.0;
    this.ssUpperMid.gain.value = 0;

    this.ssFletcher = ctx.createBiquadFilter();
    this.ssFletcher.type = "peaking";
    this.ssFletcher.frequency.value = 3500;
    this.ssFletcher.Q.value = 1.0;
    this.ssFletcher.gain.value = 0;

    // Harmonic exciter: gentle soft-clip curve (adds richness, not harshness)
    this.ssWaveShaper = ctx.createWaveShaper();
    const ssN = 256;
    const ssCurve = new Float32Array(ssN);
    for (let i = 0; i < ssN; i++) {
      const x = (i * 2) / ssN - 1;
      ssCurve[i] = ((Math.PI + 80) * x) / (Math.PI + 80 * Math.abs(x));
    }
    this.ssWaveShaper.curve = ssCurve;
    this.ssWaveShaper.oversample = "2x";

    this.ssOutputBoost = ctx.createGain();
    this.ssOutputBoost.gain.value = 1.0; // 1.8 when active

    this.oscGain = ctx.createGain();
    this.oscGain.gain.value = 0;

    // ── Signal chain (bullhorn OFF / default):
    // sourceInput → engines → mixer → EQ → hz80 → subBassShelf → bassCut250
    //   → bassShelf120 → correctionGain → noiseGate → stereo → soundMagnet
    //   → env → clarityFilter → ampGain
    //   → [bullhorn filters inserted here by setBullhorn() when ON]
    //   → commander → gainPasses → monitor → stabilizer → signalCleaner
    //   → limiterEase → brickWall
    //   → masterGain (volume 0–1.0)
    //   → dbBoostGain (boost 1–5x)
    //   → outputGain → smallSpeakerNodes → analyser → speakers
    const mixer = ctx.createGain();
    mixer.gain.value = 1.0;
    for (const eg of this.engineGains) {
      this.sourceInput.connect(eg);
      eg.connect(mixer);
    }
    let prev: AudioNode = mixer;
    for (const f of this.eqFilters) {
      prev.connect(f);
      prev = f;
    }
    prev.connect(this.hz80DropFilter!);
    this.hz80DropFilter!.connect(this.subBassShelf!);
    this.subBassShelf!.connect(this.bassCut250!);
    this.bassCut250!.connect(this.bassShelf120!);
    this.bassShelf120!.connect(this.correctionGain!);
    this.correctionGain!.connect(this.noiseGateNode!);
    this.noiseGateNode!.connect(this.stereoSplitter!);
    this.stereoSplitter!.connect(this.stereoLeftGain!, 0);
    this.stereoSplitter!.connect(this.stereoRightGain!, 1);
    this.stereoLeftGain!.connect(this.stereoMerger!, 0, 0);
    this.stereoRightGain!.connect(this.stereoMerger!, 0, 1);
    this.stereoMerger!.connect(this.soundMagnetGain!);
    this.soundMagnetGain!.connect(this.envDelayNode!);
    this.envDelayNode!.connect(this.envFeedbackGain!);
    this.envFeedbackGain!.connect(this.envDelayNode!);
    this.envDelayNode!.connect(this.envWetGain!);
    this.soundMagnetGain!.connect(this.clarityFilter!);
    this.envWetGain!.connect(this.clarityFilter!);
    this.clarityFilter!.connect(this.ampGain!);
    // Default (bullhorn OFF): ampGain → commander directly
    this.ampGain!.connect(this.commanderNode!);
    this.commanderNode!.connect(this.gainPassesNode!);
    this.gainPassesNode!.connect(this.monitorNode!);
    this.monitorNode!.connect(this.stabilizerNode!);
    this.stabilizerNode!.connect(this.signalCleanerNode!);
    this.signalCleanerNode!.connect(this.limiterEase!);
    this.limiterEase!.connect(this.limiter!);
    this.limiter!.connect(this.masterGain!);
    this.masterGain!.connect(this.dbBoostGain!);
    this.dbBoostGain!.connect(this.outputGain!);
    this.outputGain!.connect(this.ssPresence1!);
    this.ssPresence1!.connect(this.ssPresence2!);
    this.ssPresence2!.connect(this.ssUpperMid!);
    this.ssUpperMid!.connect(this.ssFletcher!);
    this.ssFletcher!.connect(this.ssWaveShaper!);
    this.ssWaveShaper!.connect(this.ssOutputBoost!);
    this.ssOutputBoost!.connect(this.analyser!);
    this.analyser!.connect(ctx.destination);
    this.destination = this.sourceInput;
  }

  // ─── POWER ───────────────────────────────────────────────────────────────

  setUserPowerLevel(level: number) {
    this.ensureContext();
    this._userPowerLevel = level / 100;
    if (!this.ampPowered) return;
    const target =
      AudioEngine.SAFT_GAIN * this._userPowerLevel +
      AudioEngine.BASE_AMP_GAIN * (1 - this._userPowerLevel) * 0.5;
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
    this._rampAmpGain(AudioEngine.SAFT_GAIN);
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
      const isLow = dbfs > -100 && dbfs < -30;
      const base = AudioEngine.SAFT_GAIN;
      const target = isLow
        ? Math.min(base + 0.5, AudioEngine.MAX_AMP_GAIN)
        : base;
      if (Math.abs(target - this.currentAmpTarget) > 0.05) {
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

  // ─── PLAYBACK ─────────────────────────────────────────────────────────────

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
    if (this.context?.state === "suspended") await this.context.resume();
    this.resetForNewFile();
    const arrayBuffer = await file.arrayBuffer();
    this.audioBuffer = await this.context!.decodeAudioData(arrayBuffer);
    this.pausedAt = 0;
  }

  play() {
    if (!this.audioBuffer || !this.context || !this.sourceInput) return;
    if (this.isPlaying) return;
    if (this.context.state === "suspended") this.context.resume();
    const source = this.context.createBufferSource();
    source.buffer = this.audioBuffer;
    source.connect(this.sourceInput);
    const offset = this.pausedAt > 0 ? this.pausedAt : 0;
    source.start(0, offset);
    this.startedAt = this.context.currentTime - offset;
    this.isPlaying = true;
    this.source = source;
    source.onended = () => {
      if (this.isPlaying) {
        this.isPlaying = false;
        this.pausedAt = 0;
      }
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

  // Volume: clean 0–100 → 0.0–1.0 exponential curve (strong feel, no gain multiplier)
  setVolume(value: number) {
    this.ensureContext();
    if (!this.masterGain) return;
    this.masterGain.gain.value = value === 0 ? 0 : (value / 100) ** 2;
  }

  setEQBand(index: number, gainDb: number) {
    this.ensureContext();
    const f = this.eqFilters[index];
    if (f) f.gain.value = gainDb;
  }

  set80HzDrop(value: number) {
    this.ensureContext();
    this._hz80DropValue = value;
    if (this.hz80DropFilter) {
      const mappedGain = -(value / 100) * 18;
      this.hz80DropFilter.gain.value = Math.max(-18, Math.min(0, mappedGain));
    }
  }

  // Rock Concert: warm 80 Hz boost
  setRockBassDrop(on: boolean) {
    this.ensureContext();
    if (!this.hz80DropFilter) return;
    if (on) {
      this.hz80DropFilter.frequency.value = 80;
      this.hz80DropFilter.Q.value = 0.8;
      this.hz80DropFilter.gain.value = 8;
    } else {
      this.hz80DropFilter.frequency.value = 80;
      this.hz80DropFilter.Q.value = 0.8;
      // Restore slider value
      const restoredGain = -(this._hz80DropValue / 100) * 18;
      this.hz80DropFilter.gain.value = Math.max(-18, Math.min(0, restoredGain));
    }
  }

  // Extreme mode: max amp gain
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
        this.currentAmpTarget = AudioEngine.MAX_AMP_GAIN;
      }
      if (this.clarityFilter) this.clarityFilter.gain.value = 4;
    } else {
      if (this.ampGain) {
        this.ampGain.gain.cancelScheduledValues(now);
        this.ampGain.gain.setValueAtTime(this.ampGain.gain.value, now);
        this.ampGain.gain.linearRampToValueAtTime(
          AudioEngine.SAFT_GAIN,
          now + ramp,
        );
        this.currentAmpTarget = AudioEngine.SAFT_GAIN;
      }
      if (this.clarityFilter) this.clarityFilter.gain.value = 3;
    }
  }

  // ─── SMOOTH WARM ─────────────────────────────────────────────────────────
  setSmoothWarm(on: boolean) {
    this.ensureContext();
    this._smoothWarmOn = on;
    if (this.warmBassFilter) this.warmBassFilter.gain.value = on ? 3 : 0;
    if (this.warmHighFilter) this.warmHighFilter.gain.value = on ? -2 : 0;
    // warmComp is always in chain, just change ratio for effect
    if (this.warmComp) {
      this.warmComp.threshold.value = on ? -12 : 0;
      this.warmComp.ratio.value = on ? 3 : 1;
    }
    // Clean bass character: rock concert warmth regardless of smooth warm
    if (this.bassShelf120) this.bassShelf120.gain.value = on ? 3 : 2;
    if (this.bassCut250) this.bassCut250.gain.value = on ? -3 : -2;
    if (this.subBassShelf) this.subBassShelf.gain.value = on ? -8 : -6;
  }

  getSmoothWarm() {
    return this._smoothWarmOn;
  }

  // ─── SMALL SPEAKER MODE ──────────────────────────────────────────────────
  setSmallSpeakerMode(active: boolean) {
    this.ensureContext();
    this._smallSpeakerOn = active;
    // Psychoacoustic presence 2kHz
    if (this.ssPresence1) this.ssPresence1.gain.value = active ? 4 : 0;
    // Upper presence 5kHz
    if (this.ssPresence2) this.ssPresence2.gain.value = active ? 4 : 0;
    // Upper mid 1kHz for perceived loudness
    if (this.ssUpperMid) this.ssUpperMid.gain.value = active ? 3 : 0;
    // Fletcher-Munson 3.5kHz (ear most sensitive)
    if (this.ssFletcher) this.ssFletcher.gain.value = active ? 3 : 0;
    // Output push for small speakers
    if (this.ssOutputBoost) this.ssOutputBoost.gain.value = active ? 1.8 : 1.0;
  }

  getSmallSpeakerMode() {
    return this._smallSpeakerOn;
  }
  // ─────────────────────────────────────────────────────────────────────────

  // ─── SOUND MAGNET ────────────────────────────────────────────────────────

  setSoundMagnetGain(value: number) {
    this.ensureContext();
    if (this.soundMagnetGain)
      this.soundMagnetGain.gain.value = Math.max(
        0.5,
        Math.min(AudioEngine.MAGNET_MAX_GAIN * 1.2, value),
      );
  }

  setSoundMagnetIntensity(level: number) {
    this.ensureContext();
    if (!this.context || !this.soundMagnetGain) return;
    this._magnetIntensity = level / 100;
    const now = this.context.currentTime;
    const target =
      1.0 + this._magnetIntensity * (AudioEngine.MAGNET_MAX_GAIN - 1.0);
    this.soundMagnetGain.gain.cancelScheduledValues(now);
    this.soundMagnetGain.gain.setValueAtTime(
      this.soundMagnetGain.gain.value,
      now,
    );
    this.soundMagnetGain.gain.linearRampToValueAtTime(target, now + 0.05);
  }

  setStereoMagnetWidth(level: number) {
    this.ensureContext();
    if (!this.stereoLeftGain || !this.stereoRightGain) return;
    const width = Math.max(0, Math.min(1, level)) * 0.4;
    this.stereoLeftGain.gain.value = 1.0 + width;
    this.stereoRightGain.gain.value = 1.0 - width;
  }

  setEnvironmentalRoomLevel(level: number) {
    this.ensureContext();
    const l = Math.max(0, Math.min(1, level));
    this._envRoomLevel = l;
    if (this.envDelayNode) this.envDelayNode.delayTime.value = 0.02 + l * 0.06;
    if (this.envFeedbackGain) this.envFeedbackGain.gain.value = l * 0.25;
    if (this.envWetGain) this.envWetGain.gain.value = l * 0.3;
    if (this.stereoLeftGain && this.stereoRightGain) {
      const extra = l * 0.2;
      const base = Math.max(0, this.stereoLeftGain.gain.value - 1.0);
      const combined = Math.min(0.4, base + extra);
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

  // DB Boost: 0–100% → 1.0–5.0x (AFTER volume, clean gain)
  setDBBoost(value: number) {
    this.ensureContext();
    if (this.dbBoostGain)
      this.dbBoostGain.gain.value = 1.0 + (value / 100) * 4.0;
  }

  // ─── BULLHORN MODE ───────────────────────────────────────────────────────
  // Bullhorn filters are placed BEFORE the correction center so the full
  // 1.3e45 combined correction force processes the shaped bullhorn signal.
  //
  // Chain when ON:
  //   ampGain → bullhornLowShelf → bullhornMidBoost → bullhornHarshCut
  //           → bullhornHighShelf → bullhornPresence (dry) → commanderNode
  //           bullhornPresence → delay → feedback loop → wetGain → commanderNode
  //
  // Chain when OFF:
  //   ampGain → commanderNode  (direct bypass)
  setBullhorn(active: boolean) {
    this.ensureContext();
    if (!this.ampGain || !this.commanderNode) return;
    if (
      !this.bullhornLowShelf ||
      !this.bullhornMidBoost ||
      !this.bullhornHarshCut ||
      !this.bullhornHighShelf ||
      !this.bullhornPresence ||
      !this.bullhornDelayNode ||
      !this.bullhornFeedbackGain ||
      !this.bullhornWetGain
    )
      return;

    this.bullhornActive = active;

    // Disconnect ampGain from whatever it currently feeds
    try {
      this.ampGain.disconnect();
    } catch (_) {}
    // Clean up any lingering bullhorn internal connections
    try {
      this.bullhornPresence.disconnect();
    } catch (_) {}
    try {
      this.bullhornDelayNode.disconnect();
    } catch (_) {}
    try {
      this.bullhornFeedbackGain.disconnect();
    } catch (_) {}
    try {
      this.bullhornWetGain.disconnect();
    } catch (_) {}
    try {
      this.bullhornLowShelf.disconnect();
    } catch (_) {}
    try {
      this.bullhornMidBoost.disconnect();
    } catch (_) {}
    try {
      this.bullhornHarshCut.disconnect();
    } catch (_) {}
    try {
      this.bullhornHighShelf.disconnect();
    } catch (_) {}

    if (active) {
      // ampGain → warm EQ filters → presence → commanderNode (dry path)
      //                          → delay → feedback loop
      //                          → wetGain → commanderNode
      // The FULL correction center then processes everything that comes out.
      this.ampGain.connect(this.bullhornLowShelf);
      this.bullhornLowShelf.connect(this.bullhornMidBoost);
      this.bullhornMidBoost.connect(this.bullhornHarshCut);
      this.bullhornHarshCut.connect(this.bullhornHighShelf);
      this.bullhornHighShelf.connect(this.bullhornPresence);
      // Dry path into correction center
      this.bullhornPresence.connect(this.commanderNode);
      // Wet (room reflection) path into correction center
      this.bullhornPresence.connect(this.bullhornDelayNode);
      this.bullhornDelayNode.connect(this.bullhornFeedbackGain);
      this.bullhornFeedbackGain.connect(this.bullhornDelayNode);
      this.bullhornDelayNode.connect(this.bullhornWetGain);
      this.bullhornWetGain.connect(this.commanderNode);
    } else {
      // Direct bypass: ampGain → commanderNode
      this.ampGain.connect(this.commanderNode);
    }
  }

  toggleStabilizer(on: boolean) {
    this.ensureContext();
    if (this.correctionGain) this.correctionGain.gain.value = on ? 1.4 : 1.0;
  }

  toggleNoiseGate(on: boolean) {
    this.ensureContext();
    if (!this.noiseGateNode) return;
    if (on) {
      this.noiseGateNode.threshold.value = -50;
      this.noiseGateNode.knee.value = 0;
      this.noiseGateNode.ratio.value = 20;
      this.noiseGateNode.attack.value = 0.003;
      this.noiseGateNode.release.value = 0.25;
    } else {
      this.noiseGateNode.threshold.value = 0;
      this.noiseGateNode.ratio.value = 1;
    }
  }

  setFreqGen(_hz: number, _level: number, _active: boolean) {
    /* no-op */
  }

  // ─── ANALYSIS ────────────────────────────────────────────────────────────

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
    return Math.max(0, Math.min(1, (this.getDBFS() + 60) / 60));
  }

  getLowFreqPower(): number {
    if (!this.analyser || !this.context) return 0;
    const buf = new Float32Array(this.analyser.frequencyBinCount);
    this.analyser.getFloatFrequencyData(buf);
    const binHz = this.context.sampleRate / this.analyser.fftSize;
    const lo = Math.round(20 / binHz);
    const hi = Math.round(200 / binHz);
    let sum = 0;
    let count = 0;
    for (let i = lo; i <= Math.min(hi, buf.length - 1); i++) {
      sum += (Math.max(-80, buf[i]) + 80) / 80;
      count++;
    }
    return count > 0 ? Math.min(1, sum / count) : 0;
  }

  getMidHighPower(): number {
    if (!this.analyser || !this.context) return 0;
    const buf = new Float32Array(this.analyser.frequencyBinCount);
    this.analyser.getFloatFrequencyData(buf);
    const binHz = this.context.sampleRate / this.analyser.fftSize;
    const lo = Math.round(1000 / binHz);
    const hi = Math.round(16000 / binHz);
    let sum = 0;
    let count = 0;
    for (let i = lo; i <= Math.min(hi, buf.length - 1); i++) {
      sum += (Math.max(-80, buf[i]) + 80) / 80;
      count++;
    }
    return count > 0 ? Math.min(1, sum / count) : 0;
  }

  setEngineActive(index: number, active: boolean) {
    this.ensureContext();
    this.engineActive[index] = active;
    const eg = this.engineGains[index];
    if (eg) eg.gain.value = active ? AudioEngine.ENGINE_GAINS[index] : 0;
  }

  setSoundMagnetGainLegacy(value: number) {
    this.setSoundMagnetGain(value);
  }

  // ─── PRESETS & SETTINGS ──────────────────────────────────────────────────

  applyPreset(preset: string) {
    this.ensureContext();
    switch (preset) {
      case "GOLD PHANTOM KILLER":
        this.setEQBand(5, 4);
        this.setEQBand(6, 4);
        this.setEQBand(7, 2);
        if (this.ampPowered) this._rampAmpGain(AudioEngine.MAX_AMP_GAIN);
        if (this.dbBoostGain) this.dbBoostGain.gain.value = 1 + (85 / 100) * 4;
        if (this.clarityFilter) this.clarityFilter.gain.value = 5;
        break;
      case "BLUETOOTH MAX":
        if (this.outputGain) this.outputGain.gain.value = 3.0;
        if (this.ampPowered) this._rampAmpGain(AudioEngine.MAX_AMP_GAIN);
        if (this.dbBoostGain) this.dbBoostGain.gain.value = 1 + (70 / 100) * 4;
        break;
      case "LATE NIGHT":
        if (this.ampPowered) this._rampAmpGain(2.0);
        if (this.outputGain) this.outputGain.gain.value = 1.5;
        if (this.dbBoostGain) this.dbBoostGain.gain.value = 1.0;
        break;
      default: // STANDARD
        if (this.ampPowered) this._rampAmpGain(AudioEngine.SAFT_GAIN);
        if (this.outputGain) this.outputGain.gain.value = 2.0;
        if (this.dbBoostGain) this.dbBoostGain.gain.value = 1.0;
        if (this.clarityFilter) this.clarityFilter.gain.value = 3;
        break;
    }
  }

  setBassEnhancement(on: boolean) {
    this.ensureContext();
    const f = this.eqFilters[1];
    if (!f) return;
    if (on) {
      f.gain.value = Math.min(12, f.gain.value + 4);
    } else {
      f.gain.value = Math.max(-12, f.gain.value - 4);
    }
  }

  setHighClarityMode(on: boolean) {
    this.ensureContext();
    if (this.clarityFilter) {
      this.clarityFilter.gain.value = on ? 6 : 3;
    }
  }

  setLimiterMode(mode: "EASE" | "HARD") {
    this.ensureContext();
    if (mode === "HARD") {
      if (this.limiterEase) {
        this.limiterEase.ratio.value = 1;
        this.limiterEase.threshold.value = 0;
        this.limiterEase.knee.value = 0;
      }
    } else {
      if (this.limiterEase) {
        this.limiterEase.threshold.value = -3;
        this.limiterEase.knee.value = 6;
        this.limiterEase.ratio.value = 12;
        this.limiterEase.attack.value = 0.003;
        this.limiterEase.release.value = 0.1;
      }
    }
  }

  setAutoGainCompensation(on: boolean) {
    if (!on) return;
    if (!this.analyser || !this.masterGain) return;
    const dbfs = this.getDBFS();
    if (dbfs > -6 && this.masterGain.gain.value > 0.5) {
      this.masterGain.gain.value = Math.max(
        0.5,
        this.masterGain.gain.value - 0.05,
      );
    } else if (dbfs < -20 && this.masterGain.gain.value < 1.0) {
      this.masterGain.gain.value = Math.min(
        1.0,
        this.masterGain.gain.value + 0.05,
      );
    }
  }
}

export const audioEngine = new AudioEngine();
