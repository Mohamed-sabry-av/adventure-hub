import {
  Component,
  EventEmitter,
  input,
  Output,
  OnInit,
  OnDestroy,
  inject,
  effect,
  runInInjectionContext,
  PLATFORM_ID,
  Inject,
} from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { RouterLink, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { CartService } from '../../../cart/service/cart.service';
import { WooCommerceAccountService } from '../../../auth/account-details/account-details.service';
import { Subscription, Observable, interval } from 'rxjs';
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
import { ProductTagsService } from '../../../../shared/services/product-tags.service';
import { DeliveryEstimateComponent } from '../delivery-estimate/delivery-estimate.component';
import { SharePopupComponent } from '../share-popup/share-popup.component';
import { CurrencySvgPipe } from '../../../../shared/pipes/currency.pipe';
import { isPlatformBrowser } from '@angular/common';
import { KlaviyoTrackingService } from '../../../../shared/services/klaviyo-tracking.service';

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
    WalletPaymentComponent,
    TabbyPromoComponent,
    DeliveryEstimateComponent,
    SharePopupComponent,
    CurrencySvgPipe,
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
  // tabbyConfig: { publicKey: string; merchantCode: string };
  loadingMap$: Observable<{ [key: string]: boolean }>;
  linkCopied: boolean = false;
  isHubProduct: boolean = false;
  isSharePopupVisible: boolean = false;
  walletPaymentAvailable$: Observable<boolean>;

  private stickyFooterService = inject(StickyFooterService);
  private productInfoService = inject(ProductInfoService);
  private productTagsService = inject(ProductTagsService);
  private checkoutService = inject(CheckoutService);
  private platformId = inject(PLATFORM_ID);
  private klaviyoTracking = inject(KlaviyoTrackingService);
  isFooterVisible$ = this.stickyFooterService.isFooterVisible$;
  private scrollHandler!: () => void;

  @Output() variationSelected = new EventEmitter<any>();
  @Output() selectedAttributeChange = new EventEmitter<AttributeSelection>();

  constructor(
    private cartService: CartService,
    private wishlistService: UnifiedWishlistService,
    private variationService: VariationService,
    private uiService: UIService,
    private router: Router,
    private tabbyConfigService: TabbyConfigService
  ) {
    this.loadingMap$ = this.uiService.loadingMap$;
    // this.tabbyConfig = this.tabbyConfigService.getConfig();
    this.walletPaymentAvailable$ = this.checkoutService.walletPaymentAvailable$;
    
    // Track product changes using effect (within injection context)
    effect(() => {
      const newProduct = this.productInfo();
      if (newProduct && newProduct.id) {
        // Reset attributes when product changes
        this.selectedAttributes = this.productInfoService.setDefaultAttributes(newProduct);
        this.updateMaxLength();
        this.checkWishlistStatus(newProduct.id);
        this.checkIfHubProduct(newProduct);
      }
    });
  }

  ngOnInit() {
    const product = this.productInfo();

    if (product) {
      // Reset state
      this.quantity = 1;
      this.selectedAttributes = this.productInfoService.setDefaultAttributes(product);
      this.updateMaxLength();
      this.checkWishlistStatus(product.id);
      this.checkIfHubProduct(product);
    }
    this.scrollHandler = this.stickyFooterService.initScrollHandler();
  }
  
  /**
   * Check if the product is a HUB product based on tags, categories or attributes
   */
  checkIfHubProduct(product: any): void {
    if (!product) {
      this.isHubProduct = false;
      return;
    }
    
    // Check in tags
    if (product.tags && Array.isArray(product.tags)) {
      if (product.tags.some((tag: any) => 
          tag.name?.toLowerCase() === 'hub' || 
          tag.slug?.toLowerCase() === 'hub')) {
        this.isHubProduct = true;
        return;
      }
    }
    
    // Check in attributes
    if (product.attributes && Array.isArray(product.attributes)) {
      const hubAttribute = product.attributes.find((attr: any) => 
        attr.name === 'Shipping' || attr.name === 'Delivery' || attr.name === 'Hub'
      );
      
      if (hubAttribute && hubAttribute.options) {
        const hubOptions = hubAttribute.options;
        if (Array.isArray(hubOptions)) {
          const hasHub = hubOptions.some((option: any) => {
            const optionValue = typeof option === 'string' ? option.toLowerCase() : 
                               (option.name ? option.name.toLowerCase() : '');
            return optionValue.includes('hub');
          });
          
          if (hasHub) {
            this.isHubProduct = true;
            return;
          }
        }
      }
    }
    
    // Check in meta_data
    if (product.meta_data && Array.isArray(product.meta_data)) {
      const hubMeta = product.meta_data.find((meta: any) => 
        meta.key?.includes('hub') || 
        (typeof meta.value === 'string' && meta.value.toLowerCase().includes('hub'))
      );
      
      if (hubMeta) {
        this.isHubProduct = true;
        return;
      }
    }
    
    // Default to false
    this.isHubProduct = false;
  }

  handleAttributeClick(event: Event, name: string, value: string): void {
    this.selectAttribute(name, value);
  }

  ngOnDestroy() {
    if (this.wishlistSubscription) {
      this.wishlistSubscription.unsubscribe();
    }
    if (this.scrollHandler) {
      this.scrollHandler();
    }
    
    // Reset wallet payment availability when leaving the page
    this.checkoutService.walletPaymentAvailable$.next(false);
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

    this.selectedAttributes = {
      ...this.selectedAttributes,
      [name]: value,
    };

    this.selectedAttributeChange.emit({ name, value });

    if (name === 'Color') {
      // When color changes, trigger loading state first
      this.variationService.setLoadingState(true);
      
      this.selectedAttributes['Size'] = null;

      const availableSizes = this.getVariationOptions('Size', value);
      if (availableSizes.length > 0) {
        const firstInStockSize = availableSizes.find((size) => size.inStock);

        if (firstInStockSize) {
          this.selectAttribute('Size', firstInStockSize.value);
        } else if (this.showOutOfStockVariations) {
          this.selectAttribute('Size', availableSizes[0].value);
        }
      }
    } else if (name === 'Size') {
      // For size changes, make sure we're not in loading state
      // This ensures the image doesn't stay gray when only size changes
      this.variationService.setLoadingState(false);
    }

    if (this.allVariationAttributesSelected) {
      const product = this.productInfo();
      
      // First, get the basic variation from the product data
      const selectedVariation = this.productInfoService.getSelectedVariation(
        product,
        this.selectedAttributes
      );
      
      if (selectedVariation) {
        // Set the selected variation immediately (for quick UI feedback)
        this.variationService.setSelectedVariation(selectedVariation);
        
        // Only fetch full variation data and show loading state when color changes
        // Size changes don't typically affect images, so we can skip loading state
        if (name === 'Color') {
          // Then fetch the full variation data with all images
          this.productInfoService.getFullVariationData(product, this.selectedAttributes)
            .subscribe(fullVariation => {
              if (fullVariation) {
                // Update with complete variation data once it's available
                this.variationService.setSelectedVariation(fullVariation);
                this.variationSelected.emit(fullVariation);
              } else {
                // Fallback to the basic variation if full data couldn't be fetched
                this.variationSelected.emit(selectedVariation);
              }
              // Turn off loading state after variation is selected
              this.variationService.setLoadingState(false);
            });
        } else {
          // For size changes, just emit the variation without loading state
          this.variationSelected.emit(selectedVariation);
          // Ensure loading state is off
          this.variationService.setLoadingState(false);
        }
        
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

    // Track button click
    if (isPlatformBrowser(this.platformId)) {
      this.klaviyoTracking.trackButtonClick(
        buyItNow ? 'Buy Now' : 'Add to Cart', 
        'Product Page',
        { 
          ProductID: product.id,
          ProductName: product.name
        }
      );
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

    // Track in Klaviyo
    if (isPlatformBrowser(this.platformId)) {
      const eventData = {
        ProductID: product.id,
        ProductName: product.name,
        Price: parseFloat(cartProduct.price || product.price),
        Quantity: this.quantity,
        VariationID: cartProduct.id !== product.id ? cartProduct.id : null,
        Attributes: { ...this.selectedAttributes },
        Brand: this.brandName,
        Categories: product.categories?.map((cat: any) => cat.name) || [],
        ImageURL: product.images?.[0]?.src || '',
      };
      
      this.klaviyoTracking.trackEvent(buyItNow ? 'Buy Now' : 'Added to Cart', eventData);
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
    // Track wallet purchase in Klaviyo
    if (isPlatformBrowser(this.platformId)) {
      const product = this.productInfo();
      if (product) {
        const eventData = {
          ProductID: product.id,
          ProductName: product.name,
          Price: parseFloat(this.getPriceInfo().price),
          Quantity: this.quantity,
          VariationID: this.getSelectedVariation()?.id || null,
          Attributes: { ...this.selectedAttributes },
          Brand: this.brandName,
          Categories: product.categories?.map((cat: any) => cat.name) || [],
          PaymentIntentID: paymentIntentId
        };
        
        this.klaviyoTracking.trackEvent('Wallet Purchase', eventData);
      }
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
            this.router.navigate(['/order-received', response.orderId]);
          }
        })
      )
      .subscribe({
        error: (error) => {
          
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
    
    // Track button click
    if (isPlatformBrowser(this.platformId)) {
      this.klaviyoTracking.trackButtonClick(
        'Toggle Wishlist', 
        'Product Page',
        { 
          ProductID: productId,
          ProductName: product.name,
          CurrentState: this.isInWishlist ? 'In Wishlist' : 'Not In Wishlist'
        }
      );
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
            if (response.added && isPlatformBrowser(this.platformId)) {
              const eventData = {
                ProductID: productId,
                ProductName: product?.name,
                Price: parseFloat(this.getPriceInfo().price),
                Brand: this.brandName,
                Categories: product?.categories?.map((cat: any) => cat.name) || [],
              };
              
              this.klaviyoTracking.trackEvent('Added to Wishlist', eventData);
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
    event.stopPropagation();
    const url = this.getCurrentProductUrl();
    
    navigator.clipboard.writeText(url).then(
      () => {
        this.linkCopied = true;
        this.uiService.showSuccess('Link copied to clipboard!');
        setTimeout(() => {
          this.linkCopied = false;
        }, 2000);
      },
      (err) => {
        
        this.uiService.showError('Failed to copy link');
      }
    );
  }

  shareProduct(): void {
    this.isSharePopupVisible = true;
  }

  closeSharePopup(): void {
    this.isSharePopupVisible = false;
  }

   getCurrentProductUrl(): string {
    // Get absolute base URL 
    const baseUrl = window.location.origin;
    const product = this.productInfo();
    
    // If we have a product with a slug, use it for a more reliable URL
    if (product && product.slug) {
      return `${baseUrl}/product/${product.slug}`;
    }
    
    // Fallback to current URL
    return window.location.href;
  }

  formatColorName(colorName: string): string {
    return this.variationService.formatColorName(colorName);
  }

  /**
   * Get product tags for display
   */
  getProductTags(): string[] {
    const product = this.productInfo();
    if (!product) {
      return [];
    }
    // For variable products, we pass variations if available
    const variations = product.variations || [];
    return this.productTagsService.getProductTags(product, variations);
  }

  /**
   * Get CSS class for a specific tag
   */
  getTagClass(tag: string): string {
    return this.productTagsService.getTagClass(tag);
  }

  /**
   * Get warranty information from product metadata
   * @returns Warranty information string or null if not available
   */
  getWarrantyInfo(): string | null {
    const product = this.productInfo();
    if (!product) {
      return null;
    }

  
    // Check warranty in meta_data
    if (product.meta_data && Array.isArray(product.meta_data)) {
      // Common warranty meta keys
      const warrantyKeys = ['_warranty', 'warranty', '_warranty_info', 'guarantee', 'warranty_period'];
      
      for (const key of warrantyKeys) {
        const warrantyMeta = product.meta_data.find((meta: any) => meta.key === key);
        if (warrantyMeta) {
          
          if (!warrantyMeta.value) {
            continue;
          }
          
          // Handle different data types
          if (typeof warrantyMeta.value === 'string') {
            return warrantyMeta.value;
          } else if (typeof warrantyMeta.value === 'number') {
            return `${warrantyMeta.value} months`;
          } else if (typeof warrantyMeta.value === 'boolean' && warrantyMeta.value) {
            return 'Available';
          } else if (typeof warrantyMeta.value === 'object') {
            // Try to extract value from common object properties
            const objValue = warrantyMeta.value;
            const possibleProps = ['text', 'value', 'description', 'duration', 'period', 'info'];
            
            for (const prop of possibleProps) {
              if (objValue[prop] && typeof objValue[prop] === 'string') {
                return objValue[prop];
              }
            }
            
            // If we reach here, try to JSON stringify (remove in production)
            try {
              const jsonStr = JSON.stringify(objValue);
              if (jsonStr && jsonStr !== '{}' && jsonStr !== '[]') {
                return jsonStr !== '[object Object]' ? jsonStr : '1 Year';
              }
            } catch (e) {
              
            }
            
            return '1 Year'; // Default fallback
          }
        }
      }
    }

    // Check warranty in product attributes
    if (product.attributes && Array.isArray(product.attributes)) {
      // Try to find warranty attribute
      const warrantyAttributes = product.attributes.filter(
        (attr: any) => 
          attr.name && 
          (attr.name.toLowerCase().includes('warranty') || 
           attr.name.toLowerCase().includes('guarantee'))
      );
      
      for (const warrantyAttr of warrantyAttributes) {
        
        if (warrantyAttr.options && warrantyAttr.options.length > 0) {
          const option = warrantyAttr.options[0];
          
          if (typeof option === 'string') {
            return option;
          } else if (typeof option === 'number') {
            return `${option} months`;
          } else if (typeof option === 'object') {
            return option.name || option.text || option.value || '1 Year';
          }
        }
      }
    }

    // Last resort: check if there's any property that suggests warranty
    if (product.warranty) {
      return typeof product.warranty === 'string' ? product.warranty : '1 Year';
    }
    
    if (product.guarantee) {
      return typeof product.guarantee === 'string' ? product.guarantee : '1 Year';
    }

    // If no warranty info found
    return null;
  }

  /**
   * Convert price from string to number for the currency directive
   */
  getNumericPrice(price: string): number {
    if (!price || price === 'Unavailable') return 0;
    
    // Remove any non-numeric characters except decimal point
    const numericString = price.toString().replace(/[^0-9.]/g, '');
    const numeric = parseFloat(numericString);
    return isNaN(numeric) ? 0 : numeric;
  }

  formatSizeName(size: string): string {
    if (!size) return '';
    
    // Look up the original name from product attributes
    const product = this.productInfo();
    if (product && product.attributes) {
      const sizeAttribute = product.attributes.find((attr: any) => attr.name === 'Size' || attr.name === 'pa_size');
      if (sizeAttribute && sizeAttribute.options) {
        // Check if options are objects with name and slug properties
        if (typeof sizeAttribute.options[0] === 'object') {
          const option = sizeAttribute.options.find((opt: any) => 
            (opt.slug === size) || (opt.value === size) || (opt.name?.toLowerCase() === size.toLowerCase())
          );
          if (option && option.name) {
            return option.name;
          }
        }
      }
    }
    
    // Fallback to the original value if no mapping found
    return size;
  }
}

