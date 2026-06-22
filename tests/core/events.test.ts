import { describe, it, expect, beforeEach, vi } from 'vitest';
import { EventBus } from '@core/events';

describe('EventBus', () => {
  let bus: EventBus;

  beforeEach(() => {
    bus = new EventBus();
  });

  it('emits and receives events', () => {
    const handler = vi.fn();
    bus.on('game:start', handler);
    bus.emit('game:start', { gameId: 'test' });
    expect(handler).toHaveBeenCalledWith({ gameId: 'test' });
  });

  it('unsubscribes with returned function', () => {
    const handler = vi.fn();
    const unsub = bus.on('coin:add', handler);
    unsub();
    bus.emit('coin:add', { amount: 10 });
    expect(handler).not.toHaveBeenCalled();
  });

  it('once fires only once', () => {
    const handler = vi.fn();
    bus.once('game:pause', handler);
    bus.emit('game:pause', undefined);
    bus.emit('game:pause', undefined);
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('off removes handler', () => {
    const handler = vi.fn();
    bus.on('game:resume', handler);
    bus.off('game:resume', handler);
    bus.emit('game:resume', undefined);
    expect(handler).not.toHaveBeenCalled();
  });

  it('clear removes all listeners', () => {
    const handler = vi.fn();
    bus.on('score:update', handler);
    bus.clear();
    bus.emit('score:update', { score: 100 });
    expect(handler).not.toHaveBeenCalled();
  });
});
