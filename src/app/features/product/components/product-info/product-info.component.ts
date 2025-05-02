import { Component, EventEmitter, input, Output, OnInit, OnDestroy } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { CartService } from '../../../cart/service/cart.service';
import { WooCommerceAccountService } from '../../../auth/account-details/account-details.service';
import { Subscription, Observable } from 'rxjs';
import { CurrencySvgPipe } from '../../../../shared/pipes/currency.pipe';
import { VariationService } from '../../../../core/services/variation.service';
import { UIService } from '../../../../shared/services/ui.service';

declare var _learnq: any;

@Component({
  selector: 'app-product-info',
  imports: [CommonModule, RouterLink, ReactiveFormsModule, CurrencySvgPipe],
  templateUrl: './product-info.component.html',
  styleUrls: ['./product-info.component.css'],
  standalone: true,
})
export class ProductInfoComponent implements OnInit, OnDestroy {
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

  // Loading states from injected UIService
  loadingMap$: Observable<{ [key: string]: boolean }>;

  @Output() selectedAttributeChange = new EventEmitter<{ name: string; value: string | null }>();
  @Output() variationSelected = new EventEmitter<any>();

  linkCopied: boolean = false;

  constructor(
    private cartService: CartService,
    private wishlistService: WooCommerceAccountService,
    private variationService: VariationService,
    private uiService: UIService // Injected singleton UIService
  ) {
    this.loadingMap$ = this.uiService.loadingMap$; // Set loadingMap$ from UIService
  }

  ngOnInit() {
    const product = this.productInfo();
    if (product) {
      this.quantity = 1;
      this.setDefaultAttributes();
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

    const optionMap = new Map<string, { image?: string; inStock: boolean }>();

    variations.forEach((v: any) => {
      const attr = v.attributes?.find((attr: any) => attr?.name === attributeName);
      if (!attr) return;

      const matchesDependentAttribute = !dependentAttributeValue ||
        v.attributes?.some(
          (a: any) => a.name !== attributeName && a.option === dependentAttributeValue
        );

      if (matchesDependentAttribute) {
        const isInStock = v.stock_status === 'instock';
        const currentValue = optionMap.get(attr.option);

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
        const firstInStockSize = availableSizes.find(size => size.inStock);
        if (firstInStockSize) {
          this.selectAttribute('Size', firstInStockSize.value);
        } else if (this.showOutOfStockVariations) {
          this.selectAttribute('Size', availableSizes[0].value);
        }
      }
    }

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

    const selectedVariation: any = this.getSelectedVariation();
    return (
      !!selectedVariation &&
      selectedVariation.stock_status === 'instock' &&
      (selectedVariation.stock_quantity > 0 || selectedVariation.backorders_allowed)
    );
  }

  getPriceInfo(): { price: string; regularPrice: string; isOnSale: boolean } {
    const product = this.productInfo();
    if (!product) {
      return { price: '0', regularPrice: '0', isOnSale: false };
    }

    const normalizePrice = (value: any): string => {
      return value ? String(value).replace(/[^0-9.]/g, '') : '0';
    };

    if (product.type === 'simple' || !this.allVariationAttributesSelected) {
      const price = normalizePrice(product.price);
      const regularPrice = normalizePrice(product.regular_price || price);
      const salePrice = normalizePrice(product.sale_price);
      const isOnSale =
        (product.sale_price && salePrice !== regularPrice) ||
        (price !== regularPrice && parseFloat(price) < parseFloat(regularPrice));

      return { price, regularPrice, isOnSale };
    }

    const selectedVariation = this.getSelectedVariation();
    if (selectedVariation) {
      const price = normalizePrice(selectedVariation.price || product.price);
      const regularPrice = normalizePrice(selectedVariation.regular_price || price);
      const salePrice = normalizePrice(selectedVariation.sale_price);
      const isOnSale =
        (selectedVariation.sale_price && salePrice !== regularPrice) ||
        (price !== regularPrice && parseFloat(price) < parseFloat(regularPrice));

      return { price, regularPrice, isOnSale };
    }

    const price = normalizePrice(product.price);
    const regularPrice = normalizePrice(product.regular_price || price);
    const salePrice = normalizePrice(product.sale_price);
    const isOnSale =
      (product.sale_price && salePrice !== regularPrice) ||
      (price !== regularPrice && parseFloat(price) < parseFloat(regularPrice));

    return { price, regularPrice, isOnSale };
  }

  addToCart(buyItNow: boolean = false): void {
    const product = this.productInfo();
    if (!product) {
      return;
    }

    let cartProduct: any;
    if (product.type === 'simple') {
      if (product.stock_status !== 'instock') {
        return;
      }
      cartProduct = { ...product, quantity: this.quantity };
    } else {
      if (!this.allVariationAttributesSelected) {
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
      cartProduct = this.variationService.prepareProductForCart(
        product,
        selectedVariation,
        this.quantity
      );
    }

    if (!this.cartService) {
      console.error('CartService is not initialized');
      return;
    }

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
    }
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
      this.showWishlistMessage('Failed to add to wishlist: Invalid product ID', false);
      return;
    }

    if (!this.wishlistService.isLoggedIn()) {
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

  formatColorName(colorName: string): string {
    return this.variationService.formatColorName(colorName);
  }
}