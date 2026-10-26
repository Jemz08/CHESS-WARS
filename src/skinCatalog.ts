export interface PieceArchetype {
  id: 'gothic_warriors' | 'classic_staunton' | 'arcane_cyber' | 'dragon_elemental';
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
  archType: 'gothic' | 'wood_table' | 'runic_pedestal' | 'crystal_sanctum' | 'lava_forge';
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

export const PIECE_ARCHETYPES: PieceArchetype[] = [
  {
    id: 'gothic_warriors',
    name: 'Gothic Sanctum Warriors',
    subtitle: 'Hand-sculpted medieval stone knights, broadsword kings, mace bishops & armored rooks',
    badge: 'Sculpted Statues',
    price: 0,
    strikeStyle: 'Heavy Melee Weapon Cleave',
    shatterStyle: 'Carved Cathedral Stone Shards',
    flashColorHex: '#ffb74d'
  },
  {
    id: 'classic_staunton',
    name: 'Classic Staunton Tournament',
    subtitle: 'Fluted spline-lathed grandmaster chessmen with carved bridled warhorses, slotted mitres & arched crowns',
    badge: 'Tournament Set',
    price: 120,
    strikeStyle: 'Grandmaster Kinetic Lunge & Slam',
    shatterStyle: 'Turned Hardwood & Brass Fragments',
    flashColorHex: '#ffe082'
  },
  {
    id: 'arcane_cyber',
    name: 'Arcane Runic & Cyber-Mech',
    subtitle: 'Articulated paladin automatons with feathered Valkyrie energy wings, kite shields, runic greatswords & gyro astrolabes',
    badge: 'Cyber-Arcane Set',
    price: 240,
    strikeStyle: 'Overcharged Plasma Lunge & Pulse',
    shatterStyle: 'Glowing Cyber-Crystal & Core Shards',
    flashColorHex: '#00f5d4'
  },
  {
    id: 'dragon_elemental',
    name: 'Dragon & Elemental Guardians',
    subtitle: 'Sinuous S-curved dragons with ribbed bat-wing membranes, spiral horns, coiled wyvern towers & fanged jaws',
    badge: 'Mythic Beasts',
    price: 360,
    strikeStyle: 'Ferocious Drake-Claw & Flame Strike',
    shatterStyle: 'Molten Obsidian & Dragonfire Embers',
    flashColorHex: '#ff4d6d'
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
    name: 'Arcane Runic Pedestal',
    subtitle: 'Stepped octagonal runestone dais with 4 levitating arcane obelisks & etched glowing mana rings',
    environmentLabel: 'Astral Arcane Sanctum & Mystic Violet-Cyan Conflux',
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
  stats: {
    wins: number;
    captures: number;
    totalGoldEarned: number;
  };
}

const ECONOMY_STORAGE_KEY = 'wizard_chess_economy_v1';

export function loadEconomyState(): EconomyState {
  const defaultState: EconomyState = {
    gold: 150, // Starter Gold so players can test unlocking a piece type, skin, or board style right away
    ownedPieceTypes: ['gothic_warriors'],
    activePieceType: 'gothic_warriors',
    ownedPieceSkins: ['classic_stone'],
    activePieceSkin: 'classic_stone',
    ownedBoardSkins: ['obsidian_sanctum'],
    activeBoardSkin: 'obsidian_sanctum',
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

export function saveEconomyState(state: EconomyState): void {
  try {
    localStorage.setItem(ECONOMY_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore storage quota errors
  }
}
