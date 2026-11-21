export type GameId = 'ludo' | 'chess' | 'carrom' | 'snakes';

export type AppScreenState = 'title' | 'playing' | 'paused' | 'gameover';

export type AIDifficulty = 'standard' | 'tactical' | 'grandmaster';

export type BoardTheme = 'obsidian' | 'holographic' | 'brass';

export interface FuturisticOptions {
  difficulty: AIDifficulty;
  theme: BoardTheme;
  tacticalAssist: boolean; // Chess Threat Overlay, Carrom Laser Trajectory, Ludo Overdrive, Snakes Cyber-Boost
  ludoOpponents: 1 | 3; // 1v1 Duel or 1v3 Arena
}

export interface MatchResult {
  gameId: GameId;
  outcome: 'victory' | 'defeat' | 'draw';
  headline: string;
  subline: string;
  metrics: { label: string; value: string }[];
}
