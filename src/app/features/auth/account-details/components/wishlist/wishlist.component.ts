import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  inject,
  OnDestroy,
  ChangeDetectorRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { WooCommerceAccountService } from '../../account-details.service';
import { RouterLink } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { UIService } from '../../../../../shared/services/ui.service';

@Component({
  selector: 'app-wishlist',
  templateUrl: './wishlist.component.html',
  styleUrls: ['./wishlist.component.css'],
  standalone: true,
  imports: [CommonModule, RouterLink],
})
export class WishlistComponent implements OnInit, OnDestroy {
  wishlistItems: any[] = [];
  isLoading = true;
  error: string | null = null;
  isEmpty = false;
  private destroy$ = new Subject<void>();

  private accountService = inject(WooCommerceAccountService);
  private cdr = inject(ChangeDetectorRef);

  constructor(
    public uiService: UIService
  ) { }

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

    // استخدم كامل العرض لتجنب المشاكل المتعلقة بالتوقيت
    this.accountService.getWishlist()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {

          // تحديد ما إذا كانت الاستجابة مصفوفة أو كائن وله خاصية items أو data
          let items = [];
          if (Array.isArray(response)) {
            items = response;
          } else if (response && typeof response === 'object') {
            // محاولة استخراج العناصر من أي تنسيق مدعوم
            if (Array.isArray(response.items)) {
              items = response.items;
            } else if (Array.isArray(response.data)) {
              items = response.data;
            } else if (Array.isArray(response.products)) {
              items = response.products;
            } else if (response.success === false) {
              // رسالة خطأ
              this.error = response.message || 'Failed to load wishlist data.';
            }
          }

          this.wishlistItems = items;
          this.isEmpty = items.length === 0;
          this.isLoading = false;
          this.cdr.detectChanges();

        },
        error: (err) => {
          this.error =
            err.error?.message ||
            'Failed to load wishlist. Please try again later.';
          this.isLoading = false;
          this.isEmpty = true;
          this.cdr.detectChanges();
          console.error('Error loading wishlist:', err);
        },
      });
  }

  removeFromWishlist(productId: number, index: number): void {
    this.wishlistItems[index].isRemoving = true;

    this.accountService.removeFromWishlist(productId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success !== false) {
            this.wishlistItems = this.wishlistItems.filter((_, i) => i !== index);
            this.isEmpty = this.wishlistItems.length === 0;
          } else {
            this.wishlistItems[index].isRemoving = false;
            this.error =
              response.message || 'Failed to remove item from wishlist.';
          }
          this.cdr.detectChanges();
        },
        error: (err) => {
          this.wishlistItems[index].isRemoving = false;
          this.error =
            err.error?.message ||
            'Failed to remove item from wishlist. Please try again.';
          console.error('Error removing from wishlist:', err);
          this.cdr.detectChanges();
        },
      });
  }

  addToCart(productId: number, index: number): void {
    this.wishlistItems[index].isAddingToCart = true;
    // Set the spinner loading state to true before adding to cart
    this.uiService.setSpinnerLoading(true);

    this.accountService.addToCart(productId, 1)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.wishlistItems[index].isAddingToCart = false;
          // Turn off the spinner loading after successful response
          this.uiService.setSpinnerLoading(false);
          
          if (response.success !== false) {
            // يمكن استخدام نظام إشعارات أفضل بدلاً من alert
            this.wishlistItems[index].addedToCart = true;
            setTimeout(() => {
              this.wishlistItems[index].addedToCart = false;
              this.cdr.detectChanges();
            }, 3000);
          } else {
            this.error = response.message || 'Failed to add product to cart.';
          }
          this.cdr.detectChanges();
        },
        error: (err) => {
          this.wishlistItems[index].isAddingToCart = false;
          // Turn off the spinner loading on error
          this.uiService.setSpinnerLoading(false);
          
          this.error =
            err.error?.message ||
            'Failed to add product to cart. Please try again.';
          console.error('Error adding to cart:', err);
          this.cdr.detectChanges();
        },
      });
  }

  getProductPrice(product: any): string {
    if (!product || !product.price) {
      return 'N/A';
    }
    return `$${parseFloat(product.price).toFixed(2)}`;
  }

  getProductImage(product: any): string {
    if (product?.image) {
      return product.image;
    } else if (product?.images && product.images.length > 0) {
      return product.images[0].src;
    }
    return 'assets/placeholder.jpg';
  }

  getProductName(product: any): string {
    return product?.name || product?.title || 'Unnamed Product';
  }
}

