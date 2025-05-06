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
import { CarouselModule } from 'primeng/carousel';
import { forkJoin, Observable, of } from 'rxjs';
import { catchError, finalize, map } from 'rxjs/operators';

@Component({
  selector: 'app-product-related',
  standalone: true,
  imports: [CommonModule, ProductCardComponent, CarouselModule],
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
    { breakpoint: '1024px', numVisible: 3, numScroll: 1 },
    { breakpoint: '768px', numVisible: 2, numScroll: 1 },
    { breakpoint: '480px', numVisible: 1, numScroll: 1 },
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

    // إذا كان هناك منتج حالي ولديه related_ids
    if (this.productId && this.relatedIds && this.relatedIds.length > 0) {
      console.log(`تحميل المنتجات ذات الصلة للمنتج ${this.productId}. عدد الـ IDs: ${this.relatedIds.length}`);

      // حفظ الـ related_ids في الخدمة للاستخدام اللاحق
      this.relatedProductsService.addRelatedIds(this.productId, this.relatedIds);

      // 1. تحميل المنتجات المرتبطة مباشرة من الـ API
      this.loadDirectRelatedProducts();
    } else {
      // إذا لم يكن هناك منتج حالي أو related_ids، نستخدم البيانات من LocalStorage
      this.loadFromLocalStorage();
    }
  }

  /**
   * تحميل المنتجات المرتبطة مباشرة بالمنتج الحالي وإضافة منتجات إضافية من LocalStorage
   */
  private loadDirectRelatedProducts() {
    if (!this.relatedIds || this.relatedIds.length === 0) {
      this.loadFromLocalStorage();
      return;
    }

    // ترتيب الـ relatedIds بشكل عشوائي
    const shuffledDirectIds = this.shuffleArray([...this.relatedIds]);

    // تحديد عدد المنتجات الإضافية المطلوب تحميلها من LocalStorage
    const numAdditionalNeeded = this.maxProductsToShow - shuffledDirectIds.length;

    // تحميل المنتجات المرتبطة مباشرة من الـ API أولاً
    this.productService.getProductsByIds(shuffledDirectIds)
      .pipe(
        // تنفيذ عند الانتهاء من التحميل
        finalize(() => this.isLoading = false)
      )
      .subscribe({
        next: (directProducts) => {
          console.log(`تم تحميل ${directProducts.length} منتج مرتبط مباشرة`);

          // إضافة المنتجات المباشرة إلى القائمة
          this.relatedProducts = [...directProducts];

          // تحميل منتجات إضافية من LocalStorage إذا كان عدد المنتجات المباشرة أقل من الحد الأقصى
          if (numAdditionalNeeded > 0) {
            this.loadAdditionalProductsFromLocalStorage(numAdditionalNeeded, shuffledDirectIds);
          }

          this.cdr.markForCheck();
        },
        error: (error) => {
          console.error('خطأ في تحميل المنتجات المرتبطة مباشرة:', error);
          // في حالة الخطأ، نحاول تحميل المنتجات من LocalStorage
          this.loadFromLocalStorage();
          this.cdr.markForCheck();
        }
      });
  }

  /**
   * تحميل منتجات إضافية من LocalStorage
   * @param count عدد المنتجات الإضافية المطلوبة
   * @param excludeIds قائمة الـ IDs التي يجب استبعادها (مثل المنتج الحالي والمنتجات المحملة بالفعل)
   */
  private loadAdditionalProductsFromLocalStorage(count: number, excludeIds: number[] = []) {
    // تأكد من استبعاد المنتج الحالي
    const idsToExclude = [...excludeIds];
    if (this.productId) {
      idsToExclude.push(this.productId);
    }

    // استرجاع IDs عشوائية من LocalStorage، مع استبعاد الـ IDs المحددة
    const additionalIds = this.relatedProductsService.getRandomRelatedIds(
      count + 5, // طلب عدد أكبر للتأكد من الحصول على العدد المطلوب
      idsToExclude
    );

    // لا تفعل شيئًا إذا لم تكن هناك IDs إضافية
    if (additionalIds.length === 0) {
      return;
    }

    console.log(`تحميل ${additionalIds.length} منتج إضافي من LocalStorage`);

    // تحميل المنتجات الإضافية
    this.productService.getProductsByIds(additionalIds)
      .subscribe({
        next: (additionalProducts) => {
          console.log(`تم تحميل ${additionalProducts.length} منتج إضافي`);

          // تجنب إضافة منتجات مكررة
          const existingIds = new Set(this.relatedProducts.map(p => p.id));
          const uniqueAdditionalProducts = additionalProducts.filter(p => !existingIds.has(p.id));

          // إضافة المنتجات الإضافية إلى القائمة
          this.relatedProducts = [
            ...this.relatedProducts,
            ...uniqueAdditionalProducts
          ];

          // ترتيب جميع المنتجات بشكل عشوائي وتحديد العدد الأقصى
          this.relatedProducts = this.shuffleArray(this.relatedProducts).slice(0, this.maxProductsToShow);

          this.cdr.markForCheck();
        },
        error: (error) => {
          console.error('خطأ في تحميل المنتجات الإضافية:', error);
          this.cdr.markForCheck();
        }
      });
  }

  /**
   * تحميل المنتجات من LocalStorage (عندما لا تكون هناك related_ids مباشرة)
   */
  private loadFromLocalStorage() {
    const randomIds = this.relatedProductsService.getRandomRelatedIds(
      this.maxProductsToShow,
      this.productId  // استبعاد المنتج الحالي
    );

    if (randomIds.length === 0) {
      console.log('لا توجد منتجات ذات صلة في LocalStorage');
      this.isLoading = false;
      this.cdr.markForCheck();
      return;
    }

    console.log(`تحميل ${randomIds.length} منتج من LocalStorage`);

    this.productService.getProductsByIds(randomIds)
      .pipe(
        finalize(() => this.isLoading = false)
      )
      .subscribe({
        next: (products) => {
          console.log(`تم تحميل ${products.length} منتج من LocalStorage`);
          this.relatedProducts = products;
          this.cdr.markForCheck();
        },
        error: (error) => {
          console.error('خطأ في تحميل المنتجات من LocalStorage:', error);
          this.relatedProducts = [];
          this.cdr.markForCheck();
        }
      });
  }

  // معالجة النقر على منتج
  onProductClick(productSlug: string): void {
    // تحديث isLoading لإظهار أن العملية قيد التقدم
    this.isLoading = true;
    this.cdr.markForCheck();

    // التنقل إلى المنتج المختار
    this.router.navigate(['/product', productSlug]);
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
