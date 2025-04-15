import { Component, EventEmitter, input, Output } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-product-info',
  imports: [CommonModule, RouterLink, ReactiveFormsModule],
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

  @Output() selectedColorChange = new EventEmitter<string | null>();

  ngOnInit() {
    if (this.productInfo()) {
      console.log('Product Info in ngOnInit:', this.productInfo());
      console.log('Variations:', this.productInfo()?.variations);
      console.log('Color Options:', this.getColorOptions());
      if (this.getColorOptions().length > 0) {
        this.selectedColor = this.getColorOptions()[0].color;
        this.selectedColorChange.emit(this.selectedColor);
      }

      // Set initial quantity to 1 and maxLength to available stock
      this.quantity = 1;
      this.updateMaxLength();
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

  // Update maxLength based on current selection
  updateMaxLength() {
    if (!this.selectedColor || !this.selectedSize) {
      // If no color or size selected yet, use default product stock
      this.maxLength = this.productInfo()?.stock_quantity || 10;
      return;
    }

    // Find the selected variation
    const selectedVariation = this.getSelectedVariation();
    if (selectedVariation) {
      this.maxLength = selectedVariation.stock_quantity || 0;
    } else {
      this.maxLength = 0;
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
    this.updateMaxLength();
  }

  selectSize(size: string): void {
    this.selectedSize = size;
    this.updateMaxLength();
    // Reset quantity to 1 when size changes
    this.quantity = 1;
  }

  getSelectedVariation() {
    const variations = this.productInfo()?.variations || [];
    if (!Array.isArray(variations) || !variations.length || !this.selectedColor || !this.selectedSize) {
      return null;
    }

    return variations.find(
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
  }

  get isProductInStock(): boolean {
    // If no selection has been made, check the default product stock
    if (!this.selectedColor || !this.selectedSize) {
      return this.productInfo()?.stock_status === 'instock';
    }

    // Check if the selected variation is in stock
    const selectedVariation = this.getSelectedVariation();
    return selectedVariation?.stock_status === 'instock' && this.maxLength > 0;
  }

  getSelectedPrice(): string {
    const variations = this.productInfo()?.variations || [];
    if (!Array.isArray(variations) || !variations.length || !this.selectedColor) {
      return this.productInfo()?.price;
    }

    if (this.selectedSize) {
      const selectedVariation = this.getSelectedVariation();
      return selectedVariation?.price || this.productInfo()?.price;
    }

    // If no size selected, get price of first variation with selected color
    const firstVariationForColor = variations.find((v: any) =>
      v.attributes?.some(
        (attr: any) =>
          attr?.name === 'Color' && attr?.option === this.selectedColor
      )
    );
    return firstVariationForColor?.price || this.productInfo()?.price;
  }

  addToCart(): void {
    // Implementation would go here in a real app
    console.log('Product added to cart');
  }

  buyNow(): void {
    // Implementation would go here in a real app
    console.log('Buy now with pay clicked');
  }

  showMoreOptions(): void {
    // Implementation would go here in a real app
    console.log('Show more payment options clicked');
  }

  parseFloatValue(value: any): number {
    return parseFloat(value);
  }
}
