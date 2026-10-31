import * as THREE from 'three';

/**
 * Poliigon Free PBR Texture Suite Generator & Custom Map Loader
 * Inspired by Poliigon's Free PBR Catalog (https://www.poliigon.com/textures/free)
 *
 * Generates 100% self-contained, zero-CORS, seamless multi-channel PBR texture maps:
 * - Albedo / BaseColor (`map` in THREE.SRGBColorSpace)
 * - Tangent-Space OpenGL Normal (`normalMap` in THREE.NoColorSpace via 3x3 toroidal Sobel filter)
 * - Micro-Surface Specular Roughness (`roughnessMap` in THREE.NoColorSpace)
 *
 * Supports separate WebGLRenderer context caches ('main' vs 'showcase') so textures are never
 * bound across different WebGL contexts or accidentally disposed during showcase tab switches.
 */

export const POLIIGON_PRESET_CATALOG = [
  {
    id: 'auto',
    code: 'Poliigon_AutoMatchedPBR',
    name: 'Auto-Matched Poliigon PBR',
    category: 'Dynamic Suite',
    description: 'Automatically pairs each Piece Set, Finish & Board with its matched Poliigon stone, marble, wood, metal, or scale PBR maps.'
  },
  {
    id: 'travertine_limestone',
    code: 'StoneTravertine003',
    name: 'Stone Travertine 003 (Ashlar Limestone)',
    category: 'Stone & Masonry',
    description: 'Sedimentary cathedral travertine with porous vugs, chiseled ashlar micro-relief normal map & cavity roughness.'
  },
  {
    id: 'marble_calacatta',
    code: 'StoneMarbleCalacatta004',
    name: 'Stone Marble Calacatta 004',
    category: 'Marble & Slab',
    description: 'Carrara & Calacatta white marble with flowing mineral veining, crystalline calcite grain & honed specular map.'
  },
  {
    id: 'marble_nero_marquina',
    code: 'StoneMarbleNeroMarquina002',
    name: 'Stone Marble Nero Marquina 002',
    category: 'Marble & Obsidian',
    description: 'Deep obsidian-charcoal stone with sharp silver-white mineral lightning veins & mirror-honed roughness map.'
  },
  {
    id: 'wood_fine_dark',
    code: 'WoodFineDark004',
    name: 'Wood Fine Dark 004 (Mahogany & Walnut)',
    category: 'Wood & Inlay',
    description: 'Cathedral-grain tournament mahogany & walnut with annual growth rings, open wood-pore normals & satin lacquer.'
  },
  {
    id: 'metal_gold_hammered',
    code: 'MetalGoldPaint002',
    name: 'Metal Gold Paint 002 (Imperial Auric)',
    category: 'Metals & Filigree',
    description: 'Burnished sovereign gold & antique brass with fine directional brushing and subtle planished micro-dimples.'
  },
  {
    id: 'metal_steel_brushed',
    code: 'MetalStainlessSteelBrushed001',
    name: 'Metal Stainless Steel Brushed 001',
    category: 'Metals & Blades',
    description: 'Forged Damascus & brushed crucible steel with linear micro-grooves, wave bands & high-contrast metallic sheen.'
  },
  {
    id: 'stone_jade_nephrite',
    code: 'StoneJadeEmerald001',
    name: 'Stone Nephrite Jade & Garnet 001',
    category: 'Precious Stone',
    description: 'Mottled fibrous nephrite jade & crimson bloodstone with crystalline cleavage lines and gem-polished flats.'
  },
  {
    id: 'ice_glacial_crystal',
    code: 'IceGlacialCrystal001',
    name: 'Ice Glacial Crystal 001',
    category: 'Crystal & Frost',
    description: 'Refractive winter rime ice & cobalt sapphire with Voronoi frost facets, internal fissures & rimmed roughness.'
  },
  {
    id: 'terrazzo_astral_void',
    code: 'TerrazzoVenice005',
    name: 'Terrazzo Venice 005 (Astral Voidstone)',
    category: 'Arcane Stone',
    description: 'Starlight amethyst & cosmic voidstone with mineral aggregate flecks, etched rune-fissures & crystalline glint.'
  },
  {
    id: 'volcanic_basalt_cracked',
    code: 'GroundDirtRocky002_Basalt',
    name: 'Volcanic Cracked Basalt 002',
    category: 'Volcanic Rock',
    description: 'Vesicular charred basalt anvil rock with deep Voronoi thermal fracture canyons and rough volcanic slag pores.'
  },
  {
    id: 'cyber_hex_carbon',
    code: 'MetalHexCarbon001',
    name: 'Anodized Cyber-Hex Carbon 001',
    category: 'Sci-Fi Armor',
    description: 'Precision hexagonal carbon-titanium micro-weave with recessed energy conduits for Cyber-Mech chassis.'
  },
  {
    id: 'dragon_wyrm_scales',
    code: 'OrganicDragonScale001',
    name: 'Dragon Wyrm Scale Hide 001',
    category: 'Mythic Hide',
    description: 'Imbricated diamond dragon scutes and ridged horn keratin normal/roughness maps for Mythic Beasts.'
  },
  {
    id: 'pumpkin_carved_bark',
    code: 'WoodCharredPumpkin001',
    name: 'Charred Pumpkin Bark & Crypt Slate 001',
    category: 'Halloween Surface',
    description: 'Ribbed Jack-o\'-Lantern gourd ridges & charred autumn oak bark with glowing ember fissures for Halloween sets.'
  }
];

// Context-keyed cache: Map<`${contextId}:${presetId}:${repeatScale}`, PbrBundle>
const pbrBundleCache = new Map();

const POLIIGON_SLOT_STORAGE_KEY = 'wizardchess_poliigon_slot_overrides_v1';

function loadSavedSlotOverrides() {
  const defaults = {
    pieces: 'auto',
    table: 'auto',
    board: 'auto',
    trim: 'auto'
  };
  try {
    if (typeof localStorage !== 'undefined') {
      const raw = localStorage.getItem(POLIIGON_SLOT_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
          return {
            pieces: typeof parsed.pieces === 'string' ? parsed.pieces : 'auto',
            table: typeof parsed.table === 'string' ? parsed.table : 'auto',
            board: typeof parsed.board === 'string' ? parsed.board : 'auto',
            trim: typeof parsed.trim === 'string' ? parsed.trim : 'auto'
          };
        }
      }
    }
  } catch (e) {}
  return defaults;
}

function saveSlotOverrides(slots) {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(POLIIGON_SLOT_STORAGE_KEY, JSON.stringify(slots));
    }
  } catch (e) {}
}

// Per-target Poliigon texture overrides so Piece Set, Table/Frame, Board Tiles, and Trim/Blades each have their own independent texture
const customUploadedMaps = {
  slotOverrides: loadSavedSlotOverrides(), // { pieces, table, board, trim }
  albedoDataUrl: null,
  normalDataUrl: null,
  roughnessDataUrl: null,
  customBundlesByContext: new Map()
};

function fract(x) {
  return x - Math.floor(x);
}

function hash2D(ix, iy, seed = 0) {
  let h = (ix * 374761393 + iy * 668265263 + ((seed * 104729) | 0)) | 0;
  h = ((h ^ (h >>> 13)) * 1274126177) | 0;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/**
 * Tileable periodic 2D value noise on [0, 1) x [0, 1) with integer period `period`
 */
function tileableNoise(u, v, period, seed = 0) {
  const gx = u * period;
  const gy = v * period;
  const ix = Math.floor(gx);
  const iy = Math.floor(gy);
  const x0 = ((ix % period) + period) % period;
  const y0 = ((iy % period) + period) % period;
  const x1 = (x0 + 1) % period;
  const y1 = (y0 + 1) % period;

  const fx = gx - ix;
  const fy = gy - iy;
  const sx = fx * fx * (3.0 - 2.0 * fx);
  const sy = fy * fy * (3.0 - 2.0 * fy);

  const n00 = hash2D(x0, y0, seed);
  const n10 = hash2D(x1, y0, seed);
  const n01 = hash2D(x0, y1, seed);
  const n11 = hash2D(x1, y1, seed);

  const nx0 = n00 + (n10 - n00) * sx;
  const nx1 = n01 + (n11 - n01) * sx;
  return nx0 + (nx1 - nx0) * sy;
}

/**
 * Multi-octave periodic Fractional Brownian Motion (fBm)
 */
function tileableFbm(u, v, basePeriod = 6, octaves = 3, seed = 0) {
  let sum = 0.0;
  let amp = 0.5;
  let norm = 0.0;
  let period = basePeriod;
  const maxOct = Math.min(octaves, 3);
  for (let i = 0; i < maxOct; i++) {
    sum += amp * tileableNoise(u, v, period, seed + i * 19.3);
    norm += amp;
    amp *= 0.5;
    period *= 2;
  }
  return sum / norm;
}

/**
 * Tileable Voronoi cellular distance (F1 and F2-F1 ridge/crack metric)
 */
function tileableVoronoi(u, v, period = 6, seed = 1) {
  const gx = u * period;
  const gy = v * period;
  const ix = Math.floor(gx);
  const iy = Math.floor(gy);
  const fx = gx - ix;
  const fy = gy - iy;

  let dSq1 = 64.0;
  let dSq2 = 64.0;

  for (let dy = -1; dy <= 1; dy++) {
    const cy = (((iy + dy) % period) + period) % period;
    for (let dx = -1; dx <= 1; dx++) {
      const cx = (((ix + dx) % period) + period) % period;
      const px = dx + hash2D(cx, cy, seed) - fx;
      const py = dy + hash2D(cx, cy, seed + 37.2) - fy;
      const dSq = px * px + py * py;
      if (dSq < dSq1) {
        dSq2 = dSq1;
        dSq1 = dSq;
      } else if (dSq < dSq2) {
        dSq2 = dSq;
      }
    }
  }
  const d1 = Math.sqrt(dSq1);
  const d2 = Math.sqrt(dSq2);
  return { f1: d1, edge: Math.max(0, d2 - d1) };
}

function clampByte(val01) {
  return Math.max(0, Math.min(255, Math.round(val01 * 255)));
}

/**
 * Generates a power-of-two 128x128 tileable PBR texture suite (`map`, `normalMap`, `roughnessMap`)
 * for a given Poliigon preset ID.
 */
function generatePoliigonPresetBuffers(presetId, size = 128) {
  const heightField = new Float32Array(size * size);
  const albedoRGBA = new Uint8Array(size * size * 4);
  const roughRGBA = new Uint8Array(size * size * 4);
  const normalRGBA = new Uint8Array(size * size * 4);

  let normalStrength = 2.4;

  for (let y = 0; y < size; y++) {
    const v = y / size;
    for (let x = 0; x < size; x++) {
      const u = x / size;
      const idx = y * size + x;
      const pIdx = idx * 4;

      let h = 0.5;
      let rCol = 0.92;
      let gCol = 0.92;
      let bCol = 0.92;
      let rough = 0.55;

      if (presetId === 'marble_calacatta') {
        normalStrength = 1.65;
        const warpU = u + (tileableFbm(u, v, 4, 4, 1.1) - 0.5) * 0.28;
        const warpV = v + (tileableFbm(u, v, 4, 4, 5.7) - 0.5) * 0.28;
        const veinWave = Math.abs(Math.sin((warpU * 2.0 + warpV * 1.5) * Math.PI * 2.0));
        const fineVein = Math.abs(Math.sin((warpU * 5.0 - warpV * 3.0) * Math.PI * 2.0));
        const primaryVein = Math.pow(Math.max(0, 1.0 - veinWave * 3.4), 2.4);
        const goldThread = Math.pow(Math.max(0, 1.0 - fineVein * 6.5), 3.0);
        const microGrain = tileableNoise(u, v, 32, 9.2);

        // Creamy Calacatta base with soft grey veins & warm gold threads
        const lum = 0.96 - primaryVein * 0.34 - goldThread * 0.16 + (microGrain - 0.5) * 0.04;
        rCol = Math.min(1.0, lum + goldThread * 0.08);
        gCol = Math.min(1.0, lum + goldThread * 0.03);
        bCol = Math.max(0.5, lum - goldThread * 0.07);

        h = 0.55 - primaryVein * 0.28 - goldThread * 0.18 + microGrain * 0.06;
        rough = 0.24 + primaryVein * 0.38 + goldThread * 0.25 + (1.0 - microGrain) * 0.08;
      } else if (presetId === 'marble_nero_marquina') {
        normalStrength = 1.85;
        const warpU = u + (tileableFbm(u, v, 5, 4, 2.3) - 0.5) * 0.32;
        const warpV = v + (tileableFbm(u, v, 5, 4, 8.4) - 0.5) * 0.32;
        const v1 = Math.abs(Math.sin((warpU * 3.0 + warpV * 2.0) * Math.PI * 2.0));
        const v2 = Math.abs(Math.cos((warpU * 6.0 - warpV * 4.0) * Math.PI * 2.0));
        const lightningVein = Math.pow(Math.max(0, 1.0 - v1 * 5.8), 3.2);
        const microVein = Math.pow(Math.max(0, 1.0 - v2 * 8.0), 3.6) * 0.65;
        const cloud = tileableFbm(u, v, 6, 3, 14.2);

        const baseTone = 0.74 + (cloud - 0.5) * 0.16;
        const veinBoost = Math.min(1.0, (lightningVein + microVein) * 0.55);
        const lum = Math.min(1.0, baseTone + veinBoost);
        rCol = lum;
        gCol = lum;
        bCol = Math.min(1.0, lum + 0.03);

        h = 0.52 - lightningVein * 0.24 - microVein * 0.14 + cloud * 0.08;
        rough = 0.20 + lightningVein * 0.35 + (1.0 - cloud) * 0.14;
      } else if (presetId === 'wood_fine_dark') {
        normalStrength = 2.15;
        // Flowing cathedral wood grain + fine annual growth rings + medullary pore streaks
        const grainTurbulence = tileableFbm(u * 0.5, v * 2.0, 4, 4, 3.3) * 0.18;
        const ringCoord = (u * 7.5 + grainTurbulence * 4.2) * Math.PI * 2.0;
        const earlyLateWood = 0.5 + 0.5 * Math.sin(ringCoord + Math.sin(ringCoord) * 0.35);
        const fineFibers = tileableNoise(u, v, 48, 7.1) * 0.4 + tileableNoise(u * 2.0, v * 0.25, 32, 11.4) * 0.6;
        const openPores = Math.max(0, tileableNoise(u * 1.5, v * 0.35, 40, 18.9) - 0.74) * 3.8;

        const woodTone = 0.80 + earlyLateWood * 0.18 - openPores * 0.26 + (fineFibers - 0.5) * 0.08;
        rCol = Math.min(1.0, woodTone * 1.03);
        gCol = Math.min(1.0, woodTone * 0.96);
        bCol = Math.min(1.0, woodTone * 0.89);

        h = 0.55 + earlyLateWood * 0.14 + fineFibers * 0.10 - openPores * 0.38;
        rough = 0.26 + (1.0 - earlyLateWood) * 0.18 + openPores * 0.42;
      } else if (presetId === 'metal_gold_hammered') {
        normalStrength = 1.95;
        // Directional fine brushing + gentle planished hammer dimples
        const vor = tileableVoronoi(u, v, 8, 4.5);
        const dimple = Math.cos(Math.min(1.0, vor.f1 * 1.35) * Math.PI * 0.5);
        const brush = tileableNoise(u * 0.25, v * 2.5, 48, 12.7) * 0.65 + tileableNoise(u, v, 64, 5.1) * 0.35;
        const microScratch = Math.abs(tileableNoise(u * 0.4, v * 2.0, 40, 21.3) - 0.5) < 0.03 ? 0.12 : 0.0;

        const metalLum = 0.88 + dimple * 0.10 + (brush - 0.5) * 0.09 - microScratch;
        rCol = Math.min(1.0, metalLum * 1.02);
        gCol = Math.min(1.0, metalLum * 0.99);
        bCol = Math.min(1.0, metalLum * 0.93);

        h = 0.45 + dimple * 0.32 + brush * 0.14 - microScratch * 0.25;
        rough = 0.18 + (1.0 - dimple) * 0.16 + (1.0 - brush) * 0.14 + microScratch * 0.35;
      } else if (presetId === 'metal_steel_brushed') {
        normalStrength = 2.1;
        // Linear brushed stainless steel + subtle forged Damascus ripple bands
        const damascusWave = Math.sin((u * 3.0 + v * 2.0 + tileableFbm(u, v, 4, 3, 6.2) * 1.4) * Math.PI * 4.0);
        const damascusBand = 0.5 + 0.5 * damascusWave;
        const anisoBrush = tileableNoise(u * 0.2, v * 3.0, 64, 9.8);
        const crossScratch = tileableNoise(u * 2.0, v * 0.3, 48, 15.4);

        const lum = 0.84 + damascusBand * 0.12 + (anisoBrush - 0.5) * 0.12;
        rCol = lum * 0.98;
        gCol = lum * 0.99;
        bCol = Math.min(1.0, lum * 1.03);

        h = 0.5 + damascusBand * 0.18 + anisoBrush * 0.22 - (crossScratch > 0.82 ? 0.16 : 0.0);
        rough = 0.16 + (1.0 - damascusBand) * 0.14 + (1.0 - anisoBrush) * 0.20;
      } else if (presetId === 'stone_jade_nephrite') {
        normalStrength = 1.75;
        const cloud1 = tileableFbm(u, v, 5, 4, 7.7);
        const cloud2 = tileableFbm(u + 0.3, v - 0.2, 8, 4, 13.1);
        const vor = tileableVoronoi(u, v, 5, 8.9);
        const crystalFracture = Math.pow(Math.max(0, 1.0 - vor.edge * 8.5), 2.6);

        const jadeLum = 0.80 + cloud1 * 0.20 - crystalFracture * 0.24 + (cloud2 - 0.5) * 0.10;
        rCol = jadeLum * 0.96;
        gCol = Math.min(1.0, jadeLum * 1.04);
        bCol = jadeLum * 0.98;

        h = 0.56 + cloud1 * 0.16 - crystalFracture * 0.32;
        rough = 0.16 + crystalFracture * 0.45 + (1.0 - cloud2) * 0.14;
      } else if (presetId === 'ice_glacial_crystal') {
        normalStrength = 2.35;
        const vor1 = tileableVoronoi(u, v, 6, 3.4);
        const vor2 = tileableVoronoi(u, v, 12, 9.1);
        const frostCrack = Math.pow(Math.max(0, 1.0 - vor1.edge * 7.5), 2.2);
        const microRime = tileableFbm(u, v, 12, 3, 16.5);

        const iceLum = Math.min(1.0, 0.84 + frostCrack * 0.16 + (vor2.f1 - 0.3) * 0.14);
        rCol = iceLum * 0.96;
        gCol = iceLum * 0.99;
        bCol = Math.min(1.0, iceLum * 1.04);

        h = 0.50 + vor1.f1 * 0.28 - frostCrack * 0.30 + microRime * 0.12;
        rough = 0.12 + frostCrack * 0.52 + microRime * 0.16;
      } else if (presetId === 'terrazzo_astral_void') {
        normalStrength = 2.05;
        const vor = tileableVoronoi(u, v, 10, 5.2);
        const chipMask = vor.f1 < 0.26 ? 1.0 : 0.0;
        const nebulaVein = tileableFbm(u, v, 5, 4, 19.8);
        const runeGroove = Math.pow(Math.max(0, 1.0 - vor.edge * 9.0), 2.8);

        const lum = 0.80 + chipMask * 0.16 + (nebulaVein - 0.5) * 0.16 - runeGroove * 0.28;
        rCol = Math.min(1.0, lum * 1.02);
        gCol = lum * 0.97;
        bCol = Math.min(1.0, lum * 1.04);

        h = 0.52 + chipMask * 0.14 - runeGroove * 0.35 + nebulaVein * 0.10;
        rough = 0.18 + (1.0 - chipMask) * 0.18 + runeGroove * 0.45;
      } else if (presetId === 'volcanic_basalt_cracked') {
        normalStrength = 3.1;
        const vor = tileableVoronoi(u, v, 6, 2.7);
        const canyonCrack = Math.pow(Math.max(0, 1.0 - vor.edge * 6.2), 2.4);
        const vesicles = Math.max(0, tileableNoise(u, v, 36, 14.6) - 0.68) * 3.1;
        const rockRugged = tileableFbm(u, v, 8, 4, 4.9);

        const basaltLum = 0.78 + (rockRugged - 0.5) * 0.22 - canyonCrack * 0.36 - vesicles * 0.25;
        rCol = Math.min(1.0, basaltLum + canyonCrack * 0.14);
        gCol = basaltLum * 0.96;
        bCol = basaltLum * 0.94;

        h = 0.62 + rockRugged * 0.22 - canyonCrack * 0.48 - vesicles * 0.28;
        rough = 0.48 + (1.0 - rockRugged) * 0.28 + vesicles * 0.22;
      } else if (presetId === 'cyber_hex_carbon') {
        normalStrength = 2.45;
        // Hexagonal armor grid + carbon fiber diagonal weave
        const hexScale = 10.0;
        const gx = u * hexScale;
        const gy = v * hexScale * 1.1547;
        const row = Math.floor(gy);
        const hx = fract(gx + (row % 2) * 0.5) - 0.5;
        const hy = fract(gy) - 0.5;
        const hexDist = Math.max(Math.abs(hx), Math.abs(hx) * 0.5 + Math.abs(hy) * 0.866);
        const hexGroove = hexDist > 0.42 ? 1.0 : 0.0;
        const carbonWeave = 0.5 + 0.5 * Math.sin((u * 32.0 + v * 32.0) * Math.PI * 2.0);

        const lum = 0.84 - hexGroove * 0.28 + (carbonWeave - 0.5) * 0.12;
        rCol = lum * 0.96;
        gCol = Math.min(1.0, lum * 1.01);
        bCol = Math.min(1.0, lum * 1.04);

        h = 0.58 - hexGroove * 0.38 + carbonWeave * 0.12;
        rough = hexGroove ? 0.15 : 0.24 + (1.0 - carbonWeave) * 0.18;
      } else if (presetId === 'dragon_wyrm_scales') {
        normalStrength = 2.85;
        // Overlapping diamond dragon scutes
        const scX = 10.0;
        const scY = 12.0;
        const row = Math.floor(v * scY);
        const su = fract(u * scX + (row % 2) * 0.5) - 0.5;
        const sv = fract(v * scY);
        const scaleArch = Math.max(0, 1.0 - Math.hypot(su * 1.65, (sv - 0.35) * 1.25));
        const scaleRidge = Math.max(0, 1.0 - Math.abs(su) * 4.5) * scaleArch;
        const keratinGrain = tileableNoise(u * 0.5, v * 2.0, 48, 6.4);

        const lum = 0.74 + scaleArch * 0.24 + scaleRidge * 0.08 + (keratinGrain - 0.5) * 0.08;
        rCol = Math.min(1.0, lum * 1.02);
        gCol = lum * 0.98;
        bCol = lum * 0.95;

        h = 0.28 + scaleArch * 0.52 + scaleRidge * 0.16 + keratinGrain * 0.06;
        rough = 0.52 - scaleArch * 0.26 - scaleRidge * 0.10;
      } else if (presetId === 'pumpkin_carved_bark') {
        normalStrength = 2.75;
        // Ribbed pumpkin gourd vertical lobes + charred autumn oak bark fissures + subtle glowing ember cracks
        const ribWave = Math.abs(Math.sin((u * 8.0 + (tileableNoise(u, v, 8, 3.7) - 0.5) * 0.35) * Math.PI));
        const gourdRib = Math.pow(ribWave, 0.55);
        const barkGrain = tileableFbm(u * 0.8, v * 2.4, 8, 3, 11.2);
        const vor = tileableVoronoi(u, v, 7, 5.9);
        const charCrack = Math.pow(Math.max(0, 1.0 - vor.edge * 7.5), 2.5);

        const baseLum = 0.76 + gourdRib * 0.18 + (barkGrain - 0.5) * 0.16 - charCrack * 0.32;
        rCol = Math.min(1.0, baseLum * 1.06 + charCrack * 0.24);
        gCol = Math.min(1.0, baseLum * 0.94 + charCrack * 0.08);
        bCol = Math.max(0.4, baseLum * 0.86 - charCrack * 0.10);

        h = 0.36 + gourdRib * 0.42 + barkGrain * 0.16 - charCrack * 0.44;
        rough = 0.42 + (1.0 - gourdRib) * 0.22 + charCrack * 0.32;
      } else {
        // Default: 'travertine_limestone' (Poliigon Stone Travertine 003 / Sanctum Ashlar)
        normalStrength = 2.35;
        const strata = tileableFbm(u * 0.6, v * 1.8, 6, 4, 1.4);
        const fineChisel = tileableFbm(u, v, 16, 3, 8.2);
        const vugNoise = tileableNoise(u * 0.8, v * 2.2, 24, 15.9);
        const vugCavity = Math.max(0, vugNoise - 0.72) * 3.5;

        const stoneLum = 0.84 + (strata - 0.5) * 0.18 + (fineChisel - 0.5) * 0.10 - vugCavity * 0.32;
        rCol = Math.min(1.0, stoneLum * 1.02);
        gCol = stoneLum * 1.0;
        bCol = stoneLum * 0.96;

        h = 0.56 + strata * 0.18 + fineChisel * 0.14 - vugCavity * 0.42;
        rough = 0.34 + (1.0 - strata) * 0.20 + vugCavity * 0.44;
      }

      heightField[idx] = h;

      albedoRGBA[pIdx] = clampByte(rCol);
      albedoRGBA[pIdx + 1] = clampByte(gCol);
      albedoRGBA[pIdx + 2] = clampByte(bCol);
      albedoRGBA[pIdx + 3] = 255;

      const rByte = clampByte(rough);
      roughRGBA[pIdx] = rByte;
      roughRGBA[pIdx + 1] = rByte;
      roughRGBA[pIdx + 2] = rByte;
      roughRGBA[pIdx + 3] = 255;
    }
  }

  // Convert heightfield into a seamless tangent-space OpenGL normal map via 3x3 toroidal Sobel filter
  for (let y = 0; y < size; y++) {
    const ym1 = (y - 1 + size) % size;
    const yp1 = (y + 1) % size;
    for (let x = 0; x < size; x++) {
      const xm1 = (x - 1 + size) % size;
      const xp1 = (x + 1) % size;

      const tl = heightField[ym1 * size + xm1];
      const tc = heightField[ym1 * size + x];
      const tr = heightField[ym1 * size + xp1];
      const ml = heightField[y * size + xm1];
      const mr = heightField[y * size + xp1];
      const bl = heightField[yp1 * size + xm1];
      const bc = heightField[yp1 * size + x];
      const br = heightField[yp1 * size + xp1];

      const dX = (tr + 2.0 * mr + br - (tl + 2.0 * ml + bl)) * normalStrength;
      const dY = (bl + 2.0 * bc + br - (tl + 2.0 * tc + tr)) * normalStrength;

      let nx = -dX;
      let ny = -dY;
      let nz = 1.0;
      const invLen = 1.0 / Math.sqrt(nx * nx + ny * ny + 1.0);
      nx *= invLen;
      ny *= invLen;
      nz *= invLen;

      const pIdx = (y * size + x) * 4;
      normalRGBA[pIdx] = clampByte(nx * 0.5 + 0.5);
      normalRGBA[pIdx + 1] = clampByte(ny * 0.5 + 0.5);
      normalRGBA[pIdx + 2] = clampByte(nz * 0.5 + 0.5);
      normalRGBA[pIdx + 3] = 255;
    }
  }

  return { size, albedoRGBA, normalRGBA, roughRGBA };
}

// Cache raw pixel buffers once so creating context-specific DataTextures is instantaneous (< 0.1ms)
const rawBufferCache = new Map();

function getPresetRawBuffers(presetId) {
  if (!rawBufferCache.has(presetId)) {
    rawBufferCache.set(presetId, generatePoliigonPresetBuffers(presetId, 128));
  }
  return rawBufferCache.get(presetId);
}

function createDataTextureFromBuffer(rgbaArray, size, isColorMap, repeatX = 2, repeatY = 2) {
  const tex = new THREE.DataTexture(rgbaArray, size, size, THREE.RGBAFormat);
  tex.colorSpace = isColorMap ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.generateMipmaps = true;
  tex.anisotropy = 2;
  tex.userData = { isSharedPoliigonTex: true };
  tex.needsUpdate = true;
  return tex;
}

/**
 * Returns a cached multi-channel PBR texture bundle (`map`, `normalMap`, `roughnessMap`)
 * scoped to the specified WebGL context ('main' vs 'showcase').
 */
export function getPoliigonPbrBundle(presetId, contextId = 'main', repeatX = 2, repeatY = 2) {
  const effectivePreset =
    presetId && presetId !== 'auto' ? presetId : 'travertine_limestone';

  const cacheKey = `${contextId}:${effectivePreset}:${repeatX}x${repeatY}`;
  if (pbrBundleCache.has(cacheKey)) {
    return pbrBundleCache.get(cacheKey);
  }

  const bundle = {
    presetId: effectivePreset,
    map: null,
    normalMap: null,
    roughnessMap: null
  };
  pbrBundleCache.set(cacheKey, bundle);
  return bundle;
}

/**
 * Resolves the authentic Poliigon Free PBR Texture presets for any Piece Skin + Piece Archetype combination,
 * respecting independent per-slot overrides for 'pieces' and 'trim'.
 */
export function resolvePiecePoliigonPresets(skinId = 'classic_stone', archetypeId = 'gothic_warriors') {
  let whitePreset = 'travertine_limestone';
  let blackPreset = 'marble_nero_marquina';
  let trimPreset = 'metal_gold_hammered';
  let bladePreset = 'metal_steel_brushed';
  let normalScaleVal = 0.78;

  if (skinId === 'royal_gilded') {
    whitePreset = 'metal_gold_hammered';
    blackPreset = 'marble_nero_marquina';
    trimPreset = 'metal_gold_hammered';
    bladePreset = 'metal_gold_hammered';
    normalScaleVal = 0.65;
  } else if (skinId === 'imperial_jade') {
    whitePreset = 'stone_jade_nephrite';
    blackPreset = 'stone_jade_nephrite';
    trimPreset = 'metal_gold_hammered';
    bladePreset = 'metal_steel_brushed';
    normalScaleVal = 0.72;
  } else if (skinId === 'frost_glacial') {
    whitePreset = 'ice_glacial_crystal';
    blackPreset = 'ice_glacial_crystal';
    trimPreset = 'metal_steel_brushed';
    bladePreset = 'ice_glacial_crystal';
    normalScaleVal = 0.82;
  } else if (skinId === 'celestial_astral') {
    whitePreset = 'terrazzo_astral_void';
    blackPreset = 'terrazzo_astral_void';
    trimPreset = 'metal_gold_hammered';
    bladePreset = 'terrazzo_astral_void';
    normalScaleVal = 0.75;
  } else if (skinId === 'hallow_pumpkin_wraith') {
    whitePreset = 'travertine_limestone';
    blackPreset = 'pumpkin_carved_bark';
    trimPreset = 'pumpkin_carved_bark';
    bladePreset = 'ice_glacial_crystal';
    normalScaleVal = 0.92;
  } else {
    // 'classic_stone'
    whitePreset = 'travertine_limestone';
    blackPreset = 'marble_nero_marquina';
    trimPreset = 'metal_gold_hammered';
    bladePreset = 'metal_steel_brushed';
    normalScaleVal = 0.88;
  }

  // Archetype-specific tactile overrides when in default stone or matching themes
  if (archetypeId === 'dragon_elemental' && skinId === 'classic_stone') {
    whitePreset = 'dragon_wyrm_scales';
    blackPreset = 'volcanic_basalt_cracked';
    normalScaleVal = 0.95;
  } else if (archetypeId === 'arcane_cyber' && skinId === 'classic_stone') {
    whitePreset = 'cyber_hex_carbon';
    blackPreset = 'cyber_hex_carbon';
    normalScaleVal = 0.85;
  } else if (archetypeId === 'classic_staunton' && skinId === 'classic_stone') {
    whitePreset = 'marble_calacatta';
    blackPreset = 'marble_nero_marquina';
    normalScaleVal = 0.72;
  } else if (archetypeId === 'hollow_reapers' && skinId === 'classic_stone') {
    whitePreset = 'pumpkin_carved_bark';
    blackPreset = 'volcanic_basalt_cracked';
    normalScaleVal = 0.92;
  }

  // Apply independent per-part overrides if chosen by the user
  const piecesOverride = customUploadedMaps.slotOverrides?.pieces;
  if (piecesOverride && piecesOverride !== 'auto') {
    whitePreset = piecesOverride;
    blackPreset = piecesOverride;
  }
  const trimOverride = customUploadedMaps.slotOverrides?.trim;
  if (trimOverride && trimOverride !== 'auto') {
    trimPreset = trimOverride;
    bladePreset = trimOverride;
  }

  return { whitePreset, blackPreset, trimPreset, bladePreset, normalScaleVal };
}

/**
 * Resolves the authentic Poliigon Free PBR Texture presets for any Board Skin,
 * respecting independent per-slot overrides for 'board' (64 tiles) and 'table' (Altar table, frame & pedestal).
 */
export function resolveBoardPoliigonPresets(boardSkinId = 'obsidian_sanctum', archType = 'gothic') {
  let res;
  if (boardSkinId === 'royal_wood_table' || archType === 'wood_table') {
    res = {
      lightPreset: 'wood_fine_dark',
      darkPreset: 'wood_fine_dark',
      borderPreset: 'wood_fine_dark',
      accentPreset: 'metal_gold_hammered',
      normalScaleVal: 0.76,
      repeatSq: 1.5,
      repeatBorder: 3.0
    };
  } else if (boardSkinId === 'runic_pedestal' || archType === 'runic_pedestal') {
    res = {
      lightPreset: 'terrazzo_astral_void',
      darkPreset: 'marble_nero_marquina',
      borderPreset: 'terrazzo_astral_void',
      accentPreset: 'metal_gold_hammered',
      normalScaleVal: 0.82,
      repeatSq: 1.25,
      repeatBorder: 2.5
    };
  } else if (boardSkinId === 'crystal_sanctum' || archType === 'crystal_sanctum') {
    res = {
      lightPreset: 'ice_glacial_crystal',
      darkPreset: 'ice_glacial_crystal',
      borderPreset: 'metal_steel_brushed',
      accentPreset: 'ice_glacial_crystal',
      normalScaleVal: 0.85,
      repeatSq: 1.25,
      repeatBorder: 2.5
    };
  } else if (boardSkinId === 'lava_forge' || archType === 'lava_forge') {
    res = {
      lightPreset: 'travertine_limestone',
      darkPreset: 'volcanic_basalt_cracked',
      borderPreset: 'volcanic_basalt_cracked',
      accentPreset: 'metal_gold_hammered',
      normalScaleVal: 1.05,
      repeatSq: 1.35,
      repeatBorder: 2.5
    };
  } else if (boardSkinId === 'cursed_pumpkin_altar' || archType === 'haunted_crypt') {
    res = {
      lightPreset: 'travertine_limestone',
      darkPreset: 'pumpkin_carved_bark',
      borderPreset: 'volcanic_basalt_cracked',
      accentPreset: 'pumpkin_carved_bark',
      normalScaleVal: 0.96,
      repeatSq: 1.35,
      repeatBorder: 2.5
    };
  } else {
    // Default: 'obsidian_sanctum' / 'gothic'
    res = {
      lightPreset: 'marble_calacatta',
      darkPreset: 'marble_nero_marquina',
      borderPreset: 'metal_gold_hammered',
      accentPreset: 'metal_gold_hammered',
      normalScaleVal: 0.80,
      repeatSq: 1.25,
      repeatBorder: 2.5
    };
  }

  const boardOverride = customUploadedMaps.slotOverrides?.board;
  if (boardOverride && boardOverride !== 'auto') {
    res.lightPreset = boardOverride;
    res.darkPreset = boardOverride;
  }

  const tableOverride = customUploadedMaps.slotOverrides?.table;
  if (tableOverride && tableOverride !== 'auto') {
    res.borderPreset = tableOverride;
    res.accentPreset = tableOverride;
  }

  return res;
}

/**
 * Applies a Poliigon multi-channel PBR bundle (`map`, `normalMap`, `roughnessMap`) to a THREE.MeshStandardMaterial
 * without triggering unnecessary WebGL shader recompilations when swapping textures in-place.
 */
export function applyPoliigonPbrToMaterial(
  mat,
  presetId,
  options = {}
) {
  if (!mat) return mat;
  const {
    contextId = 'main',
    repeatX = 2,
    repeatY = 2,
    normalScale = 0.8,
    envMapIntensity = 1.15,
    useNormalMap = true
  } = options;

  const bundle = getPoliigonPbrBundle(presetId, contextId, repeatX, repeatY);
  if (!bundle) return mat;

  const nextMap = bundle.map || null;
  const nextNormal = useNormalMap && normalScale > 0.01 ? bundle.normalMap || null : null;
  const nextRough = bundle.roughnessMap || null;

  const shaderConfigChanged =
    Boolean(mat.map) !== Boolean(nextMap) ||
    Boolean(mat.normalMap) !== Boolean(nextNormal) ||
    Boolean(mat.roughnessMap) !== Boolean(nextRough);

  mat.map = nextMap;
  mat.normalMap = nextNormal;
  mat.roughnessMap = nextRough;

  if (nextNormal) {
    if (!mat.normalScale) {
      mat.normalScale = new THREE.Vector2(normalScale, normalScale);
    } else {
      mat.normalScale.set(normalScale, normalScale);
    }
  }
  if ('envMapIntensity' in mat) {
    mat.envMapIntensity = envMapIntensity;
  }
  mat.userData = mat.userData || {};
  mat.userData.poliigonPresetId = bundle.presetId;
  if (shaderConfigChanged) {
    mat.needsUpdate = true;
  }
  return mat;
}

/**
 * Ensures any 3D geometry (including custom extrusions or GLB meshes) has normalized UV coordinates
 * so tangent-space normal maps and PBR textures never render black or degenerate.
 */
export function ensureGeometryHasUVs(geometry) {
  if (!geometry || !geometry.attributes || !geometry.attributes.position) return;
  if (geometry.userData && geometry.userData.uvChecked) return;
  geometry.userData = geometry.userData || {};
  geometry.userData.uvChecked = true;
  if (geometry.attributes.uv) return;

  const pos = geometry.attributes.position;
  const nrm = geometry.attributes.normal;
  const count = pos.count;
  const uvs = new Float32Array(count * 2);

  for (let i = 0; i < count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const nx = nrm ? Math.abs(nrm.getX(i)) : 0;
    const ny = nrm ? Math.abs(nrm.getY(i)) : 1;
    const nz = nrm ? Math.abs(nrm.getZ(i)) : 0;

    let u = 0;
    let v = 0;
    if (ny >= nx && ny >= nz) {
      u = x * 1.5 + 0.5;
      v = z * 1.5 + 0.5;
    } else if (nx >= ny && nx >= nz) {
      u = z * 1.5 + 0.5;
      v = y * 1.5;
    } else {
      u = x * 1.5 + 0.5;
      v = y * 1.5;
    }
    uvs[i * 2] = u;
    uvs[i * 2 + 1] = v;
  }
  geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
}

/**
 * Sets or gets the per-slot Poliigon preset override ('pieces' | 'table' | 'board' | 'trim')
 */
export function setPoliigonPresetOverride(presetId, slot = 'pieces') {
  const validSlot = ['pieces', 'table', 'board', 'trim'].includes(slot) ? slot : 'pieces';
  customUploadedMaps.slotOverrides[validSlot] = presetId || 'auto';
  saveSlotOverrides(customUploadedMaps.slotOverrides);
  return customUploadedMaps.slotOverrides[validSlot];
}

export function getPoliigonPresetOverride(slot = 'pieces') {
  const validSlot = ['pieces', 'table', 'board', 'trim'].includes(slot) ? slot : 'pieces';
  return customUploadedMaps.slotOverrides[validSlot] || 'auto';
}

export function getAllPoliigonSlotOverrides() {
  return { ...customUploadedMaps.slotOverrides };
}

export function resetAllPoliigonSlotOverrides() {
  customUploadedMaps.slotOverrides = {
    pieces: 'auto',
    table: 'auto',
    board: 'auto',
    trim: 'auto'
  };
  saveSlotOverrides(customUploadedMaps.slotOverrides);
  return { ...customUploadedMaps.slotOverrides };
}

/**
 * Loads user-selected Poliigon image files (Albedo/Color, NormalGL, Roughness) into both WebGL contexts
 * and assigns them to the active target slot ('pieces' | 'table' | 'board' | 'trim').
 */
export function loadCustomPoliigonTextureFiles(filesMap, onComplete, slot = 'pieces') {
  const loader = new THREE.TextureLoader();

  const loadTex = (dataUrl, isColor) =>
    new Promise((resolve) => {
      if (!dataUrl) {
        resolve(null);
        return;
      }
      loader.load(
        dataUrl,
        (tex) => {
          tex.colorSpace = isColor ? THREE.SRGBColorSpace : THREE.NoColorSpace;
          tex.wrapS = THREE.RepeatWrapping;
          tex.wrapT = THREE.RepeatWrapping;
          tex.repeat.set(2, 2);
          tex.anisotropy = 2;
          tex.userData = { isSharedPoliigonTex: true };
          tex.needsUpdate = true;
          resolve(tex);
        },
        undefined,
        () => resolve(null)
      );
    });

  if (filesMap.albedoDataUrl) customUploadedMaps.albedoDataUrl = filesMap.albedoDataUrl;
  if (filesMap.normalDataUrl) customUploadedMaps.normalDataUrl = filesMap.normalDataUrl;
  if (filesMap.roughnessDataUrl) customUploadedMaps.roughnessDataUrl = filesMap.roughnessDataUrl;

  const fallback = getPoliigonPbrBundle('marble_calacatta', 'main', 2, 2);

  Promise.all([
    loadTex(customUploadedMaps.albedoDataUrl, true),
    loadTex(customUploadedMaps.normalDataUrl, false),
    loadTex(customUploadedMaps.roughnessDataUrl, false),
    loadTex(customUploadedMaps.albedoDataUrl, true),
    loadTex(customUploadedMaps.normalDataUrl, false),
    loadTex(customUploadedMaps.roughnessDataUrl, false)
  ]).then(([mainMap, mainNorm, mainRough, showMap, showNorm, showRough]) => {
    const fallbackShow = getPoliigonPbrBundle('marble_calacatta', 'showcase', 2, 2);
    customUploadedMaps.customBundlesByContext.set('main', {
      presetId: 'custom_upload',
      map: mainMap || fallback.map,
      normalMap: mainNorm || fallback.normalMap,
      roughnessMap: mainRough || fallback.roughnessMap
    });
    customUploadedMaps.customBundlesByContext.set('showcase', {
      presetId: 'custom_upload',
      map: showMap || fallbackShow.map,
      normalMap: showNorm || fallbackShow.normalMap,
      roughnessMap: showRough || fallbackShow.roughnessMap
    });
    setPoliigonPresetOverride('custom_upload', slot);
    if (typeof onComplete === 'function') {
      onComplete();
    }
  });
}
