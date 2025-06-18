import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';

interface CacheContent {
  expiry: number;
  value: any;
  timestamp: number;
}

@Injectable({
  providedIn: 'root',
})
export class CacheService {
  private cache = new Map<string, CacheContent>();

  constructor() {}

  /**
   * Get data from cache if it exists and hasn't expired.
   */
  get(key: string): Observable<any> | undefined {
    const data = this.cache.get(key);
    if (!data) {
      return undefined;
    }

    const now = new Date().getTime();
    if (now > data.expiry) {
      this.cache.delete(key);
      return undefined;
    }
    return of(data.value);
  }

  /**
   * Get the timestamp when a cache entry was created
   */
  getTimestamp(key: string): number | undefined {
    const data = this.cache.get(key);
    return data?.timestamp;
  }

  /**
   * Set data to cache if it's not empty.
   */
  set(key: string, value: any, ttl: number = 300000): Observable<any> {
    // Prevent caching empty arrays or objects
    if (
      value === null ||
      value === undefined ||
      (Array.isArray(value) && value.length === 0) ||
      (typeof value === 'object' && Object.keys(value).length === 0)
    ) {
      return of(value);
    }

    const now = new Date().getTime();
    const expiry = now + ttl;
    this.cache.set(key, { expiry, value, timestamp: now });
    return of(value);
  }

  /**
   * Cache an Observable and return it, using cached data if available.
   */
  cacheObservable(key: string, fallback: Observable<any>, ttl: number = 300000): Observable<any> {
    const cached = this.get(key);
    if (cached) {
      return cached;
    }
    return fallback.pipe(
      tap(value => {
        this.set(key, value, ttl);
      })
    );
  }

  /**
   * Clear the entire cache or a specific key.
   */
  clear(key?: string): void {
    if (key) {
      this.cache.delete(key);
    } else {
      this.cache.clear();
    }
  }
}