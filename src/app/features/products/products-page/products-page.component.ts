import { CommonModule } from '@angular/common';
import { Component, OnInit, Renderer2 } from '@angular/core';
import { ProductService } from '../../../core/services/product.service';
import { Observable, of } from 'rxjs';
import { catchError, map, switchMap, startWith } from 'rxjs/operators';
import { Product, Variation } from '../../../interfaces/product';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { SlickCarouselModule } from 'ngx-slick-carousel';
import { ProductImageSliderComponent } from '../proudct-image-slider/product-image-slider.component';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

@Component({
  selector: 'app-products-page',
  standalone: true,
  imports: [
    CommonModule,
    SlickCarouselModule,
    ProductImageSliderComponent,
    RouterLink,
  ],
  templateUrl: './products-page.component.html',
  styleUrls: ['./products-page.component.css'],
})
export class ProductsPageComponent {
  product$: Observable<{
    product: Product | null;
    variations: Variation[];
    isLoading: boolean;
  }> = of({
    product: null,
    variations: [],
    isLoading: true,
  });
  variations: Variation[] = [];
  sanitizedDescription: SafeHtml = '';
  selectedColor: string | null | any = null;

  selectedTab = 0;

  tabs = [
    { title: 'Description', content: 'This is the product description...' },
    {
      title: 'Additional information',
      content: 'Product specifications details...',
    },
    { title: 'Reviews', content: 'User reviews go here...' },
    { title: 'FAQ', content: 'Frequently Asked Questions...' },
  ];

  constructor(
    private route: ActivatedRoute,
    private productService: ProductService,
    private sanitizer: DomSanitizer
  ) {}

  ngOnInit() {
    this.loadProduct();
  }

  private loadProduct() {
    this.product$ = this.route.paramMap.pipe(
      switchMap((params) => this.fetchProductById(params.get('id')))
    );
  }

  // هنجيب ال product
  private fetchProductById(id: string | null): Observable<{
    product: Product | null;
    variations: Variation[];
    isLoading: boolean;
  }> {
    const productId = Number(id);
    if (!productId) {
      console.error('No product ID provided in route');
      return of({ product: null, variations: [], isLoading: false });
    }

    return this.productService.getProductById(productId).pipe(
      switchMap((product) => {
        return this.productService.getProductVariations(productId).pipe(
          map((variations) => {
            this.variations = variations || [];
            console.log(
              'Loaded Product:',
              product,
              'Variations:',
              this.variations
            );

            if (this.getColorOptions().length > 0) {
              //اللون الافتراضي لو مفيش اختيار للالوان
              this.selectedColor = this.getColorOptions()[0].color;
            }

            return { product, variations: this.variations, isLoading: false };
          })
        );
      }),
      catchError((error) => {
        console.log('Error loading product or variations', error);
        return of({ product: null, variations: [], isLoading: false });
      }),
      startWith({ product: null, variations: [], isLoading: true })
    );
  }

  getColorOptions(): {
    color: string;
    image: string;
    inStock: boolean;
  }[] {
    const colorMap = new Map<string, { image: string; inStock: boolean }>();
    this.variations.forEach((v) => {
      const colorAttr = v.attributes.find((attr: any) => attr.name === 'Color');
      if (colorAttr && v.image?.src) {
        if (!colorMap.has(colorAttr.option)) {
          colorMap.set(colorAttr.option, {
            image: v.image.src,
            inStock: v.stock_status === 'instock',
          });
        }
      }
    });
    const options = Array.from(colorMap, ([color, data]) => ({
      color,
      image: data.image,
      inStock: data.inStock,
    }));
    return options.length > 1 ? options : [];
  }

  getSizesForColor(color: string): { size: string; inStock: boolean }[] {
    let sizes: { size: string; inStock: boolean }[] = [];

    if (!color && this.getColorOptions().length === 0) {
      sizes = this.variations
        .map((v) => {
          const sizeAttr = v.attributes.find(
            (attr: any) => attr.name === 'Size'
          );
          return {
            size: sizeAttr?.option || '',
            inStock: v.stock_status === 'instock',
          };
        })
        .filter((item) => item.size);
    } else {
      sizes = this.variations
        .filter((v) =>
          v.attributes.some(
            (attr: any) => attr.name === 'Color' && attr.option === color
          )
        )
        .map((v) => {
          const sizeAttr = v.attributes.find(
            (attr: any) => attr.name === 'Size'
          );
          return {
            size: sizeAttr?.option || '',
            inStock: v.stock_status === 'instock',
          };
        })
        .filter((item) => item.size);
    }
    return Array.from(new Map(sizes.map((item) => [item.size, item])).values());
  }

  // فانكشن بتجيب الصور الخاصة بكل لون
  getGalleryImagesForSelectedColor(data: {
    product: Product | null;
    variations: Variation[];
  }): string[] {
    if (this.selectedColor) {
      const variation = data.variations.find((v) =>
        v.attributes.some(
          (attr: any) =>
            attr.name === 'Color' && attr.option === this.selectedColor
        )
      );
      if (variation) {
        const galleryMeta = variation.meta_data?.find(
          (meta) => meta.key === 'gallery_images'
        );
        const galleryImages = galleryMeta?.value || [];

        return [variation.image?.src, ...galleryImages];
      }
      return [];
    } else {
      return data.product?.images.map((img) => img.src) || [];
    }
  }

  selectColor(color: string): void {
    this.selectedColor = color;
  }

  sanitizeDescription(description: string) {
    return this.sanitizer.bypassSecurityTrustHtml(
      description.replace(/(<br\s*\/?>\s*)+/g, '<br>')
    );
  }
}
