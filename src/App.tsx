import { useEffect, useRef, useState } from 'react';
import { initWizardChess } from './wizardChessEngine.js';
import {
  PIECE_ARCHETYPES,
  PIECE_SKINS,
  BOARD_SKINS,
  WORLD_SCENERIES,
  PIECE_GOLD_BOUNTY,
  MATCH_WIN_BOUNTY,
  loadEconomyState,
  saveEconomyState,
  type EconomyState
} from './skinCatalog';

interface WizardChessAPI {
  toggleUI?: (force?: boolean) => void;
  applyPieceArchetype?: (archetype: unknown) => void;
  applyPieceSkin?: (skin: unknown) => void;
  applyBoardSkin?: (skin: unknown) => void;
  applyWorldScenery?: (scenery: unknown, options?: { flyToVista?: boolean }) => void;
  startBotMatch?: (difficulty: 'easy' | 'medium' | 'hard', side: 'w' | 'b') => void;
  startPassAndPlayMatch?: (autoFlip: boolean) => void;
  startOnlineMatchmaking?: (preferredColor?: 'w' | 'b' | 'any', rating?: number) => Promise<void>;
  cancelOnlineMatchmaking?: (reason?: string) => Promise<void>;
  createMultiplayerRoom?: (preferredColor: 'w' | 'b') => Promise<{ code: string; color: 'w' | 'b'; room: unknown }>;
  joinMultiplayerRoom?: (code: string) => Promise<boolean>;
  setBotDifficulty?: (diff: 'easy' | 'medium' | 'hard') => void;
  setPassAutoFlip?: (autoFlip: boolean) => void;
  flipPassCameraNow?: () => void;
  setVoiceAnnouncerEnabled?: (enabled: boolean) => boolean;
  setSfxEnabled?: (enabled: boolean) => boolean;
  getSfxEnabled?: () => boolean;
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
  };
}

function getEngine(): WizardChessAPI | undefined {
  return (window as unknown as { wizardChess?: WizardChessAPI }).wizardChess;
}

export default function App() {
  const initializedRef = useRef(false);
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false);
  const [uiHidden, setUiHidden] = useState(false);

  const [hasStartedGame, setHasStartedGame] = useState<boolean>(() =>
    Boolean(new URLSearchParams(window.location.search).get('room'))
  );

  // Modals: 'none' | 'arena' | 'armory' — Open Game Lobby ('arena') first on boot!
  const [activeDialog, setActiveDialog] = useState<'none' | 'arena' | 'armory'>(() =>
    new URLSearchParams(window.location.search).get('room') ? 'none' : 'arena'
  );
  const [arenaTab, setArenaTab] = useState<'bot' | 'online' | 'pass'>('bot');
  const [armoryTab, setArmoryTab] = useState<'types' | 'boards' | 'sceneries' | 'pieces'>('types');

  // Engine & Mode State
  const [gameMode, setGameMode] = useState<'single' | 'pass' | 'multi'>('single');
  const [botDifficulty, setBotDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [botSide, setBotSide] = useState<'w' | 'b'>('w');
  const [passAutoFlip, setPassAutoFlip] = useState(true);
  const [passPrivacyCurtain, setPassPrivacyCurtain] = useState(false);
  const [pendingTurnHandoff, setPendingTurnHandoff] = useState<string | null>(null);
  const [turnSwitchToast, setTurnSwitchToast] = useState<string | null>(null);
  const [inCheck, setInCheck] = useState(false);
  const [checkedColor, setCheckedColor] = useState<'w' | 'b' | null>(null);
  const [voiceEnabled, setVoiceEnabled] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('wizard_chess_voice_enabled');
      return saved === null ? true : saved !== 'false';
    } catch {
      return true;
    }
  });
  const [sfxEnabled, setSfxEnabled] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('wizard_chess_sfx_enabled');
      return saved === null ? true : saved !== 'false';
    } catch {
      return true;
    }
  });

  // Online PvP State
  const [onlinePreferredSide, setOnlinePreferredSide] = useState<'w' | 'b'>('w');
  const [matchmakingPreferredColor, setMatchmakingPreferredColor] = useState<'any' | 'w' | 'b'>('any');
  const [onlineQueueStatus, setOnlineQueueStatus] = useState<'idle' | 'searching' | 'matched'>('idle');
  const [matchmakingRemainingSec, setMatchmakingRemainingSec] = useState<number>(30);
  const [matchmakingRatingWindow, setMatchmakingRatingWindow] = useState<number>(150);
  const [matchmakingQueueCount, setMatchmakingQueueCount] = useState<number>(1);
  const [matchmakingTimedOut, setMatchmakingTimedOut] = useState<boolean>(false);
  const [activeRoomCode, setActiveRoomCode] = useState<string | null>(null);
  const [bothPlayersConnected, setBothPlayersConnected] = useState(false);
  const [onlineWhiteArmyName, setOnlineWhiteArmyName] = useState<string>('');
  const [onlineBlackArmyName, setOnlineBlackArmyName] = useState<string>('');
  const [joinCodeInput, setJoinCodeInput] = useState('');
  const [onlineStatusText, setOnlineStatusText] = useState('');

  // Economy & Skin State
  const [economy, setEconomy] = useState<EconomyState>(() => loadEconomyState());
  const [bountyToast, setBountyToast] = useState<{ id: number; amount: number; label: string } | null>(null);
  const playerRating = 1000 + economy.stats.wins * 35 + economy.stats.captures * 3;
  const equippedArchetypeObj =
    PIECE_ARCHETYPES.find((a) => a.id === economy.activePieceType) || PIECE_ARCHETYPES[0];
  const equippedPieceSkinObj =
    PIECE_SKINS.find((s) => s.id === economy.activePieceSkin) || PIECE_SKINS[0];

  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;
    initWizardChess();
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
      if (typeof d.matchStarted === 'boolean' && d.matchStarted) {
        setHasStartedGame(true);
      }
      setGameMode(d.gameMode || 'single');
      setBotDifficulty(d.botDifficulty || 'medium');
      setOnlineQueueStatus(d.onlineQueueStatus || 'idle');
      setActiveRoomCode(d.roomCode || null);
      setInCheck(Boolean(d.inCheck));
      setCheckedColor(d.checkedColor || null);
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
    window.addEventListener('wizardchess:uichange', handleUiChange);
    window.addEventListener('wizardchess:voicechange', handleVoiceChange);
    window.addEventListener('wizardchess:sfxchange', handleSfxChange);
    window.addEventListener('wizardchess:matchfound', handleMatchFound);
    window.addEventListener('wizardchess:matchmakingtick', handleMatchmakingTick);
    window.addEventListener('wizardchess:matchmakingtimeout', handleMatchmakingTimeout);
    window.addEventListener('wizardchess:roomupdate', handleRoomUpdate);
    window.addEventListener('wizardchess:turnswitch', handleTurnSwitch);

    return () => {
      window.removeEventListener('wizardchess:piececaptured', handlePieceCaptured);
      window.removeEventListener('wizardchess:matchwon', handleMatchWon);
      window.removeEventListener('wizardchess:statechange', handleStateChange);
      window.removeEventListener('wizardchess:uichange', handleUiChange);
      window.removeEventListener('wizardchess:voicechange', handleVoiceChange);
      window.removeEventListener('wizardchess:sfxchange', handleSfxChange);
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

  // --- Arena Mode Actions ---
  const handleStartBotGame = () => {
    const eng = getEngine();
    eng?.startBotMatch?.(botDifficulty, botSide);
    setHasStartedGame(true);
    setGameMode('single');
    setActiveDialog('none');
    setMobileSheetOpen(false);
  };

  const handleStartPassGame = () => {
    const eng = getEngine();
    eng?.startPassAndPlayMatch?.(passAutoFlip);
    setHasStartedGame(true);
    setGameMode('pass');
    setActiveDialog('none');
    setMobileSheetOpen(false);
  };

  const handleQuickMatchmaking = async () => {
    const eng = getEngine();
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
  const handleSelectOrBuyPieceType = (typeId: string) => {
    const arch = PIECE_ARCHETYPES.find((a) => a.id === typeId);
    if (!arch) return;

    const isOwned = economy.ownedPieceTypes.includes(arch.id);
    if (isOwned) {
      const next: EconomyState = { ...economy, activePieceType: arch.id };
      setEconomy(next);
      saveEconomyState(next);
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
    getEngine()?.applyPieceArchetype?.(arch);
  };

  const handleSelectOrBuyPieceSkin = (skinId: string) => {
    const skin = PIECE_SKINS.find((s) => s.id === skinId);
    if (!skin) return;

    const isOwned = economy.ownedPieceSkins.includes(skin.id);
    if (isOwned) {
      const next: EconomyState = { ...economy, activePieceSkin: skin.id };
      setEconomy(next);
      saveEconomyState(next);
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
    getEngine()?.applyPieceSkin?.(skin);
  };

  const handleSelectOrBuyBoardSkin = (skinId: string) => {
    const skin = BOARD_SKINS.find((s) => s.id === skinId);
    if (!skin) return;

    const isOwned = economy.ownedBoardSkins.includes(skin.id);
    if (isOwned) {
      const next: EconomyState = { ...economy, activeBoardSkin: skin.id };
      setEconomy(next);
      saveEconomyState(next);
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
    getEngine()?.applyBoardSkin?.(skin);
  };

  const handleSelectOrBuyWorldScenery = (sceneryId: string, flyToVista = true) => {
    const scenery = WORLD_SCENERIES.find((w) => w.id === sceneryId);
    if (!scenery) return;

    const isOwned = economy.ownedSceneries.includes(scenery.id);
    if (isOwned) {
      const next: EconomyState = { ...economy, activeScenery: scenery.id };
      setEconomy(next);
      saveEconomyState(next);
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
    getEngine()?.applyWorldScenery?.(scenery, { flyToVista });
  };

  const handlePreviewWorldScenery = (sceneryId: string) => {
    const scenery = WORLD_SCENERIES.find((w) => w.id === sceneryId);
    if (!scenery) return;
    getEngine()?.applyWorldScenery?.(scenery, { flyToVista: true });
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
        <div className="gold-bounty-toast" key={bountyToast.id} role="status" aria-live="polite">
          <span className="gold-coin-glyph">{bountyToast.amount > 0 ? '◈' : '⚔'}</span>
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

      <div id="hud-top" aria-hidden={uiHidden}>
        <div className="hud-group" id="hud-left">
          <div className="brand-pill">
            <span className="brand-title">Wizard Chess</span>
          </div>
          <div className={`status-pill ${inCheck ? 'in-check' : ''}`} id="status-pill">
            <span className="turn-dot" id="turn-dot"></span>
            <span id="turn-text">Select Game Mode</span>
            <span className="mode-badge" id="mode-badge">Sanctum Lobby</span>
          </div>

          <div
            className={`check-indicator-badge ${inCheck ? 'active' : ''}`}
            id="check-indicator-badge"
            role="status"
            aria-live="assertive"
            title={
              inCheck
                ? `${checkedColor === 'b' ? 'Black' : 'White'} King is in CHECK!`
                : 'No King currently in Check'
            }
          >
            <span className="check-indicator-icon" aria-hidden="true">⚔</span>
            <span className="check-indicator-label">
              {inCheck
                ? `CHECK • ${checkedColor === 'b' ? 'BLACK KING' : 'WHITE KING'}`
                : 'NO CHECK'}
            </span>
          </div>

          <button
            type="button"
            className="gold-wallet-btn"
            id="gold-wallet-badge"
            onClick={() =>
              setActiveDialog((prev) =>
                prev === 'armory' ? (hasStartedGame ? 'none' : 'arena') : 'armory'
              )
            }
            title="Gold Coins earned from shattering pieces and winning matches — Click to open Skin Armory"
          >
            <span className="gold-coin-glyph">◈</span>
            <span className="gold-wallet-amount">{economy.gold}</span>
            <span className="gold-wallet-unit">Gold</span>
          </button>
        </div>

        <button
          type="button"
          className={`hud-btn mobile-controls-trigger ${mobileSheetOpen ? 'active' : ''}`}
          id="btn-mobile-controls"
          aria-expanded={mobileSheetOpen}
          aria-controls="hud-right"
          onClick={() => setMobileSheetOpen((prev) => !prev)}
        >
          {mobileSheetOpen ? 'Close' : 'Menu'}
        </button>

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
          <div
            className="mobile-sheet-handle-wrap"
            onClick={(e) => {
              e.stopPropagation();
              setMobileSheetOpen(false);
            }}
            aria-hidden="true"
          >
            <div className="mobile-sheet-handle"></div>
          </div>

          <div className="mobile-sheet-header">
            <span className="mobile-sheet-title">Sanctum Controls</span>
            <button
              type="button"
              className="mobile-sheet-close"
              id="btn-mobile-sheet-close"
              onClick={(e) => {
                e.stopPropagation();
                setMobileSheetOpen(false);
              }}
              aria-label="Close Controls"
            >
              Close ✕
            </button>
          </div>

          <div className="mobile-sheet-section-label">Arena &amp; Armory</div>

          <button
            type="button"
            className={`hud-btn primary ${activeDialog === 'arena' ? 'active' : ''}`}
            id="btn-arena-hub"
            title="Choose Play vs Bot (Easy/Medium/Hard), Online PvP Matchmaking, or 1-Phone P1 vs P2"
            onClick={() => {
              setMobileSheetOpen(false);
              setActiveDialog((prev) =>
                prev === 'arena' ? (hasStartedGame ? 'none' : 'arena') : 'arena'
              );
            }}
          >
            Game Modes
          </button>

          <button
            type="button"
            className={`hud-btn ${activeDialog === 'armory' ? 'active' : ''}`}
            id="btn-skin-shop"
            title="Unlock and equip 3D Piece Skins and Board Themes with Gold"
            onClick={() => {
              setMobileSheetOpen(false);
              setActiveDialog((prev) =>
                prev === 'armory' ? (hasStartedGame ? 'none' : 'arena') : 'armory'
              );
            }}
          >
            Skin Shop ({economy.gold}G)
          </button>

          <div className="hud-divider" aria-hidden="true"></div>
          <div className="mobile-sheet-section-label">Game Actions</div>

          <button
            className="hud-btn"
            id="btn-side-toggle"
            title="Switch between Playing as White and Playing as Black"
            onClick={() => setMobileSheetOpen(false)}
          >
            Play as Black
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
            title="Start a fresh game on the altar"
            onClick={() => setMobileSheetOpen(false)}
          >
            New Game
          </button>

          <div className="hud-divider" aria-hidden="true"></div>
          <div className="mobile-sheet-section-label">
            <span>Camera Views</span>
            <span className="mobile-sheet-section-sub">Tap active view to flip</span>
          </div>

          <button
            className="hud-btn active"
            id="btn-cam-player"
            title="Player Camera (Click again to flip White / Black view)"
          >
            Player Cam
          </button>
          <button
            className="hud-btn"
            id="btn-cam-top"
            title="Overhead Board View (Click again to flip White / Black orientation)"
          >
            Overhead
          </button>
          <button
            className="hud-btn"
            id="btn-cam-side"
            title="Side Profile View (Click again to switch East / West side)"
          >
            Side
          </button>
          <button
            className="hud-btn"
            id="btn-cam-wide"
            title="Wide Cathedral View (Click again to switch North Rose / South Narthex)"
          >
            Cathedral
          </button>

          <div className="hud-divider" aria-hidden="true"></div>
          <div className="mobile-sheet-section-label">Display, Voice &amp; Gestures</div>

          <button
            type="button"
            className={`hud-btn ${sfxEnabled ? 'active' : ''}`}
            id="btn-sfx-toggle"
            title="Toggle Combat & Piece Kill Sound Effects (SFX)"
            onClick={handleToggleSfx}
          >
            {sfxEnabled ? 'SFX: ON' : 'SFX: OFF'}
          </button>

          <button
            type="button"
            className={`hud-btn ${voiceEnabled ? 'active' : ''}`}
            id="btn-voice-toggle"
            title="Toggle Gothic Sanctum Voice & Horn Announcer"
            onClick={handleToggleVoiceAnnouncer}
          >
            {voiceEnabled ? 'Voice: ON' : 'Voice: OFF'}
          </button>

          <button
            className="hud-btn"
            id="btn-hide-ui"
            title="Toggle HUD visibility (Shortcut: H)"
            onClick={() => setMobileSheetOpen(false)}
          >
            Hide UI [H]
          </button>

          <div className="mobile-sheet-hint">
            <strong>Touch:</strong> Tap Piece to Move &nbsp;•&nbsp; 1-Finger Drag: Orbit &nbsp;•&nbsp; 2-Finger Drag: Pan &nbsp;•&nbsp; Pinch: Zoom
          </div>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* SANCTUM GAME LOBBY (Vs Bot / Online PvP / 1-Phone P1 vs P2)           */}
      {/* ===================================================================== */}
      {activeDialog === 'arena' && (
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

              <div className="armory-header-right">
                <button
                  type="button"
                  className="sanctum-modal-close gold-trim"
                  onClick={() => setActiveDialog('armory')}
                >
                  Reliquary &amp; Skins
                </button>
                {hasStartedGame && (
                  <button
                    type="button"
                    className="sanctum-modal-close"
                    onClick={() => setActiveDialog('none')}
                  >
                    Return to Board
                  </button>
                )}
              </div>
            </div>

            <div className="sanctum-tapered-rule" aria-hidden="true"></div>

            {/* Engraved 3-Slot Sanctum Loadout Ledger */}
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

            <div className="sanctum-tab-bar" role="tablist">
              <button
                type="button"
                role="tab"
                aria-selected={arenaTab === 'bot'}
                className={`sanctum-tab-btn ${arenaTab === 'bot' ? 'active' : ''}`}
                onClick={() => setArenaTab('bot')}
              >
                <span className="tab-numeral">I.</span> Play vs Bot
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={arenaTab === 'online'}
                className={`sanctum-tab-btn ${arenaTab === 'online' ? 'active' : ''}`}
                onClick={() => setArenaTab('online')}
              >
                <span className="tab-numeral">II.</span> Online Match
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={arenaTab === 'pass'}
                className={`sanctum-tab-btn ${arenaTab === 'pass' ? 'active' : ''}`}
                onClick={() => setArenaTab('pass')}
              >
                <span className="tab-numeral">III.</span> Pass &amp; Play (1 Phone)
              </button>
            </div>

            {/* TAB 1: PLAY VS BOT (Easy, Medium, Hard) */}
            {arenaTab === 'bot' && (
              <div className="sanctum-modal-body">
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
              <div className="sanctum-modal-body">
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
              <div className="sanctum-modal-body">
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
            className="sanctum-modal-card wide"
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
                  <span>Pawn <strong>+15G</strong></span>
                  <span aria-hidden="true">·</span>
                  <span>Knight / Bishop <strong>+35G</strong></span>
                  <span aria-hidden="true">·</span>
                  <span>Rook <strong>+55G</strong></span>
                  <span aria-hidden="true">·</span>
                  <span>Queen <strong>+95G</strong></span>
                  <span aria-hidden="true">·</span>
                  <span>Match Win <strong>+150G–350G</strong></span>
                </div>
              </div>

              <div className="armory-header-right">
                <div className="armory-treasury-readout">
                  <span className="treasury-label">Treasury</span>
                  <span className="treasury-amount">{economy.gold} Gold</span>
                </div>
                <button
                  type="button"
                  className="sanctum-modal-close"
                  onClick={() => setActiveDialog(hasStartedGame ? 'none' : 'arena')}
                >
                  {hasStartedGame ? 'Return to Board' : 'Back to Lobby'}
                </button>
              </div>
            </div>

            <div className="sanctum-tapered-rule" aria-hidden="true"></div>

            <div className="sanctum-tab-bar" role="tablist">
              <button
                type="button"
                role="tab"
                aria-selected={armoryTab === 'types'}
                className={`sanctum-tab-btn ${armoryTab === 'types' ? 'active' : ''}`}
                onClick={() => setArmoryTab('types')}
              >
                <span className="tab-numeral">I.</span> Sculptures ({economy.ownedPieceTypes.length}/{PIECE_ARCHETYPES.length})
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={armoryTab === 'sceneries'}
                className={`sanctum-tab-btn ${armoryTab === 'sceneries' ? 'active' : ''}`}
                onClick={() => setArmoryTab('sceneries')}
              >
                <span className="tab-numeral">II.</span> Sceneries ({economy.ownedSceneries.length}/{WORLD_SCENERIES.length})
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={armoryTab === 'boards'}
                className={`sanctum-tab-btn ${armoryTab === 'boards' ? 'active' : ''}`}
                onClick={() => setArmoryTab('boards')}
              >
                <span className="tab-numeral">III.</span> Boards ({economy.ownedBoardSkins.length}/{BOARD_SKINS.length})
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={armoryTab === 'pieces'}
                className={`sanctum-tab-btn ${armoryTab === 'pieces' ? 'active' : ''}`}
                onClick={() => setArmoryTab('pieces')}
              >
                <span className="tab-numeral">IV.</span> Finishes ({economy.ownedPieceSkins.length}/{PIECE_SKINS.length})
              </button>
            </div>

            {armoryTab === 'types' && (
              <div className="skin-grid">
                {PIECE_ARCHETYPES.map((arch) => {
                  const isOwned = economy.ownedPieceTypes.includes(arch.id);
                  const isEquipped = economy.activePieceType === arch.id;
                  const canAfford = economy.gold >= arch.price;

                  return (
                    <div
                      key={arch.id}
                      className={`skin-card ${isEquipped ? 'equipped' : ''}`}
                    >
                      <div className="skin-swatch-row">
                        <span
                          className="skin-kicker-tag"
                          style={{ color: arch.flashColorHex }}
                        >
                          {arch.badge}
                        </span>
                        <span className="skin-price-tag">
                          {isOwned ? 'Unlocked' : `${arch.price} Gold`}
                        </span>
                      </div>

                      <div className="skin-card-title">{arch.name}</div>
                      <p className="skin-card-sub">{arch.subtitle}</p>
                      <div className="skin-meta-line">
                        <span>Strike: <strong>{arch.strikeStyle}</strong></span>
                        <span aria-hidden="true">·</span>
                        <span>Shatter: <strong>{arch.shatterStyle}</strong></span>
                      </div>

                      <button
                        type="button"
                        className={`skin-action-btn ${
                          isEquipped ? 'equipped' : isOwned ? 'owned' : canAfford ? 'buyable' : 'locked'
                        }`}
                        disabled={!isOwned && !canAfford}
                        onClick={() => handleSelectOrBuyPieceType(arch.id)}
                      >
                        {isEquipped
                          ? 'Equipped'
                          : isOwned
                          ? 'Equip Sculpture Set'
                          : canAfford
                          ? `Unlock · ${arch.price} Gold`
                          : `Requires ${arch.price} Gold`}
                      </button>
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
                  const canAfford = economy.gold >= skin.price;

                  return (
                    <div
                      key={skin.id}
                      className={`skin-card ${isEquipped ? 'equipped' : ''}`}
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
                        <span className="skin-price-tag">
                          {isOwned ? 'Unlocked' : `${skin.price} Gold`}
                        </span>
                      </div>

                      <div className="skin-card-title">{skin.name}</div>
                      <p className="skin-card-sub">{skin.subtitle}</p>

                      <button
                        type="button"
                        className={`skin-action-btn ${
                          isEquipped ? 'equipped' : isOwned ? 'owned' : canAfford ? 'buyable' : 'locked'
                        }`}
                        disabled={!isOwned && !canAfford}
                        onClick={() => handleSelectOrBuyPieceSkin(skin.id)}
                      >
                        {isEquipped
                          ? 'Equipped'
                          : isOwned
                          ? 'Equip Finish'
                          : canAfford
                          ? `Unlock · ${skin.price} Gold`
                          : `Requires ${skin.price} Gold`}
                      </button>
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
                  const canAfford = economy.gold >= bSkin.price;

                  return (
                    <div
                      key={bSkin.id}
                      className={`skin-card ${isEquipped ? 'equipped' : ''}`}
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
                        <span className="skin-price-tag">
                          {isOwned ? 'Unlocked' : `${bSkin.price} Gold`}
                        </span>
                      </div>

                      <div className="skin-card-title">{bSkin.name}</div>
                      <p className="skin-card-sub">{bSkin.subtitle}</p>
                      <div className="skin-meta-line">
                        <span>Sanctum Chamber: <strong>{bSkin.environmentLabel}</strong></span>
                      </div>

                      <button
                        type="button"
                        className={`skin-action-btn ${
                          isEquipped ? 'equipped' : isOwned ? 'owned' : canAfford ? 'buyable' : 'locked'
                        }`}
                        disabled={!isOwned && !canAfford}
                        onClick={() => handleSelectOrBuyBoardSkin(bSkin.id)}
                      >
                        {isEquipped
                          ? 'Equipped'
                          : isOwned
                          ? 'Equip Board & Chamber'
                          : canAfford
                          ? `Unlock · ${bSkin.price} Gold`
                          : `Requires ${bSkin.price} Gold`}
                      </button>
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
                  const canAfford = economy.gold >= scenery.price;

                  return (
                    <div
                      key={scenery.id}
                      className={`skin-card scenery-card ${isEquipped ? 'equipped' : ''}`}
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
                        <span className="skin-price-tag">
                          {isOwned ? 'Unlocked' : `${scenery.price} Gold`}
                        </span>
                      </div>

                      <div className="skin-card-title">{scenery.name}</div>
                      <p className="skin-card-sub">{scenery.subtitle}</p>
                      <div className="skin-meta-line">
                        <span>Landmarks: <strong>{scenery.landmarksLabel}</strong></span>
                      </div>
                      <div className="skin-meta-line">
                        <span>Atmosphere: <strong>{scenery.weatherLabel}</strong></span>
                      </div>

                      <div className="scenery-card-actions">
                        <button
                          type="button"
                          className={`skin-action-btn ${
                            isEquipped ? 'equipped' : isOwned ? 'owned' : canAfford ? 'buyable' : 'locked'
                          }`}
                          disabled={!isOwned && !canAfford}
                          onClick={() => handleSelectOrBuyWorldScenery(scenery.id, true)}
                        >
                          {isEquipped
                            ? 'Equipped Realm'
                            : isOwned
                            ? 'Equip World Scenery'
                            : canAfford
                            ? `Unlock · ${scenery.price} Gold`
                            : `Requires ${scenery.price} Gold`}
                        </button>
                        <button
                          type="button"
                          className="sanctum-modal-close scenery-preview-btn"
                          title="Fly camera out to preview this 3D World Scenery live around the board"
                          onClick={() => handlePreviewWorldScenery(scenery.id)}
                        >
                          Preview 3D
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      <div id="hud-bottom">
        <div className="hint-pill" id="controls-hint">
          <strong>Controls:</strong> Click Piece to Move &nbsp;•&nbsp; Left-Drag: Orbit &nbsp;•&nbsp; Right-Drag: Pan &nbsp;•&nbsp; Scroll: Zoom &nbsp;•&nbsp; WASD + R/F: Fly Cam &nbsp;•&nbsp; H: Hide UI
        </div>
        {gameMode === 'pass' && (
          <button
            type="button"
            className="hud-btn pass-flip-btn"
            onClick={() => getEngine()?.flipPassCameraNow?.()}
          >
            Flip Turn Camera ↻
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
            White Triumphs • The Black King Has Fallen
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
                if (overlay) overlay.classList.remove('visible');
                setActiveDialog('arena');
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
