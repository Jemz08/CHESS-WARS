export interface PieceArchetype {
  id: 'gothic_warriors' | 'classic_staunton' | 'arcane_cyber' | 'dragon_elemental' | 'hollow_reapers';
  name: string;
  subtitle: string;
  badge: string;
  price: number;
  strikeStyle: string;
  shatterStyle: string;
  flashColorHex: string;
}

export interface PieceSkin {
  id: string;
  name: string;
  subtitle: string;
  price: number;
  whiteHex: string;
  whiteRoughness: number;
  whiteMetalness: number;
  whiteEmissiveHex: string;
  whiteEmissiveIntensity: number;
  blackHex: string;
  blackRoughness: number;
  blackMetalness: number;
  blackEmissiveHex: string;
  blackEmissiveIntensity: number;
  trimHex: string;
  trimRoughness: number;
  trimMetalness: number;
  bladeHex: string;
  bladeRoughness: number;
  bladeMetalness: number;
  bladeEmissiveHex: string;
  bladeEmissiveIntensity: number;
}

export interface BoardSkin {
  id: string;
  name: string;
  subtitle: string;
  environmentLabel: string;
  archType: 'gothic' | 'wood_table' | 'runic_pedestal' | 'crystal_sanctum' | 'lava_forge' | 'haunted_crypt';
  price: number;
  lightSqHex: string;
  lightRoughness: number;
  lightMetalness: number;
  darkSqHex: string;
  darkRoughness: number;
  darkMetalness: number;
  borderHex: string;
  accentHex: string;
  // Full 3D Room & Lighting Environment Parameters
  wallLookIndex: number;
  floorLookIndex: number;
  fogHex: string;
  sideWindowHex: string;
  northWindowHex: string;
  southWindowHex: string;
  brazierBaseRGB: [number, number, number];
  brazierMidRGB: [number, number, number];
  brazierTipRGB: [number, number, number];
  brazierLightHex: string;
}

export interface WorldScenery {
  id: 'gothic_cathedral' | 'celestial_observatory' | 'dragon_sky_citadel' | 'volcanic_titan_forge' | 'haunted_blood_graveyard';
  name: string;
  subtitle: string;
  badge: string;
  price: number;
  skyPreviewGradient: string;
  accentHex: string;
  landmarksLabel: string;
  weatherLabel: string;
  fogHex: string;
  fogDensity: number;
  hemiSkyHex: string;
  hemiGroundHex: string;
  hemiIntensity: number;
  keyLightHex: string;
  keyLightIntensity: number;
  rimLightHex: string;
  rimLightIntensity: number;
}

export const PIECE_ARCHETYPES: PieceArchetype[] = [
  {
    id: 'gothic_warriors',
    name: 'Gothic Sanctum Warriors',
    subtitle: 'Hand-sculpted medieval stone knights, broadsword kings, mace bishops & armored rooks',
    badge: 'Sculpted Statues',
    price: 0,
    strikeStyle: 'Crusader Broadsword Cross-Slash',
    shatterStyle: 'Cathedral Rose Sigil & Reliquary Crosses',
    flashColorHex: '#ffb74d'
  },
  {
    id: 'classic_staunton',
    name: 'Classic Staunton Tournament',
    subtitle: 'Fluted spline-lathed grandmaster chessmen with carved bridled warhorses, slotted mitres & arched crowns',
    badge: 'Tournament Set',
    price: 120,
    strikeStyle: 'Telekinetic Vertical Ascension, 720° Spin & Gravity Anvil Crush',
    shatterStyle: '8-Point Grandmaster Compass & Astrolabe Orbs',
    flashColorHex: '#ffe082'
  },
  {
    id: 'arcane_cyber',
    name: 'Futuristic Cyber City Armada',
    subtitle: 'Low-poly futuristic city skyscrapers, ribbed reactor spires, hover-cruiser gunships & forcefield gate bastions',
    badge: 'Futuristic City Set',
    price: 240,
    strikeStyle: 'Target-Lock Hex Lenses, Hover-Gunship Lock & Coherent Multi-Stage Laser Beam',
    shatterStyle: 'Orbital Ion Laser Beam & Hex Holo-Matrix',
    flashColorHex: '#00f5d4'
  },
  {
    id: 'dragon_elemental',
    name: 'Dragon & Elemental Guardians',
    subtitle: 'Sinuous S-curved mythic dragons with rearing fore-talons, molten dragon-heart cores, ribbed bat-wings & fanged fire-breath maws',
    badge: 'Mythic Beasts',
    price: 360,
    strikeStyle: 'Mid-Air Winged Hover, Unhinged Fanged Jaws & Helical Volumetric Fire-Breath Torrent',
    shatterStyle: 'Volcanic Magma Geyser & Erupting Crag Spikes',
    flashColorHex: '#ff4d6d'
  },
  {
    id: 'hollow_reapers',
    name: 'Hollow Jack & Wraith Reapers',
    subtitle: 'Sculpted Jack-o\'-Lantern monarchs, Headless Horseman knights, scythe-wielding wraiths & haunted crypt rooks',
    badge: 'Halloween Event',
    price: 280,
    strikeStyle: 'Scythe Soul-Harvest Sweep & Headless Jack-o\'-Lantern Surge',
    shatterStyle: 'Carved Pumpkin Detonation, Ectoplasm Soul-Flames & Swirling Bats',
    flashColorHex: '#ff6d00'
  }
];

export const PIECE_SKINS: PieceSkin[] = [
  {
    id: 'classic_stone',
    name: 'Sanctum Limestone',
    subtitle: 'Carved cathedral ashlar & charcoal slate with antique gold trim',
    price: 0,
    whiteHex: '#e6dfd0',
    whiteRoughness: 0.34,
    whiteMetalness: 0.06,
    whiteEmissiveHex: '#000000',
    whiteEmissiveIntensity: 0,
    blackHex: '#222630',
    blackRoughness: 0.28,
    blackMetalness: 0.24,
    blackEmissiveHex: '#000000',
    blackEmissiveIntensity: 0,
    trimHex: '#d4af37',
    trimRoughness: 0.26,
    trimMetalness: 0.86,
    bladeHex: '#dce4ee',
    bladeRoughness: 0.20,
    bladeMetalness: 0.88,
    bladeEmissiveHex: '#222832',
    bladeEmissiveIntensity: 0.25
  },
  {
    id: 'royal_gilded',
    name: 'Sovereign Gold & Ebony',
    subtitle: 'Burnished imperial gold statues vs mirror-polished black obsidian',
    price: 80,
    whiteHex: '#f5d061',
    whiteRoughness: 0.18,
    whiteMetalness: 0.84,
    whiteEmissiveHex: '#3d2b05',
    whiteEmissiveIntensity: 0.18,
    blackHex: '#12131a',
    blackRoughness: 0.14,
    blackMetalness: 0.68,
    blackEmissiveHex: '#1c1406',
    blackEmissiveIntensity: 0.12,
    trimHex: '#fff3c4',
    trimRoughness: 0.15,
    trimMetalness: 0.95,
    bladeHex: '#ffe17d',
    bladeRoughness: 0.15,
    bladeMetalness: 0.94,
    bladeEmissiveHex: '#664608',
    bladeEmissiveIntensity: 0.35
  },
  {
    id: 'imperial_jade',
    name: 'Imperial Jade & Bloodstone',
    subtitle: 'Sacred emerald jade guardians vs dark crimson garnet warriors',
    price: 150,
    whiteHex: '#52b788',
    whiteRoughness: 0.22,
    whiteMetalness: 0.20,
    whiteEmissiveHex: '#0b3b24',
    whiteEmissiveIntensity: 0.24,
    blackHex: '#4f121b',
    blackRoughness: 0.24,
    blackMetalness: 0.35,
    blackEmissiveHex: '#2b050a',
    blackEmissiveIntensity: 0.25,
    trimHex: '#e0a96d',
    trimRoughness: 0.22,
    trimMetalness: 0.88,
    bladeHex: '#95d5b2',
    bladeRoughness: 0.18,
    bladeMetalness: 0.86,
    bladeEmissiveHex: '#1b4332',
    bladeEmissiveIntensity: 0.42
  },
  {
    id: 'frost_glacial',
    name: 'Glacial Frost & Cobalt',
    subtitle: 'Crystalline winter marble vs deep abyssal sapphire armor',
    price: 220,
    whiteHex: '#d8f3ff',
    whiteRoughness: 0.16,
    whiteMetalness: 0.32,
    whiteEmissiveHex: '#123a54',
    whiteEmissiveIntensity: 0.28,
    blackHex: '#14243b',
    blackRoughness: 0.20,
    blackMetalness: 0.58,
    blackEmissiveHex: '#08182e',
    blackEmissiveIntensity: 0.26,
    trimHex: '#90e0ef',
    trimRoughness: 0.18,
    trimMetalness: 0.92,
    bladeHex: '#caf0f8',
    bladeRoughness: 0.14,
    bladeMetalness: 0.92,
    bladeEmissiveHex: '#0077b6',
    bladeEmissiveIntensity: 0.48
  },
  {
    id: 'celestial_astral',
    name: 'Astral Starlight & Void',
    subtitle: 'Radiant amethyst-infused marble vs dark arcane voidstone',
    price: 320,
    whiteHex: '#ede0ff',
    whiteRoughness: 0.18,
    whiteMetalness: 0.45,
    whiteEmissiveHex: '#3b1d6e',
    whiteEmissiveIntensity: 0.34,
    blackHex: '#19102c',
    blackRoughness: 0.18,
    blackMetalness: 0.64,
    blackEmissiveHex: '#240e47',
    blackEmissiveIntensity: 0.32,
    trimHex: '#ffbe0b',
    trimRoughness: 0.16,
    trimMetalness: 0.94,
    bladeHex: '#e0aaff',
    bladeRoughness: 0.15,
    bladeMetalness: 0.92,
    bladeEmissiveHex: '#7b2cbf',
    bladeEmissiveIntensity: 0.52
  },
  {
    id: 'hallow_pumpkin_wraith',
    name: 'Hallow Bone & Midnight Wraith',
    subtitle: 'Bleached skull-bone ivory vs charred phantom obsidian with carved pumpkin-amber & ectoplasm glow',
    price: 180,
    whiteHex: '#e8dfd1',
    whiteRoughness: 0.26,
    whiteMetalness: 0.18,
    whiteEmissiveHex: '#4a1c00',
    whiteEmissiveIntensity: 0.28,
    blackHex: '#16121d',
    blackRoughness: 0.22,
    blackMetalness: 0.54,
    blackEmissiveHex: '#1f0933',
    blackEmissiveIntensity: 0.32,
    trimHex: '#ff6d00',
    trimRoughness: 0.20,
    trimMetalness: 0.88,
    bladeHex: '#00e676',
    bladeRoughness: 0.16,
    bladeMetalness: 0.90,
    bladeEmissiveHex: '#00c853',
    bladeEmissiveIntensity: 0.62
  }
];

export const BOARD_SKINS: BoardSkin[] = [
  {
    id: 'obsidian_sanctum',
    name: 'Gothic Sanctum Altar',
    subtitle: 'Carved travertine & obsidian altar with gilded brass border and warm hearth braziers',
    environmentLabel: 'Moonlit Gothic Cathedral & Hearth Fire',
    archType: 'gothic',
    price: 0,
    lightSqHex: '#dcd3c2',
    lightRoughness: 0.38,
    lightMetalness: 0.06,
    darkSqHex: '#14171f',
    darkRoughness: 0.28,
    darkMetalness: 0.18,
    borderHex: '#d4af37',
    accentHex: '#ff9f1c',
    wallLookIndex: 0,
    floorLookIndex: 0,
    fogHex: '#10141f',
    sideWindowHex: '#90beff',
    northWindowHex: '#9bc4ff',
    southWindowHex: '#ffb85c',
    brazierBaseRGB: [1.0, 0.72, 0.24],
    brazierMidRGB: [1.0, 0.36, 0.05],
    brazierTipRGB: [0.85, 0.12, 0.02],
    brazierLightHex: '#ff8c24'
  },
  {
    id: 'royal_wood_table',
    name: 'Royal Wood Tournament Table',
    subtitle: 'Carved mahogany cabinet skirt, brass corner medallions, turned parlor legs & maple/walnut inlay',
    environmentLabel: 'Warm Grandmaster Parlor & Golden Chandelier Glow',
    archType: 'wood_table',
    price: 100,
    lightSqHex: '#f3dec0',
    lightRoughness: 0.22,
    lightMetalness: 0.05,
    darkSqHex: '#4a2511',
    darkRoughness: 0.24,
    darkMetalness: 0.10,
    borderHex: '#6f3618',
    accentHex: '#f5d061',
    wallLookIndex: 1,
    floorLookIndex: 1,
    fogHex: '#1c1510',
    sideWindowHex: '#ffd180',
    northWindowHex: '#ffe0a3',
    southWindowHex: '#ffab40',
    brazierBaseRGB: [1.0, 0.85, 0.42],
    brazierMidRGB: [0.98, 0.55, 0.12],
    brazierTipRGB: [0.85, 0.28, 0.04],
    brazierLightHex: '#ffb74d'
  },
  {
    id: 'runic_pedestal',
    name: 'Futuristic Cyber City Plaza',
    subtitle: 'Cybernetic metropolis board bordered by 3D neon skyscrapers, holographic forcefield gates, reactor spires & hovering spaceships',
    environmentLabel: 'Futuristic Cyber Metropolis & Neon Sky-Lanes',
    archType: 'runic_pedestal',
    price: 180,
    lightSqHex: '#d9d2e9',
    lightRoughness: 0.20,
    lightMetalness: 0.22,
    darkSqHex: '#1b112c',
    darkRoughness: 0.18,
    darkMetalness: 0.42,
    borderHex: '#7b2cbf',
    accentHex: '#00f5d4',
    wallLookIndex: 3,
    floorLookIndex: 3,
    fogHex: '#110b22',
    sideWindowHex: '#b388ff',
    northWindowHex: '#00e5ff',
    southWindowHex: '#d500f9',
    brazierBaseRGB: [0.45, 0.98, 1.0],
    brazierMidRGB: [0.58, 0.22, 0.98],
    brazierTipRGB: [0.22, 0.05, 0.65],
    brazierLightHex: '#9d4edd'
  },
  {
    id: 'crystal_sanctum',
    name: 'Floating Crystal Sanctum',
    subtitle: 'Prismatic translucent quartz altar surrounded by 8 levitating crystal spires & starlight rings',
    environmentLabel: 'Glacial Starlight Vault & Azure Soulfire',
    archType: 'crystal_sanctum',
    price: 260,
    lightSqHex: '#e2f6ff',
    lightRoughness: 0.12,
    lightMetalness: 0.28,
    darkSqHex: '#0d2b45',
    darkRoughness: 0.14,
    darkMetalness: 0.48,
    borderHex: '#48cae4',
    accentHex: '#90e0ef',
    wallLookIndex: 2,
    floorLookIndex: 2,
    fogHex: '#081826',
    sideWindowHex: '#80ffdb',
    northWindowHex: '#64dfdf',
    southWindowHex: '#48bfe3',
    brazierBaseRGB: [0.75, 0.98, 1.0],
    brazierMidRGB: [0.12, 0.72, 0.98],
    brazierTipRGB: [0.04, 0.28, 0.82],
    brazierLightHex: '#00b4d8'
  },
  {
    id: 'lava_forge',
    name: 'Volcanic Lava Forge',
    subtitle: 'Heavy charred basalt anvil board with glowing molten magma channels & iron corner pylons',
    environmentLabel: 'Molten Dragon Forge & Roaring Hellfire Braziers',
    archType: 'lava_forge',
    price: 340,
    lightSqHex: '#c9ada7',
    lightRoughness: 0.34,
    lightMetalness: 0.24,
    darkSqHex: '#1b0d0e',
    darkRoughness: 0.26,
    darkMetalness: 0.38,
    borderHex: '#2b2d42',
    accentHex: '#ff4800',
    wallLookIndex: 4,
    floorLookIndex: 4,
    fogHex: '#1f0b08',
    sideWindowHex: '#ff6d00',
    northWindowHex: '#ff3d00',
    southWindowHex: '#ff9100',
    brazierBaseRGB: [1.0, 0.92, 0.35],
    brazierMidRGB: [1.0, 0.24, 0.02],
    brazierTipRGB: [0.75, 0.02, 0.02],
    brazierLightHex: '#ff4800'
  },
  {
    id: 'cursed_pumpkin_altar',
    name: 'Cursed Jack-o\'-Lantern Crypt',
    subtitle: 'Weathered tombstone slate & charred pumpkin-wood altar bordered by wrought-iron cemetery fencing & glowing corner Jack-o\'-Lanterns',
    environmentLabel: 'Haunted Graveyard Crypt & Samhain Soulfire',
    archType: 'haunted_crypt',
    price: 220,
    lightSqHex: '#d8cbb8',
    lightRoughness: 0.34,
    lightMetalness: 0.14,
    darkSqHex: '#181122',
    darkRoughness: 0.26,
    darkMetalness: 0.36,
    borderHex: '#261c2e',
    accentHex: '#ff6d00',
    wallLookIndex: 0,
    floorLookIndex: 0,
    fogHex: '#12081c',
    sideWindowHex: '#ff6d00',
    northWindowHex: '#ff3d00',
    southWindowHex: '#00e676',
    brazierBaseRGB: [0.45, 1.0, 0.55],
    brazierMidRGB: [1.0, 0.45, 0.04],
    brazierTipRGB: [0.62, 0.12, 0.88],
    brazierLightHex: '#ff6d00'
  }
];

export const WORLD_SCENERIES: WorldScenery[] = [
  {
    id: 'gothic_cathedral',
    name: 'Gothic Cathedral Sanctum',
    subtitle: 'Enclosed moonlit medieval abbey nave with stained glass rose windows, carved ashlar pillars & hearth braziers',
    badge: 'Indoor Sanctum',
    price: 0,
    skyPreviewGradient: 'radial-gradient(circle at 50% 25%, #3a5a8c 0%, #161d2b 58%, #090b12 100%)',
    accentHex: '#d4af37',
    landmarksLabel: 'Vaulted Nave Pillars, Rose Tracery & Twin Hearth Braziers',
    weatherLabel: 'Warm Cathedral Torchlight & Drifting Dust Motes',
    fogHex: '#080b14',
    fogDensity: 0.015,
    hemiSkyHex: '#d8ccb8',
    hemiGroundHex: '#261d14',
    hemiIntensity: 0.62,
    keyLightHex: '#fff0d6',
    keyLightIntensity: 2.55,
    rimLightHex: '#d8cbb8',
    rimLightIntensity: 0.72
  },
  {
    id: 'celestial_observatory',
    name: 'Futuristic Cyber Metropolis',
    subtitle: 'Low-poly futuristic city sector with neon-lit skyscrapers, curved overpass bridge, holographic forcefield gates & patrolling hover-ships',
    badge: 'Cyber City Realm',
    price: 120,
    skyPreviewGradient: 'radial-gradient(circle at 35% 28%, #00f5d4 0%, #0a2e46 46%, #070d16 100%)',
    accentHex: '#00f5d4',
    landmarksLabel: 'Neon Skyscrapers, Overpass Bridge, Forcefield Gates, Reactor Spires & Patrolling Hover-Ships',
    weatherLabel: 'Glowing Neon Cyber Grid & Ascending Data Motes',
    fogHex: '#0b061d',
    fogDensity: 0.0045,
    hemiSkyHex: '#b8c0ff',
    hemiGroundHex: '#1f1138',
    hemiIntensity: 0.85,
    keyLightHex: '#f0e6ff',
    keyLightIntensity: 2.75,
    rimLightHex: '#00f5d4',
    rimLightIntensity: 1.15
  },
  {
    id: 'dragon_sky_citadel',
    name: 'Dragon Peak Sky Citadel',
    subtitle: 'Sovereign mountain-crest fortress above a billowing sea of golden clouds with soaring dragons & floating waterfall peaks',
    badge: 'Sky Peak Realm',
    price: 220,
    skyPreviewGradient: 'linear-gradient(180deg, #102a56 0%, #2b6cb0 42%, #f6ad55 78%, #ffd166 100%)',
    accentHex: '#ffb703',
    landmarksLabel: 'Dragon-Prow Citadel Spires, Soaring Sky Dragons & Floating Waterfall Peaks',
    weatherLabel: 'Billowing Golden Cloud Sea & Wind-Swept Sun Motes',
    fogHex: '#1d2740',
    fogDensity: 0.0042,
    hemiSkyHex: '#ffe8cc',
    hemiGroundHex: '#2c3347',
    hemiIntensity: 0.92,
    keyLightHex: '#fff2d6',
    keyLightIntensity: 2.95,
    rimLightHex: '#90e0ef',
    rimLightIntensity: 1.05
  },
  {
    id: 'volcanic_titan_forge',
    name: 'Volcanic Titan Forge',
    subtitle: 'Colossal chained basalt forge suspended over an active molten caldera with Titan anvil towers & pouring magma falls',
    badge: 'Molten Caldera',
    price: 320,
    skyPreviewGradient: 'radial-gradient(circle at 50% 80%, #ff9100 0%, #ff3d00 42%, #240804 82%, #0d0404 100%)',
    accentHex: '#ff5400',
    landmarksLabel: 'Colossal Titan Anchor Chains, Molten Lava Falls & Obsidian Caldera Spires',
    weatherLabel: 'Convecting Hellfire Embers, Swirling Ash & Bubbling Magma Sea',
    fogHex: '#1c0805',
    fogDensity: 0.0052,
    hemiSkyHex: '#ff9e66',
    hemiGroundHex: '#2e0a03',
    hemiIntensity: 0.78,
    keyLightHex: '#ffe0b2',
    keyLightIntensity: 2.68,
    rimLightHex: '#ff4800',
    rimLightIntensity: 1.28
  },
  {
    id: 'haunted_blood_graveyard',
    name: 'Haunted Blood-Moon Graveyard',
    subtitle: 'Moonlit Samhain cemetery beneath a colossal crimson Blood Moon with gnarled dead oaks, wrought-iron gates, circling bats & floating Jack-o\'-Lanterns',
    badge: 'Halloween Realm',
    price: 260,
    skyPreviewGradient: 'radial-gradient(circle at 50% 26%, #ff3d00 0%, #7b1fa2 45%, #160926 78%, #090410 100%)',
    accentHex: '#ff6d00',
    landmarksLabel: 'Colossal Blood Moon, Gnarled Dead Oaks, Iron Crypt Gates & Floating Jack-o\'-Lanterns',
    weatherLabel: 'Swirling Vampire Bats, Ectoplasm Mist & Rising Pumpkin Embers',
    fogHex: '#12081c',
    fogDensity: 0.0048,
    hemiSkyHex: '#ff9e80',
    hemiGroundHex: '#1b0c28',
    hemiIntensity: 0.84,
    keyLightHex: '#ffd1a3',
    keyLightIntensity: 2.72,
    rimLightHex: '#00e676',
    rimLightIntensity: 1.22
  }
];

export const PIECE_GOLD_BOUNTY: Record<string, number> = {
  pawn: 15,
  knight: 35,
  bishop: 35,
  rook: 55,
  queen: 95,
  king: 150
};

export const MATCH_WIN_BOUNTY: Record<string, number> = {
  bot_easy: 150,
  bot_medium: 225,
  bot_hard: 350,
  pass: 175,
  multi: 300
};

export interface EconomyState {
  gold: number;
  ownedPieceTypes: string[];
  activePieceType: string;
  ownedPieceSkins: string[];
  activePieceSkin: string;
  ownedBoardSkins: string[];
  activeBoardSkin: string;
  ownedSceneries: string[];
  activeScenery: string;
  stats: {
    wins: number;
    captures: number;
    totalGoldEarned: number;
  };
}

const ECONOMY_STORAGE_KEY = 'wizard_chess_economy_v1';

export function loadEconomyState(): EconomyState {
  const defaultState: EconomyState = {
    gold: 150, // Starter Gold so players can test unlocking a piece type, skin, board style, or world scenery right away
    ownedPieceTypes: ['gothic_warriors'],
    activePieceType: 'gothic_warriors',
    ownedPieceSkins: ['classic_stone'],
    activePieceSkin: 'classic_stone',
    ownedBoardSkins: ['obsidian_sanctum'],
    activeBoardSkin: 'obsidian_sanctum',
    ownedSceneries: ['gothic_cathedral'],
    activeScenery: 'gothic_cathedral',
    stats: {
      wins: 0,
      captures: 0,
      totalGoldEarned: 150
    }
  };

  try {
    const raw = localStorage.getItem(ECONOMY_STORAGE_KEY);
    if (!raw) return defaultState;
    const parsed = JSON.parse(raw);
    return {
      gold: typeof parsed.gold === 'number' ? parsed.gold : defaultState.gold,
      ownedPieceTypes:
        Array.isArray(parsed.ownedPieceTypes) && parsed.ownedPieceTypes.length > 0
          ? parsed.ownedPieceTypes
          : defaultState.ownedPieceTypes,
      activePieceType:
        typeof parsed.activePieceType === 'string'
          ? parsed.activePieceType
          : defaultState.activePieceType,
      ownedPieceSkins:
        Array.isArray(parsed.ownedPieceSkins) && parsed.ownedPieceSkins.length > 0
          ? parsed.ownedPieceSkins
          : defaultState.ownedPieceSkins,
      activePieceSkin:
        typeof parsed.activePieceSkin === 'string'
          ? parsed.activePieceSkin
          : defaultState.activePieceSkin,
      ownedBoardSkins:
        Array.isArray(parsed.ownedBoardSkins) && parsed.ownedBoardSkins.length > 0
          ? parsed.ownedBoardSkins
          : defaultState.ownedBoardSkins,
      activeBoardSkin:
        typeof parsed.activeBoardSkin === 'string'
          ? parsed.activeBoardSkin
          : defaultState.activeBoardSkin,
      ownedSceneries:
        Array.isArray(parsed.ownedSceneries) && parsed.ownedSceneries.length > 0
          ? parsed.ownedSceneries
          : defaultState.ownedSceneries,
      activeScenery:
        typeof parsed.activeScenery === 'string'
          ? parsed.activeScenery
          : defaultState.activeScenery,
      stats: {
        wins: Number(parsed?.stats?.wins || 0),
        captures: Number(parsed?.stats?.captures || 0),
        totalGoldEarned: Number(parsed?.stats?.totalGoldEarned || 150)
      }
    };
  } catch {
    return defaultState;
  }
}

export interface RankTierId {
  id: 'bronze' | 'silver' | 'gold' | 'platinum' | 'obsidian';
}

export interface RankTier {
  id: 'bronze' | 'silver' | 'gold' | 'platinum' | 'obsidian';
  numeral: string;
  name: string;
  title: string;
  minWins: number;
  maxWins: number | null;
  borderEffectName: string;
  borderDescription: string;
  primaryHex: string;
  secondaryHex: string;
  glowHex: string;
  crestGlyph: string;
}

export const RANK_TIERS: RankTier[] = [
  {
    id: 'bronze',
    numeral: 'I',
    name: 'Bronze',
    title: 'Bronze Initiate',
    minWins: 0,
    maxWins: 2,
    borderEffectName: 'Hammered Bronze Bevel',
    borderDescription: 'Weathered forged bronze plating with riveted cathedral corners and warm brazier ember glint.',
    primaryHex: '#cd7f32',
    secondaryHex: '#8b4513',
    glowHex: 'rgba(205, 127, 50, 0.55)',
    crestGlyph: '♙'
  },
  {
    id: 'silver',
    numeral: 'II',
    name: 'Silver',
    title: 'Silver Warden',
    minWins: 3,
    maxWins: 6,
    borderEffectName: 'Moonlit Runic Steel',
    borderDescription: 'Polished astral silver bevels with sweeping cold-steel specular sheen and warded corner sigils.',
    primaryHex: '#e2e8f0',
    secondaryHex: '#94a3b8',
    glowHex: 'rgba(226, 232, 240, 0.65)',
    crestGlyph: '♘'
  },
  {
    id: 'gold',
    numeral: 'III',
    name: 'Gold',
    title: 'Gold Archon',
    minWins: 7,
    maxWins: 12,
    borderEffectName: 'Imperial Auric Filigree',
    borderDescription: 'Radiant sunforged gold double-border with rotating solar halo and crowned cathedral spires.',
    primaryHex: '#f5d76e',
    secondaryHex: '#b8891e',
    glowHex: 'rgba(245, 215, 110, 0.78)',
    crestGlyph: '♖'
  },
  {
    id: 'platinum',
    numeral: 'IV',
    name: 'Astral',
    title: 'Astral Sovereign',
    minWins: 13,
    maxWins: 20,
    borderEffectName: 'Crystalline Starlight Corona',
    borderDescription: 'Prismatic aether-cyan crystal frame with pulsing arcane conduits and floating starlight motes.',
    primaryHex: '#67e8f9',
    secondaryHex: '#0284c7',
    glowHex: 'rgba(103, 232, 249, 0.82)',
    crestGlyph: '♕'
  },
  {
    id: 'obsidian',
    numeral: 'V',
    name: 'Obsidian',
    title: 'Obsidian Grandmaster',
    minWins: 21,
    maxWins: null,
    borderEffectName: 'Volcanic Void-Glass & Hellfire',
    borderDescription: 'Jagged black volcanic obsidian shard border infused with living crimson-violet abyssal rift flames.',
    primaryHex: '#f43f5e',
    secondaryHex: '#881337',
    glowHex: 'rgba(244, 63, 94, 0.88)',
    crestGlyph: '♔'
  }
];

export interface PlayerRankProgress {
  currentTier: RankTier;
  nextTier: RankTier | null;
  winsInTier: number;
  winsNeededForNext: number;
  winsRemaining: number;
  progressPercent: number;
}

export function getPlayerRankProgress(wins: number): PlayerRankProgress {
  const safeWins = Math.max(0, Math.floor(wins || 0));
  let currentIndex = 0;
  for (let i = 0; i < RANK_TIERS.length; i++) {
    if (safeWins >= RANK_TIERS[i].minWins) {
      currentIndex = i;
    }
  }
  const currentTier = RANK_TIERS[currentIndex];
  const nextTier = currentIndex + 1 < RANK_TIERS.length ? RANK_TIERS[currentIndex + 1] : null;

  if (!nextTier) {
    return {
      currentTier,
      nextTier: null,
      winsInTier: safeWins - currentTier.minWins,
      winsNeededForNext: 1,
      winsRemaining: 0,
      progressPercent: 100
    };
  }

  const span = Math.max(1, nextTier.minWins - currentTier.minWins);
  const winsInTier = Math.max(0, safeWins - currentTier.minWins);
  const winsRemaining = Math.max(0, nextTier.minWins - safeWins);
  const progressPercent = Math.min(100, Math.max(0, Math.round((winsInTier / span) * 100)));

  return {
    currentTier,
    nextTier,
    winsInTier,
    winsNeededForNext: span,
    winsRemaining,
    progressPercent
  };
}

export function saveEconomyState(state: EconomyState): void {
  try {
    localStorage.setItem(ECONOMY_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore storage quota errors
  }
}

