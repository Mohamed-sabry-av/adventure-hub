import { Component, EventEmitter, input, Output } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { CartService } from '../../../cart/service/cart.service';
import { WooCommerceAccountService } from '../../../auth/account-details/account-details.service';
import { Subscription, BehaviorSubject, Observable, map } from 'rxjs';
import { CurrencySvgPipe } from '../../../../shared/pipes/currency.pipe';
import { Product, Variation } from '../../../../interfaces/product';
import { VariationService } from '../../../../core/services/variation.service';

// UI Service for loading states
class UIService {
  private loadingMapSubject = new BehaviorSubject<{ [key: string]: boolean }>({
    add: false,
    buy: false,
  });

  loadingMap$ = this.loadingMapSubject.asObservable();

  setLoading(key: string, isLoading: boolean) {
    const currentState = this.loadingMapSubject.getValue();
    this.loadingMapSubject.next({
      ...currentState,
      [key]: isLoading,
    });
  }
}

declare var _learnq: any;

@Component({
  selector: 'app-product-info',
  imports: [CommonModule, RouterLink, ReactiveFormsModule, CurrencySvgPipe],
  templateUrl: './product-info.component.html',
  styleUrls: ['./product-info.component.css'],
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

  // Track if we should show out of stock variations
  showOutOfStockVariations: boolean = true;

  // UI Service for loading states
  private uiService = new UIService();
  loadingMap$: Observable<{ [key: string]: boolean }> = this.uiService.loadingMap$;

  @Output() selectedAttributeChange = new EventEmitter<{ name: string; value: string | null }>();
  @Output() variationSelected = new EventEmitter<any>();

  linkCopied: boolean = false;

  constructor(
    private cartService: CartService,
    private wishlistService: WooCommerceAccountService,
    private variationService: VariationService
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
    const shortTitle = this.productInfo()?.name?.split(' ').slice(0, 2).join('') || '';
    const sku = this.productInfo()?.sku || '';
    return { shortTitle, sku };
  }

  get brandName() {
    return this.productInfo()?.attributes?.find((attr: any) => attr.name === 'Brand')?.options?.[0]?.name || 'brand';
  }

  get brandSlug() {
    return this.productInfo()?.attributes?.find((attr: any) => attr.name === 'Brand')?.options?.[0]?.slug || 'brand';
  }

  getVariationAttributes(): string[] {
    return this.productInfo()?.attributes
      ?.filter((attr: any) => attr.variation)
      ?.map((attr: any) => attr.name) || [];
  }

  getVariationOptions(
    attributeName: string,
    dependentAttributeValue: string | null = null
  ): { value: string; image?: string; inStock: boolean }[] {
    const product = this.productInfo();
    if (!product) return [];

    const variations = product.variations || [];
    if (!Array.isArray(variations) || !variations.length) {
      return [];
    }

    // Using the variation service for consistent handling
    if (attributeName === 'Color') {
      const colorOptions = this.variationService.getColorOptions(variations);
      return colorOptions.map(option => ({
        value: option.color,
        image: option.image,
        inStock: option.inStock
      }));
    } else if (attributeName === 'Size' && dependentAttributeValue) {
      const sizeOptions = this.variationService.getSizesForColor(variations, dependentAttributeValue);
      return sizeOptions.map(option => ({
        value: option.size,
        inStock: option.inStock
      }));
    }

    // For other attribute types, or fallback
    const optionMap = new Map<string, { image?: string; inStock: boolean }>();

    variations.forEach((v: any) => {
      const attr = v.attributes?.find((attr: any) => attr?.name === attributeName);
      if (!attr) return;

      // Check if this variation matches dependent attribute if specified
      const matchesDependentAttribute = !dependentAttributeValue ||
        v.attributes?.some(
          (a: any) => a.name !== attributeName && a.option === dependentAttributeValue
        );

      if (matchesDependentAttribute) {
        const isInStock = v.stock_status === 'instock';
        const currentValue = optionMap.get(attr.option);

        // Only update if we haven't seen this option before, or if this variation is in stock and the previous one wasn't
        if (!currentValue || (!currentValue.inStock && isInStock)) {
          optionMap.set(attr.option, {
            inStock: isInStock,
          });
        }
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

    if (name === 'Color') {
      this.selectedAttributes['Size'] = null;
      const availableSizes = this.getVariationOptions('Size', value);
      if (availableSizes.length > 0) {
        // First try to find an in-stock size
        const firstInStockSize = availableSizes.find(size => size.inStock);
        if (firstInStockSize) {
          this.selectAttribute('Size', firstInStockSize.value);
        } else if (this.showOutOfStockVariations) {
          // If showing out of stock variations, select the first one
          this.selectAttribute('Size', availableSizes[0].value);
        }
      }
    }

    // Emit variation selected event when all attributes are selected
    if (this.allVariationAttributesSelected) {
      const selectedVariation = this.getSelectedVariation();
      if (selectedVariation) {
        this.variationService.setSelectedVariation(selectedVariation);
        this.variationSelected.emit(selectedVariation);
      }
    }

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

    // Use the variation service to find the variation
    return this.variationService.findVariationByAttributes(variations, this.selectedAttributes);
  }

  get isProductInStock(): boolean {
    const product = this.productInfo();
    if (product?.type === 'simple') {
      if (!product.manage_stock) {
        return product.stock_status === 'instock';
      }
      return product.stock_status === 'instock' && (product.stock_quantity > 0 || product.backorders_allowed);
    }

    if (!this.allVariationAttributesSelected) {
      return false;
    }

    const selectedVariation :any= this.getSelectedVariation();
    return (
      !!selectedVariation &&
      selectedVariation.stock_status === 'instock' &&
      (selectedVariation.stock_quantity > 0 || selectedVariation.backorders_allowed)
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
      const isOnSale = product.on_sale && price !== regularPrice && parseFloat(price) < parseFloat(regularPrice);
      return { price, regularPrice, isOnSale };
    }

    const selectedVariation = this.getSelectedVariation();
    if (selectedVariation) {
      const price = selectedVariation.price || product.price || '';
      const regularPrice = selectedVariation.regular_price || price;
      const isOnSale:any =
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

  addToCart(buyItNow: boolean = false): void {
    const product = this.productInfo();
    if (!product) {
      console.error('No product info available');
      this.uiService.setLoading(buyItNow ? 'buy' : 'add', false);
      return;
    }

    // Set loading state
    this.uiService.setLoading(buyItNow ? 'buy' : 'add', true);

    let cartProduct: any;

    if (product.type === 'simple') {
      if (product.stock_status !== 'instock') {
        console.error('Cannot add to cart: Product is out of stock');
        this.uiService.setLoading(buyItNow ? 'buy' : 'add', false);
        return;
      }
      cartProduct = { ...product, quantity: this.quantity };
    } else {
      if (!this.allVariationAttributesSelected) {
        console.error('Cannot add to cart: Not all variation attributes are selected');
        this.uiService.setLoading(buyItNow ? 'buy' : 'add', false);
        return;
      }

      const selectedVariation = this.getSelectedVariation();
      if (!selectedVariation) {
        console.error('Cannot add to cart: No valid variation selected');
        this.uiService.setLoading(buyItNow ? 'buy' : 'add', false);
        return;
      }

      if (selectedVariation.stock_status !== 'instock') {
        console.error('Cannot add to cart: Selected variation is out of stock');
        this.uiService.setLoading(buyItNow ? 'buy' : 'add', false);
        return;
      }

      // Use the variation service to prepare cart product
      cartProduct = this.variationService.prepareProductForCart(
        product,
        selectedVariation,
        this.quantity
      );
    }

    if (!this.cartService) {
      console.error('CartService is not initialized');
      this.uiService.setLoading(buyItNow ? 'buy' : 'add', false);
      return;
    }

    // Add product to cart with a delay to show spinner
    setTimeout(() => {
      this.cartService.addProductToCart(cartProduct, buyItNow);
      console.log('Product added to cart:', cartProduct);

      if (typeof _learnq !== 'undefined') {
        _learnq.push([
          'track',
          buyItNow ? 'Buy Now' : 'Added to Cart',
          {
            ProductID: product.id,
            ProductName: product.name,
            Price: cartProduct.price || product.price,
            VariationID: cartProduct.id !== product.id ? cartProduct.id : null,
            Attributes: { ...this.selectedAttributes },
            Brand: this.brandName,
            Categories: product.categories?.map((cat: any) => cat.name) || [],
          },
        ]);
        console.log('Klaviyo:', buyItNow ? 'Buy Now tracked' : 'Added to Cart tracked');
      }

      // Reset loading state after 1 second to show success
      setTimeout(() => {
        this.uiService.setLoading(buyItNow ? 'buy' : 'add', false);
      }, 1000);
    }, 1000); // 1 second delay for demonstration
  }

  buyNow(): void {
    this.addToCart(true);
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
      const defaultAttr = defaultAttributes.find((attr: any) => attr.name === attrName);
      let selectedOption = null;

      if (defaultAttr) {
        selectedOption = this.getVariationOptions(
          attrName,
          attrName === 'Size' ? this.selectedAttributes['Color'] : null
        ).find(
          (opt) =>
            opt.value.toLowerCase() === defaultAttr.option.toLowerCase() && (opt.inStock || this.showOutOfStockVariations)
        );
      }

      if (!selectedOption) {
        selectedOption = this.getVariationOptions(
          attrName,
          attrName === 'Size' ? this.selectedAttributes['Color'] : null
        ).find((opt) => opt.inStock || this.showOutOfStockVariations);
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
      variationAttributes.every((attrName: string) => this.selectedAttributes[attrName] !== null)
    );
  }

  addToWishList(productId: number) {
    if (!productId) {
      console.error('Invalid product ID');
      this.showWishlistMessage('Failed to add to wishlist: Invalid product ID', false);
      return;
    }

    if (!this.wishlistService.isLoggedIn()) {
      console.warn('User not logged in, cannot add to wishlist');
      this.showWishlistMessage('Please log in to add to wishlist', false);
      return;
    }

    this.isAddingToWishlist = true;
    this.wishlistMessage = null;

    this.wishlistSubscription = this.wishlistService.addToWishlist(productId).subscribe({
      next: (response) => {
        this.isAddingToWishlist = false;
        if (response.success) {
          this.isInWishlist = true;
          this.showWishlistMessage('Product added to wishlist', true);
          if (typeof _learnq !== 'undefined') {
            _learnq.push([
              'track',
              'Added to Wishlist',
              {
                ProductID: productId,
                ProductName: this.productInfo()?.name,
                Price: this.getPriceInfo().price,
                Brand: this.brandName,
                Categories: this.productInfo()?.categories?.map((cat: any) => cat.name) || [],
              },
            ]);
            console.log('Klaviyo: Added to Wishlist tracked');
          }
        } else {
          this.showWishlistMessage(response.message || 'Failed to add to wishlist', false);
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
          this.isInWishlist = response.data.some((item: any) => item.product_id === productId);
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
    setTimeout(() => {
      this.wishlistMessage = null;
    }, 5000);
  }

  copyProductLink(event: Event): void {
    event.preventDefault();
    const productUrl = this.getCurrentProductUrl();

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

  // Format a color name for display
  formatColorName(colorName: string): string {
    return this.variationService.formatColorName(colorName);
  }
}
