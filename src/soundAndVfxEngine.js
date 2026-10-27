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
    subtitle: 'Heavy Steel Cleave & Iron Buckler Shatter',
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
    subtitle: 'Siege Warhammer Crush & Battlement Collapse',
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
    subtitle: 'Lance Steel Clash & Plate Barding Rupture',
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
    title: 'SANCTUM RELIQUARY JUDGEMENT',
    subtitle: 'Flanged Steel Cleave & Gothic Stone Shatter',
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
    title: 'ROYAL BLADESTORM OBLITERATION',
    subtitle: 'Twin-Blade Flurry, Crown Sunder & Marble Collapse',
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
    subtitle: 'Executioner Greatsword Cleave & Tolling Doom Bell',
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
// Mixkit Sound Effects (SFX) Engine
// Sourced from https://mixkit.co/free-sound-effects/discover/slash/
// and Mixkit Sword, Battle, Armor, Rock & Fantasy Sound Libraries
// ============================================================================
export const MIXKIT_SFX_MANIFEST = {
  // Core Mixkit /discover/slash/ collection
  slash_swoosh_1476: '/sfx/slash_swoosh_1476.mp3',           // Mixkit #1476: Sword slash swoosh
  battle_slashes_2763: '/sfx/battle_slashes_2763.mp3',       // Mixkit #2763: Sword slashes in battle
  slash_hit_2796: '/sfx/slash_hit_2796.mp3',                 // Mixkit #2796: Sword gore slash hit

  // Blade Draws & Sword Slides
  sword_slide_2798: '/sfx/sword_slide_2798.mp3',             // Mixkit #2798: Fantasy sword slide
  sword_scrape_2799: '/sfx/sword_scrape_2799.mp3',           // Mixkit #2799: Metallic sword scrape
  medieval_blade_2766: '/sfx/medieval_blade_2766.mp3',       // Mixkit #2766: Medieval metal sword blade

  // High-Velocity Air Slashes & Blade Swishes
  fast_sword_whoosh_2792: '/sfx/fast_sword_whoosh_2792.mp3', // Mixkit #2792: Fast sword whoosh
  sword_swish_1506: '/sfx/sword_swish_1506.mp3',             // Mixkit #1506: Sword blade swish
  metal_hit_woosh_1485: '/sfx/metal_hit_woosh_1485.mp3',     // Mixkit #1485: Metal hit woosh
  magic_sword_slice_2793: '/sfx/magic_sword_slice_2793.mp3', // Mixkit #2793: Quick magic sword slice

  // Steel-on-Steel Parry Clashes & Weapon Strikes
  metallic_strike_2160: '/sfx/metallic_strike_2160.mp3',     // Mixkit #2160: Metallic sword strike
  battle_blade_attack_2762: '/sfx/battle_blade_attack_2762.mp3', // Mixkit #2762: Sword blade attack in medieval battle
  fast_battle_hit_2764: '/sfx/fast_battle_hit_2764.mp3',     // Mixkit #2764: Fast sword hit in medieval battle
  sword_hits_metal_2797: '/sfx/sword_hits_metal_2797.mp3',   // Mixkit #2797: Sword hits heavy metal

  // Heavy Cleaves, Armor Pierces & Chainmail Slashes
  heavy_sword_smash_2795: '/sfx/heavy_sword_smash_2795.mp3', // Mixkit #2795: Heavy sword smashes metal
  heavy_sword_hit_2794: '/sfx/heavy_sword_hit_2794.mp3',     // Mixkit #2794: Heavy sword hit
  sword_strikes_armor_2765: '/sfx/sword_strikes_armor_2765.mp3', // Mixkit #2765: Sword strikes armor
  sword_pierces_armor_2761: '/sfx/sword_pierces_armor_2761.mp3', // Mixkit #2761: Sword pierces armor
  chainmail_lash_2776: '/sfx/chainmail_lash_2776.mp3',       // Mixkit #2776: Sword blade lashes chainmail armor
  chainmail_cut_2790: '/sfx/chainmail_cut_2790.mp3',         // Mixkit #2790: Sword cuts a chainmail
  samurai_impact_2789: '/sfx/samurai_impact_2789.mp3',       // Mixkit #2789: Samurai Sword Impact
  axe_plate_hit_2774: '/sfx/axe_plate_hit_2774.mp3',         // Mixkit #2774: Axe hits to a plate

  // Stone Shatter, Debris, Cathedral Bell & Board Movement Foley
  rock_explosion_debris_1703: '/sfx/rock_explosion_debris_1703.mp3', // Mixkit #1703: Explosion with rocks debris
  stones_falling_400: '/sfx/stones_falling_400.mp3',         // Mixkit #400: Stones and rocks falling
  stone_debris_403: '/sfx/stone_debris_403.mp3',             // Mixkit #403: Stone debris falling
  cinematic_bell_619: '/sfx/cinematic_bell_619.mp3',         // Mixkit #619: Cinematic church bell hit
  cinematic_impact_788: '/sfx/cinematic_impact_788.mp3',     // Mixkit #788: Big cinematic impact
  drums_of_war_2780: '/sfx/drums_of_war_2780.mp3',           // Mixkit #2780: Drums of war call
  stone_slide_1528: '/sfx/stone_slide_1528.mp3',             // Mixkit #1528: Magical stone slide
  select_metallic_2609: '/sfx/select_metallic_2609.mp3',     // Mixkit #2609: Whoosh resonating metallic hit
  move_land_thud_2150: '/sfx/move_land_thud_2150.mp3',       // Mixkit #2150: Impact of a blow
  promotion_fanfare_270: '/sfx/promotion_fanfare_270.mp3',   // Mixkit #270: Fantasy game success notification

  // Checked / Victory Fanfare SFX (Mixkit Win & Fanfare Library)
  medieval_victory_fanfare_226: '/sfx/medieval_victory_fanfare_226.mp3', // Mixkit #226: Medieval show fanfare announcement
  horns_victory_fanfare_722: '/sfx/horns_victory_fanfare_722.mp3',       // Mixkit #722: Successful horns fanfare
  grand_brass_fanfare_631: '/sfx/grand_brass_fanfare_631.mp3',           // Mixkit #631: Grand brass fanfare
  achievement_bell_600: '/sfx/achievement_bell_600.mp3',                 // Mixkit #600: Achievement bell

  // Loading Screen Relic Awakening & Transition SFX (Mixkit Magic & Medieval Library)
  loading_magic_sweep_2638: '/sfx/loading_magic_sweep_2638.mp3',         // Mixkit #2638: Magic transition sweep presentation
  loading_magic_ring_2344: '/sfx/loading_magic_ring_2344.mp3',           // Mixkit #2344: Magic notification ring
  medieval_lock_187: '/sfx/medieval_lock_187.mp3',                       // Mixkit #187: Old medieval door lock

  // Lobby UI Click, Tab, Equip & Unlock SFX (Mixkit Click & Win Library)
  lobby_click_select_1109: '/sfx/lobby_click_select_1109.mp3',           // Mixkit #1109: Select click
  lobby_click_tone_2568: '/sfx/lobby_click_tone_2568.mp3',               // Mixkit #2568: Cool interface click tone
  lobby_unlock_item_253: '/sfx/lobby_unlock_item_253.mp3'                // Mixkit #253: Unlock game notification
};

export const MIXKIT_LOBBY_MUSIC_TRACKS = [
  '/sfx/lobby_music_sanctum_614.mp3', // Mixkit #614: Silent Descent (Dark Atmospheric Sanctum Score)
  '/sfx/lobby_music_drums_676.mp3'    // Mixkit #676: Epical Drums 01 (Medieval Sanctum Percussion)
];

export function createSoundAndVfxManager(scene, boardSurfaceY = 0.775) {
  let sfxEnabled = true;
  try {
    const saved = localStorage.getItem('wizard_chess_sfx_enabled');
    if (saved !== null) sfxEnabled = saved !== 'false';
  } catch (e) {}

  let audioCtx = null;
  let masterBusNode = null;

  // Raw ArrayBuffer & decoded AudioBuffer caches for zero-latency Mixkit playback
  const rawBufferCache = new Map();
  const decodedBufferCache = new Map();
  const trimOffsetCache = new Map();
  const decodingPromises = new Map();

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

  let userSfxVolumeMultiplier = 1.0;
  try {
    const savedSfxVol = localStorage.getItem('wizard_chess_sfx_volume');
    if (savedSfxVol !== null) userSfxVolumeMultiplier = Math.max(0, Math.min(1, parseFloat(savedSfxVol)));
  } catch (e) {}

  // Master Dynamics Bus so layered Mixkit sword slashes, clashes, and stone shatters punch cleanly without clipping
  function getMasterBus(ctx) {
    if (masterBusNode && masterBusNode.ctx === ctx) {
      if (masterBusNode.input) {
        masterBusNode.input.gain.value = 1.05 * userSfxVolumeMultiplier;
      }
      return masterBusNode.input;
    }
    try {
      const input = ctx.createGain();
      input.gain.value = 1.05 * userSfxVolumeMultiplier;

      const comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -10;
      comp.knee.value = 8;
      comp.ratio.value = 3.5;
      comp.attack.value = 0.002;
      comp.release.value = 0.14;

      input.connect(comp);
      comp.connect(ctx.destination);

      masterBusNode = { ctx, input };
      return input;
    } catch (e) {
      return ctx.destination;
    }
  }

  // Detect the exact sample where transient audio begins so every Mixkit SFX triggers with zero leading silence
  function computeLeadingSilenceOffset(audioBuffer, threshold = 0.014) {
    try {
      const ch0 = audioBuffer.getChannelData(0);
      const ch1 = audioBuffer.numberOfChannels > 1 ? audioBuffer.getChannelData(1) : null;
      const len = ch0.length;
      for (let i = 0; i < len; i++) {
        const amp = ch1 ? Math.max(Math.abs(ch0[i]), Math.abs(ch1[i])) : Math.abs(ch0[i]);
        if (amp >= threshold) {
          return Math.max(0, (i - 64) / audioBuffer.sampleRate);
        }
      }
    } catch (e) {}
    return 0;
  }

  async function decodeMixkitKey(key, ctx) {
    if (decodedBufferCache.has(key)) return decodedBufferCache.get(key);
    if (decodingPromises.has(key)) return decodingPromises.get(key);

    const url = MIXKIT_SFX_MANIFEST[key];
    if (!url || !ctx) return null;

    const promise = (async () => {
      try {
        let raw = rawBufferCache.get(key);
        if (!raw) {
          const res = await fetch(url);
          if (!res.ok) return null;
          raw = await res.arrayBuffer();
          rawBufferCache.set(key, raw);
        }
        // Slice copy because decodeAudioData detaches the ArrayBuffer
        const copy = raw.slice(0);
        const audioBuf = await ctx.decodeAudioData(copy);
        decodedBufferCache.set(key, audioBuf);
        trimOffsetCache.set(key, computeLeadingSilenceOffset(audioBuf));
        return audioBuf;
      } catch (e) {
        return null;
      } finally {
        decodingPromises.delete(key);
      }
    })();

    decodingPromises.set(key, promise);
    return promise;
  }

  // Eagerly prefetch all Mixkit MP3 files into memory on boot
  function preloadAllMixkitSfx() {
    if (typeof window === 'undefined' || navigator.webdriver) return;
    Object.entries(MIXKIT_SFX_MANIFEST).forEach(([key, url]) => {
      fetch(url)
        .then((res) => (res.ok ? res.arrayBuffer() : null))
        .then((buf) => {
          if (buf) {
            rawBufferCache.set(key, buf);
            if (audioCtx) {
              decodeMixkitKey(key, audioCtx);
            }
          }
        })
        .catch(() => {});
    });
  }

  preloadAllMixkitSfx();

  // Play a Mixkit sound effect with sample-accurate scheduling, pitch/rate control, filter sculpting, and envelope shaping
  function playMixkitClip(key, opts = {}) {
    const ctx = getAudioCtx();
    if (!ctx) return;

    const {
      delay = 0,
      volume = 0.85,
      rate = 1.0,
      detuneCents = 0,
      extraOffset = 0,
      maxDuration = null,
      fadeIn = 0.003,
      fadeOut = 0.06,
      lowpassFreq = null,
      highpassFreq = null,
      pan = 0
    } = opts;

    const triggerFromBuffer = (buf, actualDelay) => {
      if (!buf || !sfxEnabled) return;
      try {
        const startTime = ctx.currentTime + Math.max(0, actualDelay);
        const src = ctx.createBufferSource();
        src.buffer = buf;

        // Slight natural micro-variation if not explicitly fixed
        const jitterRate = rate * (0.985 + Math.random() * 0.03);
        src.playbackRate.setValueAtTime(Math.max(0.25, Math.min(3.0, jitterRate)), startTime);
        if (detuneCents && src.detune) {
          src.detune.setValueAtTime(detuneCents, startTime);
        }

        const autoTrim = trimOffsetCache.get(key) || 0;
        const startOffset = Math.min(Math.max(0, buf.duration - 0.05), autoTrim + Math.max(0, extraOffset));
        const availableDur = Math.max(0.04, (buf.duration - startOffset) / Math.max(0.25, jitterRate));
        const playDur = maxDuration ? Math.min(availableDur, maxDuration) : availableDur;

        let lastNode = src;

        if (highpassFreq) {
          const hp = ctx.createBiquadFilter();
          hp.type = 'highpass';
          hp.frequency.setValueAtTime(highpassFreq, startTime);
          lastNode.connect(hp);
          lastNode = hp;
        }

        if (lowpassFreq) {
          const lp = ctx.createBiquadFilter();
          lp.type = 'lowpass';
          lp.frequency.setValueAtTime(lowpassFreq, startTime);
          lastNode.connect(lp);
          lastNode = lp;
        }

        if (pan !== 0 && typeof ctx.createStereoPanner === 'function') {
          const panner = ctx.createStereoPanner();
          panner.pan.setValueAtTime(Math.max(-1, Math.min(1, pan)), startTime);
          lastNode.connect(panner);
          lastNode = panner;
        }

        const gainNode = ctx.createGain();
        const safeFadeIn = Math.min(fadeIn, playDur * 0.25);
        const safeFadeOut = Math.min(fadeOut, playDur * 0.45);

        gainNode.gain.setValueAtTime(0.0001, startTime);
        gainNode.gain.linearRampToValueAtTime(Math.max(0.001, volume), startTime + Math.max(0.001, safeFadeIn));
        if (maxDuration && playDur > safeFadeOut + safeFadeIn) {
          gainNode.gain.setValueAtTime(Math.max(0.001, volume), startTime + playDur - safeFadeOut);
          gainNode.gain.exponentialRampToValueAtTime(0.0001, startTime + playDur);
        }

        lastNode.connect(gainNode);
        gainNode.connect(getMasterBus(ctx));

        src.start(startTime, startOffset);
        if (maxDuration) {
          src.stop(startTime + playDur + 0.015);
        }
      } catch (e) {}
    };

    const cachedBuf = decodedBufferCache.get(key);
    if (cachedBuf) {
      triggerFromBuffer(cachedBuf, delay);
    } else {
      const requestedAt = performance.now();
      decodeMixkitKey(key, ctx).then((buf) => {
        if (!buf) return;
        const elapsedSec = (performance.now() - requestedAt) / 1000;
        const remainingDelay = Math.max(0, delay - elapsedSec);
        triggerFromBuffer(buf, remainingDelay);
      });
    }
  }

  const PIECE_WEAPON_WEIGHT = {
    pawn: 0.85,
    knight: 1.0,
    bishop: 1.05,
    queen: 1.15,
    king: 1.32,
    rook: 1.48
  };

  // ==========================================================================
  // Standard Gameplay SFX (Select, Stone Slide Move, Landing Thud, Promotion)
  // All powered by Mixkit Audio Assets
  // ==========================================================================
  function playSelectSfx(pieceType = 'pawn') {
    if (!sfxEnabled) return;
    const type = String(pieceType || 'pawn').toLowerCase();
    const rateByPiece = {
      pawn: 1.18,
      knight: 1.10,
      bishop: 1.24,
      rook: 0.86,
      queen: 1.30,
      king: 0.94
    };
    const rate = rateByPiece[type] || 1.12;

    // Crisp metallic resonance tap (Mixkit #2609 + subtle sword scrape #2799)
    playMixkitClip('select_metallic_2609', {
      volume: 0.42,
      rate,
      maxDuration: 0.36,
      fadeOut: 0.14
    });
    playMixkitClip('sword_scrape_2799', {
      delay: 0.01,
      volume: 0.24,
      rate: rate * 1.15,
      maxDuration: 0.22,
      fadeOut: 0.09
    });
  }

  function playMoveStartSfx(pieceType = 'pawn', isCapture = false) {
    if (!sfxEnabled) return;
    const type = String(pieceType || 'pawn').toLowerCase();
    const weight = PIECE_WEAPON_WEIGHT[type] || 1.0;

    // Carved stone piece sliding across the altar (Mixkit #1528: Magical stone slide)
    playMixkitClip('stone_slide_1528', {
      volume: isCapture ? 0.56 : 0.44,
      rate: 1.12 / Math.sqrt(weight),
      maxDuration: isCapture ? 0.52 : 0.38,
      fadeIn: 0.015,
      fadeOut: 0.12
    });

    // When advancing into a capture duel, layer a subtle initial scabbard loosen (Mixkit #2766)
    if (isCapture) {
      playMixkitClip('medieval_blade_2766', {
        delay: 0.04,
        volume: 0.32,
        rate: 1.05 / Math.sqrt(weight),
        maxDuration: 0.34,
        fadeOut: 0.10
      });
    }
  }

  function playMoveLandSfx(pieceType = 'pawn', isCastle = false) {
    if (!sfxEnabled) return;
    const type = String(pieceType || 'pawn').toLowerCase();
    const weight = PIECE_WEAPON_WEIGHT[type] || 1.0;

    // Weighty stone altar placement thud (Mixkit #2150: Impact of a blow + short stone settle #400)
    playMixkitClip('move_land_thud_2150', {
      volume: 0.62 * Math.min(1.25, weight),
      rate: 1.02 / Math.sqrt(weight),
      maxDuration: 0.32,
      fadeOut: 0.08
    });
    playMixkitClip('stones_falling_400', {
      delay: 0.01,
      volume: 0.28,
      rate: 1.25 / Math.sqrt(weight),
      extraOffset: 0.15,
      maxDuration: 0.22,
      fadeOut: 0.08
    });

    if (isCastle) {
      // Second interlocking Rook fortress thud + metallic lock strike (Mixkit #2797)
      playMixkitClip('move_land_thud_2150', {
        delay: 0.11,
        volume: 0.68,
        rate: 0.85,
        maxDuration: 0.35,
        fadeOut: 0.09
      });
      playMixkitClip('sword_hits_metal_2797', {
        delay: 0.13,
        volume: 0.45,
        rate: 0.96,
        maxDuration: 0.42,
        fadeOut: 0.12
      });
    }
  }

  function playPromotionSfx() {
    if (!sfxEnabled) return;
    // Royal ascension fanfare + magic blade unsheathe (Mixkit #270 + #2793 + #1476)
    playMixkitClip('promotion_fanfare_270', {
      volume: 0.68,
      rate: 1.0,
      maxDuration: 1.65,
      fadeOut: 0.25
    });
    playMixkitClip('magic_sword_slice_2793', {
      delay: 0.04,
      volume: 0.55,
      rate: 1.08,
      maxDuration: 0.85,
      fadeOut: 0.18
    });
  }

  // Checked / Checkmate Victory Fanfare SFX (Mixkit #226, #722, #631, #270, #600)
  function playSanctumHornSfx(kind = 'check_win', forcePlay = false) {
    if (!sfxEnabled && !forcePlay) return;
    if (kind === 'check_win') {
      // Triumphant Medieval Victory Fanfare when placing the enemy Sovereign in Check / Checkmate
      playMixkitClip('medieval_victory_fanfare_226', {
        volume: 0.92,
        rate: 1.0,
        maxDuration: 4.5,
        fadeOut: 0.55
      });
      playMixkitClip('horns_victory_fanfare_722', {
        delay: 0.06,
        volume: 0.84,
        rate: 1.0,
        maxDuration: 3.6,
        fadeOut: 0.45
      });
      playMixkitClip('promotion_fanfare_270', {
        delay: 0.12,
        volume: 0.76,
        rate: 1.0,
        maxDuration: 2.2,
        fadeOut: 0.35
      });
      playMixkitClip('achievement_bell_600', {
        delay: 0.02,
        volume: 0.68,
        rate: 1.0,
        maxDuration: 2.4,
        fadeOut: 0.40
      });
    } else {
      // Check Alert Victory Horn & Fanfare Chime
      playMixkitClip('horns_victory_fanfare_722', {
        volume: 0.85,
        rate: 1.04,
        maxDuration: 2.6,
        fadeOut: 0.38
      });
      playMixkitClip('promotion_fanfare_270', {
        delay: 0.03,
        volume: 0.72,
        rate: 1.02,
        maxDuration: 1.85,
        fadeOut: 0.30
      });
      playMixkitClip('achievement_bell_600', {
        delay: 0.01,
        volume: 0.64,
        rate: 1.05,
        maxDuration: 1.8,
        fadeOut: 0.32
      });
    }
  }

  // ==========================================================================
  // Loading Screen Relic Awakening & Completion SFX (Mixkit #2638, #2344, #187, #600)
  // ==========================================================================
  let pendingLoadingCompleteSound = false;

  function playLoadingStepSfx(stepIndex = 1, totalSteps = 7) {
    if (!sfxEnabled || typeof window === 'undefined' || navigator.webdriver) return;
    const ctx = getAudioCtx();
    if (!ctx) return;
    const progressRatio = Math.max(0, Math.min(1, (stepIndex - 1) / Math.max(1, totalSteps - 1)));
    const stepPitch = 0.86 + progressRatio * 0.36; // Ascends in pitch as each relic awakens

    playMixkitClip('loading_magic_ring_2344', {
      volume: 0.38,
      rate: stepPitch,
      maxDuration: 0.65,
      fadeOut: 0.18
    });
    playMixkitClip('medieval_lock_187', {
      delay: 0.015,
      volume: 0.34,
      rate: 0.92 + progressRatio * 0.22,
      maxDuration: 0.42,
      fadeOut: 0.12
    });
  }

  function playLoadingCompleteSfx() {
    if (!sfxEnabled || typeof window === 'undefined' || navigator.webdriver) return;
    const ctx = getAudioCtx();
    if (!ctx || ctx.state === 'suspended') {
      pendingLoadingCompleteSound = true;
      return;
    }
    pendingLoadingCompleteSound = false;
    // Grand Sanctum Awakening Sweep + Achievement Chime + Heavy Relic Lock
    playMixkitClip('loading_magic_sweep_2638', {
      volume: 0.72,
      rate: 1.0,
      maxDuration: 2.8,
      fadeOut: 0.45
    });
    playMixkitClip('achievement_bell_600', {
      delay: 0.08,
      volume: 0.58,
      rate: 0.96,
      maxDuration: 2.1,
      fadeOut: 0.38
    });
    playMixkitClip('medieval_lock_187', {
      delay: 0.02,
      volume: 0.48,
      rate: 0.88,
      maxDuration: 0.75,
      fadeOut: 0.18
    });
  }

  // ==========================================================================
  // Lobby UI Click, Tab Switch, Card Select, Unlock & Match Start SFX
  // ==========================================================================
  let lastLobbyClickMs = 0;

  function playLobbyClickSfx(variant = 'default') {
    if (!sfxEnabled || typeof window === 'undefined' || navigator.webdriver) return;
    const now = performance.now();
    if (now - lastLobbyClickMs < 28 && variant === 'default') return;
    lastLobbyClickMs = now;

    if (variant === 'unlock' || variant === 'buy') {
      // Gold Treasury Purchase / Relic Unlock in Armory
      playMixkitClip('lobby_unlock_item_253', {
        volume: 0.78,
        rate: 1.0,
        maxDuration: 1.65,
        fadeOut: 0.25
      });
      playMixkitClip('achievement_bell_600', {
        delay: 0.04,
        volume: 0.56,
        rate: 1.08,
        maxDuration: 1.4,
        fadeOut: 0.28
      });
      playMixkitClip('medieval_lock_187', {
        delay: 0.01,
        volume: 0.45,
        rate: 1.04,
        maxDuration: 0.5,
        fadeOut: 0.12
      });
    } else if (variant === 'equip') {
      // Equipping an Army Set, Board, Scenery, or Stone Finish
      playMixkitClip('medieval_lock_187', {
        volume: 0.58,
        rate: 1.02,
        maxDuration: 0.55,
        fadeOut: 0.14
      });
      playMixkitClip('select_metallic_2609', {
        delay: 0.015,
        volume: 0.44,
        rate: 1.12,
        maxDuration: 0.45,
        fadeOut: 0.14
      });
      playMixkitClip('lobby_click_select_1109', {
        volume: 0.52,
        rate: 1.0,
        maxDuration: 0.22,
        fadeOut: 0.06
      });
    } else if (variant === 'start') {
      // Entering the Sanctum / Starting a Match from the Lobby
      playMixkitClip('medieval_lock_187', {
        volume: 0.65,
        rate: 0.92,
        maxDuration: 0.68,
        fadeOut: 0.16
      });
      playMixkitClip('sword_slide_2798', {
        delay: 0.03,
        volume: 0.62,
        rate: 1.04,
        maxDuration: 0.55,
        fadeOut: 0.14
      });
      playMixkitClip('loading_magic_sweep_2638', {
        delay: 0.05,
        volume: 0.58,
        rate: 1.08,
        maxDuration: 1.6,
        fadeOut: 0.35
      });
    } else if (variant === 'tab') {
      // Switching Tabs in Lobby / Armory
      playMixkitClip('lobby_click_tone_2568', {
        volume: 0.56,
        rate: 1.04,
        maxDuration: 0.28,
        fadeOut: 0.08
      });
      playMixkitClip('sword_scrape_2799', {
        delay: 0.01,
        volume: 0.22,
        rate: 1.28,
        maxDuration: 0.18,
        fadeOut: 0.06
      });
    } else if (variant === 'card') {
      // Selecting Difficulty Rank, Army Side, or Loadout Slot
      playMixkitClip('lobby_click_select_1109', {
        volume: 0.58,
        rate: 1.02,
        maxDuration: 0.25,
        fadeOut: 0.06
      });
      playMixkitClip('medieval_lock_187', {
        delay: 0.01,
        volume: 0.34,
        rate: 1.18,
        maxDuration: 0.32,
        fadeOut: 0.09
      });
    } else if (variant === 'close') {
      // Closing Modal / Returning
      playMixkitClip('lobby_click_select_1109', {
        volume: 0.48,
        rate: 0.88,
        maxDuration: 0.24,
        fadeOut: 0.06
      });
    } else {
      // Crisp Standard Lobby / HUD Button Click
      playMixkitClip('lobby_click_select_1109', {
        volume: 0.54,
        rate: 1.0,
        maxDuration: 0.22,
        fadeOut: 0.06
      });
      playMixkitClip('lobby_click_tone_2568', {
        delay: 0.008,
        volume: 0.36,
        rate: 1.06,
        maxDuration: 0.22,
        fadeOut: 0.06
      });
    }
  }

  // ==========================================================================
  // Mixkit Atmospheric Sanctum Lobby Background Music Controller
  // ==========================================================================
  let lobbyMusicEnabled = true;
  try {
    const savedMusic = localStorage.getItem('wizard_chess_music_enabled');
    if (savedMusic !== null) lobbyMusicEnabled = savedMusic !== 'false';
  } catch (e) {}

  let userMusicVolumeMultiplier = 1.0;
  try {
    const savedMusicVol = localStorage.getItem('wizard_chess_music_volume');
    if (savedMusicVol !== null) userMusicVolumeMultiplier = Math.max(0, Math.min(1, parseFloat(savedMusicVol)));
  } catch (e) {}

  let isLobbyMusicActiveState = true; // True while user is in Lobby / Armory modal or before match starts
  let lobbyPrimaryAudio = null;
  let lobbyDrumsAudio = null;
  let lobbyMusicFadeTimer = null;
  const getPrimaryTargetVol = () => 0.34 * userMusicVolumeMultiplier;
  const getDrumsTargetVol = () => 0.14 * userMusicVolumeMultiplier;

  function ensureLobbyAudioElements() {
    if (typeof window === 'undefined' || navigator.webdriver) return false;
    if (!lobbyPrimaryAudio) {
      try {
        lobbyPrimaryAudio = new Audio(MIXKIT_LOBBY_MUSIC_TRACKS[0]);
        lobbyPrimaryAudio.loop = true;
        lobbyPrimaryAudio.preload = 'auto';
        lobbyPrimaryAudio.volume = 0;
      } catch (e) {
        return false;
      }
    }
    if (!lobbyDrumsAudio) {
      try {
        lobbyDrumsAudio = new Audio(MIXKIT_LOBBY_MUSIC_TRACKS[1]);
        lobbyDrumsAudio.loop = true;
        lobbyDrumsAudio.preload = 'auto';
        lobbyDrumsAudio.volume = 0;
      } catch (e) {}
    }
    return true;
  }

  function syncLobbyMusicPlayback() {
    if (typeof window === 'undefined' || navigator.webdriver) return;
    if (!ensureLobbyAudioElements()) return;

    const shouldPlay = sfxEnabled && lobbyMusicEnabled && isLobbyMusicActiveState;
    if (lobbyMusicFadeTimer) {
      clearInterval(lobbyMusicFadeTimer);
      lobbyMusicFadeTimer = null;
    }

    if (shouldPlay) {
      const p1 = lobbyPrimaryAudio.play();
      if (p1 && typeof p1.catch === 'function') {
        p1.catch(() => {});
      }
      if (lobbyDrumsAudio) {
        const p2 = lobbyDrumsAudio.play();
        if (p2 && typeof p2.catch === 'function') {
          p2.catch(() => {});
        }
      }

      lobbyMusicFadeTimer = setInterval(() => {
        if (!lobbyPrimaryAudio) return;
        let done = true;
        const targetPrimary = getPrimaryTargetVol();
        const targetDrums = getDrumsTargetVol();

        if (lobbyPrimaryAudio.volume < targetPrimary - 0.01) {
          lobbyPrimaryAudio.volume = Math.min(targetPrimary, lobbyPrimaryAudio.volume + 0.025);
          done = false;
        } else if (lobbyPrimaryAudio.volume > targetPrimary + 0.01) {
          lobbyPrimaryAudio.volume = Math.max(targetPrimary, lobbyPrimaryAudio.volume - 0.025);
          done = false;
        } else {
          lobbyPrimaryAudio.volume = targetPrimary;
        }
        if (lobbyDrumsAudio) {
          if (lobbyDrumsAudio.volume < targetDrums - 0.008) {
            lobbyDrumsAudio.volume = Math.min(targetDrums, lobbyDrumsAudio.volume + 0.012);
            done = false;
          } else if (lobbyDrumsAudio.volume > targetDrums + 0.008) {
            lobbyDrumsAudio.volume = Math.max(targetDrums, lobbyDrumsAudio.volume - 0.012);
            done = false;
          } else {
            lobbyDrumsAudio.volume = targetDrums;
          }
        }
        if (done && lobbyMusicFadeTimer) {
          clearInterval(lobbyMusicFadeTimer);
          lobbyMusicFadeTimer = null;
        }
      }, 45);
    } else {
      lobbyMusicFadeTimer = setInterval(() => {
        if (!lobbyPrimaryAudio) return;
        let done = true;
        if (lobbyPrimaryAudio.volume > 0.02) {
          lobbyPrimaryAudio.volume = Math.max(0, lobbyPrimaryAudio.volume - 0.035);
          done = false;
        } else {
          lobbyPrimaryAudio.volume = 0;
          try {
            lobbyPrimaryAudio.pause();
          } catch (e) {}
        }
        if (lobbyDrumsAudio) {
          if (lobbyDrumsAudio.volume > 0.015) {
            lobbyDrumsAudio.volume = Math.max(0, lobbyDrumsAudio.volume - 0.02);
            done = false;
          } else {
            lobbyDrumsAudio.volume = 0;
            try {
              lobbyDrumsAudio.pause();
            } catch (e) {}
          }
        }
        if (done && lobbyMusicFadeTimer) {
          clearInterval(lobbyMusicFadeTimer);
          lobbyMusicFadeTimer = null;
        }
      }, 40);
    }
  }

  function setLobbyMusicActive(active) {
    isLobbyMusicActiveState = Boolean(active);
    syncLobbyMusicPlayback();
  }

  function setLobbyMusicEnabled(enabled) {
    lobbyMusicEnabled = Boolean(enabled);
    try {
      localStorage.setItem('wizard_chess_music_enabled', String(lobbyMusicEnabled));
    } catch (e) {}
    syncLobbyMusicPlayback();
    window.dispatchEvent(
      new CustomEvent('wizardchess:musicchange', { detail: { lobbyMusicEnabled } })
    );
    return lobbyMusicEnabled;
  }

  // Unlock AudioContext & start Lobby Music on first user interaction if browser blocked initial autoplay
  if (typeof window !== 'undefined' && !navigator.webdriver) {
    const unlockAudioOnFirstGesture = () => {
      if (sfxEnabled) {
        const ctx = getAudioCtx();
        if (ctx && ctx.state === 'suspended') {
          ctx.resume().catch(() => {});
        }
        if (pendingLoadingCompleteSound) {
          pendingLoadingCompleteSound = false;
          playLoadingCompleteSfx();
        }
      }
      syncLobbyMusicPlayback();
    };
    window.addEventListener('pointerdown', unlockAudioOnFirstGesture, { passive: true });
    window.addEventListener('keydown', unlockAudioOnFirstGesture, { passive: true });
  }

  // ==========================================================================
  // Multi-Stage Medieval Duel SFX: Stage 1 (Blade Draw) & Stage 2 (Air Slash)
  // Core Mixkit /discover/slash/ #1476 "Sword slash swoosh" + Sword Slide #2798
  // ==========================================================================
  function playAttackChargeAndSwingSfx(attackerType = 'queen', victimType = 'pawn') {
    if (!sfxEnabled) return;
    const aType = String(attackerType || 'queen').toLowerCase();
    const vType = String(victimType || 'pawn').toLowerCase();
    const atkWeight = PIECE_WEAPON_WEIGHT[aType] || 1.05;
    const isRoyalOrHeavyDuel =
      vType === 'king' || vType === 'queen' || vType === 'rook' || aType === 'king' || aType === 'queen';

    const pitchScale = 1.04 / Math.sqrt(atkWeight);

    // STAGE 1 (t = 0.00s): Metallic Blade Draw from Scabbard (Mixkit #2798 "Fantasy sword slide" + #2799 "Metallic sword scrape")
    playMixkitClip('sword_slide_2798', {
      delay: 0,
      volume: isRoyalOrHeavyDuel ? 0.78 : 0.68,
      rate: pitchScale,
      maxDuration: 0.48,
      fadeOut: 0.10
    });
    playMixkitClip('sword_scrape_2799', {
      delay: 0.02,
      volume: 0.52,
      rate: pitchScale * 1.08,
      maxDuration: 0.36,
      fadeOut: 0.08
    });

    // Optional Windup Flourish Swish for multi-blade / cavalry attackers (Queen, Knight, King, Bishop)
    if (aType === 'queen' || aType === 'knight' || aType === 'king' || aType === 'bishop') {
      const flourishKey =
        aType === 'bishop' ? 'magic_sword_slice_2793' : aType === 'queen' ? 'fast_sword_whoosh_2792' : 'sword_swish_1506';
      playMixkitClip(flourishKey, {
        delay: 0.12,
        volume: 0.64,
        rate: pitchScale * 1.12,
        maxDuration: 0.38,
        fadeOut: 0.08
      });
    }

    // STAGE 2 (t = 0.24s, locked to SWING_START_CLIP_TIME):
    // Primary High-Velocity Sword Slash Swoosh from https://mixkit.co/free-sound-effects/discover/slash/ (#1476)
    // layered with #1485 ("Metal hit woosh") or #2792 ("Fast sword whoosh")
    playMixkitClip('slash_swoosh_1476', {
      delay: 0.23,
      volume: 0.92,
      rate: aType === 'rook' ? 0.86 : aType === 'king' ? 0.94 : 1.06,
      maxDuration: 0.62,
      fadeOut: 0.12
    });
    playMixkitClip(aType === 'rook' || aType === 'king' ? 'metal_hit_woosh_1485' : 'fast_sword_whoosh_2792', {
      delay: 0.25,
      volume: 0.68,
      rate: pitchScale,
      maxDuration: 0.45,
      fadeOut: 0.09
    });
  }

  // ==========================================================================
  // Multi-Stage Medieval Duel SFX: Stage 3 (Heavy Steel-on-Steel Parry Clash)
  // Core Mixkit /discover/slash/ #2763 "Sword slashes in battle" + #2160 & #2762
  // ==========================================================================
  function playWeaponContactClashSfx(attackerType = 'queen', victimType = 'pawn') {
    if (!sfxEnabled) return;
    const aType = String(attackerType || 'queen').toLowerCase();
    const vType = String(victimType || 'pawn').toLowerCase();
    const atkWeight = PIECE_WEAPON_WEIGHT[aType] || 1.05;
    const vicWeight = PIECE_WEAPON_WEIGHT[vType] || 1.0;
    const clashPitch = 1.05 / Math.sqrt(atkWeight * vicWeight);

    // Parry Clash #1 (t = 0.00s): Mixkit /discover/slash/ #2763 "Sword slashes in battle"
    playMixkitClip('battle_slashes_2763', {
      delay: 0,
      volume: 0.94,
      rate: clashPitch,
      maxDuration: 0.72,
      fadeOut: 0.14
    });

    // Simultaneous hard forged-steel strike ring (Mixkit #2160 "Metallic sword strike")
    playMixkitClip('metallic_strike_2160', {
      delay: 0.01,
      volume: 0.82,
      rate: clashPitch * 1.04,
      maxDuration: 0.58,
      fadeOut: 0.12
    });

    // Parry Clash #2 (t = 0.065s): Counter-parry blade clash in battle (Mixkit #2762 / #2764)
    playMixkitClip('battle_blade_attack_2762', {
      delay: 0.065,
      volume: 0.78,
      rate: clashPitch * 1.12,
      maxDuration: 0.55,
      fadeOut: 0.12
    });

    // Heavy/Royal Duel 3rd Guard-Break Steel Impact right before the fatal cleave (Mixkit #2797 "Sword hits heavy metal")
    if (vType === 'king' || vType === 'queen' || vType === 'knight' || vType === 'rook' || aType === 'queen' || aType === 'king') {
      playMixkitClip('sword_hits_metal_2797', {
        delay: 0.115,
        volume: 0.80,
        rate: clashPitch * 0.94,
        maxDuration: 0.52,
        fadeOut: 0.12
      });
    }
  }

  // ==========================================================================
  // Stage 4: 6 Distinct Piece-Specific Kill SFX Using Mixkit Slash/Sword/Rock Audio
  // Core Mixkit /discover/slash/ #2796 "Sword gore slash hit" + Piece-Specific Layers
  // ==========================================================================
  function playPieceKillSfx(victimType = 'pawn', attackerType = 'queen') {
    if (!sfxEnabled) return;
    const type = String(victimType || 'pawn').toLowerCase();
    const aType = String(attackerType || 'queen').toLowerCase();
    const atkWeight = PIECE_WEAPON_WEIGHT[aType] || 1.05;
    const atkPitch = 1.02 / Math.sqrt(atkWeight);

    if (type === 'pawn') {
      // 1. PAWN: VANGUARD SHIELD-BREAKER
      // Fatal slash hit (Mixkit #2796) + buckler armor strike (#2765) + chainmail split (#2790) + stone fragments (#400)
      playMixkitClip('slash_hit_2796', {
        delay: 0,
        volume: 0.92,
        rate: 1.06 * atkPitch,
        maxDuration: 0.95,
        fadeOut: 0.18
      });
      playMixkitClip('sword_strikes_armor_2765', {
        delay: 0.015,
        volume: 0.86,
        rate: 1.04,
        maxDuration: 0.78,
        fadeOut: 0.15
      });
      playMixkitClip('chainmail_cut_2790', {
        delay: 0.045,
        volume: 0.72,
        rate: 1.08,
        maxDuration: 0.75,
        fadeOut: 0.16
      });
      playMixkitClip('stones_falling_400', {
        delay: 0.05,
        volume: 0.68,
        rate: 1.18,
        extraOffset: 0.08,
        maxDuration: 0.88,
        fadeOut: 0.22
      });
    } else if (type === 'rook') {
      // 2. ROOK: CITADEL SEISMIC CATACLYSM
      // Colossal siege smash (Mixkit #2795 + #2774 Axe Plate Hit) + slash hit (#2796) + Rock Explosion Debris (#1703) + Stone Debris (#403)
      playMixkitClip('heavy_sword_smash_2795', {
        delay: 0,
        volume: 1.0,
        rate: 0.88,
        maxDuration: 1.35,
        fadeOut: 0.24
      });
      playMixkitClip('axe_plate_hit_2774', {
        delay: 0.012,
        volume: 0.92,
        rate: 0.90,
        maxDuration: 1.25,
        fadeOut: 0.22
      });
      playMixkitClip('slash_hit_2796', {
        delay: 0.02,
        volume: 0.84,
        rate: 0.86,
        maxDuration: 1.1,
        fadeOut: 0.20
      });
      playMixkitClip('rock_explosion_debris_1703', {
        delay: 0.025,
        volume: 0.88,
        rate: 1.05,
        maxDuration: 1.65,
        fadeOut: 0.35
      });
      playMixkitClip('stone_debris_403', {
        delay: 0.08,
        volume: 0.76,
        rate: 0.96,
        maxDuration: 1.45,
        fadeOut: 0.30
      });
    } else if (type === 'knight') {
      // 3. KNIGHT: TEMPEST VALKYRIE THUNDERSTRIKE
      // Rapid cavalry slash-and-pierce combo: Mixkit #1476 + #2763 + #2789 (Samurai Sword Impact) + #2761 (Sword Pierces Armor) + #2776 (Chainmail Lash)
      playMixkitClip('slash_swoosh_1476', {
        delay: 0,
        volume: 0.88,
        rate: 1.18,
        maxDuration: 0.55,
        fadeOut: 0.10
      });
      playMixkitClip('samurai_impact_2789', {
        delay: 0.01,
        volume: 0.95,
        rate: 1.04,
        maxDuration: 1.05,
        fadeOut: 0.18
      });
      playMixkitClip('sword_pierces_armor_2761', {
        delay: 0.03,
        volume: 0.90,
        rate: 1.02,
        maxDuration: 0.95,
        fadeOut: 0.18
      });
      playMixkitClip('chainmail_lash_2776', {
        delay: 0.065,
        volume: 0.82,
        rate: 1.06,
        maxDuration: 0.92,
        fadeOut: 0.18
      });
      playMixkitClip('stones_falling_400', {
        delay: 0.05,
        volume: 0.72,
        rate: 1.05,
        extraOffset: 0.05,
        maxDuration: 1.1,
        fadeOut: 0.25
      });
    } else if (type === 'bishop') {
      // 4. BISHOP: SANCTUM RELIQUARY JUDGEMENT
      // Arcane sanctum sword slice (#2793) + Heavy Sword Hit (#2794) + Slash Hit (#2796) + Cinematic Church Bell (#619) + Stone Debris (#403)
      playMixkitClip('magic_sword_slice_2793', {
        delay: 0,
        volume: 0.94,
        rate: 1.04,
        maxDuration: 1.15,
        fadeOut: 0.20
      });
      playMixkitClip('heavy_sword_hit_2794', {
        delay: 0.012,
        volume: 0.88,
        rate: 1.06,
        maxDuration: 0.95,
        fadeOut: 0.18
      });
      playMixkitClip('slash_hit_2796', {
        delay: 0.022,
        volume: 0.84,
        rate: 1.08,
        maxDuration: 0.92,
        fadeOut: 0.18
      });
      playMixkitClip('cinematic_bell_619', {
        delay: 0.018,
        volume: 0.64,
        rate: 1.28,
        maxDuration: 1.45,
        fadeOut: 0.35
      });
      playMixkitClip('stone_debris_403', {
        delay: 0.04,
        volume: 0.72,
        rate: 1.12,
        maxDuration: 1.18,
        fadeOut: 0.25
      });
    } else if (type === 'queen') {
      // 5. QUEEN: ROYAL BLADESTORM OBLITERATION
      // Vicious 3-hit royal twin-blade slash flurry: Fast Whoosh (#2792) -> Battle Slashes (#2763) -> Slash Swoosh (#1476) -> Fatal Slash Hit (#2796) + Samurai Impact (#2789) + Heavy Smash (#2795) + Rock Explosion (#1703)
      playMixkitClip('fast_sword_whoosh_2792', {
        delay: 0,
        volume: 0.90,
        rate: 1.16,
        maxDuration: 0.45,
        fadeOut: 0.08
      });
      playMixkitClip('battle_slashes_2763', {
        delay: 0.015,
        volume: 0.94,
        rate: 1.12,
        maxDuration: 0.78,
        fadeOut: 0.14
      });
      playMixkitClip('slash_swoosh_1476', {
        delay: 0.055,
        volume: 0.95,
        rate: 1.08,
        maxDuration: 0.68,
        fadeOut: 0.12
      });
      playMixkitClip('slash_hit_2796', {
        delay: 0.095,
        volume: 1.0,
        rate: 1.02,
        maxDuration: 1.25,
        fadeOut: 0.22
      });
      playMixkitClip('samurai_impact_2789', {
        delay: 0.105,
        volume: 0.92,
        rate: 1.14,
        maxDuration: 1.15,
        fadeOut: 0.20
      });
      playMixkitClip('heavy_sword_smash_2795', {
        delay: 0.115,
        volume: 0.88,
        rate: 1.06,
        maxDuration: 1.25,
        fadeOut: 0.24
      });
      playMixkitClip('rock_explosion_debris_1703', {
        delay: 0.11,
        volume: 0.82,
        rate: 1.12,
        maxDuration: 1.65,
        fadeOut: 0.35
      });
    } else {
      // 6. KING: SOVEREIGN EXECUTION APOCALYPSE
      // Executioner Greatsword Slash Swoosh (#1476) + Fatal Gore Slash Hit (#2796) + Heavy Sword Smashes Metal (#2795) + Sword Pierces Armor (#2761) + Tolling Cathedral Bell (#619) + Big Cinematic Impact (#788) + Rock Explosion Debris (#1703)
      playMixkitClip('slash_swoosh_1476', {
        delay: 0,
        volume: 0.98,
        rate: 0.88,
        maxDuration: 0.78,
        fadeOut: 0.14
      });
      playMixkitClip('slash_hit_2796', {
        delay: 0.015,
        volume: 1.0,
        rate: 0.90,
        maxDuration: 1.45,
        fadeOut: 0.25
      });
      playMixkitClip('heavy_sword_smash_2795', {
        delay: 0.022,
        volume: 1.0,
        rate: 0.86,
        maxDuration: 1.55,
        fadeOut: 0.28
      });
      playMixkitClip('sword_pierces_armor_2761', {
        delay: 0.04,
        volume: 0.92,
        rate: 0.92,
        maxDuration: 1.20,
        fadeOut: 0.22
      });
      playMixkitClip('cinematic_bell_619', {
        delay: 0.03,
        volume: 0.85,
        rate: 0.84,
        maxDuration: 2.35,
        fadeOut: 0.48
      });
      playMixkitClip('cinematic_impact_788', {
        delay: 0.025,
        volume: 0.88,
        rate: 0.92,
        maxDuration: 1.95,
        fadeOut: 0.40
      });
      playMixkitClip('rock_explosion_debris_1703', {
        delay: 0.035,
        volume: 0.94,
        rate: 0.95,
        maxDuration: 2.10,
        fadeOut: 0.42
      });
    }
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
    syncLobbyMusicPlayback();
    window.dispatchEvent(
      new CustomEvent('wizardchess:sfxchange', { detail: { sfxEnabled } })
    );
    return sfxEnabled;
  }

  function setSfxVolume(vol) {
    userSfxVolumeMultiplier = Math.max(0, Math.min(1, Number(vol) || 0));
    try {
      localStorage.setItem('wizard_chess_sfx_volume', String(userSfxVolumeMultiplier));
    } catch (e) {}
    if (masterBusNode?.input) {
      masterBusNode.input.gain.value = 1.05 * userSfxVolumeMultiplier;
    }
    return userSfxVolumeMultiplier;
  }

  function setLobbyMusicVolume(vol) {
    userMusicVolumeMultiplier = Math.max(0, Math.min(1, Number(vol) || 0));
    try {
      localStorage.setItem('wizard_chess_music_volume', String(userMusicVolumeMultiplier));
    } catch (e) {}
    if (lobbyPrimaryAudio && sfxEnabled && lobbyMusicEnabled && isLobbyMusicActiveState) {
      lobbyPrimaryAudio.volume = getPrimaryTargetVol();
    }
    if (lobbyDrumsAudio && sfxEnabled && lobbyMusicEnabled && isLobbyMusicActiveState) {
      lobbyDrumsAudio.volume = getDrumsTargetVol();
    }
    return userMusicVolumeMultiplier;
  }

  return {
    getSfxEnabled: () => sfxEnabled,
    setSfxEnabled,
    getSfxVolume: () => userSfxVolumeMultiplier,
    setSfxVolume,
    getLobbyMusicEnabled: () => lobbyMusicEnabled,
    setLobbyMusicEnabled,
    getLobbyMusicVolume: () => userMusicVolumeMultiplier,
    setLobbyMusicVolume,
    setLobbyMusicActive,
    playSelectSfx,
    playMoveStartSfx,
    playMoveLandSfx,
    playAttackChargeAndSwingSfx,
    playWeaponContactClashSfx,
    playPromotionSfx,
    playSanctumHornSfx,
    playCheckVictorySfx: playSanctumHornSfx,
    playLoadingStepSfx,
    playLoadingCompleteSfx,
    playLobbyClickSfx,
    playPieceKillSfx,
    spawnSquarePulseVfx,
    spawnWeaponContactVfx,
    spawnPieceKillVfx,
    clearAllVfx,
    update
  };
}
