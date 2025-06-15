import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  OnDestroy,
  inject,
  DestroyRef,
  TransferState,
  makeStateKey,
  ChangeDetectorRef,
  ViewChild,
  ElementRef,
  HostListener,
  PLATFORM_ID,
  Inject
} from '@angular/core';
import { ActivatedRoute, Router, NavigationEnd, RouterLink } from '@angular/router';
import { ProductService } from '../../../../core/services/product.service';
import { SeoService } from '../../../../core/services/seo.service';
import { filter, switchMap, of, EMPTY, map } from 'rxjs';
import { CommonModule, DOCUMENT, isPlatformBrowser } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ProductImagesComponent } from '../../components/product-images/product-images.component';
import { ProductInfoComponent } from '../../components/product-info/product-info.component';
import { ProductDescComponent } from '../../components/product-desc/product-desc.component';
import { ProductRelatedComponent } from '../../components/product-related/product-related.component';
import { BreadcrumbComponent } from '../../../products/components/breadcrumb/breadcrumb.component';
import { RecentProductsMiniComponent } from '../../../products/components/recent-products-mini/recent-products-mini.component';
import { RecentlyVisitedService } from '../../../../core/services/recently-visited.service';
import { RelatedProductsService } from '../../../../core/services/related-products.service';
import { DomSanitizer } from '@angular/platform-browser';
import { AttributeSelection } from '../../components/product-info/product-info.component';
import { catchError } from 'rxjs/operators';
import { AppContainerComponent } from '../../../../shared/components/app-container/app-container.component';
import { UIService } from '../../../../shared/services/ui.service';
import { KlaviyoTrackingService } from '../../../../shared/services/klaviyo-tracking.service';

const PRODUCT_DATA_KEY = makeStateKey<any>('product_data');
const PRODUCT_CACHE_PREFIX = 'product_';
const MAX_CACHED_PRODUCTS = 20; // Maximum number of products to cache
const CACHE_REGISTRY_KEY = 'product_cache_registry';

declare var _learnq: any;

@Component({
  selector: 'app-product-page',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    ProductImagesComponent,
    ProductInfoComponent,
    ProductDescComponent,
    ProductRelatedComponent,
    BreadcrumbComponent,
    RecentProductsMiniComponent,
    AppContainerComponent
  ],
  templateUrl: './product-page.component.html',
  styleUrls: ['./product-page.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductPageComponent implements OnInit, OnDestroy {
  productData: any;
  selectedColor: string | null = null;
  selectedVariation: any | null = null;
  isLoading: boolean = true;
  selectedColorVariation: any | null = null;
  nextProduct: any = null;
  previousProduct: any = null;
  isShareMenuOpen: boolean = false;
  private lastLoadedSlug: string | null = null;

  @ViewChild('shareContainer') shareContainer!: ElementRef;

  private destroyRef = inject(DestroyRef);
  private route = inject(ActivatedRoute);
  private productService = inject(ProductService);
  private seoService = inject(SeoService);
  private recentlyVisitedService = inject(RecentlyVisitedService);
  private relatedProductsService = inject(RelatedProductsService);
  private router = inject(Router);
  private document = inject(DOCUMENT);
  private transferState = inject(TransferState);
  private cdr = inject(ChangeDetectorRef);
  private platformId = inject(PLATFORM_ID);
  private klaviyoTracking = inject(KlaviyoTrackingService);

  ngOnInit() {
    // Force header to not be sticky on product pages
    if (isPlatformBrowser(this.platformId)) {
      document.documentElement.style.setProperty('--header-position', 'static');
      const headerEl = document.querySelector('.header-container');
      if (headerEl) {
        (headerEl as HTMLElement).style.position = 'static';
      }
    }
    
    // Listen for navigation events to reload product data
    this.router.events.pipe(
      filter((event) => event instanceof NavigationEnd),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(() => {
      const slug = this.route.snapshot.paramMap.get('slug');
      // Only reload if the slug changed to prevent duplicate calls
      if (slug && slug !== this.lastLoadedSlug) {
        this.loadProductData(slug);
      }
    });

    // Initial load
    const initialSlug = this.route.snapshot.paramMap.get('slug');
    if (initialSlug) {
      this.loadProductData(initialSlug);
    }
    
    // Clean expired cache entries on init
    if (isPlatformBrowser(this.platformId)) {
      this.cleanExpiredCacheEntries();
    }
  }

  ngOnDestroy() {
    // Reset header position when leaving product page
    if (isPlatformBrowser(this.platformId)) {
      document.documentElement.style.setProperty('--header-position', 'sticky');
    }
    // SEO service handles schema cleanup
  }

  // Clean expired cache entries
  private cleanExpiredCacheEntries() {
    try {
      // Get all localStorage keys
      const allKeys = Object.keys(localStorage);
      const now = Date.now();
      const productKeys = allKeys.filter(key => key.startsWith(PRODUCT_CACHE_PREFIX));
      
      // Remove expired entries
      productKeys.forEach(key => {
        try {
          const item = JSON.parse(localStorage.getItem(key) || '{}');
          if (item.expiry && item.expiry < now) {
            localStorage.removeItem(key);
          }
        } catch (e) {
          localStorage.removeItem(key); // Remove invalid entries
        }
      });
      
      // Update cache registry
      this.updateCacheRegistry();
    } catch (error) {
      // Silent fail if localStorage is not available
    }
  }
  
  // Update cache registry and enforce max cache size
  private updateCacheRegistry() {
    try {
      // Get all product keys
      const allKeys = Object.keys(localStorage);
      const productKeys = allKeys.filter(key => key.startsWith(PRODUCT_CACHE_PREFIX) && key !== CACHE_REGISTRY_KEY);
      
      // Create registry entries with timestamps
      const registry = productKeys.map(key => {
        try {
          const item = JSON.parse(localStorage.getItem(key) || '{}');
          return {
            key,
            expiry: item.expiry || 0,
            lastAccessed: item.lastAccessed || Date.now()
          };
        } catch (e) {
          return { key, expiry: 0, lastAccessed: 0 };
        }
      });
      
      // Sort by last accessed (most recent first)
      registry.sort((a, b) => b.lastAccessed - a.lastAccessed);
      
      // Remove oldest entries if we exceed the maximum
      if (registry.length > MAX_CACHED_PRODUCTS) {
        const toRemove = registry.slice(MAX_CACHED_PRODUCTS);
        toRemove.forEach(item => {
          localStorage.removeItem(item.key);
        });
      }
      
      // Save updated registry
      localStorage.setItem(CACHE_REGISTRY_KEY, JSON.stringify(registry.slice(0, MAX_CACHED_PRODUCTS)));
    } catch (error) {
      // Silent fail if localStorage is not available
    }
  }

  private loadProductData(slug: string) {
    // Skip loading if already loading this slug
    if (this.lastLoadedSlug === slug) {
      return;
    }

    this.lastLoadedSlug = slug;
    this.isLoading = true;
    this.productData = null;
    this.selectedVariation = null; // Reset selected variation
    this.selectedColor = null; // Reset selected color
    this.cdr.markForCheck();

    // Check if product data is in transfer state
    const cacheKey = `${PRODUCT_DATA_KEY.toString()}_${slug}`;
    const cachedProductData = this.transferState.get(makeStateKey(cacheKey), null);
    
    if (cachedProductData) {
      this.isLoading = false;
      this.processProductData(cachedProductData);
      return;
    }

    // Check localStorage cache first
    if (isPlatformBrowser(this.platformId)) {
      try {
        const localStorageKey = `${PRODUCT_CACHE_PREFIX}${slug}`;
        const localData = localStorage.getItem(localStorageKey);
        if (localData) {
          const parsedData = JSON.parse(localData);
          const expirationTime = parsedData.expiry || 0;
          
          // Use cached data if not expired (10 minutes cache)
          if (expirationTime > Date.now()) {
            // Update last accessed time
            parsedData.lastAccessed = Date.now();
            localStorage.setItem(localStorageKey, JSON.stringify(parsedData));
            
            this.isLoading = false;
            this.processProductData(parsedData.data);
            
            // Make an API call in the background to refresh data
            this.refreshProductDataInBackground(slug);
            
            // Update cache registry
            this.updateCacheRegistry();
            return;
          } else {
            // Remove expired data
            localStorage.removeItem(localStorageKey);
          }
        }
      } catch (error) {
        // Silent fail and continue with API call
      }
    }

    // Fetch product data
    this.productService.getProductBySlug(slug).pipe(
      catchError((error) => {
        this.handleError(`Error fetching product: ${error.message}`);
        return EMPTY;
      }),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe((response: any) => {
      this.isLoading = false;
      
      if (!response) {
        this.handleError('Product not found');
        return;
      }
      
      // Store in transfer state for SSR
      this.transferState.set(makeStateKey(cacheKey), response);
      
      // Store in localStorage with expiration (10 minutes)
      if (isPlatformBrowser(this.platformId)) {
        try {
          const localStorageKey = `${PRODUCT_CACHE_PREFIX}${slug}`;
          const dataToCache = {
            data: response,
            expiry: Date.now() + (10 * 60 * 1000), // 10 minutes
            lastAccessed: Date.now()
          };
          localStorage.setItem(localStorageKey, JSON.stringify(dataToCache));
          
          // Update cache registry
          this.updateCacheRegistry();
        } catch (error) {
          // Silent fail
        }
      }
      
      this.processProductData(response);
    });
  }
  
  // Refresh product data in the background without blocking UI
  private refreshProductDataInBackground(slug: string) {
    this.productService.getProductBySlug(slug).pipe(
      catchError(() => EMPTY),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe((response: any) => {
      if (response && isPlatformBrowser(this.platformId)) {
        try {
          const localStorageKey = `${PRODUCT_CACHE_PREFIX}${slug}`;
          const dataToCache = {
            data: response,
            expiry: Date.now() + (10 * 60 * 1000), // 10 minutes
            lastAccessed: Date.now()
          };
          localStorage.setItem(localStorageKey, JSON.stringify(dataToCache));
          
          // Update cache registry
          this.updateCacheRegistry();
          
          // Only update UI if it's the same product currently being viewed
          if (this.lastLoadedSlug === slug) {
            this.productData = response;
            this.nextProduct = response.next_product || null;
            this.previousProduct = response.previous_product || null;
            this.cdr.markForCheck();
          }
        } catch (error) {
          // Silent fail
        }
      }
    });
  }

  private processProductData(product: any) {
    // Set product data for UI components
    this.productData = product;
    
    // Set next and previous product data if available
    this.nextProduct = product.next_product || null;
    this.previousProduct = product.previous_product || null;

    this.cdr.markForCheck();
    
    // Apply SEO tags using Yoast data
    if (product) {
      // Use Yoast data for SEO (handled internally by seoService)
      this.seoService.applySeoTags(product);
      
      // Add to recently visited products
      this.recentlyVisitedService.addProduct(product);
      
      // Track product view in Klaviyo
      if (isPlatformBrowser(this.platformId)) {
        this.trackProductView(product);
      }
    }
  }

  private trackProductView(product: any) {
    if (!product) return;
    
    try {
      const productData = {
        Name: product.name,
        ProductID: product.id,
        Categories: product.categories?.map((cat: any) => cat.name) || [],
        ImageURL: product.images?.[0]?.src || '',
        URL: this.document.location.href,
        Brand: this.getBrandFromProduct(product),
        Price: parseFloat(product.price || '0'),
        CompareAtPrice: product.regular_price ? parseFloat(product.regular_price) : undefined
      };
      
      this.klaviyoTracking.trackEvent('Viewed Product', productData);
    } catch (e) {
      // Silent fail
    }
  }

  private getBrandFromProduct(product: any): string {
    return product?.attributes?.find((attr: any) => attr.name === 'Brand')
      ?.options?.[0]?.name || 'Adventures Hub';
  }

  private handleError(message: string) {
    // Error handling
    this.isLoading = false;
    this.cdr.markForCheck();
  }

  onSelectedColorChange(attr: AttributeSelection) {
    if (attr.name === 'Color' || attr.name === 'color') {
      this.selectedColor = attr.value;
    }
  }

  onVariationSelected(variation: any) {
    this.selectedVariation = variation;

    // Track variation selection in Klaviyo
    if (isPlatformBrowser(this.platformId)) {
      this.trackVariationSelection(variation);
    }
  }

  private trackVariationSelection(variation: any) {
    if (!variation || !this.productData) return;

    try {
      const variantName = Object.entries(variation.attributes || {})
        .map(([key, value]) => `${key}: ${value}`)
        .join(', ');

      const variantData = {
        Name: this.productData.name,
        ProductID: this.productData.id,
        VariantID: variation.id,
        VariantName: variantName,
        Price: parseFloat(variation.price || this.productData.price || '0'),
      };
      
      this.klaviyoTracking.trackEvent('Selected Product Variant', variantData);
    } catch (e) {
      // Silent fail
    }
  }

  formatPrice(price: string | number): string {
    if (!price) return '0';
    const numPrice = Number(String(price).replace(/[^0-9.-]+/g, ''));
    return numPrice.toLocaleString('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    });
  }

  // Navigate to another product by slug
  navigateToProduct(slug: string) {
    this.router.navigate(['/product', slug]);
  }

  // Close share menu when clicking outside

}
