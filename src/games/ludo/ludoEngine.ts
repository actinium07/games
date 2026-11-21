import type { AIDifficulty } from '../../types/game';

export type LudoSeatId = 'cyan' | 'green' | 'amber' | 'coral';

export interface LudoToken {
  id: number; // 0..3
  progress: number; // -1 = yard, 0..50 = outer track, 51..55 = home lane, 56 = home goal
}

export interface LudoPlayer {
  seat: LudoSeatId;
  name: string;
  isAI: boolean;
  startOffset: number;
  tokens: LudoToken[];
}

export interface LudoGameState {
  players: LudoPlayer[];
  activeSeatIndex: number;
  diceValue: number | null;
  phase: 'roll' | 'select' | 'gameover';
  consecutiveSixes: number;
  overdrive: boolean;
  winner: LudoSeatId | null;
  lastEvent: string;
  turnCount: number;
}

export const LUDO_TRACK_COORDS: [number, number][] = [
  // 0..4 (Red arm right)
  [6, 1], [6, 2], [6, 3], [6, 4], [6, 5],
  // 5..10 (Top left col up)
  [5, 6], [4, 6], [3, 6], [2, 6], [1, 6], [0, 6],
  // 11 (Top center)
  [0, 7],
  // 12..17 (Top right col down; 13 is Green start)
  [0, 8], [1, 8], [2, 8], [3, 8], [4, 8], [5, 8],
  // 18..23 (Right top row right)
  [6, 9], [6, 10], [6, 11], [6, 12], [6, 13], [6, 14],
  // 24 (Right center)
  [7, 14],
  // 25..30 (Right bottom row left; 26 is Amber start)
  [8, 14], [8, 13], [8, 12], [8, 11], [8, 10], [8, 9],
  // 31..36 (Bottom right col down)
  [9, 8], [10, 8], [11, 8], [12, 8], [13, 8], [14, 8],
  // 37 (Bottom center)
  [14, 7],
  // 38..43 (Bottom left col up; 39 is Cyan start)
  [14, 6], [13, 6], [12, 6], [11, 6], [10, 6], [9, 6],
  // 44..49 (Left bottom row left)
  [8, 5], [8, 4], [8, 3], [8, 2], [8, 1], [8, 0],
  // 50 (Left center)
  [7, 0],
  // 51 (Wrap corner)
  [6, 0],
];

export const LUDO_HOME_LANES: Record<LudoSeatId, [number, number][]> = {
  coral: [[7, 1], [7, 2], [7, 3], [7, 4], [7, 5]],
  green: [[1, 7], [2, 7], [3, 7], [4, 7], [5, 7]],
  amber: [[7, 13], [7, 12], [7, 11], [7, 10], [7, 9]],
  cyan: [[13, 7], [12, 7], [11, 7], [10, 7], [9, 7]],
};

export const LUDO_YARD_SLOTS: Record<LudoSeatId, [number, number][]> = {
  coral: [[1.8, 1.8], [1.8, 3.6], [3.6, 1.8], [3.6, 3.6]],
  green: [[1.8, 10.4], [1.8, 12.2], [3.6, 10.4], [3.6, 12.2]],
  amber: [[10.4, 10.4], [10.4, 12.2], [12.2, 10.4], [12.2, 12.2]],
  cyan: [[10.4, 1.8], [10.4, 3.6], [12.2, 1.8], [12.2, 3.6]],
};

export const LUDO_GOAL_OFFSETS: Record<LudoSeatId, [number, number]> = {
  coral: [7, 6.1],
  green: [6.1, 7],
  amber: [7, 7.9],
  cyan: [7.9, 7],
};

export const SAFE_TRACK_INDICES = new Set([0, 8, 13, 21, 26, 34, 39, 47]);
export const WARP_TRACK_INDICES = new Set([4, 17, 30, 43]);

const SEAT_META: Record<LudoSeatId, { name: string; startOffset: number }> = {
  cyan: { name: 'Player (Cyan)', startOffset: 39 },
  coral: { name: 'Vanguard AI (Coral)', startOffset: 0 },
  green: { name: 'Orion AI (Green)', startOffset: 13 },
  amber: { name: 'Solaris AI (Amber)', startOffset: 26 },
};

export function createInitialLudoState(opponents: 1 | 3 = 1, overdrive = true): LudoGameState {
  const seats: LudoSeatId[] = opponents === 1 ? ['cyan', 'green'] : ['cyan', 'coral', 'green', 'amber'];
  const players: LudoPlayer[] = seats.map((seat, idx) => ({
    seat,
    name: SEAT_META[seat].name,
    isAI: idx !== 0,
    startOffset: SEAT_META[seat].startOffset,
    tokens: [0, 1, 2, 3].map((id) => ({ id, progress: -1 })),
  }));

  return {
    players,
    activeSeatIndex: 0,
    diceValue: null,
    phase: 'roll',
    consecutiveSixes: 0,
    overdrive,
    winner: null,
    lastEvent: 'Roll the Quantum Die to deploy a token.',
    turnCount: 1,
  };
}

export function getGlobalTrackIndex(startOffset: number, progress: number): number | null {
  if (progress < 0 || progress > 50) return null;
  return (startOffset + progress) % 52;
}

export function getTokenGridCoord(player: LudoPlayer, token: LudoToken): [number, number] {
  if (token.progress === -1) {
    return LUDO_YARD_SLOTS[player.seat][token.id];
  }
  if (token.progress >= 0 && token.progress <= 50) {
    const idx = (player.startOffset + token.progress) % 52;
    return LUDO_TRACK_COORDS[idx];
  }
  if (token.progress >= 51 && token.progress <= 55) {
    return LUDO_HOME_LANES[player.seat][token.progress - 51];
  }
  return LUDO_GOAL_OFFSETS[player.seat];
}

export function getValidLudoMoves(state: LudoGameState): number[] {
  if (state.diceValue === null || state.phase !== 'select') return [];
  const player = state.players[state.activeSeatIndex];
  const roll = state.diceValue;
  const valid: number[] = [];

  for (const token of player.tokens) {
    if (token.progress === 56) continue;
    if (token.progress === -1) {
      if (roll === 6) valid.push(token.id);
    } else if (token.progress + roll <= 56) {
      valid.push(token.id);
    }
  }
  return valid;
}

export function rollLudoDice(state: LudoGameState, forcedRoll?: number): LudoGameState {
  if (state.phase !== 'roll') return state;
  const roll = forcedRoll ?? Math.floor(Math.random() * 6) + 1;
  const player = state.players[state.activeSeatIndex];
  const nextSixes = roll === 6 ? state.consecutiveSixes + 1 : 0;

  // Triple 6 penalty: forfeit turn
  if (nextSixes >= 3) {
    const nextSeat = (state.activeSeatIndex + 1) % state.players.length;
    return {
      ...state,
      diceValue: roll,
      consecutiveSixes: 0,
      activeSeatIndex: nextSeat,
      phase: 'roll',
      turnCount: state.turnCount + 1,
      lastEvent: `${player.name} rolled three 6s — turn forfeited!`,
    };
  }

  const candidateState: LudoGameState = {
    ...state,
    diceValue: roll,
    consecutiveSixes: nextSixes,
    phase: 'select',
  };

  const validMoves = getValidLudoMoves(candidateState);
  if (validMoves.length === 0) {
    const nextSeat = (state.activeSeatIndex + 1) % state.players.length;
    return {
      ...candidateState,
      phase: 'roll',
      activeSeatIndex: nextSeat,
      consecutiveSixes: 0,
      turnCount: state.turnCount + 1,
      lastEvent: `${player.name} rolled ${roll} — no legal moves.`,
    };
  }

  return {
    ...candidateState,
    lastEvent: `${player.name} rolled ${roll}. Choose a highlighted token.`,
  };
}

export function moveLudoToken(state: LudoGameState, tokenId: number): LudoGameState {
  if (state.phase !== 'select' || state.diceValue === null) return state;
  const valid = getValidLudoMoves(state);
  if (!valid.includes(tokenId)) return state;

  const roll = state.diceValue;
  const players = state.players.map((p) => ({
    ...p,
    tokens: p.tokens.map((t) => ({ ...t })),
  }));
  const activePlayer = players[state.activeSeatIndex];
  const token = activePlayer.tokens.find((t) => t.id === tokenId)!;

  let newProgress = token.progress === -1 ? 0 : token.progress + roll;
  let warped = false;

  if (state.overdrive && newProgress >= 0 && newProgress <= 50) {
    const globalIdx = getGlobalTrackIndex(activePlayer.startOffset, newProgress);
    if (globalIdx !== null && WARP_TRACK_INDICES.has(globalIdx) && newProgress + 3 <= 50) {
      newProgress += 3;
      warped = true;
    }
  }

  token.progress = newProgress;

  // Check capture on outer track
  let capturedName: string | null = null;
  if (newProgress >= 0 && newProgress <= 50) {
    const destGlobal = getGlobalTrackIndex(activePlayer.startOffset, newProgress)!;
    if (!SAFE_TRACK_INDICES.has(destGlobal)) {
      for (let pi = 0; pi < players.length; pi++) {
        if (pi === state.activeSeatIndex) continue;
        const opp = players[pi];
        for (const oppToken of opp.tokens) {
          const oppGlobal = getGlobalTrackIndex(opp.startOffset, oppToken.progress);
          if (oppGlobal === destGlobal) {
            oppToken.progress = -1;
            capturedName = opp.name;
          }
        }
      }
    }
  }

  // Check victory
  const allHome = activePlayer.tokens.every((t) => t.progress === 56);
  if (allHome) {
    return {
      ...state,
      players,
      phase: 'gameover',
      winner: activePlayer.seat,
      lastEvent: `${activePlayer.name} docked all 4 tokens and won!`,
    };
  }

  const reachedHome = newProgress === 56;
  const bonusTurn = roll === 6 || Boolean(capturedName) || reachedHome;
  const nextSeat = bonusTurn ? state.activeSeatIndex : (state.activeSeatIndex + 1) % players.length;

  let eventMsg = `${activePlayer.name} advanced token #${tokenId + 1}`;
  if (warped) eventMsg += ' via Quantum Warp (+3)';
  if (capturedName) eventMsg += ` — captured ${capturedName}! Bonus roll!`;
  else if (reachedHome) eventMsg += ' into Home Core! Bonus roll!';
  else if (roll === 6) eventMsg += ' — rolled 6! Bonus roll!';

  return {
    ...state,
    players,
    activeSeatIndex: nextSeat,
    diceValue: null,
    phase: 'roll',
    consecutiveSixes: bonusTurn ? state.consecutiveSixes : 0,
    turnCount: bonusTurn ? state.turnCount : state.turnCount + 1,
    lastEvent: eventMsg,
  };
}

export function selectBestLudoToken(state: LudoGameState, difficulty: AIDifficulty): number | null {
  const valid = getValidLudoMoves(state);
  if (valid.length === 0) return null;
  if (valid.length === 1) return valid[0];
  if (difficulty === 'standard' && Math.random() < 0.25) {
    return valid[Math.floor(Math.random() * valid.length)];
  }

  const player = state.players[state.activeSeatIndex];
  const roll = state.diceValue!;
  let bestId = valid[0];
  let bestScore = -Infinity;

  for (const tid of valid) {
    const token = player.tokens.find((t) => t.id === tid)!;
    let score = 0;

    if (token.progress === -1) {
      score += 85; // Deploy from yard
    } else {
      let nextProg = token.progress + roll;
      if (state.overdrive && nextProg <= 50) {
        const g = getGlobalTrackIndex(player.startOffset, nextProg);
        if (g !== null && WARP_TRACK_INDICES.has(g) && nextProg + 3 <= 50) {
          nextProg += 3;
          score += 24;
        }
      }

      if (nextProg === 56) score += 140; // Reach goal
      else if (nextProg >= 51) score += 95; // Enter safe home stretch

      if (nextProg <= 50) {
        const destGlobal = getGlobalTrackIndex(player.startOffset, nextProg)!;
        if (SAFE_TRACK_INDICES.has(destGlobal)) {
          score += 48;
        } else {
          // Check capture opportunity
          let canCapture = false;
          for (let pi = 0; pi < state.players.length; pi++) {
            if (pi === state.activeSeatIndex) continue;
            for (const oppT of state.players[pi].tokens) {
              if (getGlobalTrackIndex(state.players[pi].startOffset, oppT.progress) === destGlobal) {
                canCapture = true;
              }
            }
          }
          if (canCapture) score += 115;

          // Penalty if landing ahead of an opponent within 1..6 steps
          if (difficulty === 'grandmaster') {
            for (let pi = 0; pi < state.players.length; pi++) {
              if (pi === state.activeSeatIndex) continue;
              for (const oppT of state.players[pi].tokens) {
                const og = getGlobalTrackIndex(state.players[pi].startOffset, oppT.progress);
                if (og !== null) {
                  const dist = (destGlobal - og + 52) % 52;
                  if (dist >= 1 && dist <= 6) score -= 28;
                }
              }
            }
          }
        }
      }

      score += token.progress * 0.4; // Prefer advancing leading tokens
    }

    if (score > bestScore) {
      bestScore = score;
      bestId = tid;
    }
  }

  return bestId;
}
