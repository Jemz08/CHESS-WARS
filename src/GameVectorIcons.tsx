import React from 'react';

interface IconProps {
  size?: number;
  className?: string;
}

/**
 * Cozy FreeGameUI-inspired rounded vector silhouettes & botanical paths
 * Designed for Warm Honey-Wood, Cream Parchment & Soft Gold Medallions
 */
const COZY_PATHS = {
  roundedShield:
    'M0 -28 C12 -28 22 -23 25 -17 C27 -2 21 15 3 26 C1 27.5 -1 27.5 -3 26 C-21 15 -27 -2 -25 -17 C-22 -23 -12 -28 0 -28 Z',
  cozySword:
    'M-18 18 L-11 11 M-14 21 L-21 14 C-22.5 12.5 -22.5 10 -21 8.5 L-17 4.5 L-4.5 17 L-8.5 21 C-10 22.5 -12.5 22.5 -14 21 Z M-15 2 L14 -24 C17 -26.5 22 -26.5 24.5 -24 C26.5 -22 26.5 -17 24 -14 L-2 15 Z',
  cozyCrown:
    'M-21 13 L-24 -6 C-24.4 -8.5 -21.5 -10 -19.5 -8.2 L-11 -0.5 L-2.2 -15.5 C-1.1 -17.5 1.1 -17.5 2.2 -15.5 L11 -0.5 L19.5 -8.2 C21.5 -10 24.4 -8.5 24 -6 L21 13 C20.5 16.5 17 19 13 19 H-13 C-17 19 -20.5 16.5 -21 13 Z',
  cozyTrophy:
    'M-15 -18 H15 V-6 C15 4 8.5 11 0 11 C-8.5 11 -15 4 -15 -6 Z M-15 -13 H-22 C-24 -13 -25 -11 -24.5 -8 C-23.5 -2 -19 2 -14 2 M15 -13 H22 C24 -13 25 -11 24.5 -8 C23.5 -2 19 2 14 2 M0 11 V20 M-11 21 H11 C13 21 14 22.5 14 24.5 H-14 C-14 22.5 -13 21 -11 21 Z',
  cozyPouch:
    'M-9 -19 C-11 -22 -9 -25 -5 -24 C-2 -23 2 -23 5 -24 C9 -25 11 -22 9 -19 L6 -13 C16 -8 21 4 19 15 C17.5 22 10 25 0 25 C-10 25 -17.5 22 -19 15 C-21 4 -16 -8 -6 -13 Z',
  cozyFlame:
    'M2 -25 C12 -15 19 -3 17 9 C15.5 18.5 8.5 25 0 25 C-9.5 25 -17 17.5 -17 7.5 C-17 1 -13 -5 -9 -9 C-9 -3 -5 0 -2 -4 C1 -8 -3 -17 2 -25 Z',
  cozyHourglass:
    'M-15 -22 H15 M-15 22 H15 M-12 -22 C-12 -10 -3 -4 -3 0 C-3 4 -12 10 -12 22 H12 C12 10 3 4 3 0 C3 -4 12 -10 12 -22 Z',
  chessKing:
    'M0 -27 V-19 M-4 -23 H4 M-9 -14 C-9 -17 9 -17 9 -14 L12 -3 C12 2 8 5 7 11 L9 18 H-9 L-7 11 C-8 5 -12 2 -12 -3 Z M-13 22 H13 C15 22 16 23.5 16 25.5 H-16 C-16 23.5 -15 22 -13 22 Z',
  chessQueen:
    'M-17 -11 L-9 -2 L0 -14 L9 -2 L17 -11 L13 13 H-13 Z M-13 18 H13 C15 18 16 20 16 22 H-16 C-16 20 -15 18 -13 18 Z',
  chessRook:
    'M-13 -18 V-11 H-7 V-18 H-2 V-11 H2 V-18 H7 V-11 H13 V-18 H16 V-6 L11 -1 L13 17 H-13 L-11 -1 L-16 -6 V-18 Z M-15 21 H15 C16.5 21 17.5 22.5 17.5 24.5 H-17.5 C-17.5 22.5 -16.5 21 -15 21 Z',
  chessBishop:
    'M0 -23 C2.5 -23 4.5 -21 4.5 -18.5 C4.5 -16 2.5 -14 0 -14 C-2.5 -14 -4.5 -16 -4.5 -18.5 C-4.5 -21 -2.5 -23 0 -23 Z M0 -13 C9 -8 11 3 8 13 L11 18 H-11 L-8 13 C-11 3 -9 -8 0 -13 Z M-14 22 H14',
  chessKnight:
    'M-6 -19 L4 -21 C12 -19 16 -10 14 2 L11 17 H-12 L-8 4 C-3 3 0 -1 -1 -5 L-9 -2 C-13 -1 -16 -4 -14 -9 L-8 -16 Z M-14 21 H14',
  chessPawn:
    'M0 -20 C5.5 -20 10 -15.5 10 -10 C10 -5.5 7 -2 3 -0.5 L9 17 H-9 L-3 -0.5 C-7 -2 -10 -5.5 -10 -10 C-10 -15.5 -5.5 -20 0 -20 Z M-13 21 H13'
};

/**
 * Shared Warm Honey-Wood, Cream Parchment & Soft Gold Medallion Base
 */
const CozyMedallionBase: React.FC<{
  idPrefix: string;
  innerTintTop?: string;
  innerTintBottom?: string;
}> = ({ idPrefix, innerTintTop = '#FFFDF7', innerTintBottom = '#F3DFBA' }) => (
  <>
    <defs>
      <linearGradient id={`${idPrefix}_woodRim`} x1="-32" y1="-32" x2="32" y2="32" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#FCE394" />
        <stop offset="45%" stopColor="#E09F32" />
        <stop offset="100%" stopColor="#8C5410" />
      </linearGradient>
      <radialGradient id={`${idPrefix}_creamCore`} cx="38%" cy="30%" r="70%">
        <stop offset="0%" stopColor={innerTintTop} />
        <stop offset="72%" stopColor={innerTintBottom} />
        <stop offset="100%" stopColor="#E2C38D" />
      </radialGradient>
      <linearGradient id={`${idPrefix}_goldArt`} x1="-22" y1="-24" x2="22" y2="24" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#FFF6C9" />
        <stop offset="42%" stopColor="#F5C344" />
        <stop offset="88%" stopColor="#C88214" />
        <stop offset="100%" stopColor="#8A5208" />
      </linearGradient>
    </defs>
    {/* Warm Drop Shadow */}
    <circle cx="0" cy="2.2" r="32" fill="rgba(104, 62, 16, 0.24)" />
    {/* Outer Honey-Gold Beveled Ring */}
    <circle cx="0" cy="0" r="32" fill={`url(#${idPrefix}_woodRim)`} stroke="#6E3F08" strokeWidth="2.2" />
    {/* Warm Parchment Cream Core */}
    <circle cx="0" cy="0" r="27" fill={`url(#${idPrefix}_creamCore)`} stroke="#C68B34" strokeWidth="1.6" />
    {/* Cozy Stitched Inner Filigree Ring */}
    <circle
      cx="0"
      cy="0"
      r="23.5"
      fill="none"
      stroke="#D49B3E"
      strokeWidth="1.1"
      strokeDasharray="3.2 2.6"
      opacity="0.72"
    />
    {/* Top & Bottom Mini Leaf/Star Dots */}
    <circle cx="0" cy="-29.3" r="1.7" fill="#FFFDF5" />
    <circle cx="0" cy="29.3" r="1.7" fill="#FFFDF5" />
    <circle cx="-29.3" cy="0" r="1.7" fill="#FFFDF5" />
    <circle cx="29.3" cy="0" r="1.7" fill="#FFFDF5" />
  </>
);

/**
 * 1. PLAY — Cozy Honey-Wood Shield & Crossed Storybook Swords Badge
 */
export const PlaySwordsVectorIcon: React.FC<IconProps> = ({ size = 28, className = '' }) => (
  <svg
    width={size}
    height={size}
    viewBox="-36 -36 72 72"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`game-vector-icon cozy-vector-badge ${className}`}
  >
    <CozyMedallionBase idPrefix="cozyPlay" innerTintTop="#FFFDF6" innerTintBottom="#F8E4B8" />
    {/* Cozy Rounded Shield */}
    <path
      d={COZY_PATHS.roundedShield}
      fill="url(#cozyPlay_goldArt)"
      stroke="#6E3F08"
      strokeWidth="2.4"
      transform="scale(0.68)"
    />
    {/* Crossed Rounded Blades */}
    <g stroke="#5C3406" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M-15 15 L15 -15" stroke="#FFFDF9" strokeWidth="4.6" />
      <path d="M-15 15 L15 -15" stroke="#D98B1E" strokeWidth="2.4" />
      <path d="M-16 8 L-8 16" stroke="#8C5410" strokeWidth="3.2" />
      <path d="M15 15 L-15 -15" stroke="#FFFDF9" strokeWidth="4.6" />
      <path d="M15 15 L-15 -15" stroke="#D98B1E" strokeWidth="2.4" />
      <path d="M8 16 L16 8" stroke="#8C5410" strokeWidth="3.2" />
    </g>
    {/* Center Cozy Star Gem */}
    <polygon
      points="0,-7 2.2,-2.2 7,0 2.2,2.2 0,7 -2.2,2.2 -7,0 -2.2,-2.2"
      fill="#FF6B4A"
      stroke="#FFFDF6"
      strokeWidth="1.4"
    />
  </svg>
);

export const CrossedSwordsVectorIcon = PlaySwordsVectorIcon;

/**
 * 2. SKINS — Cozy Royal Crown & Leaf Medallion Badge
 */
export const SkinsCrownVectorIcon: React.FC<IconProps> = ({ size = 28, className = '' }) => (
  <svg
    width={size}
    height={size}
    viewBox="-36 -36 72 72"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`game-vector-icon cozy-vector-badge ${className}`}
  >
    <CozyMedallionBase idPrefix="cozyCrown" innerTintTop="#FFFDF7" innerTintBottom="#F6E2BA" />
    <path
      d={COZY_PATHS.cozyCrown}
      fill="url(#cozyCrown_goldArt)"
      stroke="#6E3F08"
      strokeWidth="2.4"
      strokeLinejoin="round"
      transform="translate(0, 2) scale(0.84)"
    />
    {/* Crown Pillow Band */}
    <rect x="-14" y="12" width="28" height="4.5" rx="2.2" fill="#E85D4A" stroke="#6E3F08" strokeWidth="1.4" />
    {/* Crown Pearl Tips & Cabochons */}
    <circle cx="0" cy="-14" r="3.2" fill="#38BDF8" stroke="#FFFDF7" strokeWidth="1.2" />
    <circle cx="-18" cy="-6" r="2.7" fill="#F43F5E" stroke="#FFFDF7" strokeWidth="1.1" />
    <circle cx="18" cy="-6" r="2.7" fill="#10B981" stroke="#FFFDF7" strokeWidth="1.1" />
    <circle cx="0" cy="4" r="2.4" fill="#FFFDF7" />
  </svg>
);

export const ArmoryChestVectorIcon = SkinsCrownVectorIcon;

/**
 * 3. LOGIN (GOOGLE) — Cozy Sky-Parchment & Gold Crest Seal
 */
export const GoogleShieldVectorIcon: React.FC<IconProps> = ({ size = 28, className = '' }) => (
  <svg
    width={size}
    height={size}
    viewBox="-36 -36 72 72"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`game-vector-icon cozy-vector-badge ${className}`}
  >
    <CozyMedallionBase idPrefix="cozyGoogle" innerTintTop="#F7FCFF" innerTintBottom="#DCEFFC" />
    <path
      d={COZY_PATHS.roundedShield}
      fill="#FFFDF8"
      stroke="#B87818"
      strokeWidth="2.5"
      transform="scale(0.76)"
    />
    <path
      d="M7.5 -2.5 H0 V2.8 H4.8 C4.2 5.5 2.1 7 0 7 C-3.9 7 -7 3.9 -7 0 C-7 -3.9 -3.9 -7 0 -7 C1.8 -7 3.4 -6.2 4.6 -5.1 L8.1 -8.6 C6 -10.6 3.2 -11.8 0 -11.8 C-6.6 -11.8 -11.8 -6.6 -11.8 0 C-11.8 6.6 -6.6 11.8 0 11.8 C6.1 11.8 11.4 7.4 11.4 0 C11.4 -0.9 11.3 -1.8 11.1 -2.5 H7.5 Z"
      fill="url(#cozyGoogle_goldArt)"
      stroke="#7A4808"
      strokeWidth="0.9"
    />
  </svg>
);

/**
 * 4. GOOGLE SYNCED — Cozy Meadow-Emerald & Gold Check Medallion
 */
export const CloudCheckVectorIcon: React.FC<IconProps> = ({ size = 28, className = '' }) => (
  <svg
    width={size}
    height={size}
    viewBox="-36 -36 72 72"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`game-vector-icon cozy-vector-badge ${className}`}
  >
    <CozyMedallionBase idPrefix="cozySync" innerTintTop="#F4FFF8" innerTintBottom="#CCF5DC" />
    <circle cx="0" cy="0" r="18" fill="#22A06B" stroke="#8C5410" strokeWidth="2.2" />
    <path
      d="M-8 0.5 L-2.2 6.5 L9 -5"
      stroke="#FFFDF7"
      strokeWidth="4.4"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

/**
 * 5. LIVE LEADERBOARDS — Cozy Golden Chalice & Laurel Wreath Medallion
 */
export const TrophyChaliceVectorIcon: React.FC<IconProps> = ({ size = 28, className = '' }) => (
  <svg
    width={size}
    height={size}
    viewBox="-36 -36 72 72"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`game-vector-icon cozy-vector-badge ${className}`}
  >
    <CozyMedallionBase idPrefix="cozyTrophy" innerTintTop="#FFFDF7" innerTintBottom="#F7E3B6" />
    {/* Left & Right Botanical Laurel Sprigs */}
    <path
      d="M-19 10 C-23 2 -21 -9 -14 -15 M19 10 C23 2 21 -9 14 -15"
      stroke="#5A9E4B"
      strokeWidth="2.6"
      strokeLinecap="round"
    />
    {/* Rounded Trophy Goblet */}
    <path
      d={COZY_PATHS.cozyTrophy}
      fill="url(#cozyTrophy_goldArt)"
      stroke="#6E3F08"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      transform="scale(0.78)"
    />
    <polygon points="0,-10 1.8,-5.5 6.5,-5.5 2.8,-2.5 4.2,2 0,-0.8 -4.2,2 -2.8,-2.5 -6.5,-5.5 -1.8,-5.5" fill="#FFFDF7" />
  </svg>
);

export const TrophyVectorIcon = TrophyChaliceVectorIcon;

/**
 * 6. SETTINGS — Cozy Honey-Wood & Brass Sun-Gear Medallion
 */
export const SettingsGearVectorIcon: React.FC<IconProps> = ({ size = 28, className = '' }) => (
  <svg
    width={size}
    height={size}
    viewBox="-36 -36 72 72"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`game-vector-icon cozy-vector-badge ${className}`}
  >
    <CozyMedallionBase idPrefix="cozyGear" innerTintTop="#FFFDF7" innerTintBottom="#F4E0B8" />
    <g stroke="#6E3F08" strokeWidth="5.2" strokeLinecap="round">
      <line x1="0" y1="-19" x2="0" y2="19" />
      <line x1="-19" y1="0" x2="19" y2="0" />
      <line x1="-13.5" y1="-13.5" x2="13.5" y2="13.5" />
      <line x1="13.5" y1="-13.5" x2="-13.5" y2="13.5" />
    </g>
    <g stroke="url(#cozyGear_goldArt)" strokeWidth="3.6" strokeLinecap="round">
      <line x1="0" y1="-18.5" x2="0" y2="18.5" />
      <line x1="-18.5" y1="0" x2="18.5" y2="0" />
      <line x1="-13" y1="-13" x2="13" y2="13" />
      <line x1="13" y1="-13" x2="-13" y2="13" />
    </g>
    <circle cx="0" cy="0" r="13.5" fill="url(#cozyGear_goldArt)" stroke="#6E3F08" strokeWidth="2.2" />
    <circle cx="0" cy="0" r="6" fill="#FFFDF6" stroke="#8C5410" strokeWidth="1.8" />
  </svg>
);

/**
 * 7. 3D LIVE PREVIEW EYE — Cozy Golden Scrying Lens with Star Glint
 */
export const Eye3DPreviewVectorIcon: React.FC<IconProps> = ({ size = 16, className = '' }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`game-vector-icon ${className}`}
  >
    <path
      d="M2 12C4.2 7.5 7.8 5 12 5C16.2 5 19.8 7.5 22 12C19.8 16.5 16.2 19 12 19C7.8 19 4.2 16.5 2 12Z"
      fill="rgba(255, 248, 224, 0.65)"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <circle cx="12" cy="12" r="3.6" fill="currentColor" />
    <circle cx="10.8" cy="10.8" r="1.2" fill="#FFFDF7" />
  </svg>
);

/**
 * 8. GOLD TREASURY COIN — Sunlit Star Coin Medallion
 */
export const GoldCoinVectorIcon: React.FC<IconProps> = ({ size = 18, className = '' }) => (
  <svg
    width={size}
    height={size}
    viewBox="-36 -36 72 72"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`game-vector-icon cozy-vector-badge ${className}`}
  >
    <CozyMedallionBase idPrefix="cozyCoin" innerTintTop="#FFF9D6" innerTintBottom="#F5C84C" />
    <circle cx="0" cy="0" r="20" fill="url(#cozyCoin_goldArt)" stroke="#7A4808" strokeWidth="2.2" />
    <polygon
      points="0,-13 3.6,-3.8 13,-3.8 5.4,1.8 8.2,11 0,5.5 -8.2,11 -5.4,1.8 -13,-3.8 -3.6,-3.8"
      fill="#FFFDF5"
      stroke="#8C5410"
      strokeWidth="1.4"
      strokeLinejoin="round"
    />
  </svg>
);

/**
 * 9. COMMANDER ROYAL SIGIL AVATAR — Cozy Carved Ivory & Honey-Gold Emblem
 */
export const CommanderSigilVectorIcon: React.FC<IconProps & { sigil: string }> = ({
  sigil,
  size = 36,
  className = '',
}) => {
  let pathData = COZY_PATHS.chessKing;
  let scale = 0.92;
  if (sigil === '♕' || sigil === '♛') {
    pathData = COZY_PATHS.chessQueen;
  } else if (sigil === '♖' || sigil === '♜') {
    pathData = COZY_PATHS.chessRook;
  } else if (sigil === '♗' || sigil === '♝') {
    pathData = COZY_PATHS.chessBishop;
  } else if (sigil === '♘' || sigil === '♞') {
    pathData = COZY_PATHS.chessKnight;
  } else if (sigil === '♙' || sigil === '♟' || sigil === '▲') {
    pathData = COZY_PATHS.chessPawn;
  } else if (sigil === '🐉' || sigil === '◆') {
    pathData = COZY_PATHS.cozyFlame;
  } else if (sigil === '⚔') {
    pathData = COZY_PATHS.cozySword;
  } else if (sigil === '⚡' || sigil === '✦' || sigil === '◈') {
    pathData = COZY_PATHS.cozyCrown;
  } else if (sigil === '🛡' || sigil === '❖') {
    pathData = COZY_PATHS.roundedShield;
    scale = 0.78;
  }

  return (
    <svg
      width={size}
      height={size}
      viewBox="-36 -36 72 72"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`game-vector-icon cozy-sigil-icon ${className}`}
    >
      <defs>
        <linearGradient id="cozySigilFill" x1="-22" y1="-26" x2="22" y2="26" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FFFDF6" />
          <stop offset="45%" stopColor="#FCE08B" />
          <stop offset="85%" stopColor="#DF9B28" />
          <stop offset="100%" stopColor="#8E540C" />
        </linearGradient>
      </defs>
      <path
        d={pathData}
        fill="url(#cozySigilFill)"
        stroke="#5C3608"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        transform={`scale(${scale})`}
      />
    </svg>
  );
};

/**
 * 10. Gold Bounty Pouch Vector Icon — Cozy Stitched Treasure Pouch Badge
 */
export const ItchPouchBountyIcon: React.FC<IconProps> = ({ size = 22, className = '' }) => (
  <svg width={size} height={size} viewBox="-36 -36 72 72" fill="none" className={`game-vector-icon cozy-vector-badge ${className}`}>
    <CozyMedallionBase idPrefix="cozyPouch" innerTintTop="#FFFDF6" innerTintBottom="#F6E0B3" />
    <path
      d={COZY_PATHS.cozyPouch}
      fill="url(#cozyPouch_goldArt)"
      stroke="#6E3F08"
      strokeWidth="2.3"
      strokeLinejoin="round"
      transform="scale(0.84)"
    />
    <path d="M-7 -11 H7" stroke="#FFFDF5" strokeWidth="2.4" strokeLinecap="round" />
    <polygon points="0,-2 2.2,2.2 6.5,3 3,6.2 4,10.5 0,8.2 -4,10.5 -3,6.2 -6.5,3 -2.2,2.2" fill="#FFFDF7" />
  </svg>
);

/**
 * 11. Camera Orbit Ribbon Arrow Icon
 */
export const ItchRotateCameraIcon: React.FC<IconProps> = ({ size = 15, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={`game-vector-icon ${className}`}>
    <path
      d="M20 11A8 8 0 1 0 17.6 17.6M20 11V5M20 11H14"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

/**
 * 12. BULLET MODE ICON — Cozy Hearth-Flame Comet Medallion
 */
export const BulletModeVectorIcon: React.FC<IconProps> = ({ size = 22, className = '' }) => (
  <svg width={size} height={size} viewBox="-36 -36 72 72" fill="none" className={`game-vector-icon cozy-vector-badge ${className}`}>
    <CozyMedallionBase idPrefix="cozyBullet" innerTintTop="#FFF9F2" innerTintBottom="#FDE2C4" />
    <defs>
      <linearGradient id="cozyBulletFlame" x1="-16" y1="-24" x2="16" y2="24" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#FFF3B0" />
        <stop offset="50%" stopColor="#FB923C" />
        <stop offset="100%" stopColor="#E11D48" />
      </linearGradient>
    </defs>
    <path
      d={COZY_PATHS.cozyFlame}
      fill="url(#cozyBulletFlame)"
      stroke="#7C2D12"
      strokeWidth="2.2"
      strokeLinejoin="round"
      transform="scale(0.84)"
    />
    <circle cx="0" cy="8" r="4.5" fill="#FFFBEB" />
  </svg>
);

/**
 * 13. BLITZ MODE ICON — Cozy Golden Sun-Bolt Medallion
 */
export const BlitzModeVectorIcon: React.FC<IconProps> = ({ size = 22, className = '' }) => (
  <svg width={size} height={size} viewBox="-36 -36 72 72" fill="none" className={`game-vector-icon cozy-vector-badge ${className}`}>
    <CozyMedallionBase idPrefix="cozyBlitz" innerTintTop="#FFFDF2" innerTintBottom="#FCE79C" />
    <path
      d="M3 -21 L-13 1 H0 L-4 21 L14 -3 H1 L3 -21 Z"
      fill="url(#cozyBlitz_goldArt)"
      stroke="#6E3F08"
      strokeWidth="2.2"
      strokeLinejoin="round"
    />
  </svg>
);

/**
 * 14. RAPID MODE ICON — Cozy Honey-Wood & Sky-Glass Hourglass Medallion
 */
export const RapidModeVectorIcon: React.FC<IconProps> = ({ size = 22, className = '' }) => (
  <svg width={size} height={size} viewBox="-36 -36 72 72" fill="none" className={`game-vector-icon cozy-vector-badge ${className}`}>
    <CozyMedallionBase idPrefix="cozyRapid" innerTintTop="#F5FBFF" innerTintBottom="#D8EEFC" />
    <path
      d={COZY_PATHS.cozyHourglass}
      fill="#7DD3FC"
      stroke="#6E3F08"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      transform="scale(0.82)"
    />
    <path d="M-13 -18 H13 M-13 18 H13" stroke="#B87818" strokeWidth="3.4" strokeLinecap="round" />
  </svg>
);

/**
 * 15. COZY HUD RETURN / LOBBY ICON — Replaces legacy return.png
 */
export const CozyReturnArrowVectorIcon: React.FC<IconProps> = ({ size = 15, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={`game-vector-icon ${className}`}>
    <path
      d="M9 14L4 9L9 4M4 9H15.5C18.5 9 20.5 11 20.5 14C20.5 17 18.5 19 15.5 19H11"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

/**
 * 16. COZY HUD AUDIO SPEAKER ICON — Replaces legacy audioOn.png / audioOff.png
 */
export const CozyAudioVectorIcon: React.FC<IconProps & { muted?: boolean }> = ({
  size = 15,
  muted = false,
  className = ''
}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={`game-vector-icon ${className}`}>
    <path
      d="M11 5L6 9H3V15H6L11 19V5Z"
      fill="rgba(245, 195, 68, 0.35)"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinejoin="round"
    />
    {muted ? (
      <path d="M21 9L15 15M15 9L21 15" stroke="#C93434" strokeWidth="2.4" strokeLinecap="round" />
    ) : (
      <path
        d="M15.5 8.5C16.8 9.8 16.8 14.2 15.5 15.5M18.5 6C21 8.5 21 15.5 18.5 18"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
    )}
  </svg>
);

/**
 * 17. COZY WHITE FLAG SURRENDER VECTOR ICON — Replaces plain text flag
 */
export const CozyFlagSurrenderVectorIcon: React.FC<IconProps> = ({ size = 15, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={`game-vector-icon ${className}`}>
    <path d="M5 21V4" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
    <path
      d="M5 5C8 3.5 11 6.5 14 5C17 3.5 19 5 19 5V14C19 14 17 12.5 14 14C11 15.5 8 12.5 5 14V5Z"
      fill="#FFFDF7"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinejoin="round"
    />
  </svg>
);

/**
 * 18. FREEGAMEUI DECORATION — Cozy Golden Scroll & Ribbon Header Ornament
 */
export const CozyRibbonBannerSvg: React.FC<{ className?: string }> = ({ className = '' }) => (
  <svg
    viewBox="0 0 360 44"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`cozy-ribbon-banner-svg ${className}`}
    aria-hidden="true"
  >
    <defs>
      <linearGradient id="cozyRibbonGold" x1="0" y1="0" x2="360" y2="44" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#F5C95B" />
        <stop offset="50%" stopColor="#FFF0B8" />
        <stop offset="100%" stopColor="#DF9F2E" />
      </linearGradient>
      <linearGradient id="cozyRibbonFold" x1="0" y1="0" x2="0" y2="44" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#C57F1B" />
        <stop offset="100%" stopColor="#8E540C" />
      </linearGradient>
    </defs>
    {/* Left & Right Ribbon Tails */}
    <path
      d="M8 14 L38 10 L34 36 L8 38 L18 26 Z"
      fill="url(#cozyRibbonFold)"
      stroke="#7A4608"
      strokeWidth="1.5"
      strokeLinejoin="round"
    />
    <path
      d="M352 14 L322 10 L326 36 L352 38 L342 26 Z"
      fill="url(#cozyRibbonFold)"
      stroke="#7A4608"
      strokeWidth="1.5"
      strokeLinejoin="round"
    />
    {/* Main Scroll Ribbon Body */}
    <path
      d="M28 6 Q180 2 332 6 L326 34 Q180 30 34 34 Z"
      fill="url(#cozyRibbonGold)"
      stroke="#8C5610"
      strokeWidth="1.8"
      strokeLinejoin="round"
    />
    {/* Inner Stitched Cream Line */}
    <path
      d="M35 10 Q180 6 325 10 M38 30 Q180 26 322 30"
      stroke="#FFFDF6"
      strokeWidth="1.2"
      strokeDasharray="4 3"
      strokeOpacity="0.9"
    />
    {/* Left & Right Leaf + Star Flourishes */}
    <path
      d="M46 20 C52 13, 61 13, 66 20 C61 27, 52 27, 46 20 Z"
      fill="#FFF8E7"
      stroke="#8C5610"
      strokeWidth="0.9"
    />
    <path
      d="M314 20 C308 13, 299 13, 294 20 C299 27, 308 27, 314 20 Z"
      fill="#FFF8E7"
      stroke="#8C5610"
      strokeWidth="0.9"
    />
    <polygon points="76,13 78,18 83,20 78,22 76,27 74,22 69,20 74,18" fill="#FFFDF5" />
    <polygon points="284,13 286,18 291,20 286,22 284,27 282,22 277,20 282,18" fill="#FFFDF5" />
  </svg>
);

/**
 * 19. FREEGAMEUI DECORATION — Cozy Botanical & Star Filigree Divider
 */
export const CozyDividerFlourishSvg: React.FC<{ className?: string }> = ({ className = '' }) => (
  <svg
    viewBox="0 0 420 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`cozy-divider-flourish-svg ${className}`}
    aria-hidden="true"
  >
    <line x1="16" y1="12" x2="156" y2="12" stroke="#C88D48" strokeWidth="1.5" strokeLinecap="round" strokeOpacity="0.7" />
    <line x1="264" y1="12" x2="404" y2="12" stroke="#C88D48" strokeWidth="1.5" strokeLinecap="round" strokeOpacity="0.7" />
    {/* Left Leaf Pair */}
    <path
      d="M166 12 C173 5, 184 5, 191 12 C184 19, 173 19, 166 12 Z"
      fill="#E5A93B"
      stroke="#8C5828"
      strokeWidth="1.2"
    />
    <circle cx="158" cy="12" r="2.6" fill="#C88D48" />
    {/* Center 4-Point Star & Gem */}
    <polygon
      points="210,1.5 213.8,8.2 220.5,12 213.8,15.8 210,22.5 206.2,15.8 199.5,12 206.2,8.2"
      fill="#F5C84C"
      stroke="#8C5828"
      strokeWidth="1.3"
    />
    <circle cx="210" cy="12" r="2.8" fill="#FFFDF7" />
    {/* Right Leaf Pair */}
    <path
      d="M254 12 C247 5, 236 5, 229 12 C236 19, 247 19, 254 12 Z"
      fill="#E5A93B"
      stroke="#8C5828"
      strokeWidth="1.2"
    />
    <circle cx="262" cy="12" r="2.6" fill="#C88D48" />
  </svg>
);

/**
 * 20. FREEGAMEUI DECORATION — Animated Corner Leaf, Vine & Twinkling Star Flourish
 */
export const CozyCornerFlourishSvg: React.FC<{ className?: string }> = ({ className = '' }) => (
  <svg
    viewBox="0 0 42 42"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`cozy-corner-flourish-svg ${className}`}
    aria-hidden="true"
  >
    {/* Outer & Inner Curved Honey-Wood Vine Frame */}
    <g className="cozy-corner-vine">
      <path
        d="M3.5 34 V12 C3.5 7.2 7.2 3.5 12 3.5 H34"
        stroke="#B57428"
        strokeWidth="2.6"
        strokeLinecap="round"
      />
      <path
        d="M8.5 26 V13 C8.5 10.5 10.5 8.5 13 8.5 H26"
        stroke="#E8B44C"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </g>
    {/* Botanical Corner Leaves */}
    <g className="cozy-corner-leaf">
      <path
        d="M5.5 5.5 C12 4.2, 16.5 8.8, 15.2 15.2 C8.8 16.5, 4.2 12, 5.5 5.5 Z"
        fill="#F5C64E"
        stroke="#824E14"
        strokeWidth="1.2"
      />
      <path
        d="M17 5 C21 3.5, 24.5 6, 23.5 9.5 C19.5 10, 16.5 7.8, 17 5 Z"
        fill="#FAD978"
        stroke="#824E14"
        strokeWidth="1"
      />
      <path
        d="M5 17 C3.5 21, 6 24.5, 9.5 23.5 C10 19.5, 7.8 16.5, 5 17 Z"
        fill="#FAD978"
        stroke="#824E14"
        strokeWidth="1"
      />
    </g>
    {/* Twinkling Corner 4-Point Star & Dewdrop Gems */}
    <g className="cozy-corner-star">
      <polygon
        points="20,14 21.6,17.8 25.5,19.5 21.6,21.2 20,25 18.4,21.2 14.5,19.5 18.4,17.8"
        fill="#FFF9E2"
        stroke="#B57428"
        strokeWidth="1"
      />
      <circle cx="29.5" cy="6" r="2" fill="#E09A28" />
      <circle cx="6" cy="29.5" r="2" fill="#E09A28" />
    </g>
  </svg>
);

/**
 * 21. VICTORY STREAK FLAME — Cozy Honey-Amber & Hearth-Gold Rounded Flame Icon
 */
export const VictoryStreakFlameVectorIcon: React.FC<IconProps & { active?: boolean }> = ({
  size = 20,
  className = '',
  active = false
}) => (
  <svg
    width={size}
    height={size}
    viewBox="-32 -32 64 64"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`game-vector-icon cozy-streak-flame-icon ${active ? 'streak-active' : ''} ${className}`}
    aria-hidden="true"
  >
    <defs>
      <linearGradient id="cozyStreakOuterFlame" x1="0" y1="-26" x2="0" y2="26" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor={active ? '#FFE875' : '#F7D488'} />
        <stop offset="52%" stopColor={active ? '#FF8811' : '#D99B4E'} />
        <stop offset="100%" stopColor={active ? '#C83E0B' : '#9C6224'} />
      </linearGradient>
      <linearGradient id="cozyStreakInnerFlame" x1="0" y1="-12" x2="0" y2="22" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#FFFDF5" />
        <stop offset="65%" stopColor="#FFE169" />
        <stop offset="100%" stopColor="#FF9E1B" />
      </linearGradient>
    </defs>
    {/* Warm Medallion Backing */}
    <circle
      cx="0"
      cy="1"
      r="27"
      fill={active ? 'rgba(255, 162, 34, 0.22)' : 'rgba(196, 148, 82, 0.16)'}
      stroke={active ? '#D97214' : '#B88C52'}
      strokeWidth="2"
    />
    {/* Outer Cozy Rounded Hearth Flame */}
    <path
      d={COZY_PATHS.cozyFlame}
      fill="url(#cozyStreakOuterFlame)"
      stroke={active ? '#6E2206' : '#6E4414'}
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    {/* Inner Golden-Cream Flame Tongue */}
    <path
      d="M1 -8 C6 -2 9 5 8 12 C7 17.5 3.5 21 0 21 C-4.5 21 -8 17 -8 11.5 C-8 7.5 -5.5 4 -3 1.5 C-2.5 4.5 0 5.5 1.5 3 C3 0.5 0 -4 1 -8 Z"
      fill="url(#cozyStreakInnerFlame)"
    />
    {/* Cozy Ember Spark */}
    <circle cx="-8" cy="-16" r="2.2" fill="#FFFDF5" />
    <circle cx="11" cy="-11" r="1.8" fill="#FFE169" />
  </svg>
);

