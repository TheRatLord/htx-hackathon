/** Small TTL + LRU cache. Also de-duplicates concurrent loads of the same key. */
export class TtlCache<V> {
  private map = new Map<string, { value: Promise<V>; expires: number }>();

  constructor(
    private ttlMs: number,
    private maxEntries = 500,
  ) {}

  get(key: string, load: () => Promise<V>, ttlMs = this.ttlMs): Promise<V> {
    const hit = this.map.get(key);
    if (hit && hit.expires > Date.now()) {
      this.map.delete(key);
      this.map.set(key, hit);
      return hit.value;
    }
    const value = load();
    this.map.set(key, { value, expires: Date.now() + ttlMs });
    // Only this load's own entry: a newer load that replaced it (after the TTL) stays.
    value.catch(() => {
      if (this.map.get(key)?.value === value) this.map.delete(key);
    });
    while (this.map.size > this.maxEntries) this.map.delete(this.map.keys().next().value!);
    return value;
  }
}
