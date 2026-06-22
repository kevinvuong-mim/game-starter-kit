import { describe, it, expect, vi } from 'vitest';
import { EventBus } from './EventBus';

describe('EventBus', () => {
  it('emits events to subscribers', () => {
    const bus = new EventBus();
    const handler = vi.fn();

    bus.on('coin:add', handler);
    bus.emit('coin:add', { amount: 10 });

    expect(handler).toHaveBeenCalledWith({ amount: 10 });
  });

  it('unsubscribes via returned cleanup function', () => {
    const bus = new EventBus();
    const handler = vi.fn();

    const unsub = bus.on('score:update', handler);
    unsub();
    bus.emit('score:update', { score: 100 });

    expect(handler).not.toHaveBeenCalled();
  });

  it('calls once handlers only one time', () => {
    const bus = new EventBus();
    const handler = vi.fn();

    bus.once('game:start', handler);
    bus.emit('game:start', { gameId: 'test' });
    bus.emit('game:start', { gameId: 'test' });

    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('isolates handler errors without breaking other handlers', () => {
    const bus = new EventBus();
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const goodHandler = vi.fn();

    bus.on('coin:add', () => {
      throw new Error('boom');
    });
    bus.on('coin:add', goodHandler);

    bus.emit('coin:add', { amount: 5 });

    expect(goodHandler).toHaveBeenCalledWith({ amount: 5 });
    consoleSpy.mockRestore();
  });
});
