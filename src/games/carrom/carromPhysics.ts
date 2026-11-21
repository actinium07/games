import type { AIDifficulty } from '../../types/game';

export const BOARD_SIZE = 600;
export const WALL_MIN = 32;
export const WALL_MAX = 568;
export const POCKET_RADIUS = 23;
export const PIECE_RADIUS = 13.5;
export const STRIKER_RADIUS = 17.5;
export const PLAYER_BASELINE_Y = 492;
export const AI_BASELINE_Y = 108;
export const BASELINE_X_MIN = 136;
export const BASELINE_X_MAX = 464;

export const POCKETS: { x: number; y: number }[] = [
  { x: WALL_MIN + 19, y: WALL_MIN + 19 },
  { x: WALL_MAX - 19, y: WALL_MIN + 19 },
  { x: WALL_MIN + 19, y: WALL_MAX - 19 },
  { x: WALL_MAX - 19, y: WALL_MAX - 19 },
];

export type CarromDiscKind = 'white' | 'black' | 'queen' | 'striker';

export interface CarromDisc {
  id: string;
  kind: CarromDiscKind;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  mass: number;
  pocketed: boolean;
}

export type QueenState =
  | 'on_board'
  | 'pending_player'
  | 'pending_ai'
  | 'covered_player'
  | 'covered_ai';

export interface CarromMatchState {
  discs: CarromDisc[];
  turn: 'player' | 'ai';
  phase: 'aim' | 'simulating' | 'gameover';
  strikerX: number;
  queenState: QueenState;
  winner: 'player' | 'ai' | null;
  lastEvent: string;
  turnCount: number;
  playerPocketed: number;
  aiPocketed: number;
}

export function createInitialCarromRack(): CarromDisc[] {
  const cx = BOARD_SIZE / 2;
  const cy = BOARD_SIZE / 2;
  const discs: CarromDisc[] = [];

  // Center Queen
  discs.push({
    id: 'queen',
    kind: 'queen',
    x: cx,
    y: cy,
    vx: 0,
    vy: 0,
    radius: PIECE_RADIUS,
    mass: 1,
    pocketed: false,
  });

  // Inner ring: 6 pieces alternating white / black
  const r1 = PIECE_RADIUS * 2.08;
  let whiteIdx = 0;
  let blackIdx = 0;
  for (let i = 0; i < 6; i++) {
    const angle = (i * Math.PI) / 3 - Math.PI / 2;
    const kind: 'white' | 'black' = i % 2 === 0 ? 'white' : 'black';
    const id = kind === 'white' ? `w-${whiteIdx++}` : `b-${blackIdx++}`;
    discs.push({
      id,
      kind,
      x: cx + Math.cos(angle) * r1,
      y: cy + Math.sin(angle) * r1,
      vx: 0,
      vy: 0,
      radius: PIECE_RADIUS,
      mass: 1,
      pocketed: false,
    });
  }

  // Outer ring: 12 pieces (6 white, 6 black)
  const r2 = PIECE_RADIUS * 4.14;
  for (let i = 0; i < 12; i++) {
    const angle = (i * Math.PI) / 6 - Math.PI / 2;
    // Alternate nicely so total = 9 white, 9 black
    const kind: 'white' | 'black' = i % 2 === 0 ? 'white' : 'black';
    const id = kind === 'white' ? `w-${whiteIdx++}` : `b-${blackIdx++}`;
    const radialScale = i % 2 === 0 ? 0.96 : 0.9;
    discs.push({
      id,
      kind,
      x: cx + Math.cos(angle) * (r2 * radialScale),
      y: cy + Math.sin(angle) * (r2 * radialScale),
      vx: 0,
      vy: 0,
      radius: PIECE_RADIUS,
      mass: 1,
      pocketed: false,
    });
  }

  // Striker
  discs.push({
    id: 'striker',
    kind: 'striker',
    x: cx,
    y: PLAYER_BASELINE_Y,
    vx: 0,
    vy: 0,
    radius: STRIKER_RADIUS,
    mass: 2.2,
    pocketed: false,
  });

  return discs;
}

export function createInitialCarromState(): CarromMatchState {
  return {
    discs: createInitialCarromRack(),
    turn: 'player',
    phase: 'aim',
    strikerX: BOARD_SIZE / 2,
    queenState: 'on_board',
    winner: null,
    lastEvent: 'Position striker along the baseline, drag back & release to strike.',
    turnCount: 1,
    playerPocketed: 0,
    aiPocketed: 0,
  };
}

export function findSafeStrikerX(discs: CarromDisc[], preferredX: number, y: number): number {
  const clamped = Math.max(BASELINE_X_MIN, Math.min(BASELINE_X_MAX, preferredX));
  const isClear = (x: number) =>
    discs.every((d) => {
      if (d.pocketed || d.kind === 'striker') return true;
      const dx = d.x - x;
      const dy = d.y - y;
      return Math.hypot(dx, dy) >= d.radius + STRIKER_RADIUS + 2;
    });

  if (isClear(clamped)) return clamped;

  for (let offset = 6; offset <= 320; offset += 6) {
    if (clamped + offset <= BASELINE_X_MAX && isClear(clamped + offset)) return clamped + offset;
    if (clamped - offset >= BASELINE_X_MIN && isClear(clamped - offset)) return clamped - offset;
  }
  return clamped;
}

export interface PhysicsStepEvents {
  collisions: number;
  maxImpactSpeed: number;
  newlyPocketed: CarromDiscKind[];
  allStopped: boolean;
}

export function stepCarromPhysics(discs: CarromDisc[], dt: number): PhysicsStepEvents {
  const substeps = 3;
  const subDt = dt / substeps;
  const frictionPer60Hz = 0.985;
  const damping = Math.pow(frictionPer60Hz, subDt * 60);
  const wallRestitution = 0.82;
  const discRestitution = 0.88;

  let collisions = 0;
  let maxImpactSpeed = 0;
  const newlyPocketed: CarromDiscKind[] = [];

  for (let s = 0; s < substeps; s++) {
    for (const d of discs) {
      if (d.pocketed) continue;

      d.x += d.vx * subDt;
      d.y += d.vy * subDt;
      d.vx *= damping;
      d.vy *= damping;

      if (Math.hypot(d.vx, d.vy) < 6) {
        d.vx = 0;
        d.vy = 0;
      }

      // Check pockets
      let fellIn = false;
      for (const p of POCKETS) {
        const dist = Math.hypot(d.x - p.x, d.y - p.y);
        if (dist < POCKET_RADIUS - d.radius * 0.18) {
          d.pocketed = true;
          d.vx = 0;
          d.vy = 0;
          newlyPocketed.push(d.kind);
          fellIn = true;
          break;
        }
      }
      if (fellIn) continue;

      // Wall collisions
      if (d.x - d.radius < WALL_MIN) {
        d.x = WALL_MIN + d.radius;
        d.vx = Math.abs(d.vx) * wallRestitution;
        collisions++;
      } else if (d.x + d.radius > WALL_MAX) {
        d.x = WALL_MAX - d.radius;
        d.vx = -Math.abs(d.vx) * wallRestitution;
        collisions++;
      }

      if (d.y - d.radius < WALL_MIN) {
        d.y = WALL_MIN + d.radius;
        d.vy = Math.abs(d.vy) * wallRestitution;
        collisions++;
      } else if (d.y + d.radius > WALL_MAX) {
        d.y = WALL_MAX - d.radius;
        d.vy = -Math.abs(d.vy) * wallRestitution;
        collisions++;
      }
    }

    // Disc-to-disc elastic collisions
    for (let i = 0; i < discs.length; i++) {
      const a = discs[i];
      if (a.pocketed) continue;
      for (let j = i + 1; j < discs.length; j++) {
        const b = discs[j];
        if (b.pocketed) continue;

        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dist = Math.hypot(dx, dy);
        const minDist = a.radius + b.radius;

        if (dist < minDist) {
          const nx = dist > 0.0001 ? dx / dist : 1;
          const ny = dist > 0.0001 ? dy / dist : 0;

          // Positional separation
          const overlap = minDist - dist;
          const totalMass = a.mass + b.mass;
          a.x -= nx * overlap * (b.mass / totalMass);
          a.y -= ny * overlap * (b.mass / totalMass);
          b.x += nx * overlap * (a.mass / totalMass);
          b.y += ny * overlap * (a.mass / totalMass);

          // Relative velocity along normal
          const rvx = b.vx - a.vx;
          const rvy = b.vy - a.vy;
          const velAlongNormal = rvx * nx + rvy * ny;

          if (velAlongNormal < 0) {
            const jImpulse = (-(1 + discRestitution) * velAlongNormal) / (1 / a.mass + 1 / b.mass);
            const impX = jImpulse * nx;
            const impY = jImpulse * ny;

            a.vx -= impX / a.mass;
            a.vy -= impY / a.mass;
            b.vx += impX / b.mass;
            b.vy += impY / b.mass;

            collisions++;
            const impact = Math.abs(velAlongNormal);
            if (impact > maxImpactSpeed) maxImpactSpeed = impact;
          }
        }
      }
    }
  }

  const allStopped = discs.every((d) => d.pocketed || (d.vx === 0 && d.vy === 0));
  return { collisions, maxImpactSpeed, newlyPocketed, allStopped };
}

function respawnPieceNearCenter(discs: CarromDisc[], kind: 'white' | 'black' | 'queen') {
  const target = discs.find((d) => d.kind === kind && d.pocketed);
  if (!target) return false;
  target.pocketed = false;
  target.vx = 0;
  target.vy = 0;

  const cx = BOARD_SIZE / 2;
  const cy = BOARD_SIZE / 2;
  const tryPos = (x: number, y: number) =>
    discs.every((d) => {
      if (d === target || d.pocketed) return true;
      return Math.hypot(d.x - x, d.y - y) >= d.radius + target.radius + 2;
    });

  if (tryPos(cx, cy)) {
    target.x = cx;
    target.y = cy;
    return true;
  }

  for (let rad = 16; rad <= 160; rad += 14) {
    for (let a = 0; a < 12; a++) {
      const ang = (a * Math.PI) / 6;
      const x = cx + Math.cos(ang) * rad;
      const y = cy + Math.sin(ang) * rad;
      if (tryPos(x, y)) {
        target.x = x;
        target.y = y;
        return true;
      }
    }
  }

  target.x = cx;
  target.y = cy;
  return true;
}

export function resolveCarromShotEnd(
  state: CarromMatchState,
  discs: CarromDisc[],
  shotPocketed: CarromDiscKind[]
): CarromMatchState {
  const nextDiscs = discs.map((d) => ({ ...d }));
  const shooter = state.turn;
  const ownKind: 'white' | 'black' = shooter === 'player' ? 'white' : 'black';
  const strikerFoul = shotPocketed.includes('striker');
  const pocketedOwn = shotPocketed.filter((k) => k === ownKind).length;
  const pocketedQueen = shotPocketed.includes('queen');

  let queenState = state.queenState;
  let message = '';

  // Handle striker foul
  if (strikerFoul) {
    respawnPieceNearCenter(nextDiscs, ownKind);
    if (
      (shooter === 'player' && queenState === 'pending_player') ||
      (shooter === 'ai' && queenState === 'pending_ai')
    ) {
      respawnPieceNearCenter(nextDiscs, 'queen');
      queenState = 'on_board';
    }
    if (pocketedQueen) {
      respawnPieceNearCenter(nextDiscs, 'queen');
      queenState = 'on_board';
    }
    message = `${shooter === 'player' ? 'Player' : 'Vanguard AI'} fouled by pocketing the striker!`;
  } else {
    // Handle Queen logic
    if (pocketedQueen) {
      if (pocketedOwn > 0) {
        queenState = shooter === 'player' ? 'covered_player' : 'covered_ai';
        message = `${shooter === 'player' ? 'Player' : 'Vanguard AI'} pocketed & covered the Queen!`;
      } else {
        queenState = shooter === 'player' ? 'pending_player' : 'pending_ai';
        message = `${shooter === 'player' ? 'Player' : 'Vanguard AI'} pocketed the Queen — cover it on the next shot!`;
      }
    } else if (shooter === 'player' && queenState === 'pending_player') {
      if (pocketedOwn > 0) {
        queenState = 'covered_player';
        message = 'Queen covered cleanly! Bonus shot.';
      } else {
        respawnPieceNearCenter(nextDiscs, 'queen');
        queenState = 'on_board';
        message = 'Failed to cover the Queen — returned to center.';
      }
    } else if (shooter === 'ai' && queenState === 'pending_ai') {
      if (pocketedOwn > 0) {
        queenState = 'covered_ai';
        message = 'Vanguard AI covered the Queen.';
      } else {
        respawnPieceNearCenter(nextDiscs, 'queen');
        queenState = 'on_board';
        message = 'Vanguard AI failed to cover the Queen — returned to center.';
      }
    }
  }

  const whiteRemaining = nextDiscs.filter((d) => d.kind === 'white' && !d.pocketed).length;
  const blackRemaining = nextDiscs.filter((d) => d.kind === 'black' && !d.pocketed).length;
  const playerPocketed = 9 - whiteRemaining;
  const aiPocketed = 9 - blackRemaining;

  // Check victory
  if (whiteRemaining === 0 && (queenState === 'covered_player' || queenState === 'on_board' || queenState === 'covered_ai')) {
    if (queenState === 'on_board') respawnPieceNearCenter(nextDiscs, 'white');
    else {
      return {
        ...state,
        discs: nextDiscs,
        phase: 'gameover',
        queenState,
        winner: 'player',
        playerPocketed,
        aiPocketed,
        lastEvent: 'All White pieces cleared — Player wins the Carrom match!',
      };
    }
  }

  if (blackRemaining === 0 && (queenState === 'covered_ai' || queenState === 'covered_player')) {
    return {
      ...state,
      discs: nextDiscs,
      phase: 'gameover',
      queenState,
      winner: 'ai',
      playerPocketed,
      aiPocketed,
      lastEvent: 'All Black pieces cleared — Vanguard AI wins the match!',
    };
  }

  const keepTurn = !strikerFoul && (pocketedOwn > 0 || pocketedQueen);
  const nextTurn: 'player' | 'ai' = keepTurn ? shooter : shooter === 'player' ? 'ai' : 'player';
  const nextBaselineY = nextTurn === 'player' ? PLAYER_BASELINE_Y : AI_BASELINE_Y;
  const safeX = findSafeStrikerX(nextDiscs, BOARD_SIZE / 2, nextBaselineY);

  // Reset striker
  const striker = nextDiscs.find((d) => d.kind === 'striker')!;
  striker.pocketed = false;
  striker.x = safeX;
  striker.y = nextBaselineY;
  striker.vx = 0;
  striker.vy = 0;

  if (!message) {
    if (keepTurn) {
      message = `${shooter === 'player' ? 'Player' : 'Vanguard AI'} scored — shoot again!`;
    } else {
      message = nextTurn === 'player' ? 'Your turn — aim and strike a White piece.' : 'Vanguard AI is lining up a shot...';
    }
  }

  return {
    ...state,
    discs: nextDiscs,
    turn: nextTurn,
    phase: 'aim',
    strikerX: safeX,
    queenState,
    turnCount: keepTurn ? state.turnCount : state.turnCount + 1,
    playerPocketed,
    aiPocketed,
    lastEvent: message,
  };
}

function isSegmentClear(
  discs: CarromDisc[],
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  ignoreIds: Set<string>,
  clearanceRadius: number
): boolean {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lenSq = dx * dx + dy * dy;
  if (lenSq < 1) return true;

  for (const d of discs) {
    if (d.pocketed || ignoreIds.has(d.id)) continue;
    const t = Math.max(0, Math.min(1, ((d.x - x1) * dx + (d.y - y1) * dy) / lenSq));
    const projX = x1 + t * dx;
    const projY = y1 + t * dy;
    const dist = Math.hypot(d.x - projX, d.y - projY);
    if (dist < d.radius + clearanceRadius) {
      return false;
    }
  }
  return true;
}

export function computeAIShot(
  discs: CarromDisc[],
  difficulty: AIDifficulty
): { strikerX: number; vx: number; vy: number } {
  const targets = discs.filter(
    (d) => !d.pocketed && (d.kind === 'black' || d.kind === 'queen')
  );

  let bestScore = -Infinity;
  let bestPlan = {
    strikerX: findSafeStrikerX(discs, BOARD_SIZE / 2, AI_BASELINE_Y),
    vx: 0,
    vy: 620,
  };

  const candidateXs = [155, 200, 250, 300, 350, 400, 445];

  for (const target of targets) {
    for (const pocket of POCKETS) {
      const toPocketX = pocket.x - target.x;
      const toPocketY = pocket.y - target.y;
      const distToPocket = Math.hypot(toPocketX, toPocketY);
      if (distToPocket < 1) continue;

      const ux = toPocketX / distToPocket;
      const uy = toPocketY / distToPocket;

      // Ghost ball impact center
      const contactDist = PIECE_RADIUS + STRIKER_RADIUS;
      const ghostX = target.x - ux * contactDist;
      const ghostY = target.y - uy * contactDist;

      if (
        ghostX < WALL_MIN + STRIKER_RADIUS ||
        ghostX > WALL_MAX - STRIKER_RADIUS ||
        ghostY < WALL_MIN + STRIKER_RADIUS ||
        ghostY > WALL_MAX - STRIKER_RADIUS
      ) {
        continue;
      }

      for (const rawX of candidateXs) {
        const sx = findSafeStrikerX(discs, rawX, AI_BASELINE_Y);
        const shotX = ghostX - sx;
        const shotY = ghostY - AI_BASELINE_Y;
        const shotDist = Math.hypot(shotX, shotY);
        if (shotDist < 20) continue;

        const sux = shotX / shotDist;
        const suy = shotY / shotDist;
        const alignment = sux * ux + suy * uy; // 1.0 = dead straight!
        if (alignment < 0.35) continue;

        const ignore = new Set(['striker', target.id]);
        const strikerPathClear = isSegmentClear(discs, sx, AI_BASELINE_Y, ghostX, ghostY, ignore, STRIKER_RADIUS * 0.85);
        const targetPathClear = isSegmentClear(discs, target.x, target.y, pocket.x, pocket.y, ignore, PIECE_RADIUS * 0.85);

        let score = alignment * 120 - distToPocket * 0.14 - shotDist * 0.08;
        if (target.kind === 'queen') score += 35;
        if (strikerPathClear) score += 80;
        if (targetPathClear) score += 95;

        if (score > bestScore) {
          bestScore = score;
          const speed = Math.min(920, Math.max(540, 480 + (shotDist + distToPocket) * 0.65));
          bestPlan = {
            strikerX: sx,
            vx: sux * speed,
            vy: suy * speed,
          };
        }
      }
    }
  }

  // Fallback: aim straight at nearest black piece if no cut shot scored well
  if (bestScore < 50 && targets.length > 0) {
    const t = targets[0];
    const sx = findSafeStrikerX(discs, t.x, AI_BASELINE_Y);
    const dx = t.x - sx;
    const dy = t.y - AI_BASELINE_Y;
    const len = Math.max(1, Math.hypot(dx, dy));
    bestPlan = {
      strikerX: sx,
      vx: (dx / len) * 760,
      vy: (dy / len) * 760,
    };
  }

  // Apply difficulty jitter
  const jitterRad = difficulty === 'grandmaster' ? 0.01 : difficulty === 'tactical' ? 0.035 : 0.08;
  const delta = (Math.random() - 0.5) * 2 * jitterRad;
  const cos = Math.cos(delta);
  const sin = Math.sin(delta);
  return {
    strikerX: bestPlan.strikerX,
    vx: bestPlan.vx * cos - bestPlan.vy * sin,
    vy: bestPlan.vx * sin + bestPlan.vy * cos,
  };
}

export function predictStrikerRay(
  discs: CarromDisc[],
  startX: number,
  startY: number,
  dirX: number,
  dirY: number
): { hitX: number; hitY: number; bounceX?: number; bounceY?: number } {
  const len = Math.hypot(dirX, dirY);
  if (len < 0.001) return { hitX: startX, hitY: startY };
  const ux = dirX / len;
  const uy = dirY / len;

  let minT = 480;
  let hitDisc: CarromDisc | null = null;

  // Ray vs wall bounds
  if (ux < -0.0001) minT = Math.min(minT, (WALL_MIN + STRIKER_RADIUS - startX) / ux);
  if (ux > 0.0001) minT = Math.min(minT, (WALL_MAX - STRIKER_RADIUS - startX) / ux);
  if (uy < -0.0001) minT = Math.min(minT, (WALL_MIN + STRIKER_RADIUS - startY) / uy);
  if (uy > 0.0001) minT = Math.min(minT, (WALL_MAX - STRIKER_RADIUS - startY) / uy);

  // Ray vs discs
  for (const d of discs) {
    if (d.pocketed || d.kind === 'striker') continue;
    const ocX = startX - d.x;
    const ocY = startY - d.y;
    const r = STRIKER_RADIUS + d.radius;
    const b = ocX * ux + ocY * uy;
    const c = ocX * ocX + ocY * ocY - r * r;
    const disc = b * b - c;
    if (disc >= 0) {
      const t = -b - Math.sqrt(disc);
      if (t > 2 && t < minT) {
        minT = t;
        hitDisc = d;
      }
    }
  }

  const hitX = startX + ux * minT;
  const hitY = startY + uy * minT;

  if (hitDisc) {
    const nx = hitDisc.x - hitX;
    const ny = hitDisc.y - hitY;
    const nLen = Math.max(1, Math.hypot(nx, ny));
    return {
      hitX,
      hitY,
      bounceX: hitDisc.x + (nx / nLen) * 95,
      bounceY: hitDisc.y + (ny / nLen) * 95,
    };
  }

  return { hitX, hitY };
}
