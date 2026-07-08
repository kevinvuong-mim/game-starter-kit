import { eventBus } from '../events';
import { AnalyticsEvents, type AnalyticsParams } from './types';

function emitAnalytics(
  event: (typeof AnalyticsEvents)[keyof typeof AnalyticsEvents],
  params?: AnalyticsParams
): void {
  eventBus.emit('analytics', { event, params });
}

export function trackSessionEnd(params?: AnalyticsParams): void {
  emitAnalytics(AnalyticsEvents.SESSION_END, params);
}

export function trackGameStart(params?: AnalyticsParams): void {
  emitAnalytics(AnalyticsEvents.GAME_START, params);
}

export function trackGameOver(params?: AnalyticsParams): void {
  emitAnalytics(AnalyticsEvents.GAME_OVER, params);
}

export function trackPurchase(params?: AnalyticsParams): void {
  emitAnalytics(AnalyticsEvents.PURCHASE, params);
}

export function trackAdReward(params?: AnalyticsParams): void {
  emitAnalytics(AnalyticsEvents.AD_REWARD, params);
}

export function trackDailyClaim(params?: AnalyticsParams): void {
  emitAnalytics(AnalyticsEvents.DAILY_CLAIM, params);
}

export function trackMissionComplete(params?: AnalyticsParams): void {
  emitAnalytics(AnalyticsEvents.MISSION_COMPLETE, params);
}
