import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { LocalStorageService } from '../../core/services/local-storage.service';
import { Product } from '../../interfaces/product';
@Injectable({
  providedIn: 'root'
})
export class LocalWishlistService {
  private readonly WISHLIST_STORAGE_KEY = 'local_wishlist';
  private wishlistItems$ = new BehaviorSubject<Product[]>([]);
  private wishlistCount$ = new BehaviorSubject<number>(0);
  constructor(private localStorageService: LocalStorageService) {
    this.loadWishlistFromStorage();
  }
  private loadWishlistFromStorage(): void {
    try {
      const storedWishlist = this.localStorageService.getItem<Product[]>(this.WISHLIST_STORAGE_KEY) || [];
      this.wishlistItems$.next(storedWishlist);
      this.wishlistCount$.next(storedWishlist.length);
    } catch (error) {
      
      this.wishlistItems$.next([]);
      this.wishlistCount$.next(0);
    }
  }
  private saveWishlistToStorage(items: Product[]): void {
    try {
      this.localStorageService.setItem(this.WISHLIST_STORAGE_KEY, items);
      this.wishlistItems$.next(items);
      this.wishlistCount$.next(items.length);
    } catch (error) {
      
    }
  }
  getWishlist(): Observable<Product[]> {
    return this.wishlistItems$.asObservable();
  }
  getWishlistCount(): Observable<number> {
    return this.wishlistCount$.asObservable();
  }
  isInWishlist(productId: number): boolean {
    const items = this.wishlistItems$.getValue();
    return items.some(item => item.id === productId);
  }
  addToWishlist(product: Product): Observable<{ success: boolean; message: string }> {
    try {
      const currentItems = this.wishlistItems$.getValue();
      // Check if product already exists in wishlist
      if (this.isInWishlist(product.id)) {
        return of({ success: false, message: 'Product already in wishlist' });
      }
      // Add product to wishlist
      const updatedItems = [...currentItems, product];
      this.saveWishlistToStorage(updatedItems);
      return of({ success: true, message: 'Product added to wishlist' });
    } catch (error) {
      
      return of({ success: false, message: 'Failed to add product to wishlist' });
    }
  }
  removeFromWishlist(productId: number): Observable<{ success: boolean; message: string }> {
    try {
      const currentItems = this.wishlistItems$.getValue();
      // Remove product from wishlist
      const updatedItems = currentItems.filter(item => item.id !== productId);
      if (updatedItems.length === currentItems.length) {
        return of({ success: false, message: 'Product not found in wishlist' });
      }
      this.saveWishlistToStorage(updatedItems);
      return of({ success: true, message: 'Product removed from wishlist' });
    } catch (error) {
      
      return of({ success: false, message: 'Failed to remove product from wishlist' });
    }
  }
  clearWishlist(): Observable<{ success: boolean; message: string }> {
    try {
      this.saveWishlistToStorage([]);
      return of({ success: true, message: 'Wishlist cleared successfully' });
    } catch (error) {
      
      return of({ success: false, message: 'Failed to clear wishlist' });
    }
  }
} 
