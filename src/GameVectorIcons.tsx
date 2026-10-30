import React from 'react';

interface IconProps {
  size?: number;
  className?: string;
}

// Actual vector paths extracted from the Itch.io / Kenney Board Game Icons & Game Icons packs (/public/assets/ui/icons/*.svg)
const ITCH_PATHS = {
  crownA:
    'M26 -9.65 L22 14.95 21.9 15.35 Q21.2 18.95 14.95 21.45 11.25 22.95 6.7 23.6 L0 24 -6.6 23.6 Q-11.25 22.95 -14.9 21.45 L-14.85 21.45 Q-21.2 18.95 -21.85 15.35 L-21.95 14.95 -25.95 -9.65 Q-26.1 -10.5 -25.6 -11.15 -25.15 -11.8 -24.35 -11.95 -23.6 -12.15 -22.9 -11.65 L-12.65 -4.8 -1.7 -23 -0.65 -23.85 Q0 -24.1 0.7 -23.85 L1.75 -23 12.65 -4.8 22.9 -11.65 Q23.6 -12.15 24.4 -11.95 25.15 -11.8 25.65 -11.15 26.1 -10.5 26 -9.65 M-5.4 8.6 Q-6 9.15 -6 10 -6 10.85 -5.4 11.45 L-1.4 15.45 Q-0.85 16 0 16 0.85 16 1.45 15.45 L5.45 11.45 Q6 10.85 6 10 6 9.15 5.45 8.6 L1.45 4.6 Q0.85 4 0 4 -0.85 4 -1.4 4.6 L-5.4 8.6',
  crownB:
    'M6 -20 Q6 -18.4 5.3 -17.1 L12.65 -4.8 19 -9.05 Q19 -11.1 20.45 -12.55 21.95 -14 24 -14 26.05 -14 27.5 -12.55 29 -11.05 29 -9 29 -6.95 27.5 -5.5 26.45 -4.4 25.1 -4.1 L22 14.95 21.9 15.35 Q21.2 18.95 14.95 21.45 11.25 22.95 6.7 23.6 L0 24 -6.6 23.6 Q-11.25 22.95 -14.9 21.45 L-14.85 21.45 Q-21.2 18.95 -21.85 21.45 L-21.95 14.95 -25.05 -4.1 Q-26.45 -4.4 -27.55 -5.5 -29 -6.95 -29 -9 -29 -11.05 -27.55 -12.55 -26.05 -14 -24 -14 -21.95 -14 -20.5 -12.55 -19.05 -11.1 -19 -9.05 L-12.65 -4.8 -5.25 -17.1 Q-6 -18.4 -6 -20 -6 -22.45 -4.25 -24.25 -2.45 -26 0 -26 2.5 -26 4.2 -24.25 6 -22.45 6 -20 M-5.4 8.6 Q-6 9.15 -6 10 -6 10.85 -5.4 11.45 L-1.4 15.45 Q-0.85 16 0 16 0.85 16 1.45 15.45 L5.45 11.45 Q6 10.85 6 10 6 9.15 5.45 8.6 L1.45 4.6 Q0.85 4 0 4 -0.85 4 -1.4 4.6 L-5.4 8.6',
  sword:
    'M13.5 -26.45 Q14.25 -27 15.25 -27 L24.4 -27 Q25.35 -27 26.05 -26.45 L26.25 -26.3 Q27 -25.5 27 -24.45 L27 -15.2 Q27 -14.25 26.25 -13.4 L2.2 10.65 4 12.45 4.3 12.1 Q4.45 11.85 4.8 11.8 L5.4 11.65 6.15 11.65 Q7.15 11.65 7.95 12.4 L8.1 12.55 Q8.7 13.3 8.7 14.2 L8.7 20.35 Q8.7 21.3 8.1 22 L7.8 22.3 Q7.05 22.9 6.15 22.9 L0 22.9 Q-2.7 22.9 -2.6 20.35 L-2.6 19.75 Q-2.6 19.05 -2.1 18.6 L-1.65 18.1 -2 17.8 -5.55 14.35 -9.6 18.4 -9.6 24.4 Q-9.6 25.45 -10.4 26.2 -11.15 27 -12.2 27 L-24.35 27 Q-27 27 -27 24.4 L-27 12.15 Q-27 9.55 -24.35 9.55 L-18.45 9.55 -14.4 5.5 -18.15 1.65 -18.65 2.2 Q-19.1 2.55 -19.8 2.55 L-20.3 2.55 Q-23 2.55 -22.95 0 L-22.95 -6.15 Q-22.95 -8.75 -20.3 -8.75 L-14.15 -8.75 Q-13.2 -8.75 -12.35 -7.95 L-12.2 -7.8 Q-11.7 -7.05 -11.7 -6.15 L-11.7 -5.45 Q-11.7 -4.85 -12.15 -4.35 L-12.5 -3.95 -10.7 -2.15 13.35 -26.3 13.5 -26.45',
  shield:
    'M22.3 -19.55 Q24.4 -19.35 25.75 -17.75 27.15 -16.2 27 -14.1 26.25 4.45 16.3 16.8 10.2 24.3 2.35 28.05 L0.1 28.5 -2.15 28.05 Q-10.1 24.3 -16.2 16.8 -26.15 4.45 -26.9 -14.1 -27 -16.2 -25.65 -17.75 -24.3 -19.35 -22.2 -19.55 -13.35 -20.4 -4.4 -27 -2.4 -28.4 0.1 -28.4 2.5 -28.4 4.5 -27 13.45 -20.45 22.3 -19.55',
  tokensStack:
    'M-6 14 Q-6 10.3 -8.65 7.65 -11.3 5 -15 5 -17.8 5 -20 6.5 L-21.35 7.6 -21.4 7.65 Q-24 10.3 -24 14 -24 17.7 -21.35 20.35 -18.7 23 -15 23 -11.3 23 -8.65 20.35 -6 17.7 -6 14 M23 8 Q23 4.3 20.35 1.65 17.7 -1 14 -1 10.4 -1 7.85 1.45 L7.65 1.6 7.6 1.65 Q5 4.3 5 8 5 11.7 7.65 14.35 10.3 17 14 17 17.7 17 20.35 14.35 23 11.7 23 8 M2 -17 Q2 -20.7 -0.65 -23.35 -3.3 -26 -7 -26 -10.7 -26 -13.35 -23.4 L-13.4 -23.35 Q-16 -20.7 -16 -17 -16 -15.7 -15.65 -14.5 -15.05 -12.35 -13.35 -10.65 -10.7 -8 -7 -8 -3.3 -8 -0.65 -10.65 1.05 -12.35 1.7 -14.5 L2 -17 M-22 -4 L-21.8 -6.5 -22 -9 -22 -17 Q-22 -23.15 -17.6 -27.6 -13.15 -32 -7 -32 -0.8 -32 3.6 -27.6 8 -23.2 8 -17 L8 -9 7.8 -6.5 7.9 -5.75 Q10.7 -7 14 -7 20.2 -7 24.6 -2.6 29 1.8 29 8 L29 11 Q29 17.2 24.6 21.55 L24.55 21.6 Q20.2 26 14 26 7.8 26 3.4 21.6 1.1 19.3 0 16.5 L0 17 Q0 23.2 -4.4 27.55 L-4.45 27.6 Q-8.8 32 -15 32 -21.2 32 -25.6 27.6 -30 23.2 -30 17 L-30 14 Q-30 7.85 -25.6 3.4 -23.9 1.7 -21.9 0.7 L-22 -4',
  pouch:
    'M9.8 -25.45 Q11.2 -24.65 10.95 -21.75 L10.95 -21.7 Q9.9 -14.95 6.15 -13.85 3.6 -12.75 0.1 -13.05 L-0.1 -13.05 Q-3.6 -12.75 -6.2 -13.85 -9.9 -14.95 -10.95 -21.7 L-10.95 -21.75 Q-11.2 -24.65 -9.8 -25.45 L-5.9 -25.35 -5.95 -25.35 Q-2.8 -24 0 -24 2.8 -24 5.9 -25.35 L9.8 -25.45 M0 26 Q-19.7 25.75 -18.95 12.85 -17.15 -2.4 -10.5 -8.6 -8.6 -10.6 -5.3 -9.7 -2.6 -8.7 -0.15 -8.7 2.6 -8.7 5.35 -9.7 8.65 -10.6 10.55 -8.6 17.15 -2.4 18.95 12.85 19.75 25.75 0 26 M26.5 -8.8 Q27.15 -7.75 26.9 -6.5 26.6 -5.3 25.55 -4.65 L24.65 -4.25 26.7 -0.25 Q27.2 0.95 26.75 2.1 26.25 3.25 25.1 3.75 L22.75 3.8 Q21.6 3.3 21.1 2.2 17.85 -5.2 11.2 -10.5 10.4 -11.1 10.15 -12 9.85 -12.9 10.15 -13.75 10.4 -14.65 11.2 -15.25 11.9 -15.9 12.8 -15.95 21.6 -16.7 26.5 -8.8',
  award:
    'M9.6 -19.9 Q7.25 -22.85 8.35 -26 L8.65 -26.45 9 -26.65 Q12.25 -27.8 15.1 -25.4 18.2 -22.85 16.25 -19.25 L15.8 -18.8 Q12.25 -16.8 9.6 -19.9 M17.45 -16.35 Q19.65 -20.7 23.85 -21 L24.5 -20.9 24.95 -20.6 Q28 -17.3 26.55 -12.65 25.3 -7.5 20 -8 L19.55 -8.1 19.3 -7.7 Q16.2 -3.5 11.5 -5.8 7.3 -8.05 7 -12.4 L7.1 -13.1 7.35 -13.55 Q10.6 -16.7 15.1 -15.25 L16.85 -14.55 17.45 -16.35 M21.75 -0.75 Q25.25 -3.3 28.9 -1.8 L29.4 -1.45 29.65 -1.1 Q30.85 2.85 27.8 5.95 24.7 9.5 20.5 6.95 L20.15 6.65 19.85 6.9 Q15.6 9 12.6 5.25 10.05 1.6 11.55 -1.85 L11.9 -2.45 12.25 -2.65 Q16.2 -3.85 19.35 -0.85 L20.55 0.45 21.75 -0.75 M-21.75 -0.75 L-20.55 0.45 -19.35 -0.85 Q-16.2 -3.85 -12.25 -2.65 L-11.9 -2.45 -11.55 -1.85 Q-10.05 1.6 -12.6 5.25 -15.6 9 -19.85 6.9 L-20.15 6.65 -20.5 6.95 Q-24.7 9.5 -27.8 5.95 -30.85 2.85 -29.65 -1.1 L-29.4 -1.45 -28.9 -1.8 Q-25.25 -3.3 -21.75 -0.75 M-17.45 -16.35 L-16.85 -14.55 -15.1 -15.25 Q-10.6 -16.7 -7.35 -13.55 L-7.1 -13.1 -7 -12.4 Q-7.3 -8.05 -11.5 -5.8 -16.2 -3.5 -19.3 -7.7 L-19.55 -8.1 -20 -8 Q-25.3 -7.5 -26.55 -12.65 -28 -17.3 -24.95 -20.6 L-24.5 -20.9 -23.85 -21 Q-19.65 -20.7 -17.45 -16.35 M-9.6 -19.9 Q-12.25 -16.8 -15.8 -18.8 L-16.25 -19.25 Q-18.2 -22.85 -15.1 -25.4 -12.25 -27.8 -9 -26.65 L-8.65 -26.45 -8.35 -26 Q-7.25 -22.85 -9.6 -19.9 M15.95 23.4 Q16.85 24.2 17 25.45 17.1 26.65 16.3 27.65 15.5 28.55 14.3 28.7 13.05 28.8 12.1 28 6.85 23.6 0.15 21.4 -6.5 23.6 -11.75 28 -12.75 28.8 -13.95 28.7 -15.2 28.55 -16 27.65 -16.8 26.65 -16.65 25.45 -16.55 24.2 -15.6 23.4 -12.85 21.1 -9.7 19.3 L-13.75 19 Q-14.75 18.95 -15.45 18.4 -18.25 19.95 -21 17.7 -24.45 15.2 -23.9 11.35 L-23.75 10.95 -23.25 10.5 Q-20.15 8.65 -16.45 10.4 -15.65 10.8 -15.1 11.35 L-14.15 9.9 Q-11.7 6.6 -7.8 7.05 L-7.45 7.2 -7.05 7.7 Q-5.25 10.4 -6.45 13.65 L0.2 15.15 Q3.2 14.25 6.5 13.7 5.25 10.45 7.05 7.7 L7.45 7.2 7.8 7.05 Q11.7 6.6 14.15 9.9 L15.1 11.35 Q15.65 10.8 16.45 10.4 20.15 8.65 23.25 10.5 L23.75 10.95 23.9 11.35 Q24.45 15.2 21 17.7 18.35 19.85 15.6 18.5 14.9 18.95 14 19 L10.05 19.3 Q13.15 21.1 15.95 23.4',
  watchtower:
    'M9 -11 L9 -16 Q9 -17.25 9.9 -18.1 10.75 -19 12 -19 L16 -19 Q17.25 -19 18.15 -18.1 19 -17.25 19 -16 L19 -4 Q19 -2.75 18.15 -1.85 L15 1.25 15 10.75 18.15 13.9 Q19 14.75 19 16 L19 20 Q19 21.25 18.15 22.15 17.25 23 16 23 L8 23 Q6.75 23 5.9 22.15 5 21.25 5 20 L5 8 Q5 5.95 3.55 4.5 2.05 3 0 3 -2.05 3 -3.5 4.5 -5 5.95 -5 8 L-5 20 Q-5 21.25 -5.85 22.15 -6.75 23 -8 23 L-16 23 Q-17.25 23 -18.1 22.15 -19 21.25 -19 20 L-19 16 Q-19 14.75 -18.1 13.9 L-15 10.75 -15 1.25 -18.1 -1.85 Q-19 -2.75 -19 -4 L-19 -16 Q-19 -17.25 -18.1 -18.1 -17.25 -19 -16 -19 L-12 -19 Q-10.75 -19 -9.85 -18.1 -9 -17.25 -9 -16 L-9 -11 -7 -11 -7 -16 Q-7 -17.25 -6.1 -18.1 -5.25 -19 -4 -19 L4 -19 Q5.25 -19 6.15 -18.1 7 -17.25 7 -16 L7 -11 9 -11',
  skull:
    'M9 12 Q11.55 12 13.2 10.35 15 8.55 15 6 15 3.6 13.2 1.8 11.55 0 9 0 6.45 0 4.65 1.8 3 3.45 3 6 3 8.55 4.65 10.35 6.45 12 9 12 M-9 12 Q-6.45 12 -4.8 10.35 -3 8.55 -3 6 -3 3.6 -4.8 1.8 -6.45 0 -9 0 -11.55 0 -13.35 1.8 -15 3.45 -15 6 -15 8.55 -13.35 10.35 -11.55 12 -9 12 M0 -30 Q11.1 -30 19.05 -22.5 27 -15 27 -4.5 27 1.5 24 7.2 L24 12 Q24 14.55 22.2 16.35 20.55 18 18 18 L12 18 12 24 Q12 26.55 10.2 28.35 8.55 30 6 30 L-6 30 Q-8.55 30 -10.35 28.35 -12 26.55 -12 24 L-12 18 -18 18 Q-20.55 18 -22.35 16.35 -24 14.55 -24 12 L-24 7.2 Q-27 1.95 -27 -4.5 -27 -15 -19.05 -22.5 -11.25 -30 0 -30',
  hourglass:
    'M-11.8 -0.65 Q-17.65 -7.6 -18 -18 -18 -18.45 -18.3 -18.7 -18.6 -19 -19 -19 L-20.1 -19 -20.7 -19.25 -21 -20 -21 -26 -20.7 -26.65 -20.65 -26.7 -20 -27 20 -27 20.75 -26.7 21 -26 21 -20 20.8 -19.25 20.75 -19.2 20.1 -19 19 -19 Q18.6 -19 18.3 -18.7 18 -18.45 18 -18 17.65 -7.6 11.85 -0.65 L11.6 0 11.85 0.65 Q17.65 7.6 18 18.05 18 18.45 18.3 18.75 L19 19 20.1 19 20.75 19.3 21 20 21 26 20.8 26.75 20.75 26.8 20 27 -20 27 -20.7 26.75 -21 26 -21 20 -20.7 19.35 -20.65 19.3 Q-20.45 19 -20.1 19 L-19 19 -18.3 18.75 Q-18 18.45 -18 18.05 -17.65 7.6 -11.8 0.65 L-11.6 0 -11.8 -0.65 M4.15 -0.8 Q4.35 -1.65 5 -2.15 L5.2 -2.4 Q11.6 -8.3 12 -17.95 L11.9 -18.45 11.5 -18.85 11 -19 -10.95 -19 -11.45 -18.85 -11.8 -18.45 -11.95 -17.95 Q-11.6 -8.2 -5.05 -2.3 L-5 -2.25 -4.95 -2.2 Q-4.35 -1.65 -4.1 -0.8 L-4 0 -4.1 0.85 -4.15 1.05 -4.8 2.1 -5 2.25 Q-11.6 8.15 -11.95 18 L-11.8 18.5 -11.45 18.85 -10.95 19 11 19 11.5 18.85 11.9 18.5 12 17.95 Q11.6 8.15 5.05 2.25 4.4 1.7 4.15 1.05 L4.15 0.85 4 0 Q4 -0.4 4.15 -0.8 M-4 -10 L4 -10 Q4.85 -10 5.45 -9.4 6 -8.85 6 -8 6 -7.15 5.45 -6.55 L1.45 -2.55 Q0.85 -2 0 -2 -0.85 -2 -1.4 -2.55 L-5.4 -6.55 Q-6 -7.15 -6 -8 -6 -8.85 -5.4 -9.4 -4.85 -10 -4 -10 M-8.6 16 Q-7.6 9.85 -3.6 5.7 L-3.25 5.4 Q-2.2 4.3 -1.65 3 L1.65 3 Q2.2 4.3 3.3 5.4 L3.35 5.4 3.35 5.45 Q7.6 9.6 8.65 16 L-8.6 16',
  bookOpen:
    'M-1 24.85 Q-6.75 21.5 -19.05 21 -21.85 20.9 -25.05 20.95 L-26.95 21 -27.3 21 -27.95 21 -28 21 -28.3 21 -28.95 21 -29.95 20.75 -30.7 20.05 -31 19 -31 -17 Q-31 -17.85 -30.4 -18.4 -29.85 -19 -29 -19 L-26 -19 -26 11 Q-26 12.2 -25.15 13.1 L-25.05 13.2 Q-24.25 13.95 -23.1 14 L-18.05 14.3 Q-6.65 15.25 -1.3 17.8 L0 18.1 1.35 17.8 Q6.4 15.35 16.95 14.35 L23.15 14 Q24.15 13.95 24.95 13.3 L25.15 13.1 Q26 12.2 26 11 L26 -19 29 -19 Q29.85 -19 30.45 -18.4 31 -17.85 31 -17 L31 19 30.75 20.05 30 20.75 28.95 21 28.3 21 28 21 27.95 21 27.3 21 26.95 21 24.95 20.95 17.95 21.05 Q6.55 21.7 1.05 24.85 L0 25.1 -1 24.85 M0 13.1 Q-5.75 10.25 -21 9.1 L-22 9 -22 -23 -20.9 -22.9 Q-10.85 -22.1 -6.25 -21 -2.65 -20.15 -0.2 -19 L0 -18.9 0.25 -19 Q2.7 -20.15 6.3 -21 10.15 -21.9 22 -23 L22 9 17.95 9.4 Q5.35 10.45 0 13.1',
  lockClosed:
    'M-8 -10 L-8 -6 8 -6 8 -10 Q8 -13.3 5.65 -15.65 3.3 -18 0 -18 -3.3 -18 -5.65 -15.7 L-5.7 -15.65 Q-8 -13.3 -8 -10 M16 -6 Q20 -6 20 -2 L20 22 Q20 23.95 19.05 24.95 18.05 26 16 26 L-16 26 Q-18.05 26 -19.05 24.95 -20 23.95 -20 22 L-20 -2 Q-20 -6 -16 -6 L-16 -10 Q-16 -16.6 -11.35 -21.3 L-11.3 -21.35 Q-6.6 -26 0 -26 6.6 -26 11.3 -21.3 16 -16.6 16 -10 L16 -6 M0 2 Q-2.05 2 -3.5 3.45 L-3.55 3.5 Q-5 4.95 -5 7 -5 9.05 -3.55 10.5 L-2.45 11.35 -2.1 11.75 -2 12.2 -2 15.75 Q-2 16.55 -1.4 17.15 -0.8 17.75 0 17.75 0.8 17.75 1.4 17.15 2 16.55 2 15.75 L2 12.2 2.15 11.75 2.5 11.35 3.5 10.55 3.55 10.5 Q5 9.05 5 7 5 4.95 3.5 3.45 2.05 2 0 2',
  fire:
    'M15.3 -10.2 Q21.9 -0.8 20.85 8.65 L20.85 8.9 Q19.55 16.75 15.05 22 12.9 25.6 8.35 26.9 L8.4 26.75 Q9.6 23.85 8.35 18.7 L8.3 18.65 Q4.15 7.1 0.35 4.05 -0.35 3.45 -1.1 3.6 -2.05 3.65 -2.55 4.45 -3 5 -2.95 5.85 L-2.95 5.9 Q-2.85 10.65 -5.7 14.65 -9.25 18.25 -8.8 22.65 L-8.75 22.75 Q-8.35 25.3 -7.1 27 -18.9 24 -20.9 11.85 -21.85 3.1 -14.8 -4.1 -7.65 -13.7 -8 -25.15 -8.1 -26.3 -7.45 -27.05 -6.9 -27.9 -5.95 -27.95 -5.1 -28.1 -4.35 -27.45 6.55 -18.25 10.1 -5.3 10.95 -7.05 11.2 -9.05 11.3 -10.15 12.15 -10.8 12.85 -11.4 13.85 -11.2 14.7 -11.05 15.3 -10.2',
  arrowClockwise:
    'M-13.25 21.3 Q-21.85 16.3 -24.4 6.8 -26.95 -2.85 -21.95 -11.5 L-21.95 -11.45 Q-17.05 -20.05 -7.4 -22.65 2.2 -25.35 10.85 -20.3 19.45 -15.35 22.05 -5.7 23.1 -1.8 22.9 2 L24.35 0.75 Q25.25 -0.05 26.5 0 27.75 0.1 28.55 1.05 29.4 1.95 29.3 3.2 29.2 4.45 28.3 5.25 L18.15 14.1 Q17.45 14.7 16.6 14.85 L14.9 14.6 Q14.05 14.2 13.6 13.45 L6.7 2.35 Q6.05 1.25 6.35 0.1 6.6 -1.15 7.7 -1.8 8.75 -2.45 9.95 -2.15 11.15 -1.9 11.8 -0.8 L12.9 0.95 Q12.95 -1.05 12.4 -3.05 L12.4 -3.1 Q10.85 -8.75 5.85 -11.65 0.8 -14.55 -4.75 -13 L-4.8 -13 Q-10.45 -11.5 -13.3 -6.5 -16.25 -1.45 -14.75 4.25 L-14.75 4.2 Q-13.25 9.75 -8.2 12.7 L-8.15 12.7 -5.6 13.95 Q-3.7 14.7 -2.85 16.6 -2 18.45 -2.7 20.4 -3.45 22.3 -5.35 23.15 L-9.15 23.3 Q-11.25 22.5 -13.2 21.35 L-13.25 21.3',
  chessKing:
    'M-7.1 -16.1 Q-5.7 -17.5 -4 -18.2 L-4 -20 -6 -20 Q-6.85 -20 -7.4 -20.55 -8 -21.15 -8 -22 L-8 -26 Q-8 -26.85 -7.4 -27.4 -6.85 -28 -6 -28 L-4 -28 -4 -30 Q-4 -30.85 -3.4 -31.4 -2.85 -32 -2 -32 L2 -32 Q2.85 -32 3.45 -31.4 4 -30.85 4 -30 L4 -28 6 -28 Q6.85 -28 7.45 -27.4 8 -26.85 8 -26 L8 -22 Q8 -21.15 7.45 -20.55 6.85 -20 6 -20 L4 -20 4 -18.2 Q5.65 -17.5 7.05 -16.1 8.45 -14.7 9.2 -13 L-9.2 -13 Q-8.5 -14.7 -7.1 -16.1 M-9 14 L-9 10 -10 10 Q-11.65 10 -12.85 8.8 -14 7.65 -14 6 L-14 3.45 -13.95 3.45 -13.3 1.75 -15.9 -7.15 -15.85 -8.5 Q-15.65 -9.15 -15.05 -9.55 -14.5 -9.95 -13.75 -10 L13.75 -10 Q14.5 -9.95 15.05 -9.55 L15.9 -8.5 Q16.1 -7.8 15.9 -7.15 L13.3 1.75 Q13.85 2.5 14 3.45 L14 6 Q14 7.65 12.8 8.8 11.65 10 10 10 L9 10 9 14 10 14 Q11.65 14 12.8 15.15 13.8 16.15 14 17.45 L14 21 -14 21 -14 17.45 -13.95 17.45 Q-13.8 16.15 -12.85 15.15 -11.65 14 -10 14 L-9 14 M15 32 L-15 32 Q-16.65 32 -17.85 30.8 -19 29.65 -19 28 L-19 25.45 -18.95 25.45 Q-18.8 24.15 -17.85 23.15 L-17.65 23 17.65 23 17.8 23.15 Q18.8 24.15 19 25.45 L19 28 Q19 29.65 17.8 30.8 16.65 32 15 32',
  chessQueen:
    'M-7.1 -22.1 Q-5.75 -23.45 -4.1 -24.15 -5 -25.4 -5 -27 -5 -29.05 -3.55 -30.55 -2.05 -32 0 -32 2.05 -32 3.5 -30.55 5 -29.05 5 -27 5 -25.4 4.1 -24.15 L7.05 -22.1 Q9.1 -20.05 9.75 -17.4 L6.85 -15.55 2.95 -18.1 3 -18.1 Q1.6 -19 0 -19 -1.6 -19 -2.85 -18.1 L-6.85 -15.55 -9.7 -17.4 Q-9.1 -20.05 -7.1 -22.1 M-9 14 L-9 4 -10 4 Q-11.65 4 -12.85 2.8 -14 1.65 -14 0 L-14 -1.8 -12.6 -1.85 -15.9 -13.15 -15.85 -14.5 Q-15.65 -15.15 -15.05 -15.55 -14.5 -15.95 -13.75 -16 -13.05 -16 -12.45 -15.6 L-6.85 -12 -1.25 -15.6 Q-0.7 -16 0 -16 0.7 -16 1.3 -15.6 L6.85 -12 12.45 -15.6 Q13.05 -16 13.75 -16 14.5 -15.95 15.05 -15.55 L15.9 -14.5 Q16.1 -13.8 15.9 -13.15 L12.6 -1.85 14 -1.8 14 0 Q14 1.65 12.8 2.8 11.65 4 10 4 L9 4 9 14 10 14 Q11.65 14 12.8 15.15 13.8 16.15 14 17.45 L14 21 -14 21 -14 17.45 -13.95 17.45 Q-13.8 16.15 -12.85 15.15 -11.65 14 -10 14 L-9 14 M15 32 L-15 32 Q-16.65 32 -17.85 30.8 -19 29.65 -19 28 L-19 25.45 -18.95 25.45 Q-18.8 24.15 -17.85 23.15 L-17.65 23 17.65 23 17.8 23.15 Q18.8 24.15 19 25.45 L19 28 Q19 29.65 17.8 30.8 16.65 32 15 32',
  chessRook:
    'M-17 17.45 L-16.95 17.45 Q-16.8 16.15 -15.85 15.15 -14.65 14 -13 14 L-12 14 -12 -6.15 -18.4 -12.55 Q-19 -13.15 -19 -14 L-19 -26 Q-19 -26.85 -18.4 -27.4 -17.85 -28 -17 -28 L-11 -28 Q-10.15 -28 -9.55 -27.4 -9 -26.85 -9 -26 L-9 -20 -5 -20 -5 -26 Q-5 -26.85 -4.4 -27.4 -3.85 -28 -3 -28 L3 -28 Q3.85 -28 4.45 -27.4 5 -26.85 5 -26 L5 -20 9 -20 9 -26 Q9 -26.85 9.6 -27.4 10.15 -28 11 -28 L17 -28 Q17.85 -28 18.45 -27.4 19 -26.85 19 -26 L19 -14 Q19 -13.15 18.45 -12.55 L12 -6.1 12 14 13 14 Q14.65 14 15.8 15.15 16.8 16.15 17 17.45 L17 21 -17 21 -17 17.45 M18 32 L-18 32 Q-19.65 32 -20.85 30.8 -22 29.65 -22 28 L-22 25.45 -21.95 25.45 Q-21.8 24.15 -20.85 23.15 L-20.65 23 20.65 23 20.8 23.15 Q21.8 24.15 22 25.45 L22 28 Q22 29.65 20.8 30.8 19.65 32 18 32',
  chessBishop:
    'M-10 14 L-7.55 1.8 -8.5 1.1 Q-11.35 -1.25 -11.9 -4.35 L-12 -5.85 -12 -6.35 Q-11.75 -13.5 -8.5 -18.7 -6.85 -21.2 -4.9 -22.5 -6 -24 -6 -26 -6 -28.5 -4.25 -30.3 -2.5 -32 0 -32 2.5 -32 4.25 -30.3 6 -28.5 6 -26 6 -24 4.9 -22.5 L6.9 -20.7 Q8.75 -18.45 6.65 -16.2 L2.25 -11.75 Q1.5 -11.05 1.5 -10 1.5 -8.95 2.25 -8.2 2.95 -7.5 4 -7.5 5.05 -7.5 5.8 -8.2 L8.25 -10.65 Q11.6 -13.75 11.95 -8.2 L12 -7.4 12 -5.85 11.9 -4.35 Q11.35 -1.25 8.45 1.1 L7.55 1.8 10 14 13 14 Q14.65 14 15.8 15.15 16.8 16.15 17 17.45 L17 21 -17 21 -17 17.45 -16.95 17.45 Q-16.8 16.15 -15.85 15.15 -14.65 14 -13 14 L-10 14 M18 32 L-18 32 Q-19.65 32 -20.85 30.8 -22 29.65 -22 28 L-22 25.45 -21.95 25.45 Q-21.8 24.15 -20.85 23.15 L-20.65 23 20.65 23 20.8 23.15 Q21.8 24.15 22 25.45 L22 28 Q22 29.65 20.8 30.8 19.65 32 18 32',
  chessKnight:
    'M-17 17.45 L-16.95 17.45 Q-16.8 16.15 -15.85 15.15 -14.7 14.05 -13.15 14 -11.4 10.05 -5.9 5.75 -2.05 2.65 1.65 -4.6 L1.75 -6.1 0.9 -5.85 1 -6 Q-6.55 0.5 -12.5 -0.05 -15.8 -0.3 -16.9 -3.5 L-17 -4.2 -16.8 -4.85 -8.15 -19.15 -10.4 -21.35 Q-10.85 -21.8 -10.85 -22.45 -10.85 -23.1 -10.4 -23.55 -9.95 -24 -9.3 -24 L3.05 -24 3.15 -24 Q16.3 -23.45 17 -10.25 L17 2.1 17 2.25 Q16.1 9.75 13.95 14.1 15 14.35 15.8 15.15 16.8 16.15 17 17.45 L17 21 -17 21 -17 17.45 M18 32 L-18 32 Q-19.65 32 -20.85 30.8 -22 29.65 -22 28 L-22 25.45 -21.95 25.45 Q-21.8 24.15 -20.85 23.15 L-20.65 23 20.65 23 20.8 23.15 Q21.8 24.15 22 25.45 L22 28 Q22 29.65 20.8 30.8 19.65 32 18 32',
  chessPawn:
    'M10 -18 Q10 -14.55 8 -12 9.65 -12 10.8 -10.85 11.8 -9.85 12 -8.55 L12 -6 Q12 -4.35 10.8 -3.2 L9.3 -2.2 12 14 13 14 Q14.65 14 15.8 15.15 16.8 16.15 17 17.45 L17 21 -17 21 -17 17.45 -16.95 17.45 Q-16.8 16.15 -15.85 15.15 -14.65 14 -13 14 L-12 14 -9.3 -2.2 -10.85 -3.2 Q-12 -4.35 -12 -6 L-12 -8.55 -11.95 -8.55 Q-11.8 -9.85 -10.85 -10.85 -9.65 -12 -8 -12 -10 -14.55 -10 -18 -10 -22.15 -7.1 -25.15 -4.15 -28 0 -28 4.15 -28 7.05 -25.15 10 -22.15 10 -18 M18 32 L-18 32 Q-19.65 32 -20.85 30.8 -22 29.65 -22 28 L-22 25.45 -21.95 25.45 Q-21.8 24.15 -20.85 23.15 L-20.65 23 20.65 23 20.8 23.15 Q21.8 24.15 22 25.45 L22 28 Q22 29.65 20.8 30.8 19.65 32 18 32',
};

/**
 * 1. PLAY — Crossed Swords & Shield Crest (Redesigned from Itch.io `sword.svg` + `shield.svg`)
 */
export const PlaySwordsVectorIcon: React.FC<IconProps> = ({ size = 28, className = '' }) => (
  <svg
    width={size}
    height={size}
    viewBox="-36 -36 72 72"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`game-vector-icon ${className}`}
  >
    <defs>
      <linearGradient id="itchBladeSteel" x1="-27" y1="-27" x2="27" y2="27" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#FFF7D6" />
        <stop offset="45%" stopColor="#F3CE68" />
        <stop offset="100%" stopColor="#9E7118" />
      </linearGradient>
      <linearGradient id="itchShieldCore" x1="0" y1="-28" x2="0" y2="28" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#2A2010" />
        <stop offset="100%" stopColor="#0E131F" />
      </linearGradient>
    </defs>
    <path
      d={ITCH_PATHS.shield}
      fill="url(#itchShieldCore)"
      stroke="url(#itchBladeSteel)"
      strokeWidth="3.2"
      transform="scale(0.95)"
    />
    <g transform="scale(0.88)">
      <path d={ITCH_PATHS.sword} fill="url(#itchBladeSteel)" />
      <path d={ITCH_PATHS.sword} fill="url(#itchBladeSteel)" transform="scale(-1, 1)" />
    </g>
    <polygon points="0,-6 6,0 0,6 -6,0" fill="#EF4444" stroke="#FFF3C4" strokeWidth="1.5" />
  </svg>
);

export const CrossedSwordsVectorIcon = PlaySwordsVectorIcon;

/**
 * 2. SKINS — Royal Reliquary Crown & Shield (Redesigned from Itch.io `crown_a.svg` + `shield.svg`)
 */
export const SkinsCrownVectorIcon: React.FC<IconProps> = ({ size = 28, className = '' }) => (
  <svg
    width={size}
    height={size}
    viewBox="-36 -36 72 72"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`game-vector-icon ${className}`}
  >
    <defs>
      <linearGradient id="itchCrownGold" x1="-26" y1="-24" x2="26" y2="24" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#FFF5C2" />
        <stop offset="40%" stopColor="#F5D061" />
        <stop offset="85%" stopColor="#C99322" />
        <stop offset="100%" stopColor="#85580A" />
      </linearGradient>
      <radialGradient id="itchCrownBack" cx="50%" cy="40%" r="65%">
        <stop offset="0%" stopColor="#261D3A" />
        <stop offset="100%" stopColor="#0C101B" />
      </radialGradient>
    </defs>
    <circle cx="0" cy="0" r="32" fill="url(#itchCrownBack)" stroke="url(#itchCrownGold)" strokeWidth="3.2" />
    <circle cx="0" cy="0" r="27.5" stroke="#F5D76E" strokeWidth="1" strokeDasharray="3 2.5" opacity="0.55" />
    <path d={ITCH_PATHS.crownA} fill="url(#itchCrownGold)" transform="translate(0, 1) scale(0.86)" />
    <circle cx="0" cy="-20" r="3" fill="#38BDF8" stroke="#FFF" strokeWidth="0.9" />
    <circle cx="-21" cy="-9" r="2.5" fill="#F43F5E" stroke="#FFF" strokeWidth="0.8" />
    <circle cx="21" cy="-9" r="2.5" fill="#10B981" stroke="#FFF" strokeWidth="0.8" />
  </svg>
);

export const ArmoryChestVectorIcon = SkinsCrownVectorIcon;

/**
 * 3. LOGIN (GOOGLE) — Sanctum Shield Crest (Redesigned from Itch.io `shield.svg` + `crown_b.svg`)
 */
export const GoogleShieldVectorIcon: React.FC<IconProps> = ({ size = 28, className = '' }) => (
  <svg
    width={size}
    height={size}
    viewBox="-36 -36 72 72"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`game-vector-icon ${className}`}
  >
    <defs>
      <linearGradient id="itchWardShield" x1="-26" y1="-28" x2="26" y2="28" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#1E3A5F" />
        <stop offset="55%" stopColor="#0F1E36" />
        <stop offset="100%" stopColor="#08101E" />
      </linearGradient>
      <linearGradient id="itchWardRim" x1="-27" y1="-28" x2="27" y2="28" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#FFF3C4" />
        <stop offset="50%" stopColor="#E5B842" />
        <stop offset="100%" stopColor="#8A6214" />
      </linearGradient>
    </defs>
    <path
      d={ITCH_PATHS.shield}
      fill="url(#itchWardShield)"
      stroke="url(#itchWardRim)"
      strokeWidth="3.6"
      transform="scale(1.06)"
    />
    <path
      d={ITCH_PATHS.shield}
      fill="none"
      stroke="#93C5FD"
      strokeWidth="1.2"
      strokeDasharray="3 2"
      opacity="0.6"
      transform="scale(0.86)"
    />
    <path
      d="M8 -3 H0 V3 H5.5 C4.8 6.2 2.4 8 0 8 C-4.4 8 -8 4.4 -8 0 C-8 -4.4 -4.4 -8 0 -8 C2.1 -8 3.9 -7.1 5.2 -5.8 L9.2 -9.8 C6.8 -12.1 3.6 -13.5 0 -13.5 C-7.5 -13.5 -13.5 -7.5 -13.5 0 C-13.5 7.5 -7.5 13.5 0 13.5 C7 13.5 13 8.5 13 0 C13 -1.1 12.9 -2.1 12.7 -3 H8 Z"
      fill="url(#itchWardRim)"
    />
  </svg>
);

/**
 * 4. GOOGLE SYNCED — Emerald Sanctum Shield Seal (Redesigned from Itch.io `shield.svg` + Checkmark)
 */
export const CloudCheckVectorIcon: React.FC<IconProps> = ({ size = 28, className = '' }) => (
  <svg
    width={size}
    height={size}
    viewBox="-36 -36 72 72"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`game-vector-icon ${className}`}
  >
    <defs>
      <linearGradient id="itchSyncEmerald" x1="-26" y1="-28" x2="26" y2="28" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#065F46" />
        <stop offset="60%" stopColor="#064E3B" />
        <stop offset="100%" stopColor="#022C22" />
      </linearGradient>
      <linearGradient id="itchSyncRim" x1="-26" y1="-28" x2="26" y2="28" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#A7F3D0" />
        <stop offset="50%" stopColor="#34D399" />
        <stop offset="100%" stopColor="#059669" />
      </linearGradient>
    </defs>
    <path
      d={ITCH_PATHS.shield}
      fill="url(#itchSyncEmerald)"
      stroke="url(#itchSyncRim)"
      strokeWidth="3.6"
      transform="scale(1.06)"
    />
    <path
      d="M-10 1 L-3 8 L12 -7"
      stroke="#ECFDF5"
      strokeWidth="5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

/**
 * 5. LIVE LEADERBOARDS — Grandmaster Laurel & Crown Award (Redesigned from Itch.io `award.svg` + `crown_b.svg`)
 */
export const TrophyChaliceVectorIcon: React.FC<IconProps> = ({ size = 28, className = '' }) => (
  <svg
    width={size}
    height={size}
    viewBox="-36 -36 72 72"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`game-vector-icon ${className}`}
  >
    <defs>
      <linearGradient id="itchAwardGold" x1="-28" y1="-28" x2="28" y2="28" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#FFF7CC" />
        <stop offset="40%" stopColor="#F5C84C" />
        <stop offset="85%" stopColor="#B88218" />
        <stop offset="100%" stopColor="#7C530A" />
      </linearGradient>
    </defs>
    <circle cx="0" cy="0" r="32" fill="#101522" stroke="url(#itchAwardGold)" strokeWidth="2.8" />
    <path d={ITCH_PATHS.award} fill="url(#itchAwardGold)" transform="scale(0.92)" />
    <path d={ITCH_PATHS.crownB} fill="url(#itchAwardGold)" transform="translate(0, -3) scale(0.42)" />
  </svg>
);

export const TrophyVectorIcon = TrophyChaliceVectorIcon;

/**
 * 6. SETTINGS — Ornate Astrolabe / Gear Medallion (Redesigned from Itch.io `game-icons` gear + Sanctum medallion)
 */
export const SettingsGearVectorIcon: React.FC<IconProps> = ({ size = 28, className = '' }) => (
  <svg
    width={size}
    height={size}
    viewBox="-36 -36 72 72"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`game-vector-icon ${className}`}
  >
    <defs>
      <linearGradient id="itchGearGold" x1="-28" y1="-28" x2="28" y2="28" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#FFF3C4" />
        <stop offset="45%" stopColor="#E5B842" />
        <stop offset="100%" stopColor="#8A6214" />
      </linearGradient>
    </defs>
    <circle cx="0" cy="0" r="31" fill="#111726" stroke="url(#itchGearGold)" strokeWidth="2.8" />
    <g stroke="url(#itchGearGold)" strokeWidth="5.5" strokeLinecap="round">
      <line x1="0" y1="-24" x2="0" y2="-17" />
      <line x1="0" y1="17" x2="0" y2="24" />
      <line x1="-24" y1="0" x2="-17" y2="0" />
      <line x1="17" y1="0" x2="24" y2="0" />
      <line x1="-17" y1="-17" x2="-12" y2="-12" />
      <line x1="12" y1="12" x2="17" y2="17" />
      <line x1="17" y1="-17" x2="12" y2="-12" />
      <line x1="-12" y1="12" x2="-17" y2="17" />
    </g>
    <circle cx="0" cy="0" r="16" fill="#171F32" stroke="url(#itchGearGold)" strokeWidth="3.5" />
    <circle cx="0" cy="0" r="6.5" fill="url(#itchGearGold)" />
  </svg>
);

/**
 * 7. 3D LIVE PREVIEW EYE — Arcane Scrying Lens Icon
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
      d="M1.5 12C3.7 7.3 7.5 4.5 12 4.5C16.5 4.5 20.3 7.3 22.5 12C20.3 16.7 16.5 19.5 12 19.5C7.5 19.5 3.7 16.7 1.5 12Z"
      stroke="currentColor"
      strokeWidth="1.9"
    />
    <circle cx="12" cy="12" r="3.5" fill="currentColor" />
  </svg>
);

/**
 * 8. GOLD TREASURY COIN STACK — Redesigned from Itch.io `tokens_stack.svg`
 */
export const GoldCoinVectorIcon: React.FC<IconProps> = ({ size = 18, className = '' }) => (
  <svg
    width={size}
    height={size}
    viewBox="-36 -36 72 72"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`game-vector-icon ${className}`}
  >
    <defs>
      <radialGradient id="sanctumGoldMedallion" cx="35%" cy="28%" r="72%">
        <stop offset="0%" stopColor="#261D0A" />
        <stop offset="70%" stopColor="#141007" />
        <stop offset="100%" stopColor="#090704" />
      </radialGradient>
      <linearGradient id="sanctumGoldFoil" x1="-28" y1="-30" x2="28" y2="30" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#FFF5C0" />
        <stop offset="35%" stopColor="#F5D061" />
        <stop offset="75%" stopColor="#C99322" />
        <stop offset="100%" stopColor="#8A5E0B" />
      </linearGradient>
    </defs>
    <circle cx="0" cy="0" r="33" fill="url(#sanctumGoldMedallion)" stroke="url(#sanctumGoldFoil)" strokeWidth="3.8" />
    <circle cx="0" cy="0" r="28" stroke="#F5D76E" strokeWidth="1" strokeDasharray="3 2.5" opacity="0.55" />
    <path d={ITCH_PATHS.tokensStack} fill="url(#sanctumGoldFoil)" transform="scale(0.76)" />
  </svg>
);

/**
 * 9. COMMANDER ROYAL SIGIL AVATAR — Redesigned using Itch.io Board Game Icons (`chess_king`, `chess_queen`, `crown_a`, `sword`, `shield`, `fire`)
 */
export const CommanderSigilVectorIcon: React.FC<IconProps & { sigil: string }> = ({
  sigil,
  size = 36,
  className = '',
}) => {
  let pathData = ITCH_PATHS.chessKing;
  let scale = 0.85;
  if (sigil === '♕' || sigil === '♛') {
    pathData = ITCH_PATHS.chessQueen;
  } else if (sigil === '🐉' || sigil === '◆') {
    pathData = ITCH_PATHS.fire;
    scale = 0.9;
  } else if (sigil === '⚔' || sigil === '▲') {
    pathData = ITCH_PATHS.sword;
  } else if (sigil === '⚡' || sigil === '✦') {
    pathData = ITCH_PATHS.crownB;
  } else if (sigil === '🛡' || sigil === '❖') {
    pathData = ITCH_PATHS.shield;
  } else if (sigil === '◈') {
    pathData = ITCH_PATHS.crownA;
  }

  return (
    <svg
      width={size}
      height={size}
      viewBox="-36 -36 72 72"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`game-vector-icon ${className}`}
    >
      <defs>
        <linearGradient id="itchSigilGold" x1="-26" y1="-28" x2="26" y2="28" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FFF7D6" />
          <stop offset="45%" stopColor="#F5D061" />
          <stop offset="85%" stopColor="#C89120" />
          <stop offset="100%" stopColor="#7C520A" />
        </linearGradient>
      </defs>
      <path
        d={pathData}
        fill="url(#itchSigilGold)"
        stroke="#422C05"
        strokeWidth="1.6"
        transform={`scale(${scale})`}
      />
    </svg>
  );
};

/**
 * 10. Gold Bounty Pouch Vector Icon (Redesigned from Itch.io `pouch.svg`)
 */
export const ItchPouchBountyIcon: React.FC<IconProps> = ({ size = 22, className = '' }) => (
  <svg width={size} height={size} viewBox="-36 -36 72 72" fill="none" className={`game-vector-icon ${className}`}>
    <defs>
      <linearGradient id="bountyPouchGold" x1="-24" y1="-26" x2="24" y2="26" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#FFF7CC" />
        <stop offset="45%" stopColor="#F5D061" />
        <stop offset="100%" stopColor="#B47B16" />
      </linearGradient>
    </defs>
    <circle cx="0" cy="0" r="32" fill="#1C1507" stroke="url(#bountyPouchGold)" strokeWidth="3.5" />
    <path d={ITCH_PATHS.pouch} fill="url(#bountyPouchGold)" transform="scale(0.85)" />
  </svg>
);

export const ItchRotateCameraIcon: React.FC<IconProps> = ({ size = 15, className = '' }) => (
  <svg width={size} height={size} viewBox="-36 -36 72 72" fill="none" className={`game-vector-icon ${className}`}>
    <path d={ITCH_PATHS.arrowClockwise} fill="currentColor" transform="scale(1.05)" />
  </svg>
);

/**
 * 11. BULLET MODE ICON — Blazing Fire & Ultra-Fast Bolt Crest
 */
export const BulletModeVectorIcon: React.FC<IconProps> = ({ size = 22, className = '' }) => (
  <svg width={size} height={size} viewBox="-36 -36 72 72" fill="none" className={`game-vector-icon ${className}`}>
    <defs>
      <linearGradient id="bulletFireGrad" x1="-24" y1="-28" x2="24" y2="28" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#FFF7D6" />
        <stop offset="45%" stopColor="#FB923C" />
        <stop offset="100%" stopColor="#DC2626" />
      </linearGradient>
    </defs>
    <circle cx="0" cy="0" r="32" fill="#1F0D0D" stroke="url(#bulletFireGrad)" strokeWidth="3.2" />
    <path d={ITCH_PATHS.fire} fill="url(#bulletFireGrad)" transform="scale(0.84)" />
  </svg>
);

/**
 * 12. BLITZ MODE ICON — Fast-Paced Lightning & Shield Crest
 */
export const BlitzModeVectorIcon: React.FC<IconProps> = ({ size = 22, className = '' }) => (
  <svg width={size} height={size} viewBox="-36 -36 72 72" fill="none" className={`game-vector-icon ${className}`}>
    <defs>
      <linearGradient id="blitzGoldGrad" x1="-24" y1="-28" x2="24" y2="28" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#FEF08A" />
        <stop offset="50%" stopColor="#F59E0B" />
        <stop offset="100%" stopColor="#B45309" />
      </linearGradient>
    </defs>
    <circle cx="0" cy="0" r="32" fill="#1B1608" stroke="url(#blitzGoldGrad)" strokeWidth="3.2" />
    <path
      d="M4 -24 L-14 2 H1 L-5 24 L16 -4 H1 L4 -24 Z"
      fill="url(#blitzGoldGrad)"
      stroke="#FFFBEB"
      strokeWidth="1.4"
      strokeLinejoin="round"
    />
  </svg>
);

/**
 * 13. RAPID MODE ICON — Ornate Sanctum Hourglass Chronometer
 */
export const RapidModeVectorIcon: React.FC<IconProps> = ({ size = 22, className = '' }) => (
  <svg width={size} height={size} viewBox="-36 -36 72 72" fill="none" className={`game-vector-icon ${className}`}>
    <defs>
      <linearGradient id="rapidChronoGrad" x1="-24" y1="-28" x2="24" y2="28" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#E0F2FE" />
        <stop offset="50%" stopColor="#38BDF8" />
        <stop offset="100%" stopColor="#0284C7" />
      </linearGradient>
    </defs>
    <circle cx="0" cy="0" r="32" fill="#0B1926" stroke="url(#rapidChronoGrad)" strokeWidth="3.2" />
    <path d={ITCH_PATHS.hourglass} fill="url(#rapidChronoGrad)" transform="scale(0.82)" />
  </svg>
);

