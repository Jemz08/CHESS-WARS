import React from 'react';

interface IconProps {
  size?: number;
  className?: string;
}

/**
 * RPG Game Vector Icon Set (Flaticon / Vecteezy Fantasy Game Icon Style)
 * Multi-layered SVGs with metallic linear gradients, beveled edges, and gemstone accents
 * tailored to the Obsidian Altar & Gothic Sanctum aesthetic.
 */

export function PlaySwordsVectorIcon({ size = 28, className = '' }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`game-vector-icon ${className}`}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="gvShieldGrad" x1="12" y1="8" x2="52" y2="56" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#3a2c18" />
          <stop offset="50%" stopColor="#1c1610" />
          <stop offset="100%" stopColor="#0d0a07" />
        </linearGradient>
        <linearGradient id="gvGoldTrim" x1="8" y1="6" x2="56" y2="58" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#fff3c4" />
          <stop offset="45%" stopColor="#e5c158" />
          <stop offset="100%" stopColor="#9c7316" />
        </linearGradient>
        <linearGradient id="gvSteelBlade" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="50%" stopColor="#cbd5e1" />
          <stop offset="100%" stopColor="#64748b" />
        </linearGradient>
      </defs>
      {/* Heraldic Battle Shield Backing */}
      <path
        d="M32 6L52 14V30C52 43.5 43.2 53.4 32 58C20.8 53.4 12 43.5 12 30V14L32 6Z"
        fill="url(#gvShieldGrad)"
        stroke="url(#gvGoldTrim)"
        strokeWidth="2.8"
      />
      {/* Left-to-Right Broadsword */}
      <path
        d="M11 11L23 14L50 41L44 47L17 20L11 11Z"
        fill="url(#gvSteelBlade)"
        stroke="#0f172a"
        strokeWidth="1.5"
      />
      <path
        d="M41 50L53 38M47 47L55 55"
        stroke="url(#gvGoldTrim)"
        strokeWidth="3.8"
        strokeLinecap="round"
      />
      <circle cx="56" cy="56" r="3.2" fill="#ef4444" stroke="url(#gvGoldTrim)" strokeWidth="1.5" />
      {/* Right-to-Left Broadsword */}
      <path
        d="M53 11L41 14L14 41L20 47L47 20L53 11Z"
        fill="url(#gvSteelBlade)"
        stroke="#0f172a"
        strokeWidth="1.5"
      />
      <path
        d="M23 50L11 38M17 47L9 55"
        stroke="url(#gvGoldTrim)"
        strokeWidth="3.8"
        strokeLinecap="round"
      />
      <circle cx="8" cy="56" r="3.2" fill="#ef4444" stroke="url(#gvGoldTrim)" strokeWidth="1.5" />
      {/* Center Ruby Emblem */}
      <polygon
        points="32,22 38,30 32,38 26,30"
        fill="#f59e0b"
        stroke="#fffbeb"
        strokeWidth="1.5"
      />
    </svg>
  );
}

export function SkinsCrownVectorIcon({ size = 28, className = '' }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`game-vector-icon ${className}`}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="gvCrownGold" x1="8" y1="12" x2="56" y2="54" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#fff7d6" />
          <stop offset="40%" stopColor="#f5d061" />
          <stop offset="80%" stopColor="#c8961e" />
          <stop offset="100%" stopColor="#7c580b" />
        </linearGradient>
        <linearGradient id="gvCrownVelvet" x1="16" y1="18" x2="48" y2="48" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#991b1b" />
          <stop offset="100%" stopColor="#450a0a" />
        </linearGradient>
      </defs>
      {/* Inner Velvet Cushion */}
      <path
        d="M16 44C16 28 24 20 32 20C40 20 48 28 48 44H16Z"
        fill="url(#gvCrownVelvet)"
      />
      {/* Sovereign Cross at Peak */}
      <path
        d="M32 7V17M27 12H37"
        stroke="url(#gvCrownGold)"
        strokeWidth="3.2"
        strokeLinecap="round"
      />
      {/* 5-Pointed Royal Crown Body */}
      <path
        d="M10 24L21 34L32 16L43 34L54 24L49 47H15L10 24Z"
        fill="url(#gvCrownGold)"
        stroke="#271c04"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      {/* Base Band */}
      <rect
        x="13"
        y="47"
        width="38"
        height="8"
        rx="2.5"
        fill="url(#gvCrownGold)"
        stroke="#271c04"
        strokeWidth="2"
      />
      {/* Crown Jewels */}
      <circle cx="10" cy="22" r="3" fill="#38bdf8" stroke="#fff" strokeWidth="1" />
      <circle cx="32" cy="15" r="3.5" fill="#10b981" stroke="#fff" strokeWidth="1.2" />
      <circle cx="54" cy="22" r="3" fill="#38bdf8" stroke="#fff" strokeWidth="1" />
      <polygon points="32,31 36,37 32,43 28,37" fill="#ef4444" stroke="#fef2f2" strokeWidth="1.1" />
      <circle cx="21" cy="51" r="2" fill="#10b981" />
      <circle cx="32" cy="51" r="2.2" fill="#ef4444" />
      <circle cx="43" cy="51" r="2" fill="#10b981" />
    </svg>
  );
}

export function GoogleShieldVectorIcon({ size = 26, className = '' }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`game-vector-icon ${className}`}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="gvGoogleRim" x1="8" y1="6" x2="56" y2="58" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#fff3c4" />
          <stop offset="50%" stopColor="#d4af37" />
          <stop offset="100%" stopColor="#855f10" />
        </linearGradient>
      </defs>
      {/* Ornate Medallion Crest */}
      <circle
        cx="32"
        cy="32"
        r="25"
        fill="#101522"
        stroke="url(#gvGoogleRim)"
        strokeWidth="3"
      />
      {/* Official 4-Color Vector G */}
      <path
        d="M47.5 32.4C47.5 31.1 47.4 29.9 47.1 28.8H32V35.2H40.8C40.4 37.4 39.1 39.3 37.2 40.5V44.7H42.4C45.5 41.8 47.5 37.5 47.5 32.4Z"
        fill="#4285F4"
      />
      <path
        d="M32 48.2C36.4 48.2 40.1 46.7 42.8 44.2L37.6 40.1C36.1 41.1 34.2 41.7 32 41.7C27.7 41.7 24.1 38.8 22.8 34.9H17.4V39.1C20.1 44.5 25.6 48.2 32 48.2Z"
        fill="#34A853"
      />
      <path
        d="M22.8 34.9C22.4 33.9 22.2 32.9 22.2 31.8C22.2 30.7 22.4 29.7 22.8 28.7V24.5H17.4C16.2 26.8 15.6 29.2 15.6 31.8C15.6 34.4 16.2 36.8 17.4 39.1L22.8 34.9Z"
        fill="#FBBC05"
      />
      <path
        d="M32 21.9C34.4 21.9 36.6 22.7 38.3 24.4L42.9 19.8C40.1 17.2 36.4 15.6 32 15.6C25.6 15.6 20.1 19.3 17.4 24.5L22.8 28.7C24.1 24.8 27.7 21.9 32 21.9Z"
        fill="#EA4335"
      />
    </svg>
  );
}

export function CloudCheckVectorIcon({ size = 26, className = '' }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`game-vector-icon ${className}`}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="gvEmeraldGrad" x1="10" y1="10" x2="54" y2="54" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#6ee7b7" />
          <stop offset="50%" stopColor="#10b981" />
          <stop offset="100%" stopColor="#065f46" />
        </linearGradient>
      </defs>
      <circle cx="32" cy="32" r="24" fill="#0b241c" stroke="url(#gvEmeraldGrad)" strokeWidth="3.2" />
      <path
        d="M21 32.5L28.5 40L44 24.5"
        stroke="#6ee7b7"
        strokeWidth="4.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function TrophyChaliceVectorIcon({ size = 28, className = '' }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`game-vector-icon ${className}`}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="gvTrophyGold" x1="14" y1="8" x2="50" y2="56" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#fff9db" />
          <stop offset="38%" stopColor="#f5d061" />
          <stop offset="78%" stopColor="#ca9216" />
          <stop offset="100%" stopColor="#785006" />
        </linearGradient>
      </defs>
      {/* Left & Right Ornate Handles */}
      <path
        d="M18 16H11C9.5 16 8 17.5 8 20C8 27 13 32 20 33"
        stroke="url(#gvTrophyGold)"
        strokeWidth="3.2"
        strokeLinecap="round"
      />
      <path
        d="M46 16H53C54.5 16 56 17.5 56 20C56 27 51 32 44 33"
        stroke="url(#gvTrophyGold)"
        strokeWidth="3.2"
        strokeLinecap="round"
      />
      {/* Chalice Cup */}
      <path
        d="M17 11H47V25C47 34.5 40.3 41 32 41C23.7 41 17 34.5 17 25V11Z"
        fill="url(#gvTrophyGold)"
        stroke="#271c04"
        strokeWidth="2"
      />
      {/* Stem & Pedestal */}
      <path d="M29 41H35V49H29V41Z" fill="url(#gvTrophyGold)" stroke="#271c04" strokeWidth="1.8" />
      <rect
        x="19"
        y="49"
        width="26"
        height="7"
        rx="2"
        fill="url(#gvTrophyGold)"
        stroke="#271c04"
        strokeWidth="2"
      />
      {/* Center Star Emblem */}
      <polygon
        points="32,17 34.6,22.4 40.5,23.2 36.2,27.3 37.3,33.1 32,30.3 26.7,33.1 27.8,27.3 23.5,23.2 29.4,22.4"
        fill="#fffbeb"
        stroke="#92400e"
        strokeWidth="1"
      />
    </svg>
  );
}

export function SettingsGearVectorIcon({ size = 24, className = '' }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`game-vector-icon ${className}`}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="gvGearBrass" x1="8" y1="8" x2="56" y2="56" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#fff3c4" />
          <stop offset="48%" stopColor="#d4af37" />
          <stop offset="100%" stopColor="#78560c" />
        </linearGradient>
      </defs>
      {/* 8-Tooth Astrolabe Gear */}
      <path
        d="M28 6H36L38 13.2C40.1 13.9 42.1 15 43.8 16.4L50.8 13.6L56.4 19.2L53.6 26.2C55 27.9 56.1 29.9 56.8 32L64 34V42L56.8 44C56.1 46.1 55 48.1 53.6 49.8L56.4 56.8L50.8 62.4L43.8 59.6C42.1 61 40.1 62.1 38 62.8L36 70H28L26 62.8C23.9 62.1 21.9 61 20.2 59.6L13.2 62.4L7.6 56.8L10.4 49.8C9 48.1 7.9 46.1 7.2 44L0 42V34L7.2 32C7.9 29.9 9 27.9 10.4 26.2L7.6 19.2L13.2 13.6L20.2 16.4C21.9 15 23.9 13.9 26 13.2L28 6Z"
        transform="translate(0 -6)"
        fill="url(#gvGearBrass)"
        stroke="#1e1606"
        strokeWidth="2.2"
        strokeLinejoin="round"
      />
      <circle cx="32" cy="32" r="11" fill="#0f1420" stroke="#fff3c4" strokeWidth="2.4" />
      <polygon points="32,25 39,32 32,39 25,32" fill="#f59e0b" />
    </svg>
  );
}

export function Eye3DPreviewVectorIcon({ size = 16, className = '' }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`game-vector-icon ${className}`}
      aria-hidden="true"
    >
      <path
        d="M2.5 16C5.6 9.8 10.4 6.5 16 6.5C21.6 6.5 26.4 9.8 29.5 16C26.4 22.2 21.6 25.5 16 25.5C10.4 25.5 5.6 22.2 2.5 16Z"
        fill="rgba(16, 185, 129, 0.2)"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinejoin="round"
      />
      {/* 3D Isometric Cube Iris */}
      <polygon
        points="16,10.2 21.2,13.1 21.2,18.9 16,21.8 10.8,18.9 10.8,13.1"
        fill="rgba(110, 231, 183, 0.35)"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path d="M10.8 13.1L16 16L21.2 13.1M16 16V21.8" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

export function GoldCoinVectorIcon({ size = 16, className = '' }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`game-vector-icon ${className}`}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="gvCoinGrad" x1="4" y1="4" x2="28" y2="28" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#fff7d6" />
          <stop offset="45%" stopColor="#f5d061" />
          <stop offset="100%" stopColor="#b47d12" />
        </linearGradient>
      </defs>
      <circle cx="16" cy="16" r="13" fill="url(#gvCoinGrad)" stroke="#422c04" strokeWidth="1.8" />
      <circle cx="16" cy="16" r="9.5" fill="none" stroke="#fffbeb" strokeOpacity="0.65" strokeWidth="1" />
      <polygon points="16,9.5 21,16 16,22.5 11,16" fill="#92400e" stroke="#fff7d6" strokeWidth="1.2" />
    </svg>
  );
}

export function CommanderSigilVectorIcon({
  sigil,
  size = 24,
  className = ''
}: {
  sigil: string;
  size?: number;
  className?: string;
}) {
  if (sigil === '🐉' || sigil === 'dragon_elemental') {
    // Dragon Crest Vector
    return (
      <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={`game-vector-icon ${className}`} aria-hidden="true">
        <path
          d="M8 36C7 24 14 14 26 10L22 17L33 14L28 21C35 21 40 26 40 34C34 31 28 32 23 38C21 31 15 30 8 36Z"
          fill="#f97316"
          stroke="#fff7ed"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
        <circle cx="27" cy="18" r="2" fill="#fef08a" />
      </svg>
    );
  }
  if (sigil === '⚡' || sigil === 'arcane_cyber' || sigil === '✦') {
    // Arcane Archon / Astral Star Lightning Vector
    return (
      <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={`game-vector-icon ${className}`} aria-hidden="true">
        <polygon
          points="27,5 11,26 23,26 19,43 37,21 25,21"
          fill="#38bdf8"
          stroke="#e0f2fe"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  if (sigil === '🛡' || sigil === '▲' || sigil === '❖') {
    // Paladin Sentinel Shield Vector
    return (
      <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={`game-vector-icon ${className}`} aria-hidden="true">
        <path
          d="M24 5L40 11V23C40 33.8 33.1 41.2 24 44.5C14.9 41.2 8 33.8 8 23V11L24 5Z"
          fill="#eab308"
          stroke="#fefce8"
          strokeWidth="2"
        />
        <path d="M24 11V38M14 22H34" stroke="#1e293b" strokeWidth="3.2" strokeLinecap="round" />
      </svg>
    );
  }
  if (sigil === '⚔' || sigil === 'gothic_warriors') {
    return <PlaySwordsVectorIcon size={size} className={className} />;
  }
  if (sigil === '♕') {
    // Empress Coronet Vector
    return (
      <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={`game-vector-icon ${className}`} aria-hidden="true">
        <path
          d="M8 18L16 30L24 14L32 30L40 18L36 37H12L8 18Z"
          fill="#e879f9"
          stroke="#fdf4ff"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
        <rect x="11" y="37" width="26" height="5" rx="1.5" fill="#c026d3" stroke="#fdf4ff" strokeWidth="1.4" />
        <circle cx="24" cy="11" r="2.5" fill="#fde047" />
        <circle cx="8" cy="15" r="2.2" fill="#fde047" />
        <circle cx="40" cy="15" r="2.2" fill="#fde047" />
      </svg>
    );
  }
  if (sigil === '◆' || sigil === '◈') {
    // Obsidian / Gold Gem Vector
    return (
      <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={`game-vector-icon ${className}`} aria-hidden="true">
        <polygon
          points="24,5 40,24 24,43 8,24"
          fill={sigil === '◆' ? '#a855f7' : '#f59e0b'}
          stroke="#ffffff"
          strokeWidth="2"
        />
        <polygon
          points="24,12 33,24 24,36 15,24"
          fill="none"
          stroke="rgba(255,255,255,0.6)"
          strokeWidth="1.2"
        />
      </svg>
    );
  }
  // Default: High King Sovereign Crown Vector
  return <SkinsCrownVectorIcon size={size} className={className} />;
}
