import { Injectable } from '@angular/core';
import { Observable, of, merge, forkJoin } from 'rxjs';
import { map, catchError, switchMap, tap } from 'rxjs/operators';
import { LocalWishlistService } from './local-wishlist.service';
import { WooCommerceAccountService } from '../../features/auth/account-details/account-details.service';
import { Product } from '../../interfaces/product';

@Injectable({
  providedIn: 'root'
})
export class UnifiedWishlistService {
  constructor(
    private localWishlistService: LocalWishlistService,
    private wooCommerceService: WooCommerceAccountService
  ) {}

  /**
   * Get wishlist items from appropriate source based on login status
   */
  getWishlist(): Observable<any[]> {
    if (this.wooCommerceService.isLoggedIn()) {
      // User is logged in, get from WooCommerce
      return this.wooCommerceService.getWishlist().pipe(
        map(response => {
          // Process WooCommerce response
          let items = [];
          if (Array.isArray(response)) {
            items = response;
          } else if (response && typeof response === 'object') {
            if (Array.isArray(response.items)) {
              items = response.items;
            } else if (Array.isArray(response.data)) {
              items = response.data;
            } else if (Array.isArray(response.products)) {
              items = response.products;
            }
          }
          return items;
        }),
        catchError(error => {
          console.error('Error fetching WooCommerce wishlist:', error);
          // Fall back to local wishlist if WooCommerce fails
          return this.localWishlistService.getWishlist();
        })
      );
    } else {
      // User is not logged in, get from local storage
      return this.localWishlistService.getWishlist();
    }
  }

  /**
   * Check if a product is in the wishlist
   */
  isInWishlist(productId: number): Observable<boolean> {
    if (this.wooCommerceService.isLoggedIn()) {
      return this.wooCommerceService.getWishlist().pipe(
        map(response => {
          let items = [];
          if (Array.isArray(response)) {
            items = response;
          } else if (response && typeof response === 'object') {
            if (Array.isArray(response.items)) {
              items = response.items;
            } else if (Array.isArray(response.data)) {
              items = response.data;
            } else if (Array.isArray(response.products)) {
              items = response.products;
            }
          }
          return items.some((item: any) => 
            (item.product_id === productId || item.id === productId)
          );
        }),
        catchError(() => of(false))
      );
    } else {
      return of(this.localWishlistService.isInWishlist(productId));
    }
  }

  /**
   * Add a product to the wishlist
   */
  addToWishlist(product: Product): Observable<{ success: boolean; message: string }> {
    if (this.wooCommerceService.isLoggedIn()) {
      return this.wooCommerceService.addToWishlist(product.id).pipe(
        map(response => {
          if (response.success !== false) {
            return { success: true, message: 'Product added to wishlist' };
          } else {
            return { 
              success: false, 
              message: response.message || 'Failed to add product to wishlist' 
            };
          }
        }),
        catchError(error => {
          console.error('Error adding to WooCommerce wishlist:', error);
          // Fall back to local wishlist if WooCommerce fails
          return this.localWishlistService.addToWishlist(product);
        })
      );
    } else {
      return this.localWishlistService.addToWishlist(product);
    }
  }

  /**
   * Remove a product from the wishlist
   */
  removeFromWishlist(productId: number): Observable<{ success: boolean; message: string }> {
    if (this.wooCommerceService.isLoggedIn()) {
      return this.wooCommerceService.removeFromWishlist(productId).pipe(
        map(response => {
          if (response.success !== false) {
            return { success: true, message: 'Product removed from wishlist' };
          } else {
            return { 
              success: false, 
              message: response.message || 'Failed to remove product from wishlist' 
            };
          }
        }),
        catchError(error => {
          console.error('Error removing from WooCommerce wishlist:', error);
          // Fall back to local wishlist if WooCommerce fails
          return this.localWishlistService.removeFromWishlist(productId);
        })
      );
    } else {
      return this.localWishlistService.removeFromWishlist(productId);
    }
  }

  /**
   * Get the count of wishlist items
   */
  getWishlistCount(): Observable<number> {
    return this.getWishlist().pipe(
      map(items => items.length)
    );
  }

  /**
   * Toggle a product in the wishlist (add if not present, remove if present)
   */
  toggleWishlistItem(product: Product): Observable<{ success: boolean; message: string; added: boolean }> {
    return this.isInWishlist(product.id).pipe(
      switchMap(isInWishlist => {
        if (isInWishlist) {
          return this.removeFromWishlist(product.id).pipe(
            map(result => ({
              ...result,
              added: false
            }))
          );
        } else {
          return this.addToWishlist(product).pipe(
            map(result => ({
              ...result,
              added: true
            }))
          );
        }
      })
    );
  }

  /**
   * Sync local wishlist with WooCommerce wishlist when user logs in
   */
  syncWishlistOnLogin(): Observable<any> {
    if (!this.wooCommerceService.isLoggedIn()) {
      return of({ success: false, message: 'User not logged in' });
    }

    return this.localWishlistService.getWishlist().pipe(
      switchMap(localItems => {
        if (localItems.length === 0) {
          return of({ success: true, message: 'No local items to sync' });
        }

        // Add all local items to WooCommerce wishlist
        const addRequests = localItems.map(item => 
          this.wooCommerceService.addToWishlist(item.id)
        );

        return forkJoin(addRequests).pipe(
          map(() => ({ success: true, message: 'Wishlist synced successfully' })),
          catchError(error => {
            console.error('Error syncing wishlist:', error);
            return of({ success: false, message: 'Failed to sync wishlist' });
          }),
          // Clear local wishlist after successful sync
          tap(() => this.localWishlistService.clearWishlist())
        );
      })
    );
  }

  /**
   * Check if user is logged in (convenience method)
   */
  isLoggedIn(): boolean {
    return this.wooCommerceService.isLoggedIn();
  }
} 