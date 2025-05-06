import {
  ChangeDetectionStrategy,
  Component,
  inject,
  Input,
  OnInit,
  ChangeDetectorRef,
  OnChanges,
  SimpleChanges,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { ProductService } from '../../../../core/services/product.service';
import { RelatedProductsService } from '../../../../core/services/related-products.service';
import { ProductCardComponent } from '../../../../shared/components/product-card/page/product-card.component';
import { CustomCarouselComponent } from '../../../home/components/custom-carousel/custom-carousel.component';
import { forkJoin, Observable, of } from 'rxjs';
import { catchError, finalize, map } from 'rxjs/operators';

@Component({
  selector: 'app-product-related',
  standalone: true,
  imports: [CommonModule, ProductCardComponent, CustomCarouselComponent],
  templateUrl: './product-related.component.html',
  styleUrls: ['./product-related.component.css'],
})
export class ProductRelatedComponent implements OnInit, OnChanges {
  private productService = inject(ProductService);
  private relatedProductsService = inject(RelatedProductsService);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);

  @Input() relatedIds: number[] = [];
  @Input() productId: number | any = null; // ID المنتج الحالي

  relatedProducts: any[] = [];
  isLoading: boolean = true;
  maxProductsToShow: number = 25; // أقصى عدد للمنتجات المعروضة

  responsiveOptions = [
    {
      breakpoint: '1400px',
      numVisible: 4,
      numScroll: 1,
    },
    {
      breakpoint: '1024px',
      numVisible: 3,
      numScroll: 1,
    },
    {
      breakpoint: '768px',
      numVisible: 2,
      numScroll: 1,
    },
    {
      breakpoint: '480px',
      numVisible: 2,
      numScroll: 1,
    },
  ];

  ngOnInit() {
    this.loadRelatedProducts();
  }

  ngOnChanges(changes: SimpleChanges) {
    // إعادة تحميل المنتجات إذا تغير productId أو relatedIds
    if ((changes['productId'] && !changes['productId'].firstChange) ||
        (changes['relatedIds'] && !changes['relatedIds'].firstChange)) {
      this.loadRelatedProducts();
    }
  }

  loadRelatedProducts() {
    this.isLoading = true;

    if (this.productId && this.relatedIds && this.relatedIds.length > 0) {

      this.relatedProductsService.addRelatedIds(this.productId, this.relatedIds);

      this.loadDirectRelatedProducts();
    } else {
      this.loadFromLocalStorage();
    }
  }

  private loadDirectRelatedProducts() {
    if (!this.relatedIds || this.relatedIds.length === 0) {
      this.loadFromLocalStorage();
      return;
    }

    const shuffledDirectIds = this.shuffleArray([...this.relatedIds]);

    const numAdditionalNeeded = this.maxProductsToShow - shuffledDirectIds.length;

    this.productService.getProductsByIds(shuffledDirectIds)
      .pipe(
        finalize(() => this.isLoading = false)
      )
      .subscribe({
        next: (directProducts) => {
         

          this.relatedProducts = [...directProducts];

          if (numAdditionalNeeded > 0) {
            this.loadAdditionalProductsFromLocalStorage(numAdditionalNeeded, shuffledDirectIds);
          }

          this.cdr.markForCheck();
        },
        error: (error) => {
          this.loadFromLocalStorage();
          this.cdr.markForCheck();
        }
      });
  }


  private loadAdditionalProductsFromLocalStorage(count: number, excludeIds: number[] = []) {
    const idsToExclude = [...excludeIds];
    if (this.productId) {
      idsToExclude.push(this.productId);
    }

    const additionalIds = this.relatedProductsService.getRandomRelatedIds(
      count + 5, // طلب عدد أكبر للتأكد من الحصول على العدد المطلوب
      idsToExclude
    );

    if (additionalIds.length === 0) {
      return;
    }


    this.productService.getProductsByIds(additionalIds)
      .subscribe({
        next: (additionalProducts) => {

          const existingIds = new Set(this.relatedProducts.map(p => p.id));
          const uniqueAdditionalProducts = additionalProducts.filter(p => !existingIds.has(p.id));

          this.relatedProducts = [
            ...this.relatedProducts,
            ...uniqueAdditionalProducts
          ];

          // ترتيب جميع المنتجات بشكل عشوائي وتحديد العدد الأقصى
          this.relatedProducts = this.shuffleArray(this.relatedProducts).slice(0, this.maxProductsToShow);

          this.cdr.markForCheck();
        },
        error: (error) => {
          this.cdr.markForCheck();
        }
      });
  }


  private loadFromLocalStorage() {
    const randomIds = this.relatedProductsService.getRandomRelatedIds(
      this.maxProductsToShow,
      this.productId  
    );

    if (randomIds.length === 0) {
      this.isLoading = false;
      this.cdr.markForCheck();
      return;
    }

    this.productService.getProductsByIds(randomIds)
      .pipe(
        finalize(() => this.isLoading = false)
      )
      .subscribe({
        next: (products) => {
          this.relatedProducts = products;
          this.cdr.markForCheck();
        },
        error: (error) => {
          this.relatedProducts = [];
          this.cdr.markForCheck();
        }
      });
  }

  onProductClick(productSlug: string): void {
    this.isLoading = true;
    this.cdr.markForCheck();

    this.router.navigate(['/product', productSlug]);
  }

  private shuffleArray<T>(array: T[]): T[] {
    const result = [...array];
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }
}
