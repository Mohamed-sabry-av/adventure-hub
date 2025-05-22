import {
  ChangeDetectorRef,
  Component,
  Input,
  OnDestroy,
  OnInit,
  PLATFORM_ID,
  Inject,
  HostListener,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { ProductService } from '../../../../core/services/product.service';
import { Product, Variation } from '../../../../interfaces/product';
import { animate, style, transition, trigger } from '@angular/animations';
import { Subscription, fromEvent } from 'rxjs';
import { debounceTime } from 'rxjs/operators';
import { CartService } from '../../../../features/cart/service/cart.service';
import { CardImageSliderComponent } from '../components/card-image-slider/card-image-slider.component';
import { CardDetailsComponent } from '../components/card-details/card-details.component';
import { ColorSwatchesComponent } from '../components/color-swatches/color-swatches.component';
import { MobileQuickAddComponent } from '../components/add-to-cart/quick-add-btn.component';
import { WishlistButtonComponent } from '../components/wishlist-button/wishlist-button.component';
import { VariationService } from '../../../../core/services/variation.service';
import { UIService } from '../../../../shared/services/ui.service';

@Component({
  selector: 'app-product-card',
  standalone: true,
  imports: [
    CommonModule,
    CardImageSliderComponent,
    CardDetailsComponent,
    ColorSwatchesComponent,
    MobileQuickAddComponent,
    WishlistButtonComponent,
  ],
  templateUrl: './product-card.component.html',
  styleUrls: ['./product-card.component.css'],
  animations: [
    trigger('fadeInOut', [
      transition(':enter', [
        style({ opacity: 0 }),
        animate('300ms ease-in', style({ opacity: 1 })),
      ]),
      transition(':leave', [animate('300ms ease-out', style({ opacity: 0 }))]),
    ]),
    trigger('slideUpDown', [
      transition(':enter', [
        style({ transform: 'translateY(100%)', opacity: 0 }),
        animate(
          '300ms ease-out',
          style({ transform: 'translateY(0)', opacity: 1 })
        ),
      ]),
      transition(':leave', [
        animate(
          '300ms ease-in',
          style({ transform: 'translateY(100%)', opacity: 0 })
        ),
      ]),
    ]),
  ],
})
export class ProductCardComponent implements OnInit, OnDestroy {
  @Input() product!: Product;

  variationsLoaded = false;
  variations: Variation[] = [];
  colorOptions: { color: string; image: string; inStock: boolean }[] = [];
  uniqueSizes: { size: string; inStock: boolean }[] = [];
  selectedColor: string | null = null;
  selectedSize: string | null = null;
  currentSlide: number = 0;
  isHovered: boolean = false;
  isMobile: boolean = false;
  colorScrollIndex: number = 0;
  visibleColors: { color: string; image: string; inStock: boolean }[] = [];
  maxColorScrollIndex: number = 0;
  colorsPerPage: number = 5;
  sizeScrollIndex: number = 0;
  visibleSizes: { size: string; inStock: boolean }[] = [];
  maxSizeScrollIndex: number = 0;
  sizesPerPage: number = 5;
  mobileQuickAddExpanded: boolean = false;
  displayedImages: { src: string }[] = [];
  modifiedProduct: Product;
  selectedVariation: Variation | null = null;
  isCardHovered: boolean = false;
  hasInStockSizes: boolean = false; // New property to track if there are in-stock sizes

  private resizeSubscription?: Subscription;

  constructor(
    private productService: ProductService,
    private cartService: CartService,
    private cdr: ChangeDetectorRef,
    @Inject(PLATFORM_ID) private platformId: Object,
    private variationService: VariationService,
    private uiService: UIService
  ) {
    this.modifiedProduct = {} as Product;
  }

  ngOnInit(): void {
    if (!this.product) return;
    this.initializeWithProduct();
    this.checkIfMobile();
    this.modifiedProduct = { ...this.product };
    this.setupResizeListener();
  }

  ngOnDestroy(): void {
    this.resizeSubscription?.unsubscribe();
  }

  @HostListener('mouseenter')
  onMouseEnter() {
    this.isCardHovered = true;
  }
  @HostListener('mouseleave')
  onMouseLeave() {
    this.isCardHovered = false;
  }

  private setupResizeListener(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.resizeSubscription = fromEvent(window, 'resize')
        .pipe(debounceTime(200))
        .subscribe(() => {
          this.checkIfMobile();
          this.updateVisibleColors();
          this.updateVisibleSizes();
        });
    }
  }

  private checkIfMobile(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.isMobile = window.innerWidth < 768;
      if (!this.isMobile) {
        this.mobileQuickAddExpanded = false;
      }
    }
  }

  private initializeWithProduct(): void {
    if (this.product.variations && Array.isArray(this.product.variations) && this.product.variations.length > 0) {
      this.variations = this.product.variations;
      this.processVariations();
    } else {
      this.fetchVariations();
    }
  }

  private processVariations(): void {
    this.colorOptions = this.getColorOptions();
    this.uniqueSizes = this.getSizesForColor(this.selectedColor || '');
    this.hasInStockSizes = this.uniqueSizes.some((size) => size.inStock); // Check if there are in-stock sizes
    this.setDefaultVariation();
    this.updateVisibleColors();
    this.updateVisibleSizes();
    this.variationsLoaded = true;
    this.cdr.markForCheck();
  }

  private fetchVariations(): void {
    this.productService.getProductVariations(this.product.id).subscribe({
      next: (variations: Variation[]) => {
        this.variations = variations || [];
        this.processVariations();
      },
      error: (error: any) => {
        console.error('Error fetching variations:', error);
        this.variations = [];
        this.variationsLoaded = true;
        this.cdr.markForCheck();
      },
    });
  }

  private getColorOptions(): {
    color: string;
    image: string;
    inStock: boolean;
  }[] {
    if (!this.variations) return [];
    const colorMap = new Map<string, { image: string; inStock: boolean }>();
    this.variations.forEach((v) => {
      const colorAttr = v.attributes?.find(
        (attr: any) => attr.name === 'Color'
      );
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
    return options.length > 0 ? options : [];
  }

  private getSizesForColor(
    color: string | null
  ): { size: string; inStock: boolean }[] {
    if (!this.variations) return [];
    const sizesMap = new Map<string, boolean>();
    const filteredVariations = color
      ? this.variations.filter((v) =>
          v.attributes?.some(
            (attr: any) => attr.name === 'Color' && attr.option === color
          )
        )
      : this.variations;

    filteredVariations.forEach((v) => {
      const sizeAttr = v.attributes?.find((attr: any) => attr.name === 'Size');
      if (sizeAttr) {
        const inStock = v.stock_status === 'instock';
        if (!sizesMap.has(sizeAttr.option) || inStock) {
          sizesMap.set(sizeAttr.option, inStock);
        }
      }
    });

    return Array.from(sizesMap, ([size, inStock]) => ({ size, inStock })).sort(
      (a, b) => {
        if (a.inStock && !b.inStock) return -1;
        if (!a.inStock && b.inStock) return 1;
        const aNum = Number(a.size);
        const bNum = Number(b.size);
        return !isNaN(aNum) && !isNaN(bNum)
          ? aNum - bNum
          : a.size.localeCompare(b.size);
      }
    );
  }

  private setDefaultVariation(): void {
    if (this.variations.length === 0) {
      return;
    }

    // Handle default color
    const defaultColor = this.product.default_attributes?.find(
      (attr: any) => attr.name === 'Color'
    )?.option;

    if (defaultColor && this.colorOptions.length > 0) {
      const matchingColor = this.colorOptions.find(
        (opt) => opt.color.toLowerCase() === defaultColor.toLowerCase()
      );
      if (matchingColor && matchingColor.inStock) {
        this.selectColor(matchingColor.color, matchingColor.image);
      } else {
        const firstInStockColor = this.colorOptions.find((opt) => opt.inStock);
        if (firstInStockColor) {
          this.selectColor(firstInStockColor.color, firstInStockColor.image);
        } else if (this.colorOptions.length > 0) {
          this.selectColor(this.colorOptions[0].color, this.colorOptions[0].image);
        }
      }
    } else if (this.colorOptions.length > 0) {
      const firstInStockColor = this.colorOptions.find((opt) => opt.inStock);
      if (firstInStockColor) {
        this.selectColor(firstInStockColor.color, firstInStockColor.image);
      } else {
        this.selectColor(this.colorOptions[0].color, this.colorOptions[0].image);
      }
    }

    // Handle default size
    const defaultSize = this.product.default_attributes?.find(
      (attr: any) => attr.name === 'Size'
    )?.option;

    if (defaultSize && this.uniqueSizes.length > 0) {
      const matchingSize = this.uniqueSizes.find(
        (size) => size.size.toLowerCase() === defaultSize.toLowerCase()
      );
      if (matchingSize && matchingSize.inStock) {
        this.selectedSize = matchingSize.size;
      } else {
        const firstInStockSize = this.uniqueSizes.find((size) => size.inStock);
        if (firstInStockSize) {
          this.selectedSize = firstInStockSize.size;
        } else if (this.uniqueSizes.length > 0) {
          this.selectedSize = this.uniqueSizes[0].size; // Fallback to first size if none in stock
        }
      }
    } else if (this.uniqueSizes.length > 0) {
      const firstInStockSize = this.uniqueSizes.find((size) => size.inStock);
      if (firstInStockSize) {
        this.selectedSize = firstInStockSize.size;
      } else {
        this.selectedSize = this.uniqueSizes[0].size; // Fallback to first size if none in stock
      }
    }

    this.findAndSetSelectedVariation();
  }

  selectColor(color: string, image: string): void {
    this.selectedColor = color;
    this.uniqueSizes = this.getSizesForColor(color);
    this.hasInStockSizes = this.uniqueSizes.some((size) => size.inStock); // Update in-stock sizes

    if (this.selectedSize) {
      const sizeStillAvailable = this.uniqueSizes.find(
        (s) => s.size === this.selectedSize
      );
      if (!sizeStillAvailable || !sizeStillAvailable.inStock) {
        const firstInStockSize = this.uniqueSizes.find((s) => s.inStock);
        this.selectedSize = firstInStockSize ? firstInStockSize.size : this.uniqueSizes[0]?.size || null;
      }
    } else {
      const firstInStockSize = this.uniqueSizes.find((s) => s.inStock);
      this.selectedSize = firstInStockSize ? firstInStockSize.size : this.uniqueSizes[0]?.size || null;
    }

    this.updateVisibleSizes();
    this.findAndSetSelectedVariation();

    if (this.modifiedProduct) {
      const variationsWithThisColor = this.variations.filter((v) =>
        v.attributes?.some(
          (attr: any) => attr.name === 'Color' && attr.option === color
        )
      );

      if (variationsWithThisColor.length > 0) {
        const imagesForThisColor: { src: string }[] = [];
        variationsWithThisColor.forEach((v) => {
          if (v.image?.src && imagesForThisColor.length < 2) {
            if (!imagesForThisColor.some((img) => img.src === v.image.src)) {
              imagesForThisColor.push({ src: v.image.src });
            }
          }
        });

        if (imagesForThisColor.length > 0) {
          this.modifiedProduct = {
            ...this.modifiedProduct,
            images: imagesForThisColor,
          };
          this.currentSlide = 0;
        }
      }
    }

    this.cdr.markForCheck();
  }

  findAndSetSelectedVariation(): void {
    if (!this.selectedColor && !this.selectedSize) {
      this.selectedVariation = null;
      return;
    }

    const matchingVariation = this.variations.find((v) => {
      const matchesColor =
        !this.selectedColor ||
        v.attributes?.some(
          (attr: any) =>
            attr.name === 'Color' && attr.option === this.selectedColor
        );
      const matchesSize =
        !this.selectedSize ||
        v.attributes?.some(
          (attr: any) =>
            attr.name === 'Size' && attr.option === this.selectedSize
        );
      return matchesColor && matchesSize;
    });

    this.selectedVariation = matchingVariation || null;

    if (this.selectedVariation && this.selectedVariation.image?.src) {
      const variationImages = Array.isArray(this.selectedVariation.image.src)
        ? this.selectedVariation.image.src.map((src: any) => ({ src }))
        : [{ src: this.selectedVariation.image.src }];

      this.modifiedProduct = {
        ...this.modifiedProduct,
        images: variationImages,
      };
      this.currentSlide = 0;
    }

    this.cdr.markForCheck();
  }

  private updateVisibleColors(): void {
    if (!this.colorOptions || this.colorOptions.length === 0) {
      this.visibleColors = [];
      return;
    }

    const start = this.colorScrollIndex * this.colorsPerPage;
    const end = Math.min(
      start + this.colorsPerPage,
      this.colorOptions.length
    );
    this.visibleColors = this.colorOptions.slice(start, end);

    // Calculate the maximum index for color scrolling
    this.maxColorScrollIndex = Math.max(
      0,
      Math.ceil(this.colorOptions.length / this.colorsPerPage) - 1
    );
  }

  updateVisibleSizes(): void {
    if (!this.uniqueSizes || this.uniqueSizes.length === 0) {
      this.visibleSizes = [];
      return;
    }

    const startIndex = this.sizeScrollIndex;
    const endIndex = Math.min(
      startIndex + this.sizesPerPage,
      this.uniqueSizes.length
    );
    this.visibleSizes = this.uniqueSizes.slice(startIndex, endIndex);
    this.maxSizeScrollIndex = Math.max(
      0,
      this.uniqueSizes.length - this.sizesPerPage
    );
  }

  scrollColors(direction: number): void {
    const newIndex = this.colorScrollIndex + direction;
    if (newIndex >= 0 && newIndex <= this.maxColorScrollIndex) {
      this.colorScrollIndex = newIndex;
      this.updateVisibleColors();
    }
  }

  scrollSizes(direction: number): void {
    const newIndex = this.sizeScrollIndex + direction;
    if (newIndex >= 0 && newIndex <= this.maxSizeScrollIndex) {
      this.sizeScrollIndex = newIndex;
      this.updateVisibleSizes();
    }
  }

  onHover(isHovered: boolean): void {
    this.isHovered = isHovered;
    this.cdr.markForCheck();
  }

  goToSlide(index: number): void {
    this.currentSlide = index;
  }

  onSelectSize(size: string): void {
    this.selectedSize = size;
    this.findAndSetSelectedVariation();
    this.cdr.markForCheck();
  }

  /**
   * Toggle the mobile quick add panel
   */
  toggleMobileQuickAdd(): void {
    this.mobileQuickAddExpanded = !this.mobileQuickAddExpanded;
    
    // If we're closing the panel, ensure to clear the active quick add in the service
    if (!this.mobileQuickAddExpanded) {
      // Clear active quick add in service
      if (this.product) {
        this.uiService.setActiveQuickAddProduct(null);
      }
      
      // If the user has selected a color and size, make sure we find and set the selected variation
      if (this.selectedColor && this.selectedSize) {
      this.findAndSetSelectedVariation();
      }
    }
    
    // Close any expanded panel when clicking elsewhere on the page
    if (isPlatformBrowser(this.platformId) && !this.isMobile) {
      if (this.mobileQuickAddExpanded) {
        // Handle clicking outside to close
        const clickHandler = (e: MouseEvent) => {
          // If click is outside the options panel, close it
          const optionsPanel = document.querySelector('.options-panel');
          const quickAddBtn = document.querySelector('.circular-add-button');
          
          if (optionsPanel && quickAddBtn) {
            const target = e.target as Node;
            const isClickInside = optionsPanel.contains(target) || quickAddBtn.contains(target);
            
            if (!isClickInside) {
              this.mobileQuickAddExpanded = false;
              this.uiService.setActiveQuickAddProduct(null);
              this.cdr.markForCheck();
              document.removeEventListener('click', clickHandler);
            }
          }
        };
        
        // Add the click handler with a small delay to avoid immediate triggering
        setTimeout(() => {
          document.addEventListener('click', clickHandler);
        }, 100);
      }
    }
    
    this.cdr.markForCheck();
  }

  onAddToCartWithOptions(
    options: { quantity: number } = { quantity: 1 }
  ): void {
    if (!this.selectedVariation && this.variations.length > 0) {
      return;
    }

    const productToAdd = this.variationService.prepareProductForCart(
      this.product,
      this.selectedVariation,
      options.quantity
    );

    this.cartService.addProductToCart(productToAdd);
    // Don't open cart immediately - will be handled by the service
  }

  hasColors(): boolean {
    return this.colorOptions.length > 0;
  }

  hasSizes(): boolean {
    return this.uniqueSizes.length > 0;
  }

  getBrandName(): any | null {
    const brandAttr = this.product?.attributes?.find(
      (attr: any) => attr.name === 'Brand'
    );
    const option = brandAttr?.options?.[0];
    return option
      ? typeof option === 'string'
        ? option
        : option.name || option.value || null
      : null;
  }

  getBrandSlug(): string | null {
    if (!this.product.meta_data) return null;

    const brandMeta = this.product.meta_data.find(
      (meta: any) => meta.key === '_brand_slug' || meta.key === 'brand_slug'
    );

    return brandMeta
      ? brandMeta.value
      : this.getBrandName()?.toLowerCase().replace(/\s+/g, '-');
  }

  calculateDiscountPercentage(): number {
    if (!this.product.regular_price || !this.product.sale_price) {
      return 0;
    }
    
    const regularPrice = parseFloat(this.product.regular_price);
    const salePrice = parseFloat(this.product.sale_price);
    
    if (isNaN(regularPrice) || isNaN(salePrice) || regularPrice <= 0) {
      return 0;
    }
    
    const discount = Math.round(((regularPrice - salePrice) / regularPrice) * 100);
    return discount;
  }
}