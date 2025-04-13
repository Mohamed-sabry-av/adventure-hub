import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { WooCommerceAccountService } from '../../account-details.service';

@Component({
  selector: 'app-wishlist',
  templateUrl: './wishlist.component.html',
  styleUrls: ['./wishlist.component.css'],
  standalone: true,
  imports: [CommonModule]
})
export class WishlistComponent implements OnInit {
  wishlistItems: any[] = [];
  isLoading = true;
  error: string | null = null;
  wishlistId: number | null = null;

  private accountService = inject(WooCommerceAccountService);

  ngOnInit(): void {
    this.loadWishlist();
  }

  loadWishlist(): void {
    this.isLoading = true;
    this.error = null;

    this.accountService.getWishlist().subscribe({
      next: (data) => {
        if (data && data.length > 0) {
          this.wishlistId = data[0].id;
          this.wishlistItems = data[0].items || [];
        } else {
          this.wishlistItems = [];
        }
        this.isLoading = false;
      },
      error: (err) => {
        this.error = 'Failed to load wishlist. Please try again later.';
        this.isLoading = false;
        console.error('Error loading wishlist:', err);
      }
    });
  }

  removeFromWishlist(productId: number, index: number): void {
    if (!this.wishlistId) {
      this.error = 'Could not determine wishlist ID';
      return;
    }

    // Show removing state
    this.wishlistItems[index].isRemoving = true;

    this.accountService.removeFromWishlist(this.wishlistId).subscribe({
      next: () => {
        // Remove the item from the local array
        this.wishlistItems = this.wishlistItems.filter((item, i) => i !== index);
      },
      error: (err) => {
        // Reset removing state
        this.wishlistItems[index].isRemoving = false;
        this.error = 'Failed to remove item from wishlist. Please try again.';
        console.error('Error removing from wishlist:', err);
      }
    });
  }

  addToCart(productId: number): void {
    // This would typically be handled by another service
    console.log('Adding product to cart:', productId);
    // Show success message
    alert('Product added to cart successfully!');
  }

  // Helper method to safely get product price
  getProductPrice(product: any): string {
    if (!product) return 'N/A';

    if (product.price_html) {
      return product.price_html;
    }

    if (product.price) {
      return `$${parseFloat(product.price).toFixed(2)}`;
    }

    return 'N/A';
  }

  // Helper method to safely get product image
  getProductImage(product: any): string {
    if (product?.images && product.images.length > 0) {
      return product.images[0].src;
    }
    return 'assets/placeholder.jpg';
  }
}
