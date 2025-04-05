import { Component, EventEmitter, inject, input, Output } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { CartService } from '../../../cart/service/cart.service';

@Component({
  selector: 'app-product-info',
  imports: [RouterLink, ReactiveFormsModule],
  templateUrl: './product-info.component.html',
  styleUrls: ['./product-info.component.css'],
  standalone: true,
})
export class ProductInfoComponent {
  productInfo = input<any>();
  images: string[] = ['slider/1.webp', 'slider/2.webp'];
  maxLength: number = 10;
  quantity: number = 1;
  selectedColor: string | null = null;
  selectedSize: string | null = null;

  @Output() selectedColorChange = new EventEmitter<string | null>(); // Output جديد

  constructor(private cartService: CartService) {}

  ngOnInit() {
    if (this.productInfo()) {
      console.log('Product Info in ngOnInit:', this.productInfo());
      console.log('Variations:', this.productInfo()?.variations);
      console.log('Color Options:', this.getColorOptions());
      if (this.getColorOptions().length > 0) {
        this.selectedColor = this.getColorOptions()[0].color;
      }
    }
  }

  onQuantityUp() {
    if (this.quantity < this.maxLength) {
      this.quantity++;
    }
  }

  onQuantityDown() {
    if (this.quantity > 1) {
      this.quantity--;
    }
  }

  get productSku() {
    const shortTitle =
      this.productInfo()?.name?.split(' ').slice(0, 2).join('') || '';
    const sku = this.productInfo()?.sku || '';
    return { shortTitle, sku };
  }

  get brandName() {
    return this.productInfo()?.attributes?.[0]?.options?.[0]?.name || 'brand';
  }

  get brandSlug() {
    return this.productInfo()?.attributes?.[0]?.options?.[0]?.slug || 'brand';
  }

  getColorOptions(): { color: string; image: string; inStock: boolean }[] {
    const variations = this.productInfo()?.variations || [];
    if (!Array.isArray(variations) || !variations.length) {
      return [];
    }

    const colorMap = new Map<string, { image: string; inStock: boolean }>();
    variations.forEach((v: any) => {
      const colorAttr = v.attributes?.find(
        (attr: any) => attr?.name === 'Color'
      );
      if (colorAttr && v.image?.src) {
        if (!colorMap.has(colorAttr.option)) {
          const isInStock = variations.some(
            (variation: any) =>
              variation.attributes?.some(
                (attr: any) =>
                  attr?.name === 'Color' && attr?.option === colorAttr.option
              ) && variation.stock_status === 'instock'
          );
          colorMap.set(colorAttr.option, {
            image: v.image.src,
            inStock: isInStock,
          });
        }
      }
    });

    return Array.from(colorMap, ([color, data]) => ({
      color,
      image: data.image,
      inStock: data.inStock,
    }));
  }

  getSizesForColor(color: string | null): { size: string; inStock: boolean }[] {
    const variations = this.productInfo()?.variations || [];
    if (!Array.isArray(variations) || !variations.length || !color) {
      return [];
    }

    const sizes = variations
      .filter((v: any) =>
        v.attributes?.some(
          (attr: any) => attr?.name === 'Color' && attr?.option === color
        )
      )
      .map((v: any) => {
        const sizeAttr = v.attributes?.find(
          (attr: any) => attr?.name === 'Size'
        );
        return {
          size: sizeAttr?.option || '',
          inStock: v.stock_status === 'instock',
        };
      })
      .filter((item) => item.size);

    return Array.from(new Map(sizes.map((item) => [item.size, item])).values());
  }

  selectColor(color: string): void {
    this.selectedColor = color;
    this.selectedSize = null;
    this.selectedColorChange.emit(color);
  }

  selectSize(size: string): void {
    this.selectedSize = size;
  }

  getSelectedPrice(): string {
    const variations = this.productInfo()?.variations || [];
    if (
      !Array.isArray(variations) ||
      !variations.length ||
      !this.selectedColor
    ) {
      return this.productInfo()?.price || '425.00'; // السعر الافتراضي لو مفيش لون مختار
    }

    // لو فيه مقاس مختار، جيب السعر بتاع الـ variation اللي بتطابق اللون والمقاس
    if (this.selectedSize) {
      const selectedVariation = variations.find(
        (v: any) =>
          v.attributes?.some(
            (attr: any) =>
              attr?.name === 'Color' && attr?.option === this.selectedColor
          ) &&
          v.attributes?.some(
            (attr: any) =>
              attr?.name === 'Size' && attr?.option === this.selectedSize
          )
      );
      return selectedVariation?.price || this.productInfo()?.price || '425.00';
    }

    // لو مفيش مقاس مختار، جيب سعر أول variation للون المختار
    const firstVariationForColor = variations.find((v: any) =>
      v.attributes?.some(
        (attr: any) =>
          attr?.name === 'Color' && attr?.option === this.selectedColor
      )
    );
    return (
      firstVariationForColor?.price || this.productInfo()?.price || '425.00'
    );
  }

  onAddProductToCart() {
    this.cartService.addProductToCart(this.productInfo());
  }
}
