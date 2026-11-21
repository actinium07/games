export interface SnakeOrLadder {
  from: number;
  to: number;
  kind: 'ladder' | 'snake';
}

export interface SnakesPlayer {
  id: 'player' | 'ai';
  name: string;
  position: number; // 0 = off-board start, 1..100 = board squares
  shields: number;
  boostsUsed: number;
  snakesHit: number;
  laddersClimbed: number;
}

export interface SnakesStepResolution {
  rolled: number;
  from: number;
  landed: number;
  finalPos: number;
  eventType: 'normal' | 'ladder' | 'snake' | 'shielded' | 'boost' | 'overshoot' | 'win';
  message: string;
  bonusTurn: boolean;
}

export interface SnakesGameState {
  players: [SnakesPlayer, SnakesPlayer];
  activeIndex: 0 | 1;
  lastRoll: number | null;
  cyberMode: boolean;
  winner: 'player' | 'ai' | null;
  turnCount: number;
  lastEvent: string;
  lastResolution: SnakesStepResolution | null;
}

export const LADDERS: Record<number, number> = {
  4: 25,
  13: 46,
  33: 49,
  42: 63,
  50: 69,
  62: 81,
  74: 92,
};

export const SNAKES: Record<number, number> = {
  27: 5,
  40: 3,
  43: 18,
  54: 31,
  66: 45,
  76: 58,
  89: 53,
  99: 41,
};

export const HYPER_BOOSTS = new Set([19, 36, 70]);
export const SHIELD_PADS = new Set([15, 57]);

export function getSquareGridCoord(square: number): { row: number; col: number } {
  const clamped = Math.max(1, Math.min(100, square));
  const zero = clamped - 1;
  const rowFromBottom = Math.floor(zero / 10);
  const row = 9 - rowFromBottom;
  const colInRow = zero % 10;
  const col = rowFromBottom % 2 === 0 ? colInRow : 9 - colInRow;
  return { row, col };
}

export function createInitialSnakesState(cyberMode = true): SnakesGameState {
  return {
    players: [
      { id: 'player', name: 'Player (Cyan)', position: 1, shields: 0, boostsUsed: 0, snakesHit: 0, laddersClimbed: 0 },
      { id: 'ai', name: 'Vanguard AI', position: 1, shields: 0, boostsUsed: 0, snakesHit: 0, laddersClimbed: 0 },
    ],
    activeIndex: 0,
    lastRoll: null,
    cyberMode,
    winner: null,
    turnCount: 1,
    lastEvent: 'Roll the Quantum Die to race to Sector 100.',
    lastResolution: null,
  };
}

export function applySnakesRoll(state: SnakesGameState, forcedRoll?: number): SnakesGameState {
  if (state.winner) return state;

  const roll = forcedRoll ?? Math.floor(Math.random() * 6) + 1;
  const players: [SnakesPlayer, SnakesPlayer] = [
    { ...state.players[0] },
    { ...state.players[1] },
  ];
  const actor = players[state.activeIndex];
  const startPos = actor.position;
  const target = startPos + roll;

  let resolution: SnakesStepResolution;

  if (target > 100) {
    resolution = {
      rolled: roll,
      from: startPos,
      landed: startPos,
      finalPos: startPos,
      eventType: 'overshoot',
      message: `${actor.name} rolled ${roll} — needs exact ${100 - startPos} to finish.`,
      bonusTurn: false,
    };
  } else {
    let finalPos = target;
    let eventType: SnakesStepResolution['eventType'] = 'normal';
    let message = `${actor.name} rolled ${roll} and moved to ${target}.`;

    if (state.cyberMode && SHIELD_PADS.has(target)) {
      actor.shields += 1;
      message = `${actor.name} rolled ${roll} → ${target} and acquired a Deflector Shield!`;
    } else if (state.cyberMode && HYPER_BOOSTS.has(target)) {
      finalPos = Math.min(100, target + 4);
      actor.boostsUsed += 1;
      eventType = 'boost';
      message = `${actor.name} hit Hyper-Boost at ${target} → surged to ${finalPos}!`;
    }

    if (LADDERS[finalPos]) {
      const dest = LADDERS[finalPos];
      actor.laddersClimbed += 1;
      eventType = 'ladder';
      message = `${actor.name} rolled ${roll} → climbed Plasma Ladder ${finalPos} to ${dest}!`;
      finalPos = dest;
    } else if (SNAKES[finalPos]) {
      if (state.cyberMode && actor.shields > 0) {
        actor.shields -= 1;
        eventType = 'shielded';
        message = `${actor.name} deflected Cyber Serpent at ${finalPos} using a Shield!`;
      } else {
        const dest = SNAKES[finalPos];
        actor.snakesHit += 1;
        eventType = 'snake';
        message = `${actor.name} rolled ${roll} → Cyber Serpent at ${finalPos} dropped to ${dest}!`;
        finalPos = dest;
      }
    }

    actor.position = finalPos;

    if (finalPos === 100) {
      resolution = {
        rolled: roll,
        from: startPos,
        landed: target,
        finalPos: 100,
        eventType: 'win',
        message: `${actor.name} reached Sector 100 and won the race!`,
        bonusTurn: false,
      };
      return {
        ...state,
        players,
        lastRoll: roll,
        winner: actor.id,
        lastEvent: resolution.message,
        lastResolution: resolution,
      };
    }

    const bonusTurn = roll === 6;
    if (bonusTurn && eventType === 'normal') {
      message += ' Rolled 6 — bonus roll!';
    }
    resolution = {
      rolled: roll,
      from: startPos,
      landed: target,
      finalPos,
      eventType,
      message,
      bonusTurn,
    };
  }

  const nextActive: 0 | 1 = resolution.bonusTurn ? state.activeIndex : state.activeIndex === 0 ? 1 : 0;

  return {
    ...state,
    players,
    activeIndex: nextActive,
    lastRoll: roll,
    turnCount: resolution.bonusTurn ? state.turnCount : state.turnCount + 1,
    lastEvent: resolution.message,
    lastResolution: resolution,
  };
}
