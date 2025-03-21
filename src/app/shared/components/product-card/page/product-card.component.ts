import { CommonModule } from '@angular/common';
import { Component, Input, OnInit } from '@angular/core';
import { ProductService } from '../../../../core/services/product.service';
import { Product, Variation } from '../../../../interfaces/product';
import { CardImageSliderComponent } from '../components/card-image-slider/card-image-slider.component';
import { CardDetailsComponent } from '../components/card-details/card-details.component';
import { ColorSwatchesComponent } from '../components/color-swatches/color-swatches.component';
import { SizeSelectorComponent } from '../components/size-selector/size-selector.component';

@Component({
  selector: 'app-product-card',
  standalone: true,
  imports: [
    CommonModule,
    CardImageSliderComponent,
    CardDetailsComponent,
    ColorSwatchesComponent,
    SizeSelectorComponent,
  ],
  templateUrl: './product-card.component.html',
  styleUrls: ['./product-card.component.css'],
})
export class ProductCardComponent implements OnInit {
  @Input() product!: Product;

  variations: Variation[] = [];
  colorOptions: { color: string; image: string; inStock: boolean }[] = [];
  uniqueSizes: { size: string; inStock: boolean }[] = [];
  selectedColor: string | null = null;
  currentSlide: number = 0;
  isHovered: boolean = false;
  selectedSize: string | null = null;
  sizeScrollIndex: number = 0;
  visibleSizes: { size: string; inStock: boolean }[] = [];
  maxScrollIndex: number = 0;

  constructor(private productService: ProductService) {}

  ngOnInit(): void {
    console.log('Product Data:', this.product);
    this.fetchVariations();
  }

  private fetchVariations(): void {
    this.productService.getProductVariations(this.product.id).subscribe({
      next: (variations: Variation[]) => {
        this.variations = variations || [];
        this.colorOptions = this.getColorOptions();
        if (this.colorOptions.length > 0) {
          this.selectColor(this.colorOptions[0].color, this.colorOptions[0].image);
        } else {
          this.uniqueSizes = this.getSizesForColor('');
          this.updateVisibleSizes();
        }
      },
      error: (error:any) => {
        console.error('خطأ في جلب الـ variations:', error);
      },
    });
  }

  private getColorOptions(): { color: string; image: string; inStock: boolean }[] {
    const colorMap = new Map<string, { image: string; inStock: boolean }>();
    this.variations.forEach((v) => {
      const colorAttr = v.attributes.find((attr: any) => attr.name === 'Color');
      if (colorAttr && v.image?.src) {
        const inStock = v.stock_status === 'instock';
        if (!colorMap.has(colorAttr.option) || inStock) {
          colorMap.set(colorAttr.option, { image: v.image.src, inStock });
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

  private getSizesForColor(color: string): { size: string; inStock: boolean }[] {
    const sizesMap = new Map<string, boolean>();
    const filteredVariations = color
      ? this.variations.filter((v) => v.attributes.some((attr: any) => attr.name === 'Color' && attr.option === color))
      : this.variations;
  
    filteredVariations.forEach((v) => {
      const sizeAttr = v.attributes.find((attr: any) => attr.name === 'Size');
      if (sizeAttr) {
        const inStock = v.stock_status === 'instock';
        if (!sizesMap.has(sizeAttr.option) || inStock) {
          sizesMap.set(sizeAttr.option, inStock);
        }
      }
    });
  
    const sizesArray = Array.from(sizesMap, ([size, inStock]) => ({ size, inStock }));
    return sizesArray.sort((a, b) => {
      if (a.inStock && !b.inStock) return -1; // المتاحة تيجي قبل الغير متاحة
      if (!a.inStock && b.inStock) return 1;  // الغير متاحة تيجي بعد المتاحة
      return 0; // لو الاثنين متاحين أو غير متاحين، يفضلوا زي ما هما
    });
  }

  selectColor(color: string, image: string): void {
    this.selectedColor = color;
    const selectedColorImages = this.variations
      .filter((v) => v.attributes.some((attr: any) => attr.name === 'Color' && attr.option === color))
      .map((v) => ({ src: v.image?.src || image }));

    if (selectedColorImages.length > 0) {
      this.product.images = selectedColorImages;
      this.currentSlide = 0;
    }
    this.uniqueSizes = this.getSizesForColor(color);
    this.selectedSize = null;
    this.updateVisibleSizes();
  }

  onHover(hovered: boolean): void {
    this.isHovered = hovered;
    if (this.colorOptions.length === 0 && this.product.images?.length > 1) {
      this.currentSlide = hovered ? 1 : 0;
    }
  }

  selectSize(size: string): void {
    this.selectedSize = size;
  }

  getBrandName(): string | null {
    const brandAttr = this.product?.attributes?.find((attr) => attr.name === 'Brand');
    if (brandAttr?.options?.length) {
      const option = brandAttr.options[0];
      return typeof option === 'string' ? option : option?.name || option.value || null;
    }
    return null;
  }

  getBrandSlug(): string | null {
    const brandAttr = this.product?.attributes?.find((attr) => attr.name === 'Brand'); // استخدم name بدل slug
    if (brandAttr?.options?.length) {
      const option = brandAttr.options[0];
      return typeof option === 'string' ? null : option?.slug || null; // جيب الـ slug من الـ option
    }
    return null;
  }

  goToSlide(index: number): void {
    if (this.product.images?.length > 0) {
      this.currentSlide = index;
    }
  }

  getDotCount(): number[] {
    return this.product?.images?.length ? Array.from({ length: this.product.images.length }, (_, i) => i) : [];
  }

  scrollSizes(direction: number): void {
    const sizesPerPage = 5;
    this.sizeScrollIndex = Math.max(0, Math.min(this.sizeScrollIndex + direction, this.maxScrollIndex));
    this.updateVisibleSizes();
  }

  private updateVisibleSizes(): void {
    const sizesPerPage = 5;
    this.maxScrollIndex = Math.ceil(this.uniqueSizes.length / sizesPerPage) - 1;
    const start = this.sizeScrollIndex * sizesPerPage;
    this.visibleSizes = this.uniqueSizes.slice(start, start + sizesPerPage);
  }

  onAddToCart(product: any): void {
    console.log('Product added to cart:', product);
  }
}