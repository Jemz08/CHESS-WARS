export interface PieceArchetype {
  id: 'gothic_warriors' | 'classic_staunton' | 'toon_classic' | 'arcane_cyber' | 'dragon_elemental' | 'hollow_reapers' | 'xmas_snow';
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
  badge?: string;
  isGlowing?: boolean;
  isCartoon?: boolean;
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
  trimEmissiveHex?: string;
  trimEmissiveIntensity?: number;
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
  archType: 'gothic' | 'wood_table' | 'toon_table' | 'runic_pedestal' | 'crystal_sanctum' | 'lava_forge' | 'haunted_crypt' | 'winter_hearth';
  isCartoon?: boolean;
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
  id: 'gothic_cathedral' | 'toon_sky_kingdom' | 'celestial_observatory' | 'dragon_sky_citadel' | 'volcanic_titan_forge' | 'haunted_blood_graveyard' | 'winter_aurora_village';
  name: string;
  subtitle: string;
  badge: string;
  isCartoon?: boolean;
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
    id: 'toon_classic',
    name: 'Cartoon Classic Toon',
    subtitle: 'Stylized cartoon-proportioned Classic set with bold pitch-black ink outlines, cel-stepped shading & expressive warhorse knights',
    badge: 'Cartoon Outline Set',
    price: 0,
    strikeStyle: 'Cartoon Squash-and-Stretch Leap & Comic Anvil Smash',
    shatterStyle: 'Comic Star-Burst & Ink Outline Pop',
    flashColorHex: '#ffbe0b'
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
    strikeStyle: 'Horizontal & Overhead Scythe-Slash Cleave + Spectral Soul-Harvest Surge',
    shatterStyle: 'Carved Pumpkin Detonation, Ectoplasm Soul-Flames & Swirling Bats',
    flashColorHex: '#ff6d00'
  },
  {
    id: 'xmas_snow',
    name: 'North Pole Snow Court',
    subtitle: 'Festive sculpted Santa Claus King, Snow Queen Empress, Snowy Pine Star Rook, Holiday Reindeer Knight & Snowman Wizards',
    badge: 'Christmas Event',
    price: 280,
    strikeStyle: 'Blizzard Sleigh-Charge & Crystalline Frost-Nova Smash',
    shatterStyle: 'Spinning Snowflake Crystals, Holiday Starbursts & Swirling Flurries',
    flashColorHex: '#38bdf8'
  }
];

export const PIECE_SKINS: PieceSkin[] = [
  {
    id: 'classic_stone',
    name: 'Sanctum Limestone',
    subtitle: 'Carved cathedral ashlar & charcoal slate with antique gold trim',
    badge: 'Classic Stone',
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
    id: 'toon_cel_ink',
    name: 'Cartoon Cel-Ink & Outline',
    subtitle: 'Vibrant cel-shaded butter-cream & midnight-indigo cartoon finish with bold pitch-black comic ink outlines & sunny gold crowns',
    badge: '✦ Cartoon Outline',
    isCartoon: true,
    price: 0,
    whiteHex: '#fff5d6',
    whiteRoughness: 0.52,
    whiteMetalness: 0.02,
    whiteEmissiveHex: '#ffd166',
    whiteEmissiveIntensity: 0.14,
    blackHex: '#353b5c',
    blackRoughness: 0.48,
    blackMetalness: 0.04,
    blackEmissiveHex: '#4361ee',
    blackEmissiveIntensity: 0.14,
    trimHex: '#ffbe0b',
    trimRoughness: 0.36,
    trimMetalness: 0.25,
    trimEmissiveHex: '#fb8500',
    trimEmissiveIntensity: 0.22,
    bladeHex: '#72efdd',
    bladeRoughness: 0.32,
    bladeMetalness: 0.20,
    bladeEmissiveHex: '#00b4d8',
    bladeEmissiveIntensity: 0.28
  },
  {
    id: 'royal_gilded',
    name: 'Sovereign Gold & Ebony',
    subtitle: 'Burnished imperial gold statues vs mirror-polished black obsidian',
    badge: 'Royal Metal',
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
    badge: 'Gemstone',
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
    id: 'hallow_pumpkin_wraith',
    name: 'Hallow Bone & Midnight Wraith',
    subtitle: 'Bleached skull-bone ivory vs charred phantom obsidian with carved pumpkin-amber & ectoplasm glow',
    badge: '✦ Glowing Finish',
    isGlowing: true,
    price: 180,
    whiteHex: '#e8dfd1',
    whiteRoughness: 0.26,
    whiteMetalness: 0.18,
    whiteEmissiveHex: '#cc4400',
    whiteEmissiveIntensity: 0.26,
    blackHex: '#16121d',
    blackRoughness: 0.22,
    blackMetalness: 0.54,
    blackEmissiveHex: '#5a189a',
    blackEmissiveIntensity: 0.30,
    trimHex: '#ff6d00',
    trimRoughness: 0.18,
    trimMetalness: 0.88,
    trimEmissiveHex: '#ff5400',
    trimEmissiveIntensity: 1.15,
    bladeHex: '#00e676',
    bladeRoughness: 0.14,
    bladeMetalness: 0.90,
    bladeEmissiveHex: '#00e676',
    bladeEmissiveIntensity: 1.45
  },
  {
    id: 'frost_glacial',
    name: 'Glacial Frost & Cobalt',
    subtitle: 'Crystalline winter marble vs deep abyssal sapphire armor',
    badge: 'Crystal & Ice',
    price: 220,
    whiteHex: '#d8f3ff',
    whiteRoughness: 0.16,
    whiteMetalness: 0.32,
    whiteEmissiveHex: '#123a54',
    whiteEmissiveIntensity: 0.22,
    blackHex: '#14243b',
    blackRoughness: 0.20,
    blackMetalness: 0.58,
    blackEmissiveHex: '#08182e',
    blackEmissiveIntensity: 0.22,
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
    id: 'molten_inferno_core',
    name: 'Inferno Magma & Obsidian',
    subtitle: 'Incandescent solar-lava core statues vs volcanic slag obsidian with living hellfire rune glow',
    badge: '✦ Glowing Finish',
    isGlowing: true,
    price: 260,
    whiteHex: '#ffd166',
    whiteRoughness: 0.22,
    whiteMetalness: 0.32,
    whiteEmissiveHex: '#ff5400',
    whiteEmissiveIntensity: 0.34,
    blackHex: '#1c0d0a',
    blackRoughness: 0.22,
    blackMetalness: 0.52,
    blackEmissiveHex: '#ff3300',
    blackEmissiveIntensity: 0.32,
    trimHex: '#ff6d00',
    trimRoughness: 0.14,
    trimMetalness: 0.90,
    trimEmissiveHex: '#ff4800',
    trimEmissiveIntensity: 1.45,
    bladeHex: '#fff3b0',
    bladeRoughness: 0.12,
    bladeMetalness: 0.88,
    bladeEmissiveHex: '#ff7b00',
    bladeEmissiveIntensity: 1.75
  },
  {
    id: 'cyber_neon_overdrive',
    name: 'Cyber Neon Overdrive',
    subtitle: 'Hyper-luminescent electric cyan synth-glass vs midnight carbon armor with laser-magenta plasma edges',
    badge: '✦ Glowing Finish',
    isGlowing: true,
    price: 290,
    whiteHex: '#b8fff4',
    whiteRoughness: 0.18,
    whiteMetalness: 0.42,
    whiteEmissiveHex: '#00f5d4',
    whiteEmissiveIntensity: 0.35,
    blackHex: '#100d24',
    blackRoughness: 0.18,
    blackMetalness: 0.70,
    blackEmissiveHex: '#f72585',
    blackEmissiveIntensity: 0.34,
    trimHex: '#ff2a85',
    trimRoughness: 0.12,
    trimMetalness: 0.92,
    trimEmissiveHex: '#f72585',
    trimEmissiveIntensity: 1.50,
    bladeHex: '#00f5d4',
    bladeRoughness: 0.10,
    bladeMetalness: 0.92,
    bladeEmissiveHex: '#00bbf9',
    bladeEmissiveIntensity: 1.85
  },
  {
    id: 'celestial_astral',
    name: 'Astral Starlight & Void',
    subtitle: 'Radiant amethyst-infused marble vs dark arcane voidstone',
    badge: '✦ Glowing Finish',
    isGlowing: true,
    price: 320,
    whiteHex: '#ede0ff',
    whiteRoughness: 0.20,
    whiteMetalness: 0.38,
    whiteEmissiveHex: '#7b2cbf',
    whiteEmissiveIntensity: 0.30,
    blackHex: '#19102c',
    blackRoughness: 0.20,
    blackMetalness: 0.60,
    blackEmissiveHex: '#5a189a',
    blackEmissiveIntensity: 0.30,
    trimHex: '#ffbe0b',
    trimRoughness: 0.16,
    trimMetalness: 0.94,
    trimEmissiveHex: '#ff9e00',
    trimEmissiveIntensity: 1.15,
    bladeHex: '#e0aaff',
    bladeRoughness: 0.15,
    bladeMetalness: 0.92,
    bladeEmissiveHex: '#9d4edd',
    bladeEmissiveIntensity: 1.45
  },
  {
    id: 'emerald_soulfire_lich',
    name: 'Necro Soulfire & Wraithbone',
    subtitle: 'Bioluminescent emerald soul-crystal vs cursed catacomb iron with eldritch ghostfire blades',
    badge: '✦ Glowing Finish',
    isGlowing: true,
    price: 340,
    whiteHex: '#c7f9cc',
    whiteRoughness: 0.20,
    whiteMetalness: 0.30,
    whiteEmissiveHex: '#00e676',
    whiteEmissiveIntensity: 0.34,
    blackHex: '#0d1b15',
    blackRoughness: 0.20,
    blackMetalness: 0.62,
    blackEmissiveHex: '#00c853',
    blackEmissiveIntensity: 0.32,
    trimHex: '#00f59b',
    trimRoughness: 0.14,
    trimMetalness: 0.88,
    trimEmissiveHex: '#00c853',
    trimEmissiveIntensity: 1.45,
    bladeHex: '#69f0ae',
    bladeRoughness: 0.12,
    bladeMetalness: 0.90,
    bladeEmissiveHex: '#00e676',
    bladeEmissiveIntensity: 1.80
  },
  {
    id: 'arctic_aurora_borealis',
    name: 'Aurora Borealis & Cryo-Glass',
    subtitle: 'Luminous polar ice-crystal vs deep trench permafrost infused with shimmering aurora borealis light',
    badge: '✦ Glowing Finish',
    isGlowing: true,
    price: 360,
    whiteHex: '#e0fbfc',
    whiteRoughness: 0.18,
    whiteMetalness: 0.36,
    whiteEmissiveHex: '#00bbf9',
    whiteEmissiveIntensity: 0.34,
    blackHex: '#0b1d30',
    blackRoughness: 0.18,
    blackMetalness: 0.64,
    blackEmissiveHex: '#0096c7',
    blackEmissiveIntensity: 0.32,
    trimHex: '#00f5d4',
    trimRoughness: 0.12,
    trimMetalness: 0.92,
    trimEmissiveHex: '#00e5ff',
    trimEmissiveIntensity: 1.42,
    bladeHex: '#90e0ef',
    bladeRoughness: 0.10,
    bladeMetalness: 0.94,
    bladeEmissiveHex: '#00b4d8',
    bladeEmissiveIntensity: 1.75
  },
  {
    id: 'crimson_bloodmoon_eclipse',
    name: 'Blood Moon Crimson & Onyx',
    subtitle: 'Radiant rose-ruby quartz vs sanguine midnight onyx with pulsing crimson blood-lightning blades',
    badge: '✦ Glowing Finish',
    isGlowing: true,
    price: 380,
    whiteHex: '#ffd6e0',
    whiteRoughness: 0.18,
    whiteMetalness: 0.38,
    whiteEmissiveHex: '#ff0a54',
    whiteEmissiveIntensity: 0.34,
    blackHex: '#18070d',
    blackRoughness: 0.18,
    blackMetalness: 0.68,
    blackEmissiveHex: '#e01e5a',
    blackEmissiveIntensity: 0.34,
    trimHex: '#ff2a55',
    trimRoughness: 0.14,
    trimMetalness: 0.92,
    trimEmissiveHex: '#ff0033',
    trimEmissiveIntensity: 1.50,
    bladeHex: '#ff758f',
    bladeRoughness: 0.12,
    bladeMetalness: 0.92,
    bladeEmissiveHex: '#ff0a54',
    bladeEmissiveIntensity: 1.80
  },
  {
    id: 'solar_archon_radiance',
    name: 'Solar Archon Radiance',
    subtitle: 'Sunforged celestial alabaster vs eclipse-corona obsidian with blinding golden starfire halos',
    badge: '✦ Glowing Finish',
    isGlowing: true,
    price: 420,
    whiteHex: '#fff3c4',
    whiteRoughness: 0.18,
    whiteMetalness: 0.52,
    whiteEmissiveHex: '#ffaa00',
    whiteEmissiveIntensity: 0.36,
    blackHex: '#1b120b',
    blackRoughness: 0.18,
    blackMetalness: 0.72,
    blackEmissiveHex: '#ff6d00',
    blackEmissiveIntensity: 0.34,
    trimHex: '#ffea00',
    trimRoughness: 0.10,
    trimMetalness: 0.96,
    trimEmissiveHex: '#ff9e00',
    trimEmissiveIntensity: 1.58,
    bladeHex: '#ffffff',
    bladeRoughness: 0.10,
    bladeMetalness: 0.96,
    bladeEmissiveHex: '#ffd000',
    bladeEmissiveIntensity: 1.88
  },
  {
    id: 'abyssal_void_nebula',
    name: 'Abyssal Void & Supernova',
    subtitle: 'Ultraviolet quasar crystal vs event-horizon dark matter with glowing singularity cyan-violet runes',
    badge: '✦ Glowing Finish',
    isGlowing: true,
    price: 450,
    whiteHex: '#e5c6ff',
    whiteRoughness: 0.18,
    whiteMetalness: 0.44,
    whiteEmissiveHex: '#9d4edd',
    whiteEmissiveIntensity: 0.36,
    blackHex: '#0d051d',
    blackRoughness: 0.16,
    blackMetalness: 0.74,
    blackEmissiveHex: '#7209b7',
    blackEmissiveIntensity: 0.36,
    trimHex: '#c77dff',
    trimRoughness: 0.12,
    trimMetalness: 0.94,
    trimEmissiveHex: '#9d4edd',
    trimEmissiveIntensity: 1.52,
    bladeHex: '#72efdd',
    bladeRoughness: 0.10,
    bladeMetalness: 0.94,
    bladeEmissiveHex: '#00f5d4',
    bladeEmissiveIntensity: 1.85
  },
  {
    id: 'prismatic_aether_diamond',
    name: 'Prismatic Aether & Celestite',
    subtitle: 'Mythic starlight diamond-opal vs cosmic dark-chrome with hyper-luminous neon rose & aether-cyan aura',
    badge: '✦ Mythic Glow',
    isGlowing: true,
    price: 500,
    whiteHex: '#f0f4ff',
    whiteRoughness: 0.16,
    whiteMetalness: 0.52,
    whiteEmissiveHex: '#4cc9f0',
    whiteEmissiveIntensity: 0.38,
    blackHex: '#110b29',
    blackRoughness: 0.16,
    blackMetalness: 0.78,
    blackEmissiveHex: '#b5179e',
    blackEmissiveIntensity: 0.38,
    trimHex: '#ff70a6',
    trimRoughness: 0.10,
    trimMetalness: 0.96,
    trimEmissiveHex: '#f72585',
    trimEmissiveIntensity: 1.65,
    bladeHex: '#a8f9ff',
    bladeRoughness: 0.08,
    bladeMetalness: 0.96,
    bladeEmissiveHex: '#4cc9f0',
    bladeEmissiveIntensity: 1.95
  },
  {
    id: 'frost_aurora_xmas',
    name: 'North Pole Frost & Aurora',
    subtitle: 'Christmas Event Finish: Frosted snow-alabaster & starlight gold vs midnight evergreen-slate & glacier aurora-cyan glow',
    badge: '❄ Christmas Event',
    isGlowing: true,
    price: 180,
    whiteHex: '#f1f7ff',
    whiteRoughness: 0.22,
    whiteMetalness: 0.28,
    whiteEmissiveHex: '#7dd3fc',
    whiteEmissiveIntensity: 0.28,
    blackHex: '#142636',
    blackRoughness: 0.22,
    blackMetalness: 0.56,
    blackEmissiveHex: '#0284c7',
    blackEmissiveIntensity: 0.30,
    trimHex: '#f5c344',
    trimRoughness: 0.14,
    trimMetalness: 0.92,
    trimEmissiveHex: '#fbbf24',
    trimEmissiveIntensity: 1.15,
    bladeHex: '#38bdf8',
    bladeRoughness: 0.12,
    bladeMetalness: 0.90,
    bladeEmissiveHex: '#38bdf8',
    bladeEmissiveIntensity: 1.65
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
    fogHex: '#e6d8be',
    sideWindowHex: '#fff0c2',
    northWindowHex: '#fff5d6',
    southWindowHex: '#ffd180',
    brazierBaseRGB: [1.0, 0.78, 0.28],
    brazierMidRGB: [1.0, 0.44, 0.08],
    brazierTipRGB: [0.90, 0.20, 0.04],
    brazierLightHex: '#ff9e38'
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
    id: 'toon_ink_wood_table',
    name: 'Comic-Inked Wood & Gold Pedestal',
    subtitle: 'Cel-shaded honey-birch & comic-walnut chessboard on a chunky wood-and-gold parlor pedestal with bold pitch-black ink outlines',
    environmentLabel: 'Storybook Toon Parlor & Sunlit Cel-Gold Glow',
    archType: 'toon_table',
    isCartoon: true,
    price: 0,
    lightSqHex: '#fff0c2',
    lightRoughness: 0.48,
    lightMetalness: 0.02,
    darkSqHex: '#5e3a24',
    darkRoughness: 0.46,
    darkMetalness: 0.04,
    borderHex: '#8c4a27',
    accentHex: '#ffbe0b',
    wallLookIndex: 1,
    floorLookIndex: 1,
    fogHex: '#1d2238',
    sideWindowHex: '#ffe082',
    northWindowHex: '#fff3b0',
    southWindowHex: '#ffb703',
    brazierBaseRGB: [1.0, 0.90, 0.35],
    brazierMidRGB: [1.0, 0.62, 0.08],
    brazierTipRGB: [0.95, 0.32, 0.05],
    brazierLightHex: '#ffbe0b'
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
  },
  {
    id: 'frost_hearth_altar',
    name: 'Frosted Pine & Hearth Altar',
    subtitle: 'Glacial snow-marble & deep winter-pine tiles framed by cedar-gold rails, holiday wreaths & warm glowing snow-lantern posts',
    environmentLabel: 'Christmas Eve Hearth & Polar Lanterns',
    archType: 'winter_hearth',
    price: 200,
    lightSqHex: '#edf6ff',
    lightRoughness: 0.22,
    lightMetalness: 0.14,
    darkSqHex: '#173245',
    darkRoughness: 0.24,
    darkMetalness: 0.28,
    borderHex: '#4f311b',
    accentHex: '#38bdf8',
    wallLookIndex: 2,
    floorLookIndex: 2,
    fogHex: '#0b1830',
    sideWindowHex: '#38bdf8',
    northWindowHex: '#2dd4bf',
    southWindowHex: '#ffb703',
    brazierBaseRGB: [1.0, 0.94, 0.72],
    brazierMidRGB: [1.0, 0.68, 0.18],
    brazierTipRGB: [0.22, 0.82, 0.98],
    brazierLightHex: '#ffbe42'
  }
];

export const WORLD_SCENERIES: WorldScenery[] = [
  {
    id: 'gothic_cathedral',
    name: 'Gothic Cathedral Sanctum',
    subtitle: 'Enclosed moonlit medieval abbey nave with stained glass rose windows, carved ashlar pillars & hearth braziers',
    badge: 'Indoor Sanctum',
    price: 0,
    skyPreviewGradient: 'radial-gradient(circle at 50% 25%, #fff5d6 0%, #e6cfb2 58%, #b89872 100%)',
    accentHex: '#c98a22',
    landmarksLabel: 'Sunlit Vaulted Nave Pillars, Golden Rose Tracery & Twin Hearth Braziers',
    weatherLabel: 'Warm Sunlit Clerestory Rays & Golden Dust Motes',
    fogHex: '#e6d8be',
    fogDensity: 0.0085,
    hemiSkyHex: '#fff8eb',
    hemiGroundHex: '#8c6f4e',
    hemiIntensity: 1.08,
    keyLightHex: '#fff6e0',
    keyLightIntensity: 2.95,
    rimLightHex: '#ffe4b5',
    rimLightIntensity: 1.05
  },
  {
    id: 'toon_sky_kingdom',
    name: 'Cozy Cartoon Parlor Box',
    subtitle: 'Enclosed cel-shaded game parlor room with bold pitch-black ink outlines, timber wainscoting, sunlit comic windows, bookcases & storybook chandelier',
    badge: '✦ Cartoon Room',
    isCartoon: true,
    price: 0,
    skyPreviewGradient: 'radial-gradient(circle at 50% 28%, #fff6cc 0%, #f7dcb4 56%, #d9a066 100%)',
    accentHex: '#ffbe0b',
    landmarksLabel: 'Black-Inked Timber Beams, Sunlit Comic Windows, Cozy Bookcases & Storybook Hearth',
    weatherLabel: 'Sunlit Parlor Rays & Floating Golden Comic Star-Motes',
    fogHex: '#f5e4c8',
    fogDensity: 0.0065,
    hemiSkyHex: '#fff9e2',
    hemiGroundHex: '#8c5a32',
    hemiIntensity: 1.12,
    keyLightHex: '#fff7d6',
    keyLightIntensity: 3.05,
    rimLightHex: '#ffbe0b',
    rimLightIntensity: 1.18
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
    subtitle: 'Inferno World volcanic island caldera with Horned Warrior Statues, Battle Axe monuments, Fantasy Inferno Towers, Star Platform, Demon Bones, Forge Gears & Treasure Hoards',
    badge: 'Inferno World Realm',
    price: 320,
    skyPreviewGradient: 'radial-gradient(circle at 50% 80%, #ff9100 0%, #ff3d00 42%, #240804 82%, #0d0404 100%)',
    accentHex: '#ff5400',
    landmarksLabel: 'Horned Warrior Statues, Battle Axe Monuments, Inferno Towers, Star Ritual Platform, Demon Bones & Forge Gears',
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
  },
  {
    id: 'winter_aurora_village',
    name: 'Christmas Eve Aurora Wonderland',
    subtitle: 'Starry winter valley under shimmering Northern Lights with snowy pine forests, frozen waterfall, ice arches, wood shelters & drifting snowfall',
    badge: 'Christmas Realm',
    price: 260,
    skyPreviewGradient: 'linear-gradient(180deg, #060d24 0%, #102a52 38%, #1d6f7a 68%, #9be7ff 100%)',
    accentHex: '#38bdf8',
    landmarksLabel: 'Snowy Evergreen Groves, Frozen Waterfall, Ice Arches, Wood Shelters & Cozy Hearth Lanterns',
    weatherLabel: 'Northern Lights Aurora Ribbons & Drifting 3D Snowfall',
    fogHex: '#0b1933',
    fogDensity: 0.0044,
    hemiSkyHex: '#bfe6ff',
    hemiGroundHex: '#182b45',
    hemiIntensity: 0.92,
    keyLightHex: '#eef8ff',
    keyLightIntensity: 2.82,
    rimLightHex: '#2dd4bf',
    rimLightIntensity: 1.25
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
    winStreak: number;
    captures: number;
    totalGoldEarned: number;
  };
}

const ECONOMY_STORAGE_KEY = 'wizard_chess_economy_v1';

export function loadEconomyState(): EconomyState {
  const defaultState: EconomyState = {
    gold: 150, // Starter Gold so players can test unlocking a piece type, skin, board style, or world scenery right away
    ownedPieceTypes: ['gothic_warriors', 'toon_classic'],
    activePieceType: 'gothic_warriors',
    ownedPieceSkins: ['classic_stone', 'toon_cel_ink'],
    activePieceSkin: 'classic_stone',
    ownedBoardSkins: ['obsidian_sanctum', 'toon_ink_wood_table'],
    activeBoardSkin: 'obsidian_sanctum',
    ownedSceneries: ['gothic_cathedral', 'toon_sky_kingdom'],
    activeScenery: 'gothic_cathedral',
    stats: {
      wins: 0,
      winStreak: 0,
      captures: 0,
      totalGoldEarned: 150
    }
  };

  try {
    const raw = localStorage.getItem(ECONOMY_STORAGE_KEY);
    if (!raw) return defaultState;
    const parsed = JSON.parse(raw);
    const savedPieceTypes =
      Array.isArray(parsed.ownedPieceTypes) && parsed.ownedPieceTypes.length > 0
        ? parsed.ownedPieceTypes
        : defaultState.ownedPieceTypes;
    const savedPieceSkins =
      Array.isArray(parsed.ownedPieceSkins) && parsed.ownedPieceSkins.length > 0
        ? parsed.ownedPieceSkins
        : defaultState.ownedPieceSkins;
    const savedBoardSkins =
      Array.isArray(parsed.ownedBoardSkins) && parsed.ownedBoardSkins.length > 0
        ? parsed.ownedBoardSkins
        : defaultState.ownedBoardSkins;
    const savedSceneries =
      Array.isArray(parsed.ownedSceneries) && parsed.ownedSceneries.length > 0
        ? parsed.ownedSceneries
        : defaultState.ownedSceneries;
    return {
      gold: typeof parsed.gold === 'number' ? parsed.gold : defaultState.gold,
      ownedPieceTypes: Array.from(new Set([...savedPieceTypes, 'toon_classic'])),
      activePieceType:
        typeof parsed.activePieceType === 'string'
          ? parsed.activePieceType
          : defaultState.activePieceType,
      ownedPieceSkins: Array.from(new Set([...savedPieceSkins, 'toon_cel_ink'])),
      activePieceSkin:
        typeof parsed.activePieceSkin === 'string'
          ? parsed.activePieceSkin
          : defaultState.activePieceSkin,
      ownedBoardSkins: Array.from(new Set([...savedBoardSkins, 'toon_ink_wood_table'])),
      activeBoardSkin:
        typeof parsed.activeBoardSkin === 'string'
          ? parsed.activeBoardSkin
          : defaultState.activeBoardSkin,
      ownedSceneries: Array.from(new Set([...savedSceneries, 'toon_sky_kingdom'])),
      activeScenery:
        typeof parsed.activeScenery === 'string'
          ? parsed.activeScenery
          : defaultState.activeScenery,
      stats: {
        wins: Number(parsed?.stats?.wins || 0),
        winStreak: Math.max(0, Number(parsed?.stats?.winStreak || 0)),
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
    primaryHex: '#4b6584',
    secondaryHex: '#94a3b8',
    glowHex: 'rgba(100, 116, 139, 0.45)',
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
    primaryHex: '#b87814',
    secondaryHex: '#e09f24',
    glowHex: 'rgba(217, 144, 24, 0.55)',
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
    primaryHex: '#0284c7',
    secondaryHex: '#38bdf8',
    glowHex: 'rgba(14, 165, 233, 0.55)',
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

