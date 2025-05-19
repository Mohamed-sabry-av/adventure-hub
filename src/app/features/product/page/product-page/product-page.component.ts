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
  HostListener
} from '@angular/core';
import { ActivatedRoute, Router, NavigationEnd, RouterLink } from '@angular/router';
import { ProductService } from '../../../../core/services/product.service';
import { SeoService } from '../../../../core/services/seo.service';
import { filter, switchMap, of, EMPTY } from 'rxjs';
import { CommonModule, DOCUMENT } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ProductImagesComponent } from '../../components/product-images/product-images.component';
import { ProductInfoComponent } from '../../components/product-info/product-info.component';
import { ProductDescComponent } from '../../components/product-desc/product-desc.component';
import { ProductRelatedComponent } from '../../components/product-related/product-related.component';
import { BreadcrumbComponent } from '../../../products/components/breadcrumb/breadcrumb.component';
import { RecentProductsMiniComponent } from '../../../products/components/recent-products-mini/recent-products-mini.component';
import { DialogErrorComponent } from '../../../../shared/components/dialog-error/dialog-error.component';
import { RecentlyVisitedService } from '../../../../core/services/recently-visited.service';
import { RelatedProductsService } from '../../../../core/services/related-products.service';
import { DomSanitizer } from '@angular/platform-browser';
import { AttributeSelection } from '../../components/product-info/product-info.component';
import { catchError } from 'rxjs/operators';
import { AppContainerComponent } from '../../../../shared/components/app-container/app-container.component';

const PRODUCT_DATA_KEY = makeStateKey<any>('product_data');

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
    DialogErrorComponent,
    AppContainerComponent
  ],
  templateUrl: './product-page.component.html',
  styleUrls: ['./product-page.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductPageComponent implements OnInit, OnDestroy {
  productData: any;
  productDataForDesc: any;
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

  ngOnInit() {
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
  }

  ngOnDestroy() {
    // SEO service handles schema cleanup
  }

  private loadProductData(slug: string) {
    // Skip loading if already loading this slug
    if (this.lastLoadedSlug === slug) {
      return;
    }

    this.lastLoadedSlug = slug;
    this.isLoading = true;
    this.productData = null;
    this.productDataForDesc = null;
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
      this.processProductData(response);
    });
  }

  private processProductData(product: any) {
    // Set product data for UI components
    this.productData = product;
    
    // Set product description data (separate from SEO)
    this.productDataForDesc = {
      ...product,
      description: product.description,
      name: product.name
    };
    
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
      
      // Track product view in Klaviyo if available
      this.trackProductView(product);
    }
  }

  private trackProductView(product: any) {
    try {
      // Only run in browser context
      if (_learnq && product) {
        const currencyCode = product.currency || 'AED';
        const price = parseFloat(product.price);

        _learnq.push(['track', 'Viewed Product', {
          Name: product.name,
          ProductID: product.id,
          Categories: product.categories?.map((cat: any) => cat.name) || [],
          ImageURL: product.images?.[0]?.src || '',
          URL: this.document.location.href,
          Brand: this.getBrandFromProduct(product),
          Price: price,
          CompareAtPrice: product.regular_price
        }]);
      }
    } catch (e) {
      console.error('Error tracking product view:', e);
    }
  }

  private getBrandFromProduct(product: any): string {
    return product?.attributes?.find((attr: any) => attr.name === 'Brand')
      ?.options?.[0]?.name || 'Adventures Hub';
  }

  private handleError(message: string) {
    console.error(message);
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

    // Track variation selection in Klaviyo if available
    this.trackVariationSelection(variation);
  }

  private trackVariationSelection(variation: any) {
    if (!variation || !this.productData) return;

    try {
      if (_learnq) {
        const variantName = Object.entries(variation.attributes || {})
          .map(([key, value]) => `${key}: ${value}`)
          .join(', ');

        _learnq.push(['track', 'Selected Product Variant', {
          Name: this.productData.name,
          ProductID: this.productData.id,
          VariantID: variation.id,
          VariantName: variantName,
          Price: parseFloat(variation.price || this.productData.price),
        }]);
      }
    } catch (e) {
      console.error('Error tracking variation selection:', e);
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
