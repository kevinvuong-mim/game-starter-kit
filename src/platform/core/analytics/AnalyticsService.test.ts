import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AnalyticsService } from './AnalyticsService';
import type { AnalyticsEvent, AnalyticsParams, IAnalyticsProvider } from './types';

function createMockProvider(overrides: Partial<IAnalyticsProvider> = {}): IAnalyticsProvider {
  return {
    name: 'mock',
    init: vi.fn().mockResolvedValue(undefined),
    track: vi.fn(),
    setUserId: vi.fn(),
    setUserProperty: vi.fn(),
    flush: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

describe('AnalyticsService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('forwards track to all providers without injecting userId', () => {
    const provider = createMockProvider({ name: 'firebase' });
    const service = new AnalyticsService();
    service.setEnabled(true);
    service.registerProvider(provider);

    const params: AnalyticsParams = { score: 100 };
    service.track('game_start' as AnalyticsEvent, params);

    expect(provider.track).toHaveBeenCalledWith('game_start', params);
    expect(provider.track).not.toHaveBeenCalledWith(
      'game_start',
      expect.objectContaining({ userId: expect.anything() })
    );
  });

  it('calls setUserId on providers', () => {
    const provider = createMockProvider();
    const service = new AnalyticsService();
    service.registerProvider(provider);

    service.setUserId('user-123');
    expect(provider.setUserId).toHaveBeenCalledWith('user-123');
  });

  it('safely calls optional reset and shutdown', async () => {
    const withLifecycle = createMockProvider({
      reset: vi.fn().mockResolvedValue(undefined),
      shutdown: vi.fn().mockResolvedValue(undefined),
    });
    const withoutLifecycle = createMockProvider({ name: 'minimal' });

    const service = new AnalyticsService();
    service.registerProvider(withLifecycle);
    service.registerProvider(withoutLifecycle);

    await service.reset();
    await service.shutdown();

    expect(withLifecycle.reset).toHaveBeenCalled();
    expect(withLifecycle.shutdown).toHaveBeenCalled();
  });

  it('skips non-console providers when disabled', () => {
    const consoleProvider = createMockProvider({ name: 'console' });
    const firebaseProvider = createMockProvider({ name: 'firebase' });
    const service = new AnalyticsService();
    service.registerProvider(consoleProvider);
    service.registerProvider(firebaseProvider);
    service.setEnabled(false);

    service.track('game_start' as AnalyticsEvent);

    expect(consoleProvider.track).toHaveBeenCalled();
    expect(firebaseProvider.track).not.toHaveBeenCalled();
  });
});
