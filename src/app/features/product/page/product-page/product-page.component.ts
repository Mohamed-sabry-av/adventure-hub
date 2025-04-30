import { Component, DestroyRef, input, OnInit, inject } from '@angular/core';
import { ProductService } from '../../../../core/services/product.service';
import { ProductImagesComponent } from '../../components/product-images/product-images.component';
import { ProductInfoComponent } from '../../components/product-info/product-info.component';
import { ProductDescComponent } from '../../components/product-desc/product-desc.component';
import { ProductRelatedComponent } from '../../components/product-related/product-related.component';
import { AppContainerComponent } from '../../../../shared/components/app-container/app-container.component';
import { SeoService } from '../../../../core/services/seo.service';
import { map, switchMap } from 'rxjs';
import { BreadcrumbComponent } from '../../../products/components/breadcrumb/breadcrumb.component';
import { RecentProductsMiniComponent } from '../../../products/components/recent-products-mini/recent-products-mini.component';
import { CommonModule } from '@angular/common';
import { DialogErrorComponent } from '../../../../shared/components/dialog-error/dialog-error.component';
import { RecentlyVisitedService } from '../../../../core/services/recently-visited.service';

declare var _learnq: any; // Declare Klaviyo global variable

@Component({
  selector: 'app-product-page',
  imports: [
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
  styleUrl: './product-page.component.css',
  host: { ngSkipHydration: '' },
  standalone: true,
})
export class ProductPageComponent implements OnInit {
  productId = input.required<string>();
  schemaData: any;
  productData: any;
  productDataForDesc: any;
  selectedColor: string | null = null;
  isLoading: boolean = true;

  private recentlyVisitedService = inject(RecentlyVisitedService);

  constructor(
    private productService: ProductService,
    private seoService: SeoService,
    private destroyRef: DestroyRef
  ) {}

  onSelectedColorChange(event: { name: string; value: string | null }) {
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

  ngOnInit() {
    this.isLoading = true;
    const subscription = this.productService
      .getProductById(Number(this.productId()))
      .pipe(
        switchMap((product: any) => {
          return this.productService
            .getProductVariations(Number(this.productId()))
            .pipe(
              map((variations) => {
                const normalizedProduct = {
                  ...product,
                  variations: variations || [],
                  brand:
                    product.attributes?.find(
                      (attr: any) => attr.name === 'Brand'
                    )?.options?.[0]?.name ||
                    product.brand ||
                    'Unknown',
                  available_colors: [
                    ...new Set(
                      (variations || [])
                        .map(
                          (v: any) =>
                            v.attributes?.find(
                              (attr: any) => attr.name === 'Color'
                            )?.option
                        )
                        .filter(Boolean)
                    ),
                  ],
                  available_sizes: [
                    ...new Set(
                      (variations || [])
                        .map(
                          (v: any) =>
                            v.attributes?.find(
                              (attr: any) => attr.name === 'Size'
                            )?.option
                        )
                        .filter(Boolean)
                    ),
                  ],
                };
                return normalizedProduct;
              })
            );
        })
      )
      .subscribe({
        next: (response: any) => {
          this.productData = response;
          this.productDataForDesc = {
            id: response.id,
            description: response.description,
            specifications: response.specifications,
            variations: response.variations || [],
            brand: response.brand || 'Unknown',
          };
          this.schemaData = this.seoService.applySeoTags(this.productData, {
            title: this.productData?.name,
            description: this.productData?.short_description,
            image: this.productData?.images?.[0]?.src,
          });
          this.isLoading = false;

          this.recentlyVisitedService.addProduct(this.productData);

          if (typeof _learnq !== 'undefined' && this.productData) {
            _learnq.push([
              'track',
              'Viewed Product',
              {
                ProductID: this.productData.id,
                ProductName: this.productData.name,
                Price: this.productData.price,
                Brand: this.productData.brand || 'Unknown',
                Categories:
                  this.productData.categories?.map((cat: any) => cat.name) ||
                  [],
                AvailableColors: this.productData.available_colors || [],
                AvailableSizes: this.productData.available_sizes || [],
              },
            ]);
          }
        },
        error: (err) => {
          console.error('Error fetching product data:', err);
          this.productData = null;
          this.schemaData = this.seoService.applySeoTags(null, {
            title: 'Product Page',
          });
          this.isLoading = false;
        },
      });

    this.destroyRef.onDestroy(() => subscription.unsubscribe());
  }
}