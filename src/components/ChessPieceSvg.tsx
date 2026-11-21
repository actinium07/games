import React from 'react';
import type { PieceColor, PieceType } from '../games/chess/chessEngine';

interface ChessPieceSvgProps {
  color: PieceColor;
  type: PieceType;
  className?: string;
}

export const ChessPieceSvg: React.FC<ChessPieceSvgProps> = ({ color, type, className = 'w-4/5 h-4/5' }) => {
  const isWhite = color === 'w';
  const fillMain = isWhite ? '#f1f5f9' : '#182235';
  const fillShade = isWhite ? '#cbd5e1' : '#0b111c';
  const strokeMain = isWhite ? '#0f172a' : '#f43f5e';
  const accent = isWhite ? '#06b6d4' : '#fb7185';

  return (
    <svg viewBox="0 0 64 64" className={`${className} drop-shadow-[0_4px_6px_rgba(0,0,0,0.55)]`} aria-hidden="true">
      {type === 'p' && (
        <g>
          <path
            d="M20 52 L44 52 L42 46 L22 46 Z"
            fill={fillShade}
            stroke={strokeMain}
            strokeWidth="2.2"
            strokeLinejoin="round"
          />
          <path
            d="M24 46 C26 37 27 32 26 27 L38 27 C37 32 38 37 40 46 Z"
            fill={fillMain}
            stroke={strokeMain}
            strokeWidth="2.2"
            strokeLinejoin="round"
          />
          <circle cx="32" cy="19" r="8.5" fill={fillMain} stroke={strokeMain} strokeWidth="2.2" />
          <circle cx="32" cy="19" r="3" fill={accent} />
        </g>
      )}

      {type === 'r' && (
        <g>
          <path d="M16 53 L48 53 L45 46 L19 46 Z" fill={fillShade} stroke={strokeMain} strokeWidth="2.2" strokeLinejoin="round" />
          <path d="M21 46 L22 24 L42 24 L43 46 Z" fill={fillMain} stroke={strokeMain} strokeWidth="2.2" strokeLinejoin="round" />
          <path
            d="M18 24 L18 12 L24 12 L24 17 L29 17 L29 12 L35 12 L35 17 L40 17 L40 12 L46 12 L46 24 Z"
            fill={fillMain}
            stroke={strokeMain}
            strokeWidth="2.2"
            strokeLinejoin="round"
          />
          <rect x="29" y="30" width="6" height="10" rx="1.5" fill={accent} />
        </g>
      )}

      {type === 'n' && (
        <g>
          <path d="M16 53 L48 53 L45 46 L19 46 Z" fill={fillShade} stroke={strokeMain} strokeWidth="2.2" strokeLinejoin="round" />
          <path
            d="M20 46 C20 35 24 30 28 26 L18 27 L16 22 L25 14 L26 9 L33 13 C41 14 46 21 45 33 C44 39 42 43 43 46 Z"
            fill={fillMain}
            stroke={strokeMain}
            strokeWidth="2.2"
            strokeLinejoin="round"
          />
          <circle cx="29" cy="19" r="2.2" fill={accent} />
          <path d="M35 20 C39 24 40 31 38 39" fill="none" stroke={accent} strokeWidth="2" strokeLinecap="round" />
        </g>
      )}

      {type === 'b' && (
        <g>
          <path d="M17 53 L47 53 L44 46 L20 46 Z" fill={fillShade} stroke={strokeMain} strokeWidth="2.2" strokeLinejoin="round" />
          <path
            d="M22 46 C23 36 22 28 24 22 C26 16 30 13 32 13 C34 13 38 16 40 22 C42 28 41 36 42 46 Z"
            fill={fillMain}
            stroke={strokeMain}
            strokeWidth="2.2"
            strokeLinejoin="round"
          />
          <circle cx="32" cy="10" r="3.5" fill={accent} stroke={strokeMain} strokeWidth="1.8" />
          <path d="M27 25 L37 33" stroke={accent} strokeWidth="2.5" strokeLinecap="round" />
          <circle cx="32" cy="22" r="2.2" fill={accent} />
        </g>
      )}

      {type === 'q' && (
        <g>
          <path d="M15 53 L49 53 L46 46 L18 46 Z" fill={fillShade} stroke={strokeMain} strokeWidth="2.2" strokeLinejoin="round" />
          <path
            d="M19 46 L14 21 L24 30 L32 16 L40 30 L50 21 L45 46 Z"
            fill={fillMain}
            stroke={strokeMain}
            strokeWidth="2.2"
            strokeLinejoin="round"
          />
          <circle cx="14" cy="17" r="2.8" fill={accent} stroke={strokeMain} strokeWidth="1.5" />
          <circle cx="32" cy="12" r="3.2" fill={accent} stroke={strokeMain} strokeWidth="1.5" />
          <circle cx="50" cy="17" r="2.8" fill={accent} stroke={strokeMain} strokeWidth="1.5" />
          <rect x="24" y="38" width="16" height="3.5" rx="1.5" fill={accent} />
        </g>
      )}

      {type === 'k' && (
        <g>
          <path d="M15 53 L49 53 L46 46 L18 46 Z" fill={fillShade} stroke={strokeMain} strokeWidth="2.2" strokeLinejoin="round" />
          <path
            d="M19 46 C18 35 16 26 22 23 C26 21 30 23 32 25 C34 23 38 21 42 23 C48 26 46 35 45 46 Z"
            fill={fillMain}
            stroke={strokeMain}
            strokeWidth="2.2"
            strokeLinejoin="round"
          />
          <path d="M32 8 L32 20 M26 13 L38 13" stroke={accent} strokeWidth="3.2" strokeLinecap="round" />
          <path d="M24 36 L40 36" stroke={accent} strokeWidth="2.6" strokeLinecap="round" />
        </g>
      )}
    </svg>
  );
};
