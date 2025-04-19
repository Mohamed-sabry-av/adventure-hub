import { Component, DestroyRef, input, OnInit } from '@angular/core';
import { ProductService } from '../../../../core/services/product.service';
import { ProductImagesComponent } from '../../components/product-images/product-images.component';
import { ProductInfoComponent } from '../../components/product-info/product-info.component';
import { RouterLink } from '@angular/router';
import { ProductDescComponent } from '../../components/product-desc/product-desc.component';
import { ProductRelatedComponent } from '../../components/product-related/product-related.component';
import { AppContainerComponent } from '../../../../shared/components/app-container/app-container.component';
import { SeoService } from '../../../../core/services/seo.service';
import { map, switchMap } from 'rxjs';
import { BreadcrumbComponent } from "../../../products/components/breadcrumb/breadcrumb.component";
import { HistoryPageComponent } from '../../../products/pages/History-page/history-page.component';
import { RecentProductsMiniComponent } from '../../../products/components/recent-products-mini/recent-products-mini.component';
import { CommonModule } from '@angular/common';

declare var _learnq: any; // تعريف متغير Klaviyo العام

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
    CommonModule
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
  selectedColor: string | null = null;
  isLoading: boolean = true;

  constructor(
    private productService: ProductService,
    private seoService: SeoService,
    private destroyRef: DestroyRef
  ) {}

  onSelectedColorChange(color: any | null) {
    this.selectedColor = color;

    if (typeof _learnq !== 'undefined' && color && this.productData) {
      _learnq.push(['track', 'Selected Color', {
        ProductID: this.productData.id,
        ProductName: this.productData.name,
        Color: color,
        Brand: this.productData.brand || 'Unknown',
        Categories: this.productData.categories?.map((cat: any) => cat.name) || []
      }]);
      console.log('Klaviyo: Selected Color tracked');
    }
  }

  ngOnInit() {
    this.isLoading= true;
    const subscription = this.productService
      .getProductById(Number(this.productId()))
      .pipe(
        switchMap((product: any) => {
          console.log('Product fetched:', product);
          return this.productService
            .getProductVariations(Number(this.productId()))
            .pipe(
              map((variations) => {
                console.log('Variations fetched:', variations);
                // Normalize product data
                const normalizedProduct = {
                  ...product,
                  variations: variations || [],
                  brand: product.attributes?.find((attr: any) => attr.name === 'Brand')?.options?.[0]?.name || product.brand || 'Unknown',
                  available_colors: [
                    ...new Set(
                      (variations || []).map((v: any) =>
                        v.attributes?.find((attr: any) => attr.name === 'Color')?.option
                      ).filter(Boolean)
                    )
                  ],
                  available_sizes: [
                    ...new Set(
                      (variations || []).map((v: any) =>
                        v.attributes?.find((attr: any) => attr.name === 'Size')?.option
                      ).filter(Boolean)
                    )
                  ]
                };
                return normalizedProduct;
              })
            );
        })
      )
      .subscribe({
        next: (response: any) => {
          this.productData = response;
          console.log('Final Product Data:', this.productData);
          this.schemaData = this.seoService.applySeoTags(this.productData, {
            title: this.productData?.name,
            description: this.productData?.short_description,
            image: this.productData?.images?.[0]?.src,
          });
          this.isLoading = false;

          // تتبع حدث Viewed Product بعد تحميل بيانات المنتج
          if (typeof _learnq !== 'undefined' && this.productData) {
            _learnq.push(['track', 'Viewed Product', {
              ProductID: this.productData.id,
              ProductName: this.productData.name,
              Price: this.productData.price,
              Brand: this.productData.brand || 'Unknown',
              Categories: this.productData.categories?.map((cat: any) => cat.name) || [],
              AvailableColors: this.productData.available_colors || [],
              AvailableSizes: this.productData.available_sizes || []
            }]);
            console.log('Klaviyo: Viewed Product tracked');
          }
        },
        error: (err) => {
          console.error('Error fetching product data:', err);
          this.productData = null;
          this.schemaData = this.seoService.applySeoTags(null, { title: 'Product Page' });
          this.isLoading = false;
        },
      });

    this.destroyRef.onDestroy(() => subscription.unsubscribe());
  }
}