import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  OnDestroy,
  inject,
  DestroyRef,
  TransferState,
  makeStateKey,
  ChangeDetectorRef
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
  // changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductPageComponent implements OnInit, OnDestroy {
  productData: any;
  productDataForDesc: any;
  selectedColor: string | null = null;
  selectedVariation: any | null = null;
  isLoading: boolean = true;
  selectedColorVariation: any | null = null;

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
      this.loadProductData();
    });

    this.loadProductData();
  }

  ngOnDestroy() {
    // SEO service handles schema cleanup
  }

  private loadProductData() {
    // Reset state before loading
    this.isLoading = true;
    this.productData = null;
    this.productDataForDesc = null;

    // Get slug from URL
    const slug = this.route.snapshot.paramMap.get('slug');
    if (!slug) {
      this.handleError('Product slug not found');
      return;
    }

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

    this.cdr.detectChanges();
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
    if (typeof _learnq !== 'undefined' && product) {
      try {
        _learnq.push(['track', 'Viewed Product', {
          ProductID: product.id,
          ProductName: product.name,
          Price: product.price,
          Brand: this.getBrandFromProduct(product),
          Categories: product.categories?.map((cat: any) => cat.name) || [],
          ImageURL: product.images?.[0]?.src,
          ProductURL: window.location.href
        }]);
      } catch (error) {
        console.error('Error tracking product view in Klaviyo:', error);
      }
    }
  }

  private getBrandFromProduct(product: any): string {
    return product?.attributes?.find((attr: any) => attr.name === 'Brand')
      ?.options?.[0]?.name || 'Adventures Hub';
  }

  private handleError(message: string) {
    console.error(message);
    this.isLoading = false;
    this.productData = null;
    this.productDataForDesc = null;
    
    // Set up 404 SEO
    this.seoService.applySeoTags(null, {
      title: 'Product Not Found',
      robots: 'noindex, nofollow'
    });
    
    // Navigate to home page or 404 page
    this.router.navigate(['/page-not-found']);
  }

  onSelectedColorChange(event: AttributeSelection) {
    this.selectedColor = event.value;
  }

  onVariationSelected(variation: any) {
    this.selectedVariation = variation;

    // Track variation selection in Klaviyo if available
    this.trackVariationSelection(variation);
  }

  private trackVariationSelection(variation: any) {
    if (typeof _learnq !== 'undefined' && this.productData && variation) {
      try {
        _learnq.push([
          'track',
          'Selected Variation',
          {
            ProductID: this.productData.id,
            ProductName: this.productData.name,
            VariationID: variation.id,
            Price: variation.price,
            Brand: this.getBrandFromProduct(this.productData),
            Categories: this.productData.categories?.map((cat: any) => cat.name) || [],
            Attributes: variation.attributes?.reduce((obj: any, attr: any) => {
              obj[attr.name] = attr.option;
              return obj;
            }, {}) || {},
          },
        ]);
      } catch (error) {
        console.error('Error tracking variation selection in Klaviyo:', error);
      }
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
}
