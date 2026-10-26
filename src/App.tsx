import { useEffect, useRef, useState } from 'react';
import { initWizardChess } from './wizardChessEngine.js';
import {
  PIECE_ARCHETYPES,
  PIECE_SKINS,
  BOARD_SKINS,
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
  startBotMatch?: (difficulty: 'easy' | 'medium' | 'hard', side: 'w' | 'b') => void;
  startPassAndPlayMatch?: (autoFlip: boolean) => void;
  startOnlineMatchmaking?: (preferredColor?: 'w' | 'b' | 'any') => Promise<void>;
  cancelOnlineMatchmaking?: () => Promise<void>;
  createMultiplayerRoom?: (preferredColor: 'w' | 'b') => Promise<{ code: string; color: 'w' | 'b'; room: unknown }>;
  joinMultiplayerRoom?: (code: string) => Promise<boolean>;
  setBotDifficulty?: (diff: 'easy' | 'medium' | 'hard') => void;
  setPassAutoFlip?: (autoFlip: boolean) => void;
  flipPassCameraNow?: () => void;
  setVoiceAnnouncerEnabled?: (enabled: boolean) => boolean;
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
  const [armoryTab, setArmoryTab] = useState<'types' | 'pieces' | 'boards'>('types');

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

  // Online PvP State
  const [onlinePreferredSide, setOnlinePreferredSide] = useState<'w' | 'b'>('w');
  const [onlineQueueStatus, setOnlineQueueStatus] = useState<'idle' | 'searching' | 'matched'>('idle');
  const [activeRoomCode, setActiveRoomCode] = useState<string | null>(null);
  const [bothPlayersConnected, setBothPlayersConnected] = useState(false);
  const [joinCodeInput, setJoinCodeInput] = useState('');
  const [onlineStatusText, setOnlineStatusText] = useState('');

  // Economy & Skin State
  const [economy, setEconomy] = useState<EconomyState>(() => loadEconomyState());
  const [bountyToast, setBountyToast] = useState<{ id: number; amount: number; label: string } | null>(null);

  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;
    initWizardChess();
  }, []);

  // Apply saved piece archetype, piece material skin & 3D board style when engine is ready or when equipped items change
  useEffect(() => {
    const applyEquippedSkins = () => {
      const eng = getEngine();
      if (!eng) return;
      const pArch = PIECE_ARCHETYPES.find((a) => a.id === economy.activePieceType) || PIECE_ARCHETYPES[0];
      const pSkin = PIECE_SKINS.find((s) => s.id === economy.activePieceSkin) || PIECE_SKINS[0];
      const bSkin = BOARD_SKINS.find((s) => s.id === economy.activeBoardSkin) || BOARD_SKINS[0];
      eng.applyPieceSkin?.(pSkin);
      eng.applyPieceArchetype?.(pArch);
      eng.applyBoardSkin?.(bSkin);
    };

    applyEquippedSkins();
    window.addEventListener('wizardchess:ready', applyEquippedSkins);
    return () => window.removeEventListener('wizardchess:ready', applyEquippedSkins);
  }, [economy.activePieceType, economy.activePieceSkin, economy.activeBoardSkin]);

  // Listen to engine events for Gold bounties, Matchmaking, and 1-Phone Turn Switching
  useEffect(() => {
    const showRewardToast = (amount: number, label: string) => {
      setBountyToast({ id: Date.now(), amount, label });
    };

    const handlePieceCaptured = (ev: Event) => {
      const detail = (ev as CustomEvent).detail;
      if (!detail || !detail.isHumanCapture) return;
      const cType = String(detail.capturedType || 'pawn').toLowerCase();
      const goldEarned = PIECE_GOLD_BOUNTY[cType] || 20;
      const typeName = cType.charAt(0).toUpperCase() + cType.slice(1);

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

      showRewardToast(goldEarned, `${typeName} Destroyed!`);
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

    const handleMatchFound = (ev: Event) => {
      const d = (ev as CustomEvent).detail;
      if (!d) return;
      setHasStartedGame(true);
      setOnlineQueueStatus('matched');
      setActiveRoomCode(d.code || null);
      setBothPlayersConnected(true);
      setOnlineStatusText(`Matched! Playing as ${d.color === 'b' ? 'Black' : 'White'} in Room ${d.code}`);
      setActiveDialog('none');
    };

    const handleRoomUpdate = (ev: Event) => {
      const d = (ev as CustomEvent).detail;
      if (!d) return;
      setActiveRoomCode(d.code || null);
      setBothPlayersConnected(Boolean(d.bothReady));
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
    window.addEventListener('wizardchess:matchfound', handleMatchFound);
    window.addEventListener('wizardchess:roomupdate', handleRoomUpdate);
    window.addEventListener('wizardchess:turnswitch', handleTurnSwitch);

    return () => {
      window.removeEventListener('wizardchess:piececaptured', handlePieceCaptured);
      window.removeEventListener('wizardchess:matchwon', handleMatchWon);
      window.removeEventListener('wizardchess:statechange', handleStateChange);
      window.removeEventListener('wizardchess:uichange', handleUiChange);
      window.removeEventListener('wizardchess:voicechange', handleVoiceChange);
      window.removeEventListener('wizardchess:matchfound', handleMatchFound);
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
      if (window.innerWidth > 1080 && window.innerHeight > 560) {
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
    setOnlineStatusText('Searching for an online opponent...');
    setOnlineQueueStatus('searching');
    await eng?.startOnlineMatchmaking?.(onlinePreferredSide);
  };

  const handleCancelMatchmaking = async () => {
    const eng = getEngine();
    await eng?.cancelOnlineMatchmaking?.();
    setOnlineQueueStatus('idle');
    setOnlineStatusText('Matchmaking canceled.');
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

  return (
    <>
      <div id="loading-overlay">
        <div className="loader-title">Wizard Chess</div>
        <div className="loader-bar-wrap">
          <div className="loader-bar" id="loader-bar"></div>
        </div>
        <div id="loader-text">Summoning Sanctum Architecture &amp; Sculpted Pieces...</div>
      </div>

      <div id="canvas-container"></div>

      {/* Floating Gold Bounty Notification */}
      {bountyToast && (
        <div className="gold-bounty-toast" key={bountyToast.id} role="status" aria-live="polite">
          <span className="gold-coin-glyph">◈</span>
          <span className="gold-bounty-amount">+{bountyToast.amount} Gold</span>
          <span className="gold-bounty-sep">·</span>
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
                        Pair automatically with an available challenger in the cathedral queue. Victory grants +300 Gold.
                      </p>
                    </div>
                  </div>

                  {onlineQueueStatus === 'searching' ? (
                    <div className="matchmaking-searching-box">
                      <div className="searching-spinner" aria-hidden="true"></div>
                      <div className="searching-text-wrap">
                        <div className="searching-title">Searching for Challenger...</div>
                        <div className="searching-sub">
                          Open another window or invite a friend to queue and pair immediately.
                        </div>
                      </div>
                      <button
                        type="button"
                        className="sanctum-modal-close"
                        onClick={handleCancelMatchmaking}
                      >
                        Leave Queue
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      className="arena-primary-btn"
                      onClick={handleQuickMatchmaking}
                    >
                      Find Online Match
                    </button>
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
                <span className="tab-numeral">I.</span> Piece Sculptures ({economy.ownedPieceTypes.length}/{PIECE_ARCHETYPES.length})
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={armoryTab === 'boards'}
                className={`sanctum-tab-btn ${armoryTab === 'boards' ? 'active' : ''}`}
                onClick={() => setArmoryTab('boards')}
              >
                <span className="tab-numeral">II.</span> Board &amp; Sanctum ({economy.ownedBoardSkins.length}/{BOARD_SKINS.length})
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={armoryTab === 'pieces'}
                className={`sanctum-tab-btn ${armoryTab === 'pieces' ? 'active' : ''}`}
                onClick={() => setArmoryTab('pieces')}
              >
                <span className="tab-numeral">III.</span> Material Finishes ({economy.ownedPieceSkins.length}/{PIECE_SKINS.length})
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
