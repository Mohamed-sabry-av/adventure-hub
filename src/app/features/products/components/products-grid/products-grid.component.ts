import { Component, Input, HostListener, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProductCardComponent } from '../../../../shared/components/product-card/page/product-card.component';
@Component({
  selector: 'app-products-grid',
  imports: [CommonModule, ProductCardComponent],
  templateUrl: './products-grid.component.html',
  styleUrl: './products-grid.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush

})
export class ProductsGridComponent {
  @Input() products: any[] = [];
  @Input() isLoading: boolean = false;
  @Input() isLoadingMore: boolean = false;
}
