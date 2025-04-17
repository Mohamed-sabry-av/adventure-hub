import { Component, EventEmitter, input, Output } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { CartService } from '../../../cart/service/cart.service';

declare var _learnq: any;

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

  constructor(private cartService:CartService){}

  ngOnInit() {
    if (this.productInfo()) {
      console.log('Product Info in ngOnInit:', this.productInfo());
      console.log('Variations:', this.productInfo()?.variations);
      console.log('Color Options:', this.getColorOptions());
      if (this.getColorOptions().length > 0) {
        this.selectedColor = this.getColorOptions()[0].color;
        this.selectedColorChange.emit(this.selectedColor);
      }

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

  updateMaxLength() {
    if (!this.selectedColor || !this.selectedSize) {
      this.maxLength = this.productInfo()?.stock_quantity || 10;
      return;
    }

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
    if (!this.selectedColor || !this.selectedSize) {
      return this.productInfo()?.stock_status === 'instock';
    }

    const selectedVariation = this.getSelectedVariation();
    return selectedVariation?.stock_status === 'instock' && this.maxLength > 0;
  }

  getSelectedPrice(): string {
    const variations = this.productInfo()?.variations || [];
    if (!Array.isArray(variations) || !variations.length || !this.selectedColor) {
      return this.productInfo()?.price || '';
    }

    if (this.selectedSize) {
      const selectedVariation = this.getSelectedVariation();
      return selectedVariation?.price || this.productInfo()?.price || '';
    }

    const firstVariationForColor = variations.find((v: any) =>
      v.attributes?.some(
        (attr: any) =>
          attr?.name === 'Color' && attr?.option === this.selectedColor
      )
    );
    return firstVariationForColor?.price || this.productInfo()?.price || '';
  }

  // New method to determine if the product is on sale
  isOnSale(): boolean {
    const product = this.productInfo();
    if (!product) return false;

    // Check base product sale status
    if (!this.selectedColor && !this.selectedSize) {
      return (
        product.onsale === true &&
        product.price !== product.regular_price &&
        parseFloat(product.price) < parseFloat(product.regular_price)
      );
    }

    // Check variation sale status
    const variations = product.variations || [];
    if (!Array.isArray(variations) || !variations.length || !this.selectedColor) {
      return (
        product.onsale === true &&
        product.price !== product.regular_price &&
        parseFloat(product.price) < parseFloat(product.regular_price)
      );
    }

    if (this.selectedSize) {
      const selectedVariation = this.getSelectedVariation();
      return (
        selectedVariation?.onsale === true &&
        selectedVariation?.price !== selectedVariation?.regular_price &&
        parseFloat(selectedVariation?.price) < parseFloat(selectedVariation?.regular_price)
      );
    }

    // Check if any variation for the selected color is on sale
    const firstVariationForColor = variations.find((v: any) =>
      v.attributes?.some(
        (attr: any) =>
          attr?.name === 'Color' && attr?.option === this.selectedColor
      )
    );
    return (
      firstVariationForColor?.onsale === true &&
      firstVariationForColor?.price !== firstVariationForColor?.regular_price &&
      parseFloat(firstVariationForColor?.price) < parseFloat(firstVariationForColor?.regular_price)
    );
  }

  addToCart(): void {
    const product = this.productInfo();
    if (!product) {
      console.error('No product info available');
      return;
    }
  
    // Use the base product like ProductCardComponent
    let cartProduct: any = { ...product, quantity: this.quantity };
  
    // Handle variations for price, stock status, and tracking
    let variationId: number | undefined;
    const selectedVariation = this.getSelectedVariation();
    if (selectedVariation && this.selectedColor && this.selectedSize) {
      variationId = selectedVariation.id;
      cartProduct.price = selectedVariation.price || cartProduct.price;
      cartProduct.stock_status = selectedVariation.stock_status || cartProduct.stock_status;
    }
  
    // Validate stock status before adding
    if (cartProduct.stock_status !== 'instock') {
      console.error('Cannot add to cart: Product or variation is out of stock');
      return;
    }
  
    // Call CartService to add the product
    console.log('addToCart triggered, cartService:', this.cartService);
    if (!this.cartService) {
      console.error('CartService is not initialized');
      return;
    }
    this.cartService.addProductToCart(cartProduct);
    console.log('Product added to cart:', cartProduct);
  
    // Track with Klaviyo
    if (typeof _learnq !== 'undefined') {
      _learnq.push([
        'track',
        'Added to Cart',
        {
          ProductID: cartProduct.id,
          ProductName: cartProduct.name,
          Price: cartProduct.price,
          VariationID: variationId || null,
          Color: this.selectedColor || null,
          Size: this.selectedSize || null,
          Brand: this.brandName || '',
          Categories: product.categories?.map((cat: any) => cat.name) || [],
        },
      ]);
      console.log('Klaviyo: Added to Cart tracked');
    }
  }
    buyNow(): void {
    console.log('Buy now with pay clicked');
  }

  showMoreOptions(): void {
    console.log('Show more payment options clicked');
  }

  parseFloatValue(value: any): number {
    return parseFloat(value);
  }
}