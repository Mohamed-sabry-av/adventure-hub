import { Component, Input, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UnifiedWishlistService } from '../../../../services/unified-wishlist.service';
import { Product } from '../../../../../interfaces/product';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-wishlist-button',
  standalone: true,
  imports: [CommonModule],
  template: `
    <button 
      class="wishlist-btn" 
      [class.active]="isInWishlist" 
      [class.adding]="isProcessing"
      (click)="toggleWishlist($event)"
      aria-label="Add to wishlist">
      <i class="pi" [ngClass]="{
        'pi-heart-fill': isInWishlist,
        'pi-heart': !isInWishlist,
        'pi-spinner pi-spin': isProcessing
      }"></i>
    </button>
  `,
  styles: [`
    .wishlist-btn {
      position: absolute;
      top: 10px;
      right: 10px;
      width: 32px;
      height: 32px;
      background-color: rgba(255, 255, 255, 0.9);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      border: none;
      cursor: pointer;
      z-index: 10;
      box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
      transition: all 0.2s ease;
    }
    
    .wishlist-btn:hover {
      transform: scale(1.1);
    }
    
    .wishlist-btn i {
      font-size: 1rem;
      color: #9ca3af;
      transition: color 0.2s ease;
    }
    
    .wishlist-btn.active i {
      color: #ef4444;
    }
    
    .wishlist-btn:hover i {
      color: #ef4444;
    }
    
    .wishlist-btn.adding {
      pointer-events: none;
    }
  `]
})
export class WishlistButtonComponent implements OnInit, OnDestroy {
  @Input() product!: Product;
  
  isInWishlist: boolean = false;
  isProcessing: boolean = false;
  private subscription: Subscription | null = null;

  constructor(private wishlistService: UnifiedWishlistService) {}

  ngOnInit(): void {
    if (this.product) {
      this.checkWishlistStatus();
    }
  }

  ngOnDestroy(): void {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }

  private checkWishlistStatus(): void {
    this.subscription = this.wishlistService.isInWishlist(this.product.id)
      .subscribe(isInWishlist => {
        this.isInWishlist = isInWishlist;
      });
  }

  toggleWishlist(event: Event): void {
    event.stopPropagation();
    event.preventDefault();
    
    if (!this.product || this.isProcessing) {
      return;
    }
    
    this.isProcessing = true;
    
    this.wishlistService.toggleWishlistItem(this.product)
      .subscribe({
        next: (result) => {
          this.isInWishlist = result.added;
          this.isProcessing = false;
        },
        error: (error) => {
          console.error('Error toggling wishlist item:', error);
          this.isProcessing = false;
        }
      });
  }
} 