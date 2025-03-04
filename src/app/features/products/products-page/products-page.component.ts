import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ProductService } from '../../../core/services/product.service';
import { Observable, of } from 'rxjs';
import { catchError, map, switchMap, startWith } from 'rxjs/operators';
import { Product, Variation } from '../../../interfaces/product';
import { ActivatedRoute } from '@angular/router';
import { NgxImageZoomModule } from 'ngx-image-zoom';
import { SlickCarouselModule } from 'ngx-slick-carousel';
import { ProductImageSliderComponent } from '../proudct-image-slider/product-image-slider.component';

@Component({
  selector: 'app-products-page',
  standalone: true,
  imports: [CommonModule, NgxImageZoomModule, SlickCarouselModule, ProductImageSliderComponent],
  templateUrl: './products-page.component.html',
  styleUrls: ['./products-page.component.css'],
})
export class ProductsPageComponent implements OnInit {
  product$: Observable<{ product: Product | null; isLoading: boolean }> = of({
    product: null,
    isLoading: true,
  });
  variations$: Observable<Variation[]> = of([]);
  selectedVariation: Variation | null = null;
  selectedImage: string = '';
  selectedSize: string = '';

  constructor(
    private route: ActivatedRoute,
    private productService: ProductService
  ) {}

  ngOnInit() {
    this.loadProduct();
  }

  private loadProduct() {
    this.product$ = this.route.paramMap.pipe(
      switchMap((params) => this.fetchProductById(params.get('id')))
    );
    this.variations$ = this.route.paramMap.pipe(
      switchMap((params) => this.fetchVariationsById(params.get('id')))
    );
  }

  private fetchProductById(id: string | null): Observable<{ product: Product | null; isLoading: boolean }> {
    const productId = Number(id);
    if (!productId) {
      console.error('No product ID provided in route');
      return of({ product: null, isLoading: false });
    }

    return this.productService.getProductById(productId).pipe(
      map((product) => {
        console.log('Loaded product:', product);
        this.selectedImage = product?.images[0]?.src || 'placeholder.jpg';
        return { product, isLoading: false };
      }),
      catchError((error) => {
        console.error('Failed to load product:', error);
        return of({ product: null, isLoading: false });
      }),
      startWith({ product: null, isLoading: true })
    );
  }

  private fetchVariationsById(id: string | null): Observable<Variation[]> {
    const productId = Number(id);
    if (!productId) {
      return of([]);
    }
    return this.productService.getProductVariations(productId).pipe(
      map((variations) => {
        console.log('Loaded variations:', variations);
        return variations;
      }),
      catchError((error) => {
        console.error('Failed to load variations:', error);
        return of([]);
      })
    );
  }

  selectVariation(variation: Variation) {
    this.selectedVariation = variation;
    this.selectedImage = variation.image.src;
    this.selectedSize = variation.attributes.find((attr:any) => attr.name.toLowerCase() === 'size')?.option || '';
  }

  addToCart() {
    console.log('Adding to cart:', {
      productId: this.product$,
      variationId: this.selectedVariation?.id,
      size: this.selectedSize,
    });
  }

  // دالة جديدة لجلب اللون بشكل آمن
  getVariationColor(variation: Variation): string {
    const colorAttr = variation.attributes.find((attr:any) => attr.name.toLowerCase() === 'color');
    return colorAttr?.option || 'Variation Image';
  }

  slideConfig = {
    slidesToShow: 1,
    slidesToScroll: 1,
    fade: true,
    speed: 500,
    cssEase: 'ease-in-out',
    arrows: true,
    dots: true,
  };
}