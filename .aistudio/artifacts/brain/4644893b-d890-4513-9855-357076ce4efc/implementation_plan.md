# Implementation Plan: Medieval Steel Clashing, Slashing & Visceral Kill SFX

## Overview
Upgrade the combat audio engine in `src/soundAndVfxEngine.js` and its combat choreography integration in `src/wizardChessEngine.js` so captures and piece executions sound like authentic medieval steel-on-steel swordplay, razor-sharp blade slashes, and heavy stone/armor destruction rather than synthetic oscillator tones.

---

## 1. Acoustic & Physical Modeling Synthesis Engine (`src/soundAndVfxEngine.js`)
Replace basic sine/sawtooth frequency sweeps with a dedicated **Physical Foley & Metallic Modal Synthesis** pipeline:

- **Convolution Reverb & Acoustic Space**:
  - Generate a custom stereo impulse response buffer simulating a stone chamber / battlefield acoustic tail so metallic rings and heavy impacts decay naturally in 3D space.
- **Wave-Shaper Saturation & Transient Crispness**:
  - Route steel clashes, blade slashes, and stone crunches through a non-linear distortion/clipper curve with a master compressor to produce raw, punchy physical impact transients instead of clean electronic waves.
- **Inharmonic Steel Modal Resonator (`_playSteelClash` & `_playBladeDraw`)**:
  - Model real forged steel using clustered inharmonic overtone ratios (`1.0, 1.47, 2.09, 2.86, 3.71, 4.58, 5.92`) excited by ultra-short high-Q filtered noise strikes and ring modulation:
    - **Blade Draw ("Shiiing")**: High-Q resonant bandpass scrape sliding across high metallic partials (`2400 Hz -> 5200 Hz`) as the weapon leaves its scabbard.
    - **Steel-on-Steel Parry Clash**: Micro-transient anvil/edge click (`0.004s`) + dual detuned metallic modal banks + high-frequency spark sizzle (`4500 Hz - 9500 Hz`).
- **Directional Blade Slash & Cleave (`_playBladeSlash` & `_playHeavyCleave`)**:
  - Layer a sharp leather/air whip transient with a resonant comb/bandpass-filtered noise sweep (`1800 Hz -> 280 Hz` rapid Doppler contour) for realistic sword cutting through the air, followed by a wet/heavy armor-and-stone cleave impact (`_playArmorBreach` & `_playStoneCrunch`).

---

## 2. Multi-Stage Duel Sequence on Capture
Synchronize the capture choreography (`playCapturePreImpact` and `wizardChessEngine.js` capture sequence) into a **4-stage medieval duel**:

1. **Stage 1 — Blade Draw (0ms)**: Crisp metallic scabbard scrape ("shiiing") and leather grip tautness as the attacking piece winds up.
2. **Stage 2 — Air Slash (90ms)**: High-velocity directional sword whip cutting through the air as the attacker lunges forward.
3. **Stage 3 — Steel Parry Clash (175ms)**: Ringing steel-on-steel weapon collision (with 1–2 rapid parry exchanges for heavier pieces) before breaking through the defender's guard.
4. **Stage 4 — Final Cleave & Piece-Specific Destruction (Impact)**: Brutal weapon cleave into armor and carved stone, immediately triggering the victim piece's signature kill foley.

---

## 3. Piece-Specific Medieval Kill SFX (`playPieceKillSound`)
Redesign all 6 piece destruction sound profiles around physical steel, armor, and stone foley:

- **Pawn (`CLEAVED`)**: Swift broadsword slash through iron mail, shield splinter, and crisp stone rubble scatter.
- **Knight (`UNHORSED`)**: Heavy polearm/lance steel clash, double sword parry ring, warhorse armor plate crash, and cascading cobblestone collapse.
- **Bishop (`SHATTERED`)**: Razor blade slice severing stone vestments, crystalline/stained-glass fracture burst, and echoing cathedral masonry crumble.
- **Rook (`DEMOLISHED`)**: Colossal warhammer/siege impact against fortified plate, deep structural stone cracking, and multi-wave fortress boulder avalanche.
- **Queen (`ANNIHILATED`)**: Flurry of three rapid steel-on-steel sword clashes, high-velocity executioner cleave, royal armor shatter, and massive resonant shockwave rumble.
- **King (`REGICIDE`)**: Dramatic executioner greatsword draw, two heavy steel parry clashes, decisive regicide cleave, hollow metallic crown clattering and spinning across the stone floor, and monument collapse.
