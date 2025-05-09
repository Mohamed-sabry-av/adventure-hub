import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  inject,
  OnDestroy,
  ChangeDetectorRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { UnifiedWishlistService } from '../../../../../shared/services/unified-wishlist.service';
import { CartService } from '../../../../../features/cart/service/cart.service';
import { Product } from '../../../../../interfaces/product';

@Component({
  selector: 'app-local-wishlist',
  templateUrl: './local-wishlist.component.html',
  styleUrls: ['./local-wishlist.component.css'],
  standalone: true,
  imports: [CommonModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [CartService, UnifiedWishlistService]
})
export class LocalWishlistComponent implements OnInit, OnDestroy {
  wishlistItems: Product[] = [];
  isLoading = true;
  error: string | null = null;
  isEmpty = false;
  private destroy$ = new Subject<void>();

  private wishlistService = inject(UnifiedWishlistService);
  private cartService = inject(CartService);
  private cdr = inject(ChangeDetectorRef);

  ngOnInit(): void {
    this.loadWishlist();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadWishlist(): void {
    this.isLoading = true;
    this.error = null;

    this.wishlistService.getWishlist()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (items: Product[]) => {
          this.wishlistItems = items;
          this.isEmpty = items.length === 0;
          this.isLoading = false;
          this.cdr.detectChanges();
          console.log('Processed wishlist items:', this.wishlistItems);
        },
        error: (err: any) => {
          this.error = 'Failed to load wishlist. Please try again later.';
          this.isLoading = false;
          this.isEmpty = true;
          this.cdr.detectChanges();
          console.error('Error loading wishlist:', err);
        },
      });
  }

  removeFromWishlist(product: Product, index: number): void {
    this.wishlistItems[index].isRemoving = true;
    
    const productId = product.id;

    this.wishlistService.removeFromWishlist(productId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: {success: boolean, message: string}) => {
          if (response.success) {
            this.wishlistItems = this.wishlistItems.filter((_, i) => i !== index);
            this.isEmpty = this.wishlistItems.length === 0;
          } else {
            this.wishlistItems[index].isRemoving = false;
            this.error = response.message || 'Failed to remove item from wishlist.';
          }
          this.cdr.detectChanges();
        },
        error: (err: any) => {
          this.wishlistItems[index].isRemoving = false;
          this.error = 'Failed to remove item from wishlist. Please try again.';
          console.error('Error removing from wishlist:', err);
          this.cdr.detectChanges();
        },
      });
  }

  addToCart(product: Product, index: number): void {
    this.wishlistItems[index].isAddingToCart = true;
    
    const productToAdd = {
      id: product.id,
      name: this.getProductName(product),
      quantity: 1,
      price: this.extractPrice(product),
      image: this.getProductImage(product),
    };

    this.cartService.addProductToCart(productToAdd);
    this.wishlistItems[index].addedToCart = true;
    this.wishlistItems[index].isAddingToCart = false;
    
    setTimeout(() => {
      this.wishlistItems[index].addedToCart = false;
      this.cdr.detectChanges();
    }, 3000);
    
    this.cdr.detectChanges();
  }

  private extractPrice(product: Product): string | number {
    if (typeof product.price === 'string' || typeof product.price === 'number') {
      return product.price;
    } else if (product.sale_price) {
      return product.sale_price;
    } else if (product.regular_price) {
      return product.regular_price;
    }
    return '0';
  }

  getProductImage(product: Product): string {
    if (!product) return 'assets/placeholder.jpg';
    
    // Handle different image formats
    if (product.images && product.images.length > 0) {
      return product.images[0].src || 'assets/placeholder.jpg';
    }
    
    return 'assets/placeholder.jpg';
  }

  getProductName(product: Product): string {
    return product?.name || 'Unnamed Product';
  }

  getProductPrice(product: Product): string {
    if (!product) return 'N/A';
    
    // Handle different price formats
    if (typeof product.price === 'string') {
      return `$${parseFloat(product.price).toFixed(2)}`;
    } else if (typeof product.price === 'number') {
      return `$${product.price.toFixed(2)}`;
    } else if (product.regular_price) {
      return `$${parseFloat(product.regular_price).toFixed(2)}`;
    } else if (product.sale_price) {
      return `$${parseFloat(product.sale_price).toFixed(2)}`;
    }
    
    return 'N/A';
  }
} 