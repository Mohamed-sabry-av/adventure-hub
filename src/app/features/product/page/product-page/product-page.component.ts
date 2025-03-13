import { Component, DestroyRef, inject, input, OnInit } from '@angular/core';
import { ProductService } from '../../../../core/services/product.service';
import { ProductImagesComponent } from '../../components/product-images/product-images.component';
import { ProductInfoComponent } from '../../components/product-info/product-info.component';
import { RouterLink } from '@angular/router';
import { ProductDescComponent } from '../../components/product-desc/product-desc.component';
import { ProductRelatedComponent } from '../../components/product-related/product-related.component';

@Component({
  selector: 'app-product-page',
  imports: [
    ProductImagesComponent,
    ProductInfoComponent,
    RouterLink,
    ProductDescComponent,
    ProductRelatedComponent,
  ],
  templateUrl: './product-page.component.html',
  styleUrl: './product-page.component.css',
  host: { ngSkipHydration: '' },
})
export class ProductPageComponent implements OnInit {
  private productService = inject(ProductService);
  private destroyRef = inject(DestroyRef);
  productId = input.required();

  productData: any;

  ngOnInit() {
    const subscribtion = this.productService
      .getProductById(Number(this.productId()))
      .subscribe((response: any) => {
        this.productData = response;
      });

    this.destroyRef.onDestroy(() => subscribtion.unsubscribe());
  }
}
