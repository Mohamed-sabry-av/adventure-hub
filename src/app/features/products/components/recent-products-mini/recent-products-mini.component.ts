import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  ViewChild,
  ElementRef,
  AfterViewInit,
  OnDestroy,
  inject,
  ChangeDetectorRef,
  NgZone,
  OnChanges,
  SimpleChanges
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { RecentlyVisitedService } from '../../../../core/services/recently-visited.service';
import { Product } from '../../../../interfaces/product';
import { Observable, map, timer, of, finalize, tap } from 'rxjs';
import { take, catchError } from 'rxjs/operators';
import { ProductCardComponent } from '../../../../shared/components/product-card/page/product-card.component';
import { CarouselModule, OwlOptions, CarouselComponent } from 'ngx-owl-carousel-o';

@Component({
  selector: 'app-recent-products-mini',
  standalone: true,
  imports: [CommonModule, RouterModule, ProductCardComponent, CarouselModule],
  templateUrl: './recent-products-mini.component.html',
  styleUrls: ['./recent-products-mini.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RecentProductsMiniComponent implements OnInit, AfterViewInit, OnDestroy, OnChanges {
  private cdr = inject(ChangeDetectorRef);
  private zone = inject(NgZone);
  private router = inject(Router);
  
  recentProducts: Product[] = [];
  isLoading: boolean = true;
  maxProductsToShow: number = 8;

  @ViewChild('owlCarousel') owlCarousel?: CarouselComponent;
  @ViewChild('prevBtn') prevBtn?: ElementRef<HTMLButtonElement>;
  @ViewChild('nextBtn') nextBtn?: ElementRef<HTMLButtonElement>;

  private prevClickListener?: (e: Event) => void;
  private nextClickListener?: (e: Event) => void;

  // Carousel options
  carouselOptions: OwlOptions = {
    loop: true,
    mouseDrag: true,
    touchDrag: true,
    pullDrag: false,
    dots: true,
    navSpeed: 300,
    autoplay: false,
    smartSpeed: 300,
    fluidSpeed: true,
    navText: ['', ''],
    autoWidth: false,
    items: 4,
    lazyLoad: false,
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

  constructor(private recentlyVisitedService: RecentlyVisitedService) {
  }

  ngOnInit(): void {
    // Check if we already have products in the service
    const currentProducts = this.recentlyVisitedService.currentProducts;
    if (currentProducts && currentProducts.length > 0) {
      this.recentProducts = currentProducts.slice(0, this.maxProductsToShow);
      this.isLoading = false;
      this.cdr.markForCheck();
    } else {
    }
    
    // Still load from the observable to catch any updates
    this.loadRecentProducts();
  }

  ngOnChanges(changes: SimpleChanges) {
    // Reload products if any inputs change
    this.loadRecentProducts();
  }

  ngAfterViewInit() {
    // Wait a bit for the carousel to initialize
    timer(100, 300)
      .pipe(take(5))
      .subscribe(() => {
        this.setupCustomNavigation();
      });
  }

  ngOnDestroy() {
    this.removeNavigationListeners();
  }

  loadRecentProducts() {
    this.isLoading = true;
    this.cdr.markForCheck();
    
    this.recentlyVisitedService.recentlyVisitedProducts$
      .pipe(
        tap(products => console.log('RecentProductsMini - Products received:', products?.length || 0)),
        take(1),
        map((products) => {
          // Filter out any invalid products (without ID) to prevent errors
          return products
            .filter(product => product && typeof product.id !== 'undefined')
            .slice(0, this.maxProductsToShow);
        }),
        catchError(error => {
          console.error('RecentProductsMini - Error loading products:', error);
          return of([]);
        }),
        finalize(() => {
          this.isLoading = false;
          this.cdr.markForCheck();
          console.log('RecentProductsMini - Loading completed');
        })
      )
      .subscribe({
        next: (products) => {
          this.recentProducts = products;
          console.log('RecentProductsMini - Products loaded:', this.recentProducts.length);
          this.cdr.markForCheck();
        },
        error: (error) => {
          console.error('RecentProductsMini - Subscription error:', error);
          this.isLoading = false;
          this.recentProducts = [];
          this.cdr.markForCheck();
        }
      });
  }

  onProductClick(productSlug: string | undefined): void {
    if (!productSlug) {
      return;
    }
    this.isLoading = true;
    this.cdr.markForCheck();
    this.router.navigate(['/product', productSlug]);
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
    this.zone.runOutsideAngular(() => {
      // Remove previous listeners
      this.removeNavigationListeners();

      if (this.prevBtn?.nativeElement && this.nextBtn?.nativeElement && this.owlCarousel) {
        this.prevClickListener = (e: Event) => {
          e.preventDefault();
          e.stopPropagation();
          if (this.owlCarousel) {
            this.owlCarousel.prev();
            this.zone.run(() => {
              this.cdr.markForCheck();
            });
          }
        };
        
        this.nextClickListener = (e: Event) => {
          e.preventDefault();
          e.stopPropagation();
          if (this.owlCarousel) {
            this.owlCarousel.next();
            this.zone.run(() => {
              this.cdr.markForCheck();
            });
          }
        };
        
        this.prevBtn.nativeElement.addEventListener('click', this.prevClickListener);
        this.nextBtn.nativeElement.addEventListener('click', this.nextClickListener);
      } else {
        // Use DOM selectors as fallback
        const prevBtn = document.querySelector('.products-carousel .prev-btn') as HTMLElement;
        const nextBtn = document.querySelector('.products-carousel .next-btn') as HTMLElement;
        
        if (prevBtn && nextBtn && this.owlCarousel) {
          this.prevClickListener = (e: Event) => {
            e.preventDefault();
            e.stopPropagation();
            if (this.owlCarousel) {
              this.owlCarousel.prev();
              this.zone.run(() => {
                this.cdr.markForCheck();
              });
            }
          };
          
          this.nextClickListener = (e: Event) => {
            e.preventDefault();
            e.stopPropagation();
            if (this.owlCarousel) {
              this.owlCarousel.next();
              this.zone.run(() => {
                this.cdr.markForCheck();
              });
            }
          };
          
          prevBtn.addEventListener('click', this.prevClickListener);
          nextBtn.addEventListener('click', this.nextClickListener);
        }
      }
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