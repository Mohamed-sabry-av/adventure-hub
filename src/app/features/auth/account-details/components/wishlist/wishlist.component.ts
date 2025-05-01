import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { WooCommerceAccountService } from '../../account-details.service';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-wishlist',
  templateUrl: './wishlist.component.html',
  styleUrls: ['./wishlist.component.css'],
  standalone: true,
  imports: [CommonModule, RouterLink],
})
export class WishlistComponent implements OnInit {
  wishlistItems: any[] = [];
  isLoading = true;
  error: string | null = null;
  product: any;

  private accountService = inject(WooCommerceAccountService);

  ngOnInit(): void {
    this.loadWishlist();
  }

  loadWishlist(): void {
    this.isLoading = true;
    this.error = null;

    this.accountService.getWishlist().subscribe({
      next: (data) => {
        this.wishlistItems = Array.isArray(data) ? data : [];
        this.isLoading = false;
        console.log('Wishlist loaded:', this.wishlistItems);
        data = this.product;
      },
      error: (err) => {
        this.error =
          err.error?.message ||
          'Failed to load wishlist. Please try again later.';
        this.isLoading = false;
        console.error('Error loading wishlist:', err);
      },
    });
  }

  removeFromWishlist(productId: number, index: number): void {
    this.wishlistItems[index].isRemoving = true;

    this.accountService.removeFromWishlist(productId).subscribe({
      next: (response) => {
        if (response.success !== false) {
          this.wishlistItems = this.wishlistItems.filter((_, i) => i !== index);
        } else {
          this.wishlistItems[index].isRemoving = false;
          this.error =
            response.message || 'Failed to remove item from wishlist.';
        }
      },
      error: (err) => {
        this.wishlistItems[index].isRemoving = false;
        this.error =
          err.error?.message ||
          'Failed to remove item from wishlist. Please try again.';
        console.error('Error removing from wishlist:', err);
      },
    });
  }

  addToCart(productId: number): void {
    this.accountService.addToCart(productId, 1).subscribe({
      next: (response) => {
        if (response.success !== false) {
          alert('Product added to cart successfully!'); // Replace with toast/notification
        } else {
          this.error = response.message || 'Failed to add product to cart.';
        }
      },
      error: (err) => {
        this.error =
          err.error?.message ||
          'Failed to add product to cart. Please try again.';
        console.error('Error adding to cart:', err);
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
    }
    return 'assets/placeholder.jpg';
  }
}
