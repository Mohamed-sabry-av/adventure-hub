import { Component, OnInit, ChangeDetectorRef, inject, HostListener, ViewChild, AfterViewInit, ElementRef, OnDestroy, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { CarouselModule, OwlOptions, CarouselComponent } from 'ngx-owl-carousel-o';
import { HomeService } from '../../service/home.service';
import { ProductService } from '../../../../core/services/product.service';
import { RelatedProductsService } from '../../../../core/services/related-products.service';
import { ProductCardComponent } from '../../../../shared/components/product-card/page/product-card.component';
import { timer } from 'rxjs';
import { take } from 'rxjs/operators';

@Component({
  selector: 'app-recommended-products',
  standalone: true,
  imports: [CommonModule, RouterModule, CarouselModule, ProductCardComponent],
  templateUrl: './recommended-products.component.html',
  styleUrls: ['./recommended-products.component.css'],
})
export class RecommendedProductsComponent implements OnInit, AfterViewInit, OnDestroy {
  private homeService = inject(HomeService);
  private productService = inject(ProductService);
  private relatedProductsService = inject(RelatedProductsService);
  private cdr = inject(ChangeDetectorRef);
  private zone = inject(NgZone);

  @ViewChild('owlCarousel') owlCarousel?: CarouselComponent;
  @ViewChild('prevBtn') prevBtn?: ElementRef<HTMLButtonElement>;
  @ViewChild('nextBtn') nextBtn?: ElementRef<HTMLButtonElement>;

  products: any[] = [];
  loading: boolean = true;
  error: string | null = null;
  screenWidth: number = window.innerWidth;
  
  private prevClickListener?: (e: Event) => void;
  private nextClickListener?: (e: Event) => void;

  carouselOptions: OwlOptions = {
    loop: true,
    mouseDrag: true,
    touchDrag: true,
    pullDrag: false,
    dots: false, // Disable dots for better performance
    navSpeed: 300, // Faster animation
    autoplay: false,
    smartSpeed: 300, // Faster transitions
    fluidSpeed: true,
    navText: ['', ''],
    autoWidth: false,
    items: 4,
    lazyLoad: false, // Disable lazy loading for better performance
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
    nav: false
  };

  ngOnInit(): void {
    this.loadRecommendedProducts();
  }

  ngAfterViewInit(): void {
    // Immediate setup plus fallback
    this.setupCustomNavigation();
    // Set a fallback in case the first attempt fails
    requestAnimationFrame(() => {
      this.setupCustomNavigation();
    });
  }
  
  ngOnDestroy(): void {
    this.removeNavigationListeners();
  }
  
  private removeNavigationListeners(): void {
    if (this.prevBtn?.nativeElement && this.prevClickListener) {
      this.prevBtn.nativeElement.removeEventListener('click', this.prevClickListener);
    }
    
    if (this.nextBtn?.nativeElement && this.nextClickListener) {
      this.nextBtn.nativeElement.removeEventListener('click', this.nextClickListener);
    }
  }

  setupCustomNavigation(): void {
    // Direct DOM manipulation for maximum performance
    try {
      this.removeNavigationListeners();
      
      // Get buttons using direct DOM queries for speed
      const prevBtn = this.prevBtn?.nativeElement || document.querySelector('.recommended-products .prev-btn') as HTMLElement;
      const nextBtn = this.nextBtn?.nativeElement || document.querySelector('.recommended-products .next-btn') as HTMLElement;
      
      if (!prevBtn || !nextBtn || !this.owlCarousel) return;
      
      // Simple and direct click handlers
      this.prevClickListener = (e: Event) => {
        e.preventDefault();
        if (this.owlCarousel) this.owlCarousel.prev();
      };
      
      this.nextClickListener = (e: Event) => {
        e.preventDefault(); 
        if (this.owlCarousel) this.owlCarousel.next();
      };
      
      // Add listeners
      prevBtn.addEventListener('click', this.prevClickListener);
      nextBtn.addEventListener('click', this.nextClickListener);
      
    } catch (err) {
      console.error('Error setting up carousel navigation:', err);
    }
  }

  @HostListener('window:resize')
  onResize() {
    this.screenWidth = window.innerWidth;
    if (this.owlCarousel) {
      setTimeout(() => {
        this.cdr.detectChanges();
        this.setupCustomNavigation();
      }, 100);
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