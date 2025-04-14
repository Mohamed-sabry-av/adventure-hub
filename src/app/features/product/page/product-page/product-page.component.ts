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
import { RecentlyViewedComponent } from '../../components/recently-viewed/recently-viewed.component';
import { RecentlyViewedService } from '../../services/recently-viewed.service';

@Component({
  selector: 'app-product-page',
  imports: [
    ProductImagesComponent,
    ProductInfoComponent,
    RouterLink,
    ProductDescComponent,
    ProductRelatedComponent,
    AppContainerComponent,
    BreadcrumbComponent,
    RecentlyViewedComponent,
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

  constructor(
    private productService: ProductService,
    private seoService: SeoService,
    private recentlyViewedService: RecentlyViewedService,
    private destroyRef: DestroyRef
  ) {}

  onSelectedColorChange(color: string | null) {
    this.selectedColor = color;
  }

  ngOnInit() {
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
                return {
                  ...product,
                  variations: variations || [],
                };
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

          // Add product to recently viewed using the service
          this.recentlyViewedService.addProduct(this.productData);
        },
        error: (err) => {
          console.error('Error fetching product data:', err);
          this.productData = null;
          this.schemaData = this.seoService.applySeoTags(null, { title: 'Product Page' });
        },
      });

    this.destroyRef.onDestroy(() => subscription.unsubscribe());
  }
}
