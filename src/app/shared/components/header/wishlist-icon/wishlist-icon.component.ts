import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { UnifiedWishlistService } from '../../../services/unified-wishlist.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-wishlist-icon',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <a [routerLink]="wishlistRoute" class="wishlist-icon-container">
      <i class="pi pi-heart"></i>
      <span *ngIf="wishlistCount > 0" class="wishlist-count">{{ wishlistCount }}</span>
    </a>
  `,
  styles: [`
  .wishlist-icon-container {
      position: relative;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      width: 24px;
      height: 24px;
      color: #ffffff;
    }
    
    .pi-heart {
      font-size: 1.5rem;
      color: #ffffff;
      transition: color 0.2s ease;
    }
    
    .wishlist-icon-container:hover .pi-heart {
      color: #f4663c;
    }
    
    .wishlist-count {
      position: absolute;
      top: -8px;
      right: -6px;
      background-color: #f4663c;
      color: white;
      border-radius: 50%;
      width: 16px;
      height: 16px;
      font-size: 0.65rem;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: bold;
    }
  `]
})
export class WishlistIconComponent implements OnInit, OnDestroy {
  wishlistCount: number = 0;
  private subscription: Subscription | null = null;

  constructor(private wishlistService: UnifiedWishlistService) {}

  ngOnInit(): void {
    this.subscription = this.wishlistService.getWishlistCount().subscribe(count => {
      this.wishlistCount = count;
    });
  }

  ngOnDestroy(): void {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }
  
  get wishlistRoute(): string {
    return this.wishlistService.isLoggedIn() ? '/user/Useraccount/wishlist' : '/user/wishlist';
  }
} 