import { Component, inject, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ProductService } from '../../../../core/services/product.service';
import { ProductCardComponent } from '../../../../shared/components/product-card/page/product-card.component';
import { CarouselModule } from 'primeng/carousel'; // ✅ استيراد PrimeNG Carousel

@Component({
  selector: 'app-product-related',
  standalone: true,
  imports: [CommonModule, RouterLink, ProductCardComponent, CarouselModule], // ✅ إضافة الـ Carousel
  templateUrl: './product-related.component.html',
  styleUrls: ['./product-related.component.css'],
})
export class ProductRelatedComponent implements OnInit {
  private productService = inject(ProductService);

  @Input() relatedIds: number[] = [];

  relatedProducts: any[] = [];

  responsiveOptions = [
    {
      breakpoint: '1024px', // شاشات كبيرة
      numVisible: 4,
      numScroll: 1
    },
    {
      breakpoint: '768px', // التابلت
      numVisible: 3,
      numScroll: 1
    },
    {
      breakpoint: '560px', // الموبايل
      numVisible: 2,
      numScroll: 1
    }
  ];

  ngOnInit() {
    this.getRelatedProducts();
  }

  getRelatedProducts() {
    if (this.relatedIds.length > 0) {
      this.productService.getProductsByIds(this.relatedIds).subscribe({
        next: (products) => {
          this.relatedProducts = products;
          console.log('Related Products Fetched:', this.relatedProducts);
        },
        error: (error) => {
          console.error('Error fetching related products:', error);
        },
      });
    }
  }
}
