import {
  Component,
  OnInit,
  HostListener,
  ChangeDetectionStrategy,
  inject,
  ChangeDetectorRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { HomeService } from '../../service/home.service';
import { ProductService } from '../../../../core/services/product.service';
import { RelatedProductsService } from '../../../../core/services/related-products.service';
import { ProductCardComponent } from '../../../../shared/components/product-card/page/product-card.component';
import { CustomCarouselComponent } from '../custom-carousel/custom-carousel.component';

@Component({
  selector: 'app-recommended-products',
  standalone: true,
  imports: [CommonModule, RouterModule, ProductCardComponent, CustomCarouselComponent],
  templateUrl: './recommended-products.component.html',
  styleUrls: ['./recommended-products.component.css'],
})
export class RecommendedProductsComponent implements OnInit {
  private homeService = inject(HomeService);
  private productService = inject(ProductService);
  private relatedProductsService = inject(RelatedProductsService);
  private cdr = inject(ChangeDetectorRef);

  products: any[] = [];
  loading: boolean = true;
  error: string | null = null;
  screenWidth: number = window.innerWidth;

  responsiveOptions = [
    {
      breakpoint: '1199px',
      numVisible: 4,
      numScroll: 1,
    },
    {
      breakpoint: '991px',
      numVisible: 3,
      numScroll: 1,
    },
    {
      breakpoint: '767px',
      numVisible: 2.5,
      numScroll: 1,
    },
    {
      breakpoint: '575px',
      numVisible: 2,
      numScroll: 1,
    },
  ];

  ngOnInit(): void {
    this.loadRecommendedProducts();
    this.screenWidth = window.innerWidth;
  }

  loadRecommendedProducts(): void {
    this.loading = true;

    // استخدام استراتيجية ذكية للمنتجات الموصى بها
    this.loadSmartRecommendations();
  }

  /**
   * استراتيجية ذكية لعرض المنتجات الموصى بها
   * الاستراتيجية:
   * 1. جمع أكثر المنتجات تكرارًا من RelatedProductsService
   * 2. إضافة منتجات عشوائية من RelatedProductsService
   * 3. استكمال القائمة بالمنتجات المميزة إذا لزم الأمر
   */
  private loadSmartRecommendations(): void {
    // 1. الحصول على أكثر المنتجات شيوعًا (ظهورًا في related_ids)
    const popularIds = this.relatedProductsService.getMostCommonRelatedIds(6);

    // 2. الحصول على منتجات عشوائية من RelatedProductsService
    const randomIds = this.relatedProductsService.getRandomRelatedIds(6);

    // 3. دمج القوائم وإزالة التكرار
    const combinedIds = [...new Set([...popularIds, ...randomIds])];

    // التحقق من أن لدينا عددًا كافيًا من المنتجات
    if (combinedIds.length >= 6) {
      console.log('استخدام المنتجات الموصى بها بذكاء من localStorage');
      // استخدام عينة أكبر للحصول على نتائج أفضل
      const idsToUse = this.shuffleArray(combinedIds).slice(0, 24);

      // الحصول على المنتجات من الخدمة
      this.productService.getProductsByIds(idsToUse).subscribe({
        next: (products) => {
          console.log(`تم تحميل ${products.length} منتج من المنتجات الموصى بها`);

          if (products.length >= 8) {
            // إذا حصلنا على عدد كافٍ من المنتجات، نستخدمها مباشرة
            this.products = this.shuffleArray(products).slice(0, 12);
            this.loading = false;
            this.cdr.markForCheck();
          } else {
            // إذا لم يكن هناك عدد كافٍ من المنتجات، نستكمل بالمنتجات المميزة
            this.loadFeaturedProductsToComplement(products);
          }
        },
        error: (error) => {
          console.error('خطأ في تحميل المنتجات الموصى بها:', error);
          this.loadFeaturedProducts();
        }
      });
    } else {
      // إذا لم يكن لدينا عدد كافٍ من المنتجات في localStorage، نستخدم المنتجات المميزة
      console.log('عدد المنتجات غير كافٍ، استخدام المنتجات المميزة');
      this.loadFeaturedProducts();
    }
  }

  /**
   * تحميل منتجات مميزة لاستكمال قائمة المنتجات الحالية
   */
  private loadFeaturedProductsToComplement(existingProducts: any[]): void {
    const neededProductsCount = 12 - existingProducts.length;

    // إذا كانت جميع المنتجات المطلوبة متوفرة بالفعل، فلا داعي لاستكمالها
    if (neededProductsCount <= 0) {
      this.products = existingProducts.slice(0, 12);
      this.loading = false;
      this.cdr.markForCheck();
      return;
    }

    // الحصول على منتجات مميزة إضافية لاستكمال القائمة
    this.homeService.getFeaturedProducts(1, neededProductsCount + 5).subscribe({
      next: (featuredProducts: any) => {
        // تجنب التكرار بإزالة المنتجات التي قد تكون موجودة بالفعل في القائمة
        const existingIds = new Set(existingProducts.map(p => p.id));
        const uniqueFeaturedProducts = featuredProducts.filter((p:any) => !existingIds.has(p.id));

        // دمج المنتجات وخلطها
        this.products = this.shuffleArray([...existingProducts, ...uniqueFeaturedProducts]).slice(0, 12);
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: (err: any) => {
        // إذا فشل استكمال القائمة، نستخدم المنتجات المتوفرة
        this.products = existingProducts;
        this.loading = false;
        this.cdr.markForCheck();
        console.warn('تعذر استكمال قائمة المنتجات، استخدام المنتجات المتوفرة فقط');
      },
    });
  }

  /**
   * تحميل المنتجات المميزة الافتراضية
   */
  private loadFeaturedProducts(): void {
    this.homeService.getFeaturedProducts(1, 13).subscribe({
      next: (data: any) => {
        this.products = data;
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: (err: any) => {
        this.error = 'Failed to load recommended products';
        this.loading = false;
        this.cdr.markForCheck();
        console.error('Error loading recommended products:', err);
      },
    });
  }

  @HostListener('window:resize', ['$event'])
  onResize() {
    this.screenWidth = window.innerWidth;
  }

  getVisibleItemsCount(): number {
    if (this.screenWidth < 576) {
      return 2; // Mobile
    } else if (this.screenWidth < 768) {
      return 2.5; // Small tablet
    } else if (this.screenWidth < 992) {
      return 3; // Tablet
    } else {
      return 4; // Desktop
    }
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
