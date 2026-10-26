import * as THREE_NS from 'three';

/** @type {any} */
const THREE = THREE_NS;

// ============================================================================
// Piece-Specific Dramatic Kill Profiles (Metadata, Colors, Titles, Lore)
// ============================================================================
export const PIECE_KILL_PROFILES = {
  pawn: {
    id: 'pawn',
    title: 'VANGUARD SHIELD-BREAKER',
    subtitle: 'Crimson Cleave & Buckler Shatter',
    primaryHex: 0xff6b35,
    secondaryHex: 0xffd166,
    coreHex: 0xfff3d1,
    flashIntensity: 9.5,
    shakeAmp: 0.032,
    shakeDuration: 0.34,
    shardCount: 36
  },
  rook: {
    id: 'rook',
    title: 'CITADEL SEISMIC CATACLYSM',
    subtitle: 'Tectonic Fissure & Fortress Demolition',
    primaryHex: 0xff5412,
    secondaryHex: 0xffb703,
    coreHex: 0xffe8a3,
    flashIntensity: 12.5,
    shakeAmp: 0.058,
    shakeDuration: 0.56,
    shardCount: 48
  },
  knight: {
    id: 'knight',
    title: 'TEMPEST VALKYRIE THUNDERSTRIKE',
    subtitle: 'Skyward Plasma Bolts & Cyclone Burst',
    primaryHex: 0x00e5ff,
    secondaryHex: 0x9d4edd,
    coreHex: 0xe0fbfc,
    flashIntensity: 13.0,
    shakeAmp: 0.046,
    shakeDuration: 0.44,
    shardCount: 42
  },
  bishop: {
    id: 'bishop',
    title: 'CELESTIAL JUDGEMENT BEAM',
    subtitle: 'Orbital Sanctum Pillar & Runic Banishment',
    primaryHex: 0xffd60a,
    secondaryHex: 0x48cae4,
    coreHex: 0xffffff,
    flashIntensity: 13.5,
    shakeAmp: 0.042,
    shakeDuration: 0.46,
    shardCount: 44
  },
  queen: {
    id: 'queen',
    title: 'ASTRAL SUPERNOVA OBLITERATION',
    subtitle: 'Singularity Implosion & Royal Starburst',
    primaryHex: 0xe040fb,
    secondaryHex: 0xffd166,
    coreHex: 0xffffff,
    flashIntensity: 16.5,
    shakeAmp: 0.068,
    shakeDuration: 0.65,
    shardCount: 62
  },
  king: {
    id: 'king',
    title: 'SOVEREIGN EXECUTION APOCALYPSE',
    subtitle: 'Cataclysmic Doom Bell & Crown Obliteration',
    primaryHex: 0xff1e42,
    secondaryHex: 0xf5d76e,
    coreHex: 0xfff8d6,
    flashIntensity: 19.0,
    shakeAmp: 0.082,
    shakeDuration: 0.82,
    shardCount: 76
  }
};

// ============================================================================
// Procedural Web Audio API Sound Effects (SFX) Synthesizer
// ============================================================================
export function createSoundAndVfxManager(scene, boardSurfaceY = 0.775) {
  let sfxEnabled = true;
  try {
    const saved = localStorage.getItem('wizard_chess_sfx_enabled');
    if (saved !== null) sfxEnabled = saved !== 'false';
  } catch (e) {}

  let audioCtx = null;
  let noiseBuffer = null;

  function getAudioCtx() {
    if (!sfxEnabled || typeof window === 'undefined') return null;
    if (navigator.webdriver) return null;
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return null;
    if (!audioCtx) {
      try {
        audioCtx = new AudioCtx();
      } catch (e) {
        return null;
      }
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume().catch(() => {});
    }
    return audioCtx;
  }

  function getNoiseBuffer(ctx) {
    if (noiseBuffer && noiseBuffer.sampleRate === ctx.sampleRate) {
      return noiseBuffer;
    }
    const duration = 2.0;
    const length = Math.floor(ctx.sampleRate * duration);
    const buf = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < length; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    noiseBuffer = buf;
    return buf;
  }

  function playNoiseBurst(ctx, opts = {}) {
    const {
      startTime = ctx.currentTime,
      duration = 0.35,
      filterType = 'bandpass',
      freqStart = 1200,
      freqEnd = 300,
      q = 1.5,
      gainPeak = 0.25,
      attack = 0.008
    } = opts;

    const src = ctx.createBufferSource();
    src.buffer = getNoiseBuffer(ctx);

    const filter = ctx.createBiquadFilter();
    filter.type = filterType;
    filter.Q.setValueAtTime(q, startTime);
    filter.frequency.setValueAtTime(Math.max(20, freqStart), startTime);
    filter.frequency.exponentialRampToValueAtTime(Math.max(20, freqEnd), startTime + duration);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, startTime);
    gain.gain.linearRampToValueAtTime(gainPeak, startTime + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

    src.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    src.start(startTime);
    src.stop(startTime + duration + 0.02);
  }

  function playTone(ctx, opts = {}) {
    const {
      startTime = ctx.currentTime,
      duration = 0.4,
      type = 'sine',
      freqStart = 440,
      freqEnd = 220,
      gainPeak = 0.2,
      attack = 0.01,
      filterFreq = 2400
    } = opts;

    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(Math.max(16, freqStart), startTime);
    if (freqEnd !== freqStart) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(16, freqEnd), startTime + duration);
    }

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(filterFreq, startTime);
    filter.frequency.exponentialRampToValueAtTime(Math.max(80, filterFreq * 0.35), startTime + duration);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, startTime);
    gain.gain.linearRampToValueAtTime(gainPeak, startTime + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    osc.start(startTime);
    osc.stop(startTime + duration + 0.02);
  }

  // ==========================================================================
  // Standard Gameplay SFX (Select, Move, Swing, Clash, Castle, Promote)
  // ==========================================================================
  function playSelectSfx(pieceType = 'pawn') {
    const ctx = getAudioCtx();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      const baseFreqs = {
        pawn: 520,
        rook: 340,
        knight: 580,
        bishop: 660,
        queen: 740,
        king: 440
      };
      const f = baseFreqs[pieceType] || 520;
      playTone(ctx, {
        startTime: now,
        duration: 0.16,
        type: 'triangle',
        freqStart: f,
        freqEnd: f * 1.25,
        gainPeak: 0.11,
        attack: 0.006,
        filterFreq: 3200
      });
      playTone(ctx, {
        startTime: now + 0.025,
        duration: 0.22,
        type: 'sine',
        freqStart: f * 1.5,
        freqEnd: f * 1.5,
        gainPeak: 0.07,
        attack: 0.01,
        filterFreq: 4000
      });
    } catch (e) {}
  }

  function playMoveStartSfx(pieceType = 'pawn', isCapture = false) {
    const ctx = getAudioCtx();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      // Low carved-stone slide / arcane levitation hum
      playNoiseBurst(ctx, {
        startTime: now,
        duration: isCapture ? 0.42 : 0.32,
        filterType: 'lowpass',
        freqStart: pieceType === 'knight' ? 620 : 340,
        freqEnd: 140,
        q: 2.2,
        gainPeak: 0.12,
        attack: 0.03
      });
      playTone(ctx, {
        startTime: now,
        duration: 0.28,
        type: 'sine',
        freqStart: pieceType === 'rook' ? 75 : 95,
        freqEnd: 58,
        gainPeak: 0.14,
        attack: 0.02,
        filterFreq: 320
      });
    } catch (e) {}
  }

  function playMoveLandSfx(pieceType = 'pawn', isCastle = false) {
    const ctx = getAudioCtx();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      // Weighty obsidian altar thud
      playTone(ctx, {
        startTime: now,
        duration: 0.22,
        type: 'sine',
        freqStart: pieceType === 'rook' || pieceType === 'king' ? 92 : 118,
        freqEnd: 38,
        gainPeak: 0.22,
        attack: 0.005,
        filterFreq: 420
      });
      playNoiseBurst(ctx, {
        startTime: now,
        duration: 0.12,
        filterType: 'bandpass',
        freqStart: 900,
        freqEnd: 240,
        q: 1.8,
        gainPeak: 0.12,
        attack: 0.004
      });

      if (isCastle) {
        // Second interlocking fortress thud + brass lock chime
        playTone(ctx, {
          startTime: now + 0.11,
          duration: 0.26,
          type: 'triangle',
          freqStart: 110,
          freqEnd: 42,
          gainPeak: 0.24,
          attack: 0.005,
          filterFreq: 520
        });
        playTone(ctx, {
          startTime: now + 0.14,
          duration: 0.45,
          type: 'sine',
          freqStart: 440,
          freqEnd: 659.25,
          gainPeak: 0.10,
          attack: 0.015,
          filterFreq: 2800
        });
      }
    } catch (e) {}
  }

  function playAttackChargeAndSwingSfx(attackerType = 'queen', victimType = 'pawn') {
    const ctx = getAudioCtx();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      // Pre-strike weapon whoosh & energy charge tailored to victim/attacker
      playNoiseBurst(ctx, {
        startTime: now + 0.04,
        duration: 0.26,
        filterType: 'bandpass',
        freqStart: 280,
        freqEnd: 1850,
        q: 3.0,
        gainPeak: 0.18,
        attack: 0.06
      });
      const chargeFreq = victimType === 'queen' || victimType === 'king' ? 180 : 240;
      playTone(ctx, {
        startTime: now,
        duration: 0.28,
        type: 'sawtooth',
        freqStart: chargeFreq,
        freqEnd: chargeFreq * 2.4,
        gainPeak: 0.11,
        attack: 0.04,
        filterFreq: 1800
      });
    } catch (e) {}
  }

  function playWeaponContactClashSfx(attackerType = 'queen', victimType = 'pawn') {
    const ctx = getAudioCtx();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      // Sharp metallic/arcane weapon impact & armor crack right before shatter
      playTone(ctx, {
        startTime: now,
        duration: 0.18,
        type: 'sawtooth',
        freqStart: 1480,
        freqEnd: 420,
        gainPeak: 0.18,
        attack: 0.002,
        filterFreq: 4800
      });
      playTone(ctx, {
        startTime: now,
        duration: 0.15,
        type: 'square',
        freqStart: 2240,
        freqEnd: 680,
        gainPeak: 0.11,
        attack: 0.002,
        filterFreq: 5400
      });
      playNoiseBurst(ctx, {
        startTime: now,
        duration: 0.14,
        filterType: 'highpass',
        freqStart: 1800,
        freqEnd: 600,
        q: 2.4,
        gainPeak: 0.22,
        attack: 0.002
      });
    } catch (e) {}
  }

  function playPromotionSfx() {
    const ctx = getAudioCtx();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      const notes = [523.25, 659.25, 783.99, 1046.5];
      notes.forEach((f, idx) => {
        playTone(ctx, {
          startTime: now + idx * 0.065,
          duration: 0.55,
          type: 'triangle',
          freqStart: f,
          freqEnd: f * 1.005,
          gainPeak: 0.12,
          attack: 0.01,
          filterFreq: 4200
        });
      });
    } catch (e) {}
  }

  // ==========================================================================
  // 6 Distinct Dramatic Piece Kill / Destruction SFX Profiles
  // ==========================================================================
  function playPieceKillSfx(victimType = 'pawn', attackerType = 'queen') {
    const ctx = getAudioCtx();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      const type = String(victimType || 'pawn').toLowerCase();

      if (type === 'pawn') {
        // PAWN: Shield-Breaker Metallic Cleave + Buckler Crack + Stone/Armor Shatter
        playTone(ctx, {
          startTime: now,
          duration: 0.34,
          type: 'sine',
          freqStart: 135,
          freqEnd: 34,
          gainPeak: 0.36,
          attack: 0.004,
          filterFreq: 500
        });
        playTone(ctx, {
          startTime: now,
          duration: 0.24,
          type: 'sawtooth',
          freqStart: 920,
          freqEnd: 180,
          gainPeak: 0.22,
          attack: 0.003,
          filterFreq: 3600
        });
        playNoiseBurst(ctx, {
          startTime: now,
          duration: 0.38,
          filterType: 'bandpass',
          freqStart: 1650,
          freqEnd: 320,
          q: 1.4,
          gainPeak: 0.30,
          attack: 0.004
        });
        // Cascading stone/buckler shards hitting the board
        for (let i = 0; i < 4; i++) {
          playNoiseBurst(ctx, {
            startTime: now + 0.08 + i * 0.055,
            duration: 0.12,
            filterType: 'bandpass',
            freqStart: 2200 - i * 300,
            freqEnd: 580,
            q: 3.2,
            gainPeak: 0.14 * (1 - i * 0.18),
            attack: 0.003
          });
        }
      } else if (type === 'rook') {
        // ROOK: Colossal Seismic Earthquake Rumble + Fortress Tower Demolition Collapse
        playTone(ctx, {
          startTime: now,
          duration: 0.88,
          type: 'sine',
          freqStart: 98,
          freqEnd: 24,
          gainPeak: 0.48,
          attack: 0.006,
          filterFreq: 280
        });
        playTone(ctx, {
          startTime: now + 0.02,
          duration: 0.72,
          type: 'sawtooth',
          freqStart: 68,
          freqEnd: 28,
          gainPeak: 0.28,
          attack: 0.015,
          filterFreq: 240
        });
        // Deep tectonic roar
        playNoiseBurst(ctx, {
          startTime: now,
          duration: 0.85,
          filterType: 'lowpass',
          freqStart: 540,
          freqEnd: 75,
          q: 1.2,
          gainPeak: 0.42,
          attack: 0.01
        });
        // Multi-stage collapsing stone battlements
        for (let i = 0; i < 6; i++) {
          const delay = 0.06 + i * 0.085;
          playNoiseBurst(ctx, {
            startTime: now + delay,
            duration: 0.22,
            filterType: 'bandpass',
            freqStart: 950 - i * 90,
            freqEnd: 160,
            q: 1.8,
            gainPeak: 0.22 * (1 - i * 0.11),
            attack: 0.005
          });
          playTone(ctx, {
            startTime: now + delay,
            duration: 0.18,
            type: 'triangle',
            freqStart: 120 - i * 12,
            freqEnd: 38,
            gainPeak: 0.18 * (1 - i * 0.12),
            attack: 0.005,
            filterFreq: 320
          });
        }
      } else if (type === 'knight') {
        // KNIGHT: High-Voltage Sky Lightning Strike + Tempest Cyclone + Metallic Shatter
        // Sharp lightning snap
        playNoiseBurst(ctx, {
          startTime: now,
          duration: 0.14,
          filterType: 'highpass',
          freqStart: 2800,
          freqEnd: 900,
          q: 3.5,
          gainPeak: 0.34,
          attack: 0.001
        });
        // Descending plasma bolt pitch dive
        playTone(ctx, {
          startTime: now,
          duration: 0.36,
          type: 'sawtooth',
          freqStart: 2400,
          freqEnd: 52,
          gainPeak: 0.28,
          attack: 0.002,
          filterFreq: 5200
        });
        // Thunderclap sub-boom
        playTone(ctx, {
          startTime: now + 0.015,
          duration: 0.62,
          type: 'sine',
          freqStart: 125,
          freqEnd: 28,
          gainPeak: 0.42,
          attack: 0.004,
          filterFreq: 420
        });
        // Rolling thunder + electric arc crackles
        playNoiseBurst(ctx, {
          startTime: now + 0.02,
          duration: 0.68,
          filterType: 'bandpass',
          freqStart: 1400,
          freqEnd: 140,
          q: 1.1,
          gainPeak: 0.35,
          attack: 0.008
        });
        for (let i = 0; i < 5; i++) {
          playTone(ctx, {
            startTime: now + 0.05 + i * 0.06,
            duration: 0.08,
            type: 'square',
            freqStart: 1600 + (i % 2) * 800,
            freqEnd: 420,
            gainPeak: 0.12,
            attack: 0.002,
            filterFreq: 4500
          });
        }
      } else if (type === 'bishop') {
        // BISHOP: Sacred Orbital Judgement Beam + Celestial Choir Chord + Crystalline Implosion
        // Orbital beam convergence sweep
        playTone(ctx, {
          startTime: now,
          duration: 0.55,
          type: 'sine',
          freqStart: 1480,
          freqEnd: 220,
          gainPeak: 0.24,
          attack: 0.008,
          filterFreq: 4800
        });
        // Sub-bass sanctum impact
        playTone(ctx, {
          startTime: now + 0.02,
          duration: 0.58,
          type: 'sine',
          freqStart: 110,
          freqEnd: 35,
          gainPeak: 0.36,
          attack: 0.006,
          filterFreq: 380
        });
        // Sacred Celestial Chord (D Major 9th / Angelic Resonance)
        const sacredFreqs = [293.66, 440.0, 554.37, 659.25, 880.0, 1174.66];
        sacredFreqs.forEach((f, idx) => {
          playTone(ctx, {
            startTime: now + idx * 0.028,
            duration: 0.92,
            type: idx % 2 === 0 ? 'triangle' : 'sine',
            freqStart: f,
            freqEnd: f * 1.004,
            gainPeak: 0.09,
            attack: 0.02,
            filterFreq: 4200
          });
        });
        // Crystalline stained-glass sanctum shatter chimes
        for (let i = 0; i < 6; i++) {
          playTone(ctx, {
            startTime: now + 0.08 + i * 0.05,
            duration: 0.24,
            type: 'sine',
            freqStart: 1760 + i * 320,
            freqEnd: 1200 + i * 180,
            gainPeak: 0.085,
            attack: 0.003,
            filterFreq: 6000
          });
        }
        playNoiseBurst(ctx, {
          startTime: now + 0.02,
          duration: 0.42,
          filterType: 'bandpass',
          freqStart: 2600,
          freqEnd: 680,
          q: 2.2,
          gainPeak: 0.24,
          attack: 0.005
        });
      } else if (type === 'queen') {
        // QUEEN: Gravitational Singularity Vacuum -> Astral Supernova Detonation
        // Phase 1: Singularity inward pull
        playTone(ctx, {
          startTime: now,
          duration: 0.16,
          type: 'sawtooth',
          freqStart: 620,
          freqEnd: 55,
          gainPeak: 0.26,
          attack: 0.01,
          filterFreq: 2400
        });
        // Phase 2: Massive Supernova Detonation
        const novaStart = now + 0.05;
        playTone(ctx, {
          startTime: novaStart,
          duration: 1.05,
          type: 'sine',
          freqStart: 130,
          freqEnd: 22,
          gainPeak: 0.52,
          attack: 0.004,
          filterFreq: 360
        });
        playNoiseBurst(ctx, {
          startTime: novaStart,
          duration: 0.95,
          filterType: 'lowpass',
          freqStart: 1800,
          freqEnd: 90,
          q: 1.3,
          gainPeak: 0.44,
          attack: 0.006
        });
        // Royal Astral Supernova Harmonic Fanfare
        const novaChord = [220, 329.63, 440, 554.37, 659.25, 880, 1318.5];
        novaChord.forEach((f, idx) => {
          playTone(ctx, {
            startTime: novaStart + idx * 0.022,
            duration: 1.15,
            type: idx % 2 === 0 ? 'sawtooth' : 'triangle',
            freqStart: f * 0.99,
            freqEnd: f * 1.01,
            gainPeak: 0.085,
            attack: 0.015,
            filterFreq: 3800
          });
        });
        // Shimmering stardust crystal cascade
        for (let i = 0; i < 8; i++) {
          playTone(ctx, {
            startTime: novaStart + 0.12 + i * 0.06,
            duration: 0.32,
            type: 'sine',
            freqStart: 1480 + (i % 4) * 440,
            freqEnd: 2200 + i * 180,
            gainPeak: 0.07,
            attack: 0.004,
            filterFreq: 6500
          });
        }
      } else {
        // KING: Sovereign Execution Apocalypse + Tolling Cathedral Doom Bell + Thunder Cataclysm
        // Tolling Cathedral Doom Bell harmonics
        const bellPartials = [110, 220, 261.63, 329.63, 440, 622.25, 880];
        bellPartials.forEach((f, idx) => {
          playTone(ctx, {
            startTime: now,
            duration: 1.65 - idx * 0.12,
            type: idx % 2 === 0 ? 'triangle' : 'sine',
            freqStart: f,
            freqEnd: f * 0.995,
            gainPeak: 0.14 / (1 + idx * 0.25),
            attack: 0.004,
            filterFreq: 3600
          });
        });
        // Apocalyptic sub-bass cataclysm drop
        playTone(ctx, {
          startTime: now,
          duration: 1.35,
          type: 'sine',
          freqStart: 145,
          freqEnd: 20,
          gainPeak: 0.56,
          attack: 0.004,
          filterFreq: 320
        });
        playNoiseBurst(ctx, {
          startTime: now,
          duration: 1.25,
          filterType: 'lowpass',
          freqStart: 2200,
          freqEnd: 65,
          q: 1.4,
          gainPeak: 0.48,
          attack: 0.005
        });
        // Secondary royal crown shatter burst
        playNoiseBurst(ctx, {
          startTime: now + 0.18,
          duration: 0.65,
          filterType: 'bandpass',
          freqStart: 2400,
          freqEnd: 380,
          q: 2.0,
          gainPeak: 0.32,
          attack: 0.005
        });
      }
    } catch (e) {}
  }

  // ==========================================================================
  // 3D Visual Effects (VFX) System & Piece-Specific Kill Choreography
  // ==========================================================================
  const activeVfxupdaters = [];
  let cameraShakeState = {
    elapsed: 0,
    duration: 0,
    amp: 0
  };

  // Shared procedural geometries for high-performance VFX spawning
  const sharedRingGeo = new THREE.RingGeometry(0.72, 1.0, 48);
  sharedRingGeo.rotateX(-Math.PI / 2);

  const sharedThinRingGeo = new THREE.RingGeometry(0.88, 1.0, 48);
  sharedThinRingGeo.rotateX(-Math.PI / 2);

  const sharedDiscGeo = new THREE.CircleGeometry(1.0, 40);
  sharedDiscGeo.rotateX(-Math.PI / 2);

  const sharedPillarGeo = new THREE.CylinderGeometry(1.0, 1.0, 1.0, 28, 1, true);
  sharedPillarGeo.translate(0, 0.5, 0);

  const sharedConeSpireGeo = new THREE.ConeGeometry(0.12, 0.65, 6);
  sharedConeSpireGeo.translate(0, 0.325, 0);

  const sharedOctaGeo = new THREE.OctahedronGeometry(1.0, 0);
  const sharedSphereGeo = new THREE.SphereGeometry(1.0, 24, 18);
  const sharedDomeGeo = new THREE.SphereGeometry(1.0, 28, 16, 0, Math.PI * 2, 0, Math.PI * 0.5);
  const sharedSlashArcGeo = new THREE.TorusGeometry(0.32, 0.026, 10, 32, Math.PI * 1.15);
  const sharedSparkGeo = new THREE.OctahedronGeometry(0.022, 0);

  function addVfxUpdater(group, duration, onStep, disposableMaterials = [], disposableGeometries = []) {
    scene.add(group);
    let elapsed = 0;
    activeVfxupdaters.push({
      group,
      step(dt) {
        elapsed += dt;
        const u = Math.min(1, elapsed / Math.max(0.001, duration));
        onStep(u, elapsed, dt);
        if (elapsed >= duration) {
          scene.remove(group);
          for (const m of disposableMaterials) {
            if (m && typeof m.dispose === 'function') m.dispose();
          }
          for (const g of disposableGeometries) {
            if (g && typeof g.dispose === 'function') g.dispose();
          }
          return true;
        }
        return false;
      },
      disposeNow() {
        scene.remove(group);
        for (const m of disposableMaterials) {
          if (m && typeof m.dispose === 'function') m.dispose();
        }
        for (const g of disposableGeometries) {
          if (g && typeof g.dispose === 'function') g.dispose();
        }
      }
    });
  }

  function triggerCameraShake(amp = 0.04, duration = 0.42) {
    if (amp > cameraShakeState.amp || cameraShakeState.elapsed >= cameraShakeState.duration) {
      cameraShakeState.amp = amp;
      cameraShakeState.duration = duration;
      cameraShakeState.elapsed = 0;
    }
  }

  // Subtle selection / move landing ring VFX
  function spawnSquarePulseVfx(worldPos, colorHex = 0xf5d76e, maxRadius = 0.24, duration = 0.42) {
    const group = new THREE.Group();
    group.position.set(worldPos.x, boardSurfaceY + 0.011, worldPos.z);

    const mat = new THREE.MeshBasicMaterial({
      color: colorHex,
      transparent: true,
      opacity: 0.85,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });
    const ring = new THREE.Mesh(sharedThinRingGeo, mat);
    group.add(ring);

    addVfxUpdater(
      group,
      duration,
      (u) => {
        const ease = 1 - Math.pow(1 - u, 3);
        const r = 0.06 + (maxRadius - 0.06) * ease;
        ring.scale.set(r, 1, r);
        mat.opacity = 0.85 * (1 - u);
      },
      [mat]
    );
  }

  // Pre-shatter weapon contact spark & parry ring burst
  function spawnWeaponContactVfx(worldPos, dirX = 0, dirZ = 1, victimType = 'pawn') {
    const prof = PIECE_KILL_PROFILES[victimType] || PIECE_KILL_PROFILES.pawn;
    const group = new THREE.Group();
    group.position.set(worldPos.x - dirX * 0.06, boardSurfaceY + 0.24, worldPos.z - dirZ * 0.06);

    const slashMat = new THREE.MeshBasicMaterial({
      color: prof.primaryHex,
      transparent: true,
      opacity: 0.95,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });
    const slashMesh = new THREE.Mesh(sharedSlashArcGeo, slashMat);
    slashMesh.rotation.x = Math.PI * 0.38;
    slashMesh.rotation.y = Math.atan2(dirX, dirZ);
    group.add(slashMesh);

    const flashMat = new THREE.MeshBasicMaterial({
      color: prof.coreHex,
      transparent: true,
      opacity: 0.95,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });
    const flashSphere = new THREE.Mesh(sharedSphereGeo, flashMat);
    flashSphere.scale.setScalar(0.05);
    group.add(flashSphere);

    // 14 directional parry sparks
    const sparks = [];
    for (let i = 0; i < 14; i++) {
      const spMesh = new THREE.Mesh(sharedSparkGeo, i % 2 === 0 ? flashMat : slashMat);
      const ang = (i / 14) * Math.PI * 2;
      sparks.push({
        mesh: spMesh,
        vx: Math.cos(ang) * (0.65 + Math.random() * 0.85) + dirX * 0.35,
        vy: 0.35 + Math.random() * 0.95,
        vz: Math.sin(ang) * (0.65 + Math.random() * 0.85) + dirZ * 0.35
      });
      group.add(spMesh);
    }

    addVfxUpdater(
      group,
      0.32,
      (u, elapsed, dt) => {
        const s = 0.45 + u * 1.15;
        slashMesh.scale.set(s, s, s);
        slashMesh.rotation.z += dt * 14.0;
        slashMat.opacity = 0.95 * (1 - u);

        const coreS = 0.06 + Math.sin(u * Math.PI) * 0.14;
        flashSphere.scale.setScalar(coreS);
        flashMat.opacity = 0.95 * (1 - u * u);

        for (const sp of sparks) {
          sp.mesh.position.x += sp.vx * dt;
          sp.mesh.position.y += sp.vy * dt;
          sp.mesh.position.z += sp.vz * dt;
          sp.vy -= 4.5 * dt;
          sp.mesh.scale.setScalar(Math.max(0.05, 1 - u));
        }
      },
      [slashMat, flashMat]
    );
  }

  // Helper to build a jagged 3D lightning bolt mesh from sky to board
  function buildJaggedLightningGeometry(height = 3.6, segments = 14, jitter = 0.14, radius = 0.018) {
    const pts = [];
    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const fade = Math.sin(t * Math.PI);
      const ox = (Math.random() - 0.5) * 2 * jitter * fade;
      const oz = (Math.random() - 0.5) * 2 * jitter * fade;
      pts.push(new THREE.Vector3(ox, t * height, oz));
    }
    const curve = new THREE.CatmullRomCurve3(pts);
    return new THREE.TubeGeometry(curve, segments * 2, radius, 6, false);
  }

  // ==========================================================================
  // Master Piece-Specific 3D Kill Spectacle Spawner
  // ==========================================================================
  function spawnPieceKillVfx(worldPos, victimType = 'pawn', victimColor = 'b', attackerType = 'queen', dirX = 0, dirZ = 1) {
    const type = String(victimType || 'pawn').toLowerCase();
    const prof = PIECE_KILL_PROFILES[type] || PIECE_KILL_PROFILES.pawn;

    triggerCameraShake(prof.shakeAmp, prof.shakeDuration);

    const group = new THREE.Group();
    group.position.set(worldPos.x, boardSurfaceY, worldPos.z);

    const matsToDispose = [];
    const geosToDispose = [];

    const primaryMat = new THREE.MeshBasicMaterial({
      color: prof.primaryHex,
      transparent: true,
      opacity: 0.95,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });
    const secondaryMat = new THREE.MeshBasicMaterial({
      color: prof.secondaryHex,
      transparent: true,
      opacity: 0.90,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });
    const coreMat = new THREE.MeshBasicMaterial({
      color: prof.coreHex,
      transparent: true,
      opacity: 0.98,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });
    const scorchMat = new THREE.MeshBasicMaterial({
      color: prof.primaryHex,
      transparent: true,
      opacity: 0.52,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });
    matsToDispose.push(primaryMat, secondaryMat, coreMat, scorchMat);

    // Ground battle-scorch / runic imprint disc
    const scorchDisc = new THREE.Mesh(sharedDiscGeo, scorchMat);
    scorchDisc.position.y = 0.008;
    scorchDisc.scale.setScalar(0.19);
    group.add(scorchDisc);

    // Expanding primary & secondary shockwave rings
    const waveRing1 = new THREE.Mesh(sharedRingGeo, primaryMat);
    waveRing1.position.y = 0.014;
    group.add(waveRing1);

    const waveRing2 = new THREE.Mesh(sharedThinRingGeo, secondaryMat);
    waveRing2.position.y = 0.018;
    group.add(waveRing2);

    // Central detonation core sphere
    const coreSphere = new THREE.Mesh(sharedSphereGeo, coreMat);
    coreSphere.position.y = 0.22;
    coreSphere.scale.setScalar(0.08);
    group.add(coreSphere);

    // Rising ember / energy motes common to all kills, customized in velocity & motion per piece
    const motes = [];
    const moteCount = type === 'king' ? 42 : type === 'queen' ? 36 : 24;
    for (let i = 0; i < moteCount; i++) {
      const mMesh = new THREE.Mesh(
        sharedSparkGeo,
        i % 3 === 0 ? coreMat : i % 2 === 0 ? primaryMat : secondaryMat
      );
      const ang = (i / moteCount) * Math.PI * 2 + Math.random() * 0.3;
      const rad = 0.04 + Math.random() * 0.14;
      mMesh.position.set(Math.cos(ang) * rad, 0.08 + Math.random() * 0.24, Math.sin(ang) * rad);
      group.add(mMesh);
      motes.push({
        mesh: mMesh,
        ang,
        rad,
        vy: 0.75 + Math.random() * 1.65,
        vr: 0.35 + Math.random() * 0.95,
        spin: (Math.random() - 0.5) * 8,
        scale: 0.7 + Math.random() * 0.9
      });
    }

    // ========================================================================
    // 1. PAWN: VANGUARD SHIELD-BREAKER (Dual Cleave Arcs + Fracturing Buckler)
    // ========================================================================
    if (type === 'pawn') {
      const cleave1 = new THREE.Mesh(sharedSlashArcGeo, coreMat);
      cleave1.position.y = 0.22;
      cleave1.rotation.set(Math.PI * 0.25, Math.atan2(dirX, dirZ), 0.35);
      group.add(cleave1);

      const cleave2 = new THREE.Mesh(sharedSlashArcGeo, primaryMat);
      cleave2.position.y = 0.22;
      cleave2.rotation.set(-Math.PI * 0.25, Math.atan2(dirX, dirZ) + 0.4, -0.45);
      group.add(cleave2);

      // Vertical shield-ring that fractures outward
      const shieldRing = new THREE.Mesh(sharedRingGeo, secondaryMat);
      shieldRing.position.set(0, 0.22, 0);
      shieldRing.rotation.x = Math.PI / 2;
      shieldRing.rotation.y = Math.atan2(dirX, dirZ);
      group.add(shieldRing);

      addVfxUpdater(
        group,
        1.15,
        (u, elapsed, dt) => {
          const fastU = Math.min(1, u * 1.8);
          const ease = 1 - Math.pow(1 - fastU, 3);

          waveRing1.scale.setScalar(0.10 + ease * 0.46);
          waveRing2.scale.setScalar(0.08 + ease * 0.62);
          coreSphere.scale.setScalar(0.06 + Math.sin(fastU * Math.PI) * 0.18);

          cleave1.scale.setScalar(0.55 + ease * 1.35);
          cleave1.rotation.z += dt * 11;
          cleave2.scale.setScalar(0.45 + ease * 1.55);
          cleave2.rotation.z -= dt * 13;

          shieldRing.scale.setScalar(0.12 + ease * 0.38);
          shieldRing.position.x = dirX * ease * 0.14;
          shieldRing.position.z = dirZ * ease * 0.14;

          primaryMat.opacity = 0.95 * Math.pow(1 - u, 1.4);
          secondaryMat.opacity = 0.90 * Math.pow(1 - u, 1.6);
          coreMat.opacity = 0.98 * Math.pow(1 - fastU, 1.8);
          scorchMat.opacity = 0.50 * (1 - u * u);

          for (const m of motes) {
            m.mesh.position.x += Math.cos(m.ang) * m.vr * dt;
            m.mesh.position.z += Math.sin(m.ang) * m.vr * dt;
            m.mesh.position.y += m.vy * dt;
            m.vy -= 2.8 * dt;
            m.mesh.scale.setScalar(m.scale * Math.max(0.01, 1 - u));
          }
        },
        matsToDispose,
        geosToDispose
      );
      return;
    }

    // ========================================================================
    // 2. ROOK: CITADEL SEISMIC CATACLYSM (Magma Plume + Erupting Rock Spires)
    // ========================================================================
    if (type === 'rook') {
      const plumeMesh = new THREE.Mesh(sharedPillarGeo, primaryMat);
      plumeMesh.scale.set(0.18, 0.05, 0.18);
      group.add(plumeMesh);

      const waveRing3 = new THREE.Mesh(sharedRingGeo, coreMat);
      waveRing3.position.y = 0.022;
      group.add(waveRing3);

      // 8 Erupting tectonic rock monolith spikes around the Rook's square
      const spires = [];
      for (let i = 0; i < 8; i++) {
        const ang = (i / 8) * Math.PI * 2;
        const spireMesh = new THREE.Mesh(
          sharedConeSpireGeo,
          i % 2 === 0 ? primaryMat : secondaryMat
        );
        const r = 0.16 + (i % 2) * 0.07;
        spireMesh.position.set(Math.cos(ang) * r, -0.25, Math.sin(ang) * r);
        // Tilt outward from center
        spireMesh.rotation.z = -Math.cos(ang) * 0.34;
        spireMesh.rotation.x = Math.sin(ang) * 0.34;
        group.add(spireMesh);
        spires.push({ mesh: spireMesh, peakH: 0.42 + (i % 3) * 0.14 });
      }

      addVfxUpdater(
        group,
        1.55,
        (u, elapsed, dt) => {
          const ease = 1 - Math.pow(1 - u, 3);
          waveRing1.scale.setScalar(0.14 + ease * 0.88);
          waveRing2.scale.setScalar(0.10 + ease * 1.12);
          waveRing3.scale.setScalar(0.08 + Math.min(1, u * 1.6) * 0.65);

          const plumeH = Math.sin(Math.min(1, u * 1.5) * Math.PI) * 1.45;
          const plumeR = 0.16 + ease * 0.22;
          plumeMesh.scale.set(plumeR, Math.max(0.02, plumeH), plumeR);
          plumeMesh.rotation.y += dt * 4.5;

          coreSphere.scale.setScalar(0.12 + Math.sin(Math.min(1, u * 2.0) * Math.PI) * 0.28);

          // Tectonic spires thrust up rapidly then sink back into the altar
          const spireCurve = u < 0.28 ? ease / 0.28 : Math.max(0, 1 - (u - 0.28) / 0.72);
          for (const sp of spires) {
            sp.mesh.position.y = -0.22 + spireCurve * sp.peakH;
          }

          primaryMat.opacity = 0.95 * Math.pow(1 - u, 1.3);
          secondaryMat.opacity = 0.90 * Math.pow(1 - u, 1.4);
          coreMat.opacity = 0.98 * Math.pow(1 - u, 1.8);
          scorchDisc.scale.setScalar(0.28 + ease * 0.12);
          scorchMat.opacity = 0.65 * (1 - u * u);

          for (const m of motes) {
            m.mesh.position.x += Math.cos(m.ang) * m.vr * 1.2 * dt;
            m.mesh.position.z += Math.sin(m.ang) * m.vr * 1.2 * dt;
            m.mesh.position.y += m.vy * 1.15 * dt;
            m.vy -= 2.2 * dt;
            m.mesh.scale.setScalar(m.scale * 1.25 * Math.max(0.01, 1 - u));
          }
        },
        matsToDispose,
        geosToDispose
      );
      return;
    }

    // ========================================================================
    // 3. KNIGHT: TEMPEST VALKYRIE THUNDERSTRIKE (3 Sky Lightning Bolts + Cyclone)
    // ========================================================================
    if (type === 'knight') {
      const boltMeshes = [];
      for (let b = 0; b < 3; b++) {
        const bGeo = buildJaggedLightningGeometry(
          3.8,
          16,
          0.16 + b * 0.04,
          b === 0 ? 0.024 : 0.014
        );
        geosToDispose.push(bGeo);
        const bMesh = new THREE.Mesh(bGeo, b === 0 ? coreMat : primaryMat);
        bMesh.rotation.y = (b * Math.PI * 2) / 3;
        group.add(bMesh);
        boltMeshes.push(bMesh);
      }

      // 4 Ascending plasma cyclone rings
      const cycloneRings = [];
      for (let c = 0; c < 4; c++) {
        const cRing = new THREE.Mesh(
          sharedThinRingGeo,
          c % 2 === 0 ? primaryMat : secondaryMat
        );
        cRing.position.y = 0.12 + c * 0.18;
        group.add(cRing);
        cycloneRings.push({ mesh: cRing, idx: c });
      }

      addVfxUpdater(
        group,
        1.38,
        (u, elapsed, dt) => {
          const ease = 1 - Math.pow(1 - u, 3);
          waveRing1.scale.setScalar(0.12 + ease * 0.82);
          waveRing2.scale.setScalar(0.08 + ease * 1.05);

          // Flickering high-voltage lightning bolts
          const boltLife = Math.max(0, 1 - u * 1.65);
          const flicker = boltLife > 0 ? 0.55 + 0.45 * Math.sin(elapsed * 75) : 0;
          for (let i = 0; i < boltMeshes.length; i++) {
            const bm = boltMeshes[i];
            bm.visible = boltLife > 0.02;
            bm.rotation.y += dt * (i % 2 === 0 ? 8 : -8);
            const sXZ = (0.7 + 0.6 * flicker) * boltLife;
            bm.scale.set(sXZ, 1, sXZ);
          }

          // Expanding spiral plasma vortex
          for (const cr of cycloneRings) {
            const hNorm = (cr.idx + 1) / 4;
            cr.mesh.position.y = 0.08 + cr.idx * 0.22 + u * 0.55 * hNorm;
            const rScale = (0.14 + cr.idx * 0.07) * (1 + ease * 1.45);
            cr.mesh.scale.set(rScale, 1, rScale);
            cr.mesh.rotation.x = Math.sin(elapsed * 8 + cr.idx) * 0.22;
            cr.mesh.rotation.z = Math.cos(elapsed * 8 + cr.idx) * 0.22;
          }

          coreSphere.scale.setScalar(0.10 + Math.sin(Math.min(1, u * 2.2) * Math.PI) * 0.26);
          primaryMat.opacity = 0.95 * Math.pow(1 - u, 1.35);
          secondaryMat.opacity = 0.90 * Math.pow(1 - u, 1.45);
          coreMat.opacity = 0.98 * Math.pow(1 - u, 1.65);
          scorchMat.opacity = 0.58 * (1 - u * u);

          for (const m of motes) {
            m.ang += dt * 7.5;
            const curR = m.rad + ease * 0.42;
            m.mesh.position.x = Math.cos(m.ang) * curR;
            m.mesh.position.z = Math.sin(m.ang) * curR;
            m.mesh.position.y += m.vy * 1.25 * dt;
            m.mesh.scale.setScalar(m.scale * Math.max(0.01, 1 - u));
          }
        },
        matsToDispose,
        geosToDispose
      );
      return;
    }

    // ========================================================================
    // 4. BISHOP: CELESTIAL JUDGEMENT BEAM (Orbital Light Pillar + Sacred Sigil)
    // ========================================================================
    if (type === 'bishop') {
      const innerBeam = new THREE.Mesh(sharedPillarGeo, coreMat);
      innerBeam.scale.set(0.095, 4.2, 0.095);
      group.add(innerBeam);

      const outerBeam = new THREE.Mesh(sharedPillarGeo, primaryMat);
      outerBeam.scale.set(0.20, 4.2, 0.20);
      group.add(outerBeam);

      // Sacred geometry runic sigil (counter-rotating square & halo rings on the tile)
      const sigilGroup = new THREE.Group();
      sigilGroup.position.y = 0.016;
      const sqGeo = new THREE.RingGeometry(0.19, 0.22, 4);
      sqGeo.rotateX(-Math.PI / 2);
      geosToDispose.push(sqGeo);
      const sq1 = new THREE.Mesh(sqGeo, primaryMat);
      const sq2 = new THREE.Mesh(sqGeo, secondaryMat);
      sq2.rotation.y = Math.PI / 4;
      sigilGroup.add(sq1, sq2);
      group.add(sigilGroup);

      // 6 Levitating sacred octahedron crystals ascending in a helix
      const crystals = [];
      for (let i = 0; i < 6; i++) {
        const cMesh = new THREE.Mesh(sharedOctaGeo, i % 2 === 0 ? primaryMat : secondaryMat);
        cMesh.scale.setScalar(0.042);
        group.add(cMesh);
        crystals.push({ mesh: cMesh, baseAng: (i / 6) * Math.PI * 2 });
      }

      addVfxUpdater(
        group,
        1.52,
        (u, elapsed, dt) => {
          const ease = 1 - Math.pow(1 - u, 3);
          waveRing1.scale.setScalar(0.12 + ease * 0.72);
          waveRing2.scale.setScalar(0.08 + ease * 0.92);

          // Orbital beam swells then narrows into a razor laser before vanishing
          const beamEnv = u < 0.18 ? u / 0.18 : Math.max(0, 1 - (u - 0.18) / 0.82);
          const innerR = 0.11 * beamEnv;
          const outerR = (0.22 + Math.sin(elapsed * 18) * 0.03) * beamEnv;
          innerBeam.scale.set(Math.max(0.004, innerR), 4.2, Math.max(0.004, innerR));
          outerBeam.scale.set(Math.max(0.008, outerR), 4.2, Math.max(0.008, outerR));

          sigilGroup.rotation.y += dt * 3.2;
          const sigilScale = 1.0 + ease * 0.95;
          sigilGroup.scale.set(sigilScale, 1, sigilScale);

          for (const cr of crystals) {
            const ang = cr.baseAng + elapsed * 4.2;
            const rad = 0.18 + ease * 0.16;
            cr.mesh.position.set(
              Math.cos(ang) * rad,
              0.12 + ease * 1.35,
              Math.sin(ang) * rad
            );
            cr.mesh.rotation.x += dt * 5;
            cr.mesh.rotation.y += dt * 6;
            cr.mesh.scale.setScalar(0.045 * (1 - u));
          }

          coreSphere.scale.setScalar(0.11 + Math.sin(Math.min(1, u * 2.0) * Math.PI) * 0.22);
          primaryMat.opacity = 0.95 * Math.pow(1 - u, 1.3);
          secondaryMat.opacity = 0.90 * Math.pow(1 - u, 1.4);
          coreMat.opacity = 0.98 * Math.pow(1 - u, 1.5);
          scorchMat.opacity = 0.55 * (1 - u * u);

          for (const m of motes) {
            m.ang += dt * 3.8;
            m.mesh.position.x = Math.cos(m.ang) * (m.rad + u * 0.12);
            m.mesh.position.z = Math.sin(m.ang) * (m.rad + u * 0.12);
            m.mesh.position.y += m.vy * 1.15 * dt;
            m.mesh.scale.setScalar(m.scale * Math.max(0.01, 1 - u));
          }
        },
        matsToDispose,
        geosToDispose
      );
      return;
    }

    // ========================================================================
    // 5. QUEEN: ASTRAL SUPERNOVA OBLITERATION (Singularity + 3D Gyro Nova Rings)
    // ========================================================================
    if (type === 'queen') {
      // 3 Tilted 3D gyroscopic astral shockwave rings
      const gyroRings = [];
      for (let g = 0; g < 3; g++) {
        const gMesh = new THREE.Mesh(
          sharedThinRingGeo,
          g === 0 ? coreMat : g === 1 ? primaryMat : secondaryMat
        );
        gMesh.position.y = 0.28;
        gMesh.rotation.x = (g * Math.PI) / 3.2 + 0.4;
        gMesh.rotation.z = (g * Math.PI) / 2.6;
        group.add(gMesh);
        gyroRings.push(gMesh);
      }

      // 12 Radial light-spear rays shooting outward from the singularity core
      const lightSpears = [];
      for (let s = 0; s < 12; s++) {
        const spMesh = new THREE.Mesh(
          sharedConeSpireGeo,
          s % 2 === 0 ? coreMat : secondaryMat
        );
        spMesh.position.y = 0.28;
        const theta = (s / 12) * Math.PI * 2;
        const phi = ((s % 3) - 1) * 0.42;
        const dir = new THREE.Vector3(
          Math.cos(theta) * Math.cos(phi),
          Math.sin(phi) + 0.25,
          Math.sin(theta) * Math.cos(phi)
        ).normalize();
        spMesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
        group.add(spMesh);
        lightSpears.push({ mesh: spMesh, dir });
      }

      addVfxUpdater(
        group,
        1.78,
        (u, elapsed, dt) => {
          // First 12% is singularity implosion pull, then massive supernova expansion
          if (u < 0.12) {
            const pU = u / 0.12;
            const shrink = 1 - pU * 0.72;
            coreSphere.scale.setScalar(0.28 * shrink);
            waveRing1.scale.setScalar(0.32 * shrink);
            waveRing2.scale.setScalar(0.42 * shrink);
          } else {
            const expU = (u - 0.12) / 0.88;
            const ease = 1 - Math.pow(1 - expU, 3);
            waveRing1.scale.setScalar(0.12 + ease * 1.18);
            waveRing2.scale.setScalar(0.08 + ease * 1.45);
            coreSphere.scale.setScalar(0.14 + Math.sin(Math.min(1, expU * 1.8) * Math.PI) * 0.42);

            for (let i = 0; i < gyroRings.length; i++) {
              const gr = gyroRings[i];
              const gScale = 0.12 + ease * (0.78 + i * 0.18);
              gr.scale.setScalar(gScale);
              gr.rotation.x += dt * (3.5 + i);
              gr.rotation.y += dt * (4.2 - i);
            }

            for (const sp of lightSpears) {
              const dist = ease * 0.68;
              sp.mesh.position.set(
                sp.dir.x * dist,
                0.28 + sp.dir.y * dist,
                sp.dir.z * dist
              );
              const sFactor = Math.max(0.01, (1 - expU) * 1.25);
              sp.mesh.scale.set(sFactor * 0.55, sFactor * 1.35, sFactor * 0.55);
            }
          }

          primaryMat.opacity = 0.96 * Math.pow(1 - u, 1.25);
          secondaryMat.opacity = 0.92 * Math.pow(1 - u, 1.35);
          coreMat.opacity = 0.99 * Math.pow(1 - u, 1.5);
          scorchDisc.scale.setScalar(0.32 + u * 0.18);
          scorchMat.opacity = 0.68 * (1 - u * u);

          for (const m of motes) {
            m.ang += dt * 5.2;
            const r = m.rad + u * 0.65;
            m.mesh.position.x = Math.cos(m.ang) * r;
            m.mesh.position.z = Math.sin(m.ang) * r;
            m.mesh.position.y += m.vy * 1.3 * dt;
            m.mesh.scale.setScalar(m.scale * 1.3 * Math.max(0.01, 1 - u));
          }
        },
        matsToDispose,
        geosToDispose
      );
      return;
    }

    // ========================================================================
    // 6. KING: SOVEREIGN EXECUTION APOCALYPSE (Doom Dome + 5 Sky Bolts + Crown)
    // ========================================================================
    const doomDome = new THREE.Mesh(sharedDomeGeo, primaryMat);
    doomDome.scale.setScalar(0.15);
    group.add(doomDome);

    const innerBeam = new THREE.Mesh(sharedPillarGeo, coreMat);
    innerBeam.scale.set(0.14, 4.8, 0.14);
    group.add(innerBeam);

    const kingBolts = [];
    for (let b = 0; b < 5; b++) {
      const bGeo = buildJaggedLightningGeometry(4.4, 18, 0.22, 0.022);
      geosToDispose.push(bGeo);
      const bMesh = new THREE.Mesh(bGeo, b % 2 === 0 ? coreMat : secondaryMat);
      const ang = (b / 5) * Math.PI * 2;
      bMesh.position.set(Math.cos(ang) * 0.12, 0, Math.sin(ang) * 0.12);
      bMesh.rotation.y = ang;
      group.add(bMesh);
      kingBolts.push(bMesh);
    }

    // Ascending Sovereign Crown Ring of 8 golden spires that shatters outward
    const crownSpires = [];
    for (let c = 0; c < 8; c++) {
      const sp = new THREE.Mesh(sharedConeSpireGeo, secondaryMat);
      const ang = (c / 8) * Math.PI * 2;
      sp.position.set(Math.cos(ang) * 0.18, 0.42, Math.sin(ang) * 0.18);
      group.add(sp);
      crownSpires.push({ mesh: sp, ang });
    }

    addVfxUpdater(
      group,
      2.15,
      (u, elapsed, dt) => {
        const ease = 1 - Math.pow(1 - u, 3);
        waveRing1.scale.setScalar(0.16 + ease * 1.55);
        waveRing2.scale.setScalar(0.12 + ease * 1.85);

        const domeScale = 0.16 + ease * 1.25;
        doomDome.scale.setScalar(domeScale);
        doomDome.rotation.y += dt * 2.5;

        const beamEnv = Math.max(0, 1 - u * 1.35);
        innerBeam.scale.set(0.16 * beamEnv, 4.8, 0.16 * beamEnv);

        for (let i = 0; i < kingBolts.length; i++) {
          const kb = kingBolts[i];
          kb.visible = u < 0.72;
          kb.rotation.y += dt * (i % 2 === 0 ? 7 : -7);
          const bS = Math.max(0.01, (1 - u / 0.72) * (0.8 + 0.4 * Math.sin(elapsed * 65 + i)));
          kb.scale.set(bS, 1, bS);
        }

        for (const cs of crownSpires) {
          const rad = 0.18 + ease * 0.62;
          cs.mesh.position.set(
            Math.cos(cs.ang + elapsed * 2.2) * rad,
            0.38 + ease * 0.95,
            Math.sin(cs.ang + elapsed * 2.2) * rad
          );
          cs.mesh.rotation.x += dt * 4;
          cs.mesh.rotation.z += dt * 5;
          cs.mesh.scale.setScalar(Math.max(0.01, (1 - u) * 0.95));
        }

        coreSphere.scale.setScalar(0.16 + Math.sin(Math.min(1, u * 1.8) * Math.PI) * 0.48);
        primaryMat.opacity = 0.92 * Math.pow(1 - u, 1.25);
        secondaryMat.opacity = 0.94 * Math.pow(1 - u, 1.3);
        coreMat.opacity = 0.98 * Math.pow(1 - u, 1.45);
        scorchDisc.scale.setScalar(0.38 + ease * 0.24);
        scorchMat.opacity = 0.72 * (1 - u * u);

        for (const m of motes) {
          m.ang += dt * 4.5;
          const r = m.rad + ease * 0.85;
          m.mesh.position.x = Math.cos(m.ang) * r;
          m.mesh.position.z = Math.sin(m.ang) * r;
          m.mesh.position.y += m.vy * 1.4 * dt;
          m.mesh.scale.setScalar(m.scale * 1.4 * Math.max(0.01, 1 - u));
        }
      },
      matsToDispose,
      geosToDispose
    );
  }

  function clearAllVfx() {
    for (let i = activeVfxupdaters.length - 1; i >= 0; i--) {
      activeVfxupdaters[i].disposeNow();
    }
    activeVfxupdaters.length = 0;
    cameraShakeState.duration = 0;
    cameraShakeState.amp = 0;
  }

  function update(dt, camera) {
    for (let i = activeVfxupdaters.length - 1; i >= 0; i--) {
      const done = activeVfxupdaters[i].step(dt);
      if (done) {
        activeVfxupdaters.splice(i, 1);
      }
    }

    if (camera && cameraShakeState.elapsed < cameraShakeState.duration) {
      cameraShakeState.elapsed += dt;
      const u = Math.min(1, cameraShakeState.elapsed / Math.max(0.001, cameraShakeState.duration));
      const decay = (1 - u) * (1 - u);
      const amp = cameraShakeState.amp * decay;
      const t = cameraShakeState.elapsed * 58;
      camera.position.x += Math.sin(t * 1.13) * amp * 0.65;
      camera.position.y += Math.cos(t * 1.47) * amp;
      camera.position.z += Math.sin(t * 0.91) * amp * 0.65;
    }
  }

  function setSfxEnabled(enabled) {
    sfxEnabled = Boolean(enabled);
    try {
      localStorage.setItem('wizard_chess_sfx_enabled', String(sfxEnabled));
    } catch (e) {}
    if (sfxEnabled) {
      playSelectSfx('queen');
    }
    window.dispatchEvent(
      new CustomEvent('wizardchess:sfxchange', { detail: { sfxEnabled } })
    );
    return sfxEnabled;
  }

  return {
    getSfxEnabled: () => sfxEnabled,
    setSfxEnabled,
    playSelectSfx,
    playMoveStartSfx,
    playMoveLandSfx,
    playAttackChargeAndSwingSfx,
    playWeaponContactClashSfx,
    playPromotionSfx,
    playPieceKillSfx,
    spawnSquarePulseVfx,
    spawnWeaponContactVfx,
    spawnPieceKillVfx,
    clearAllVfx,
    update
  };
}
