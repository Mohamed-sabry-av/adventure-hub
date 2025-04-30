import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  input,
  Output,
} from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { CartService } from '../../../cart/service/cart.service';
import { WishlistComponent } from '../../../auth/account-details/components/wishlist/wishlist.component';
import { WooCommerceAccountService } from '../../../auth/account-details/account-details.service';
import { Subscription } from 'rxjs';

declare var _learnq: any;

@Component({
  selector: 'app-product-info',
  imports: [CommonModule, RouterLink, ReactiveFormsModule],
  templateUrl: './product-info.component.html',
  styleUrls: ['./product-info.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,

  standalone: true,
})
export class ProductInfoComponent {
  productInfo = input<any>();
  images: string[] = ['slider/1.webp', 'slider/2.webp'];
  maxLength: number = 10;
  quantity: number = 1;
  selectedAttributes: { [key: string]: string | null } = {};
  isAddingToWishlist: boolean = false;
  isInWishlist: boolean = false;
  wishlistMessage: string | null = null;
  wishlistSuccess: boolean = true;
  private wishlistSubscription: Subscription | null = null;

  @Output() selectedAttributeChange = new EventEmitter<{
    name: string;
    value: string | null;
  }>();

  linkCopied: boolean = false;

  constructor(
    private cartService: CartService,
    private wishlistService: WooCommerceAccountService
  ) {}

  ngOnInit() {
    const product = this.productInfo();
    if (product) {
      console.log('Product Info:', product);
      console.log('Variations:', product.variations);
      console.log('Default Attributes:', product.default_attributes);

      this.quantity = 1;
      this.setDefaultAttributes();
      console.log('Selected Attributes:', this.selectedAttributes);
      this.updateMaxLength();

      this.checkWishlistStatus(product.id);
    }
  }

  ngOnDestroy() {
    // Unsubscribe to prevent memory leaks
    if (this.wishlistSubscription) {
      this.wishlistSubscription.unsubscribe();
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
    const product = this.productInfo();
    if (product?.type === 'simple') {
      this.maxLength = product.stock_quantity || 10;
      return;
    }

    const selectedVariation = this.getSelectedVariation();
    this.maxLength = selectedVariation?.stock_quantity || 0;
  }

  get productSku() {
    const shortTitle =
      this.productInfo()?.name?.split(' ').slice(0, 2).join('') || '';
    const sku = this.productInfo()?.sku || '';
    return { shortTitle, sku };
  }

  get brandName() {
    return (
      this.productInfo()?.attributes?.find((attr: any) => attr.name === 'Brand')
        ?.options?.[0]?.name || 'brand'
    );
  }

  get brandSlug() {
    return (
      this.productInfo()?.attributes?.find((attr: any) => attr.name === 'Brand')
        ?.options?.[0]?.slug || 'brand'
    );
  }

  getVariationAttributes(): string[] {
    return (
      this.productInfo()
        ?.attributes?.filter((attr: any) => attr.variation)
        ?.map((attr: any) => attr.name) || []
    );
  }

  getVariationOptions(
    attributeName: string,
    dependentAttributeValue: string | null = null
  ): { value: string; image?: string; inStock: boolean }[] {
    const variations = this.productInfo()?.variations || [];
    if (!Array.isArray(variations) || !variations.length) {
      return [];
    }

    const optionMap = new Map<string, { image?: string; inStock: boolean }>();
    variations.forEach((v: any) => {
      const attr = v.attributes?.find(
        (attr: any) => attr?.name === attributeName
      );
      if (!attr) return;

      // For Colors: Consider the color inStock if any variation with this color is in stock
      if (attributeName === 'Color') {
        if (!optionMap.has(attr.option)) {
          const isInStock = variations.some(
            (variation: any) =>
              variation.attributes?.some(
                (a: any) => a?.name === 'Color' && a?.option === attr.option
              ) && variation.stock_status === 'instock'
          );
          optionMap.set(attr.option, {
            image: v.image?.src,
            inStock: isInStock,
          });
        }
      }
      // For Sizes: Include all sizes (in stock or out of stock) that match the selected color (if provided)
      else if (attributeName === 'Size' && dependentAttributeValue) {
        if (
          v.attributes?.some(
            (a: any) =>
              a?.name === 'Color' && a?.option === dependentAttributeValue
          )
        ) {
          optionMap.set(attr.option, {
            inStock: v.stock_status === 'instock',
          });
        }
      }
      // For other attributes: Include all options, marking stock status
      else {
        optionMap.set(attr.option, {
          inStock: v.stock_status === 'instock',
        });
      }
    });

    return Array.from(optionMap, ([value, data]) => ({
      value,
      image: data.image,
      inStock: data.inStock,
    }));
  }

  selectAttribute(name: string, value: string): void {
    this.selectedAttributes[name] = value;
    this.selectedAttributeChange.emit({ name, value });

    // If selecting a Color, reset Size and select a default in-stock Size if available
    if (name === 'Color') {
      this.selectedAttributes['Size'] = null;
      const availableSizes = this.getVariationOptions('Size', value).filter(
        (opt) => opt.inStock
      );
      if (availableSizes.length > 0) {
        this.selectAttribute('Size', availableSizes[0].value);
      }
    }

    this.selectedAttributeChange.emit({ name, value });
    this.updateMaxLength();
    this.quantity = 1;
  }

  getSelectedVariation() {
    const variations = this.productInfo()?.variations || [];
    if (!Array.isArray(variations) || !variations.length) {
      return null;
    }

    const variationAttributes = this.getVariationAttributes();
    if (!variationAttributes.length) {
      return null;
    }

    return variations.find((v: any) =>
      variationAttributes.every((attrName: string) =>
        v.attributes?.some(
          (attr: any) =>
            attr?.name === attrName &&
            attr?.option === this.selectedAttributes[attrName]
        )
      )
    );
  }

  get isProductInStock(): boolean {
    const product = this.productInfo();
    if (product?.type === 'simple') {
      // If stock is not managed, rely on stock_status alone
      if (!product.manage_stock) {
        return product.stock_status === 'instock';
      }
      // If stock is managed, check stock_quantity or backorders
      return (
        product.stock_status === 'instock' &&
        (product.stock_quantity > 0 || product.backorders_allowed)
      );
    }

    // Variable product logic
    if (!this.allVariationAttributesSelected) {
      return false;
    }

    const selectedVariation = this.getSelectedVariation();
    return (
      !!selectedVariation &&
      selectedVariation.stock_status === 'instock' &&
      (selectedVariation.stock_quantity > 0 ||
        selectedVariation.backorders_allowed)
    );
  }

  getPriceInfo(): { price: string; regularPrice: string; isOnSale: boolean } {
    const product = this.productInfo();
    if (!product) {
      return { price: '', regularPrice: '', isOnSale: false };
    }

    if (product.type === 'simple' || !this.allVariationAttributesSelected) {
      const price = product.price || '';
      const regularPrice = product.regular_price || price;
      const isOnSale =
        product.on_sale &&
        price !== regularPrice &&
        parseFloat(price) < parseFloat(regularPrice);
      return { price, regularPrice, isOnSale };
    }

    const selectedVariation = this.getSelectedVariation();
    if (selectedVariation) {
      const price = selectedVariation.price || product.price || '';
      const regularPrice = selectedVariation.regular_price || price;
      const isOnSale =
        selectedVariation.on_sale &&
        price !== regularPrice &&
        parseFloat(price) < parseFloat(regularPrice);
      return { price, regularPrice, isOnSale };
    }

    return {
      price: product.price || '',
      regularPrice: product.regular_price || product.price || '',
      isOnSale: false,
    };
  }

  addToCart(): void {
    const product = this.productInfo();
    if (!product) {
      console.error('No product info available');
      return;
    }

    let cartProduct: any;
    let variationId: number | undefined;

    if (product.type === 'simple') {
      if (product.stock_status !== 'instock') {
        console.error('Cannot add to cart: Product is out of stock');
        return;
      }
      cartProduct = { ...product, quantity: this.quantity };
    } else {
      if (!this.allVariationAttributesSelected) {
        console.error(
          'Cannot add to cart: Not all variation attributes are selected'
        );
        return;
      }

      const selectedVariation = this.getSelectedVariation();
      if (!selectedVariation) {
        console.error('Cannot add to cart: No valid variation selected');
        return;
      }

      if (selectedVariation.stock_status !== 'instock') {
        console.error('Cannot add to cart: Selected variation is out of stock');
        return;
      }

      variationId = selectedVariation.id;
      cartProduct = { ...selectedVariation, quantity: this.quantity };
    }

    if (!this.cartService) {
      console.error('CartService is not initialized');
      return;
    }

    this.cartService.addProductToCart(cartProduct);
    console.log('Product added to cart:', cartProduct);

    if (typeof _learnq !== 'undefined') {
      _learnq.push([
        'track',
        'Added to Cart',
        {
          ProductID: product.id,
          ProductName: product.name,
          Price: cartProduct.price || product.price,
          VariationID: variationId || null,
          Attributes: { ...this.selectedAttributes },
          Brand: this.brandName,
          Categories: product.categories?.map((cat: any) => cat.name) || [],
        },
      ]);
      console.log('Klaviyo: Added to Cart tracked');
    }
  }

  buyNow(): void {
    console.log('Buy now with pay clicked');
  }

  parseFloatValue(value: any): number {
    return parseFloat(value);
  }

  private setDefaultAttributes(): void {
    const product = this.productInfo();
    if (!product || product.type === 'simple') {
      return;
    }

    const variations = product.variations || [];
    if (!Array.isArray(variations) || !variations.length) {
      return;
    }

    const variationAttributes = this.getVariationAttributes();
    const defaultAttributes = product.default_attributes || [];

    variationAttributes.forEach((attrName: string) => {
      const defaultAttr = defaultAttributes.find(
        (attr: any) => attr.name === attrName
      );
      let selectedOption = null;

      if (defaultAttr) {
        selectedOption = this.getVariationOptions(
          attrName,
          attrName === 'Size' ? this.selectedAttributes['Color'] : null
        ).find(
          (opt) =>
            opt.value.toLowerCase() === defaultAttr.option.toLowerCase() &&
            opt.inStock
        );
      }

      if (!selectedOption) {
        selectedOption = this.getVariationOptions(
          attrName,
          attrName === 'Size' ? this.selectedAttributes['Color'] : null
        ).find((opt) => opt.inStock);
      }

      if (selectedOption) {
        this.selectAttribute(attrName, selectedOption.value);
      }
    });
  }

  get isCompletelyOutOfStock(): boolean {
    const product = this.productInfo();
    if (!product) return true;
    if (product.type === 'simple') {
      return product.stock_status === 'outofstock';
    }
    return !product.variations?.some((v: any) => v.stock_status === 'instock');
  }

  get allVariationAttributesSelected(): boolean {
    const variationAttributes = this.getVariationAttributes();
    return (
      variationAttributes.length === 0 ||
      variationAttributes.every(
        (attrName: string) => this.selectedAttributes[attrName] !== null
      )
    );
  }

  addToWishList(productId: number) {
    if (!productId) {
      console.error('Invalid product ID');
      this.showWishlistMessage(
        'Failed to add to wishlist: Invalid product ID',
        false
      );
      return;
    }

    if (!this.wishlistService.isLoggedIn()) {
      console.warn('User not logged in, cannot add to wishlist');
      this.showWishlistMessage('Please log in to add to wishlist', false);
      return;
    }

    this.isAddingToWishlist = true;
    this.wishlistMessage = null;

    this.wishlistSubscription = this.wishlistService
      .addToWishlist(productId)
      .subscribe({
        next: (response) => {
          this.isAddingToWishlist = false;
          if (response.success) {
            this.isInWishlist = true;
            this.showWishlistMessage('Product added to wishlist', true);
            // Track with Klaviyo (optional)
            if (typeof _learnq !== 'undefined') {
              _learnq.push([
                'track',
                'Added to Wishlist',
                {
                  ProductID: productId,
                  ProductName: this.productInfo()?.name,
                  Price: this.getPriceInfo().price,
                  Brand: this.brandName,
                  Categories:
                    this.productInfo()?.categories?.map(
                      (cat: any) => cat.name
                    ) || [],
                },
              ]);
              console.log('Klaviyo: Added to Wishlist tracked');
            }
          } else {
            this.showWishlistMessage(
              response.message || 'Failed to add to wishlist',
              false
            );
          }
        },
        error: (error) => {
          this.isAddingToWishlist = false;
          this.showWishlistMessage(
            'Failed to add to wishlist: ' + (error.message || 'Unknown error'),
            false
          );
        },
      });
  }

  private checkWishlistStatus(productId: number) {
    if (!productId || !this.wishlistService.isLoggedIn()) {
      this.isInWishlist = false;
      return;
    }

    this.wishlistSubscription = this.wishlistService.getWishlist().subscribe({
      next: (response) => {
        if (response.success && response.data) {
          // Assuming response.data is an array of wishlist items with product IDs
          this.isInWishlist = response.data.some(
            (item: any) => item.product_id === productId
          );
        } else {
          this.isInWishlist = false;
        }
      },
      error: (error) => {
        console.error('Error checking wishlist status:', error);
        this.isInWishlist = false;
      },
    });
  }

  private showWishlistMessage(message: string, success: boolean) {
    this.wishlistMessage = message;
    this.wishlistSuccess = success;
    // Clear message after 5 seconds
    setTimeout(() => {
      this.wishlistMessage = null;
    }, 5000);
  }

  // Social sharing methods
  getFacebookShareUrl(): string {
    // Get current product URL to share
    const productUrl = this.getCurrentProductUrl();
    const title = encodeURIComponent(
      this.productInfo()?.name || 'Check out this product'
    );
    return `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(
      productUrl
    )}&t=${title}`;
  }

  getTwitterShareUrl(): string {
    const productUrl = this.getCurrentProductUrl();
    const title = encodeURIComponent(
      this.productInfo()?.name || 'Check out this product'
    );
    return `https://twitter.com/intent/tweet?text=${title}&url=${encodeURIComponent(
      productUrl
    )}`;
  }

  getWhatsAppShareUrl(): string {
    const productUrl = this.getCurrentProductUrl();
    const title = encodeURIComponent(
      this.productInfo()?.name || 'Check out this product'
    );
    return `https://api.whatsapp.com/send?text=${title}%20${encodeURIComponent(
      productUrl
    )}`;
  }

  copyProductLink(event: Event): void {
    event.preventDefault();
    const productUrl = this.getCurrentProductUrl();

    // Copy to clipboard
    navigator.clipboard.writeText(productUrl).then(() => {
      this.linkCopied = true;
      setTimeout(() => {
        this.linkCopied = false;
      }, 2000);
    });
  }

  private getCurrentProductUrl(): string {
    return window.location.href;
  }
}
