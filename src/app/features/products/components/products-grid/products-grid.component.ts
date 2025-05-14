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

  constructor(private cdr: ChangeDetectorRef) {}

  ngOnChanges(changes: SimpleChanges) {
    // Clear displayedProducts when showSkeleton becomes true (category switching)
    if (changes['showSkeleton'] && changes['showSkeleton'].currentValue === true) {
      this.displayedProducts = [];
      this.cdr.markForCheck();
    }
    
    // Only update displayed products when we have new products and aren't loading more
    if (changes['products'] && !this.isLoadingMore) {
      this.displayedProducts = [...this.products];
    } 
    // Append products when loading more
    else if (changes['isLoadingMore'] && changes['isLoadingMore'].previousValue === true && !this.isLoadingMore) {
      this.displayedProducts = [...this.products];
    }
    
    if (
      changes['products'] ||
      changes['isLoading'] ||
      changes['isLoadingMore'] ||
      changes['isInitialLoadComplete'] ||
      changes['showSkeleton']
    ) {
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
      this.cdr.markForCheck();
    }
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