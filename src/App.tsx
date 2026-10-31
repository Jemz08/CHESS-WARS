import { useEffect, useRef, useState } from 'react';
import type { User } from 'firebase/auth';
import { initWizardChess } from './wizardChessEngine.js';
import {
  PIECE_ARCHETYPES,
  PIECE_SKINS,
  BOARD_SKINS,
  WORLD_SCENERIES,
  PIECE_GOLD_BOUNTY,
  MATCH_WIN_BOUNTY,
  RANK_TIERS,
  getPlayerRankProgress,
  loadEconomyState,
  saveEconomyState,
  type EconomyState,
  type RankTier,
  type PieceArchetype,
  type PieceSkin,
  type BoardSkin,
  type WorldScenery
} from './skinCatalog';
import {
  loginWithGoogle,
  logoutUser,
  subscribeToAuth,
  saveUserDataToCloud,
  loadUserDataFromCloud,
  subscribeToLeaderboard,
  type LeaderboardPlayer
} from './firebase';
import SkinShowcaseCanvas from './SkinShowcaseCanvas';
import {
  POLIIGON_PRESET_CATALOG,
  setPoliigonPresetOverride,
  getAllPoliigonSlotOverrides,
  resetAllPoliigonSlotOverrides,
  loadCustomPoliigonTextureFiles
} from './poliigonPbrTextures.js';
import {
  PlaySwordsVectorIcon,
  SkinsCrownVectorIcon,
  GoogleShieldVectorIcon,
  CloudCheckVectorIcon,
  TrophyChaliceVectorIcon,
  SettingsGearVectorIcon,
  Eye3DPreviewVectorIcon,
  GoldCoinVectorIcon,
  CommanderSigilVectorIcon,
  ItchPouchBountyIcon,
  ItchRotateCameraIcon,
  BulletModeVectorIcon,
  BlitzModeVectorIcon,
  RapidModeVectorIcon
} from './GameVectorIcons';

export type TimeControlCategory = 'bullet' | 'blitz' | 'rapid';
export type TimeControlPresetId =
  | 'bullet_1'
  | 'bullet_2'
  | 'blitz_3'
  | 'blitz_5'
  | 'blitz_8'
  | 'rapid_10'
  | 'rapid_15'
  | 'rapid_30'
  | 'rapid_60';

export interface TimeControlPresetOption {
  id: TimeControlPresetId;
  category: TimeControlCategory;
  minutes: number;
  initialSeconds: number;
  label: string;
  shortLabel: string;
}

export interface TimeControlCategoryDef {
  id: TimeControlCategory;
  name: string;
  rangeTag: string;
  description: string;
  defaultPresetId: TimeControlPresetId;
  presets: TimeControlPresetOption[];
}

export const TIME_CONTROL_CATEGORIES: TimeControlCategoryDef[] = [
  {
    id: 'bullet',
    name: 'Bullet',
    rangeTag: '< 3 Min Total',
    description:
      'Ultra-fast games where each player has less than 3 minutes (often 1 to 2 minutes) total.',
    defaultPresetId: 'bullet_2',
    presets: [
      {
        id: 'bullet_1',
        category: 'bullet',
        minutes: 1,
        initialSeconds: 60,
        label: 'Bullet • 1 Min',
        shortLabel: '1 Min'
      },
      {
        id: 'bullet_2',
        category: 'bullet',
        minutes: 2,
        initialSeconds: 120,
        label: 'Bullet • 2 Min',
        shortLabel: '2 Min'
      }
    ]
  },
  {
    id: 'blitz',
    name: 'Blitz',
    rangeTag: '3 to 10 Min Total',
    description:
      'Fast-paced games where each player gets 3 to 10 minutes total (commonly 5 minutes).',
    defaultPresetId: 'blitz_5',
    presets: [
      {
        id: 'blitz_3',
        category: 'blitz',
        minutes: 3,
        initialSeconds: 180,
        label: 'Blitz • 3 Min',
        shortLabel: '3 Min'
      },
      {
        id: 'blitz_5',
        category: 'blitz',
        minutes: 5,
        initialSeconds: 300,
        label: 'Blitz • 5 Min',
        shortLabel: '5 Min'
      },
      {
        id: 'blitz_8',
        category: 'blitz',
        minutes: 8,
        initialSeconds: 480,
        label: 'Blitz • 8 Min',
        shortLabel: '8 Min'
      }
    ]
  },
  {
    id: 'rapid',
    name: 'Rapid',
    rangeTag: '10 to 60 Min Total',
    description:
      'Medium-length games where each player gets 10 to 60 minutes total.',
    defaultPresetId: 'rapid_10',
    presets: [
      {
        id: 'rapid_10',
        category: 'rapid',
        minutes: 10,
        initialSeconds: 600,
        label: 'Rapid • 10 Min',
        shortLabel: '10 Min'
      },
      {
        id: 'rapid_15',
        category: 'rapid',
        minutes: 15,
        initialSeconds: 900,
        label: 'Rapid • 15 Min',
        shortLabel: '15 Min'
      },
      {
        id: 'rapid_30',
        category: 'rapid',
        minutes: 30,
        initialSeconds: 1800,
        label: 'Rapid • 30 Min',
        shortLabel: '30 Min'
      },
      {
        id: 'rapid_60',
        category: 'rapid',
        minutes: 60,
        initialSeconds: 3600,
        label: 'Rapid • 60 Min',
        shortLabel: '60 Min'
      }
    ]
  }
];

function formatChessClock(seconds: number): string {
  const clamped = Math.max(0, seconds);
  if (clamped > 0 && clamped < 10) {
    return `0:0${clamped.toFixed(1)}`;
  }
  const totalSec = Math.ceil(clamped);
  const mins = Math.floor(totalSec / 60);
  const secs = totalSec % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

interface WizardChessAPI {
  toggleUI?: (force?: boolean) => void;
  refreshPoliigonMaterials?: () => void;
  applyPieceArchetype?: (archetype: unknown) => void;
  applyPieceSkin?: (skin: unknown) => void;
  applyBoardSkin?: (skin: unknown) => void;
  applyWorldScenery?: (scenery: unknown, options?: { flyToVista?: boolean }) => void;
  startBotMatch?: (difficulty: 'easy' | 'medium' | 'hard', side: 'w' | 'b', timeControl?: string) => void;
  startPassAndPlayMatch?: (autoFlip: boolean, timeControl?: string) => void;
  startOnlineMatchmaking?: (preferredColor?: 'w' | 'b' | 'any', rating?: number) => Promise<void>;
  cancelOnlineMatchmaking?: (reason?: string) => Promise<void>;
  createMultiplayerRoom?: (preferredColor: 'w' | 'b') => Promise<{ code: string; color: 'w' | 'b'; room: unknown }>;
  joinMultiplayerRoom?: (code: string) => Promise<boolean>;
  setBotDifficulty?: (diff: 'easy' | 'medium' | 'hard') => void;
  setTimeControl?: (presetOrCategory: string, resetClocks?: boolean) => void;
  setPassAutoFlip?: (autoFlip: boolean) => void;
  flipPassCameraNow?: () => void;
  setLobbyPaused?: (paused: boolean) => void;
  setCameraPreset?: (preset: string) => void;
  setVoiceAnnouncerEnabled?: (enabled: boolean) => boolean;
  setSfxEnabled?: (enabled: boolean) => boolean;
  getSfxEnabled?: () => boolean;
  setSfxVolume?: (vol: number) => number;
  getSfxVolume?: () => number;
  playLobbyClickSfx?: (variant?: 'default' | 'tab' | 'card' | 'equip' | 'unlock' | 'buy' | 'start' | 'close') => void;
  setLobbyMusicActive?: (active: boolean) => void;
  setLobbyMusicEnabled?: (enabled: boolean) => boolean;
  getLobbyMusicEnabled?: () => boolean;
  setLobbyMusicVolume?: (vol: number) => number;
  getLobbyMusicVolume?: () => number;
  announceSanctumEvent?: (eventType: string, payload?: Record<string, unknown>) => void;
  getState?: () => {
    gameMode: 'single' | 'pass' | 'multi';
    botDifficulty: 'easy' | 'medium' | 'hard';
    playerColor: 'w' | 'b';
    currentTurn: 'w' | 'b';
    roomCode: string | null;
    onlineQueueStatus: 'idle' | 'searching' | 'matched';
    inCheck?: boolean;
    voiceEnabled?: boolean;
    sfxEnabled?: boolean;
    uiHidden?: boolean;
    timeControlCategory?: TimeControlCategory;
    timeControlPresetId?: TimeControlPresetId;
    whiteTimeRemaining?: number;
    blackTimeRemaining?: number;
  };
}

function getEngine(): WizardChessAPI | undefined {
  return (window as unknown as { wizardChess?: WizardChessAPI }).wizardChess;
}

// Built-in initial Grandmaster Sanctum Masters across all 5 Rank Tiers
const INITIAL_SANCTUM_LEADERBOARD: LeaderboardPlayer[] = [
  {
    id: 'lb-1',
    userId: 'bot-malakor',
    displayName: 'Grandmaster Malakor',
    wins: 28,
    captures: 240,
    rating: 2180,
    rankTier: 'obsidian',
    rankNumeral: 'V',
    activePieceType: 'Dragon & Elemental Guardians'
  },
  {
    id: 'lb-2',
    userId: 'bot-valerius',
    displayName: 'Archon Valerius',
    wins: 24,
    captures: 195,
    rating: 1985,
    rankTier: 'obsidian',
    rankNumeral: 'V',
    activePieceType: 'Arcane Runic & Cyber-Mech'
  },
  {
    id: 'lb-3',
    userId: 'bot-aurelia',
    displayName: 'Sovereign Aurelia',
    wins: 19,
    captures: 160,
    rating: 1780,
    rankTier: 'platinum',
    rankNumeral: 'IV',
    activePieceType: 'Gothic Sanctum Warriors'
  },
  {
    id: 'lb-4',
    userId: 'bot-kaiden',
    displayName: 'High Templar Kaiden',
    wins: 15,
    captures: 124,
    rating: 1640,
    rankTier: 'platinum',
    rankNumeral: 'IV',
    activePieceType: 'Classic Staunton Tournament'
  },
  {
    id: 'lb-5',
    userId: 'bot-gareth',
    displayName: 'Paladin Gareth',
    wins: 11,
    captures: 98,
    rating: 1485,
    rankTier: 'gold',
    rankNumeral: 'III',
    activePieceType: 'Arcane Runic & Cyber-Mech'
  },
  {
    id: 'lb-6',
    userId: 'bot-selyse',
    displayName: 'Warden Selyse',
    wins: 8,
    captures: 72,
    rating: 1360,
    rankTier: 'gold',
    rankNumeral: 'III',
    activePieceType: 'Gothic Sanctum Warriors'
  },
  {
    id: 'lb-7',
    userId: 'bot-brand',
    displayName: 'Sentinel Brand',
    wins: 6,
    captures: 54,
    rating: 1260,
    rankTier: 'silver',
    rankNumeral: 'II',
    activePieceType: 'Classic Staunton Tournament'
  },
  {
    id: 'lb-8',
    userId: 'bot-roderic',
    displayName: 'Knight Roderic',
    wins: 4,
    captures: 38,
    rating: 1180,
    rankTier: 'silver',
    rankNumeral: 'II',
    activePieceType: 'Gothic Sanctum Warriors'
  },
  {
    id: 'lb-9',
    userId: 'bot-kira',
    displayName: 'Acolyte Kira',
    wins: 2,
    captures: 22,
    rating: 1090,
    rankTier: 'bronze',
    rankNumeral: 'I',
    activePieceType: 'Gothic Sanctum Warriors'
  },
  {
    id: 'lb-10',
    userId: 'bot-dorian',
    displayName: 'Novice Dorian',
    wins: 1,
    captures: 12,
    rating: 1045,
    rankTier: 'bronze',
    rankNumeral: 'I',
    activePieceType: 'Classic Staunton Tournament'
  }
];

export default function App() {
  const initializedRef = useRef(false);
  const [economy, setEconomy] = useState<EconomyState>(() => loadEconomyState());
  const [activeDialog, setActiveDialog] = useState<
    'none' | 'gateway' | 'play' | 'armory' | 'leaderboard' | 'settings' | 'arena'
  >('gateway');
  const [armoryTab, setArmoryTab] = useState<'types' | 'sceneries' | 'boards' | 'pieces'>('types');
  const [arenaTab, setArenaTab] = useState<'bot' | 'online' | 'pass'>('bot');
  const [leaderboardTab, setLeaderboardTab] = useState<'all' | 'obsidian' | 'platinum' | 'gold' | 'silver' | 'bronze'>('all');
  const [showcaseArchetypeId, setShowcaseArchetypeId] = useState<string>(() => loadEconomyState().activePieceType);
  const [showcasePieceSkinId, setShowcasePieceSkinId] = useState<string>(() => loadEconomyState().activePieceSkin);
  const [showcaseBoardSkinId, setShowcaseBoardSkinId] = useState<string>(() => loadEconomyState().activeBoardSkin);
  const [showcaseSceneryId, setShowcaseSceneryId] = useState<string>(() => loadEconomyState().activeScenery);
  const [showcaseAttackNonce, setShowcaseAttackNonce] = useState<number>(0);
  const [armoryPreviewCollapsed, setArmoryPreviewCollapsed] = useState<boolean>(false);
  const [poliigonTargetSlot, setPoliigonTargetSlot] = useState<'pieces' | 'table' | 'board' | 'trim'>('pieces');
  const [poliigonSlotOverrides, setPoliigonSlotOverrides] = useState<{
    pieces: string;
    table: string;
    board: string;
    trim: string;
  }>(() => getAllPoliigonSlotOverrides());
  const [poliigonOverrideNonce, setPoliigonOverrideNonce] = useState<number>(0);
  const poliigonUploadInputRef = useRef<HTMLInputElement | null>(null);

  const activePoliigonPreset = poliigonSlotOverrides[poliigonTargetSlot] || 'auto';

  const handleSelectPoliigonPreset = (presetId: string) => {
    setPoliigonPresetOverride(presetId, poliigonTargetSlot);
    setPoliigonSlotOverrides(getAllPoliigonSlotOverrides());
    setPoliigonOverrideNonce((n) => n + 1);
    getEngine()?.playLobbyClickSfx?.('equip');
    getEngine()?.refreshPoliigonMaterials?.();
  };

  const handleResetAllPoliigonSlots = () => {
    const reset = resetAllPoliigonSlotOverrides();
    setPoliigonSlotOverrides(reset);
    setPoliigonOverrideNonce((n) => n + 1);
    getEngine()?.playLobbyClickSfx?.('close');
    getEngine()?.refreshPoliigonMaterials?.();
  };

  const handlePoliigonFilesUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const filesMap: {
      albedoDataUrl?: string;
      normalDataUrl?: string;
      roughnessDataUrl?: string;
    } = {};
    const fileArr = Array.from(files);
    let remaining = fileArr.length;

    fileArr.forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = typeof reader.result === 'string' ? reader.result : '';
        const lower = file.name.toLowerCase();
        if (lower.includes('nrm') || lower.includes('norm') || lower.includes('normal')) {
          filesMap.normalDataUrl = dataUrl;
        } else if (lower.includes('rough') || lower.includes('gloss') || lower.includes('disp')) {
          filesMap.roughnessDataUrl = dataUrl;
        } else {
          filesMap.albedoDataUrl = dataUrl;
        }
        remaining--;
        if (remaining === 0) {
          loadCustomPoliigonTextureFiles(
            filesMap,
            () => {
              setPoliigonSlotOverrides(getAllPoliigonSlotOverrides());
              setPoliigonOverrideNonce((n) => n + 1);
              getEngine()?.playLobbyClickSfx?.('unlock');
              getEngine()?.refreshPoliigonMaterials?.();
            },
            poliigonTargetSlot
          );
        }
      };
      reader.readAsDataURL(file);
    });
    e.target.value = '';
  };

  // Cloud & Firebase Auth state
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [cloudSyncStatus, setCloudSyncStatus] = useState<'idle' | 'syncing' | 'synced' | 'error'>('idle');
  const [cloudSyncMessage, setCloudSyncMessage] = useState<string>('');
  const [leaderboardPlayers, setLeaderboardPlayers] = useState<LeaderboardPlayer[]>(INITIAL_SANCTUM_LEADERBOARD);

  // Sound and Volume Settings
  const [musicVolume, setMusicVolume] = useState<number>(() => {
    const saved = localStorage.getItem('wizardchess_music_volume');
    return saved !== null ? Number(saved) : 60;
  });
  const [sfxVolume, setSfxVolumeState] = useState<number>(() => {
    const saved = localStorage.getItem('wizardchess_sfx_volume');
    return saved !== null ? Number(saved) : 80;
  });
  const [customCommanderAvatar, setCustomCommanderAvatar] = useState<string>(() => {
    return localStorage.getItem('wizardchess_commander_avatar') || '♔';
  });
  const [customProfilePhoto, setCustomProfilePhoto] = useState<string>(() => {
    return localStorage.getItem('wizardchess_custom_photo') || '';
  });
  const [customCommanderName, setCustomCommanderName] = useState<string>(() => {
    return localStorage.getItem('wizardchess_commander_name') || '';
  });
  const profileFileInputRef = useRef<HTMLInputElement | null>(null);

  // Rank Preview State
  const [previewRankTierId, setPreviewRankTierId] = useState<string | null>(null);

  // UI / HUD State
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [sfxEnabled, setSfxEnabled] = useState(true);
  const [lobbyMusicEnabled, setLobbyMusicEnabled] = useState(true);
  const [uiHidden, setUiHidden] = useState(false);
  const [hasStartedGame, setHasStartedGame] = useState(false);
  const [hudViewport, setHudViewport] = useState<{
    orientation: 'portrait' | 'landscape';
    aspectProfile: 'ultra-tall' | 'portrait' | 'square-fold' | 'standard-landscape' | 'ultrawide';
    isShortLandscape: boolean;
    fontScale: number;
    padScale: number;
  }>({
    orientation: 'landscape',
    aspectProfile: 'standard-landscape',
    isShortLandscape: false,
    fontScale: 1,
    padScale: 1
  });

  // Game Engine State Mirror
  const [gameMode, setGameMode] = useState<'single' | 'pass' | 'multi'>('single');
  const [botDifficulty, setBotDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [botSide, setBotSide] = useState<'w' | 'b'>('w');
  const [inCheck, setInCheck] = useState(false);
  const [checkedColor, setCheckedColor] = useState<'w' | 'b' | null>(null);

  // Bullet, Blitz & Rapid Time Control State
  const [timeControlCategory, setTimeControlCategory] = useState<TimeControlCategory>('blitz');
  const [timeControlPresetId, setTimeControlPresetId] = useState<TimeControlPresetId>('blitz_5');
  const [whiteClockSec, setWhiteClockSec] = useState<number>(300);
  const [blackClockSec, setBlackClockSec] = useState<number>(300);
  const [activeClockTurn, setActiveClockTurn] = useState<'w' | 'b'>('w');

  const handleSelectTimeControlCategory = (catId: TimeControlCategory) => {
    const catObj = TIME_CONTROL_CATEGORIES.find((c) => c.id === catId);
    if (!catObj) return;
    setTimeControlCategory(catObj.id);
    setTimeControlPresetId(catObj.defaultPresetId);
    const defaultPreset = catObj.presets.find((p) => p.id === catObj.defaultPresetId) || catObj.presets[0];
    setWhiteClockSec(defaultPreset.initialSeconds);
    setBlackClockSec(defaultPreset.initialSeconds);
    getEngine()?.setTimeControl?.(defaultPreset.id, true);
    getEngine()?.playLobbyClickSfx?.('card');
  };

  const handleSelectTimeControlPreset = (preset: TimeControlPresetOption) => {
    setTimeControlCategory(preset.category);
    setTimeControlPresetId(preset.id);
    setWhiteClockSec(preset.initialSeconds);
    setBlackClockSec(preset.initialSeconds);
    getEngine()?.setTimeControl?.(preset.id, true);
    getEngine()?.playLobbyClickSfx?.('equip');
  };

  // Pass-and-play local 2P state
  const [passAutoFlip, setPassAutoFlip] = useState(true);
  const [passPrivacyCurtain, setPassPrivacyCurtain] = useState(false);
  const [pendingTurnHandoff, setPendingTurnHandoff] = useState<string | null>(null);
  const [turnSwitchToast, setTurnSwitchToast] = useState<string | null>(null);

  // Online Matchmaking State
  const [onlineQueueStatus, setOnlineQueueStatus] = useState<'idle' | 'searching' | 'matched'>('idle');
  const [matchmakingRemainingSec, setMatchmakingRemainingSec] = useState(30);
  const [matchmakingRatingWindow, setMatchmakingRatingWindow] = useState(150);
  const [matchmakingQueueCount, setMatchmakingQueueCount] = useState(1);
  const [matchmakingTimedOut, setMatchmakingTimedOut] = useState(false);
  const [matchmakingPreferredColor, setMatchmakingPreferredColor] = useState<'w' | 'b' | 'any'>('any');
  const [onlinePreferredSide, setOnlinePreferredSide] = useState<'w' | 'b'>('w');
  const [activeRoomCode, setActiveRoomCode] = useState<string | null>(null);
  const [bothPlayersConnected, setBothPlayersConnected] = useState(false);
  const [onlineStatusText, setOnlineStatusText] = useState<string | null>(null);
  const [joinCodeInput, setJoinCodeInput] = useState('');
  const [onlineWhiteArmyName, setOnlineWhiteArmyName] = useState('Gothic Sanctum Warriors');
  const [onlineBlackArmyName, setOnlineBlackArmyName] = useState('Gothic Sanctum Warriors');

  // Bounties Toast
  const [bountyToast, setBountyToast] = useState<{ id: number; amount: number; label: string } | null>(null);

  // HUD Entrance Animation Epoch (triggers fade-in + slide-down whenever match starts / board becomes active)
  const [hudEntranceEpoch, setHudEntranceEpoch] = useState(0);
  useEffect(() => {
    if (activeDialog === 'none' && hasStartedGame) {
      setHudEntranceEpoch((prev) => prev + 1);
    }
  }, [activeDialog, hasStartedGame]);

  // Rank Progress Calculation
  const rankProgress = getPlayerRankProgress(economy.stats.wins);
  const displayedRankTier = previewRankTierId
    ? RANK_TIERS.find((t) => t.id === previewRankTierId) || rankProgress.currentTier
    : rankProgress.currentTier;
  const playerRating = 1000 + economy.stats.wins * 45;

  const equippedArchetypeObj =
    PIECE_ARCHETYPES.find((a) => a.id === economy.activePieceType) || PIECE_ARCHETYPES[0];
  const equippedPieceSkinObj =
    PIECE_SKINS.find((s) => s.id === economy.activePieceSkin) || PIECE_SKINS[0];
  const equippedBoardSkinObj =
    BOARD_SKINS.find((b) => b.id === economy.activeBoardSkin) || BOARD_SKINS[0];
  const equippedSceneryObj =
    WORLD_SCENERIES.find((w) => w.id === economy.activeScenery) || WORLD_SCENERIES[0];

  const showcaseArchetypeObj =
    PIECE_ARCHETYPES.find((a) => a.id === showcaseArchetypeId) || equippedArchetypeObj;
  const showcasePieceSkinObj =
    PIECE_SKINS.find((s) => s.id === showcasePieceSkinId) || equippedPieceSkinObj;
  const showcaseBoardSkinObj =
    BOARD_SKINS.find((b) => b.id === showcaseBoardSkinId) || equippedBoardSkinObj;
  const showcaseSceneryObj =
    WORLD_SCENERIES.find((w) => w.id === showcaseSceneryId) || equippedSceneryObj;

  function requestAppFullscreenPortrait() {
    try {
      const docEl = document.documentElement as any;
      if (!document.fullscreenElement) {
        if (docEl.requestFullscreen) {
          docEl.requestFullscreen().catch(() => {});
        } else if (docEl.webkitRequestFullscreen) {
          docEl.webkitRequestFullscreen();
        }
      }
    } catch (e) {}

    try {
      if (window.screen && (window.screen as any).orientation && (window.screen as any).orientation.lock) {
        (window.screen as any).orientation.lock('portrait-primary').catch(() => {
          (window.screen as any).orientation.lock('portrait').catch(() => {});
        });
      }
    } catch (e) {}
  }

  const handleMusicVolumeChange = (newVol: number) => {
    setMusicVolume(newVol);
    localStorage.setItem('wizardchess_music_volume', String(newVol));
    getEngine()?.setLobbyMusicVolume?.(newVol / 100);
  };

  const handleSfxVolumeChange = (newVol: number) => {
    setSfxVolumeState(newVol);
    localStorage.setItem('wizardchess_sfx_volume', String(newVol));
    getEngine()?.setSfxVolume?.(newVol / 100);
  };

  const handleSelectAvatar = (glyph: string) => {
    setCustomCommanderAvatar(glyph);
    localStorage.setItem('wizardchess_commander_avatar', glyph);
    getEngine()?.playLobbyClickSfx?.('card');
  };

  const handleProfilePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = async () => {
        const canvas = document.createElement('canvas');
        const maxDim = 256;
        let w = img.width;
        let h = img.height;
        if (w > h) {
          if (w > maxDim) {
            h = Math.round((h * maxDim) / w);
            w = maxDim;
          }
        } else if (h > maxDim) {
          w = Math.round((w * maxDim) / h);
          h = maxDim;
        }
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, w, h);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.84);
          setCustomProfilePhoto(dataUrl);
          localStorage.setItem('wizardchess_custom_photo', dataUrl);
          getEngine()?.playLobbyClickSfx?.('unlock');
          if (currentUser) {
            try {
              await saveUserDataToCloud(
                currentUser,
                economy,
                playerRating,
                rankProgress.currentTier.id,
                rankProgress.currentTier.numeral,
                dataUrl
              );
              setCloudSyncStatus('synced');
              setCloudSyncMessage('Custom profile photo saved & synced!');
            } catch {}
          }
        }
      };
      if (typeof reader.result === 'string') {
        img.src = reader.result;
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleRemoveCustomPhoto = async () => {
    setCustomProfilePhoto('');
    localStorage.removeItem('wizardchess_custom_photo');
    getEngine()?.playLobbyClickSfx?.('close');
    if (currentUser) {
      try {
        await saveUserDataToCloud(
          currentUser,
          economy,
          playerRating,
          rankProgress.currentTier.id,
          rankProgress.currentTier.numeral,
          ''
        );
      } catch {}
    }
  };

  const handleCommanderNameChange = (val: string) => {
    const trimmed = val.slice(0, 26);
    setCustomCommanderName(trimmed);
    localStorage.setItem('wizardchess_commander_name', trimmed);
  };

  // Subscribe to Firebase Auth and Firestore Cloud Sync
  useEffect(() => {
    const unsubAuth = subscribeToAuth(async (user) => {
      setCurrentUser(user);
      if (user) {
        setCloudSyncStatus('syncing');
        setCloudSyncMessage(`Connected: ${user.displayName || user.email}`);
        try {
          const cloudData = await loadUserDataFromCloud(user.uid);
          if (cloudData) {
            setEconomy((prev) => {
              const merged: EconomyState = {
                gold: Math.max(prev.gold, cloudData.gold || 0),
                ownedPieceTypes: Array.from(
                  new Set([...prev.ownedPieceTypes, ...(cloudData.ownedPieceTypes || [])])
                ),
                activePieceType: cloudData.activePieceType || prev.activePieceType,
                ownedPieceSkins: Array.from(
                  new Set([...prev.ownedPieceSkins, ...(cloudData.ownedPieceSkins || [])])
                ),
                activePieceSkin: cloudData.activePieceSkin || prev.activePieceSkin,
                ownedBoardSkins: Array.from(
                  new Set([...prev.ownedBoardSkins, ...(cloudData.ownedBoardSkins || [])])
                ),
                activeBoardSkin: cloudData.activeBoardSkin || prev.activeBoardSkin,
                ownedSceneries: Array.from(
                  new Set([...prev.ownedSceneries, ...(cloudData.ownedSceneries || [])])
                ),
                activeScenery: cloudData.activeScenery || prev.activeScenery,
                stats: {
                  wins: Math.max(prev.stats.wins, cloudData.wins || 0),
                  captures: Math.max(prev.stats.captures, cloudData.captures || 0),
                  totalGoldEarned: Math.max(prev.stats.totalGoldEarned, cloudData.totalGoldEarned || 0)
                }
              };
              saveEconomyState(merged);
              return merged;
            });
            if (cloudData.photoURL && !localStorage.getItem('wizardchess_custom_photo')) {
              setCustomProfilePhoto(cloudData.photoURL);
            }
            if (cloudData.displayName && !localStorage.getItem('wizardchess_commander_name')) {
              setCustomCommanderName(cloudData.displayName);
            }
            setCloudSyncStatus('synced');
            setCloudSyncMessage('Cloud save restored & synced.');
          } else {
            // First time cloud user: upload local progress to Firestore
            await saveUserDataToCloud(
              user,
              economy,
              playerRating,
              rankProgress.currentTier.id,
              rankProgress.currentTier.numeral
            );
            setCloudSyncStatus('synced');
            setCloudSyncMessage('Local progress backed up to Cloud.');
          }
        } catch (err) {
          console.warn('Cloud sync error:', err);
          setCloudSyncStatus('error');
          setCloudSyncMessage('Could not sync cloud data.');
        }
      } else {
        setCloudSyncStatus('idle');
        setCloudSyncMessage('');
      }
    });

    const unsubLb = subscribeToLeaderboard((liveList) => {
      if (liveList && liveList.length > 0) {
        setLeaderboardPlayers(liveList);
      }
    });

    return () => {
      unsubAuth();
      unsubLb();
    };
  }, []);

  const handleGoogleLogin = async () => {
    try {
      getEngine()?.playLobbyClickSfx?.('unlock');
      setCloudSyncStatus('syncing');
      setCloudSyncMessage('Connecting to Google...');
      const user = await loginWithGoogle();
      if (user) {
        setCurrentUser(user);
        await saveUserDataToCloud(
          user,
          economy,
          playerRating,
          rankProgress.currentTier.id,
          rankProgress.currentTier.numeral
        );
        setCloudSyncStatus('synced');
        setCloudSyncMessage(`Signed in as ${user.displayName || user.email}`);
      }
    } catch (err) {
      console.warn('Google sign-in error:', err);
      setCloudSyncStatus('error');
      setCloudSyncMessage('Google sign-in cancelled or failed.');
    }
  };

  const handleGoogleLogout = async () => {
    try {
      getEngine()?.playLobbyClickSfx?.('close');
      await logoutUser();
      setCurrentUser(null);
      setCloudSyncStatus('idle');
      setCloudSyncMessage('Signed out.');
    } catch (err) {
      console.warn('Sign out error:', err);
    }
  };

  const handleManualCloudSync = async () => {
    if (!currentUser) {
      handleGoogleLogin();
      return;
    }
    setCloudSyncStatus('syncing');
    setCloudSyncMessage('Uploading latest match spoils & inventory...');
    try {
      await saveUserDataToCloud(
        currentUser,
        economy,
        playerRating,
        rankProgress.currentTier.id,
        rankProgress.currentTier.numeral
      );
      setCloudSyncStatus('synced');
      setCloudSyncMessage('All progress backed up to Google Cloud!');
      getEngine()?.playLobbyClickSfx?.('unlock');
    } catch {
      setCloudSyncStatus('error');
      setCloudSyncMessage('Cloud sync failed.');
    }
  };

  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;
    initWizardChess();
  }, []);

  // Dynamic HUD Font Scaling & Adaptive Padding Engine for Orientation Changes and Non-Standard Aspect Ratios
  useEffect(() => {
    let rafId = 0;

    const updateHudResponsiveMetrics = () => {
      const vv = window.visualViewport;
      const vw = Math.max(280, Math.round(vv ? vv.width : window.innerWidth));
      const vh = Math.max(240, Math.round(vv ? vv.height : window.innerHeight));
      const aspect = vw / vh;
      const shortSide = Math.min(vw, vh);
      const longSide = Math.max(vw, vh);
      const orientation: 'portrait' | 'landscape' = vw >= vh ? 'landscape' : 'portrait';
      const isShortLandscape = orientation === 'landscape' && vh <= 520;

      let aspectProfile: 'ultra-tall' | 'portrait' | 'square-fold' | 'standard-landscape' | 'ultrawide';
      if (aspect < 0.52) {
        aspectProfile = 'ultra-tall';
      } else if (aspect < 0.85) {
        aspectProfile = 'portrait';
      } else if (aspect <= 1.18) {
        aspectProfile = 'square-fold';
      } else if (aspect <= 2.05) {
        aspectProfile = 'standard-landscape';
      } else {
        aspectProfile = 'ultrawide';
      }

      // Compute continuous dynamic font scale based on shortest edge, longest edge, and aspect ratio
      let fontScale = 1.0;
      let padScale = 1.0;
      let edgeX = 12;
      let edgeY = 10;

      if (aspectProfile === 'ultra-tall') {
        // 21:9 / 20:9 narrow portrait phones or split-screen columns
        fontScale = Math.min(0.92, Math.max(0.78, vw / 410));
        padScale = Math.min(0.88, Math.max(0.72, vw / 430));
        edgeX = Math.max(6, Math.round(vw * 0.02));
        edgeY = Math.max(8, Math.round(vh * 0.012));
      } else if (aspectProfile === 'portrait') {
        // Standard portrait phones and tablets
        fontScale = Math.min(1.06, Math.max(0.84, vw / 440));
        padScale = Math.min(1.04, Math.max(0.80, vw / 460));
        edgeX = Math.max(8, Math.min(18, Math.round(vw * 0.026)));
        edgeY = Math.max(8, Math.min(16, Math.round(vh * 0.014)));
      } else if (aspectProfile === 'square-fold') {
        // Square viewports, foldable unfolded inner screens, or 4:3 split windows
        fontScale = Math.min(1.08, Math.max(0.88, shortSide / 680));
        padScale = Math.min(1.06, Math.max(0.84, shortSide / 700));
        edgeX = Math.max(10, Math.min(20, Math.round(vw * 0.022)));
        edgeY = Math.max(8, Math.min(16, Math.round(vh * 0.018)));
      } else if (aspectProfile === 'ultrawide') {
        // 21:9 / 32:9 ultrawide desktop monitors OR ultra-wide landscape phones
        if (isShortLandscape) {
          fontScale = Math.min(0.94, Math.max(0.80, vh / 440));
          padScale = Math.min(0.86, Math.max(0.70, vh / 460));
          edgeX = Math.max(16, Math.min(36, Math.round(vw * 0.032)));
          edgeY = Math.max(5, Math.min(10, Math.round(vh * 0.018)));
        } else {
          fontScale = Math.min(1.22, Math.max(1.02, vh / 900));
          padScale = Math.min(1.25, Math.max(1.04, vh / 880));
          edgeX = Math.max(24, Math.min(72, Math.round((vw - Math.min(vw, 1680)) * 0.35 + 24)));
          edgeY = Math.max(14, Math.min(24, Math.round(vh * 0.018)));
        }
      } else {
        // Standard landscape (16:9, 16:10, 4:3)
        if (isShortLandscape) {
          fontScale = Math.min(0.95, Math.max(0.82, vh / 450));
          padScale = Math.min(0.88, Math.max(0.72, vh / 470));
          edgeX = Math.max(12, Math.min(24, Math.round(vw * 0.024)));
          edgeY = Math.max(5, Math.min(10, Math.round(vh * 0.018)));
        } else {
          const base = Math.sqrt(shortSide * longSide);
          fontScale = Math.min(1.16, Math.max(0.92, base / 1060));
          padScale = Math.min(1.18, Math.max(0.90, base / 1080));
          edgeX = Math.max(12, Math.min(28, Math.round(vw * 0.016)));
          edgeY = Math.max(10, Math.min(20, Math.round(vh * 0.016)));
        }
      }

      const controlH = Math.round(Math.min(42, Math.max(33, 36 * padScale)));
      const gapPx = Math.round(Math.min(14, Math.max(8, 10 * padScale)));

      const docEl = document.documentElement;
      docEl.dataset.orientation = orientation;
      docEl.dataset.aspectProfile = aspectProfile;
      docEl.dataset.shortLandscape = isShortLandscape ? 'true' : 'false';
      docEl.style.setProperty('--hud-font-scale', fontScale.toFixed(3));
      docEl.style.setProperty('--hud-pad-scale', padScale.toFixed(3));
      docEl.style.setProperty('--hud-edge-x', `${edgeX}px`);
      docEl.style.setProperty('--hud-edge-y', `${edgeY}px`);
      docEl.style.setProperty('--hud-control-h', `${controlH}px`);
      docEl.style.setProperty('--hud-gap', `${gapPx}px`);
      docEl.style.setProperty('--hud-aspect-ratio', aspect.toFixed(3));

      setHudViewport((prev) => {
        if (
          prev.orientation === orientation &&
          prev.aspectProfile === aspectProfile &&
          prev.isShortLandscape === isShortLandscape &&
          Math.abs(prev.fontScale - fontScale) < 0.02 &&
          Math.abs(prev.padScale - padScale) < 0.02
        ) {
          return prev;
        }
        return {
          orientation,
          aspectProfile,
          isShortLandscape,
          fontScale: Number(fontScale.toFixed(2)),
          padScale: Number(padScale.toFixed(2))
        };
      });
    };

    const scheduleUpdate = () => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(updateHudResponsiveMetrics);
    };

    updateHudResponsiveMetrics();
    window.addEventListener('resize', scheduleUpdate, { passive: true });
    window.addEventListener('orientationchange', scheduleUpdate, { passive: true });
    window.visualViewport?.addEventListener('resize', scheduleUpdate, { passive: true });
    const screenOrientation = (window.screen as Screen & { orientation?: ScreenOrientation })?.orientation;
    screenOrientation?.addEventListener?.('change', scheduleUpdate);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', scheduleUpdate);
      window.removeEventListener('orientationchange', scheduleUpdate);
      window.visualViewport?.removeEventListener('resize', scheduleUpdate);
      screenOrientation?.removeEventListener?.('change', scheduleUpdate);
    };
  }, []);

  // Apply saved piece archetype, piece material skin, 3D board style & 3D world scenery when engine is ready or when equipped items change
  useEffect(() => {
    const applyEquippedSkins = () => {
      const eng = getEngine();
      if (!eng) return;
      const pArch = PIECE_ARCHETYPES.find((a) => a.id === economy.activePieceType) || PIECE_ARCHETYPES[0];
      const pSkin = PIECE_SKINS.find((s) => s.id === economy.activePieceSkin) || PIECE_SKINS[0];
      const bSkin = BOARD_SKINS.find((s) => s.id === economy.activeBoardSkin) || BOARD_SKINS[0];
      const wScenery =
        WORLD_SCENERIES.find((w) => w.id === economy.activeScenery) || WORLD_SCENERIES[0];
      eng.applyPieceSkin?.(pSkin);
      eng.applyPieceArchetype?.(pArch);
      eng.applyBoardSkin?.(bSkin);
      eng.applyWorldScenery?.(wScenery);
    };

    applyEquippedSkins();
    window.addEventListener('wizardchess:ready', applyEquippedSkins);
    return () => window.removeEventListener('wizardchess:ready', applyEquippedSkins);
  }, [economy.activePieceType, economy.activePieceSkin, economy.activeBoardSkin, economy.activeScenery]);

  // Sync Lobby Music active state & Pause Background 3D Game whenever in Lobby
  useEffect(() => {
    const isLobbyOpen = activeDialog !== 'none' || !hasStartedGame;
    if (activeDialog !== 'none') {
      setMobileSheetOpen(false);
    }
    const syncLobbyState = () => {
      const eng = getEngine();
      eng?.setLobbyMusicActive?.(isLobbyOpen);
      eng?.setLobbyPaused?.(isLobbyOpen);
    };
    syncLobbyState();
    window.addEventListener('wizardchess:ready', syncLobbyState);
    return () => window.removeEventListener('wizardchess:ready', syncLobbyState);
  }, [activeDialog, hasStartedGame]);

  // Delegated Mixkit UI Click SFX for all Lobby, Armory, and HUD controls
  useEffect(() => {
    const handleGlobalUiClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      const interactive = target.closest(
        'button, [role="tab"], .pass-toggle-row, .loadout-ledger-slot, .difficulty-card, .side-picker-btn'
      ) as HTMLElement | null;
      if (!interactive) return;
      if ((interactive as HTMLButtonElement).disabled) return;

      // Skip skin-action-btn because handleSelectOrBuy* triggers dedicated 'unlock' or 'equip' Mixkit SFX
      if (interactive.classList.contains('skin-action-btn')) return;

      const eng = getEngine();
      if (!eng?.playLobbyClickSfx) return;

      if (interactive.classList.contains('arena-primary-btn')) {
        eng.playLobbyClickSfx('start');
      } else if (interactive.classList.contains('sanctum-tab-btn') || interactive.getAttribute('role') === 'tab') {
        eng.playLobbyClickSfx('tab');
      } else if (
        interactive.classList.contains('difficulty-card') ||
        interactive.classList.contains('side-picker-btn') ||
        interactive.classList.contains('loadout-ledger-slot') ||
        interactive.classList.contains('matchmaking-pref-btn')
      ) {
        eng.playLobbyClickSfx('card');
      } else if (interactive.classList.contains('sanctum-modal-close') && !interactive.classList.contains('gold-trim')) {
        eng.playLobbyClickSfx('close');
      } else {
        eng.playLobbyClickSfx('default');
      }
    };

    document.addEventListener('click', handleGlobalUiClick, true);
    return () => document.removeEventListener('click', handleGlobalUiClick, true);
  }, []);

  // Listen to engine events for Gold bounties, Matchmaking, and 1-Phone Turn Switching
  useEffect(() => {
    const showRewardToast = (amount: number, label: string) => {
      setBountyToast({ id: Date.now(), amount, label });
    };

    const handlePieceCaptured = (ev: Event) => {
      const detail = (ev as CustomEvent).detail;
      if (!detail) return;
      const cType = String(detail.capturedType || 'pawn').toLowerCase();
      const typeName = cType.charAt(0).toUpperCase() + cType.slice(1);
      const killTitle = detail.killTitle ? `${detail.killTitle} · ` : '';

      if (!detail.isHumanCapture) {
        showRewardToast(0, `${killTitle}Your ${typeName} Shattered!`);
        return;
      }

      const goldEarned = PIECE_GOLD_BOUNTY[cType] || 20;

      setEconomy((prev) => {
        const next: EconomyState = {
          ...prev,
          gold: prev.gold + goldEarned,
          stats: {
            ...prev.stats,
            captures: prev.stats.captures + 1,
            totalGoldEarned: prev.stats.totalGoldEarned + goldEarned
          }
        };
        saveEconomyState(next);
        return next;
      });

      showRewardToast(goldEarned, `${killTitle}${typeName} Destroyed!`);
    };

    const handleMatchWon = (ev: Event) => {
      const detail = (ev as CustomEvent).detail;
      if (!detail || !detail.isHumanWin) return;
      const mode = detail.gameMode;
      const diff = detail.botDifficulty || 'medium';
      let winGold = 200;
      let winLabel = 'Checkmate Victory!';

      if (mode === 'single') {
        winGold = MATCH_WIN_BOUNTY[`bot_${diff}`] || 225;
        winLabel = `Defeated ${diff.toUpperCase()} Bot!`;
      } else if (mode === 'pass') {
        winGold = MATCH_WIN_BOUNTY.pass;
        const winnerName = detail.winnerColor === 'w' ? 'P1 (White)' : 'P2 (Black)';
        winLabel = `${winnerName} Wins Match!`;
      } else if (mode === 'multi') {
        winGold = MATCH_WIN_BOUNTY.multi;
        winLabel = 'Online PvP Victory!';
      }

      setEconomy((prev) => {
        const next: EconomyState = {
          ...prev,
          gold: prev.gold + winGold,
          stats: {
            ...prev.stats,
            wins: prev.stats.wins + 1,
            totalGoldEarned: prev.stats.totalGoldEarned + winGold
          }
        };
        saveEconomyState(next);
        return next;
      });

      showRewardToast(winGold, winLabel);
    };

    const handleStateChange = (ev: Event) => {
      const d = (ev as CustomEvent).detail;
      if (!d) return;
      if (typeof d.matchStarted === 'boolean') {
        setHasStartedGame(d.matchStarted);
      }
      setGameMode(d.gameMode || 'single');
      setBotDifficulty(d.botDifficulty || 'medium');
      setOnlineQueueStatus(d.onlineQueueStatus || 'idle');
      setActiveRoomCode(d.roomCode || null);
      setInCheck(Boolean(d.inCheck));
      setCheckedColor(d.checkedColor || null);
      if (d.currentTurn === 'w' || d.currentTurn === 'b') {
        setActiveClockTurn(d.currentTurn);
      }
      if (d.timeControlCategory) {
        setTimeControlCategory(d.timeControlCategory);
      }
      if (d.timeControlPresetId) {
        setTimeControlPresetId(d.timeControlPresetId);
      }
      if (typeof d.whiteTimeRemaining === 'number') {
        setWhiteClockSec(d.whiteTimeRemaining);
      }
      if (typeof d.blackTimeRemaining === 'number') {
        setBlackClockSec(d.blackTimeRemaining);
      }
    };

    const handleClockTick = (ev: Event) => {
      const d = (ev as CustomEvent).detail;
      if (!d) return;
      if (typeof d.whiteTimeRemaining === 'number') {
        setWhiteClockSec(d.whiteTimeRemaining);
      }
      if (typeof d.blackTimeRemaining === 'number') {
        setBlackClockSec(d.blackTimeRemaining);
      }
      if (d.currentTurn === 'w' || d.currentTurn === 'b') {
        setActiveClockTurn(d.currentTurn);
      }
      if (d.timeControlCategory) {
        setTimeControlCategory(d.timeControlCategory);
      }
      if (d.timeControlPresetId) {
        setTimeControlPresetId(d.timeControlPresetId);
      }
    };

    const handleUiChange = (ev: Event) => {
      const d = (ev as CustomEvent).detail;
      if (d && typeof d.uiHidden === 'boolean') {
        setUiHidden(d.uiHidden);
        if (d.uiHidden) setMobileSheetOpen(false);
      }
    };

    const handleVoiceChange = (ev: Event) => {
      const d = (ev as CustomEvent).detail;
      if (d && typeof d.voiceEnabled === 'boolean') {
        setVoiceEnabled(d.voiceEnabled);
      }
    };

    const handleSfxChange = (ev: Event) => {
      const d = (ev as CustomEvent).detail;
      if (d && typeof d.sfxEnabled === 'boolean') {
        setSfxEnabled(d.sfxEnabled);
      }
    };

    const handleMusicChange = (ev: Event) => {
      const d = (ev as CustomEvent).detail;
      if (d && typeof d.lobbyMusicEnabled === 'boolean') {
        setLobbyMusicEnabled(d.lobbyMusicEnabled);
      }
    };

    const resolveLoadoutLabel = (loadout: Record<string, unknown> | null | undefined) => {
      if (!loadout) return '';
      const archId = typeof loadout.pieceType === 'string' ? loadout.pieceType : '';
      const archObj = PIECE_ARCHETYPES.find((a) => a.id === archId);
      const archName =
        (typeof loadout.pieceTypeName === 'string' && loadout.pieceTypeName) ||
        archObj?.name ||
        'Gothic Sanctum Warriors';
      const skinName =
        (typeof loadout.pieceSkinName === 'string' && loadout.pieceSkinName) || '';
      return skinName ? `${archName} (${skinName})` : archName;
    };

    const handleMatchFound = (ev: Event) => {
      const d = (ev as CustomEvent).detail;
      if (!d) return;
      setHasStartedGame(true);
      setOnlineQueueStatus('matched');
      setMatchmakingTimedOut(false);
      setActiveRoomCode(d.code || null);
      setBothPlayersConnected(true);
      const wLabel = resolveLoadoutLabel(d.room?.whiteLoadout);
      const bLabel = resolveLoadoutLabel(d.room?.blackLoadout);
      if (wLabel) setOnlineWhiteArmyName(wLabel);
      if (bLabel) setOnlineBlackArmyName(bLabel);
      const oppRatingText = d.opponentRating ? ` (${d.opponentRating} ELO)` : '';
      setOnlineStatusText(
        `Matched with Suitable Challenger${oppRatingText}! Playing as ${d.color === 'b' ? 'Black' : 'White'} in Room ${d.code}`
      );
      setActiveDialog('none');
    };

    const handleMatchmakingTick = (ev: Event) => {
      const d = (ev as CustomEvent).detail;
      if (!d) return;
      if (typeof d.remainingSec === 'number') {
        setMatchmakingRemainingSec(d.remainingSec);
      }
      if (typeof d.ratingWindow === 'number') {
        setMatchmakingRatingWindow(d.ratingWindow);
      }
      if (typeof d.queueSize === 'number') {
        setMatchmakingQueueCount(Math.max(1, d.queueSize));
      }
    };

    const handleMatchmakingTimeout = () => {
      setOnlineQueueStatus('idle');
      setMatchmakingRemainingSec(30);
      setMatchmakingTimedOut(true);
      setOnlineStatusText(
        'No suitable online player found within 30 seconds — Matchmaking automatically cancelled.'
      );
    };

    const handleRoomUpdate = (ev: Event) => {
      const d = (ev as CustomEvent).detail;
      if (!d) return;
      setActiveRoomCode(d.code || null);
      setBothPlayersConnected(Boolean(d.bothReady));
      const wLabel = resolveLoadoutLabel(d.room?.whiteLoadout);
      const bLabel = resolveLoadoutLabel(d.room?.blackLoadout);
      if (wLabel) setOnlineWhiteArmyName(wLabel);
      if (bLabel) setOnlineBlackArmyName(bLabel);
      setOnlineStatusText(
        d.bothReady
          ? `Opponent Connected! Room ${d.code} Live`
          : `Room ${d.code} Created — Waiting for Opponent...`
      );
      if (d.bothReady) {
        setHasStartedGame(true);
        setActiveDialog('none');
      }
    };

    const handleTurnSwitch = (ev: Event) => {
      const d = (ev as CustomEvent).detail;
      if (!d) return;
      if (passPrivacyCurtain) {
        setPendingTurnHandoff(d.playerLabel || 'Next Player');
      } else {
        setTurnSwitchToast(`${d.playerLabel} to Move • Camera Switched`);
      }
    };

    window.addEventListener('wizardchess:piececaptured', handlePieceCaptured);
    window.addEventListener('wizardchess:matchwon', handleMatchWon);
    window.addEventListener('wizardchess:statechange', handleStateChange);
    window.addEventListener('wizardchess:clocktick', handleClockTick);
    window.addEventListener('wizardchess:uichange', handleUiChange);
    window.addEventListener('wizardchess:voicechange', handleVoiceChange);
    window.addEventListener('wizardchess:sfxchange', handleSfxChange);
    window.addEventListener('wizardchess:musicchange', handleMusicChange);
    window.addEventListener('wizardchess:matchfound', handleMatchFound);
    window.addEventListener('wizardchess:matchmakingtick', handleMatchmakingTick);
    window.addEventListener('wizardchess:matchmakingtimeout', handleMatchmakingTimeout);
    window.addEventListener('wizardchess:roomupdate', handleRoomUpdate);
    window.addEventListener('wizardchess:turnswitch', handleTurnSwitch);

    return () => {
      window.removeEventListener('wizardchess:piececaptured', handlePieceCaptured);
      window.removeEventListener('wizardchess:matchwon', handleMatchWon);
      window.removeEventListener('wizardchess:statechange', handleStateChange);
      window.removeEventListener('wizardchess:clocktick', handleClockTick);
      window.removeEventListener('wizardchess:uichange', handleUiChange);
      window.removeEventListener('wizardchess:voicechange', handleVoiceChange);
      window.removeEventListener('wizardchess:sfxchange', handleSfxChange);
      window.removeEventListener('wizardchess:musicchange', handleMusicChange);
      window.removeEventListener('wizardchess:matchfound', handleMatchFound);
      window.removeEventListener('wizardchess:matchmakingtick', handleMatchmakingTick);
      window.removeEventListener('wizardchess:matchmakingtimeout', handleMatchmakingTimeout);
      window.removeEventListener('wizardchess:roomupdate', handleRoomUpdate);
      window.removeEventListener('wizardchess:turnswitch', handleTurnSwitch);
    };
  }, [passPrivacyCurtain]);

  // Auto-clear transient toasts
  useEffect(() => {
    if (!bountyToast) return;
    const t = setTimeout(() => setBountyToast(null), 3200);
    return () => clearTimeout(t);
  }, [bountyToast]);

  useEffect(() => {
    if (!turnSwitchToast) return;
    const t = setTimeout(() => setTurnSwitchToast(null), 2400);
    return () => clearTimeout(t);
  }, [turnSwitchToast]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMobileSheetOpen(false);
        setActiveDialog((prev) => {
          if (!hasStartedGame) {
            return prev === 'armory' ? 'arena' : 'arena';
          }
          return 'none';
        });
      }
    };
    const handleResize = () => {
      if (window.innerWidth > 1220 && window.innerHeight > 600) {
        setMobileSheetOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('resize', handleResize);
    };
  }, [hasStartedGame]);

  const handleRestoreUI = () => {
    const eng = getEngine();
    if (eng?.toggleUI) {
      eng.toggleUI(false);
    }
    document.body.classList.remove('cinematic-ui-hidden');
    setUiHidden(false);
    const btnHide = document.getElementById('btn-hide-ui');
    if (btnHide) btnHide.textContent = 'Hide UI [H]';
  };

  const handleToggleVoiceAnnouncer = () => {
    const next = !voiceEnabled;
    setVoiceEnabled(next);
    const eng = getEngine();
    if (eng?.setVoiceAnnouncerEnabled) {
      eng.setVoiceAnnouncerEnabled(next);
    }
  };

  const handleToggleSfx = () => {
    const next = !sfxEnabled;
    setSfxEnabled(next);
    const eng = getEngine();
    if (eng?.setSfxEnabled) {
      eng.setSfxEnabled(next);
    }
  };

  const handleToggleLobbyMusic = () => {
    const next = !lobbyMusicEnabled;
    setLobbyMusicEnabled(next);
    const eng = getEngine();
    eng?.setLobbyMusicEnabled?.(next);
  };

  // --- Arena Mode Actions ---
  const handleStartBotGame = () => {
    requestAppFullscreenPortrait();
    const eng = getEngine();
    eng?.startBotMatch?.(botDifficulty, botSide, timeControlPresetId);
    setHasStartedGame(true);
    setGameMode('single');
    setActiveDialog('none');
    setMobileSheetOpen(false);
  };

  const handleStartPassGame = () => {
    requestAppFullscreenPortrait();
    const eng = getEngine();
    eng?.startPassAndPlayMatch?.(passAutoFlip, timeControlPresetId);
    setHasStartedGame(true);
    setGameMode('pass');
    setActiveDialog('none');
    setMobileSheetOpen(false);
  };

  const handleQuickMatchmaking = async () => {
    requestAppFullscreenPortrait();
    const eng = getEngine();
    eng?.setTimeControl?.(timeControlPresetId, true);
    setMatchmakingTimedOut(false);
    setMatchmakingRemainingSec(30);
    setMatchmakingRatingWindow(150);
    setOnlineStatusText(
      `Searching for suitable online challenger near ${playerRating} ELO (30s timeout)...`
    );
    setOnlineQueueStatus('searching');
    await eng?.startOnlineMatchmaking?.(matchmakingPreferredColor, playerRating);
  };

  const handleCancelMatchmaking = async () => {
    const eng = getEngine();
    await eng?.cancelOnlineMatchmaking?.('user');
    setOnlineQueueStatus('idle');
    setMatchmakingRemainingSec(30);
    setMatchmakingTimedOut(false);
    setOnlineStatusText('Matchmaking search cancelled.');
  };

  const handleCreatePrivateRoom = async () => {
    const eng = getEngine();
    setOnlineStatusText('Creating private room...');
    const res = await eng?.createMultiplayerRoom?.(onlinePreferredSide);
    if (res?.code) {
      setActiveRoomCode(res.code);
      setBothPlayersConnected(false);
      setOnlineStatusText(`Room ${res.code} created! Share this code with Player 2.`);
    }
  };

  const handleJoinPrivateRoom = async () => {
    const code = joinCodeInput.trim().toUpperCase();
    if (!code) {
      setOnlineStatusText('Enter a valid 4-character Room Code.');
      return;
    }
    const eng = getEngine();
    const ok = await eng?.joinMultiplayerRoom?.(code);
    if (ok) {
      setHasStartedGame(true);
      setActiveRoomCode(code);
      setActiveDialog('none');
      setMobileSheetOpen(false);
    }
  };

  const handleCopyRoomCode = () => {
    if (!activeRoomCode) return;
    navigator.clipboard?.writeText(activeRoomCode);
    setOnlineStatusText(`Copied Room Code ${activeRoomCode}!`);
  };

  const handleCopyInviteLink = () => {
    if (!activeRoomCode) return;
    const url = `${window.location.origin}${window.location.pathname}?room=${activeRoomCode}`;
    navigator.clipboard?.writeText(url);
    setOnlineStatusText('Copied Room Invite Link!');
  };

  // --- Skin Armory Actions ---
  const handleInspectInShowcase = (
    category: 'types' | 'pieces' | 'boards' | 'sceneries',
    itemId: string
  ) => {
    setArmoryTab(category);
    setArmoryPreviewCollapsed(false);
    if (category === 'types') {
      setShowcaseArchetypeId(itemId);
      setPoliigonTargetSlot('pieces');
      setTimeout(() => setShowcaseAttackNonce((n) => n + 1), 90);
    } else if (category === 'pieces') {
      setShowcasePieceSkinId(itemId);
      setPoliigonTargetSlot('pieces');
    } else if (category === 'boards') {
      setShowcaseBoardSkinId(itemId);
      if (poliigonTargetSlot !== 'table' && poliigonTargetSlot !== 'board') {
        setPoliigonTargetSlot('table');
      }
    } else if (category === 'sceneries') {
      setShowcaseSceneryId(itemId);
    }

    getEngine()?.playLobbyClickSfx?.('equip');
  };

  const handleSelectOrBuyPieceType = (typeId: string) => {
    const arch = PIECE_ARCHETYPES.find((a) => a.id === typeId);
    if (!arch) return;
    setShowcaseArchetypeId(arch.id);

    const isOwned = economy.ownedPieceTypes.includes(arch.id);
    if (isOwned) {
      const next: EconomyState = { ...economy, activePieceType: arch.id };
      setEconomy(next);
      saveEconomyState(next);
      getEngine()?.playLobbyClickSfx?.('equip');
      getEngine()?.applyPieceArchetype?.(arch);
      return;
    }

    if (economy.gold < arch.price) return;

    const next: EconomyState = {
      ...economy,
      gold: economy.gold - arch.price,
      ownedPieceTypes: [...economy.ownedPieceTypes, arch.id],
      activePieceType: arch.id
    };
    setEconomy(next);
    saveEconomyState(next);
    getEngine()?.playLobbyClickSfx?.('unlock');
    getEngine()?.applyPieceArchetype?.(arch);
  };

  const handleSelectOrBuyPieceSkin = (skinId: string) => {
    const skin = PIECE_SKINS.find((s) => s.id === skinId);
    if (!skin) return;
    setShowcasePieceSkinId(skin.id);

    const isOwned = economy.ownedPieceSkins.includes(skin.id);
    if (isOwned) {
      const next: EconomyState = { ...economy, activePieceSkin: skin.id };
      setEconomy(next);
      saveEconomyState(next);
      getEngine()?.playLobbyClickSfx?.('equip');
      getEngine()?.applyPieceSkin?.(skin);
      return;
    }

    if (economy.gold < skin.price) return;

    const next: EconomyState = {
      ...economy,
      gold: economy.gold - skin.price,
      ownedPieceSkins: [...economy.ownedPieceSkins, skin.id],
      activePieceSkin: skin.id
    };
    setEconomy(next);
    saveEconomyState(next);
    getEngine()?.playLobbyClickSfx?.('unlock');
    getEngine()?.applyPieceSkin?.(skin);
  };

  const handleSelectOrBuyBoardSkin = (skinId: string) => {
    const skin = BOARD_SKINS.find((s) => s.id === skinId);
    if (!skin) return;
    setShowcaseBoardSkinId(skin.id);

    const isOwned = economy.ownedBoardSkins.includes(skin.id);
    if (isOwned) {
      const next: EconomyState = { ...economy, activeBoardSkin: skin.id };
      setEconomy(next);
      saveEconomyState(next);
      getEngine()?.playLobbyClickSfx?.('equip');
      getEngine()?.applyBoardSkin?.(skin);
      return;
    }

    if (economy.gold < skin.price) return;

    const next: EconomyState = {
      ...economy,
      gold: economy.gold - skin.price,
      ownedBoardSkins: [...economy.ownedBoardSkins, skin.id],
      activeBoardSkin: skin.id
    };
    setEconomy(next);
    saveEconomyState(next);
    getEngine()?.playLobbyClickSfx?.('unlock');
    getEngine()?.applyBoardSkin?.(skin);
  };

  const handleSelectOrBuyWorldScenery = (sceneryId: string, flyToVista = true) => {
    const scenery = WORLD_SCENERIES.find((w) => w.id === sceneryId);
    if (!scenery) return;
    setShowcaseSceneryId(scenery.id);

    const isOwned = economy.ownedSceneries.includes(scenery.id);
    if (isOwned) {
      const next: EconomyState = { ...economy, activeScenery: scenery.id };
      setEconomy(next);
      saveEconomyState(next);
      getEngine()?.playLobbyClickSfx?.('equip');
      getEngine()?.applyWorldScenery?.(scenery, { flyToVista });
      return;
    }

    if (economy.gold < scenery.price) return;

    const next: EconomyState = {
      ...economy,
      gold: economy.gold - scenery.price,
      ownedSceneries: [...economy.ownedSceneries, scenery.id],
      activeScenery: scenery.id
    };
    setEconomy(next);
    saveEconomyState(next);
    getEngine()?.playLobbyClickSfx?.('unlock');
    getEngine()?.applyWorldScenery?.(scenery, { flyToVista });
  };

  return (
    <>
      <div id="loading-overlay">
        <div className="loader-ambient-glow" aria-hidden="true"></div>
        <div className="loader-arch-grid" aria-hidden="true"></div>
        <div className="loader-embers" aria-hidden="true">
          <span className="loader-ember e1"></span>
          <span className="loader-ember e2"></span>
          <span className="loader-ember e3"></span>
          <span className="loader-ember e4"></span>
          <span className="loader-ember e5"></span>
          <span className="loader-ember e6"></span>
        </div>

        <div className="loader-sanctum-panel">
          <div className="loader-kicker">
            <span>SANCTUM OF THE OBSIDIAN ALTAR</span>
            <span className="loader-kicker-dot" aria-hidden="true">◆</span>
            <span>ANNO DOMINI MMXXVI</span>
          </div>

          <div className="loader-crest-wrap" aria-hidden="true">
            <svg className="loader-rose-svg" viewBox="0 0 220 220" fill="none">
              <defs>
                <linearGradient id="sanctumGoldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#fff3c4" />
                  <stop offset="50%" stopColor="#d4af37" />
                  <stop offset="100%" stopColor="#8a6412" />
                </linearGradient>
                <radialGradient id="sanctumCoreGlow" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="rgba(245, 215, 110, 0.36)" />
                  <stop offset="65%" stopColor="rgba(212, 175, 55, 0.1)" />
                  <stop offset="100%" stopColor="rgba(8, 10, 15, 0)" />
                </radialGradient>
              </defs>

              <circle cx="110" cy="110" r="98" fill="url(#sanctumCoreGlow)" />

              {/* Outer Rotating Runic Astrolabe Ring */}
              <g className="loader-ring-outer">
                <circle
                  cx="110"
                  cy="110"
                  r="96"
                  stroke="url(#sanctumGoldGrad)"
                  strokeWidth="1.2"
                  strokeOpacity="0.55"
                />
                <circle
                  cx="110"
                  cy="110"
                  r="89"
                  stroke="url(#sanctumGoldGrad)"
                  strokeWidth="1.5"
                  strokeDasharray="6 8 2 8"
                  strokeOpacity="0.75"
                />
                <polygon
                  points="110,10 114,22 110,19 106,22"
                  fill="url(#sanctumGoldGrad)"
                />
                <polygon
                  points="110,210 114,198 110,201 106,198"
                  fill="url(#sanctumGoldGrad)"
                />
                <polygon
                  points="10,110 22,114 19,110 22,106"
                  fill="url(#sanctumGoldGrad)"
                />
                <polygon
                  points="210,110 198,114 201,110 198,106"
                  fill="url(#sanctumGoldGrad)"
                />
              </g>

              {/* Counter-Rotating Gothic Rose Tracery */}
              <g className="loader-ring-inner">
                <rect
                  x="52"
                  y="52"
                  width="116"
                  height="116"
                  stroke="url(#sanctumGoldGrad)"
                  strokeWidth="1.1"
                  strokeOpacity="0.48"
                />
                <rect
                  x="52"
                  y="52"
                  width="116"
                  height="116"
                  transform="rotate(45 110 110)"
                  stroke="url(#sanctumGoldGrad)"
                  strokeWidth="1.1"
                  strokeOpacity="0.48"
                />
                <circle
                  cx="110"
                  cy="110"
                  r="64"
                  stroke="url(#sanctumGoldGrad)"
                  strokeWidth="1.2"
                  strokeDasharray="14 6"
                  strokeOpacity="0.7"
                />
              </g>

              {/* Central Medallion & Sculpted King Crown Silhouette */}
              <circle
                cx="110"
                cy="110"
                r="44"
                fill="rgba(11, 14, 21, 0.92)"
                stroke="url(#sanctumGoldGrad)"
                strokeWidth="1.8"
              />
              <circle
                cx="110"
                cy="110"
                r="38"
                stroke="rgba(245, 215, 110, 0.35)"
                strokeWidth="0.9"
                strokeDasharray="3 3"
              />
              {/* Sovereign Cross & Crown */}
              <path
                d="M110 77 V89 M104 83 H116"
                stroke="url(#sanctumGoldGrad)"
                strokeWidth="2.4"
                strokeLinecap="round"
              />
              <path
                d="M90 124 L86 98 L99 107 L110 92 L121 107 L134 98 L130 124 Z"
                fill="rgba(212, 175, 55, 0.2)"
                stroke="url(#sanctumGoldGrad)"
                strokeWidth="2"
                strokeLinejoin="round"
              />
              <path
                d="M86 130 H134 M82 136 H138"
                stroke="url(#sanctumGoldGrad)"
                strokeWidth="2.2"
                strokeLinecap="round"
              />
              <circle cx="110" cy="112" r="3" fill="#fff3c4" />
              <circle cx="98" cy="115" r="2.2" fill="#f5d76e" />
              <circle cx="122" cy="115" r="2.2" fill="#f5d76e" />
            </svg>
          </div>

          <div className="loader-title">Wizard Chess</div>
          <div className="loader-subtitle">
            Cathedral Sanctum &amp; Sculpted Battle Automata
          </div>

          {/* 7-Relic Summoning Milestone Track */}
          <div className="loader-nodes-row" aria-hidden="true">
            {[
              { step: 1, label: 'Sanctum', glyph: '❖' },
              { step: 2, label: 'Pawn', glyph: '♙' },
              { step: 3, label: 'Rook', glyph: '♖' },
              { step: 4, label: 'Knight', glyph: '♘' },
              { step: 5, label: 'Bishop', glyph: '♗' },
              { step: 6, label: 'Queen', glyph: '♕' },
              { step: 7, label: 'King', glyph: '♔' }
            ].map((item) => (
              <div key={item.step} className="loader-node-pip" data-step={item.step}>
                <span className="loader-node-glyph">{item.glyph}</span>
                <span className="loader-node-name">{item.label}</span>
              </div>
            ))}
          </div>

          <div className="loader-progress-meta">
            <span id="loader-step-count">0 / 7 Relics Awakened</span>
            <span id="loader-pct">6%</span>
          </div>

          <div className="loader-bar-wrap">
            <div className="loader-bar" id="loader-bar"></div>
          </div>

          <div id="loader-text">Summoning Sanctum Architecture &amp; Sculpted Pieces...</div>

          <div className="loader-lore-box">
            <span className="loader-lore-tag">SANCTUM EDICT</span>
            <p className="loader-lore-copy">
              Placing the enemy Sovereign in Check claims immediate triumph upon the Obsidian Altar.
              Earn Gold from every shattered statue to unlock new 3D Sculptures and Arenas in the Armory.
            </p>
          </div>
        </div>
      </div>

      <div id="canvas-container"></div>

      {/* Floating Gold Bounty & Dramatic Kill Effect Notification */}
      {bountyToast && (
        <div
          className={`gold-bounty-toast bounty-scale-in ${bountyToast.amount > 0 ? 'is-gold-bounty' : 'is-combat-alert'}`}
          key={bountyToast.id}
          role="status"
          aria-live="polite"
        >
          <span className="gold-coin-glyph" aria-hidden="true">
            {bountyToast.amount > 0 ? (
              <ItchPouchBountyIcon size={22} />
            ) : (
              <PlaySwordsVectorIcon size={20} />
            )}
          </span>
          {bountyToast.amount > 0 && (
            <>
              <span className="gold-bounty-amount">+{bountyToast.amount} Gold</span>
              <span className="gold-bounty-sep">·</span>
            </>
          )}
          <span className="gold-bounty-label">{bountyToast.label}</span>
        </div>
      )}

      {/* 1-Phone P1 vs P2 Turn Switch Toast */}
      {turnSwitchToast && !pendingTurnHandoff && (
        <div className="turn-handoff-toast" role="status" aria-live="polite">
          {turnSwitchToast}
        </div>
      )}

      {/* Optional 1-Phone Pass-Device Privacy Curtain */}
      {pendingTurnHandoff && (
        <div className="pass-device-curtain">
          <div className="pass-device-card">
            <div className="pass-device-kicker">1-Phone Pass &amp; Play</div>
            <h2 className="pass-device-title">Pass Phone to {pendingTurnHandoff}</h2>
            <p className="pass-device-desc">
              The camera has rotated to your side of the Obsidian Altar. Tap below when you hold the phone.
            </p>
            <button
              type="button"
              className="arena-primary-btn"
              onClick={() => setPendingTurnHandoff(null)}
            >
              Ready to Move
            </button>
          </div>
        </div>
      )}

      <button
        type="button"
        className={`hud-btn mobile-only-restore-ui ${uiHidden ? 'is-visible' : ''}`}
        id="btn-mobile-show-ui"
        onClick={handleRestoreUI}
        title="Restore HUD Controls (Shortcut: H)"
      >
        Show UI [H]
      </button>

      <div
        id="hud-top"
        key={`hud-top-${hudEntranceEpoch}`}
        className={hasStartedGame && activeDialog === 'none' ? 'hud-entrance-active' : ''}
        data-orientation={hudViewport.orientation}
        data-aspect-profile={hudViewport.aspectProfile}
        aria-hidden={uiHidden || activeDialog !== 'none'}
        style={{ display: activeDialog !== 'none' ? 'none' : undefined }}
      >
        <div className="hud-top-main-row">
          <div className="hud-group" id="hud-left">
            <button
              type="button"
              className="hud-btn primary hud-lobby-back-btn"
              id="btn-hud-lobby-top"
              onClick={() => {
                setMobileSheetOpen(false);
                setPendingTurnHandoff(null);
                getEngine()?.quitMatchToLobby?.();
                setHasStartedGame(false);
                setActiveDialog('gateway');
              }}
              title="Quit Match & Return to Sanctum Lobby"
            >
              <img
                src="/assets/ui/icons/return.png"
                alt=""
                className="itch-hud-inline-icon"
                aria-hidden="true"
              />
              <span>Lobby</span>
            </button>

            <div className={`status-pill ${inCheck ? 'in-check' : ''}`} id="status-pill">
              <span className="turn-dot" id="turn-dot"></span>
              <span id="turn-text">White to Move</span>
              <span className="mode-badge" id="mode-badge">Vs Bot</span>
            </div>
          </div>

          <div className="hud-compact-actions">
            <button
              type="button"
              className="hud-btn hud-micro-btn"
              onClick={() => getEngine()?.setCameraPreset?.('player')}
              title="Flip / Reset Player Camera"
            >
              <ItchRotateCameraIcon size={13} />
              <span>Cam</span>
            </button>
            <button
              type="button"
              className={`hud-btn hud-micro-btn ${sfxEnabled ? 'active' : ''}`}
              onClick={handleToggleSfx}
              title="Toggle Sound Effects"
            >
              <img
                src={sfxEnabled ? '/assets/ui/icons/audioOn.png' : '/assets/ui/icons/audioOff.png'}
                alt=""
                className="itch-hud-inline-icon"
                aria-hidden="true"
              />
              <span>{sfxEnabled ? 'SFX' : 'Mute'}</span>
            </button>
            <button
              type="button"
              className={`hud-btn mobile-controls-trigger ${mobileSheetOpen ? 'active' : ''}`}
              id="btn-mobile-controls"
              aria-expanded={mobileSheetOpen}
              aria-controls="hud-right"
              onClick={() => setMobileSheetOpen((prev) => !prev)}
            >
              {mobileSheetOpen ? '✕' : '☰ Toggles'}
            </button>
          </div>
        </div>

        {/* Second Row Below: Live Dual Chess Clock Bar, Gold Treasury & Check Alert */}
        <div className="hud-group hud-top-sub-row" id="hud-sub-bar">
          <div
            className={`hud-chess-clock-bar mode-${timeControlCategory}`}
            id="hud-chess-clock-bar"
            role="timer"
            aria-label={`${timeControlCategory.toUpperCase()} Chess Clocks`}
          >
            <button
              type="button"
              className="clock-mode-tag-btn"
              onClick={() => {
                setMobileSheetOpen(false);
                getEngine()?.setLobbyPaused?.(true);
                setActiveDialog('play');
              }}
              title="Click to Change Game Mode (Bullet, Blitz, Rapid)"
            >
              <span className="clock-mode-icon" aria-hidden="true">
                {timeControlCategory === 'bullet' ? (
                  <BulletModeVectorIcon size={13} />
                ) : timeControlCategory === 'blitz' ? (
                  <BlitzModeVectorIcon size={13} />
                ) : (
                  <RapidModeVectorIcon size={13} />
                )}
              </span>
              <span className="clock-mode-name">{timeControlCategory.toUpperCase()}</span>
            </button>

            <div
              className={`clock-side-readout white-side ${activeClockTurn === 'w' ? 'is-active-turn' : ''} ${
                whiteClockSec <= 20 ? 'is-low-time' : ''
              }`}
              title="White Army Remaining Time"
            >
              <span className="clock-side-king" aria-hidden="true">♔</span>
              <span className="clock-side-digits" id="hud-clock-white">
                {formatChessClock(whiteClockSec)}
              </span>
            </div>

            <span className="clock-divider-colon" aria-hidden="true">:</span>

            <div
              className={`clock-side-readout black-side ${activeClockTurn === 'b' ? 'is-active-turn' : ''} ${
                blackClockSec <= 20 ? 'is-low-time' : ''
              }`}
              title="Black Army Remaining Time"
            >
              <span className="clock-side-king" aria-hidden="true">♚</span>
              <span className="clock-side-digits" id="hud-clock-black">
                {formatChessClock(blackClockSec)}
              </span>
            </div>
          </div>

          <button
            type="button"
            className="gold-wallet-btn"
            id="gold-wallet-badge"
            onClick={() => {
              setMobileSheetOpen(false);
              getEngine()?.setLobbyPaused?.(true);
              setActiveDialog('armory');
            }}
            title="Open Skin Reliquary"
          >
            <span className="gold-coin-glyph" aria-hidden="true">
              <GoldCoinVectorIcon size={Math.round(14 * hudViewport.fontScale)} />
            </span>
            <span className="gold-wallet-amount">{economy.gold}</span>
          </button>

          {inCheck && (
            <div
              className="check-indicator-badge active"
              id="check-indicator-badge"
              role="status"
              aria-live="assertive"
            >
              <span className="check-indicator-icon" aria-hidden="true">
                <PlaySwordsVectorIcon size={Math.round(12 * hudViewport.fontScale)} />
              </span>
              <span className="check-indicator-label">CHECK!</span>
            </div>
          )}
        </div>

        <div
          className={`mobile-sheet-backdrop ${mobileSheetOpen ? 'open' : ''}`}
          onClick={(e) => {
            e.stopPropagation();
            setMobileSheetOpen(false);
          }}
          aria-hidden="true"
        ></div>

        <div
          className={`hud-group ${mobileSheetOpen ? 'mobile-sheet-open' : ''}`}
          id="hud-right"
        >
          <div className="mobile-sheet-header">
            <span className="mobile-sheet-title">Match Toggles</span>
            <button
              type="button"
              className="mobile-sheet-close"
              id="btn-mobile-sheet-close"
              onClick={(e) => {
                e.stopPropagation();
                setMobileSheetOpen(false);
              }}
              aria-label="Close Toggles"
            >
              ✕
            </button>
          </div>

          <div className="mobile-sheet-section-label">Camera Views (Tap to Flip)</div>

          <button
            className="hud-btn active"
            id="btn-cam-player"
            title="Player Camera (Click again to flip White / Black view)"
          >
            Player
          </button>
          <button
            className="hud-btn"
            id="btn-cam-top"
            title="Overhead Board View"
          >
            Overhead
          </button>
          <button
            className="hud-btn"
            id="btn-cam-side"
            title="Side Profile View"
          >
            Side
          </button>
          <button
            className="hud-btn"
            id="btn-cam-wide"
            title="Wide Cathedral View"
          >
            Cathedral
          </button>

          <div className="mobile-sheet-section-label">Match Actions</div>

          <button
            className="hud-btn"
            id="btn-side-toggle"
            title="Switch between Playing as White and Playing as Black"
            onClick={() => setMobileSheetOpen(false)}
          >
            Switch Side
          </button>
          <button
            className="hud-btn"
            id="btn-ai-move"
            title="Let the AI make the next move immediately"
            onClick={() => setMobileSheetOpen(false)}
          >
            AI Move
          </button>
          <button
            className="hud-btn"
            id="btn-reset"
            title="Restart Match on the Altar"
            onClick={() => setMobileSheetOpen(false)}
          >
            Restart
          </button>

          <div className="mobile-sheet-section-label">Quick Audio &amp; HUD</div>

          <button
            type="button"
            className={`hud-btn ${sfxEnabled ? 'active' : ''}`}
            id="btn-sfx-toggle"
            onClick={handleToggleSfx}
          >
            {sfxEnabled ? 'SFX: ON' : 'SFX: OFF'}
          </button>

          <button
            type="button"
            className={`hud-btn ${lobbyMusicEnabled ? 'active' : ''}`}
            id="btn-music-toggle"
            onClick={handleToggleLobbyMusic}
          >
            {lobbyMusicEnabled ? 'Music: ON' : 'Music: OFF'}
          </button>

          <button
            type="button"
            className={`hud-btn ${voiceEnabled ? 'active' : ''}`}
            id="btn-voice-toggle"
            onClick={handleToggleVoiceAnnouncer}
          >
            {voiceEnabled ? 'Fanfare: ON' : 'Fanfare: OFF'}
          </button>

          <button
            className="hud-btn"
            id="btn-hide-ui"
            onClick={() => setMobileSheetOpen(false)}
          >
            Hide UI [H]
          </button>

          <button
            type="button"
            className="hud-btn primary"
            id="btn-arena-hub"
            onClick={() => {
              setMobileSheetOpen(false);
              setPendingTurnHandoff(null);
              getEngine()?.quitMatchToLobby?.();
              setHasStartedGame(false);
              setActiveDialog('gateway');
            }}
          >
            ← Return to Lobby
          </button>

          <button
            type="button"
            className="hud-btn"
            id="btn-skin-shop"
            onClick={() => {
              setMobileSheetOpen(false);
              getEngine()?.setLobbyPaused?.(true);
              setActiveDialog('armory');
            }}
          >
            Skins ({economy.gold}G)
          </button>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* 1. GATEWAY MAIN LOBBY (PLAY, SKINS, LOGIN, LEADERBOARDS, SETTINGS)    */}
      {/* ===================================================================== */}
      {activeDialog === 'gateway' && (
        <div
          className="sanctum-modal-backdrop"
          onClick={() => {
            if (hasStartedGame) setActiveDialog('none');
          }}
        >
          <div
            className="sanctum-modal-card gateway-modal-card"
            id="gateway-hub-drawer"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="gateway-modal-title"
          >
            <div className="sanctum-corner tl" aria-hidden="true"></div>
            <div className="sanctum-corner tr" aria-hidden="true"></div>
            <div className="sanctum-corner bl" aria-hidden="true"></div>
            <div className="sanctum-corner br" aria-hidden="true"></div>

            <div className="sanctum-modal-header gateway-header">
              <div className="sanctum-header-titles">
                <div className="sanctum-modal-kicker">✦ THE OBSIDIAN ALTAR ✦</div>
                <h2 className="sanctum-modal-title" id="gateway-modal-title">
                  Wizard Chess
                </h2>
                <div className="sanctum-record-line">
                  <span>Treasury: <strong>{economy.gold} Gold</strong></span>
                  <span aria-hidden="true">·</span>
                  <span>Rating: <strong>{playerRating} ELO</strong></span>
                  <span aria-hidden="true">·</span>
                  <span>Rank: <strong style={{ color: displayedRankTier.primaryHex }}>{displayedRankTier.name} ({displayedRankTier.title})</strong></span>
                </div>
              </div>

              <div className="gateway-header-actions" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {hasStartedGame && (
                  <button
                    type="button"
                    className="sanctum-modal-close gold-trim"
                    onClick={() => {
                      requestAppFullscreenPortrait();
                      getEngine()?.setLobbyPaused?.(false);
                      setActiveDialog('none');
                    }}
                  >
                    <PlaySwordsVectorIcon size={15} /> Resume Match
                  </button>
                )}
              </div>
            </div>

            <div className="sanctum-tapered-rule" aria-hidden="true"></div>

            <div className="sanctum-modal-body gateway-scroll-body">
            {/* Commander Portrait & Rank Tier Progression Banner */}
            <div
              className={`sanctum-rank-banner rank-banner-${displayedRankTier.id}`}
              aria-label="Player Rank Tier and Portrait"
            >
              <div className="rank-portrait-column">
                <button
                  type="button"
                  className={`rank-portrait-shell rank-border-${displayedRankTier.id} clickable-portrait-btn`}
                  title="Click to Change Profile Photo & Commander Name"
                  onClick={() => {
                    getEngine()?.playLobbyClickSfx?.('tab');
                    setActiveDialog('settings');
                  }}
                >
                  <div className="rank-border-aura" aria-hidden="true"></div>
                  <div className="rank-border-ring" aria-hidden="true"></div>
                  <span className="rank-corner-ornament tl" aria-hidden="true"></span>
                  <span className="rank-corner-ornament tr" aria-hidden="true"></span>
                  <span className="rank-corner-ornament bl" aria-hidden="true"></span>
                  <span className="rank-corner-ornament br" aria-hidden="true"></span>

                  <div className="rank-portrait-inner">
                    {customProfilePhoto || currentUser?.photoURL ? (
                      <img
                        src={customProfilePhoto || currentUser?.photoURL || ''}
                        alt={customCommanderName || currentUser?.displayName || 'Commander'}
                        className="rank-commander-img"
                      />
                    ) : (
                      <div className="rank-commander-glyph-avatar">
                        <CommanderSigilVectorIcon sigil={customCommanderAvatar} size={44} />
                      </div>
                    )}
                    <div className="rank-portrait-shimmer" aria-hidden="true"></div>
                  </div>

                  <div className="rank-crest-seal" aria-hidden="true">
                    <CommanderSigilVectorIcon sigil={displayedRankTier.crestGlyph} size={14} />
                  </div>
                </button>
              </div>

              <div className="rank-details-column">
                <div className="rank-title-row">
                  <div className="rank-title-group">
                    <span
                      className="rank-tier-kicker"
                      style={{ color: displayedRankTier.primaryHex }}
                    >
                      Rank {displayedRankTier.numeral} · {displayedRankTier.name} Tier
                      {' · '}
                      {customCommanderName ||
                        (currentUser ? currentUser.displayName || currentUser.email : 'Local Commander')}
                    </span>
                    <div className="rank-tier-heading">
                      <span className="rank-tier-main-title">{displayedRankTier.title}</span>
                      <span className="rank-border-tag">
                        ✦ {displayedRankTier.borderEffectName}
                      </span>
                    </div>
                  </div>

                  <div className="rank-win-counter">
                    <span className="rank-win-num">{economy.stats.wins}</span>
                    <span className="rank-win-label">
                      {economy.stats.wins === 1 ? 'Victory' : 'Victories'} · {playerRating} ELO
                    </span>
                  </div>
                </div>

                <div className="rank-progress-wrap">
                  <div className="rank-progress-labels">
                    <span className="rank-border-desc">{displayedRankTier.borderDescription}</span>
                    <span className="rank-next-target">
                      {rankProgress.nextTier
                        ? `${rankProgress.winsRemaining} more ${
                            rankProgress.winsRemaining === 1 ? 'win' : 'wins'
                          } to ${rankProgress.nextTier.name} (${rankProgress.nextTier.minWins}W)`
                        : 'Max Rank Tier Achieved (21+ Wins)'}
                    </span>
                  </div>
                  <div className="rank-progress-track" aria-hidden="true">
                    <div
                      className="rank-progress-fill"
                      style={{
                        width: `${rankProgress.progressPercent}%`,
                        background: `linear-gradient(90deg, ${displayedRankTier.secondaryHex}, ${displayedRankTier.primaryHex})`
                      }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>

            {/* 5 Prominent Action Portal Cards */}
            <div className="gateway-actions-grid" role="group" aria-label="Sanctum Main Hub Actions">
              {/* 1. PLAY */}
              <button
                type="button"
                className="gateway-action-card play-card"
                onClick={() => {
                  requestAppFullscreenPortrait();
                  getEngine()?.playLobbyClickSfx?.('tab');
                  setActiveDialog('play');
                }}
              >
                <div className="gateway-card-glow" aria-hidden="true"></div>
                <div className="gateway-card-icon" aria-hidden="true">
                  <PlaySwordsVectorIcon size={32} />
                </div>
                <div className="gateway-card-content">
                  <span className="gateway-card-title">PLAY</span>
                  <span className="gateway-card-sub">
                    Bullet · Blitz · Rapid · Play vs Bots · Online PvP · 2P
                  </span>
                </div>
                <span className="gateway-card-chevron" aria-hidden="true">›</span>
              </button>

              {/* 2. SKINS */}
              <button
                type="button"
                className="gateway-action-card skins-card"
                onClick={() => {
                  getEngine()?.playLobbyClickSfx?.('tab');
                  setActiveDialog('armory');
                }}
              >
                <div className="gateway-card-glow" aria-hidden="true"></div>
                <div className="gateway-card-icon" aria-hidden="true">
                  <SkinsCrownVectorIcon size={30} />
                </div>
                <div className="gateway-card-content">
                  <span className="gateway-card-title">SKINS</span>
                  <span className="gateway-card-sub">Piece Sets · Sceneries · Boards · Finishes</span>
                </div>
                <span className="gateway-card-chevron" aria-hidden="true">›</span>
              </button>

              {/* 3. LOGIN (GOOGLE) */}
              <button
                type="button"
                className={`gateway-action-card login-card ${currentUser ? 'signed-in' : ''}`}
                onClick={() => {
                  if (currentUser) {
                    setActiveDialog('settings');
                  } else {
                    handleGoogleLogin();
                  }
                }}
              >
                <div className="gateway-card-glow" aria-hidden="true"></div>
                <div className="gateway-card-icon" aria-hidden="true">
                  {currentUser ? <CloudCheckVectorIcon size={28} /> : <GoogleShieldVectorIcon size={28} />}
                </div>
                <div className="gateway-card-content">
                  <span className="gateway-card-title">
                    {currentUser ? 'GOOGLE SYNCED' : 'LOGIN (GOOGLE)'}
                  </span>
                  <span className="gateway-card-sub">
                    {currentUser
                      ? `${currentUser.displayName || currentUser.email} · Cloud Active`
                      : 'Save & Sync Player Progress to Cloud'}
                  </span>
                </div>
                <span className="gateway-card-chevron" aria-hidden="true">
                  {currentUser ? <SettingsGearVectorIcon size={18} /> : '›'}
                </span>
              </button>

              {/* 4. LIVE LEADERBOARDS */}
              <button
                type="button"
                className="gateway-action-card leaderboards-card"
                onClick={() => {
                  getEngine()?.playLobbyClickSfx?.('tab');
                  setActiveDialog('leaderboard');
                }}
              >
                <div className="gateway-card-glow" aria-hidden="true"></div>
                <div className="gateway-card-icon" aria-hidden="true">
                  <TrophyChaliceVectorIcon size={30} />
                </div>
                <div className="gateway-card-content">
                  <span className="gateway-card-title">LIVE LEADERBOARDS</span>
                  <span className="gateway-card-sub">Tier Feed · Bronze to Obsidian Rankings</span>
                </div>
                <span className="gateway-card-chevron" aria-hidden="true">›</span>
              </button>

              {/* 5. SETTINGS */}
              <button
                type="button"
                className="gateway-action-card settings-card"
                onClick={() => {
                  getEngine()?.playLobbyClickSfx?.('tab');
                  setActiveDialog('settings');
                }}
              >
                <div className="gateway-card-glow" aria-hidden="true"></div>
                <div className="gateway-card-icon" aria-hidden="true">
                  <SettingsGearVectorIcon size={28} />
                </div>
                <div className="gateway-card-content">
                  <span className="gateway-card-title">SETTINGS</span>
                  <span className="gateway-card-sub">Change Profile Photo &amp; Name · Audio Volume</span>
                </div>
                <span className="gateway-card-chevron" aria-hidden="true">›</span>
              </button>
            </div>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* 2. PLAY MATCH SELECTION MODAL (ONLINE, PLAY W BOTS, 2P GAME)          */}
      {/* ===================================================================== */}
      {(activeDialog === 'play' || activeDialog === 'arena') && (
        <div
          className="sanctum-modal-backdrop"
          onClick={() => {
            if (hasStartedGame) setActiveDialog('none');
          }}
        >
          <div
            className="sanctum-modal-card"
            id="arena-hub-drawer"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="arena-modal-title"
          >
            <div className="sanctum-corner tl" aria-hidden="true"></div>
            <div className="sanctum-corner tr" aria-hidden="true"></div>
            <div className="sanctum-corner bl" aria-hidden="true"></div>
            <div className="sanctum-corner br" aria-hidden="true"></div>

            <div className="sanctum-modal-header">
              <div className="sanctum-header-titles">
                <div className="sanctum-modal-kicker">
                  {hasStartedGame ? 'Sanctum Battlegrounds' : 'The Obsidian Altar Awaits'}
                </div>
                <h2 className="sanctum-modal-title" id="arena-modal-title">
                  {hasStartedGame ? 'Match Setup' : 'Wizard Chess'}
                </h2>
                <div className="sanctum-record-line">
                  <span>Treasury: <strong>{economy.gold} Gold</strong></span>
                  <span aria-hidden="true">·</span>
                  <span>Victories: <strong>{economy.stats.wins}</strong></span>
                  <span aria-hidden="true">·</span>
                  <span>Pieces Shattered: <strong>{economy.stats.captures}</strong></span>
                </div>
              </div>

              <div className="armory-header-right" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                {hasStartedGame && (
                  <button
                    type="button"
                    className="sanctum-modal-close"
                    onClick={() => setActiveDialog("none")}
                  >
                    Resume Match
                  </button>
                )}
                <button
                  type="button"
                  className="sanctum-modal-close gold-trim"
                  onClick={() => setActiveDialog("gateway")}
                >
                  ← Back to Lobby
                </button>
              </div>
            </div>

            <div className="sanctum-tapered-rule" aria-hidden="true"></div>

            <div className="sanctum-modal-body arena-modal-scroll-body">
            {/* Engraved 4-Slot Sanctum Loadout Ledger */}
            <div className="sanctum-loadout-ledger" aria-label="Equipped Sanctum Loadout">
              <button
                type="button"
                className="loadout-ledger-slot"
                onClick={() => {
                  setArmoryTab('types');
                  setActiveDialog('armory');
                }}
              >
                <span className="ledger-slot-label">Sculpted Army</span>
                <span className="ledger-slot-value">
                  {PIECE_ARCHETYPES.find((a) => a.id === economy.activePieceType)?.name}
                </span>
                <span className="ledger-slot-action">Change Set</span>
              </button>

              <button
                type="button"
                className="loadout-ledger-slot"
                onClick={() => {
                  setArmoryTab('boards');
                  setActiveDialog('armory');
                }}
              >
                <span className="ledger-slot-label">Altar &amp; Chamber</span>
                <span className="ledger-slot-value">
                  {BOARD_SKINS.find((b) => b.id === economy.activeBoardSkin)?.name}
                </span>
                <span className="ledger-slot-action">Change Board</span>
              </button>

              <button
                type="button"
                className="loadout-ledger-slot"
                onClick={() => {
                  setArmoryTab('sceneries');
                  setActiveDialog('armory');
                }}
              >
                <span className="ledger-slot-label">3D World Scenery</span>
                <span className="ledger-slot-value">
                  {WORLD_SCENERIES.find((w) => w.id === economy.activeScenery)?.name}
                </span>
                <span className="ledger-slot-action">Change Scenery</span>
              </button>

              <button
                type="button"
                className="loadout-ledger-slot"
                onClick={() => {
                  setArmoryTab('pieces');
                  setActiveDialog('armory');
                }}
              >
                <span className="ledger-slot-label">Stone &amp; Metal Finish</span>
                <span className="ledger-slot-value">
                  {PIECE_SKINS.find((s) => s.id === economy.activePieceSkin)?.name}
                </span>
                <span className="ledger-slot-action">Change Finish</span>
              </button>
            </div>

            <div
              className="sanctum-tab-bar segmented-tabs"
              role="tablist"
              aria-label="Match Mode Tabs"
              onKeyDown={(e) => {
                const order: Array<'online' | 'bot' | 'pass'> = ['online', 'bot', 'pass'];
                const idx = order.indexOf(arenaTab);
                if (e.key === 'ArrowRight') {
                  e.preventDefault();
                  setArenaTab(order[(idx + 1) % order.length]);
                } else if (e.key === 'ArrowLeft') {
                  e.preventDefault();
                  setArenaTab(order[(idx - 1 + order.length) % order.length]);
                }
              }}
            >
              <button
                type="button"
                role="tab"
                tabIndex={arenaTab === 'online' ? 0 : -1}
                aria-selected={arenaTab === 'online'}
                className={`sanctum-tab-btn ${arenaTab === 'online' ? 'active' : ''}`}
                onClick={() => setArenaTab('online')}
              >
                <span className="tab-numeral">I.</span>
                <span>Online Match</span>
              </button>
              <button
                type="button"
                role="tab"
                tabIndex={arenaTab === 'bot' ? 0 : -1}
                aria-selected={arenaTab === 'bot'}
                className={`sanctum-tab-btn ${arenaTab === 'bot' ? 'active' : ''}`}
                onClick={() => setArenaTab('bot')}
              >
                <span className="tab-numeral">II.</span>
                <span>Play vs Bots</span>
              </button>
              <button
                type="button"
                role="tab"
                tabIndex={arenaTab === 'pass' ? 0 : -1}
                aria-selected={arenaTab === 'pass'}
                className={`sanctum-tab-btn ${arenaTab === 'pass' ? 'active' : ''}`}
                onClick={() => setArenaTab('pass')}
              >
                <span className="tab-numeral">III.</span>
                <span>2P Pass &amp; Play</span>
              </button>
            </div>

            {/* BULLET · BLITZ · RAPID GAME MODE & TIME CONTROL SELECTOR */}
            <div className="time-control-modes-section" aria-label="Select Game Mode Time Control">
              <div className="sanctum-section-head time-control-section-head">
                <span className="sanctum-field-label">Select Game Mode (Time Control)</span>
                <span className="sanctum-field-note">
                  Active Mode:{' '}
                  <strong>
                    {TIME_CONTROL_CATEGORIES.find((c) => c.id === timeControlCategory)?.name} (
                    {TIME_CONTROL_CATEGORIES.flatMap((c) => c.presets).find(
                      (p) => p.id === timeControlPresetId
                    )?.shortLabel || '5 Min'}
                    )
                  </strong>
                </span>
              </div>

              <div className="time-control-cards-grid">
                {TIME_CONTROL_CATEGORIES.map((modeCat) => {
                  const isCatSelected = timeControlCategory === modeCat.id;
                  return (
                    <div
                      key={modeCat.id}
                      className={`difficulty-card time-mode-card mode-${modeCat.id} ${
                        isCatSelected ? 'selected' : ''
                      }`}
                      onClick={() => handleSelectTimeControlCategory(modeCat.id)}
                      role="button"
                      tabIndex={0}
                      aria-pressed={isCatSelected}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          handleSelectTimeControlCategory(modeCat.id);
                        }
                      }}
                    >
                      <div className="time-mode-card-top">
                        <div className="time-mode-icon-badge" aria-hidden="true">
                          {modeCat.id === 'bullet' ? (
                            <BulletModeVectorIcon size={24} />
                          ) : modeCat.id === 'blitz' ? (
                            <BlitzModeVectorIcon size={24} />
                          ) : (
                            <RapidModeVectorIcon size={24} />
                          )}
                        </div>
                        <div className="time-mode-titles">
                          <div className="difficulty-card-kicker">
                            <span>{modeCat.rangeTag}</span>
                          </div>
                          <div className="difficulty-name">{modeCat.name}</div>
                        </div>
                      </div>

                      <p className="difficulty-desc time-mode-desc">{modeCat.description}</p>

                      <div
                        className="time-preset-pills-row"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {modeCat.presets.map((preset) => {
                          const isPresetActive = timeControlPresetId === preset.id;
                          return (
                            <button
                              key={preset.id}
                              type="button"
                              className={`time-preset-pill-btn ${isPresetActive ? 'active' : ''}`}
                              onClick={() => handleSelectTimeControlPreset(preset)}
                            >
                              {preset.shortLabel}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* TAB 1: PLAY VS BOT (Easy, Medium, Hard) */}
            {arenaTab === 'bot' && (
              <div className="arena-tab-section-stack">
                <div className="sanctum-section-head">
                  <span className="sanctum-field-label">Select Opponent Rank</span>
                  <span className="sanctum-field-note">
                    Pawn +15G · Minor Piece +35G · Rook +55G · Queen +95G
                  </span>
                </div>

                <div className="difficulty-grid">
                  {(
                    [
                      {
                        id: 'easy',
                        numeral: 'I',
                        rank: 'Novice Acolyte',
                        title: 'Easy',
                        desc: 'Forgiving stone automaton suited for learning board lines and setting up melee captures.',
                        reward: '150 Gold Victory'
                      },
                      {
                        id: 'medium',
                        numeral: 'II',
                        rank: 'Sanctum Warden',
                        title: 'Medium',
                        desc: 'Measured tactical guardian that contests the center squares and punishes unguarded pieces.',
                        reward: '225 Gold Victory'
                      },
                      {
                        id: 'hard',
                        numeral: 'III',
                        rank: 'Grandmaster Archon',
                        title: 'Hard',
                        desc: 'Deep multi-ply tactical search with ruthless positional calculation and endgame precision.',
                        reward: '350 Gold Victory'
                      }
                    ] as const
                  ).map((tier) => (
                    <button
                      type="button"
                      key={tier.id}
                      className={`difficulty-card ${botDifficulty === tier.id ? 'selected' : ''}`}
                      onClick={() => {
                        setBotDifficulty(tier.id);
                        getEngine()?.setBotDifficulty?.(tier.id);
                      }}
                    >
                      <div className="difficulty-card-kicker">
                        <span>Rank {tier.numeral}</span>
                        <span aria-hidden="true">·</span>
                        <span>{tier.title}</span>
                      </div>
                      <div className="difficulty-name">{tier.rank}</div>
                      <p className="difficulty-desc">{tier.desc}</p>
                      <div className="difficulty-reward">{tier.reward}</div>
                    </button>
                  ))}
                </div>

                <div className="sanctum-section-head">
                  <span className="sanctum-field-label">Choose Allegiance</span>
                  <span className="sanctum-field-note">
                    Victory Purse: +{MATCH_WIN_BOUNTY[`bot_${botDifficulty}`]} Gold
                  </span>
                </div>

                <div className="side-picker-row">
                  <button
                    type="button"
                    className={`side-picker-btn ${botSide === 'w' ? 'selected' : ''}`}
                    onClick={() => setBotSide('w')}
                  >
                    <span className="side-glyph" aria-hidden="true">♔</span>
                    <span className="side-text-wrap">
                      <span className="side-title">White Army</span>
                      <span className="side-sub">First Move on the Altar</span>
                    </span>
                  </button>
                  <button
                    type="button"
                    className={`side-picker-btn ${botSide === 'b' ? 'selected' : ''}`}
                    onClick={() => setBotSide('b')}
                  >
                    <span className="side-glyph" aria-hidden="true">♚</span>
                    <span className="side-text-wrap">
                      <span className="side-title">Black Army</span>
                      <span className="side-sub">Counter-Strike from the North</span>
                    </span>
                  </button>
                </div>

                <button
                  type="button"
                  className="arena-primary-btn"
                  onClick={handleStartBotGame}
                >
                  Enter the Sanctum · Start Match
                </button>
              </div>
            )}

            {/* TAB 2: PLAYER VS PLAYER (ONLINE MATCHMAKING + ROOM CODES) */}
            {arenaTab === 'online' && (
              <div className="arena-tab-section-stack">
                <div className="online-section-box">
                  <div className="online-section-header">
                    <div>
                      <div className="sanctum-field-label">Public Matchmaking Queue</div>
                      <p className="online-section-sub">
                        Finds suitable online players currently searching in the queue by Skill Rating &amp; Army preference. Auto-cancels after 30s if no match is found.
                      </p>
                    </div>
                    <div className="matchmaking-rating-badge">
                      <span className="rating-badge-label">Your Rating</span>
                      <span className="rating-badge-val">{playerRating} ELO</span>
                    </div>
                  </div>

                  <div className="online-loadout-plaque">
                    <div className="online-loadout-info">
                      <span className="online-loadout-kicker">
                        Your Equipped Online Army (Visible to Opponent)
                      </span>
                      <div className="online-loadout-name">
                        <span className="online-loadout-glyph" aria-hidden="true">
                          {equippedArchetypeObj.id === 'dragon_elemental'
                            ? '🐉'
                            : equippedArchetypeObj.id === 'arcane_cyber'
                              ? '⚡'
                              : equippedArchetypeObj.id === 'classic_staunton'
                                ? '♔'
                                : '⚔'}
                        </span>
                        <span>{equippedArchetypeObj.name}</span>
                        <span className="online-loadout-sep">·</span>
                        <span className="online-loadout-skin">{equippedPieceSkinObj.name}</span>
                      </div>
                      <p className="online-loadout-desc">
                        Both players&apos; equipped 3D sculptures &amp; finishes render live on their side of the altar.
                      </p>
                    </div>
                    <button
                      type="button"
                      className="sanctum-modal-close gold-trim"
                      onClick={() => {
                        setArmoryTab('types');
                        setActiveDialog('armory');
                      }}
                    >
                      Change Set
                    </button>
                  </div>

                  {(onlineWhiteArmyName || onlineBlackArmyName) && activeRoomCode && (
                    <div className="online-clash-banner">
                      <div className="online-clash-side">
                        <span className="clash-side-tag">♔ White Army</span>
                        <span className="clash-side-val">
                          {onlineWhiteArmyName || 'Awaiting Challenger...'}
                        </span>
                      </div>
                      <span className="online-clash-vs">VS</span>
                      <div className="online-clash-side">
                        <span className="clash-side-tag">♚ Black Army</span>
                        <span className="clash-side-val">
                          {onlineBlackArmyName || 'Awaiting Challenger...'}
                        </span>
                      </div>
                    </div>
                  )}

                  {onlineQueueStatus !== 'searching' && (
                    <div className="matchmaking-pref-row">
                      <span className="matchmaking-pref-label">Preferred Army:</span>
                      <div className="matchmaking-pref-btns">
                        {(
                          [
                            { id: 'any', label: '⚔ Any Army (Fastest)' },
                            { id: 'w', label: '♔ White' },
                            { id: 'b', label: '♚ Black' }
                          ] as const
                        ).map((opt) => (
                          <button
                            key={opt.id}
                            type="button"
                            className={`matchmaking-pref-btn ${matchmakingPreferredColor === opt.id ? 'selected' : ''}`}
                            onClick={() => setMatchmakingPreferredColor(opt.id)}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {onlineQueueStatus === 'searching' ? (
                    <div className="matchmaking-searching-box">
                      <div className="searching-top-row">
                        <div className="searching-spinner" aria-hidden="true"></div>
                        <div className="searching-text-wrap">
                          <div className="searching-title-row">
                            <span className="searching-title">
                              Finding Suitable Online Player...
                            </span>
                            <span className="searching-timer-badge">
                              {matchmakingRemainingSec}s / 30s
                            </span>
                          </div>
                          <div className="searching-sub">
                            Skill Range: {Math.max(800, playerRating - matchmakingRatingWindow)} –{' '}
                            {playerRating + matchmakingRatingWindow} ELO ·{' '}
                            {matchmakingQueueCount > 1
                              ? `${matchmakingQueueCount} Players in Queue`
                              : 'Scanning Sanctum Queue (Auto-cancels in ' +
                                matchmakingRemainingSec +
                                's)'}
                          </div>
                        </div>
                        <button
                          type="button"
                          className="sanctum-modal-close"
                          onClick={handleCancelMatchmaking}
                        >
                          Cancel
                        </button>
                      </div>
                      <div className="searching-progress-track" aria-hidden="true">
                        <div
                          className="searching-progress-fill"
                          style={{
                            width: `${Math.max(0, Math.min(100, (matchmakingRemainingSec / 30) * 100))}%`
                          }}
                        ></div>
                      </div>
                    </div>
                  ) : (
                    <>
                      {matchmakingTimedOut && (
                        <div className="matchmaking-timeout-banner" role="status">
                          <span>
                            ⏱ No suitable online challenger found within 30s. Matchmaking was cancelled.
                          </span>
                        </div>
                      )}
                      <button
                        type="button"
                        className="arena-primary-btn"
                        onClick={handleQuickMatchmaking}
                      >
                        {matchmakingTimedOut
                          ? 'Search Again for Suitable Challenger (30s)'
                          : 'Find Suitable Online Match (30s Max)'}
                      </button>
                    </>
                  )}
                </div>

                <div className="online-divider-row">
                  <span>Private Chamber Cipher</span>
                </div>

                <div className="online-room-split">
                  <div className="online-room-col">
                    <div className="sanctum-field-label">Host Private Chamber</div>
                    <div className="side-picker-row compact">
                      <button
                        type="button"
                        className={`side-picker-btn compact ${onlinePreferredSide === 'w' ? 'selected' : ''}`}
                        onClick={() => setOnlinePreferredSide('w')}
                      >
                        ♔ White Army
                      </button>
                      <button
                        type="button"
                        className={`side-picker-btn compact ${onlinePreferredSide === 'b' ? 'selected' : ''}`}
                        onClick={() => setOnlinePreferredSide('b')}
                      >
                        ♚ Black Army
                      </button>
                    </div>
                    <button
                      type="button"
                      className="arena-secondary-btn"
                      onClick={handleCreatePrivateRoom}
                    >
                      Create 4-Letter Room
                    </button>

                    {activeRoomCode && (
                      <div className="created-room-box">
                        <div className="created-room-code">{activeRoomCode}</div>
                        <div className="created-room-status">
                          {bothPlayersConnected ? '2/2 Masters Present' : 'Awaiting Second Master...'}
                        </div>
                        <div className="created-room-actions">
                          <button type="button" className="sanctum-modal-close" onClick={handleCopyRoomCode}>
                            Copy Code
                          </button>
                          <button type="button" className="sanctum-modal-close" onClick={handleCopyInviteLink}>
                            Copy Link
                          </button>
                          <button
                            type="button"
                            className="sanctum-modal-close gold-trim"
                            onClick={() => {
                              setHasStartedGame(true);
                              setActiveDialog('none');
                            }}
                          >
                            Enter Board
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="online-room-col">
                    <div className="sanctum-field-label">Join by Chamber Code</div>
                    <input
                      type="text"
                      maxLength={6}
                      placeholder="CODE (E.G. K7M2)"
                      className="room-code-input"
                      value={joinCodeInput}
                      onChange={(e) => setJoinCodeInput(e.target.value.toUpperCase())}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleJoinPrivateRoom();
                      }}
                    />
                    <button
                      type="button"
                      className="arena-secondary-btn"
                      onClick={handleJoinPrivateRoom}
                    >
                      Join Chamber
                    </button>
                  </div>
                </div>

                {onlineStatusText && (
                  <div className="online-status-note">{onlineStatusText}</div>
                )}
              </div>
            )}

            {/* TAB 3: P1 VS P2 (1 PHONE PASS-AND-PLAY WITH AUTO SWITCHING) */}
            {arenaTab === 'pass' && (
              <div className="arena-tab-section-stack">
                <div className="pass-mode-explainer">
                  <h3 className="pass-explainer-title">Two Masters on One Device</h3>
                  <p className="pass-explainer-desc">
                    Play across the same phone or tablet. After White completes a move—and any melee capture
                    shatters—the camera smoothly orbits 180° across the altar to Black&apos;s perspective.
                  </p>
                </div>

                <div className="pass-options-list">
                  <label className="pass-toggle-row">
                    <div>
                      <div className="pass-toggle-title">Auto-Rotate Camera Between Turns</div>
                      <div className="pass-toggle-sub">
                        Orbits the 3D view between White and Black seats after each turn finishes
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={passAutoFlip}
                      onChange={(e) => {
                        setPassAutoFlip(e.target.checked);
                        getEngine()?.setPassAutoFlip?.(e.target.checked);
                      }}
                    />
                  </label>

                  <label className="pass-toggle-row">
                    <div>
                      <div className="pass-toggle-title">Show Turn Handoff Banner</div>
                      <div className="pass-toggle-sub">
                        Pauses with a confirmation screen while passing the device to the next player
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={passPrivacyCurtain}
                      onChange={(e) => setPassPrivacyCurtain(e.target.checked)}
                    />
                  </label>
                </div>

                <div className="sanctum-section-head">
                  <span className="sanctum-field-label">Match Spoils</span>
                  <span className="sanctum-field-note">
                    Piece Captures +15G to +95G · Match Completion +{MATCH_WIN_BOUNTY.pass}G
                  </span>
                </div>

                <button
                  type="button"
                  className="arena-primary-btn"
                  onClick={handleStartPassGame}
                >
                  Start Pass &amp; Play Match
                </button>
              </div>
            )}
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* SKIN ARMORY MODAL (Unlock & Equip Piece & Board Skins with Gold)      */}
      {/* ===================================================================== */}
      {activeDialog === 'armory' && (
        <div
          className="sanctum-modal-backdrop"
          onClick={() => setActiveDialog(hasStartedGame ? 'none' : 'arena')}
        >
          <div
            className="sanctum-modal-card wide armory-modal-card"
            id="skin-shop-drawer"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="armory-modal-title"
          >
            <div className="sanctum-corner tl" aria-hidden="true"></div>
            <div className="sanctum-corner tr" aria-hidden="true"></div>
            <div className="sanctum-corner bl" aria-hidden="true"></div>
            <div className="sanctum-corner br" aria-hidden="true"></div>

            <div className="sanctum-modal-header">
              <div className="sanctum-header-titles">
                <div className="sanctum-modal-kicker">Sanctum Vault &amp; Reliquary</div>
                <h2 className="sanctum-modal-title" id="armory-modal-title">Armory of the Altar</h2>
                <div className="sanctum-record-line">
                  <span>Equipped Set: <strong>{equippedArchetypeObj.name}</strong></span>
                  <span aria-hidden="true">·</span>
                  <span>Scenery: <strong>{equippedSceneryObj.name}</strong></span>
                  <span aria-hidden="true">·</span>
                  <span>Board: <strong>{equippedBoardSkinObj.name}</strong></span>
                  <span aria-hidden="true">·</span>
                  <span>Finish: <strong>{equippedPieceSkinObj.name}</strong></span>
                </div>
              </div>

              <div className="armory-header-right">
                <div className="armory-treasury-readout">
                  <span className="treasury-label">Treasury</span>
                  <span className="treasury-amount">{economy.gold} Gold</span>
                </div>
                {hasStartedGame && (
                  <button
                    type="button"
                    className="sanctum-modal-close"
                    onClick={() => setActiveDialog('none')}
                  >
                    Resume Match
                  </button>
                )}
                <button
                  type="button"
                  className="sanctum-modal-close gold-trim"
                  onClick={() => setActiveDialog('gateway')}
                >
                  ← Back to Lobby
                </button>
              </div>
            </div>

            <div className="sanctum-tapered-rule" aria-hidden="true"></div>

            {/* Segmented Category Tab Bar with Proper Keyboard & Mouse Tabbing */}
            <div
              className="sanctum-tab-bar segmented-tabs armory-tabs"
              role="tablist"
              aria-label="Armory Categories"
              onKeyDown={(e) => {
                const order: Array<'types' | 'sceneries' | 'boards' | 'pieces'> = [
                  'types',
                  'sceneries',
                  'boards',
                  'pieces'
                ];
                const idx = order.indexOf(armoryTab);
                if (e.key === 'ArrowRight') {
                  e.preventDefault();
                  setArmoryTab(order[(idx + 1) % order.length]);
                } else if (e.key === 'ArrowLeft') {
                  e.preventDefault();
                  setArmoryTab(order[(idx - 1 + order.length) % order.length]);
                }
              }}
            >
              <button
                type="button"
                role="tab"
                tabIndex={armoryTab === 'types' ? 0 : -1}
                aria-selected={armoryTab === 'types'}
                className={`sanctum-tab-btn ${armoryTab === 'types' ? 'active' : ''}`}
                onClick={() => {
                  setArmoryTab('types');
                  setPoliigonTargetSlot('pieces');
                }}
              >
                <span className="tab-numeral">I.</span>
                <span>Piece Sets</span>
                <span className="tab-count-badge">
                  {economy.ownedPieceTypes.length}/{PIECE_ARCHETYPES.length}
                </span>
              </button>
              <button
                type="button"
                role="tab"
                tabIndex={armoryTab === 'sceneries' ? 0 : -1}
                aria-selected={armoryTab === 'sceneries'}
                className={`sanctum-tab-btn ${armoryTab === 'sceneries' ? 'active' : ''}`}
                onClick={() => setArmoryTab('sceneries')}
              >
                <span className="tab-numeral">II.</span>
                <span>Sceneries</span>
                <span className="tab-count-badge">
                  {economy.ownedSceneries.length}/{WORLD_SCENERIES.length}
                </span>
              </button>
              <button
                type="button"
                role="tab"
                tabIndex={armoryTab === 'boards' ? 0 : -1}
                aria-selected={armoryTab === 'boards'}
                className={`sanctum-tab-btn ${armoryTab === 'boards' ? 'active' : ''}`}
                onClick={() => {
                  setArmoryTab('boards');
                  setPoliigonTargetSlot('table');
                }}
              >
                <span className="tab-numeral">III.</span>
                <span>Altar Boards</span>
                <span className="tab-count-badge">
                  {economy.ownedBoardSkins.length}/{BOARD_SKINS.length}
                </span>
              </button>
              <button
                type="button"
                role="tab"
                tabIndex={armoryTab === 'pieces' ? 0 : -1}
                aria-selected={armoryTab === 'pieces'}
                className={`sanctum-tab-btn ${armoryTab === 'pieces' ? 'active' : ''}`}
                onClick={() => {
                  setArmoryTab('pieces');
                  setPoliigonTargetSlot('pieces');
                }}
              >
                <span className="tab-numeral">IV.</span>
                <span>Finishes</span>
                <span className="tab-count-badge">
                  {economy.ownedPieceSkins.length}/{PIECE_SKINS.length}
                </span>
              </button>
            </div>

            {/* TWO-COLUMN MASTER-DETAIL SPLIT WORKSPACE (Preview Left + All Sets Right) */}
            <div className="armory-split-layout" id="armory-scroll-body">
              {/* LEFT PANE: 3D LIVE INSPECTION PEDESTAL & MATERIAL STUDIO */}
              <div
                className={`armory-preview-pane ${armoryPreviewCollapsed ? 'is-collapsed' : ''}`}
                id="skin-showcase-section"
              >
                <div className="showcase-header-bar">
                  <div className="showcase-header-left">
                    <span className="showcase-kicker">✦ 3D LIVE STUDIO</span>
                    <span className="showcase-title">
                      {armoryTab === 'types'
                        ? showcaseArchetypeObj.name
                        : armoryTab === 'sceneries'
                          ? showcaseSceneryObj.name
                          : armoryTab === 'boards'
                            ? showcaseBoardSkinObj.name
                            : showcasePieceSkinObj.name}
                    </span>
                  </div>
                  <button
                    type="button"
                    className="showcase-collapse-mobile-btn"
                    onClick={() => setArmoryPreviewCollapsed((prev) => !prev)}
                  >
                    {armoryPreviewCollapsed ? '▼ Show 3D Preview' : '▲ Compact 3D'}
                  </button>
                </div>

                {!armoryPreviewCollapsed && (
                  <>
                    <SkinShowcaseCanvas
                      activeTab={armoryTab}
                      archetype={showcaseArchetypeObj}
                      pieceSkin={showcasePieceSkinObj}
                      boardSkin={showcaseBoardSkinObj}
                      scenery={showcaseSceneryObj}
                      attackPreviewNonce={showcaseAttackNonce}
                      poliigonOverrideNonce={poliigonOverrideNonce}
                      paused={armoryPreviewCollapsed}
                    />

                    {/* Quick Active Inspected Item Status & Action Bar */}
                    <div className="showcase-active-summary">
                      <div className="showcase-summary-text">
                        <span className="showcase-summary-sub">
                          {armoryTab === 'types'
                            ? `⚔ ${showcaseArchetypeObj.strikeStyle} · ✦ ${showcaseArchetypeObj.shatterStyle}`
                            : armoryTab === 'sceneries'
                              ? `${showcaseSceneryObj.landmarksLabel} · ${showcaseSceneryObj.weatherLabel}`
                              : armoryTab === 'boards'
                                ? `Sanctum Chamber: ${showcaseBoardSkinObj.environmentLabel}`
                                : showcasePieceSkinObj.subtitle}
                        </span>
                      </div>
                      {armoryTab === 'types' && (
                        <button
                          type="button"
                          className={`showcase-quick-equip-btn ${
                            economy.activePieceType === showcaseArchetypeObj.id ? 'equipped' : ''
                          }`}
                          disabled={
                            !economy.ownedPieceTypes.includes(showcaseArchetypeObj.id) &&
                            economy.gold < showcaseArchetypeObj.price
                          }
                          onClick={() => handleSelectOrBuyPieceType(showcaseArchetypeObj.id)}
                        >
                          {economy.activePieceType === showcaseArchetypeObj.id
                            ? '✓ Equipped Set'
                            : economy.ownedPieceTypes.includes(showcaseArchetypeObj.id)
                              ? 'Equip This Set'
                              : `Unlock · ${showcaseArchetypeObj.price}G`}
                        </button>
                      )}
                      {armoryTab === 'sceneries' && (
                        <button
                          type="button"
                          className={`showcase-quick-equip-btn ${
                            economy.activeScenery === showcaseSceneryObj.id ? 'equipped' : ''
                          }`}
                          disabled={
                            !economy.ownedSceneries.includes(showcaseSceneryObj.id) &&
                            economy.gold < showcaseSceneryObj.price
                          }
                          onClick={() => handleSelectOrBuyWorldScenery(showcaseSceneryObj.id, true)}
                        >
                          {economy.activeScenery === showcaseSceneryObj.id
                            ? '✓ Equipped Realm'
                            : economy.ownedSceneries.includes(showcaseSceneryObj.id)
                              ? 'Equip Scenery'
                              : `Unlock · ${showcaseSceneryObj.price}G`}
                        </button>
                      )}
                      {armoryTab === 'boards' && (
                        <button
                          type="button"
                          className={`showcase-quick-equip-btn ${
                            economy.activeBoardSkin === showcaseBoardSkinObj.id ? 'equipped' : ''
                          }`}
                          disabled={
                            !economy.ownedBoardSkins.includes(showcaseBoardSkinObj.id) &&
                            economy.gold < showcaseBoardSkinObj.price
                          }
                          onClick={() => handleSelectOrBuyBoardSkin(showcaseBoardSkinObj.id)}
                        >
                          {economy.activeBoardSkin === showcaseBoardSkinObj.id
                            ? '✓ Equipped Board'
                            : economy.ownedBoardSkins.includes(showcaseBoardSkinObj.id)
                              ? 'Equip Board'
                              : `Unlock · ${showcaseBoardSkinObj.price}G`}
                        </button>
                      )}
                      {armoryTab === 'pieces' && (
                        <button
                          type="button"
                          className={`showcase-quick-equip-btn ${
                            economy.activePieceSkin === showcasePieceSkinObj.id ? 'equipped' : ''
                          }`}
                          disabled={
                            !economy.ownedPieceSkins.includes(showcasePieceSkinObj.id) &&
                            economy.gold < showcasePieceSkinObj.price
                          }
                          onClick={() => handleSelectOrBuyPieceSkin(showcasePieceSkinObj.id)}
                        >
                          {economy.activePieceSkin === showcasePieceSkinObj.id
                            ? '✓ Equipped Finish'
                            : economy.ownedPieceSkins.includes(showcasePieceSkinObj.id)
                              ? 'Equip Finish'
                              : `Unlock · ${showcasePieceSkinObj.price}G`}
                        </button>
                      )}
                    </div>
                  </>
                )}
              </div>

              {/* RIGHT PANE: SCROLLABLE CATALOG OF ALL SETS & SKINS */}
              <div className="armory-catalog-pane">
                <div className="catalog-pane-header">
                  <span className="catalog-pane-title">
                    {armoryTab === 'types'
                      ? `All Sculpted Piece Sets (${PIECE_ARCHETYPES.length})`
                      : armoryTab === 'sceneries'
                        ? `All 3D World Sceneries (${WORLD_SCENERIES.length})`
                        : armoryTab === 'boards'
                          ? `All Altar Boards & Chambers (${BOARD_SKINS.length})`
                          : `All Stone & Metal Finishes (${PIECE_SKINS.length})`}
                  </span>
                  <span className="catalog-pane-hint">
                    Click any card to preview in 3D or equip
                  </span>
                </div>

                {armoryTab === 'types' && (
                  <div className="skin-grid">
                    {PIECE_ARCHETYPES.map((arch) => {
                      const isOwned = economy.ownedPieceTypes.includes(arch.id);
                      const isEquipped = economy.activePieceType === arch.id;
                      const isInspecting = showcaseArchetypeId === arch.id;
                      const canAfford = economy.gold >= arch.price;

                      return (
                        <div
                          key={arch.id}
                          className={`skin-card ${isEquipped ? 'equipped' : ''} ${isInspecting ? 'inspecting' : ''}`}
                          onClick={() => handleInspectInShowcase('types', arch.id)}
                        >
                          <div className="skin-swatch-row">
                            <span
                              className="skin-kicker-tag"
                              style={{ color: arch.flashColorHex }}
                            >
                              {arch.badge}
                            </span>
                            <div className="skin-status-badges">
                              {isInspecting && (
                                <span className="skin-inspecting-pill">3D Active</span>
                              )}
                              <span className="skin-price-tag">
                                {isEquipped ? '✓ Equipped' : isOwned ? 'Unlocked' : `${arch.price} Gold`}
                              </span>
                            </div>
                          </div>

                          <div className="skin-card-title">{arch.name}</div>
                          <p className="skin-card-sub">{arch.subtitle}</p>
                          <div className="skin-meta-line">
                            <span>⚔ Attack: <strong>{arch.strikeStyle}</strong></span>
                          </div>
                          <div className="skin-meta-line">
                            <span>✦ 3D Effect: <strong>{arch.shatterStyle}</strong></span>
                          </div>

                          <div className="skin-card-actions">
                            <button
                              type="button"
                              className={`live-preview-btn ${isInspecting ? 'active' : ''}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleInspectInShowcase('types', arch.id);
                              }}
                            >
                              <Eye3DPreviewVectorIcon size={14} />
                              <span>{isInspecting ? '⚔ Replay Attack' : '⚔ Preview 3D'}</span>
                            </button>
                            <button
                              type="button"
                              className={`skin-action-btn ${
                                isEquipped ? 'equipped' : isOwned ? 'owned' : canAfford ? 'buyable' : 'locked'
                              }`}
                              disabled={!isOwned && !canAfford}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSelectOrBuyPieceType(arch.id);
                              }}
                            >
                              {isEquipped
                                ? '✓ Equipped'
                                : isOwned
                                ? 'Equip Set'
                                : canAfford
                                ? `Unlock · ${arch.price}G`
                                : `Need ${arch.price}G`}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {armoryTab === 'pieces' && (
                  <div className="skin-grid">
                    {PIECE_SKINS.map((skin) => {
                      const isOwned = economy.ownedPieceSkins.includes(skin.id);
                      const isEquipped = economy.activePieceSkin === skin.id;
                      const isInspecting = showcasePieceSkinId === skin.id;
                      const canAfford = economy.gold >= skin.price;

                      return (
                        <div
                          key={skin.id}
                          className={`skin-card ${isEquipped ? 'equipped' : ''} ${isInspecting ? 'inspecting' : ''}`}
                          onClick={() => handleInspectInShowcase('pieces', skin.id)}
                        >
                          <div className="skin-swatch-row">
                            <div className="skin-swatch-pair">
                              <span
                                className="skin-orb"
                                style={{
                                  background: `radial-gradient(circle at 32% 30%, #ffffff, ${skin.whiteHex} 58%, #1a1c22 100%)`,
                                  borderColor: skin.trimHex
                                }}
                                title="White Army Material"
                              />
                              <span
                                className="skin-orb"
                                style={{
                                  background: `radial-gradient(circle at 32% 30%, ${skin.bladeHex}, ${skin.blackHex} 62%, #050608 100%)`,
                                  borderColor: skin.trimHex
                                }}
                                title="Black Army Material"
                              />
                            </div>
                            <div className="skin-status-badges">
                              {isInspecting && (
                                <span className="skin-inspecting-pill">3D Active</span>
                              )}
                              <span className="skin-price-tag">
                                {isEquipped ? '✓ Equipped' : isOwned ? 'Unlocked' : `${skin.price} Gold`}
                              </span>
                            </div>
                          </div>

                          <div className="skin-card-title">{skin.name}</div>
                          <p className="skin-card-sub">{skin.subtitle}</p>

                          <div className="skin-card-actions">
                            <button
                              type="button"
                              className={`live-preview-btn ${isInspecting ? 'active' : ''}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleInspectInShowcase('pieces', skin.id);
                              }}
                            >
                              <Eye3DPreviewVectorIcon size={14} />
                              <span>{isInspecting ? 'Showing in 3D' : 'Preview 3D'}</span>
                            </button>
                            <button
                              type="button"
                              className={`skin-action-btn ${
                                isEquipped ? 'equipped' : isOwned ? 'owned' : canAfford ? 'buyable' : 'locked'
                              }`}
                              disabled={!isOwned && !canAfford}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSelectOrBuyPieceSkin(skin.id);
                              }}
                            >
                              {isEquipped
                                ? '✓ Equipped'
                                : isOwned
                                ? 'Equip Finish'
                                : canAfford
                                ? `Unlock · ${skin.price}G`
                                : `Need ${skin.price}G`}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {armoryTab === 'boards' && (
                  <div className="skin-grid">
                    {BOARD_SKINS.map((bSkin) => {
                      const isOwned = economy.ownedBoardSkins.includes(bSkin.id);
                      const isEquipped = economy.activeBoardSkin === bSkin.id;
                      const isInspecting = showcaseBoardSkinId === bSkin.id;
                      const canAfford = economy.gold >= bSkin.price;

                      return (
                        <div
                          key={bSkin.id}
                          className={`skin-card ${isEquipped ? 'equipped' : ''} ${isInspecting ? 'inspecting' : ''}`}
                          onClick={() => handleInspectInShowcase('boards', bSkin.id)}
                        >
                          <div className="skin-swatch-row">
                            <div
                              className="board-mini-preview"
                              style={{ borderColor: bSkin.borderHex }}
                            >
                              <span style={{ background: bSkin.lightSqHex }} />
                              <span style={{ background: bSkin.darkSqHex }} />
                              <span style={{ background: bSkin.darkSqHex }} />
                              <span style={{ background: bSkin.lightSqHex }} />
                            </div>
                            <div className="skin-status-badges">
                              {isInspecting && (
                                <span className="skin-inspecting-pill">3D Active</span>
                              )}
                              <span className="skin-price-tag">
                                {isEquipped ? '✓ Equipped' : isOwned ? 'Unlocked' : `${bSkin.price} Gold`}
                              </span>
                            </div>
                          </div>

                          <div className="skin-card-title">{bSkin.name}</div>
                          <p className="skin-card-sub">{bSkin.subtitle}</p>
                          <div className="skin-meta-line">
                            <span>Sanctum Chamber: <strong>{bSkin.environmentLabel}</strong></span>
                          </div>

                          <div className="skin-card-actions">
                            <button
                              type="button"
                              className={`live-preview-btn ${isInspecting ? 'active' : ''}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleInspectInShowcase('boards', bSkin.id);
                              }}
                            >
                              <Eye3DPreviewVectorIcon size={14} />
                              <span>{isInspecting ? 'Showing in 3D' : 'Preview 3D'}</span>
                            </button>
                            <button
                              type="button"
                              className={`skin-action-btn ${
                                isEquipped ? 'equipped' : isOwned ? 'owned' : canAfford ? 'buyable' : 'locked'
                              }`}
                              disabled={!isOwned && !canAfford}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSelectOrBuyBoardSkin(bSkin.id);
                              }}
                            >
                              {isEquipped
                                ? '✓ Equipped'
                                : isOwned
                                ? 'Equip Board'
                                : canAfford
                                ? `Unlock · ${bSkin.price}G`
                                : `Need ${bSkin.price}G`}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {armoryTab === 'sceneries' && (
                  <div className="skin-grid">
                    {WORLD_SCENERIES.map((scenery) => {
                      const isOwned = economy.ownedSceneries.includes(scenery.id);
                      const isEquipped = economy.activeScenery === scenery.id;
                      const isInspecting = showcaseSceneryId === scenery.id;
                      const canAfford = economy.gold >= scenery.price;

                      return (
                        <div
                          key={scenery.id}
                          className={`skin-card scenery-card ${isEquipped ? 'equipped' : ''} ${isInspecting ? 'inspecting' : ''}`}
                          onClick={() => handleInspectInShowcase('sceneries', scenery.id)}
                        >
                          <div
                            className="scenery-sky-banner"
                            style={{
                              background: scenery.skyPreviewGradient,
                              borderColor: scenery.accentHex
                            }}
                          >
                            <span
                              className="skin-kicker-tag scenery-badge"
                              style={{ color: scenery.accentHex }}
                            >
                              {scenery.badge}
                            </span>
                            <div className="skin-status-badges">
                              {isInspecting && (
                                <span className="skin-inspecting-pill">3D Active</span>
                              )}
                              <span className="skin-price-tag">
                                {isEquipped ? '✓ Equipped' : isOwned ? 'Unlocked' : `${scenery.price} Gold`}
                              </span>
                            </div>
                          </div>

                          <div className="skin-card-title">{scenery.name}</div>
                          <p className="skin-card-sub">{scenery.subtitle}</p>
                          <div className="skin-meta-line">
                            <span>Landmarks: <strong>{scenery.landmarksLabel}</strong></span>
                          </div>
                          <div className="skin-meta-line">
                            <span>Atmosphere: <strong>{scenery.weatherLabel}</strong></span>
                          </div>

                          <div className="skin-card-actions">
                            <button
                              type="button"
                              className={`live-preview-btn ${isInspecting ? 'active' : ''}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleInspectInShowcase('sceneries', scenery.id);
                              }}
                            >
                              <Eye3DPreviewVectorIcon size={14} />
                              <span>{isInspecting ? 'Showing in 3D' : 'Preview 3D'}</span>
                            </button>
                            <button
                              type="button"
                              className={`skin-action-btn ${
                                isEquipped ? 'equipped' : isOwned ? 'owned' : canAfford ? 'buyable' : 'locked'
                              }`}
                              disabled={!isOwned && !canAfford}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSelectOrBuyWorldScenery(scenery.id, true);
                              }}
                            >
                              {isEquipped
                                ? '✓ Equipped'
                                : isOwned
                                ? 'Equip Realm'
                                : canAfford
                                ? `Unlock · ${scenery.price}G`
                                : `Need ${scenery.price}G`}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* 4. LIVE LEADERBOARDS MODAL (TIER-BY-TIER FEED BRONZE TO OBSIDIAN)     */}
      {/* ===================================================================== */}
      {activeDialog === 'leaderboard' && (
        <div
          className="sanctum-modal-backdrop"
          onClick={() => setActiveDialog('gateway')}
        >
          <div
            className="sanctum-modal-card wide leaderboard-modal"
            id="leaderboard-drawer"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="leaderboard-modal-title"
          >
            <div className="sanctum-corner tl" aria-hidden="true"></div>
            <div className="sanctum-corner tr" aria-hidden="true"></div>
            <div className="sanctum-corner bl" aria-hidden="true"></div>
            <div className="sanctum-corner br" aria-hidden="true"></div>

            <div className="sanctum-modal-header">
              <div className="sanctum-header-titles">
                <div className="sanctum-modal-kicker">✦ SANCTUM GRANDMASTERS ✦</div>
                <h2 className="sanctum-modal-title" id="leaderboard-modal-title">
                  Live Leaderboards
                </h2>
                <div className="sanctum-record-line">
                  <span>Your Standing: <strong>{rankProgress.currentTier.name} Tier</strong></span>
                  <span aria-hidden="true">·</span>
                  <span>Rating: <strong>{playerRating} ELO</strong></span>
                  <span aria-hidden="true">·</span>
                  <span>Victories: <strong>{economy.stats.wins}</strong></span>
                </div>
              </div>

              <div className="armory-header-right">
                <span className="live-feed-badge">
                  <span className="live-feed-dot" aria-hidden="true"></span>
                  LIVE FEED
                </span>
                <button
                  type="button"
                  className="sanctum-modal-close gold-trim"
                  onClick={() => setActiveDialog('gateway')}
                >
                  ← Back to Lobby
                </button>
              </div>
            </div>

            <div className="sanctum-tapered-rule" aria-hidden="true"></div>

            {/* Filter Tabs: ALL, OBSIDIAN, ASTRAL, GOLD, SILVER, BRONZE */}
            <div className="leaderboard-filter-bar" role="group" aria-label="Filter by Rank Tier">
              <button
                type="button"
                className={`lb-filter-chip ${leaderboardTab === 'all' ? 'active' : ''}`}
                onClick={() => setLeaderboardTab('all')}
              >
                All Tiers
              </button>
              <button
                type="button"
                className={`lb-filter-chip chip-obsidian ${leaderboardTab === 'obsidian' ? 'active' : ''}`}
                onClick={() => setLeaderboardTab('obsidian')}
              >
                <span>◆</span> Obsidian (21+ W)
              </button>
              <button
                type="button"
                className={`lb-filter-chip chip-platinum ${leaderboardTab === 'platinum' ? 'active' : ''}`}
                onClick={() => setLeaderboardTab('platinum')}
              >
                <span>✦</span> Astral (13–20 W)
              </button>
              <button
                type="button"
                className={`lb-filter-chip chip-gold ${leaderboardTab === 'gold' ? 'active' : ''}`}
                onClick={() => setLeaderboardTab('gold')}
              >
                <span>◈</span> Gold (7–12 W)
              </button>
              <button
                type="button"
                className={`lb-filter-chip chip-silver ${leaderboardTab === 'silver' ? 'active' : ''}`}
                onClick={() => setLeaderboardTab('silver')}
              >
                <span>❖</span> Silver (3–6 W)
              </button>
              <button
                type="button"
                className={`lb-filter-chip chip-bronze ${leaderboardTab === 'bronze' ? 'active' : ''}`}
                onClick={() => setLeaderboardTab('bronze')}
              >
                <span>▲</span> Bronze (0–2 W)
              </button>
            </div>

            {/* Current Player Status Highlight Banner */}
            <div className={`player-self-plaque rank-plaque-${rankProgress.currentTier.id}`}>
              <div className="self-plaque-avatar">
                {customProfilePhoto || currentUser?.photoURL ? (
                  <img
                    src={customProfilePhoto || currentUser?.photoURL || ''}
                    alt=""
                    style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }}
                  />
                ) : (
                  <CommanderSigilVectorIcon sigil={customCommanderAvatar} size={26} />
                )}
              </div>
              <div className="self-plaque-info">
                <div className="self-plaque-name">
                  <span>
                    {customCommanderName ||
                      (currentUser ? currentUser.displayName || currentUser.email : 'You (Local Commander)')}
                  </span>
                  <span className="self-plaque-tag">YOUR STANDING</span>
                </div>
                <div className="self-plaque-stats">
                  <span>Rank: <strong>{rankProgress.currentTier.name} {rankProgress.currentTier.numeral}</strong></span>
                  <span aria-hidden="true">·</span>
                  <span>Rating: <strong>{playerRating} ELO</strong></span>
                  <span aria-hidden="true">·</span>
                  <span>Victories: <strong>{economy.stats.wins}</strong></span>
                  <span aria-hidden="true">·</span>
                  <span>Captures: <strong>{economy.stats.captures}</strong></span>
                  <span aria-hidden="true">·</span>
                  <span>Set: <strong>{equippedArchetypeObj.name}</strong></span>
                </div>
              </div>
              {!currentUser && (
                <button
                  type="button"
                  className="self-plaque-login-btn"
                  onClick={handleGoogleLogin}
                >
                  Save to Cloud
                </button>
              )}
            </div>

            {/* Table of Live Feed Players */}
            <div className="leaderboard-table-wrap">
              <table className="leaderboard-table">
                <thead>
                  <tr>
                    <th>Rank</th>
                    <th>Commander</th>
                    <th>Tier</th>
                    <th>Rating</th>
                    <th>Wins</th>
                    <th>Captures</th>
                    <th>Piece Set</th>
                  </tr>
                </thead>
                <tbody>
                  {leaderboardPlayers
                    .filter((p) => leaderboardTab === 'all' || p.rankTier === leaderboardTab)
                    .map((p, idx) => {
                      const tierObj = RANK_TIERS.find((t) => t.id === p.rankTier) || RANK_TIERS[0];
                      const isCurrentUser = currentUser && p.userId === currentUser.uid;

                      return (
                        <tr
                          key={p.id}
                          className={`lb-row ${isCurrentUser ? 'is-self' : ''}`}
                        >
                          <td className="lb-col-rank">
                            <span className={`rank-badge rank-${idx + 1}`}>
                              #{idx + 1}
                            </span>
                          </td>
                          <td className="lb-col-user">
                            <div className="lb-user-cell">
                              {p.photoURL ? (
                                <img src={p.photoURL} alt="" className="lb-avatar-img" />
                              ) : (
                                <span className="lb-avatar-glyph">{tierObj.crestGlyph}</span>
                              )}
                              <span className="lb-user-name">
                                {p.displayName}
                                {isCurrentUser && <span className="lb-you-tag">YOU</span>}
                              </span>
                            </div>
                          </td>
                          <td className="lb-col-tier">
                            <span
                              className="lb-tier-pill"
                              style={{
                                color: tierObj.primaryHex,
                                borderColor: tierObj.primaryHex
                              }}
                            >
                              {tierObj.crestGlyph} {tierObj.name} {p.rankNumeral}
                            </span>
                          </td>
                          <td className="lb-col-rating">
                            <strong>{p.rating}</strong> ELO
                          </td>
                          <td className="lb-col-wins">{p.wins}</td>
                          <td className="lb-col-caps">{p.captures}</td>
                          <td className="lb-col-set">
                            <span className="lb-set-tag">{p.activePieceType}</span>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* 5. SETTINGS MODAL (VOLUME ADJUSTMENT, MUTE, PROFILE RANK, CLOUD SAVE)  */}
      {/* ===================================================================== */}
      {activeDialog === 'settings' && (
        <div
          className="sanctum-modal-backdrop"
          onClick={() => setActiveDialog('gateway')}
        >
          <div
            className="sanctum-modal-card settings-modal"
            id="settings-drawer"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="settings-modal-title"
          >
            <div className="sanctum-corner tl" aria-hidden="true"></div>
            <div className="sanctum-corner tr" aria-hidden="true"></div>
            <div className="sanctum-corner bl" aria-hidden="true"></div>
            <div className="sanctum-corner br" aria-hidden="true"></div>

            <div className="sanctum-modal-header">
              <div className="sanctum-header-titles">
                <div className="sanctum-modal-kicker">Sanctum Preferences</div>
                <h2 className="sanctum-modal-title" id="settings-modal-title">
                  Settings &amp; Profile
                </h2>
                <div className="sanctum-record-line">
                  <span>Audio &amp; Volume</span>
                  <span aria-hidden="true">·</span>
                  <span>Commander Profile</span>
                  <span aria-hidden="true">·</span>
                  <span>Google Cloud Save</span>
                </div>
              </div>

              <button
                type="button"
                className="sanctum-modal-close gold-trim"
                onClick={() => setActiveDialog('gateway')}
              >
                ← Back to Lobby
              </button>
            </div>

            <div className="sanctum-tapered-rule" aria-hidden="true"></div>

            <div className="sanctum-modal-body">
              {/* SECTION 1: CHANGE PROFILE — PHOTO UPLOAD, COMMANDER NAME & RANK CREST */}
              <div className="settings-section" id="settings-profile-section">
                <h3 className="settings-section-title">Change Profile — Photo, Name &amp; Crest</h3>
                <p className="settings-section-sub">
                  Upload a custom profile photo, edit your Commander display name, or choose a royal crest sigil.
                </p>

                <div className="settings-profile-upload-card">
                  <div className={`rank-portrait-shell rank-border-${displayedRankTier.id} settings-portrait-preview`}>
                    <div className="rank-border-aura" aria-hidden="true"></div>
                    <div className="rank-border-ring" aria-hidden="true"></div>
                    <div className="rank-portrait-inner">
                      {customProfilePhoto || currentUser?.photoURL ? (
                        <img
                          src={customProfilePhoto || currentUser?.photoURL || ''}
                          alt="Player Profile"
                          className="rank-commander-img"
                        />
                      ) : (
                        <div className="rank-commander-glyph-avatar">
                          <CommanderSigilVectorIcon sigil={customCommanderAvatar} size={38} />
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="settings-profile-upload-controls">
                    <div className="settings-name-field-row">
                      <label htmlFor="commander-name-input" className="settings-mini-label">
                        Commander Display Name
                      </label>
                      <input
                        id="commander-name-input"
                        type="text"
                        className="settings-name-input"
                        placeholder={currentUser?.displayName || 'Enter Commander Name...'}
                        value={customCommanderName}
                        onChange={(e) => handleCommanderNameChange(e.target.value)}
                      />
                    </div>

                    <div className="settings-photo-btn-row">
                      <input
                        ref={profileFileInputRef}
                        type="file"
                        accept="image/*"
                        style={{ display: 'none' }}
                        onChange={handleProfilePhotoUpload}
                      />
                      <button
                        type="button"
                        className="sanctum-action-btn upload-photo-btn"
                        id="btn-upload-profile-photo"
                        onClick={() => profileFileInputRef.current?.click()}
                      >
                        Upload Profile Photo
                      </button>
                      {customProfilePhoto && (
                        <button
                          type="button"
                          className="sanctum-action-btn logout-btn"
                          onClick={handleRemoveCustomPhoto}
                        >
                          Remove Photo
                        </button>
                      )}
                    </div>
                    <span className="settings-upload-hint">
                      Supports PNG, JPG, WEBP. Automatically cropped &amp; synced to your profile.
                    </span>
                  </div>
                </div>

                <div className="rank-preview-subheading">
                  Or Choose a Royal Sigil Avatar
                </div>
                <div className="profile-crest-picker" role="radiogroup" aria-label="Commander Sigil">
                  {[
                    { glyph: '♔', name: 'High King' },
                    { glyph: '♕', name: 'Empress' },
                    { glyph: '🐉', name: 'Dragon Lord' },
                    { glyph: '⚔', name: 'Sanctum Champion' },
                    { glyph: '⚡', name: 'Arcane Archon' },
                    { glyph: '🛡', name: 'Paladin Sentinel' }
                  ].map((sigil) => {
                    const isSelected = customCommanderAvatar === sigil.glyph;
                    return (
                      <button
                        key={sigil.glyph}
                        type="button"
                        role="radio"
                        aria-checked={isSelected}
                        className={`crest-picker-btn ${isSelected ? 'selected' : ''}`}
                        onClick={() => handleSelectAvatar(sigil.glyph)}
                      >
                        <span className="crest-glyph">
                          <CommanderSigilVectorIcon sigil={sigil.glyph} size={28} />
                        </span>
                        <span className="crest-name">{sigil.name}</span>
                      </button>
                    );
                  })}
                </div>

                <div className="rank-preview-subheading">
                  Rank Tier Border Effect (Preview Any Border)
                </div>
                <div className="rank-ladder-pills" role="group" aria-label="Rank Tier Border Preview">
                  {RANK_TIERS.map((tier) => {
                    const isEarned = rankProgress.currentTier.id === tier.id;
                    const isUnlocked = economy.stats.wins >= tier.minWins;
                    const isSelected = displayedRankTier.id === tier.id;
                    return (
                      <button
                        key={tier.id}
                        type="button"
                        className={`rank-tier-chip chip-${tier.id} ${isSelected ? 'selected' : ''} ${
                          isEarned ? 'earned' : ''
                        }`}
                        onClick={() =>
                          setPreviewRankTierId(tier.id === rankProgress.currentTier.id ? null : tier.id)
                        }
                      >
                        <span className="chip-glyph" aria-hidden="true">
                          <CommanderSigilVectorIcon sigil={tier.crestGlyph} size={15} />
                        </span>
                        <span className="chip-name">{tier.name}</span>
                        <span className="chip-req">
                          {isEarned ? 'ACTIVE' : isUnlocked ? 'UNLOCKED' : `${tier.minWins}W`}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* SECTION 2: AUDIO VOLUME & MUTE CONTROLS */}
              <div className="settings-section">
                <h3 className="settings-section-title">Audio &amp; Volume Controls</h3>
                <div className="settings-volume-list">
                  {/* Music Volume */}
                  <div className="volume-slider-group">
                    <div className="volume-slider-head">
                      <div className="volume-label-col">
                        <span className="volume-label">Sanctum Lobby Background Music</span>
                        <span className="volume-sub">Chamber choirs, organ &amp; war drums</span>
                      </div>
                      <div className="volume-head-right">
                        <span className="volume-val">{lobbyMusicEnabled ? `${musicVolume}%` : 'MUTED'}</span>
                        <button
                          type="button"
                          className={`volume-mute-btn ${!lobbyMusicEnabled ? 'muted' : ''}`}
                          onClick={handleToggleLobbyMusic}
                        >
                          {lobbyMusicEnabled ? 'Mute' : 'Unmute'}
                        </button>
                      </div>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={musicVolume}
                      className="volume-range-slider"
                      onChange={(e) => handleMusicVolumeChange(Number(e.target.value))}
                    />
                  </div>

                  {/* SFX Volume */}
                  <div className="volume-slider-group">
                    <div className="volume-slider-head">
                      <div className="volume-label-col">
                        <span className="volume-label">Combat &amp; UI Sound Effects (SFX)</span>
                        <span className="volume-sub">Stone shatter physics, blade slashes &amp; button clicks</span>
                      </div>
                      <div className="volume-head-right">
                        <span className="volume-val">{sfxEnabled ? `${sfxVolume}%` : 'MUTED'}</span>
                        <button
                          type="button"
                          className={`volume-mute-btn ${!sfxEnabled ? 'muted' : ''}`}
                          onClick={handleToggleSfx}
                        >
                          {sfxEnabled ? 'Mute' : 'Unmute'}
                        </button>
                      </div>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={sfxVolume}
                      className="volume-range-slider"
                      onChange={(e) => handleSfxVolumeChange(Number(e.target.value))}
                    />
                  </div>

                  {/* Victory Fanfare */}
                  <label className="settings-toggle-row">
                    <div>
                      <span className="settings-toggle-title">Checkmate &amp; Check Victory Fanfare</span>
                      <span className="settings-toggle-sub">Trumpet fanfare and voice announcement upon checkmate</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={voiceEnabled}
                      onChange={handleToggleVoiceAnnouncer}
                    />
                  </label>
                </div>
              </div>

              {/* SECTION 3: GOOGLE CLOUD SAVE & AUTH */}
              <div className="settings-section">
                <h3 className="settings-section-title">Google Cloud Save &amp; Authentication</h3>
                <div className="cloud-save-card">
                  <div className="cloud-card-info">
                    <div className="cloud-card-title">
                      {currentUser ? 'Cloud Backup Active' : 'Sign In with Google'}
                    </div>
                    <p className="cloud-card-desc">
                      {currentUser
                        ? `Connected as ${currentUser.displayName || currentUser.email}. All Gold, equipped piece sets, and match victories are safely backed up to Firebase Firestore.`
                        : 'Link your Google Account to preserve your Gold, equipped 3D piece sets, and victory rank across all mobile devices and browsers.'}
                    </p>
                    {cloudSyncMessage && (
                      <div className={`cloud-status-badge ${cloudSyncStatus}`}>
                        {cloudSyncMessage}
                      </div>
                    )}
                  </div>

                  <div className="cloud-card-actions">
                    {currentUser ? (
                      <>
                        <button
                          type="button"
                          className="sanctum-action-btn sync-btn"
                          onClick={handleManualCloudSync}
                        >
                          Sync Progress Now
                        </button>
                        <button
                          type="button"
                          className="sanctum-action-btn logout-btn"
                          onClick={handleGoogleLogout}
                        >
                          Sign Out
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        className="sanctum-action-btn google-login-btn"
                        onClick={handleGoogleLogin}
                      >
                        Sign In with Google
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div
        id="hud-bottom"
        key={`hud-bottom-${hudEntranceEpoch}`}
        className={hasStartedGame && activeDialog === 'none' ? 'hud-bottom-entrance-active' : ''}
        style={{ display: activeDialog !== 'none' ? 'none' : undefined }}
      >
        <div className="hint-pill" id="controls-hint">
          <strong>Controls:</strong> Click Piece to Move &nbsp;•&nbsp; Drag: Orbit &nbsp;•&nbsp; Scroll: Zoom &nbsp;•&nbsp; H: Hide UI
        </div>
        {gameMode === 'pass' && (
          <button
            type="button"
            className="hud-btn pass-flip-btn"
            onClick={() => getEngine()?.flipPassCameraNow?.()}
          >
            <ItchRotateCameraIcon size={13} />
            <span>Flip Cam</span>
          </button>
        )}
        <div className="captured-pill" id="captured-tray"></div>
      </div>

      <div id="checkmate-overlay" role="status" aria-live="polite">
        <div className="checkmate-banner">
          <div className="checkmate-ornament">✦ &nbsp; Sanctum Judgment &nbsp; ✦</div>
          <div className="checkmate-crown" id="checkmate-crown">♔</div>
          <div className="checkmate-title" id="checkmate-title">Checkmate</div>
          <div className="checkmate-rule"></div>
          <div className="checkmate-subtitle" id="checkmate-subtitle">
            White Triumphs • Triumphant Sovereign Knocked the Black King Off the Board
          </div>
          <div className="checkmate-impact-pill" id="checkmate-impact-pill">
            <span className="checkmate-impact-icon" aria-hidden="true">⚔</span>
            <span id="checkmate-impact-text">
              Triumphant Strike • Enemy King Knocked Off Board with Stone Debris
            </span>
          </div>
          <div className="checkmate-actions">
            <button className="checkmate-btn" id="btn-checkmate-newgame">
              New Game
            </button>
            <button
              type="button"
              className="checkmate-btn"
              id="btn-checkmate-lobby"
              onClick={() => {
                const overlay = document.getElementById('checkmate-overlay');
                if (overlay) overlay.classList.remove('visible', 'checkmate-impact-climax');
                setMobileSheetOpen(false);
                setPendingTurnHandoff(null);
                getEngine()?.quitMatchToLobby?.();
                setHasStartedGame(false);
                setActiveDialog('gateway');
              }}
            >
              Game Lobby
            </button>
            <button className="checkmate-btn secondary" id="btn-checkmate-replay">
              Replay King Fall
            </button>
            <button className="checkmate-btn secondary" id="btn-checkmate-dismiss">
              Dismiss
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
