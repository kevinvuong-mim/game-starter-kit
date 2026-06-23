export interface SubmitScoreDto {
  score: number;
  userId: string;
  displayName: string;
  board: 'daily' | 'weekly' | 'allTime';
}

export interface LeaderboardResponse {
  rank: number;
  score: number;
  playerId: string;
  avatarUrl?: string;
  displayName: string;
}

export interface SaveDataDto {
  version: number;
  timestamp: number;
  state: Record<string, unknown>;
}

export interface IapVerifyDto {
  receipt: string;
  productId: string;
  platform: 'ios' | 'mock' | 'android';
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
  time: {
    get: 'GET /time',
  },
  save: {
    get: 'GET /save',
    post: 'POST /save',
  },
  iap: {
    verify: 'POST /iap/verify',
  },

  leaderboard: {
    get: 'GET /leaderboard/:board',
    submit: 'POST /leaderboard/submit',
    rank: 'GET /leaderboard/:board/rank/:userId',
  },
} as const;
