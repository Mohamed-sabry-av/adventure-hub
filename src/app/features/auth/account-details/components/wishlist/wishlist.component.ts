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

  private accountService = inject(WooCommerceAccountService);

  ngOnInit(): void {
    this.loadWishlist();
  }

  loadWishlist(): void {
    this.accountService.getWishlist().subscribe({
      next: (data) => {
        this.wishlistItems = data?.lists?.[0]?.items || [];
        this.isLoading = false;
      },
      error: (err) => {
        this.error = 'Failed to load wishlist. Please try again later.';
        this.isLoading = false;
        console.error('Error loading wishlist:', err);
      }
    });
  }

  removeFromWishlist(itemId: number): void {
    // Implement wishlist item removal logic here
    console.log('Removing item from wishlist:', itemId);
    // For now, just filter the item out from the local array
    this.wishlistItems = this.wishlistItems.filter(item => item.id !== itemId);
  }
}
