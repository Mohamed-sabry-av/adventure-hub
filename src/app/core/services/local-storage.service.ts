import { isPlatformBrowser } from '@angular/common';
import { Inject, Injectable, PLATFORM_ID } from '@angular/core';
import { Category } from '../../interfaces/category.model';

@Injectable({
  providedIn: 'root',
})
export class LocalStorageService {
  private readonly storage: Storage | null;

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {
    this.storage = isPlatformBrowser(this.platformId) ? window.localStorage : null;
  }

  /**
   * Sets an item in localStorage with a timestamp.
   * @param key The key to store the data under.
   * @param value The value to store.
   */
  setItem<T>(key: string, value: T): void {
    if (!this.storage) return;

    try {
      const data = {
        value,
        timestamp: Date.now(),
      };
      this.storage.setItem(key, JSON.stringify(data));
    } catch (error) {
    }
  }

  /**
   * Gets an item from localStorage if it exists and is not expired.
   * @param key The key to retrieve the data for.
   * @param ttl Time to live in milliseconds (optional).
   * @returns The stored value or null if not found or expired.
   */
  getItem<T>(key: string, ttl?: number): T | null {
    if (!this.storage) return null; 

    try {
      const storedData = this.storage.getItem(key);
      if (!storedData) return null;

      const parsedData = JSON.parse(storedData);

      if (parsedData.categories) {
        this.migrateOldData(key, parsedData.categories);
        return this.getItem<T>(key, ttl);
      }

      if (ttl && Date.now() - parsedData.timestamp > ttl) {
        this.removeItem(key);
        return null;
      }

      return parsedData.value as T;
    } catch (error) {
      console.error('Error getting from localStorage:', error);
      this.removeItem(key);
      return null;
    }
  }

  /**
   * Removes an item from localStorage.
   * @param key The key to remove.
   */
  removeItem(key: string): void {
    if (!this.storage) return;

    try {
      this.storage.removeItem(key);
    } catch (error) {
      console.error('Error removing from localStorage:', error);
    }
  }

  /**
   * Migrates old data format to the new format.
   * @param key The key to migrate.
   * @param oldCategories The old categories data.
   */
  private migrateOldData(key: string, oldCategories: Category[]): void {
    if (!this.storage) return;

    console.warn('Migrating old localStorage data...');
    this.setItem(key, oldCategories); 
  }
}