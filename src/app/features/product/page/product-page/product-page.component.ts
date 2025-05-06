import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  inject,
  OnDestroy,
} from '@angular/core';
import { ActivatedRoute, Router, NavigationEnd } from '@angular/router';
import { ProductService } from '../../../../core/services/product.service';
import { SeoService } from '../../../../core/services/seo.service';
import { map, of, switchMap, filter, takeUntil, Subject } from 'rxjs';
import { CommonModule, DOCUMENT } from '@angular/common';
import { ProductImagesComponent } from '../../components/product-images/product-images.component';
import { ProductInfoComponent } from '../../components/product-info/product-info.component';
import { ProductDescComponent } from '../../components/product-desc/product-desc.component';
import { ProductRelatedComponent } from '../../components/product-related/product-related.component';
import { AppContainerComponent } from '../../../../shared/components/app-container/app-container.component';
import { BreadcrumbComponent } from '../../../products/components/breadcrumb/breadcrumb.component';
import { RecentProductsMiniComponent } from '../../../products/components/recent-products-mini/recent-products-mini.component';
import { DialogErrorComponent } from '../../../../shared/components/dialog-error/dialog-error.component';
import { RecentlyVisitedService } from '../../../../core/services/recently-visited.service';
import { RelatedProductsService } from '../../../../core/services/related-products.service';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

declare var _learnq: any;

@Component({
  selector: 'app-product-page',
  imports: [
    CommonModule,
    ProductImagesComponent,
    ProductInfoComponent,
    ProductDescComponent,
    ProductRelatedComponent,
    AppContainerComponent,
    BreadcrumbComponent,
    RecentProductsMiniComponent,
    DialogErrorComponent,
  ],
  templateUrl: './product-page.component.html',
  styleUrls: ['./product-page.component.css'],
  host: { ngSkipHydration: '' },
  standalone: true,
  // changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductPageComponent implements OnInit, OnDestroy {
  schemaData: SafeHtml | null = null;
  productData: any;
  productDataForDesc: any;
  selectedColor: string | null = null;
  selectedVariation: any | null = null;
  isLoading: boolean = true;
  selectedColorVariation: any | null = null;
  
  // للتأكد من إلغاء الاشتراكات عند تدمير المكون
  private destroy$ = new Subject<void>();
  
  private schemaScript: HTMLScriptElement | null = null;
  private route = inject(ActivatedRoute);
  private productService = inject(ProductService);
  private seoService = inject(SeoService);
  private recentlyVisitedService = inject(RecentlyVisitedService);
  private relatedProductsService = inject(RelatedProductsService);
  private router = inject(Router);
  private sanitizer = inject(DomSanitizer);
  private document = inject(DOCUMENT);

  ngOnInit() {
    this.router.events
      .pipe(
        filter((event) => event instanceof NavigationEnd),
        takeUntil(this.destroy$)
      )
      .subscribe(() => {
        this.loadProductData();
      });

    this.loadProductData();
  }

  ngOnDestroy() {
    if (this.schemaScript) {
      this.schemaScript.remove();
      this.schemaScript = null;
    }
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadProductData() {
    this.route.paramMap
      .pipe(
        takeUntil(this.destroy$),
        switchMap((params) => {
          const slug = params.get('slug');
          if (!slug) {
            this.router.navigate(['/']);
            return of(null);
          }

          this.isLoading = true;
          this.productData = null;
          this.schemaData = null;
          this.schemaScript = null;

          return this.productService.getProductBySlug(slug).pipe(
            map((product: any) => {
              if (!product) {
                this.router.navigate(['/']);
                return null;
              }
              return product;
            })
          );
        })
      )
      .subscribe({
        next: (response: any) => {
          this.isLoading = false;
          if (response) {
            this.productData = response;

            // Apply SEO tags
            const schemaData = this.seoService.applySeoTags(this.productData, {
              title: this.productData?.name,
              description: this.productData?.short_description,
              image: this.productData?.images?.[0]?.src,
            });

            // Add schema to <head>
            if (schemaData) {
              this.schemaScript = this.document.createElement('script');
              this.schemaScript.type = 'application/ld+json';
              this.schemaScript.text = schemaData.toString();
              this.document.head.appendChild(this.schemaScript);
            }
          } else {
            this.productData = null;
            this.seoService.applySeoTags(null, {
              title: 'Product Not Found',
            });
            this.seoService.metaService.updateTag({
              name: 'robots',
              content: 'noindex, nofollow',
            });
          }
        },
        error: (err) => {
          console.error('Error fetching product data:', err);
          this.isLoading = false;
          this.productData = null;
          this.seoService.applySeoTags(null, {
            title: 'Product Page Error',
          });
          this.seoService.metaService.updateTag({
            name: 'robots',
            content: 'noindex, nofollow',
          });
          this.router.navigate(['/']);
        },
      });
  }


  onSelectedColorChange(event: { name: string; value: any | null }) {
    if (event.name === 'Color') {
      this.selectedColor = event.value;
      if (typeof _learnq !== 'undefined' && event.value && this.productData) {
        _learnq.push([
          'track',
          'Selected Color',
          {
            ProductID: this.productData.id,
            ProductName: this.productData.name,
            Color: event.value,
            Brand: this.productData.brand || 'Unknown',
            Categories:
              this.productData.categories?.map((cat: any) => cat.name) || [],
          },
        ]);
      }

      if (event.value) {
        // ابحث عن أي variation ليها اللون ده
        const variation = this.productData.variations.find((v: any) =>
          v.attributes.some(
            (attr: any) =>
              attr.name === 'Color' &&
              attr.option.toLowerCase() === event.value.toLowerCase()
          )
        );

        if (variation) {
          this.productService
            .getVariationById(this.productData.id, variation.id)
            .subscribe({
              next: (fullVariation) => {
                this.selectedColorVariation = fullVariation;
              },
              error: (err) => {
                console.error('Error fetching variation:', err);
                this.selectedColorVariation = null;
              },
            });
        } else {
          this.selectedColorVariation = null;
        }
      } else {
        this.selectedColorVariation = null;
      }
    }
  }

  onVariationSelected(variation: any) {
    this.selectedVariation = variation;
    console.log('Selected variation:', variation);

    if (typeof _learnq !== 'undefined' && this.productData) {
      _learnq.push([
        'track',
        'Selected Variation',
        {
          ProductID: this.productData.id,
          ProductName: this.productData.name,
          VariationID: variation.id,
          Price: variation.price,
          Brand: this.productData.brand || 'Unknown',
          Categories: this.productData.categories?.map((cat: any) => cat.name) || [],
          Attributes: variation.attributes?.reduce((obj: any, attr: any) => {
            obj[attr.name] = attr.option;
            return obj;
          }, {}) || {},
        },
      ]);
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
