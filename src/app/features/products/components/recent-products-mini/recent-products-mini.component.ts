import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  ViewChild,
  inject,
  ChangeDetectorRef,
  OnChanges,
  SimpleChanges,
  AfterViewInit,
  ElementRef,
  OnDestroy
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { RecentlyVisitedService } from '../../../../core/services/recently-visited.service';
import { Product } from '../../../../interfaces/product';
import { Observable, of, finalize, tap, map } from 'rxjs';
import { take, catchError } from 'rxjs/operators';
import { ProductCardComponent } from '../../../../shared/components/product-card/page/product-card.component';
import Splide from '@splidejs/splide';

@Component({
  selector: 'app-recent-products-mini',
  standalone: true,
  imports: [CommonModule, RouterModule, ProductCardComponent],
  templateUrl: './recent-products-mini.component.html',
  styleUrls: ['./recent-products-mini.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RecentProductsMiniComponent implements OnInit, OnChanges, AfterViewInit, OnDestroy {
  private cdr = inject(ChangeDetectorRef);
  private router = inject(Router);
  
  recentProducts: Product[] = [];
  isLoading: boolean = true;
  maxProductsToShow: number = 12;
  
  @ViewChild('splideEl') splideEl?: ElementRef<HTMLElement>;
  private splide?: Splide;

  constructor(private recentlyVisitedService: RecentlyVisitedService) {}

  ngOnInit(): void {
    // Check if we already have products in the service
    const currentProducts = this.recentlyVisitedService.currentProducts;
    if (currentProducts && currentProducts.length > 0) {
      this.recentProducts = currentProducts.slice(0, this.maxProductsToShow);
      this.isLoading = false;
      this.cdr.markForCheck();
    }
    
    // Still load from the observable to catch any updates
    this.loadRecentProducts();
  }

  ngAfterViewInit(): void {
    this.initSplide();
  }

  ngOnChanges(changes: SimpleChanges) {
    // Reload products if any inputs change
    this.loadRecentProducts();
  }

  private initSplide(): void {
    if (this.splideEl && this.recentProducts.length > 0) {
      if (this.splide) {
        this.splide.destroy();
      }
      
      this.splide = new Splide(this.splideEl.nativeElement, {
        type: 'loop',
        perPage: 4,
        perMove: 1,
        pagination: true,
        arrows: true,
        autoplay: false,
        speed: 800,
        easing: 'cubic-bezier(0.25, 1, 0.5, 1)',
        lazyLoad: 'nearby',
        drag: true,
        snap: true,
        role: 'region',
        label: 'Recently Viewed Products',
        padding: { left: 0, right: 0 },
        trimSpace: true,
        updateOnMove: true,
        arrowPath: 'm15.5 0.932-4.3 4.38 14.5 14.6-14.5 14.5 4.3 4.4 14.6-14.6 4.4-4.3-4.4-4.4-14.6-14.6z',
        breakpoints: {
          640: {
            perPage: 2,
            padding: { left: 0, right: 0 },
            // gap: '0.5rem',
            arrows: false,
            width: '100%'
          },
          1024: {
            perPage: 3,
            padding: { left: 0, right: 0 }
          },
          1180: {
            perPage: 4,
            padding: { left: 0, right: 0 }
          }
        }
      });
      
      this.splide.mount();
    }
  }

  loadRecentProducts() {
    this.isLoading = true;
    this.cdr.markForCheck();
    
    this.recentlyVisitedService.recentlyVisitedProducts$
      .pipe(
        tap(products => console.log('RecentProductsMini - Products received:', products?.length || 0)),
        take(1),
        map((products: Product[]) => {
          // Filter out any invalid products (without ID) to prevent errors
          // AND limit each product to have only 3 images
          return products
            .filter((product: Product) => product && typeof product.id !== 'undefined')
            .map((product: Product) => ({
              ...product,
              images: product.images?.slice(0, 3) || []
            }))
            .slice(0, this.maxProductsToShow);
        }),
        catchError(error => {
          console.error('RecentProductsMini - Error loading products:', error);
          return of([] as Product[]);
        }),
        finalize(() => {
          this.isLoading = false;
          this.cdr.markForCheck();
          console.log('RecentProductsMini - Loading completed');
          
          // Initialize Splide after data is loaded
          setTimeout(() => {
            if (this.recentProducts.length > 3) {
              this.initSplide();
            }
          }, 100);
        })
      )
      .subscribe({
        next: (products: Product[]) => {
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

  ngOnDestroy(): void {
    if (this.splide) {
      this.splide.destroy();
    }
  }
}