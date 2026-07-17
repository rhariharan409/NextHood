class KeyMutex {
  private activeLocks = new Set<string>();
  private queues = new Map<string, (() => void)[]>();

  async acquire(key: string): Promise<void> {
    if (!this.activeLocks.has(key)) {
      this.activeLocks.add(key);
      return;
    }

    return new Promise<void>((resolve) => {
      if (!this.queues.has(key)) {
        this.queues.set(key, []);
      }
      this.queues.get(key)!.push(resolve);
    });
  }

  release(key: string): void {
    const queue = this.queues.get(key);
    if (queue && queue.length > 0) {
      const nextResolve = queue.shift()!;
      if (queue.length === 0) {
        this.queues.delete(key);
      }
      nextResolve();
    } else {
      this.activeLocks.delete(key);
    }
  }

  async runExclusive<T>(key: string, callback: () => Promise<T>): Promise<T> {
    await this.acquire(key);
    try {
      return await callback();
    } finally {
      this.release(key);
    }
  }
}

export const inventoryMutex = new KeyMutex();
