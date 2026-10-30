import * as THREE_NS from 'three';
import {
  loadHalloweenTextureAsset,
  mountHalloweenModel,
  preloadHalloween3DAssets
} from './halloweenAssetLoader.js';

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
// Archetype-Specific Combat Profiles (Each Chess Piece Set Has Its Own Unique Attack & Effect)
// ============================================================================
export const ARCHETYPE_COMBAT_PROFILES = {
  gothic_warriors: {
    id: 'gothic_warriors',
    setName: 'Gothic Sanctum Warriors',
    attackName: 'CRUSADER RELIC CLEAVE',
    effectSummary: 'Forged Broadsword Slash, Cathedral Rose Sigil & Iron Cross Shatter',
    primaryHex: 0xff6b35,
    secondaryHex: 0xd4af37,
    coreHex: 0xfff3d1,
    titles: {
      pawn:   { title: 'SANCTUM VANGUARD SHIELD-BREAKER', subtitle: 'Heavy Crusader Broadsword Cleave & Iron Buckler Shatter' },
      rook:   { title: 'CATHEDRAL SIEGE CATACLYSM',       subtitle: 'Gargoyle Warhammer Crush & Stone Battlement Collapse' },
      knight: { title: 'TEMPLAR LANCE THUNDERSTRIKE',     subtitle: 'Armored Warhorse Charge & Forged Barding Rupture' },
      bishop: { title: 'INQUISITOR RELIQUARY JUDGEMENT',  subtitle: 'Flanged Sanctum Mace Cleave & Rose-Window Sigil Burst' },
      queen:  { title: 'SOVEREIGN TWIN-BLADE OBLITERATION', subtitle: 'Cathedral Dual-Greatsword Flurry & Reliquary Collapse' },
      king:   { title: 'CRUSADER EXECUTION APOCALYPSE',   subtitle: 'Executioner Greatsword Cleave & Tolling Cathedral Bell' }
    }
  },
  classic_staunton: {
    id: 'classic_staunton',
    setName: 'Classic Staunton Tournament',
    attackName: 'GRANDMASTER TELEKINETIC SLAM',
    effectSummary: '360° Levitation Spin, Imperial Meteor Drop & Golden Compass Star Shockwave',
    primaryHex: 0xffd166,
    secondaryHex: 0xe09f3e,
    coreHex: 0xffffff,
    titles: {
      pawn:   { title: 'GRANDMASTER GAMBIT CRUSH',        subtitle: 'Telekinetic Boxwood Lunge & Golden Compass Burst' },
      rook:   { title: 'CASTLE TURRET METEOR SLAM',       subtitle: 'Levitating Tower Drop & Turned Brass Ring Shockwave' },
      knight: { title: 'ROYAL CAVALRY COMPASS STRIKE',    subtitle: '360° Carved Warhorse Leap & Ivory Splinter Detonation' },
      bishop: { title: 'GRANDMASTER DIAGONAL DECREE',     subtitle: 'Slotted Mitre Ascent & 8-Pointed Golden Star Impact' },
      queen:  { title: 'IMPERIAL CORONET CHECKMATE SLAM', subtitle: '12-Pearl Crown Telekinetic Drop & Astrolabe Ring Nova' },
      king:   { title: 'SUPREME GRANDMASTER EXECUTION',   subtitle: 'Imperial Crown Meteor Impact & Golden Tournament Burst' }
    }
  },
  arcane_cyber: {
    id: 'arcane_cyber',
    setName: 'Arcane Runic & Cyber-Mech',
    attackName: 'VALKYRIE PLASMA & ORBITAL ION BEAM',
    effectSummary: 'Overdrive Gyro Dash, Plasma Lance Beam, Hex Holo-Matrix & Orbital Laser Pillar',
    primaryHex: 0x00f5d4,
    secondaryHex: 0x9d4edd,
    coreHex: 0xe0fbfc,
    titles: {
      pawn:   { title: 'CYBER-SENTINEL PLASMA BREACH',    subtitle: 'Phase-Shield Dash, Hex Reticle Lock & Neon Crystal Shatter' },
      rook:   { title: 'ORBITAL PYLON ION CANNON',        subtitle: 'Tectonic EMP Shockwave & Sky-to-Board Laser Obliteration' },
      knight: { title: 'VALKYRIE THRUSTER HYPER-STRIKE',  subtitle: 'Zero-G Energy Wing Dive & High-Voltage Arc Discharge' },
      bishop: { title: 'ASTROLABE MATRIX JUDGEMENT',      subtitle: 'Overdrive Gyro Singularity & Hexagonal Runic Laser Beam' },
      queen:  { title: 'SERAPHIM PLASMA SUPERNOVA',       subtitle: '6-Wing Cyber Overdrive, Twin Ion Blades & EMP Dome Burst' },
      king:   { title: 'ARCHON ORBITAL APOCALYPSE',       subtitle: 'Sovereign Mech Core Overload & 5-Bolt Plasma Sky Strike' }
    }
  },
  dragon_elemental: {
    id: 'dragon_elemental',
    setName: 'Dragon & Elemental Guardians',
    attackName: 'HELLFIRE BREATH & MAGMA ERUPTION',
    effectSummary: 'Winged Aerial Pounce, Living Dragonfire Breath Cone & Obsidian Magma Spires',
    primaryHex: 0xff2a55,
    secondaryHex: 0xff9e00,
    coreHex: 0xfff3b0,
    titles: {
      pawn:   { title: 'DRAKE-WHELP HELLFIRE MAUL',       subtitle: 'Horned Jaws Lunge, Flame Jet & Scorched Obsidian Shards' },
      rook:   { title: 'VOLCANIC CITADEL ERUPTION',       subtitle: 'Hellfire Brazier Cataclysm & 10 Magma Crag Spires' },
      knight: { title: 'WYVERN SKY-DIVE INFERNO',         subtitle: 'Winged Aerial Swoop, Fanged Bite & Firestorm Vortex' },
      bishop: { title: 'PYROMANCER CHALICE IMMOLATION',   subtitle: 'Ritual Dragonfire Geyser & Swirling Ember Tornado' },
      queen:  { title: 'DRAGON EMPRESS FIVE-FLIGHT NOVA', subtitle: '4-Wing Aerial Dive, Blazing Diadem Breath & Lava Crater' },
      king:   { title: 'ELDER DRAGON SOVEREIGN INFERNO',  subtitle: 'Colossal Winged Pounce, Flame Greatsword & Magma Apocalypse' }
    }
  },
  hollow_reapers: {
    id: 'hollow_reapers',
    setName: 'Hollow Jack & Wraith Reapers',
    attackName: 'SAMHAIN SCYTHE SOUL-HARVEST',
    effectSummary: 'Wraith Reaper Scythe Cleave, Carved Jack-o\'-Lantern Detonation & Ectoplasm Bat Swarm',
    primaryHex: 0xff6d00,
    secondaryHex: 0x00e676,
    coreHex: 0xffe066,
    titles: {
      pawn:   { title: 'LANTERN THRALL SICKLE REAP',       subtitle: 'Cursed Iron Sickle Slash & Jack-o\'-Lantern Cinder Burst' },
      rook:   { title: 'HAUNTED CRYPT BELFRY DOOM',        subtitle: 'Tolling Graveyard Bell & Tombstone Obelisk Eruption' },
      knight: { title: 'HEADLESS HORSEMAN DULLAHAN CLEAVE', subtitle: 'Nightmare Steed Charge & Blazing Pumpkin Skull Detonation' },
      bishop: { title: 'WRAITH HARVESTER ECTO-REAPING',    subtitle: 'Phantom Scythe Sweep & Spectral Green Soul Vortex' },
      queen:  { title: 'BANSHEE SCYTHE EMPRESS OBLITERATION', subtitle: 'Twin Crescent War-Scythe Flurry & Blood-Moon Nova' },
      king:   { title: 'PUMPKIN LORD SAMHAIN APOCALYPSE',  subtitle: 'Sovereign Scythe Execution, Tolling Crypt Bell & Hellfire Gourd' }
    }
  }
};

export function getArchetypeKillProfile(attackerArchetype = 'gothic_warriors', victimType = 'pawn') {
  const vKey = String(victimType || 'pawn').toLowerCase();
  const baseProf = PIECE_KILL_PROFILES[vKey] || PIECE_KILL_PROFILES.pawn;
  const archKey = ARCHETYPE_COMBAT_PROFILES[attackerArchetype] ? attackerArchetype : 'gothic_warriors';
  const archProf = ARCHETYPE_COMBAT_PROFILES[archKey];
  const customTitle = archProf.titles[vKey] || { title: baseProf.title, subtitle: baseProf.subtitle };

  return {
    ...baseProf,
    archetypeId: archKey,
    setName: archProf.setName,
    attackName: archProf.attackName,
    effectSummary: archProf.effectSummary,
    title: customTitle.title,
    subtitle: customTitle.subtitle,
    primaryHex: archProf.primaryHex,
    secondaryHex: archProf.secondaryHex,
    coreHex: archProf.coreHex
  };
}

// ============================================================================
// Unity URP / ShaderGraph / Shuriken-Style 3D Shader VFX Builders
// Inspired byitch.io Free Unity VFX Packs (https://itch.io/game-assets/free/tag-unity/tag-vfx):
// 1. Unity URP Dissolve & Fresnel Energy Sphere Shader
// 2. Unity Shuriken Scrolling Noise Slash Ribbon Shader
// 3. Unity Procedural Magic Circle & Voronoi Ground Crack Shader
// 4. Unity Soft-Particle Star-Flare Billboard Sprite Texture
// ============================================================================
const GLSL_NOISE_CHUNK = `
  float hash21(vec2 p) {
    p = fract(p * vec2(234.34, 435.345));
    p += dot(p, p + 34.23);
    return fract(p.x * p.y);
  }
  float valueNoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    float a = hash21(i);
    float b = hash21(i + vec2(1.0, 0.0));
    float c = hash21(i + vec2(0.0, 1.0));
    float d = hash21(i + vec2(1.0, 1.0));
    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
  }
  float fbmNoise(vec2 p) {
    float v = 0.0;
    float amp = 0.5;
    for (int i = 0; i < 3; i++) {
      v += amp * valueNoise(p);
      p *= 2.04;
      amp *= 0.5;
    }
    return v;
  }
`;

export function createUnitySlashRibbonShaderMaterial(primaryHex = 0xff6b35, secondaryHex = 0xffd166, coreHex = 0xffffff) {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uTime: { value: 0 },
      uProgress: { value: 0 },
      uPrimaryColor: { value: new THREE.Color(primaryHex) },
      uSecondaryColor: { value: new THREE.Color(secondaryHex) },
      uCoreColor: { value: new THREE.Color(coreHex) }
    },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform float uProgress;
      uniform vec3 uPrimaryColor;
      uniform vec3 uSecondaryColor;
      uniform vec3 uCoreColor;
      varying vec2 vUv;
      ${GLSL_NOISE_CHUNK}
      void main() {
        // Scrolling slash ribbon UV along arc
        float head = smoothstep(0.0, 0.25, vUv.x) * (1.0 - smoothstep(0.65, 1.0, vUv.x));
        float radialEdge = 1.0 - abs(vUv.y * 2.0 - 1.0);
        radialEdge = pow(max(0.0, radialEdge), 1.35);

        float n = fbmNoise(vec2(vUv.x * 6.0 - uTime * 9.0, vUv.y * 4.0 + uTime * 2.0));
        float mask = head * radialEdge * smoothstep(uProgress * 0.85, 1.0, n + radialEdge * 0.55);

        float coreFactor = smoothstep(0.58, 0.95, radialEdge * (0.7 + 0.3 * n));
        vec3 col = mix(uSecondaryColor, uPrimaryColor, smoothstep(0.15, 0.65, radialEdge));
        col = mix(col, uCoreColor, coreFactor);

        float alpha = mask * (1.0 - uProgress * uProgress) * 1.35;
        if (alpha < 0.01) discard;
        gl_FragColor = vec4(col * 1.4, min(1.0, alpha));
      }
    `
  });
}

export function createUnityFresnelDissolveSphereMaterial(primaryHex = 0x00f5d4, secondaryHex = 0x9d4edd, coreHex = 0xffffff) {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uTime: { value: 0 },
      uDissolve: { value: 0 },
      uPrimaryColor: { value: new THREE.Color(primaryHex) },
      uSecondaryColor: { value: new THREE.Color(secondaryHex) },
      uCoreColor: { value: new THREE.Color(coreHex) }
    },
    vertexShader: `
      varying vec2 vUv;
      varying vec3 vNormalView;
      varying vec3 vViewDir;
      void main() {
        vUv = uv;
        vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
        vNormalView = normalize(normalMatrix * normal);
        vViewDir = normalize(-mvPos.xyz);
        gl_Position = projectionMatrix * mvPos;
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform float uDissolve;
      uniform vec3 uPrimaryColor;
      uniform vec3 uSecondaryColor;
      uniform vec3 uCoreColor;
      varying vec2 vUv;
      varying vec3 vNormalView;
      varying vec3 vViewDir;
      ${GLSL_NOISE_CHUNK}
      void main() {
        float fresnel = pow(1.0 - abs(dot(normalize(vNormalView), normalize(vViewDir))), 2.1);
        float n = fbmNoise(vUv * 7.5 + vec2(uTime * 2.2, -uTime * 1.8));
        float threshold = uDissolve * 1.15;
        if (n + fresnel * 0.38 < threshold) discard;

        float burnEdge = 1.0 - smoothstep(threshold, threshold + 0.18, n + fresnel * 0.38);
        vec3 col = mix(uSecondaryColor, uPrimaryColor, fresnel);
        col = mix(col, uCoreColor, max(burnEdge, pow(fresnel, 3.0)));

        float alpha = (fresnel * 0.85 + burnEdge * 0.95) * (1.0 - uDissolve * 0.92);
        gl_FragColor = vec4(col * 1.5, min(1.0, alpha));
      }
    `
  });
}

export function createUnityMagicCircleShaderMaterial(
  primaryHex = 0xffd166,
  secondaryHex = 0xe09f3e,
  coreHex = 0xffffff,
  styleMode = 0
) {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uTime: { value: 0 },
      uProgress: { value: 0 },
      uStyle: { value: styleMode },
      uPrimaryColor: { value: new THREE.Color(primaryHex) },
      uSecondaryColor: { value: new THREE.Color(secondaryHex) },
      uCoreColor: { value: new THREE.Color(coreHex) }
    },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform float uProgress;
      uniform float uStyle;
      uniform vec3 uPrimaryColor;
      uniform vec3 uSecondaryColor;
      uniform vec3 uCoreColor;
      varying vec2 vUv;
      ${GLSL_NOISE_CHUNK}
      void main() {
        vec2 p = vUv * 2.0 - 1.0;
        float r = length(p);
        if (r > 1.0) discard;
        float a = atan(p.y, p.x);

        // Outer & inner arcane rings
        float outerRing = smoothstep(0.035, 0.0, abs(r - 0.92)) + smoothstep(0.02, 0.0, abs(r - 0.82));
        float midRing = smoothstep(0.025, 0.0, abs(r - 0.56));
        float innerRing = smoothstep(0.03, 0.0, abs(r - 0.28));

        // Style-specific procedural geometry (0=Gothic Rose/Cross, 1=Staunton 8-Star, 2=Cyber Hex Circuit, 3=Dragon Voronoi Magma)
        float spokes = 0.0;
        if (uStyle < 0.5) {
          // 12-petal Gothic Rose Window + 4 Crusader Crosses
          float rose = abs(cos((a + uTime * 1.2) * 6.0));
          spokes = smoothstep(0.04, 0.0, abs(r - (0.35 + 0.45 * rose)));
          spokes += smoothstep(0.92, 0.99, abs(cos(a * 2.0 - uTime * 0.8))) * step(r, 0.88);
        } else if (uStyle < 1.5) {
          // 8-Pointed Grandmaster Compass Star & Chrono Ticks
          float star = abs(cos((a - uTime * 1.5) * 4.0));
          spokes = smoothstep(0.035, 0.0, abs(r - (0.32 + 0.52 * star)));
          float ticks = step(0.65, sin(a * 24.0 + uTime * 4.0)) * smoothstep(0.05, 0.0, abs(r - 0.87));
          spokes += ticks;
        } else if (uStyle < 2.5) {
          // 6-Sided Cyber-Arcane Hex Matrix & Data Traces
          float hexAngle = floor((a + 3.14159) / 1.0472) * 1.0472 - 3.14159 + 0.5236;
          float hexR = r * cos(a - hexAngle);
          spokes = smoothstep(0.03, 0.0, abs(hexR - 0.68)) + smoothstep(0.025, 0.0, abs(hexR - 0.42));
          spokes += step(0.82, sin(a * 6.0 - uTime * 6.0)) * step(r, 0.85);
        } else {
          // Volcanic Voronoi / FBM Magma Ground Cracks & Dragon Seal
          float n = fbmNoise(p * 4.8 + vec2(uTime * 0.9, -uTime * 0.7));
          float cracks = smoothstep(0.08, 0.0, abs(n - 0.48)) * (1.0 - r * 0.65);
          float flames = abs(cos((a + uTime * 2.2) * 5.0));
          spokes = cracks * 1.45 + smoothstep(0.04, 0.0, abs(r - (0.38 + 0.42 * flames)));
        }

        float pattern = clamp(outerRing + midRing + innerRing + spokes, 0.0, 1.5);
        float radialGlow = (1.0 - r) * 0.32;
        vec3 col = mix(uSecondaryColor, uPrimaryColor, clamp(pattern, 0.0, 1.0));
        col = mix(col, uCoreColor, clamp((pattern - 0.75) * 1.6, 0.0, 1.0));

        float fade = (1.0 - pow(uProgress, 1.45));
        float alpha = (pattern * 0.95 + radialGlow) * fade;
        if (alpha < 0.015) discard;
        gl_FragColor = vec4(col * 1.35, min(1.0, alpha));
      }
    `
  });
}

let cachedUnityStarFlareTex = null;
export function getUnityStarFlareTexture() {
  if (cachedUnityStarFlareTex || typeof document === 'undefined') return cachedUnityStarFlareTex;
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const cx = 64;
    const cy = 64;
    const grad = ctx.createRadialGradient(cx, cy, 1, cx, cy, 62);
    grad.addColorStop(0.0, 'rgba(255,255,255,1)');
    grad.addColorStop(0.22, 'rgba(255,255,255,0.85)');
    grad.addColorStop(0.55, 'rgba(255,255,255,0.22)');
    grad.addColorStop(1.0, 'rgba(255,255,255,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 128, 128);

    // 4-point Unity Shuriken star flare cross
    ctx.fillStyle = 'rgba(255,255,255,0.92)';
    ctx.beginPath();
    ctx.ellipse(cx, cy, 56, 4.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(cx, cy, 4.5, 56, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  cachedUnityStarFlareTex = new THREE.CanvasTexture(canvas);
  cachedUnityStarFlareTex.needsUpdate = true;
  return cachedUnityStarFlareTex;
}

let cachedUnityFireFlameTex = null;
export function getUnityFireFlameTexture() {
  if (cachedUnityFireFlameTex || typeof document === 'undefined') return cachedUnityFireFlameTex;
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const cx = 64;
    const cy = 64;
    // Soft billowing PYROLUX-style flame cloud puff with multi-lobe organic heat core
    const baseGrad = ctx.createRadialGradient(cx, cy, 2, cx, cy, 60);
    baseGrad.addColorStop(0.0, 'rgba(255,255,255,1.0)');
    baseGrad.addColorStop(0.28, 'rgba(255,245,210,0.92)');
    baseGrad.addColorStop(0.58, 'rgba(255,180,90,0.48)');
    baseGrad.addColorStop(0.82, 'rgba(255,90,30,0.16)');
    baseGrad.addColorStop(1.0, 'rgba(255,40,0,0.0)');
    ctx.fillStyle = baseGrad;
    ctx.fillRect(0, 0, 128, 128);

    // Add 5 organic flame lobes so rotating billboard sprites look like churning fire tongues
    const lobes = [
      { ox: -12, oy: -8, r: 34 },
      { ox: 14, oy: -6, r: 32 },
      { ox: -8, oy: 14, r: 30 },
      { ox: 10, oy: 12, r: 34 },
      { ox: 0, oy: -16, r: 28 }
    ];
    for (const lb of lobes) {
      const lg = ctx.createRadialGradient(cx + lb.ox, cy + lb.oy, 1, cx + lb.ox, cy + lb.oy, lb.r);
      lg.addColorStop(0.0, 'rgba(255,255,255,0.55)');
      lg.addColorStop(0.5, 'rgba(255,220,140,0.25)');
      lg.addColorStop(1.0, 'rgba(255,120,20,0.0)');
      ctx.fillStyle = lg;
      ctx.beginPath();
      ctx.arc(cx + lb.ox, cy + lb.oy, lb.r, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  cachedUnityFireFlameTex = new THREE.CanvasTexture(canvas);
  cachedUnityFireFlameTex.colorSpace = THREE.SRGBColorSpace;
  cachedUnityFireFlameTex.needsUpdate = true;
  return cachedUnityFireFlameTex;
}

let cachedHalloweenBatTex = null;
export function getHalloweenBatTexture() {
  if (!cachedHalloweenBatTex) {
    cachedHalloweenBatTex = loadHalloweenTextureAsset('vfx_bat_sprite.png');
  }
  return cachedHalloweenBatTex;
}

let cachedHalloweenGhostTex = null;
export function getHalloweenGhostTexture() {
  if (!cachedHalloweenGhostTex) {
    cachedHalloweenGhostTex = loadHalloweenTextureAsset('vfx_ghost_sprite.png');
  }
  return cachedHalloweenGhostTex;
}

/**
 * PYROLUX-Style Volumetric 3D Dragon Fire Breath Stream Shader
 * Streams a roaring, turbulent, swirling jet of living dragonfire from the dragon's jaws to the target.
 */
export function createUnityFireBreathShaderMaterial(
  coreHex = 0xfff8d6,
  midHex = 0xff9e00,
  outerHex = 0xff2a00
) {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uTime: { value: 0 },
      uProgress: { value: 0 },
      uCoreColor: { value: new THREE.Color(coreHex) },
      uMidColor: { value: new THREE.Color(midHex) },
      uOuterColor: { value: new THREE.Color(outerHex) }
    },
    vertexShader: `
      uniform float uTime;
      uniform float uProgress;
      varying vec2 vUv;
      varying float vAxial;
      varying vec3 vNormalView;
      varying vec3 vViewDir;

      void main() {
        vUv = uv;
        // uv.y runs from 0 (jaws/throat) to 1 (flame front / target impact)
        float axial = clamp(1.0 - uv.y, 0.0, 1.0);
        vAxial = axial;

        vec3 pos = position;
        float billow = pow(axial, 1.15);
        float wave1 = sin(axial * 14.0 - uTime * 22.0 + uv.x * 6.28318) * 0.045 * billow;
        float wave2 = cos(axial * 23.0 - uTime * 31.0 - uv.x * 12.56636) * 0.028 * billow;
        pos.x += wave1 + wave2;
        pos.z += wave2 - wave1 * 0.6;

        vec4 mvPos = modelViewMatrix * vec4(pos, 1.0);
        vNormalView = normalize(normalMatrix * normal);
        vViewDir = normalize(-mvPos.xyz);
        gl_Position = projectionMatrix * mvPos;
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform float uProgress;
      uniform vec3 uCoreColor;
      uniform vec3 uMidColor;
      uniform vec3 uOuterColor;
      varying vec2 vUv;
      varying float vAxial;
      varying vec3 vNormalView;
      varying vec3 vViewDir;
      ${GLSL_NOISE_CHUNK}

      void main() {
        // Stream advances from jaws (vAxial = 0) to target (vAxial = 1) rapidly, then dissipates
        float reach = smoothstep(0.0, 0.22, uProgress);
        float axialMask = 1.0 - smoothstep(reach * 0.82, reach + 0.18, vAxial);
        float throatSoft = smoothstep(0.0, 0.12, vAxial);

        // Fast scrolling multi-octave flame turbulence along the breath jet
        vec2 flowUv1 = vec2(vUv.x * 5.0 + sin(vAxial * 6.0 - uTime * 8.0) * 0.25, vAxial * 4.5 - uTime * 6.8);
        vec2 flowUv2 = vec2(vUv.x * 9.0 - cos(vAxial * 9.0 - uTime * 11.0) * 0.20, vAxial * 8.5 - uTime * 10.5);
        float n1 = fbmNoise(flowUv1);
        float n2 = fbmNoise(flowUv2);
        float turb = mix(n1, n2, 0.48);

        float facing = abs(dot(normalize(vNormalView), normalize(vViewDir)));
        float softCylinder = pow(clamp(facing, 0.0, 1.0), 0.55);

        float flameDensity = clamp((turb * 1.25 - vAxial * 0.32) * softCylinder, 0.0, 1.0);
        float tailErode = smoothstep(max(0.0, uProgress - 0.35) * 1.1, 1.0, turb + (1.0 - vAxial) * 0.45);

        vec3 col = mix(uOuterColor, uMidColor, smoothstep(0.18, 0.58, flameDensity));
        col = mix(col, uCoreColor, smoothstep(0.58, 0.92, flameDensity + (1.0 - vAxial) * 0.35));

        float fadeOut = 1.0 - pow(clamp((uProgress - 0.55) / 0.45, 0.0, 1.0), 1.6);
        float alpha = flameDensity * axialMask * throatSoft * tailErode * fadeOut * 1.55;
        if (alpha < 0.015) discard;
        gl_FragColor = vec4(col * 1.65, min(1.0, alpha));
      }
    `.replace('Math.max', 'max')
  });
}

/**
 * Arcane VFX / Sci-Fi Overcharged Plasma Beam & Ion Cannon Shader
 */
export function createUnityPlasmaBeamShaderMaterial(
  primaryHex = 0x00f5d4,
  secondaryHex = 0x9d4edd,
  coreHex = 0xffffff
) {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uTime: { value: 0 },
      uProgress: { value: 0 },
      uPrimaryColor: { value: new THREE.Color(primaryHex) },
      uSecondaryColor: { value: new THREE.Color(secondaryHex) },
      uCoreColor: { value: new THREE.Color(coreHex) }
    },
    vertexShader: `
      varying vec2 vUv;
      varying vec3 vNormalView;
      varying vec3 vViewDir;
      void main() {
        vUv = uv;
        vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
        vNormalView = normalize(normalMatrix * normal);
        vViewDir = normalize(-mvPos.xyz);
        gl_Position = projectionMatrix * mvPos;
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform float uProgress;
      uniform vec3 uPrimaryColor;
      uniform vec3 uSecondaryColor;
      uniform vec3 uCoreColor;
      varying vec2 vUv;
      varying vec3 vNormalView;
      varying vec3 vViewDir;
      ${GLSL_NOISE_CHUNK}

      void main() {
        float facing = pow(clamp(abs(dot(normalize(vNormalView), normalize(vViewDir))), 0.0, 1.0), 0.75);
        float helix1 = sin(vUv.y * 28.0 - uTime * 38.0 + vUv.x * 6.28318) * 0.5 + 0.5;
        float helix2 = cos(vUv.y * 19.0 - uTime * 26.0 - vUv.x * 6.28318) * 0.5 + 0.5;
        float n = fbmNoise(vec2(vUv.x * 4.0, vUv.y * 8.0 - uTime * 14.0));

        float energy = clamp(facing * 0.85 + pow(helix1 * helix2, 1.5) * 0.65 + n * 0.35, 0.0, 1.4);
        vec3 col = mix(uSecondaryColor, uPrimaryColor, smoothstep(0.2, 0.65, energy));
        col = mix(col, uCoreColor, smoothstep(0.68, 1.05, energy));

        float endFade = smoothstep(0.0, 0.08, vUv.y) * (1.0 - smoothstep(0.92, 1.0, vUv.y));
        float lifeFade = 1.0 - pow(uProgress, 1.5);
        float alpha = energy * endFade * lifeFade * 1.4;
        if (alpha < 0.015) discard;
        gl_FragColor = vec4(col * 1.7, min(1.0, alpha));
      }
    `
  });
}

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
  lobby_unlock_item_253: '/sfx/lobby_unlock_item_253.mp3',               // Mixkit #253: Unlock game notification

  // Halloween & Haunted Graveyard SFX (Mixkit Horror, Wind, Ghost, Wolf & Cauldron Library)
  halloween_graveyard_wind_1157: '/sfx/halloween_graveyard_wind_1157.mp3', // Mixkit #1157: Scary graveyard wind
  halloween_tomb_ambience_2500: '/sfx/halloween_tomb_ambience_2500.mp3',   // Mixkit #2500: Creepy tomb ambience
  halloween_ghost_whispers_302: '/sfx/halloween_ghost_whispers_302.mp3',   // Mixkit #302: Distant ghostly whispers
  halloween_ghost_swoosh_1340: '/sfx/halloween_ghost_swoosh_1340.mp3',     // Mixkit #1340: Ghost fire swoosh
  halloween_haunted_orchestra_634: '/sfx/halloween_haunted_orchestra_634.mp3', // Mixkit #634: Haunted slow orchestra
  halloween_terror_sweep_2630: '/sfx/halloween_terror_sweep_2630.mp3',     // Mixkit #2630: Terror sweep of darkness
  halloween_wolf_howl_1729: '/sfx/halloween_wolf_howl_1729.mp3',           // Mixkit #1729: Lone wolf howling
  halloween_cauldron_bubbles_2999: '/sfx/halloween_cauldron_bubbles_2999.mp3', // Mixkit #2999: Magic cauldron bubbles spell
  halloween_potion_fx_2831: '/sfx/halloween_potion_fx_2831.mp3'            // Mixkit #2831: Magic potion music and fx
};

export const MIXKIT_LOBBY_MUSIC_TRACKS = [
  '/sfx/lobby_music_sanctum_614.mp3', // Mixkit #614: Silent Descent (Dark Atmospheric Sanctum Score)
  '/sfx/lobby_music_drums_676.mp3'    // Mixkit #676: Epical Drums 01 (Medieval Sanctum Percussion)
];

export const MIXKIT_HALLOWEEN_MUSIC_TRACKS = [
  '/sfx/halloween_music_piano_horror_671.mp3', // Mixkit #671: Piano Horror (Eerie Graveyard Piano Score)
  '/sfx/halloween_music_dark_shadows_64.mp3',  // Mixkit #64: Dark Shadows (Haunted Blood-Moon Orchestra)
  '/sfx/halloween_graveyard_wind_1157.mp3',    // Mixkit #1157: Continuous Howling Graveyard Wind Loop
  '/sfx/halloween_tomb_ambience_2500.mp3'      // Mixkit #2500: Creepy Crypt & Tomb Ambience Loop
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

  const activeGameplaySources = new Set();

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

    const isUiOrLoadingKey =
      key.startsWith('lobby_') ||
      key.startsWith('loading_') ||
      key === 'medieval_lock_187';

    const triggerFromBuffer = (buf, actualDelay) => {
      if (!buf || !sfxEnabled) return;
      // Do not trigger delayed gameplay combat/board SFX if the player has already quit to the Lobby
      if (!isUiOrLoadingKey && isLobbyMusicActiveState && actualDelay > 0.05) return;
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

        if (!isUiOrLoadingKey) {
          activeGameplaySources.add(src);
          src.onended = () => {
            activeGameplaySources.delete(src);
          };
        }

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
    if (activeWorldSceneryId === 'haunted_blood_graveyard') {
      playHalloweenWhisperAndWindGustSfx('select');
    }
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
    if (activeWorldSceneryId === 'haunted_blood_graveyard') {
      playHalloweenWhisperAndWindGustSfx(isCapture ? 'capture_glide' : 'move');
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
  // Mixkit Atmospheric Sanctum Loading Screen & Lobby Background Music Controller
  // ==========================================================================
  let lobbyMusicEnabled = true;
  try {
    const savedMusic = localStorage.getItem('wizard_chess_music_enabled');
    if (savedMusic !== null) lobbyMusicEnabled = savedMusic !== 'false';
  } catch (e) {}

  let userMusicVolumeMultiplier = 1.0;
  try {
    const savedMusicVol = localStorage.getItem('wizard_chess_music_volume');
    if (savedMusicVol !== null) {
      const parsedVol = parseFloat(savedMusicVol);
      if (Number.isFinite(parsedVol) && parsedVol > 0.02) {
        userMusicVolumeMultiplier = Math.max(0.05, Math.min(1, parsedVol));
      }
    }
  } catch (e) {}

  let isLobbyMusicActiveState = true; // True during Loading Screen, in Lobby / Armory modal, or whenever no active match is running
  let lobbyPrimaryAudio = null;
  let lobbyDrumsAudio = null;
  let lobbyMusicFadeTimer = null;
  const getPrimaryTargetVol = () => 0.42 * userMusicVolumeMultiplier;
  const getDrumsTargetVol = () => 0.18 * userMusicVolumeMultiplier;

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

    // Lobby & Loading Screen music is controlled by lobbyMusicEnabled & isLobbyMusicActiveState (independent of Combat SFX mute)
    const shouldPlay = lobbyMusicEnabled && isLobbyMusicActiveState;
    if (lobbyMusicFadeTimer) {
      clearInterval(lobbyMusicFadeTimer);
      lobbyMusicFadeTimer = null;
    }

    if (shouldPlay) {
      try {
        lobbyPrimaryAudio.playbackRate = 1.0;
      } catch (e) {}

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
        if (lobbyPrimaryAudio.paused && lobbyMusicEnabled && isLobbyMusicActiveState) {
          const retry1 = lobbyPrimaryAudio.play();
          if (retry1 && typeof retry1.catch === 'function') retry1.catch(() => {});
        }
        if (lobbyDrumsAudio && lobbyDrumsAudio.paused && lobbyMusicEnabled && isLobbyMusicActiveState) {
          const retry2 = lobbyDrumsAudio.play();
          if (retry2 && typeof retry2.catch === 'function') retry2.catch(() => {});
        }

        let done = true;
        const targetPrimary = getPrimaryTargetVol();
        const targetDrums = getDrumsTargetVol();

        if (lobbyPrimaryAudio.volume < targetPrimary - 0.01) {
          lobbyPrimaryAudio.volume = Math.min(targetPrimary, lobbyPrimaryAudio.volume + 0.03);
          done = false;
        } else if (lobbyPrimaryAudio.volume > targetPrimary + 0.01) {
          lobbyPrimaryAudio.volume = Math.max(targetPrimary, lobbyPrimaryAudio.volume - 0.03);
          done = false;
        } else {
          lobbyPrimaryAudio.volume = targetPrimary;
        }
        if (lobbyDrumsAudio) {
          if (lobbyDrumsAudio.volume < targetDrums - 0.008) {
            lobbyDrumsAudio.volume = Math.min(targetDrums, lobbyDrumsAudio.volume + 0.015);
            done = false;
          } else if (lobbyDrumsAudio.volume > targetDrums + 0.008) {
            lobbyDrumsAudio.volume = Math.max(targetDrums, lobbyDrumsAudio.volume - 0.015);
            done = false;
          } else {
            lobbyDrumsAudio.volume = targetDrums;
          }
        }
        if (done && !lobbyPrimaryAudio.paused && lobbyMusicFadeTimer) {
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
    if (isLobbyMusicActiveState) {
      // Entering Loading Screen or Lobby: stop all in-game background loops & gameplay SFX immediately
      stopAllGameplayAudio();
    }
    syncLobbyMusicPlayback();
    syncGraveyardAmbientSoundscape();
  }

  function setLobbyMusicEnabled(enabled) {
    lobbyMusicEnabled = Boolean(enabled);
    if (lobbyMusicEnabled && userMusicVolumeMultiplier <= 0.02) {
      userMusicVolumeMultiplier = 0.85;
    }
    try {
      localStorage.setItem('wizard_chess_music_enabled', String(lobbyMusicEnabled));
    } catch (e) {}
    syncLobbyMusicPlayback();
    syncGraveyardAmbientSoundscape();
    window.dispatchEvent(
      new CustomEvent('wizardchess:musicchange', { detail: { lobbyMusicEnabled } })
    );
    return lobbyMusicEnabled;
  }

  // ==========================================================================
  // Haunted Blood-Moon Graveyard Ambient Soundscape & Eerie Music Engine
  // Powered by actual Mixkit Halloween Audio Assets (ONLY active during an in-progress match)
  // ==========================================================================
  let activeWorldSceneryId = 'gothic_cathedral';
  let graveyardWindAudio = null;
  let graveyardTombAudio = null;
  let graveyardMusicAudio = null;
  let graveyardShadowsAudio = null;
  let graveyardWhisperTimer = null;
  let graveyardWhisperStep = 0;

  function ensureGraveyardAudioElements() {
    if (typeof window === 'undefined' || navigator.webdriver) return false;
    try {
      if (!graveyardWindAudio) {
        graveyardWindAudio = new Audio(MIXKIT_HALLOWEEN_MUSIC_TRACKS[2]);
        graveyardWindAudio.loop = true;
        graveyardWindAudio.preload = 'auto';
        graveyardWindAudio.volume = 0;
      }
      if (!graveyardTombAudio) {
        graveyardTombAudio = new Audio(MIXKIT_HALLOWEEN_MUSIC_TRACKS[3]);
        graveyardTombAudio.loop = true;
        graveyardTombAudio.preload = 'auto';
        graveyardTombAudio.volume = 0;
      }
      if (!graveyardMusicAudio) {
        graveyardMusicAudio = new Audio(MIXKIT_HALLOWEEN_MUSIC_TRACKS[0]);
        graveyardMusicAudio.loop = true;
        graveyardMusicAudio.preload = 'auto';
        graveyardMusicAudio.volume = 0;
      }
      if (!graveyardShadowsAudio) {
        graveyardShadowsAudio = new Audio(MIXKIT_HALLOWEEN_MUSIC_TRACKS[1]);
        graveyardShadowsAudio.loop = true;
        graveyardShadowsAudio.preload = 'auto';
        graveyardShadowsAudio.volume = 0;
      }
      return true;
    } catch (e) {
      return false;
    }
  }

  function playHalloweenWhisperAndWindGustSfx(variant = 'whisper') {
    if (!sfxEnabled) return;
    // Do not play background graveyard whispers/wind gusts while the user is in the Lobby unless explicitly previewing in Armory
    if (isLobbyMusicActiveState && variant !== 'scenery_preview') return;

    if (variant === 'select') {
      playMixkitClip('halloween_cauldron_bubbles_2999', {
        volume: 0.42,
        rate: 1.12,
        maxDuration: 0.55,
        fadeOut: 0.16
      });
      playMixkitClip('halloween_ghost_swoosh_1340', {
        delay: 0.02,
        volume: 0.34,
        rate: 1.18,
        maxDuration: 0.48,
        fadeOut: 0.14
      });
      return;
    }

    if (variant === 'move' || variant === 'capture_glide') {
      playMixkitClip('halloween_ghost_swoosh_1340', {
        volume: variant === 'capture_glide' ? 0.62 : 0.44,
        rate: variant === 'capture_glide' ? 0.94 : 1.08,
        maxDuration: 0.72,
        fadeOut: 0.20
      });
      if (variant === 'capture_glide') {
        playMixkitClip('halloween_ghost_whispers_302', {
          delay: 0.04,
          volume: 0.48,
          rate: 1.04,
          maxDuration: 0.95,
          fadeOut: 0.28
        });
      }
      return;
    }

    // Full Eerie Howling Wind Gust + Distant Ghostly Whispers + Cauldron / Wolf / Orchestra Accents
    const pan = (Math.random() - 0.5) * 1.3;
    playMixkitClip('halloween_ghost_whispers_302', {
      volume: variant === 'scenery_preview' ? 0.68 : 0.52,
      rate: 0.94 + Math.random() * 0.14,
      maxDuration: variant === 'scenery_preview' ? 2.6 : 1.9,
      fadeOut: 0.55,
      pan
    });
    playMixkitClip('halloween_graveyard_wind_1157', {
      delay: 0.03,
      volume: variant === 'scenery_preview' ? 0.58 : 0.44,
      rate: 0.92 + Math.random() * 0.16,
      extraOffset: Math.random() * 2.5,
      maxDuration: variant === 'scenery_preview' ? 2.8 : 2.1,
      fadeIn: 0.18,
      fadeOut: 0.65,
      pan: -pan * 0.7
    });

    if (variant === 'scenery_preview') {
      playMixkitClip('halloween_haunted_orchestra_634', {
        delay: 0.04,
        volume: 0.54,
        rate: 1.0,
        maxDuration: 2.5,
        fadeOut: 0.65
      });
      playMixkitClip('halloween_wolf_howl_1729', {
        delay: 0.18,
        volume: 0.46,
        rate: 0.96,
        maxDuration: 2.4,
        fadeOut: 0.55
      });
      playMixkitClip('cinematic_bell_619', {
        delay: 0.06,
        volume: 0.40,
        rate: 0.76,
        maxDuration: 2.1,
        fadeOut: 0.55
      });
    } else {
      const cycle = graveyardWhisperStep++ % 3;
      if (cycle === 0) {
        playMixkitClip('halloween_cauldron_bubbles_2999', {
          delay: 0.15,
          volume: 0.40,
          rate: 0.98,
          maxDuration: 1.4,
          fadeOut: 0.35
        });
      } else if (cycle === 1) {
        playMixkitClip('halloween_wolf_howl_1729', {
          delay: 0.20,
          volume: 0.38,
          rate: 0.95,
          maxDuration: 2.1,
          fadeOut: 0.50
        });
      } else {
        playMixkitClip('halloween_haunted_orchestra_634', {
          delay: 0.10,
          volume: 0.42,
          rate: 0.96,
          maxDuration: 2.0,
          fadeOut: 0.50
        });
      }
    }
  }

  function stopGraveyardAmbientNodes() {
    if (graveyardWhisperTimer) {
      clearInterval(graveyardWhisperTimer);
      graveyardWhisperTimer = null;
    }
    [graveyardWindAudio, graveyardTombAudio, graveyardMusicAudio, graveyardShadowsAudio].forEach((aud) => {
      if (!aud) return;
      try {
        aud.volume = 0;
        aud.pause();
        aud.currentTime = 0;
      } catch (e) {}
    });
  }

  function stopAllGameplayAudio() {
    stopGraveyardAmbientNodes();
    activeGameplaySources.forEach((src) => {
      try {
        src.stop(0);
        src.disconnect();
      } catch (e) {}
    });
    activeGameplaySources.clear();
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch (e) {}
    }
  }

  function syncGraveyardAmbientSoundscape() {
    if (typeof window === 'undefined' || navigator.webdriver) return;
    const isGraveyard = activeWorldSceneryId === 'haunted_blood_graveyard';
    // Only play the in-game Graveyard ambient loops while an actual match is active (!isLobbyMusicActiveState)
    if (!isGraveyard || !sfxEnabled || isLobbyMusicActiveState) {
      stopGraveyardAmbientNodes();
      return;
    }

    preloadHalloween3DAssets();

    if (ensureGraveyardAudioElements()) {
      const windVol = Math.max(0, Math.min(1, 0.38 * userSfxVolumeMultiplier));
      const tombVol = Math.max(0, Math.min(1, 0.28 * userSfxVolumeMultiplier));
      const pianoVol = lobbyMusicEnabled ? Math.max(0, Math.min(1, 0.36 * userMusicVolumeMultiplier)) : 0;
      const shadowsVol = lobbyMusicEnabled ? Math.max(0, Math.min(1, 0.24 * userMusicVolumeMultiplier)) : 0;

      try {
        graveyardWindAudio.volume = windVol;
        const pWind = graveyardWindAudio.play();
        if (pWind && typeof pWind.catch === 'function') pWind.catch(() => {});
      } catch (e) {}

      try {
        graveyardTombAudio.volume = tombVol;
        const pTomb = graveyardTombAudio.play();
        if (pTomb && typeof pTomb.catch === 'function') pTomb.catch(() => {});
      } catch (e) {}

      try {
        graveyardMusicAudio.volume = pianoVol;
        if (lobbyMusicEnabled) {
          const pMusic = graveyardMusicAudio.play();
          if (pMusic && typeof pMusic.catch === 'function') pMusic.catch(() => {});
        } else {
          graveyardMusicAudio.pause();
        }
      } catch (e) {}

      try {
        graveyardShadowsAudio.volume = shadowsVol;
        if (lobbyMusicEnabled) {
          const pShad = graveyardShadowsAudio.play();
          if (pShad && typeof pShad.catch === 'function') pShad.catch(() => {});
        } else {
          graveyardShadowsAudio.pause();
        }
      } catch (e) {}
    }

    if (!graveyardWhisperTimer) {
      graveyardWhisperTimer = setInterval(() => {
        if (activeWorldSceneryId !== 'haunted_blood_graveyard' || !sfxEnabled || isLobbyMusicActiveState) return;
        playHalloweenWhisperAndWindGustSfx('whisper');
      }, 7200);
    }
  }

  function setActiveWorldScenery(sceneryId) {
    const nextId = typeof sceneryId === 'string' ? sceneryId : sceneryId?.id || 'gothic_cathedral';
    const changed = nextId !== activeWorldSceneryId;
    activeWorldSceneryId = nextId;
    syncGraveyardAmbientSoundscape();
    if (changed && nextId === 'haunted_blood_graveyard' && sfxEnabled && !isLobbyMusicActiveState) {
      playHalloweenWhisperAndWindGustSfx('scenery_preview');
    }
  }

  // Start Loading Screen & Lobby Background Music immediately on initialization,
  // and unlock on any user gesture if browser autoplay policy requires interaction
  if (typeof window !== 'undefined' && !navigator.webdriver) {
    syncLobbyMusicPlayback();

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
      syncGraveyardAmbientSoundscape();
    };
    window.addEventListener('pointerdown', unlockAudioOnFirstGesture, { passive: true });
    window.addEventListener('pointerup', unlockAudioOnFirstGesture, { passive: true });
    window.addEventListener('click', unlockAudioOnFirstGesture, { passive: true });
    window.addEventListener('touchstart', unlockAudioOnFirstGesture, { passive: true });
    window.addEventListener('touchend', unlockAudioOnFirstGesture, { passive: true });
    window.addEventListener('keydown', unlockAudioOnFirstGesture, { passive: true });
  }

  // ==========================================================================
  // Unity-Style Procedural WebAudio SFX Synthesizer Layer
  // Adds real-time sub-bass drops, FM laser sweeps, harmonic crystal chimes & flame-jets
  // ==========================================================================
  function playUnityProceduralLayerSfx(arch = 'gothic_warriors', stage = 'charge', weight = 1.0) {
    const ctx = getAudioCtx();
    if (!ctx || !sfxEnabled) return;
    try {
      const now = ctx.currentTime;
      const bus = getMasterBus(ctx);

      if (arch === 'arcane_cyber') {
        // Sci-Fi FM Plasma Sweep / Sub-Bass EMP Drop
        const osc = ctx.createOscillator();
        const mod = ctx.createOscillator();
        const modGain = ctx.createGain();
        const gain = ctx.createGain();

        osc.type = stage === 'kill' ? 'sawtooth' : 'sine';
        mod.type = 'triangle';
        mod.frequency.setValueAtTime(stage === 'kill' ? 68 : 140, now);
        modGain.gain.setValueAtTime(stage === 'kill' ? 320 : 180, now);
        modGain.gain.exponentialRampToValueAtTime(8, now + 0.42);

        if (stage === 'charge') {
          osc.frequency.setValueAtTime(220, now);
          osc.frequency.exponentialRampToValueAtTime(1180, now + 0.28);
        } else if (stage === 'contact') {
          osc.frequency.setValueAtTime(1450, now);
          osc.frequency.exponentialRampToValueAtTime(160, now + 0.24);
        } else {
          // Orbital Ion Beam Sub-Bass Drop
          osc.frequency.setValueAtTime(420, now);
          osc.frequency.exponentialRampToValueAtTime(38, now + 0.65);
        }

        const dur = stage === 'kill' ? 0.68 : 0.30;
        gain.gain.setValueAtTime(0.001, now);
        gain.gain.linearRampToValueAtTime(stage === 'kill' ? 0.34 : 0.22, now + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);

        mod.connect(modGain);
        modGain.connect(osc.frequency);
        osc.connect(gain);
        gain.connect(bus);
        mod.start(now);
        osc.start(now);
        mod.stop(now + dur + 0.02);
        osc.stop(now + dur + 0.02);
      } else if (arch === 'dragon_elemental') {
        // Volcanic Sub-Bass Rumble + Roaring Flame-Jet Filter Sweep
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';

        if (stage === 'charge') {
          osc.frequency.setValueAtTime(85, now);
          osc.frequency.linearRampToValueAtTime(155, now + 0.35);
          filter.frequency.setValueAtTime(320, now);
          filter.frequency.exponentialRampToValueAtTime(1250, now + 0.35);
        } else {
          osc.frequency.setValueAtTime(130, now);
          osc.frequency.exponentialRampToValueAtTime(32, now + 0.62);
          filter.frequency.setValueAtTime(980, now);
          filter.frequency.exponentialRampToValueAtTime(140, now + 0.62);
        }

        const dur = stage === 'kill' ? 0.65 : 0.36;
        gain.gain.setValueAtTime(0.001, now);
        gain.gain.linearRampToValueAtTime(stage === 'kill' ? 0.36 : 0.24, now + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(bus);
        osc.start(now);
        osc.stop(now + dur + 0.02);
      } else if (arch === 'classic_staunton') {
        // Grandmaster Harmonic Golden Chord + Telekinetic Sub-Drop
        const freqs = stage === 'kill' ? [523.25, 659.25, 783.99, 1046.5] : [440, 659.25, 880];
        const dur = stage === 'kill' ? 0.58 : 0.28;
        freqs.forEach((f, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(f / Math.sqrt(weight), now + idx * 0.018);
          gain.gain.setValueAtTime(0.001, now + idx * 0.018);
          gain.gain.linearRampToValueAtTime(0.11, now + idx * 0.018 + 0.012);
          gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);
          osc.connect(gain);
          gain.connect(bus);
          osc.start(now + idx * 0.018);
          osc.stop(now + dur + 0.03);
        });
      } else if (arch === 'hollow_reapers') {
        // Actual Mixkit Halloween Ghost Swoosh, Terror Sweep & Cauldron Potion FX
        playMixkitClip(stage === 'kill' ? 'halloween_terror_sweep_2630' : 'halloween_ghost_swoosh_1340', {
          volume: stage === 'kill' ? 0.56 : 0.42,
          rate: stage === 'charge' ? 1.08 : 0.94,
          maxDuration: stage === 'kill' ? 1.25 : 0.65,
          fadeOut: 0.22
        });
        playHalloweenWhisperAndWindGustSfx(stage === 'kill' ? 'whisper' : 'select');
      } else {
        // Gothic Sanctum Warriors: Heavy Forged Anvil Harmonic & Cathedral Sub-Drop
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(stage === 'kill' ? 145 : 260, now);
        osc.frequency.exponentialRampToValueAtTime(stage === 'kill' ? 42 : 95, now + 0.45);
        gain.gain.setValueAtTime(0.001, now);
        gain.gain.linearRampToValueAtTime(stage === 'kill' ? 0.32 : 0.18, now + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.46);
        osc.connect(gain);
        gain.connect(bus);
        osc.start(now);
        osc.stop(now + 0.48);
      }
    } catch (e) {}
  }

  // ==========================================================================
  // Multi-Stage Duel SFX: Stage 1 (Charge/Draw) & Stage 2 (Set-Specific Strike)
  // Customized per Chess Piece Set (gothic_warriors, classic_staunton, arcane_cyber, dragon_elemental)
  // ==========================================================================
  function playAttackChargeAndSwingSfx(attackerType = 'queen', victimType = 'pawn', attackerArchetype = 'gothic_warriors') {
    if (!sfxEnabled) return;
    const aType = String(attackerType || 'queen').toLowerCase();
    const vType = String(victimType || 'pawn').toLowerCase();
    const arch = String(attackerArchetype || 'gothic_warriors').toLowerCase();
    const atkWeight = PIECE_WEAPON_WEIGHT[aType] || 1.05;
    const isRoyalOrHeavyDuel =
      vType === 'king' || vType === 'queen' || vType === 'rook' || aType === 'king' || aType === 'queen';
    const pitchScale = 1.04 / Math.sqrt(atkWeight);
    playUnityProceduralLayerSfx(arch, 'charge', atkWeight);

    if (arch === 'classic_staunton') {
      // CLASSIC STAUNTON: Telekinetic Levitation Chime + 360° Spin Whoosh + Imperial Meteor Drop
      playMixkitClip('loading_magic_ring_2344', {
        delay: 0,
        volume: 0.68,
        rate: 1.16 * pitchScale,
        maxDuration: 0.48,
        fadeOut: 0.12
      });
      playMixkitClip('select_metallic_2609', {
        delay: 0.03,
        volume: 0.62,
        rate: 1.08 * pitchScale,
        maxDuration: 0.42,
        fadeOut: 0.10
      });
      playMixkitClip('metal_hit_woosh_1485', {
        delay: 0.22,
        volume: 0.94,
        rate: 0.96 * pitchScale,
        maxDuration: 0.58,
        fadeOut: 0.12
      });
      playMixkitClip('fast_sword_whoosh_2792', {
        delay: 0.25,
        volume: 0.76,
        rate: 1.18 * pitchScale,
        maxDuration: 0.44,
        fadeOut: 0.09
      });
      return;
    }

    if (arch === 'arcane_cyber') {
      // ARCANE CYBER-MECH: Overcharged Reactor Sweep + Gyro Spin Lock + Twin Plasma Blade Dash
      playMixkitClip('loading_magic_sweep_2638', {
        delay: 0,
        volume: 0.78,
        rate: 1.32 * pitchScale,
        maxDuration: 0.52,
        fadeOut: 0.12
      });
      playMixkitClip('magic_sword_slice_2793', {
        delay: 0.04,
        volume: 0.74,
        rate: 1.24 * pitchScale,
        maxDuration: 0.46,
        fadeOut: 0.10
      });
      playMixkitClip('fast_sword_whoosh_2792', {
        delay: 0.22,
        volume: 0.95,
        rate: 1.28 * pitchScale,
        maxDuration: 0.52,
        fadeOut: 0.10
      });
      playMixkitClip('slash_swoosh_1476', {
        delay: 0.24,
        volume: 0.88,
        rate: 1.22,
        highpassFreq: 420,
        maxDuration: 0.55,
        fadeOut: 0.10
      });
      return;
    }

    if (arch === 'dragon_elemental') {
      // DRAGON & ELEMENTAL: Primordial War-Drum Roar + Wing Beat + Hellfire Breath Surge
      playMixkitClip('drums_of_war_2780', {
        delay: 0,
        volume: 0.86,
        rate: 0.92 * pitchScale,
        maxDuration: 0.62,
        fadeOut: 0.16
      });
      playMixkitClip('metal_hit_woosh_1485', {
        delay: 0.08,
        volume: 0.78,
        rate: 0.76 * pitchScale,
        maxDuration: 0.48,
        fadeOut: 0.12
      });
      playMixkitClip('rock_explosion_debris_1703', {
        delay: 0.22,
        volume: 0.84,
        rate: 1.18,
        lowpassFreq: 1800,
        maxDuration: 0.68,
        fadeOut: 0.18
      });
      playMixkitClip('slash_swoosh_1476', {
        delay: 0.24,
        volume: 0.92,
        rate: 0.84 * pitchScale,
        maxDuration: 0.62,
        fadeOut: 0.12
      });
      return;
    }

    if (arch === 'hollow_reapers') {
      // HOLLOW JACK & WRAITH REAPERS: Actual Mixkit Ghost Fire Swoosh + Terror Sweep + Cursed Iron Scythe Cleave
      playMixkitClip('halloween_terror_sweep_2630', {
        delay: 0,
        volume: 0.78,
        rate: 0.96 * pitchScale,
        maxDuration: 0.65,
        fadeOut: 0.16
      });
      playMixkitClip('halloween_ghost_swoosh_1340', {
        delay: 0.04,
        volume: 0.74,
        rate: 1.04 * pitchScale,
        maxDuration: 0.58,
        fadeOut: 0.14
      });
      playMixkitClip('slash_swoosh_1476', {
        delay: 0.22,
        volume: 0.95,
        rate: 0.88 * pitchScale,
        maxDuration: 0.60,
        fadeOut: 0.12
      });
      playMixkitClip('halloween_potion_fx_2831', {
        delay: 0.24,
        volume: 0.72,
        rate: 1.06 * pitchScale,
        maxDuration: 0.62,
        fadeOut: 0.15
      });
      return;
    }

    // DEFAULT: GOTHIC SANCTUM WARRIORS (Forged Medieval Broadsword Draw & Steel Slash)
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
  // Multi-Stage Duel SFX: Stage 3 (Contact Impact & Set-Specific Clash)
  // ==========================================================================
  function playWeaponContactClashSfx(attackerType = 'queen', victimType = 'pawn', attackerArchetype = 'gothic_warriors') {
    if (!sfxEnabled) return;
    const aType = String(attackerType || 'queen').toLowerCase();
    const vType = String(victimType || 'pawn').toLowerCase();
    const arch = String(attackerArchetype || 'gothic_warriors').toLowerCase();
    const atkWeight = PIECE_WEAPON_WEIGHT[aType] || 1.05;
    const vicWeight = PIECE_WEAPON_WEIGHT[vType] || 1.0;
    const clashPitch = 1.05 / Math.sqrt(atkWeight * vicWeight);
    playUnityProceduralLayerSfx(arch, 'contact', atkWeight);

    if (arch === 'classic_staunton') {
      // Grandmaster Hardwood & Brass Meteor Impact + Golden Chime
      playMixkitClip('move_land_thud_2150', {
        delay: 0,
        volume: 0.96,
        rate: 0.92 * clashPitch,
        maxDuration: 0.48,
        fadeOut: 0.12
      });
      playMixkitClip('achievement_bell_600', {
        delay: 0.01,
        volume: 0.72,
        rate: 1.25 * clashPitch,
        maxDuration: 0.68,
        fadeOut: 0.18
      });
      playMixkitClip('sword_hits_metal_2797', {
        delay: 0.04,
        volume: 0.78,
        rate: 1.08 * clashPitch,
        maxDuration: 0.52,
        fadeOut: 0.12
      });
      return;
    }

    if (arch === 'arcane_cyber') {
      // Cyber-Arcane Plasma Lance Discharge & Crystal Resonance Clash
      playMixkitClip('magic_sword_slice_2793', {
        delay: 0,
        volume: 0.96,
        rate: 1.18 * clashPitch,
        maxDuration: 0.65,
        fadeOut: 0.14
      });
      playMixkitClip('samurai_impact_2789', {
        delay: 0.01,
        volume: 0.90,
        rate: 1.22 * clashPitch,
        maxDuration: 0.58,
        fadeOut: 0.12
      });
      playMixkitClip('loading_magic_ring_2344', {
        delay: 0.03,
        volume: 0.74,
        rate: 1.35 * clashPitch,
        maxDuration: 0.62,
        fadeOut: 0.16
      });
      return;
    }

    if (arch === 'dragon_elemental') {
      // Dragon Jaws Maul & Explosive Hellfire Detonation
      playMixkitClip('cinematic_impact_788', {
        delay: 0,
        volume: 0.95,
        rate: 1.02 * clashPitch,
        maxDuration: 0.78,
        fadeOut: 0.18
      });
      playMixkitClip('axe_plate_hit_2774', {
        delay: 0.015,
        volume: 0.92,
        rate: 0.88 * clashPitch,
        maxDuration: 0.68,
        fadeOut: 0.14
      });
      playMixkitClip('heavy_sword_smash_2795', {
        delay: 0.04,
        volume: 0.86,
        rate: 0.85 * clashPitch,
        maxDuration: 0.65,
        fadeOut: 0.15
      });
      return;
    }

    if (arch === 'hollow_reapers') {
      // Reaper Scythe Soul-Harvest Slice + Ghost Swoosh + Cauldron Bubbles + Tolling Graveyard Crypt Bell
      playMixkitClip('samurai_impact_2789', {
        delay: 0,
        volume: 0.95,
        rate: 0.92 * clashPitch,
        maxDuration: 0.65,
        fadeOut: 0.14
      });
      playMixkitClip('halloween_ghost_swoosh_1340', {
        delay: 0.01,
        volume: 0.84,
        rate: 1.02 * clashPitch,
        maxDuration: 0.72,
        fadeOut: 0.18
      });
      playMixkitClip('cinematic_bell_619', {
        delay: 0.015,
        volume: 0.78,
        rate: 0.86 * clashPitch,
        maxDuration: 0.95,
        fadeOut: 0.22
      });
      playMixkitClip('halloween_cauldron_bubbles_2999', {
        delay: 0.03,
        volume: 0.76,
        rate: 1.05 * clashPitch,
        maxDuration: 0.68,
        fadeOut: 0.18
      });
      return;
    }

    // DEFAULT: GOTHIC SANCTUM WARRIORS (Forged Steel-on-Steel Parry Clash)
    playMixkitClip('battle_slashes_2763', {
      delay: 0,
      volume: 0.94,
      rate: clashPitch,
      maxDuration: 0.72,
      fadeOut: 0.14
    });

    playMixkitClip('metallic_strike_2160', {
      delay: 0.01,
      volume: 0.82,
      rate: clashPitch * 1.04,
      maxDuration: 0.58,
      fadeOut: 0.12
    });

    playMixkitClip('battle_blade_attack_2762', {
      delay: 0.065,
      volume: 0.78,
      rate: clashPitch * 1.12,
      maxDuration: 0.55,
      fadeOut: 0.12
    });

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
  // Stage 4: Piece-Specific & Set-Specific Kill SFX
  // ==========================================================================
  function playPieceKillSfx(victimType = 'pawn', attackerType = 'queen', attackerArchetype = 'gothic_warriors') {
    if (!sfxEnabled) return;
    const type = String(victimType || 'pawn').toLowerCase();
    const aType = String(attackerType || 'queen').toLowerCase();
    const arch = String(attackerArchetype || 'gothic_warriors').toLowerCase();
    const atkWeight = PIECE_WEAPON_WEIGHT[aType] || 1.05;
    const atkPitch = 1.02 / Math.sqrt(atkWeight);
    playUnityProceduralLayerSfx(arch, 'kill', atkWeight);

    // Layer Set-Specific Signature Detonation Audio
    if (arch === 'classic_staunton') {
      playMixkitClip('achievement_bell_600', {
        delay: 0,
        volume: 0.78,
        rate: 1.12,
        maxDuration: 1.25,
        fadeOut: 0.28
      });
      playMixkitClip('cinematic_impact_788', {
        delay: 0.01,
        volume: 0.82,
        rate: 1.08,
        maxDuration: 1.15,
        fadeOut: 0.25
      });
    } else if (arch === 'arcane_cyber') {
      playMixkitClip('loading_magic_sweep_2638', {
        delay: 0,
        volume: 0.86,
        rate: 1.18,
        maxDuration: 1.35,
        fadeOut: 0.28
      });
      playMixkitClip('magic_sword_slice_2793', {
        delay: 0.02,
        volume: 0.92,
        rate: 0.94,
        maxDuration: 1.10,
        fadeOut: 0.22
      });
    } else if (arch === 'dragon_elemental') {
      playMixkitClip('rock_explosion_debris_1703', {
        delay: 0,
        volume: 0.96,
        rate: 0.88,
        maxDuration: 1.75,
        fadeOut: 0.35
      });
      playMixkitClip('drums_of_war_2780', {
        delay: 0.02,
        volume: 0.84,
        rate: 0.82,
        maxDuration: 1.45,
        fadeOut: 0.30
      });
    } else if (arch === 'hollow_reapers') {
      playMixkitClip('halloween_haunted_orchestra_634', {
        delay: 0,
        volume: 0.86,
        rate: 0.96,
        maxDuration: 1.85,
        fadeOut: 0.42
      });
      playMixkitClip('halloween_ghost_whispers_302', {
        delay: 0.02,
        volume: 0.82,
        rate: 1.0,
        maxDuration: 1.65,
        fadeOut: 0.38
      });
      playMixkitClip('cinematic_bell_619', {
        delay: 0.01,
        volume: 0.84,
        rate: 0.78,
        maxDuration: 1.85,
        fadeOut: 0.38
      });
      playMixkitClip('rock_explosion_debris_1703', {
        delay: 0.03,
        volume: 0.84,
        rate: 0.96,
        maxDuration: 1.45,
        fadeOut: 0.30
      });
    }

    if (type === 'pawn') {
      // 1. PAWN: VANGUARD SHIELD-BREAKER
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
  // 3D Visual Effects (VFX) System & Piece-Specific + Set-Specific Choreography
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

  const sharedHexRingGeo = new THREE.RingGeometry(0.82, 1.0, 6);
  sharedHexRingGeo.rotateX(-Math.PI / 2);

  const sharedStarRingGeo = new THREE.RingGeometry(0.68, 1.0, 8);
  sharedStarRingGeo.rotateX(-Math.PI / 2);

  const sharedDiscGeo = new THREE.CircleGeometry(1.0, 40);
  sharedDiscGeo.rotateX(-Math.PI / 2);

  const sharedPillarGeo = new THREE.CylinderGeometry(1.0, 1.0, 1.0, 28, 1, true);
  sharedPillarGeo.translate(0, 0.5, 0);

  const sharedConeSpireGeo = new THREE.ConeGeometry(0.12, 0.65, 6);
  sharedConeSpireGeo.translate(0, 0.325, 0);

  const sharedBreathConeGeo = new THREE.ConeGeometry(0.24, 0.62, 20, 1, true);
  sharedBreathConeGeo.rotateX(Math.PI / 2);
  sharedBreathConeGeo.translate(0, 0, -0.26);

  const sharedLaserLanceGeo = new THREE.CylinderGeometry(0.032, 0.055, 0.58, 16, 1, true);
  sharedLaserLanceGeo.rotateX(Math.PI / 2);
  sharedLaserLanceGeo.translate(0, 0, -0.24);

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

  const sharedMagicPlaneGeo = new THREE.PlaneGeometry(1.0, 1.0);
  sharedMagicPlaneGeo.rotateX(-Math.PI / 2);

  const sharedSlashRibbonGeo = new THREE.RingGeometry(0.22, 0.44, 32, 2, -Math.PI * 0.55, Math.PI * 1.1);

  // ==========================================================================
  // Set-Specific Pre-Shatter Weapon Contact & Directional Attack VFX
  // Inspired by itch.io Free VFX Packs (PYROLUX Lite, EDGEFLUX Lite, Arcane VFX Free):
  // - dragon_elemental: Actual Roaring Volumetric Dragon Fire Breath Stream pouring from the dragon's jaws
  //   onto the enemy piece (dual GLSL turbulent flame cones + 48 billowing flame/ember/smoke particles + fireball core + lava splash)
  // - arcane_cyber: Overcharged GLSL Plasma Cannon Beam + 4 Snapping 3D Lightning Arcs + Triple Holo Target Lock
  // - gothic_warriors: EDGEFLUX Triple Staggered GLSL Sword-Wave Slash Ribbons + Sanctum Cross Flash + 36 Anvil Hit-Sparks
  // - classic_staunton: Grandmaster 6-Comet Telekinetic Barrage + 3 Brass Astrolabe Gravity Rings + 8-Point Compass Burst
  // ==========================================================================
  const sharedFireBreathJetGeo = new THREE.ConeGeometry(0.28, 0.76, 28, 18, true);
  // Orient cone so tip is at the dragon's jaws (z = -0.58) and wide roaring mouth engulfs the victim (z = +0.18)
  sharedFireBreathJetGeo.translate(0, -0.38, 0);
  sharedFireBreathJetGeo.rotateX(-Math.PI / 2);
  sharedFireBreathJetGeo.translate(0, 0, -0.58);

  const sharedPlasmaBeamGeo = new THREE.CylinderGeometry(0.055, 0.032, 0.72, 20, 12, true);
  sharedPlasmaBeamGeo.rotateX(Math.PI / 2);
  sharedPlasmaBeamGeo.translate(0, 0, -0.26);

  function spawnWeaponContactVfx(worldPos, dirX = 0, dirZ = 1, victimType = 'pawn', attackerArchetype = 'gothic_warriors') {
    const prof = getArchetypeKillProfile(attackerArchetype, victimType);
    const arch = prof.archetypeId;
    const group = new THREE.Group();
    group.position.set(worldPos.x, boardSurfaceY + 0.22, worldPos.z);

    const headingY = Math.atan2(dirX, dirZ);
    const disposableMats = [];
    const disposableGeos = [];

    const primaryMat = new THREE.MeshBasicMaterial({
      color: prof.primaryHex,
      transparent: true,
      opacity: 0.96,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });
    const secondaryMat = new THREE.MeshBasicMaterial({
      color: prof.secondaryHex,
      transparent: true,
      opacity: 0.92,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });
    const flashMat = new THREE.MeshBasicMaterial({
      color: prof.coreHex,
      transparent: true,
      opacity: 0.98,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });
    disposableMats.push(primaryMat, secondaryMat, flashMat);

    // Soft-Particle Star-Flare Billboard at Impact Point
    const starTex = getUnityStarFlareTexture();
    const flareSpriteMat = new THREE.SpriteMaterial({
      map: starTex,
      color: prof.coreHex,
      transparent: true,
      opacity: 1.0,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    disposableMats.push(flareSpriteMat);
    const flareSprite = new THREE.Sprite(flareSpriteMat);
    flareSprite.scale.setScalar(0.48);
    group.add(flareSprite);

    const flashSphere = new THREE.Mesh(sharedSphereGeo, flashMat);
    flashSphere.scale.setScalar(0.07);
    group.add(flashSphere);

    // ========================================================================
    // 1. DRAGON & ELEMENTAL GUARDIANS: TARGET IMPACT ENGULFMENT
    // (The real PYROLUX fire-breathing stream pours directly from the attacking Dragon's moving jaws;
    // here on the victim square we spawn the impact fireball bloom, engulfing flame puffs & lava splash)
    // ========================================================================
    if (arch === 'dragon_elemental') {
      // A. Rolling Draconic Fireball Impact Sphere engulfing the victim piece
      const fireballMat = createUnityFresnelDissolveSphereMaterial(0xff9e00, 0xff2a00, 0xffffff);
      disposableMats.push(fireballMat);
      const fireballCore = new THREE.Mesh(sharedSphereGeo, fireballMat);
      fireballCore.scale.setScalar(0.14);
      group.add(fireballCore);

      // B. 18 Engulfing PYROLUX Soft-Particle Flame & Smoke Billboards swirling up the victim piece
      const flameTex = getUnityFireFlameTexture();
      const flameParticles = [];
      for (let i = 0; i < 18; i++) {
        const pMat = new THREE.SpriteMaterial({
          map: flameTex,
          color: 0xffffff,
          transparent: true,
          opacity: 0.95,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
          rotation: Math.random() * Math.PI * 2
        });
        disposableMats.push(pMat);
        const sp = new THREE.Sprite(pMat);
        group.add(sp);
        flameParticles.push({
          sprite: sp,
          mat: pMat,
          phase: i / 18,
          speed: 2.0 + (i % 4) * 0.35,
          swirlAngle: (i / 18) * Math.PI * 2,
          swirlRadius: 0.05 + (i % 5) * 0.028,
          rotSpeed: (i % 2 === 0 ? 1 : -1) * (2.6 + (i % 3) * 0.8),
          baseScale: 0.16 + (i % 4) * 0.05
        });
      }

      // C. 20 Splashing Molten Lava Droplets & Scorched Cinders erupting at the target's feet
      const lavaDrops = [];
      for (let i = 0; i < 20; i++) {
        const dMesh = new THREE.Mesh(
          sharedSparkGeo,
          i % 3 === 0 ? flashMat : i % 2 === 0 ? primaryMat : secondaryMat
        );
        const ang = (i / 20) * Math.PI * 2 + (Math.random() - 0.5) * 0.25;
        const spd = 0.65 + Math.random() * 1.15;
        dMesh.scale.setScalar(1.35);
        group.add(dMesh);
        lavaDrops.push({
          mesh: dMesh,
          vx: Math.cos(ang) * spd + dirX * 0.55,
          vy: 0.55 + Math.random() * 1.15,
          vz: Math.sin(ang) * spd + dirZ * 0.55
        });
      }

      const cWhite = new THREE.Color(0xfff8d6);
      const cGold = new THREE.Color(0xffbe0b);
      const cOrange = new THREE.Color(0xff4d00);
      const cCrimson = new THREE.Color(0x9b0014);

      addVfxUpdater(
        group,
        0.58,
        (u, elapsed, dt) => {
          fireballCore.scale.setScalar(0.12 + Math.sin(u * Math.PI) * 0.22);
          fireballMat.uniforms.uTime.value = elapsed;
          fireballMat.uniforms.uDissolve.value = Math.max(0, (u - 0.2) / 0.8);

          const lifeFade = 1.0 - Math.pow(u, 1.45);
          for (let i = 0; i < flameParticles.length; i++) {
            const fp = flameParticles[i];
            const p = (elapsed * fp.speed + fp.phase) % 1.0;
            const swA = fp.swirlAngle + elapsed * 8.0 + p * 3.2;
            const rad = fp.swirlRadius * (0.6 + p * 1.1);
            fp.sprite.position.set(
              Math.cos(swA) * rad,
              (p - 0.2) * 0.36,
              Math.sin(swA) * rad
            );
            fp.sprite.scale.setScalar(fp.baseScale * (0.5 + p * 1.2) * (0.8 + 0.4 * Math.sin(u * Math.PI)));
            fp.mat.rotation += fp.rotSpeed * dt;

            if (p < 0.28) {
              fp.mat.color.lerpColors(cWhite, cGold, p / 0.28);
            } else if (p < 0.68) {
              fp.mat.color.lerpColors(cGold, cOrange, (p - 0.28) / 0.40);
            } else {
              fp.mat.color.lerpColors(cOrange, cCrimson, (p - 0.68) / 0.32);
            }
            fp.mat.opacity = Math.max(0, Math.sin(p * Math.PI) * lifeFade * 0.95);
          }

          flareSprite.scale.setScalar(0.38 + Math.sin(u * Math.PI) * 0.52);
          flareSpriteMat.opacity = 1.0 - u * u;
          flashSphere.scale.setScalar(0.08 + Math.sin(u * Math.PI) * 0.22);
          flashMat.opacity = 0.98 * (1 - u * u);
          primaryMat.opacity = 0.96 * (1 - u);
          secondaryMat.opacity = 0.92 * (1 - u);

          for (const ld of lavaDrops) {
            ld.mesh.position.x += ld.vx * dt;
            ld.mesh.position.y += ld.vy * dt;
            ld.mesh.position.z += ld.vz * dt;
            ld.vy -= 4.6 * dt;
            ld.mesh.scale.setScalar(Math.max(0.05, (1 - u) * 1.35));
          }
        },
        disposableMats,
        disposableGeos
      );
      return;
    }

    // ========================================================================
    // 2. ARCANE RUNIC & CYBER-MECH: ARC LIGHTNING, HEX TARGET-LOCK & ION SPARKS
    // (Coherent laser beams fire directly from the Mech's integrated chest & cannon emitters)
    // ========================================================================
    if (arch === 'arcane_cyber') {
      const cyberRig = new THREE.Group();
      cyberRig.rotation.y = headingY;
      group.add(cyberRig);

      // A. 4 Snapping 3D Jagged Electric Arc Lightning Bolts bridging Attacker -> Target
      const arcBolts = [];
      for (let i = 0; i < 4; i++) {
        const boltGeo = buildJaggedLightningGeometry(0.68, 12, 0.085, i === 0 ? 0.016 : 0.011);
        boltGeo.rotateX(Math.PI / 2);
        boltGeo.translate(0, 0, -0.62);
        disposableGeos.push(boltGeo);
        const boltMesh = new THREE.Mesh(boltGeo, i % 2 === 0 ? flashMat : primaryMat);
        boltMesh.rotation.z = (i / 4) * Math.PI * 2;
        cyberRig.add(boltMesh);
        arcBolts.push(boltMesh);
      }

      // B. Triple Counter-Rotating Holographic Hex Target-Lock Reticle on the Victim
      const reticleRings = [];
      for (let r = 0; r < 3; r++) {
        const rMesh = new THREE.Mesh(sharedHexRingGeo, r === 0 ? flashMat : r === 1 ? primaryMat : secondaryMat);
        rMesh.rotation.x = Math.PI / 2;
        rMesh.position.z = -0.10 + r * 0.09;
        cyberRig.add(rMesh);
        reticleRings.push({ mesh: rMesh, idx: r });
      }

      // C. 26 High-Velocity Cyan/Violet Plasma Ion Particles
      const ions = [];
      for (let i = 0; i < 26; i++) {
        const spMesh = new THREE.Mesh(
          sharedSparkGeo,
          i % 3 === 0 ? flashMat : i % 2 === 0 ? primaryMat : secondaryMat
        );
        const ang = (i / 26) * Math.PI * 2;
        ions.push({
          mesh: spMesh,
          vx: Math.cos(ang) * (0.85 + Math.random() * 1.1) + dirX * 0.65,
          vy: (Math.random() - 0.25) * 1.4,
          vz: Math.sin(ang) * (0.85 + Math.random() * 1.1) + dirZ * 0.65
        });
        group.add(spMesh);
      }

      addVfxUpdater(
        group,
        0.48,
        (u, elapsed, dt) => {
          for (let i = 0; i < arcBolts.length; i++) {
            const b = arcBolts[i];
            b.rotation.z += dt * (i % 2 === 0 ? 22.0 : -22.0);
            const flicker = 0.6 + 0.6 * Math.sin(elapsed * 80.0 + i * 2.1);
            b.scale.set(flicker, flicker, 1.0);
          }

          for (const rt of reticleRings) {
            const s = (0.14 + rt.idx * 0.06) + u * (0.34 + rt.idx * 0.12);
            rt.mesh.scale.setScalar(s);
            rt.mesh.rotation.z += dt * (rt.idx % 2 === 0 ? 14.0 : -14.0);
          }

          flareSprite.scale.setScalar(0.36 + Math.sin(u * Math.PI) * 0.48);
          flareSpriteMat.opacity = 1.0 - u * u;
          flashSphere.scale.setScalar(0.08 + Math.sin(u * Math.PI) * 0.18);
          flashMat.opacity = 0.98 * (1 - u * u);
          primaryMat.opacity = 0.96 * (1 - u);
          secondaryMat.opacity = 0.92 * (1 - u);

          for (const ion of ions) {
            ion.mesh.position.x += ion.vx * dt;
            ion.mesh.position.y += ion.vy * dt;
            ion.mesh.position.z += ion.vz * dt;
            ion.mesh.scale.setScalar(Math.max(0.04, (1 - u) * 1.25));
          }
        },
        disposableMats,
        disposableGeos
      );
      return;
    }

    // ========================================================================
    // 3. CLASSIC STAUNTON TOURNAMENT: GRANDMASTER TELEKINETIC COMET BARRAGE
    // ========================================================================
    if (arch === 'classic_staunton') {
      // A. 6 Streaking Golden Arcane Comets diving from a levitating crown halo into the victim
      const comets = [];
      for (let i = 0; i < 6; i++) {
        const cometPivot = new THREE.Group();
        const headSpriteMat = new THREE.SpriteMaterial({
          map: starTex,
          color: i % 2 === 0 ? 0xffffff : 0xffd166,
          transparent: true,
          opacity: 1.0,
          blending: THREE.AdditiveBlending,
          depthWrite: false
        });
        disposableMats.push(headSpriteMat);
        const headSprite = new THREE.Sprite(headSpriteMat);
        headSprite.scale.setScalar(0.24);
        cometPivot.add(headSprite);

        const tailMesh = new THREE.Mesh(sharedConeSpireGeo, i % 2 === 0 ? primaryMat : secondaryMat);
        tailMesh.scale.set(0.35, 0.55, 0.35);
        tailMesh.rotation.x = -Math.PI / 2;
        cometPivot.add(tailMesh);

        const ang = (i / 6) * Math.PI * 2;
        const startPos = new THREE.Vector3(
          -dirX * 0.32 + Math.cos(ang) * 0.28,
          0.48 + (i % 2) * 0.14,
          -dirZ * 0.32 + Math.sin(ang) * 0.28
        );
        const endPos = new THREE.Vector3(
          Math.cos(ang + 0.5) * 0.06,
          -0.06,
          Math.sin(ang + 0.5) * 0.06
        );
        cometPivot.position.copy(startPos);
        cometPivot.lookAt(endPos);
        group.add(cometPivot);
        comets.push({
          pivot: cometPivot,
          mat: headSpriteMat,
          startPos,
          endPos,
          delay: i * 0.045
        });
      }

      // B. 8-Pointed Grandmaster Compass Star & 2 Gyroscopic Brass Astrolabe Rings
      const compassStar = new THREE.Mesh(sharedStarRingGeo, primaryMat);
      compassStar.position.y = -0.18;
      group.add(compassStar);

      const gyro1 = new THREE.Mesh(sharedThinRingGeo, secondaryMat);
      gyro1.rotation.x = Math.PI * 0.35;
      gyro1.rotation.y = headingY;
      group.add(gyro1);

      const gyro2 = new THREE.Mesh(sharedThinRingGeo, flashMat);
      gyro2.rotation.x = -Math.PI * 0.35;
      gyro2.rotation.y = headingY + Math.PI * 0.25;
      group.add(gyro2);

      addVfxUpdater(
        group,
        0.48,
        (u, elapsed, dt) => {
          for (const cm of comets) {
            const localU = Math.max(0, Math.min(1, (u - cm.delay) / Math.max(0.2, 0.72 - cm.delay)));
            const ease = localU * localU * (3 - 2 * localU);
            cm.pivot.position.lerpVectors(cm.startPos, cm.endPos, ease);
            const cScale = Math.sin(localU * Math.PI) * 1.15;
            cm.pivot.scale.setScalar(Math.max(0.01, cScale));
            cm.mat.opacity = Math.sin(localU * Math.PI);
          }

          compassStar.scale.setScalar(0.14 + u * 0.62);
          compassStar.rotation.z += dt * 10.0;
          gyro1.scale.setScalar(0.16 + u * 0.52);
          gyro1.rotation.z += dt * 12.0;
          gyro2.scale.setScalar(0.14 + u * 0.46);
          gyro2.rotation.z -= dt * 14.0;

          flareSprite.scale.setScalar(0.35 + Math.sin(u * Math.PI) * 0.45);
          flareSpriteMat.opacity = 1.0 - u * u;
          flashSphere.scale.setScalar(0.07 + Math.sin(u * Math.PI) * 0.18);
          flashMat.opacity = 0.98 * (1 - u * u);
          primaryMat.opacity = 0.96 * (1 - u);
          secondaryMat.opacity = 0.92 * (1 - u);
        },
        disposableMats,
        disposableGeos
      );
      return;
    }

    // ========================================================================
    // 3b. HOLLOW JACK & WRAITH REAPERS: SAMHAIN SCYTHE SLASH + SWARM OF BATS + CAULDRON POTION SPLASH
    // ========================================================================
    if (arch === 'hollow_reapers') {
      const reaperWaves = [];
      const reaperConfigs = [
        { tiltX: Math.PI * 0.36, tiltZ: 0.45, scaleMul: 1.12, speed: 15.0, pHex: 0xff6d00, sHex: 0x00e676 },
        { tiltX: -Math.PI * 0.36, tiltZ: -0.45, scaleMul: 1.04, speed: -16.0, pHex: 0x00e676, sHex: 0x9d4edd },
        { tiltX: Math.PI * 0.50, tiltZ: 0.0, scaleMul: 1.24, speed: 18.0, pHex: 0xff9100, sHex: 0xffe066 }
      ];
      for (const cfg of reaperConfigs) {
        const sMat = createUnitySlashRibbonShaderMaterial(cfg.pHex, cfg.sHex, prof.coreHex);
        disposableMats.push(sMat);
        const sMesh = new THREE.Mesh(sharedSlashRibbonGeo, sMat);
        sMesh.rotation.set(cfg.tiltX, headingY, cfg.tiltZ);
        group.add(sMesh);
        reaperWaves.push({ mesh: sMesh, mat: sMat, cfg });
      }

      // 12 Flying Vampire Bat Billboards & 4 Ghost Spirits bursting from the Reaper Scythe cleave
      const batTex = getHalloweenBatTexture();
      const ghostTex = getHalloweenGhostTexture();
      const batSprites = [];
      for (let i = 0; i < 12; i++) {
        const isGhost = i % 4 === 0;
        const bMat = new THREE.SpriteMaterial({
          map: isGhost ? ghostTex : batTex,
          color: 0xffffff,
          transparent: true,
          opacity: 0.98,
          depthWrite: false
        });
        disposableMats.push(bMat);
        const sp = new THREE.Sprite(bMat);
        sp.scale.setScalar(isGhost ? 0.24 : 0.20);
        group.add(sp);
        const ang = (i / 12) * Math.PI * 2;
        batSprites.push({
          sprite: sp,
          mat: bMat,
          ang,
          radSpeed: 0.95 + (i % 3) * 0.35,
          vy: 0.75 + (i % 4) * 0.32,
          wobblePhase: i * 0.9,
          baseScale: isGhost ? 0.24 : 0.20
        });
      }

      // 24 Bubbling Witch Cauldron Green Potion & Jack-o'-Lantern Ember Droplets
      const potionDrops = [];
      for (let i = 0; i < 24; i++) {
        const spMesh = new THREE.Mesh(
          sharedSphereGeo,
          i % 3 === 0 ? flashMat : i % 2 === 0 ? primaryMat : secondaryMat
        );
        const ang = (i / 24) * Math.PI * 2;
        spMesh.scale.setScalar(0.028);
        potionDrops.push({
          mesh: spMesh,
          vx: Math.cos(ang) * (0.75 + Math.random() * 0.95) + dirX * 0.45,
          vy: 0.55 + Math.random() * 1.15,
          vz: Math.sin(ang) * (0.75 + Math.random() * 0.95) + dirZ * 0.45
        });
        group.add(spMesh);
      }

      addVfxUpdater(
        group,
        0.54,
        (u, elapsed, dt) => {
          for (const rw of reaperWaves) {
            rw.mat.uniforms.uTime.value = elapsed;
            rw.mat.uniforms.uProgress.value = u;
            rw.mesh.scale.setScalar((0.80 + u * 1.18) * rw.cfg.scaleMul);
            rw.mesh.rotation.z += dt * rw.cfg.speed;
          }

          for (const b of batSprites) {
            const curR = 0.08 + u * b.radSpeed * 0.55;
            const curAng = b.ang + elapsed * 5.2;
            b.sprite.position.set(
              Math.cos(curAng) * curR,
              u * b.vy * 0.55 + Math.sin(elapsed * 18.0 + b.wobblePhase) * 0.04,
              Math.sin(curAng) * curR
            );
            const flap = 1.0 + Math.sin(elapsed * 26.0 + b.wobblePhase) * 0.22;
            const fade = Math.max(0.02, 1 - Math.pow(u, 1.5));
            b.sprite.scale.set(b.baseScale * flap * fade, b.baseScale * fade, 1);
            b.mat.opacity = 0.98 * fade;
          }

          flareSprite.scale.setScalar(0.40 + Math.sin(u * Math.PI) * 0.48);
          flareSpriteMat.opacity = 1.0 - u * u;
          flashSphere.scale.setScalar(0.08 + Math.sin(u * Math.PI) * 0.18);
          flashMat.opacity = 0.98 * (1 - u * u);
          primaryMat.opacity = 0.96 * (1 - u);
          secondaryMat.opacity = 0.92 * (1 - u);

          for (const pd of potionDrops) {
            pd.mesh.position.x += pd.vx * dt;
            pd.mesh.position.y += pd.vy * dt;
            pd.mesh.position.z += pd.vz * dt;
            pd.vy -= 3.8 * dt;
            pd.mesh.scale.setScalar(0.028 * Math.max(0.05, 1 - u));
          }
        },
        disposableMats,
        disposableGeos
      );
      return;
    }

    // ========================================================================
    // 4. GOTHIC SANCTUM WARRIORS: EDGEFLUX TRIPLE SWORD-SLASH WAVES & ANVIL SPARKS
    // ========================================================================
    const slashWaves = [];
    const slashConfigs = [
      { tiltX: Math.PI * 0.34, tiltZ: 0.42, scaleMul: 1.05, speed: 14.0, pHex: 0xff6b35, sHex: 0xffd166 },
      { tiltX: -Math.PI * 0.34, tiltZ: -0.42, scaleMul: 0.96, speed: -15.0, pHex: 0xff2a55, sHex: 0xffb703 },
      { tiltX: Math.PI * 0.48, tiltZ: 0.0, scaleMul: 1.18, speed: 17.0, pHex: 0xffd166, sHex: 0xffffff }
    ];
    for (const cfg of slashConfigs) {
      const sMat = createUnitySlashRibbonShaderMaterial(cfg.pHex, cfg.sHex, prof.coreHex);
      disposableMats.push(sMat);
      const sMesh = new THREE.Mesh(sharedSlashRibbonGeo, sMat);
      sMesh.rotation.set(cfg.tiltX, headingY, cfg.tiltZ);
      group.add(sMesh);
      slashWaves.push({ mesh: sMesh, mat: sMat, cfg });
    }

    // Consecrated Golden Sanctum Cross Flash at the blade intersection
    const sanctumCrossGroup = new THREE.Group();
    sanctumCrossGroup.rotation.y = headingY;
    const vBarGeo = new THREE.BoxGeometry(0.028, 0.38, 0.028);
    const hBarGeo = new THREE.BoxGeometry(0.26, 0.028, 0.028);
    disposableGeos.push(vBarGeo, hBarGeo);
    const vBar = new THREE.Mesh(vBarGeo, flashMat);
    const hBar = new THREE.Mesh(hBarGeo, secondaryMat);
    hBar.position.y = 0.05;
    sanctumCrossGroup.add(vBar, hBar);
    group.add(sanctumCrossGroup);

    // 32 High-Velocity Forged-Steel Anvil Hit-Sparks spraying outward
    const sparks = [];
    for (let i = 0; i < 32; i++) {
      const spMesh = new THREE.Mesh(
        sharedSparkGeo,
        i % 3 === 0 ? flashMat : i % 2 === 0 ? primaryMat : secondaryMat
      );
      const ang = (i / 32) * Math.PI * 2;
      spMesh.scale.set(0.65, 2.2, 0.65);
      sparks.push({
        mesh: spMesh,
        vx: Math.cos(ang) * (0.85 + Math.random() * 1.15) + dirX * 0.55,
        vy: 0.48 + Math.random() * 1.25,
        vz: Math.sin(ang) * (0.85 + Math.random() * 1.15) + dirZ * 0.55
      });
      group.add(spMesh);
    }

    addVfxUpdater(
      group,
      0.44,
      (u, elapsed, dt) => {
        for (const sw of slashWaves) {
          sw.mat.uniforms.uTime.value = elapsed;
          sw.mat.uniforms.uProgress.value = u;
          sw.mesh.scale.setScalar((0.78 + u * 1.12) * sw.cfg.scaleMul);
          sw.mesh.rotation.z += dt * sw.cfg.speed;
        }

        const crossPulse = Math.sin(u * Math.PI) * 1.25;
        sanctumCrossGroup.scale.setScalar(Math.max(0.01, crossPulse));

        flareSprite.scale.setScalar(0.38 + Math.sin(u * Math.PI) * 0.46);
        flareSpriteMat.opacity = 1.0 - u * u;

        const coreS = 0.07 + Math.sin(u * Math.PI) * 0.18;
        flashSphere.scale.setScalar(coreS);
        flashMat.opacity = 0.98 * (1 - u * u);
        primaryMat.opacity = 0.96 * (1 - u);
        secondaryMat.opacity = 0.92 * (1 - u);

        for (const sp of sparks) {
          sp.mesh.position.x += sp.vx * dt;
          sp.mesh.position.y += sp.vy * dt;
          sp.mesh.position.z += sp.vz * dt;
          sp.vy -= 4.5 * dt;
          sp.mesh.rotation.x += dt * 12.0;
          sp.mesh.rotation.z += dt * 12.0;
          const s = Math.max(0.04, 1 - u);
          sp.mesh.scale.set(0.65 * s, 2.2 * s, 0.65 * s);
        }
      },
      disposableMats,
      disposableGeos
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
  // Set-Specific Signature 3D Kill Effect Spawner (Unity URP ShaderGraph + Shuriken VFX)
  // Combines:
  // 1. Unity Procedural Magic Circle / Voronoi Magma Crack Ground Decal Shader
  // 2. Unity URP Fresnel & Noise-Dissolve Energy Sphere Shader
  // 3. Unity Soft-Particle Star-Flare Billboards & Set-Specific 3D Meshes
  // ==========================================================================
  function spawnArchetypeSignatureKillVfx(worldPos, attackerArchetype = 'gothic_warriors', victimType = 'pawn') {
    const prof = getArchetypeKillProfile(attackerArchetype, victimType);
    const arch = prof.archetypeId;

    const group = new THREE.Group();
    group.position.set(worldPos.x, boardSurfaceY, worldPos.z);

    const mats = [];
    const geos = [];

    const pMat = new THREE.MeshBasicMaterial({
      color: prof.primaryHex,
      transparent: true,
      opacity: 0.95,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });
    const sMat = new THREE.MeshBasicMaterial({
      color: prof.secondaryHex,
      transparent: true,
      opacity: 0.90,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });
    const cMat = new THREE.MeshBasicMaterial({
      color: prof.coreHex,
      transparent: true,
      opacity: 0.98,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });

    const styleIndex =
      arch === 'classic_staunton' ? 1 : arch === 'arcane_cyber' ? 2 : arch === 'dragon_elemental' ? 3 : 0;

    // 1. Unity Procedural Magic Circle / Voronoi Ground Crack Shader Decal
    const magicCircleShaderMat = createUnityMagicCircleShaderMaterial(
      prof.primaryHex,
      prof.secondaryHex,
      prof.coreHex,
      styleIndex
    );
    const magicCircleMesh = new THREE.Mesh(sharedMagicPlaneGeo, magicCircleShaderMat);
    magicCircleMesh.position.y = 0.016;
    group.add(magicCircleMesh);

    // 2. Unity URP Fresnel & Noise-Dissolve Energy Sphere
    const fresnelSphereShaderMat = createUnityFresnelDissolveSphereMaterial(
      prof.primaryHex,
      prof.secondaryHex,
      prof.coreHex
    );
    const fresnelSphereMesh = new THREE.Mesh(sharedSphereGeo, fresnelSphereShaderMat);
    fresnelSphereMesh.position.y = 0.24;
    fresnelSphereMesh.scale.setScalar(0.12);
    group.add(fresnelSphereMesh);

    // 3. Unity Shuriken Star-Flare Billboards
    const starTex = getUnityStarFlareTexture();
    const starSprites = [];
    for (let i = 0; i < 8; i++) {
      const spMat = new THREE.SpriteMaterial({
        map: starTex,
        color: i % 2 === 0 ? prof.coreHex : prof.primaryHex,
        transparent: true,
        opacity: 0.95,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });
      mats.push(spMat);
      const sp = new THREE.Sprite(spMat);
      const ang = (i / 8) * Math.PI * 2;
      sp.position.set(Math.cos(ang) * 0.14, 0.14 + (i % 3) * 0.08, Math.sin(ang) * 0.14);
      sp.scale.setScalar(0.16);
      group.add(sp);
      starSprites.push({ sprite: sp, mat: spMat, ang, vy: 0.55 + (i % 3) * 0.28 });
    }

    mats.push(pMat, sMat, cMat, magicCircleShaderMat, fresnelSphereShaderMat);

    const stepCommonUnityShaders = (u, elapsed, dt, ease) => {
      magicCircleShaderMat.uniforms.uTime.value = elapsed;
      magicCircleShaderMat.uniforms.uProgress.value = u;
      magicCircleMesh.scale.setScalar(0.28 + ease * 0.72);
      magicCircleMesh.rotation.z += dt * (styleIndex === 2 ? 2.4 : 1.4);

      fresnelSphereShaderMat.uniforms.uTime.value = elapsed;
      fresnelSphereShaderMat.uniforms.uDissolve.value = Math.min(1, u * 1.12);
      fresnelSphereMesh.scale.setScalar(0.12 + ease * 0.44);
      fresnelSphereMesh.rotation.y += dt * 3.2;

      for (const st of starSprites) {
        const r = 0.14 + ease * 0.34;
        st.sprite.position.x = Math.cos(st.ang + elapsed * 2.5) * r;
        st.sprite.position.z = Math.sin(st.ang + elapsed * 2.5) * r;
        st.sprite.position.y += st.vy * dt;
        st.sprite.scale.setScalar(0.18 * Math.max(0.02, 1 - u));
        st.mat.opacity = 0.95 * (1 - u);
      }
    };

    if (arch === 'arcane_cyber') {
      // ARCANE CYBER-MECH SIGNATURE: Counter-Rotating Hex Holo-Grids + Cyber EMP Dome
      const empDome = new THREE.Mesh(sharedDomeGeo, sMat);
      empDome.scale.setScalar(0.12);
      group.add(empDome);

      const hexGrid1 = new THREE.Mesh(sharedHexRingGeo, pMat);
      hexGrid1.position.y = 0.024;
      group.add(hexGrid1);

      const hexGrid2 = new THREE.Mesh(sharedHexRingGeo, sMat);
      hexGrid2.position.y = 0.18;
      group.add(hexGrid2);

      addVfxUpdater(
        group,
        1.45,
        (u, elapsed, dt) => {
          const ease = 1 - Math.pow(1 - u, 3);
          stepCommonUnityShaders(u, elapsed, dt, ease);

          empDome.scale.setScalar(0.14 + ease * 0.78);
          empDome.rotation.y += dt * 3.5;

          hexGrid1.scale.setScalar(0.16 + ease * 0.85);
          hexGrid1.rotation.z += dt * 4.5;
          hexGrid2.scale.setScalar(0.12 + ease * 0.62);
          hexGrid2.position.y = 0.12 + ease * 0.55;
          hexGrid2.rotation.z -= dt * 5.5;

          pMat.opacity = 0.95 * Math.pow(1 - u, 1.3);
          sMat.opacity = 0.72 * Math.pow(1 - u, 1.4);
          cMat.opacity = 0.98 * Math.pow(1 - u, 1.5);
        },
        mats,
        geos
      );
      return;
    }

    if (arch === 'dragon_elemental') {
      // DRAGON & ELEMENTAL SIGNATURE: Volcanic Magma Geyser + 10 Erupting Obsidian Crag Spikes + Swirling Fire Tornado
      const fireGeyser = new THREE.Mesh(sharedPillarGeo, pMat);
      fireGeyser.scale.set(0.18, 0.1, 0.18);
      group.add(fireGeyser);

      const crags = [];
      for (let i = 0; i < 10; i++) {
        const ang = (i / 10) * Math.PI * 2;
        const crag = new THREE.Mesh(sharedConeSpireGeo, i % 2 === 0 ? pMat : sMat);
        const rad = 0.15 + (i % 2) * 0.08;
        crag.position.set(Math.cos(ang) * rad, -0.24, Math.sin(ang) * rad);
        crag.rotation.z = -Math.cos(ang) * 0.42;
        crag.rotation.x = Math.sin(ang) * 0.42;
        group.add(crag);
        crags.push({ mesh: crag, peakH: 0.45 + (i % 3) * 0.15 });
      }

      const vortexRings = [];
      for (let v = 0; v < 4; v++) {
        const vr = new THREE.Mesh(sharedRingGeo, v % 2 === 0 ? sMat : cMat);
        vr.position.y = 0.08 + v * 0.16;
        group.add(vr);
        vortexRings.push({ mesh: vr, idx: v });
      }

      addVfxUpdater(
        group,
        1.55,
        (u, elapsed, dt) => {
          const ease = 1 - Math.pow(1 - u, 3);
          stepCommonUnityShaders(u, elapsed, dt, ease);
          const geyserH = Math.sin(Math.min(1, u * 1.45) * Math.PI) * 1.65;
          const geyserR = 0.15 + ease * 0.24;
          fireGeyser.scale.set(geyserR, Math.max(0.02, geyserH), geyserR);
          fireGeyser.rotation.y += dt * 6.5;

          const cragEnv = u < 0.26 ? ease / 0.26 : Math.max(0, 1 - (u - 0.26) / 0.74);
          for (const cr of crags) {
            cr.mesh.position.y = -0.22 + cragEnv * cr.peakH;
          }

          for (const vr of vortexRings) {
            vr.mesh.position.y = 0.06 + vr.idx * 0.18 + u * 0.68;
            const rS = (0.14 + vr.idx * 0.06) * (1 + ease * 1.35);
            vr.mesh.scale.set(rS, 1, rS);
            vr.mesh.rotation.z += dt * (8 + vr.idx * 2);
          }

          pMat.opacity = 0.95 * Math.pow(1 - u, 1.25);
          sMat.opacity = 0.92 * Math.pow(1 - u, 1.35);
          cMat.opacity = 0.98 * Math.pow(1 - u, 1.5);
        },
        mats,
        geos
      );
      return;
    }

    if (arch === 'classic_staunton') {
      // CLASSIC STAUNTON SIGNATURE: Imperial Golden Compass Star + 3 Brass Astrolabe Rings + 8 Ascending Crown Orbs
      const starSigil1 = new THREE.Mesh(sharedStarRingGeo, pMat);
      starSigil1.position.y = 0.022;
      group.add(starSigil1);

      const starSigil2 = new THREE.Mesh(sharedStarRingGeo, cMat);
      starSigil2.position.y = 0.026;
      starSigil2.rotation.z = Math.PI / 8;
      group.add(starSigil2);

      const astrolabeRings = [];
      for (let a = 0; a < 3; a++) {
        const ar = new THREE.Mesh(sharedThinRingGeo, a === 0 ? cMat : pMat);
        ar.position.y = 0.26;
        ar.rotation.x = (a * Math.PI) / 3 + 0.35;
        group.add(ar);
        astrolabeRings.push(ar);
      }

      const crownOrbs = [];
      for (let o = 0; o < 8; o++) {
        const orb = new THREE.Mesh(sharedSphereGeo, o % 2 === 0 ? cMat : pMat);
        orb.scale.setScalar(0.036);
        group.add(orb);
        crownOrbs.push({ mesh: orb, baseAng: (o / 8) * Math.PI * 2 });
      }

      addVfxUpdater(
        group,
        1.38,
        (u, elapsed, dt) => {
          const ease = 1 - Math.pow(1 - u, 3);
          stepCommonUnityShaders(u, elapsed, dt, ease);
          starSigil1.scale.setScalar(0.16 + ease * 0.88);
          starSigil1.rotation.z += dt * 2.8;
          starSigil2.scale.setScalar(0.12 + ease * 0.68);
          starSigil2.rotation.z -= dt * 3.4;

          for (let i = 0; i < astrolabeRings.length; i++) {
            const ar = astrolabeRings[i];
            ar.scale.setScalar(0.12 + ease * (0.58 + i * 0.14));
            ar.rotation.x += dt * (4 + i);
            ar.rotation.y += dt * (5 - i);
          }

          for (const co of crownOrbs) {
            const ang = co.baseAng + elapsed * 4.5;
            const rad = 0.16 + ease * 0.42;
            co.mesh.position.set(Math.cos(ang) * rad, 0.10 + ease * 0.85, Math.sin(ang) * rad);
            co.mesh.scale.setScalar(0.038 * Math.max(0.05, 1 - u));
          }

          pMat.opacity = 0.95 * Math.pow(1 - u, 1.3);
          sMat.opacity = 0.90 * Math.pow(1 - u, 1.4);
          cMat.opacity = 0.98 * Math.pow(1 - u, 1.5);
        },
        mats,
        geos
      );
      return;
    }

    if (arch === 'hollow_reapers') {
      // HOLLOW JACK & WRAITH REAPERS SIGNATURE:
      // Actual 3D GLTF Graveyard Tombstone Obelisks & Jack-o'-Lanterns Erupting + Soul Vortex + Bat & Ghost Sprites
      const vortexRings = [];
      for (let v = 0; v < 4; v++) {
        const vr = new THREE.Mesh(sharedRingGeo, v % 2 === 0 ? pMat : sMat);
        vr.position.y = 0.08 + v * 0.16;
        group.add(vr);
        vortexRings.push({ mesh: vr, idx: v });
      }

      const tombSpires = [];
      const spireAssets = [
        'gravestone',
        'pumpkin_orange_jackolantern',
        'gravemarker_A',
        'skull_candle',
        'gravemarker_B',
        'pumpkin_yellow_jackolantern'
      ];
      for (let i = 0; i < 6; i++) {
        const ang = (i / 6) * Math.PI * 2;
        const spireHolder = new THREE.Group();
        const rad = 0.18 + (i % 2) * 0.06;
        spireHolder.position.set(Math.cos(ang) * rad, -0.22, Math.sin(ang) * rad);
        spireHolder.rotation.y = -ang + Math.PI / 2;
        spireHolder.rotation.z = -Math.cos(ang) * 0.18;
        spireHolder.rotation.x = Math.sin(ang) * 0.18;
        const assetKey = spireAssets[i % spireAssets.length];
        mountHalloweenModel(spireHolder, assetKey, {
          scale: assetKey.startsWith('pumpkin') || assetKey === 'skull_candle' ? 0.16 : 0.11,
          castShadow: false,
          receiveShadow: false
        });
        group.add(spireHolder);
        tombSpires.push({ mesh: spireHolder, peakH: 0.24 + (i % 2) * 0.08 });
      }

      const ghostTex = getHalloweenGhostTexture();
      const batTex = getHalloweenBatTexture();
      const halloweenSprites = [];
      for (let i = 0; i < 12; i++) {
        const isGhost = i < 5;
        const spMat = new THREE.SpriteMaterial({
          map: isGhost ? ghostTex : batTex,
          color: 0xffffff,
          transparent: true,
          opacity: 0.96,
          depthWrite: false
        });
        mats.push(spMat);
        const sp = new THREE.Sprite(spMat);
        const ang = (i / 12) * Math.PI * 2;
        const baseScale = isGhost ? 0.25 : 0.19;
        sp.scale.setScalar(baseScale);
        sp.position.set(Math.cos(ang) * 0.18, 0.12 + (i % 3) * 0.08, Math.sin(ang) * 0.18);
        group.add(sp);
        halloweenSprites.push({
          sprite: sp,
          mat: spMat,
          ang,
          isGhost,
          baseScale,
          vy: isGhost ? 0.62 + (i % 3) * 0.18 : 0.85 + (i % 3) * 0.25
        });
      }

      addVfxUpdater(
        group,
        1.52,
        (u, elapsed, dt) => {
          const ease = 1 - Math.pow(1 - u, 3);
          stepCommonUnityShaders(u, elapsed, dt, ease);
          const cragEnv = u < 0.28 ? ease / 0.28 : Math.max(0, 1 - (u - 0.28) / 0.72);
          for (const ts of tombSpires) {
            ts.mesh.position.y = -0.22 + cragEnv * ts.peakH;
            ts.mesh.scale.setScalar(Math.max(0.01, cragEnv));
          }
          for (const vr of vortexRings) {
            vr.mesh.position.y = 0.06 + vr.idx * 0.18 + u * 0.65;
            const rS = (0.14 + vr.idx * 0.06) * (1 + ease * 1.32);
            vr.mesh.scale.set(rS, 1, rS);
            vr.mesh.rotation.z += dt * (7.5 + vr.idx * 2);
          }
          for (const hs of halloweenSprites) {
            const spinSpd = hs.isGhost ? 2.4 : 5.2;
            const curAng = hs.ang + elapsed * spinSpd;
            const curR = (hs.isGhost ? 0.16 : 0.22) + ease * (hs.isGhost ? 0.28 : 0.48);
            hs.sprite.position.set(
              Math.cos(curAng) * curR,
              0.12 + u * hs.vy,
              Math.sin(curAng) * curR
            );
            const fade = Math.max(0.02, 1 - Math.pow(u, 1.35));
            const flap = hs.isGhost ? 1.0 : 1.0 + Math.sin(elapsed * 24.0 + hs.ang) * 0.22;
            hs.sprite.scale.set(hs.baseScale * flap * fade, hs.baseScale * fade, 1);
            hs.mat.opacity = 0.96 * fade;
          }
          pMat.opacity = 0.95 * Math.pow(1 - u, 1.25);
          sMat.opacity = 0.92 * Math.pow(1 - u, 1.35);
          cMat.opacity = 0.98 * Math.pow(1 - u, 1.5);
        },
        mats,
        geos
      );
      return;
    }

    // DEFAULT: GOTHIC SANCTUM WARRIORS SIGNATURE (Cathedral Rose Sigil + 4 Reliquary Cross Spires)
    const roseRing = new THREE.Mesh(sharedStarRingGeo, sMat);
    roseRing.position.y = 0.022;
    group.add(roseRing);

    const crossSpires = [];
    for (let i = 0; i < 4; i++) {
      const ang = (i / 4) * Math.PI * 2 + Math.PI / 4;
      const sp = new THREE.Mesh(sharedOctaGeo, i % 2 === 0 ? pMat : sMat);
      sp.scale.set(0.045, 0.16, 0.045);
      sp.position.set(Math.cos(ang) * 0.20, 0.18, Math.sin(ang) * 0.20);
      group.add(sp);
      crossSpires.push({ mesh: sp, ang });
    }

    addVfxUpdater(
      group,
      1.25,
      (u, elapsed, dt) => {
        const ease = 1 - Math.pow(1 - u, 3);
        stepCommonUnityShaders(u, elapsed, dt, ease);
        roseRing.scale.setScalar(0.14 + ease * 0.72);
        roseRing.rotation.z += dt * 2.2;
        for (const cs of crossSpires) {
          const r = 0.18 + ease * 0.34;
          cs.mesh.position.set(Math.cos(cs.ang) * r, 0.14 + ease * 0.52, Math.sin(cs.ang) * r);
          cs.mesh.rotation.y += dt * 5.0;
          const s = Math.max(0.01, 1 - u);
          cs.mesh.scale.set(0.045 * s, 0.16 * s, 0.045 * s);
        }
        pMat.opacity = 0.92 * Math.pow(1 - u, 1.35);
        sMat.opacity = 0.88 * Math.pow(1 - u, 1.4);
        cMat.opacity = 0.96 * Math.pow(1 - u, 1.5);
      },
      mats,
      geos
    );
  }

  // ==========================================================================
  // Master Piece-Specific + Set-Specific 3D Kill Spectacle Spawner
  // ==========================================================================
  function spawnPieceKillVfx(worldPos, victimType = 'pawn', victimColor = 'b', attackerType = 'queen', dirX = 0, dirZ = 1, attackerArchetype = 'gothic_warriors') {
    const type = String(victimType || 'pawn').toLowerCase();
    const prof = getArchetypeKillProfile(attackerArchetype, type);

    triggerCameraShake(prof.shakeAmp, prof.shakeDuration);

    // Spawn the attacking Chess Piece Set's unique 3D Signature Effect alongside the piece spectacle
    spawnArchetypeSignatureKillVfx(worldPos, attackerArchetype, type);

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
    syncGraveyardAmbientSoundscape();
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
    syncGraveyardAmbientSoundscape();
    return userSfxVolumeMultiplier;
  }

  function setLobbyMusicVolume(vol) {
    userMusicVolumeMultiplier = Math.max(0, Math.min(1, Number(vol) || 0));
    try {
      localStorage.setItem('wizard_chess_music_volume', String(userMusicVolumeMultiplier));
    } catch (e) {}
    if (lobbyPrimaryAudio && lobbyMusicEnabled && isLobbyMusicActiveState) {
      lobbyPrimaryAudio.volume = getPrimaryTargetVol();
    }
    if (lobbyDrumsAudio && lobbyMusicEnabled && isLobbyMusicActiveState) {
      lobbyDrumsAudio.volume = getDrumsTargetVol();
    }
    syncGraveyardAmbientSoundscape();
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
    stopAllGameplayAudio,
    setActiveWorldScenery,
    playHalloweenWhisperAndWindGustSfx,
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
