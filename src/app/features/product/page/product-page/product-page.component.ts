import { Component, DestroyRef, inject, input, OnInit } from '@angular/core';
import { ProductService } from '../../../../core/services/product.service';
import { ProductImagesComponent } from '../../components/product-images/product-images.component';
import { ProductInfoComponent } from '../../components/product-info/product-info.component';
import { RouterLink } from '@angular/router';
import { ProductDescComponent } from '../../components/product-desc/product-desc.component';
import { ProductRelatedComponent } from '../../components/product-related/product-related.component';
import { AppContainerComponent } from '../../../../shared/components/app-container/app-container.component';
import { map, switchMap } from 'rxjs';
import { BreadcrumbComponent } from "../../../products/components/breadcrumb/breadcrumb.component";

@Component({
  selector: 'app-product-page',
  imports: [
    ProductImagesComponent,
    ProductInfoComponent,
    RouterLink,
    ProductDescComponent,
    ProductRelatedComponent,
    AppContainerComponent,
    BreadcrumbComponent
],
  templateUrl: './product-page.component.html',
  styleUrl: './product-page.component.css',
  host: { ngSkipHydration: '' },
  standalone: true
})
export class ProductPageComponent implements OnInit {
  private productService = inject(ProductService);
  private destroyRef = inject(DestroyRef);
  productId = input.required();

  productData: any;
  selectedColor: string | null = null;

  onSelectedColorChange(color: string | null) {
    this.selectedColor = color;
  }

  ngOnInit() {
    const subscription = this.productService
      .getProductById(Number(this.productId()))
      .pipe(
        switchMap((product: any) => {
          console.log('Product fetched:', product);
          return this.productService.getProductVariations(Number(this.productId())).pipe(
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
      .subscribe((response: any) => {
        this.productData = response;
        console.log('Final Product Data:', this.productData);
      });
    this.destroyRef.onDestroy(() => subscription.unsubscribe());
  }
  
}
