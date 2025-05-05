import {
  Component,
  OnInit,
  HostListener,
  ChangeDetectionStrategy,
  inject,
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

    // أولاً، نتحقق ما إذا كان لدينا منتجات ذات صلة محفوظة
    const relatedIds = this.relatedProductsService.getAllRelatedIds();

    if (relatedIds.length >= 6) {
      // إذا كان لدينا منتجات كافية، نستخدمها
      const randomRelatedIds = this.shuffleArray(relatedIds).slice(0, 12);

      this.productService.getProductsByIds(randomRelatedIds).subscribe({
        next: (products) => {
          this.products = products;
          this.loading = false;
        },
        error: (err) => {
          console.error('Error loading related products:', err);
          // في حالة الخطأ، نرجع إلى المنتجات المميزة الافتراضية
          this.loadFeaturedProducts();
        }
      });
    } else {
      // إذا لم يكن لدينا منتجات ذات صلة كافية، نستخدم المنتجات المميزة
      this.loadFeaturedProducts();
    }
  }

  /**
   * تحميل المنتجات المميزة الافتراضية
   */
  private loadFeaturedProducts(): void {
    this.homeService.getFeaturedProducts(1, 13).subscribe({
      next: (data: any) => {
        this.products = data;
        this.loading = false;
      },
      error: (err: any) => {
        this.error = 'Failed to load recommended products';
        this.loading = false;
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
