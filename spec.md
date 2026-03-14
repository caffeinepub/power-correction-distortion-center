# Power Correction Distortion Center

## Current State
App.tsx is 2,590 lines -- too large, causing crashes and deployment failures. Needs a full clean rewrite split across multiple component files.

## Requested Changes (Diff)

### Add
- Battery/Power System panel: 8,000,000W battery bank, charger at 2,000,000 with 200,000 headroom, live animated charging meter, nothing activates until battery fully charged, then whole system powers on
- Brutus Amplifier panel: styled like Hifonics BG-1300.1D (silver ribbed chassis, BRUTUS label, SRS2202 DB AMPLIFIER GP/AUDIO DESIGNER, blue glow/lights up), 6,000,000 watts, 120W/0 Gauge spec, powered by 12 combined app settings
- Save button to persist all settings
- Split into multiple component files to prevent file size crashes

### Modify
- Rewrite entire App.tsx as clean orchestrator importing components
- EQ bands: real working BiquadFilter nodes, sliders move up and down
- A+B+C+D engines: pluses between labels, no volume sliders, strong fixed output
- All controls functional, nothing fake

### Remove
- Harmonic Drive (replaced by clean DB Boost)
- Monolithic single-file structure

## Implementation Plan
1. Write AudioEngine.ts -- all Web Audio API logic (context, nodes, signal chain)
2. Write BrutuAmp.tsx -- Brutus amplifier panel UI
3. Write BatterySystem.tsx -- battery charging system, powers up app
4. Write CorrectionSystem.tsx -- Commander, Gain Passes, Monitor, smart chip display
5. Write Equalizer.tsx -- 10-band EQ with real BiquadFilter nodes
6. Write SoundEngines.tsx -- A+B+C+D panels
7. Write SoundMagnet.tsx -- invisible virtual magnet with room sensor
8. Write App.tsx -- clean orchestrator, blue/yellow theme, full-width layout
