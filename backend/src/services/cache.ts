interface CacheEntry<T> {
  expiresAt: number
  value: T
}

export class MemoryCache {
  private readonly entries = new Map<string, CacheEntry<unknown>>()

  constructor(private readonly now: () => number = () => Date.now()) {}

  get<T>(key: string): T | undefined {
    const entry = this.entries.get(key)
    if (!entry) {
      return undefined
    }

    if (entry.expiresAt <= this.now()) {
      this.entries.delete(key)
      return undefined
    }

    return entry.value as T
  }

  set<T>(key: string, value: T, ttlMs: number): void {
    this.entries.set(key, {
      expiresAt: this.now() + ttlMs,
      value
    })
  }
}
