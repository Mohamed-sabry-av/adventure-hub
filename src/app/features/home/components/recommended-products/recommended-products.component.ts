import { Component, OnInit, ChangeDetectorRef, inject, ViewChild, AfterViewInit, ElementRef, OnDestroy } from '@angular/core';
import { CommonModule, isPlatformBrowser, isPlatformServer } from '@angular/common';
import { RouterModule } from '@angular/router';
import { HomeService } from '../../service/home.service';
import { ProductService } from '../../../../core/services/product.service';
import { RelatedProductsService } from '../../../../core/services/related-products.service';
import { ProductCardComponent } from '../../../../shared/components/product-card/page/product-card.component';
import { CacheService } from '../../../../core/services/cashing.service';
import Splide from '@splidejs/splide';
import { forkJoin, of, Observable, EMPTY } from 'rxjs';
import { catchError, tap, shareReplay, map, take } from 'rxjs/operators';
import { PLATFORM_ID } from '@angular/core';

@Component({
  selector: 'app-recommended-products',
  standalone: true,
  imports: [CommonModule, RouterModule, ProductCardComponent],
  templateUrl: './recommended-products.component.html',
  styleUrls: ['./recommended-products.component.css']
})
export class RecommendedProductsComponent implements OnInit, AfterViewInit, OnDestroy {
  private homeService = inject(HomeService);
  private productService = inject(ProductService);
  private relatedProductsService = inject(RelatedProductsService);
  private cacheService = inject(CacheService);
  private cdr = inject(ChangeDetectorRef);
  private platformId = inject(PLATFORM_ID);

  @ViewChild('splideEl') splideEl?: ElementRef<HTMLElement>;

  products: any[] = [];
  loading: boolean = true;
  error: string | null = null;
  
  private splide?: Splide;
  private initialBatchSize: number = 7; // Show 7 products initially
  private maxProducts: number = 12; // Maximum number of products to show
  private readonly CACHE_TTL = 3600000; // 1 hour cache
  private readonly LS_RECOMMENDED_PRODUCTS_KEY = 'recommended_products_cache';
  private isLoadingMore: boolean = false;

  ngOnInit(): void {
    this.loadRecommendedProducts();
  }

  ngAfterViewInit(): void {
    // Only initialize Splide in browser environment
    if (isPlatformBrowser(this.platformId) && this.products.length > 0 && !this.splide) {
      setTimeout(() => this.initSplide(), 100);
    }
  }

  ngOnDestroy(): void {
    if (isPlatformBrowser(this.platformId) && this.splide) {
      this.splide.destroy();
    }
  }

  private initSplide(): void {
    // Only initialize Splide in browser environment
    if (!isPlatformBrowser(this.platformId) || !this.splideEl || this.products.length === 0) {
      return;
    }
    
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
        label: 'Recommended Products',
        padding: { left: 0, right: 0 },
        trimSpace: true,
        updateOnMove: true,
        arrowPath: 'm15.5 0.932-4.3 4.38 14.5 14.6-14.5 14.5 4.3 4.4 14.6-14.6 4.4-4.3-4.4-4.4-14.6-14.6z',
        breakpoints: {
          640: {
            perPage: 2,
            padding: { left: 0, right: 0 },
            arrows: false,
            width: '100%',
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

  loadRecommendedProducts(): void {
    this.loading = true;
    
    // Try to load from cache first
    this.tryLoadFromCache();
  }

  private tryLoadFromCache(): void {
    // Skip cache on server side
    if (isPlatformServer(this.platformId)) {
      this.loadSmartRecommendationsInPhases();
      return;
    }
    
    // Try to get from memory cache first
    const cacheKey = 'recommended_products';
    const cachedData = this.cacheService.get(cacheKey);
    
    if (cachedData) {
      // If we have data in memory cache, use it
      cachedData.pipe(take(1)).subscribe({
        next: (products: any[]) => {
          if (products && products.length > 0) {
            this.products = products;
            this.loading = false;
            this.cdr.markForCheck();
            
            // Initialize carousel with cached products
            if (isPlatformBrowser(this.platformId)) {
              setTimeout(() => this.initSplide(), 100);
            }
          } else {
            this.tryLoadFromLocalStorage();
          }
        },
        error: () => this.tryLoadFromLocalStorage()
      });
    } else {
      this.tryLoadFromLocalStorage();
    }
  }
  
  private tryLoadFromLocalStorage(): void {
    // Try to get from localStorage if in browser
    if (isPlatformBrowser(this.platformId)) {
      try {
        const storedData = localStorage.getItem(this.LS_RECOMMENDED_PRODUCTS_KEY);
        if (storedData) {
          const data = JSON.parse(storedData);
          if (data && data.timestamp && (Date.now() - data.timestamp < this.CACHE_TTL) && 
              data.products && data.products.length > 0) {
            // Store in memory cache also
            this.cacheService.set('recommended_products', data.products, this.CACHE_TTL);
            
            // Use the data
            this.products = data.products;
            this.loading = false;
            this.cdr.markForCheck();
            
            // Initialize carousel with cached products
            setTimeout(() => this.initSplide(), 100);
            return;
          }
        }
      } catch (error) {
        console.error('Error loading cached recommended products:', error);
      }
    }
    
    // If we get here, no cache was found or it was invalid
    this.loadSmartRecommendationsInPhases();
  }

  private saveToCache(products: any[]): void {
    if (!products || products.length === 0) {
      return;
    }
    
    // Save to memory cache
    const cacheKey = 'recommended_products';
    this.cacheService.set(cacheKey, products, this.CACHE_TTL);
    
    // Save to localStorage if in browser
    if (isPlatformBrowser(this.platformId)) {
      try {
        localStorage.setItem(this.LS_RECOMMENDED_PRODUCTS_KEY, JSON.stringify({
          products,
          timestamp: Date.now()
        }));
      } catch (error) {
        console.error('Error saving recommended products to cache:', error);
      }
    }
  }

  private loadSmartRecommendationsInPhases(): void {
    // On server, only load the initial batch to improve performance
    const isServer = isPlatformServer(this.platformId);
    
    const popularIds = this.relatedProductsService.getMostCommonRelatedIds(10);
    const randomIds = this.relatedProductsService.getRandomRelatedIds(10);
    const combinedIds = [...new Set([...popularIds, ...randomIds])];

    if (combinedIds.length >= this.initialBatchSize) {
      // First, check which IDs are in stock
      this.relatedProductsService.getInStockProductIds(combinedIds, 24).subscribe({
        next: (inStockIds) => {
          if (inStockIds.length >= this.initialBatchSize) {
            // Load only initial batch first, then defer the rest
            this.loadInitialProductBatch(inStockIds);
          } else {
            this.loadFeaturedProductsInPhases();
          }
        },
        error: (error) => {
          console.error('Error getting in-stock product IDs:', error);
          this.loadFeaturedProductsInPhases();
        }
      });
    } else {
      this.loadFeaturedProductsInPhases();
    }
  }

  private loadInitialProductBatch(productIds: number[]): void {
    // Get only the first batch of products
    const initialIds = productIds.slice(0, this.initialBatchSize);
    
    // Use cacheObservable to handle caching
    const cacheKey = `products_by_ids_${initialIds.join('_')}`;
    
    this.cacheService.cacheObservable(
      cacheKey,
      this.productService.getProductsByIds(initialIds),
      this.CACHE_TTL
    ).subscribe({
      next: (initialProducts) => {
        this.products = initialProducts;
        this.saveToCache(initialProducts);
        this.loading = false;
        this.cdr.markForCheck();
        
        // Initialize carousel with initial products (browser only)
        if (isPlatformBrowser(this.platformId)) {
        setTimeout(() => this.initSplide(), 100);
        
          // Defer loading of remaining products (only in browser)
          if (productIds.length > this.initialBatchSize && !this.isLoadingMore) {
            this.isLoadingMore = true;
          setTimeout(() => {
            this.loadRemainingProductsDeferred(productIds);
          }, 2000); // Wait 2 seconds before loading more
          }
        }
      },
      error: (error) => {
        console.error('Error loading initial product batch:', error);
        this.loadFeaturedProductsInPhases();
      }
    });
  }

  private loadRemainingProductsDeferred(productIds: number[]): void {
    // Skip deferred loading on server side
    if (isPlatformServer(this.platformId)) {
      return;
    }
    
    // Get remaining products
    const remainingIds = productIds.slice(this.initialBatchSize, this.maxProducts);
    
    if (remainingIds.length === 0) {
      this.isLoadingMore = false;
      return;
    }
    
    console.log('Loading deferred products:', remainingIds.length);
    
    // Load the remaining products with caching
    const cacheKey = `products_by_ids_${remainingIds.join('_')}`;
    
    this.cacheService.cacheObservable(
      cacheKey,
      this.productService.getProductsByIds(remainingIds),
      this.CACHE_TTL
    ).subscribe({
      next: (moreProducts) => {
        // Filter out duplicates
        const existingIds = new Set(this.products.map(p => p.id));
        const uniqueNewProducts = moreProducts.filter((p: any) => !existingIds.has(p.id));
        
        if (uniqueNewProducts.length > 0) {
          const updatedProducts = [...this.products, ...uniqueNewProducts].slice(0, this.maxProducts);
          this.products = updatedProducts;
          this.saveToCache(updatedProducts);
          this.cdr.markForCheck();
          
          // Update the carousel
          if (this.splide) {
            this.splide.refresh();
          }
        }
        this.isLoadingMore = false;
      },
      error: (error) => {
        console.error('Error loading deferred products:', error);
        this.isLoadingMore = false;
      }
    });
  }

  private loadFeaturedProductsInPhases(): void {
    // Load first batch of featured products with caching
    this.homeService.getFeaturedProducts(1, this.initialBatchSize).subscribe({
      next: (featuredProducts: any) => {
        // Filter for in-stock products only
        const inStockFeaturedProducts = featuredProducts.filter((product: any) => 
          product.stock_status === 'instock' || 
          (product.variations?.length === 0 && (product.stock_quantity ?? 0) > 0)
        );
        
        this.products = inStockFeaturedProducts;
        this.saveToCache(inStockFeaturedProducts);
        this.loading = false;
        this.cdr.markForCheck();
        
        // Initialize carousel with initial products (browser only)
        if (isPlatformBrowser(this.platformId)) {
        setTimeout(() => this.initSplide(), 100);
        
          // Defer loading of more products (browser only)
          if (!this.isLoadingMore) {
            this.isLoadingMore = true;
        setTimeout(() => {
          this.loadMoreFeaturedProducts();
        }, 2000); // Wait 2 seconds before loading more
          }
        }
      },
      error: () => {
        this.error = 'Failed to load recommended products';
        this.loading = false;
        this.cdr.markForCheck();
      },
    });
  }

  private loadMoreFeaturedProducts(): void {
    // Skip on server side
    if (isPlatformServer(this.platformId)) {
      return;
    }
    
    // Calculate how many more products we need
    const neededProducts = this.maxProducts - this.products.length;
    if (neededProducts <= 0) {
      this.isLoadingMore = false;
      return;
    }
    
    // Load more featured products with pagination
    this.homeService.getFeaturedProducts(2, neededProducts + 4).subscribe({
      next: (moreProducts: any) => {
        // Filter for in-stock products and ones not already shown
        const existingIds = new Set(this.products.map(p => p.id));
        const newProducts = moreProducts
          .filter((product: any) => 
            (product.stock_status === 'instock' || 
            (product.variations?.length === 0 && (product.stock_quantity ?? 0) > 0)) &&
            !existingIds.has(product.id)
          );
        
        if (newProducts.length > 0) {
          const updatedProducts = [...this.products, ...newProducts].slice(0, this.maxProducts);
          this.products = updatedProducts;
          this.saveToCache(updatedProducts);
          this.cdr.markForCheck();
          
          // Update carousel
          if (this.splide) {
            this.splide.refresh();
          }
        }
        this.isLoadingMore = false;
      },
      error: () => {
        // Just silently fail - we already have some products
        console.error('Failed to load additional featured products');
        this.isLoadingMore = false;
      }
    });
  }
}