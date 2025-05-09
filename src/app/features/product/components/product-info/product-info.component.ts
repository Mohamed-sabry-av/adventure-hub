import {
  Component,
  EventEmitter,
  input,
  Output,
  OnInit,
  OnDestroy,
  inject,
} from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { RouterLink, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { CartService } from '../../../cart/service/cart.service';
import { WooCommerceAccountService } from '../../../auth/account-details/account-details.service';
import { Subscription, Observable, interval } from 'rxjs';
import { CurrencySvgPipe } from '../../../../shared/pipes/currency.pipe';
import { VariationService } from '../../../../core/services/variation.service';
import { UIService } from '../../../../shared/services/ui.service';
import { CheckoutService } from '../../../checkout/services/checkout.service';
import { switchMap, takeWhile, tap, take } from 'rxjs/operators';
import { WalletPaymentComponent } from '../../../checkout/component/googlePay-button/google-pay-button.component';
import { TabbyPromoComponent } from '../TabbyPromoComponent/TabbyPromo.Component';
import { TabbyConfigService } from '../TabbyPromoComponent/Tabby.cofing.service';
import { StickyFooterService } from '../../../../shared/services/sticky-footer.service';
import { ProductInfoService } from '../../services/product-info.service';
import { UnifiedWishlistService } from '../../../../shared/services/unified-wishlist.service';

/**
 * Interface for product attribute options
 */
export interface ProductAttributeOption {
  value: string;
  image?: string;
  inStock: boolean;
}

/**
 * Interface for selected attribute
 */
export interface AttributeSelection {
  name: string;
  value: string | null;
}

declare var _learnq: any;

@Component({
  selector: 'app-product-info',
  imports: [
    CommonModule,
    RouterLink,
    ReactiveFormsModule,
    CurrencySvgPipe,
    WalletPaymentComponent,
    TabbyPromoComponent,
  ],
  templateUrl: './product-info.component.html',
  styleUrls: ['./product-info.component.css'],
  standalone: true,
})
export class ProductInfoComponent implements OnInit, OnDestroy {
  productInfo = input<any>();
  maxLength: number = 10;
  quantity: number = 1;
  selectedAttributes: { [key: string]: string | null } = {};
  isAddingToWishlist: boolean = false;
  isInWishlist: boolean = false;
  wishlistMessage: string | null = null;
  wishlistSuccess: boolean = true;
  private wishlistSubscription: Subscription | null = null;
  showOutOfStockVariations: boolean = true;
  tabbyConfig: { publicKey: string; merchantCode: string };
  loadingMap$: Observable<{ [key: string]: boolean }>;
  linkCopied: boolean = false;

  private stickyFooterService = inject(StickyFooterService);
  private productInfoService = inject(ProductInfoService);
  isFooterVisible$ = this.stickyFooterService.isFooterVisible$;
  private scrollHandler!: () => void;

  @Output() variationSelected = new EventEmitter<any>();
  @Output() selectedAttributeChange = new EventEmitter<AttributeSelection>();

  constructor(
    private cartService: CartService,
    private wishlistService: UnifiedWishlistService,
    private variationService: VariationService,
    private uiService: UIService,
    private checkoutService: CheckoutService,
    private router: Router,
    private tabbyConfigService: TabbyConfigService
  ) {
    this.loadingMap$ = this.uiService.loadingMap$;
    this.tabbyConfig = this.tabbyConfigService.getConfig();
  }

  ngOnInit() {
    const product = this.productInfo();
    if (product) {
      this.quantity = 1;
      this.selectedAttributes = this.productInfoService.setDefaultAttributes(product);
      this.updateMaxLength();
      this.checkWishlistStatus(product.id);
    }
    this.scrollHandler = this.stickyFooterService.initScrollHandler();
  }

  handleAttributeClick(event: Event, name: string, value: string): void {
    console.log(`Click event on ${name} = ${value}`);
    this.selectAttribute(name, value);
  }

  ngOnDestroy() {
    if (this.wishlistSubscription) {
      this.wishlistSubscription.unsubscribe();
    }
    if (this.scrollHandler) {
      this.scrollHandler();
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

    const selectedVariation = this.productInfoService.getSelectedVariation(
      product,
      this.selectedAttributes
    );
    this.maxLength = selectedVariation?.stock_quantity || 10;
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

  /**
   * Returns the names of the attributes that are used for variations.
   */
  getVariationAttributes(): string[] {
    return this.productInfoService.getVariationAttributes(this.productInfo());
  }

  /**
   * Returns the available options for a given attribute, optionally filtered by a dependent attribute value.
   * Provides a clear interface for product options.
   */
  getVariationOptions(
    attributeName: string,
    dependentAttributeValue: string | null = null
  ): ProductAttributeOption[] {
    return this.productInfoService.getVariationOptions(
      this.productInfo(),
      attributeName,
      dependentAttributeValue
    );
  }

  /**
   * Selects an attribute with improved handling and feedback
   * This modified function ensures better responsiveness and user experience
   */
  selectAttribute(name: string, value: string): void {
    console.log(`Selecting attribute: ${name} = ${value}`);

    this.selectedAttributes = {
      ...this.selectedAttributes,
      [name]: value,
    };

    this.selectedAttributeChange.emit({ name, value });

    if (name === 'Color') {
      this.selectedAttributes['Size'] = null;

      const availableSizes = this.getVariationOptions('Size', value);
      if (availableSizes.length > 0) {
        const firstInStockSize = availableSizes.find((size) => size.inStock);

        if (firstInStockSize) {
          setTimeout(() => {
            this.selectAttribute('Size', firstInStockSize.value);
          }, 100);
        } else if (this.showOutOfStockVariations) {
          setTimeout(() => {
            this.selectAttribute('Size', availableSizes[0].value);
          }, 100);
        }
      }
    }

    if (this.allVariationAttributesSelected) {
      const selectedVariation = this.productInfoService.getSelectedVariation(
        this.productInfo(),
        this.selectedAttributes
      );
      if (selectedVariation) {
        this.variationService.setSelectedVariation(selectedVariation);
        this.variationSelected.emit(selectedVariation);

        this.addFeedbackAnimation();
      }
    }

    this.updateMaxLength();
    this.quantity = 1;
  }

  /**
   * Adds a gentle feedback animation to the selected elements
   * Helps users understand their selection was successful
   */
  private addFeedbackAnimation(): void {
    const activeElements = document.querySelectorAll(
      '.color-option.active, .size-option.active'
    );

    activeElements.forEach((el) => {
      el.classList.add('feedback-animation');
      setTimeout(() => {
        el.classList.remove('feedback-animation');
      }, 300);
    });
  }

  getSelectedVariation() {
    return this.productInfoService.getSelectedVariation(
      this.productInfo(),
      this.selectedAttributes
    );
  }

  get isProductInStock(): boolean {
    return this.productInfoService.isProductInStock(
      this.productInfo(),
      this.selectedAttributes
    );
  }

  getPriceInfo(): { price: string; regularPrice: string; isOnSale: boolean } {
    return this.productInfoService.getPriceInfo(
      this.productInfo(),
      this.selectedAttributes
    );
  }

  addToCart(buyItNow: boolean = false): void {
    const product = this.productInfo();
    if (!product) {
      return;
    }

    const cartProduct = this.productInfoService.prepareCartProduct(
      product,
      this.selectedAttributes,
      this.quantity
    );
    if (!cartProduct) {
      return;
    }

    this.cartService.addProductToCart(cartProduct, buyItNow);

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

  getCartProduct() {
    return this.productInfoService.prepareCartProduct(
      this.productInfo(),
      this.selectedAttributes,
      this.quantity
    );
  }

  onWalletPaymentSucceeded(paymentIntentId: string) {
    if (typeof _learnq !== 'undefined') {
      const product = this.productInfo();
      _learnq.push([
        'track',
        'Wallet Purchase',
        {
          ProductID: product?.id,
          ProductName: product?.name,
          Price: this.getPriceInfo().price,
          Quantity: this.quantity,
          VariationID: this.getSelectedVariation()?.id || null,
          Attributes: { ...this.selectedAttributes },
          Brand: this.brandName,
          Categories: product?.categories?.map((cat: any) => cat.name) || [],
        },
      ]);
    }
    this.pollOrderStatus(paymentIntentId);
  }

  private pollOrderStatus(paymentIntentId: string) {
    interval(2000)
      .pipe(
        switchMap(() => this.checkoutService.checkOrderStatus(paymentIntentId)),
        takeWhile((response) => !(response.success && response.orderId), true),
        tap((response) => {
          if (response.success && response.orderId) {
            console.log('Wallet order created successfully:', response.orderId);
            this.router.navigate(['/order-received', response.orderId]);
          }
        })
      )
      .subscribe({
        error: (error) => {
          console.error('Error polling order status:', error);
          this.router.navigate(['/']);
        },
      });
  }

  parseFloatValue(value: any): number {
    return parseFloat(value);
  }

  get allVariationAttributesSelected(): boolean {
    return this.productInfoService.allVariationAttributesSelected(
      this.productInfo(),
      this.selectedAttributes
    );
  }

  get isCompletelyOutOfStock(): boolean {
    return this.productInfoService.isCompletelyOutOfStock(this.productInfo());
  }

  addToWishList(productId: number) {
    if (!productId) {
      this.showWishlistMessage(
        'Failed to add to wishlist: Invalid product ID',
        false
      );
      return;
    }

    this.isAddingToWishlist = true;
    this.wishlistMessage = null;

    // Get the full product object
    const product = this.productInfo();
    if (!product) {
      this.isAddingToWishlist = false;
      this.showWishlistMessage('Failed to add to wishlist: Product not found', false);
      return;
    }
    
    this.wishlistSubscription = this.wishlistService
      .toggleWishlistItem(product)
      .subscribe({
        next: (response) => {
          this.isAddingToWishlist = false;
          if (response.success) {
            this.isInWishlist = response.added;
            this.showWishlistMessage(
              response.added ? 'Product added to wishlist' : 'Product removed from wishlist', 
              true
            );
            
            // Track only when adding to wishlist
            if (response.added && typeof _learnq !== 'undefined') {
              _learnq.push([
                'track',
                'Added to Wishlist',
                {
                  ProductID: productId,
                  ProductName: product?.name,
                  Price: this.getPriceInfo().price,
                  Brand: this.brandName,
                  Categories: product?.categories?.map((cat: any) => cat.name) || [],
                },
              ]);
            }
          } else {
            this.showWishlistMessage(
              response.message || 'Failed to update wishlist',
              false
            );
          }
        },
        error: (error) => {
          this.isAddingToWishlist = false;
          this.showWishlistMessage(
            'Failed to update wishlist: ' + (error.message || 'Unknown error'),
            false
          );
        },
      });
  }

  private checkWishlistStatus(productId: number) {
    if (!productId) {
      this.isInWishlist = false;
      return;
    }

    this.wishlistSubscription = this.wishlistService.isInWishlist(productId).subscribe({
      next: (isInWishlist) => {
        this.isInWishlist = isInWishlist;
      },
      error: () => {
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
