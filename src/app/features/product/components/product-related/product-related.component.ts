import { Component, inject, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ProductService } from '../../../../core/services/product.service';
import { ProductCardComponent } from '../../../../shared/components/product-card/page/product-card.component';
import { CarouselModule } from 'primeng/carousel'; 

@Component({
  selector: 'app-product-related',
  standalone: true,
  imports: [CommonModule, ProductCardComponent, CarouselModule],
  templateUrl: './product-related.component.html',
  styleUrls: ['./product-related.component.css'],
})
export class ProductRelatedComponent implements OnInit {
  private productService = inject(ProductService);

  @Input() relatedIds: number[] = [];

  relatedProducts: any[] = [];

  responsiveOptions = [
    { breakpoint: '1024px', numVisible: 3, numScroll: 1 },
    { breakpoint: '768px', numVisible: 2, numScroll: 1 },
    { breakpoint: '480px', numVisible: 1, numScroll: 1 }
  ];
  ngOnInit() {
    this.getRelatedProducts();
  }

  getRelatedProducts() {
    if (this.relatedIds.length > 0) {
      this.productService.getProductsByIds(this.relatedIds).subscribe({
        next: (products) => {
          this.relatedProducts = products;
        },
        error: (error) => {
          console.error('Error fetching related products:', error);
        },
      });
    }
  }
}
