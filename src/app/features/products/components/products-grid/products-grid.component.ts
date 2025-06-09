import {
  Component,
  Input,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  OnChanges,
  SimpleChanges,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProductCardComponent } from '../../../../shared/components/product-card/page/product-card.component';
import {
  trigger,
  transition,
  style,
  animate,
  query,
  stagger,
} from '@angular/animations';

@Component({
  selector: 'app-products-grid',
  standalone: true,
  imports: [CommonModule, ProductCardComponent],
  templateUrl: './products-grid.component.html',
  styleUrls: ['./products-grid.component.css'],
  animations: [
    trigger('fadeIn', [
      transition(':enter', [
        style({ opacity: 0 }),
        animate('300ms ease-in', style({ opacity: 1 })),
      ]),
      transition(':leave', [animate('200ms ease-out', style({ opacity: 0 }))]),
    ]),
    trigger('staggerFadeIn', [
      transition('* => *', [
        query(
          ':enter',
          [
            style({ opacity: 0, transform: 'translateY(15px)' }),
            stagger('50ms', [
              animate(
                '400ms ease-out',
                style({ opacity: 1, transform: 'translateY(0)' })
              ),
            ]),
          ],
          { optional: true }
        ),
      ]),
    ]),
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductsGridComponent implements OnChanges {
  @Input() products: any[] = [];
  @Input() isLoading: boolean = false;
  @Input() isLoadingMore: boolean = false;
  @Input() isInitialLoadComplete: boolean = false;
  @Input() showSkeleton: boolean = true;
  showEmptyState: boolean = false;
  skeletonCount = 8; // Consistent skeleton count
  displayedProducts: any[] = []; // Track displayed products separately to prevent flicker
  private previousProductCount = 0; // Track previous product count

  constructor(private cdr: ChangeDetectorRef) {}

  ngOnChanges(changes: SimpleChanges) {
    // First, handle showing empty state if needed
      if (
        !this.showSkeleton &&
        !this.isLoading &&
        !this.isLoadingMore &&
        this.isInitialLoadComplete &&
        this.products.length === 0
      ) {
        this.showEmptyState = true;
      } else {
        this.showEmptyState = false;
      }
    
    // If products array has changed
    if (changes['products']) {
      // Only clear displayedProducts when it's an initial load with a new set of products
      // (not when loading more or when scrolling)
      if (this.products.length > 0) {
        if (this.isLoadingMore) {
          // When loading more, append only the new products
          if (this.products.length > this.previousProductCount) {
            const newProducts = this.products.slice(this.previousProductCount);
            this.displayedProducts = [...this.displayedProducts, ...newProducts];
          }
        } else if (changes['products'].firstChange || this.displayedProducts.length === 0) {
          // For first load or when displayedProducts is empty
          this.displayedProducts = [...this.products];
        } else if (!this.isLoading && this.products.length !== this.previousProductCount) {
          // For cases where products array has changed entirely (like when changing filters)
          // Only update if it's not currently loading and the product count has changed
          this.displayedProducts = [...this.products];
        }
        
        // Update previous product count for next comparison
        this.previousProductCount = this.products.length;
      }
    }
    
    // Only clear displayed products when explicitly starting a new load
    // BUT NOT when scrolling or loading more
    if (changes['showSkeleton'] && 
        changes['showSkeleton'].currentValue === true && 
        changes['showSkeleton'].previousValue === false && 
        !this.isLoadingMore) {
      this.displayedProducts = [];
      this.previousProductCount = 0;
    }

    this.cdr.markForCheck();
  }

  get skeletonArray() {
    return Array(this.skeletonCount).fill(0).map((_, i) => i);
  }

  trackByProductId(index: number, product: any): number {
    return product?.id || index;
  }

  trackByIndex(index: number): number {
    return index;
  }

  ngOnDestroy() {
    this.products = [];
    this.displayedProducts = [];
    this.isLoading = false;
    this.isLoadingMore = false;
    this.skeletonCount = 0;
    this.showEmptyState = false;
    this.isInitialLoadComplete = false;
    this.showSkeleton = false;
  }
}