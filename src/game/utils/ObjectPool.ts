/**
 * Generic object pool for game entities.
 */
export class ObjectPool<T> {
  private pool: T[] = [];
  private active = new Set<T>();

  constructor(
    private factory: () => T,
    private reset: (obj: T) => void,
    initialSize = 10
  ) {
    this.warm(initialSize);
  }

  warm(count: number): void {
    for (let i = 0; i < count; i++) {
      this.pool.push(this.factory());
    }
  }

  acquire(): T {
    const obj = this.pool.pop() ?? this.factory();
    this.active.add(obj);
    return obj;
  }

  release(obj: T): void {
    if (!this.active.has(obj)) return;
    this.active.delete(obj);
    this.reset(obj);
    this.pool.push(obj);
  }

  releaseAll(): void {
    for (const obj of this.active) {
      this.reset(obj);
      this.pool.push(obj);
    }
    this.active.clear();
  }

  get activeCount(): number {
    return this.active.size;
  }

  get poolSize(): number {
    return this.pool.length;
  }
}
