import { Component, OnInit, ChangeDetectorRef, inject, HostListener, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { CarouselModule, OwlOptions, CarouselComponent } from 'ngx-owl-carousel-o';
import { HomeService } from '../../service/home.service';
import { ProductService } from '../../../../core/services/product.service';
import { RelatedProductsService } from '../../../../core/services/related-products.service';
import { ProductCardComponent } from '../../../../shared/components/product-card/page/product-card.component';

@Component({
  selector: 'app-recommended-products',
  standalone: true,
  imports: [CommonModule, RouterModule, CarouselModule, ProductCardComponent],
  templateUrl: './recommended-products.component.html',
  styleUrls: ['./recommended-products.component.css'],
})
export class RecommendedProductsComponent implements OnInit, AfterViewInit {
  private homeService = inject(HomeService);
  private productService = inject(ProductService);
  private relatedProductsService = inject(RelatedProductsService);
  private cdr = inject(ChangeDetectorRef);

  @ViewChild('owlCarousel') owlCarousel?: CarouselComponent;

  products: any[] = [];
  loading: boolean = true;
  error: string | null = null;
  screenWidth: number = window.innerWidth;

  carouselOptions: OwlOptions = {
    loop: true,
    mouseDrag: true,
    touchDrag: true,
    pullDrag: false,
    dots: true,
    navSpeed: 700,
    navText: ['', ''],
    autoWidth: false,
    items: 4,
    responsive: {
      0: {
        items: 2
      },
      576: {
        items: 2
      },
      768: {
        items: 3
      },
      992: {
        items: 4
      }
    },
    nav: false // Disable default navigation
  };

  ngOnInit(): void {
    this.loadRecommendedProducts();
  }

  ngAfterViewInit(): void {
    this.setupCustomNavigation();
  }

  setupCustomNavigation(): void {
    setTimeout(() => {
      const prevBtn = document.querySelector('.recommended-products .prev-btn') as HTMLElement;
      const nextBtn = document.querySelector('.recommended-products .next-btn') as HTMLElement;
      
      if (prevBtn) {
        prevBtn.addEventListener('click', () => {
          if (this.owlCarousel) {
            this.owlCarousel.prev();
          }
        });
      }
      
      if (nextBtn) {
        nextBtn.addEventListener('click', () => {
          if (this.owlCarousel) {
            this.owlCarousel.next();
          }
        });
      }
    }, 500); // Short delay to ensure DOM is ready
  }

  @HostListener('window:resize')
  onResize() {
    this.screenWidth = window.innerWidth;
    // Force refresh carousel on resize
    if (this.owlCarousel) {
      setTimeout(() => {
        // Force rerender of carousel
        this.cdr.detectChanges();
        this.cdr.markForCheck();
      }, 200);
    }
  }

  loadRecommendedProducts(): void {
    this.loading = true;
    this.loadSmartRecommendations();
  }

  private loadSmartRecommendations(): void {
    const popularIds = this.relatedProductsService.getMostCommonRelatedIds(6);
    const randomIds = this.relatedProductsService.getRandomRelatedIds(6);
    const combinedIds = [...new Set([...popularIds, ...randomIds])];

    if (combinedIds.length >= 6) {
      const idsToUse = this.shuffleArray(combinedIds).slice(0, 24);
      this.productService.getProductsByIds(idsToUse).subscribe({
        next: (products) => {
          if (products.length >= 8) {
            this.products = this.shuffleArray(products).slice(0, 12);
            this.loading = false;
            this.cdr.markForCheck();
          } else {
            this.loadFeaturedProductsToComplement(products);
          }
        },
        error: (error) => {
          console.error('Error loading recommended products:', error);
          this.loadFeaturedProducts();
        },
      });
    } else {
      this.loadFeaturedProducts();
    }
  }

  private loadFeaturedProductsToComplement(existingProducts: any[]): void {
    const neededProductsCount = 12 - existingProducts.length;
    if (neededProductsCount <= 0) {
      this.products = existingProducts.slice(0, 12);
      this.loading = false;
      this.cdr.markForCheck();
      return;
    }

    this.homeService.getFeaturedProducts(1, neededProductsCount + 5).subscribe({
      next: (featuredProducts: any) => {
        const existingIds = new Set(existingProducts.map((p) => p.id));
        const uniqueFeaturedProducts = featuredProducts.filter((p: any) => !existingIds.has(p.id));
        this.products = this.shuffleArray([...existingProducts, ...uniqueFeaturedProducts]).slice(0, 12);
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.products = existingProducts;
        this.loading = false;
        this.cdr.markForCheck();
      },
    });
  }

  private loadFeaturedProducts(): void {
    this.homeService.getFeaturedProducts(1, 12).subscribe({
      next: (data: any) => {
        this.products = data;
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.error = 'Failed to load recommended products';
        this.loading = false;
        this.cdr.markForCheck();
      },
    });
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