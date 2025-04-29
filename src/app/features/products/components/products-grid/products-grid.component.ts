import { Component, Input, ChangeDetectionStrategy, ChangeDetectorRef, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProductCardComponent } from '../../../../shared/components/product-card/page/product-card.component';
import { trigger, transition, style, animate, query, stagger } from '@angular/animations';

@Component({
  selector: 'app-products-grid',
  standalone: true,
  imports: [CommonModule, ProductCardComponent],
  templateUrl: './products-grid.component.html',
  styleUrls: ['./products-grid.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [
    trigger('fadeIn', [
      transition(':enter', [
        style({ opacity: 0 }),
        animate('300ms ease-in', style({ opacity: 1 }))
      ]),
      transition(':leave', [
        animate('200ms ease-out', style({ opacity: 0 }))
      ])
    ]),
    trigger('staggerFadeIn', [
      transition('* => *', [
        query(':enter', [
          style({ opacity: 0, transform: 'translateY(15px)' }),
          stagger('30ms', [
            animate('400ms ease-out', style({ opacity: 1, transform: 'translateY(0)' }))
          ])
        ], { optional: true })
      ])
    ])
  ]
})
export class ProductsGridComponent implements OnChanges {
  @Input() products: any[] = [];
  @Input() isLoading: boolean = false;
  @Input() isLoadingMore: boolean = false;
  
  skeletonCount = 8; 
  showEmptyState: boolean = false;
  
  constructor(private cdr: ChangeDetectorRef) {}
  
  ngOnChanges(changes: SimpleChanges) {
    if (changes['isLoading'] || changes['products'] || changes['isLoadingMore']) {
      if (!this.isLoading && !this.isLoadingMore && this.products.length === 0) {
        setTimeout(() => {
          this.showEmptyState = true;
          this.cdr.markForCheck();
        }, 1000); 
      } else {
        this.showEmptyState = false;
      }
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

  // destroy
  ngOnDestroy() {
    this.products = [];
    this.isLoading = false;
    this.isLoadingMore = false;
    this.skeletonCount = 0;
    this.showEmptyState = false;
  }
}