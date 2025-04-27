import { CommonModule, isPlatformBrowser } from '@angular/common';
import {
  ChangeDetectorRef,
  Component,
  Input,
  OnDestroy,
  OnInit,
  PLATFORM_ID,
  Inject,
  HostListener
} from '@angular/core';
import { ProductService } from '../../../../core/services/product.service';
import { Product, Variation } from '../../../../interfaces/product';
import { animate, style, transition, trigger } from '@angular/animations';
import { Subscription, fromEvent } from 'rxjs';
import { debounceTime } from 'rxjs/operators';
import { CartService } from '../../../../features/cart/service/cart.service';
import { CardImageSliderComponent } from '../components/card-image-slider/card-image-slider.component';
import { CardDetailsComponent } from '../components/card-details/card-details.component';
import { ColorSwatchesComponent } from '../components/color-swatches/color-swatches.component';
import { SizeSelectorComponent } from '../components/size-selector/size-selector.component';
import { MobileQuickAddComponent } from '../components/add-to-cart/quick-add-btn.component';

@Component({
  selector: 'app-product-card',
  standalone: true,
  imports: [
    CommonModule,
    CardImageSliderComponent,
    CardDetailsComponent,
    ColorSwatchesComponent,
    SizeSelectorComponent,
    MobileQuickAddComponent,
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

  private resizeSubscription?: Subscription;

  constructor(
    private productService: ProductService,
    private cartService: CartService,
    private cdr: ChangeDetectorRef,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    this.modifiedProduct = {} as Product;
  }

  ngOnInit(): void {
    if (!this.product) return;
    this.fetchVariations();
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

  private fetchVariations(): void {
    this.productService.getProductVariations(this.product.id).subscribe({
      next: (variations: Variation[]) => {
        this.variations = variations || [];
        this.colorOptions = this.getColorOptions();
        this.uniqueSizes = this.getSizesForColor('');
        this.setDefaultVariation();
        this.updateVisibleColors();
        this.updateVisibleSizes();
        this.variationsLoaded = true;
      },
      error: (error: any) => {
        console.error('Error fetching variations:', error);
        this.variationsLoaded = true;
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
    color: string
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

    const defaultColor = this.product.default_attributes?.find(
      (attr: any) => attr.name === 'Color'
    )?.option;

    if (defaultColor && this.colorOptions.length > 0) {
      const matchingColor = this.colorOptions.find(
        (opt) => opt.color.toLowerCase() === defaultColor.toLowerCase()
      );
      if (matchingColor) {
        this.selectColor(matchingColor.color, matchingColor.image);
      } else if (this.colorOptions.length > 0) {
        this.selectColor(
          this.colorOptions[0].color,
          this.colorOptions[0].image
        );
      }
    } else if (this.colorOptions.length > 0) {
      this.selectColor(this.colorOptions[0].color, this.colorOptions[0].image);
    }

    const defaultSize = this.product.default_attributes?.find(
      (attr: any) => attr.name === 'Size'
    )?.option;

    if (defaultSize && this.uniqueSizes.length > 0) {
      const matchingSize = this.uniqueSizes.find(
        (size) => size.size.toLowerCase() === defaultSize.toLowerCase()
      );
      if (matchingSize) {
        this.selectedSize = matchingSize.size;
      } else if (this.uniqueSizes.length > 0) {
        this.selectedSize = this.uniqueSizes[0].size;
      }
    } else if (this.uniqueSizes.length > 0) {
      const firstInStockSize = this.uniqueSizes.find(size => size.inStock);
      if (firstInStockSize) {
        this.selectedSize = firstInStockSize.size;
      }
    }

    this.findAndSetSelectedVariation();
  }

  selectColor(color: string, image: string): void {
    this.selectedColor = color;

    this.uniqueSizes = this.getSizesForColor(color);

    if (this.selectedSize) {
      const sizeStillAvailable = this.uniqueSizes.find(
        (s) => s.size === this.selectedSize
      );
      if (!sizeStillAvailable || !sizeStillAvailable.inStock) {
        const firstInStockSize = this.uniqueSizes.find((s) => s.inStock);
        this.selectedSize = firstInStockSize ? firstInStockSize.size : null;
      }
    }

    this.updateVisibleSizes();
    this.findAndSetSelectedVariation();

    // Update modifiedProduct with images from the selected color variation
    if (this.modifiedProduct) {
      // Find all variations with this color
      const variationsWithThisColor = this.variations.filter(
        (v) => v.attributes?.some(
          (attr: any) => attr.name === 'Color' && attr.option === color
        )
      );

      // If we found variations with this color and they have images
      if (variationsWithThisColor.length > 0) {
        const imagesForThisColor: {src: string}[] = [];

        // Collect up to 2 images
        variationsWithThisColor.forEach(v => {
          if (v.image?.src && imagesForThisColor.length < 2) {
            // Make sure we don't add duplicate images
            if (!imagesForThisColor.some(img => img.src === v.image.src)) {
              imagesForThisColor.push({ src: v.image.src });
            }
          }
        });

        // If we found at least one image, update the product's images
        if (imagesForThisColor.length > 0) {
          this.modifiedProduct = {
            ...this.modifiedProduct,
            images: imagesForThisColor
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

    // Update modifiedProduct with the selected variation's details
    if (this.selectedVariation && this.selectedVariation.image?.src) {
      // Get images for this variation
      const variationImages = Array.isArray(this.selectedVariation.image.src) ?
        this.selectedVariation.image.src.map((src:any) => ({ src })) :
        [{ src: this.selectedVariation.image.src }];

      // Update modified product with variation images
      this.modifiedProduct = {
        ...this.modifiedProduct,
        images: variationImages
      };
      this.currentSlide = 0;
    }

    this.cdr.markForCheck();
  }

  updateVisibleColors(): void {
    if (!this.colorOptions || this.colorOptions.length === 0) {
      this.visibleColors = [];
      return;
    }

    const startIndex = this.colorScrollIndex;
    const endIndex = Math.min(
      startIndex + this.colorsPerPage,
      this.colorOptions.length
    );
    this.visibleColors = this.colorOptions.slice(startIndex, endIndex);
    this.maxColorScrollIndex = Math.max(
      0,
      this.colorOptions.length - this.colorsPerPage
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

  toggleMobileQuickAdd(): void {
    this.mobileQuickAddExpanded = !this.mobileQuickAddExpanded;
    this.cdr.markForCheck();
  }

  onAddToCartWithOptions(options: { quantity: number } = { quantity: 1 }): void {
    if (!this.selectedVariation && this.variations.length > 0) {
      return;
    }

    const productToAdd = {
      id: this.selectedVariation ? this.selectedVariation.id : this.product.id,
      name: this.product.name,
      quantity: options.quantity,
      price: this.selectedVariation
        ? this.selectedVariation.price
        : this.product.price,
      image: this.selectedVariation?.image?.src ?? this.product.images?.[0]?.src,
    };

    // Call addProductToCart without subscribing, as it doesn't return an Observable
    this.cartService.addProductToCart(productToAdd);

    // Show the side cart using cartMode
    this.cartService.cartMode(true);
  }

  hasColors(): boolean {
    return this.colorOptions.length > 0;
  }

  hasSizes(): boolean {
    return this.uniqueSizes.length > 0;
  }

  getBrandName(): any | null {
    if (!this.product.meta_data) return null;

    const brandMeta = this.product.meta_data.find(
      (meta: any) => meta.key === '_brand' || meta.key === 'brand'
    );

    return brandMeta ? brandMeta.value : null;
  }

  getBrandSlug(): string | null {
    if (!this.product.meta_data) return null;

    const brandMeta = this.product.meta_data.find(
      (meta: any) => meta.key === '_brand_slug' || meta.key === 'brand_slug'
    );

    return brandMeta ? brandMeta.value : this.getBrandName()?.toLowerCase().replace(/\s+/g, '-');
  }
}
