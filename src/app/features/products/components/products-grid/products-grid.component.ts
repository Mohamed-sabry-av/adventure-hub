import { Component, Input, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
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
export class ProductsGridComponent {
  @Input() products: any[] = [];
  @Input() isLoading: boolean = false;
  @Input() isLoadingMore: boolean = false;
  
  skeletonCount = 12; // Number of skeleton cards to show while loading
  
  constructor(private cdr: ChangeDetectorRef) {}
  
  // Create an array for skeleton loading items
  get skeletonArray() {
    return Array(this.skeletonCount).fill(0).map((_, i) => i);
  }
  
  // Track products by their ID for better performance
  trackByProductId(index: number, product: any): number {
    return product?.id || index;
  }
  
  // Track skeleton items by index
  trackByIndex(index: number): number {
    return index;
  }
}