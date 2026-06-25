import { Preferences } from '@capacitor/preferences';

import { storage } from '@platform/core/storage';
import type { DailyRewardState } from '@platform/core/state';

import {
  createDefaultModel,
  DAILY_REWARD_MODEL_VERSION,
  DAILY_REWARD_STORAGE_KEY,
  getLocalDateString,
  LEGACY_DAILY_REWARD_STORAGE_KEY,
  type DailyRewardModel,
  type LegacyDailyRewardState,
} from './daily-reward.model';

export class DailyRewardRepository {
  async load(): Promise<DailyRewardModel> {
    const stored = await this.readModel(DAILY_REWARD_STORAGE_KEY);
    if (stored) return stored;

    const legacyStored = await this.readLegacyFromPreferences();
    if (legacyStored) {
      const migrated = migrateLegacyState(legacyStored);
      await this.save(migrated);
      await this.removeLegacy();
      return migrated;
    }

    const legacyStorage = await storage.load<LegacyDailyRewardState>(
      LEGACY_DAILY_REWARD_STORAGE_KEY
    );
    if (legacyStorage) {
      const migrated = migrateLegacyState(legacyStorage);
      await this.save(migrated);
      await storage.remove(LEGACY_DAILY_REWARD_STORAGE_KEY);
      return migrated;
    }

    return createDefaultModel();
  }

  async save(model: DailyRewardModel): Promise<void> {
    await Preferences.set({
      key: DAILY_REWARD_STORAGE_KEY,
      value: JSON.stringify(model),
    });
  }

  async reset(): Promise<void> {
    await Preferences.remove({ key: DAILY_REWARD_STORAGE_KEY });
    await Preferences.remove({ key: LEGACY_DAILY_REWARD_STORAGE_KEY });
    await storage.remove(LEGACY_DAILY_REWARD_STORAGE_KEY);
  }

  migrateFromStoreState(state: DailyRewardState | undefined): DailyRewardModel | null {
    if (!state) return null;

    if (state.version >= DAILY_REWARD_MODEL_VERSION) {
      return {
        version: state.version,
        currentDay: clampDay(state.currentDay),
        lastClaimDate: state.lastClaimDate,
        lastClaimWallClock: state.lastClaimWallClock ?? 0,
        lastSessionTimestamp: state.lastSessionTimestamp ?? 0,
        timeManipulated: state.timeManipulated ?? false,
      };
    }

    const hasLegacyFields =
      state.lastClaimAt !== undefined ||
      state.streak !== undefined ||
      (state.claimedDays?.length ?? 0) > 0;

    if (hasLegacyFields || !state.version) {
      return migrateLegacyState({
        streak: state.streak ?? 0,
        currentDay: state.currentDay,
        lastClaimAt: state.lastClaimAt ?? 0,
        claimedDays: state.claimedDays ?? [],
      });
    }

    return null;
  }

  toStoreState(model: DailyRewardModel): DailyRewardState {
    return {
      version: model.version,
      currentDay: model.currentDay,
      lastClaimDate: model.lastClaimDate,
      lastClaimWallClock: model.lastClaimWallClock,
      lastSessionTimestamp: model.lastSessionTimestamp,
      timeManipulated: model.timeManipulated,
    };
  }

  private async readModel(key: string): Promise<DailyRewardModel | null> {
    const { value } = await Preferences.get({ key });
    if (!value) return null;

    try {
      const parsed = JSON.parse(value) as DailyRewardModel;
      if (!parsed || typeof parsed.currentDay !== 'number') return null;
      return {
        ...createDefaultModel(),
        ...parsed,
        currentDay: clampDay(parsed.currentDay),
      };
    } catch {
      return null;
    }
  }

  private async readLegacyFromPreferences(): Promise<LegacyDailyRewardState | null> {
    const { value } = await Preferences.get({ key: LEGACY_DAILY_REWARD_STORAGE_KEY });
    if (!value) return null;

    try {
      return JSON.parse(value) as LegacyDailyRewardState;
    } catch {
      return null;
    }
  }

  private async removeLegacy(): Promise<void> {
    await Preferences.remove({ key: LEGACY_DAILY_REWARD_STORAGE_KEY });
    await storage.remove(LEGACY_DAILY_REWARD_STORAGE_KEY);
  }
}

function clampDay(day: number): number {
  if (!Number.isFinite(day) || day < 1) return 1;
  if (day > 7) return ((day - 1) % 7) + 1;
  return Math.floor(day);
}

function migrateLegacyState(legacy: LegacyDailyRewardState): DailyRewardModel {
  const currentDay = clampDay(legacy.currentDay || 1);
  const lastClaimDate =
    legacy.lastClaimAt > 0 ? getLocalDateString(new Date(legacy.lastClaimAt)) : null;

  return {
    version: DAILY_REWARD_MODEL_VERSION,
    currentDay,
    lastClaimDate,
    lastClaimWallClock: legacy.lastClaimAt ?? 0,
    lastSessionTimestamp: legacy.lastClaimAt ?? 0,
    timeManipulated: false,
  };
}

export const dailyRewardRepository = new DailyRewardRepository();
