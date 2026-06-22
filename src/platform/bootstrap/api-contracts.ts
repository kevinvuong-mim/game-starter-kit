/**
 * NestJS-compatible API contract definitions.
 * Implement these endpoints on your backend server.
 *
 * @example
 * // backend/src/leaderboard/leaderboard.controller.ts
 * @Post('submit')
 * submitScore(@Body() dto: SubmitScoreDto) { ... }
 */
export interface SubmitScoreDto {
  score: number;
  board: 'daily' | 'weekly' | 'allTime';
  userId: string;
  displayName: string;
}

export interface LeaderboardResponse {
  rank: number;
  playerId: string;
  displayName: string;
  score: number;
  avatarUrl?: string;
}

export interface SaveDataDto {
  version: number;
  timestamp: number;
  state: Record<string, unknown>;
}

export interface IapVerifyDto {
  receipt: string;
  productId: string;
  platform: 'ios' | 'android' | 'mock';
}

export interface IapVerifyResponse {
  valid: boolean;
  productId: string;
  transactionId: string;
}

export interface ServerTimeResponse {
  timestamp: number;
}

/** REST API route map for NestJS implementation */
export const API_ROUTES = {
  leaderboard: {
    submit: 'POST /leaderboard/submit',
    get: 'GET /leaderboard/:board',
    rank: 'GET /leaderboard/:board/rank/:userId',
  },
  save: {
    get: 'GET /save',
    post: 'POST /save',
  },
  iap: {
    verify: 'POST /iap/verify',
  },
  time: {
    get: 'GET /time',
  },
} as const;
