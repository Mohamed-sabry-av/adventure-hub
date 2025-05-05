import {
  ChangeDetectionStrategy,
  Component,
  inject,
  Input,
  OnInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ProductService } from '../../../../core/services/product.service';
import { RelatedProductsService } from '../../../../core/services/related-products.service';
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
  private relatedProductsService = inject(RelatedProductsService);

  @Input() relatedIds: number[] = [];
  @Input() productId: number | null = null; // ID المنتج الحالي

  relatedProducts: any[] = [];
  isLoading: boolean = true;

  responsiveOptions = [
    { breakpoint: '1024px', numVisible: 3, numScroll: 1 },
    { breakpoint: '768px', numVisible: 2, numScroll: 1 },
    { breakpoint: '480px', numVisible: 1, numScroll: 1 },
  ];

  ngOnInit() {
    this.getRelatedProducts();
  }

  getRelatedProducts() {
    this.isLoading = true;

    // تحديد المصدر المناسب للـ IDs
    let idsToUse: number[] = [];

    // إذا كان هناك منتج معين، نستخدم الخدمة للحصول على الـ IDs ذات الصلة به
    if (this.productId) {
      // الحصول على الـ IDs من الخدمة، مع الأخذ بعين الاعتبار الـ IDs المقدمة كإدخال
      if (this.relatedIds.length > 0) {
        // إذا كان لدينا الـ IDs مباشرة من المنتج، نستخدمها أولاً
        this.relatedProductsService.addRelatedIds(this.productId, this.relatedIds);
        // ثم نحصل على قائمة متنوعة
        idsToUse = this.relatedProductsService.getRelatedIdsForProduct(this.productId, 8);
      } else {
        // إذا لم يكن لدينا الـ IDs من المنتج، نحصل على عشوائية من المخزن
        idsToUse = this.relatedProductsService.getRandomRelatedIds(8, this.productId);
      }
    } else if (this.relatedIds.length > 0) {
      // إذا لم يكن لدينا منتج معين ولكن لدينا الـ IDs، نخلطها فقط
      idsToUse = this.shuffleArray([...this.relatedIds]).slice(0, 8);
    } else {
      // إذا لم يكن لدينا أي شيء، نحصل على عشوائية من المخزن
      idsToUse = this.relatedProductsService.getRandomRelatedIds(8);
    }

    // التأكد من أن لدينا IDs للاستخدام
    if (idsToUse.length === 0) {
      this.isLoading = false;
      return;
    }

    // استرجاع المنتجات من الخدمة
    this.productService.getProductsByIds(idsToUse).subscribe({
      next: (products) => {
        this.relatedProducts = products;
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error fetching related products:', error);
        this.isLoading = false;
      },
    });
  }

  /**
   * خلط المصفوفة بشكل عشوائي (خوارزمية Fisher-Yates)
   */
  private shuffleArray<T>(array: T[]): T[] {
    const result = [...array];
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }
}
