import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ProductService } from '../../../../core/services/product.service';
import { SeoService } from '../../../../core/services/seo.service';
import { RecentlyVisitedService } from '../../../../core/services/recently-visited.service';
import { map, switchMap } from 'rxjs';
import { CommonModule } from '@angular/common';
import { ProductImagesComponent } from '../../components/product-images/product-images.component';
import { ProductInfoComponent } from '../../components/product-info/product-info.component';
import { ProductDescComponent } from '../../components/product-desc/product-desc.component';
import { ProductRelatedComponent } from '../../components/product-related/product-related.component';
import { AppContainerComponent } from '../../../../shared/components/app-container/app-container.component';
import { BreadcrumbComponent } from '../../../products/components/breadcrumb/breadcrumb.component';
import { RecentProductsMiniComponent } from '../../../products/components/recent-products-mini/recent-products-mini.component';
import { DialogErrorComponent } from '../../../../shared/components/dialog-error/dialog-error.component';

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
  styleUrl: './product-page.component.css',
  host: { ngSkipHydration: '' },
  standalone: true,
})
export class ProductPageComponent implements OnInit {
  schemaData: any;
  productData: any;
  productDataForDesc: any;
  selectedColor: string | null = null;
  isLoading: boolean = true;

  private route = inject(ActivatedRoute);
  private productService = inject(ProductService);
  private seoService = inject(SeoService);
  private recentlyVisitedService = inject(RecentlyVisitedService);
  private router = inject(Router);

  ngOnInit() {
    this.route.paramMap
      .pipe(
        switchMap((params) => {
          const slug = params.get('slug'); 
          if (!slug) {
            this.router.navigate(['/']); // لو مفيش slug، رجّع للصفحة الرئيسية
            return [];
          }


          this.isLoading = true;
          this.productData = null; // Clear old data
          this.productDataForDesc = null;
          this.schemaData = null;
          return this.productService.getProductBySlug(slug).pipe(
            switchMap((product: any) =>
              this.productService.getProductVariations(product.id).pipe(
                map((variations) => ({
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
                }))
              )
            )
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
  }

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
}