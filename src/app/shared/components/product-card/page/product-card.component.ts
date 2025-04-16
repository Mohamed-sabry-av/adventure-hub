import { CommonModule, isPlatformBrowser } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, ElementRef, Inject, Input, OnDestroy, OnInit, PLATFORM_ID } from '@angular/core';
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
import { SeoService } from '../../../../core/services/seo.service';

declare var _learnq: any;

@Component({
  selector: 'app-product-card',
  standalone: true,
  imports: [
    CommonModule,
    CardImageSliderComponent,
    CardDetailsComponent,
    ColorSwatchesComponent,
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
  selectedVariation: Variation | any = null;
  schemaData: any;
  private observer: IntersectionObserver | null = null;
  private hasTracked = false;

  private resizeSubscription?: Subscription;
  private clickOutsideSubscription?: Subscription;

  constructor(
    private productService: ProductService,
    private cartService: CartService,
    private cdr: ChangeDetectorRef,private el: ElementRef,
    private seoService: SeoService,
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
    this.setupClickOutsideListener();

    if (typeof _learnq !== 'undefined' && this.product) {
      _learnq.push([
        'track',
        'Viewed Product',
        {
          ProductID: this.product.id,
          ProductName: this.product.name,
          Price: this.product.price,
          Categories: this.product.categories?.map((cat) => cat.name) || [],
          Brand: this.getBrandName() || '',
        },
      ]);
      console.log('Klaviyo: Viewed Product tracked');
    }
  }
 


  ngOnDestroy(): void {
    this.resizeSubscription?.unsubscribe();
    this.clickOutsideSubscription?.unsubscribe();
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

  private setupClickOutsideListener(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.clickOutsideSubscription = fromEvent(document, 'click').subscribe(
        (event: Event) => {
          if (this.mobileQuickAddExpanded) {
            const target = event.target as HTMLElement;
            const quickAddEl = document.querySelector('.mobile-quick-add-section');
            const sizeOverlayEl = document.querySelector('.mobile-size-selector-overlay');

            if (quickAddEl && sizeOverlayEl) {
              if (!quickAddEl.contains(target) && !sizeOverlayEl.contains(target)) {
                this.mobileQuickAddExpanded = false;
              }
            }
          }
        }
      );
    }
  }

  private setupIntersectionObserver() {
    this.observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !this.hasTracked) {
            this.trackProductView();
            this.hasTracked = true; // منع التكرار
            this.observer?.unobserve(this.el.nativeElement);
          }
        });
      },
      { threshold: 0.5 } // المنتج لازم يكون 50% ظاهر عشان يتتبع
    );

    this.observer.observe(this.el.nativeElement);
  }

  private trackProductView() {
    console.log('Klaviyo: Viewed Product tracked', this.product);
  }

  checkIfMobile() {
    if (isPlatformBrowser(this.platformId)) {
      this.isMobile = window.innerWidth <= 768;
    } else {
      this.isMobile = false;
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
        this.setDefaultVariation();
      },
      error: (error: any) => {
        console.error('Error fetching variations:', error);
        this.variationsLoaded = true;
      },
    });
  }

  private getColorOptions(): { color: string; image: string; inStock: boolean }[] {
    if (!this.variations) return [];
    const colorMap = new Map<string, { image: string; inStock: boolean }>();

    this.variations.forEach((v) => {
      const colorAttr = v.attributes?.find((attr: any) => attr.name === 'Color');
      if (colorAttr && v.image?.src) {
        const current = colorMap.get(colorAttr.option) || { image: v.image.src, inStock: false };
        const inStock = current.inStock || v.stock_status === 'instock';
        colorMap.set(colorAttr.option, { image: v.image.src, inStock });
      }
    });

    const options = Array.from(colorMap, ([color, data]) => ({
      color,
      image: data.image,
      inStock: data.inStock,
    }));

    return options.sort((a, b) => (b.inStock ? 1 : 0) - (a.inStock ? 1 : 0));
  }

  private getSizesForColor(color: string): { size: string; inStock: boolean }[] {
    if (!this.variations) return [];
    const sizesMap = new Map<string, boolean>();
    const filteredVariations = color
      ? this.variations.filter((v) =>
          v.attributes?.some((attr: any) => attr.name === 'Color' && attr.option === color)
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

    return Array.from(sizesMap, ([size, inStock]) => ({ size, inStock })).sort((a, b) => {
      if (a.inStock && !b.inStock) return -1;
      if (!a.inStock && b.inStock) return 1;
      const aNum = Number(a.size);
      const bNum = Number(b.size);
      return !isNaN(aNum) && !isNaN(bNum) ? aNum - bNum : a.size.localeCompare(b.size);
    });
  }

  private setDefaultVariation(): void {
    if (this.variations.length === 0) {
      this.displayedImages = this.product.images?.map((img) => ({ src: img.src })) || [];
      return;
    }

    const defaultColor = this.product.default_attributes?.find(
      (attr: any) => attr.name === 'Color'
    )?.option;

    let selectedColorOption = null;
    if (defaultColor) {
      selectedColorOption = this.colorOptions.find(
        (opt) => opt.color.toLowerCase() === defaultColor.toLowerCase() && opt.inStock
      );
    }

    if (!selectedColorOption) {
      selectedColorOption = this.colorOptions.find((opt) => opt.inStock) || this.colorOptions[0];
    }

    if (selectedColorOption) {
      this.selectColor(selectedColorOption.color, selectedColorOption.image);
    } else {
      this.displayedImages = this.product.images?.map((img) => ({ src: img.src })) || [];
    }

    this.updateSelectedVariation();
  }

  selectColor(color: string, image: string): void {
    this.selectedColor = color;
    const variationImages = this.variations
      ?.filter((v) =>
        v.attributes?.some((attr: any) => attr.name === 'Color' && attr.option === color)
      )
      .map((v) => ({
        src: v.image?.src || image,
        alt: v.image?.alt || this.product.name,
      }))
      .filter((img) => img.src);

    this.displayedImages =
      variationImages.length > 0
        ? variationImages
        : [{ src: image, alt: this.product.name }];

    this.currentSlide = 0;
    this.uniqueSizes = this.getSizesForColor(color);
    this.selectedSize = null;
    this.updateVisibleSizes();
    this.updateSelectedVariation();
    this.cdr.detectChanges();
  }

  selectSize(size: string): void {
    this.selectedSize = size;
    this.updateSelectedVariation();

    if (!this.isMobile && this.hasColors() && this.hasSizes() && this.selectedColor && size) {
      this.onAddToCartWithOptions();
    }
  }

  onSelectSize(size: string): void {
    this.selectSize(size);
  }

  onHover(hovered: boolean): void {
    this.isHovered = hovered;
    if (this.colorOptions.length === 0 && this.product.images?.length > 1) {
      this.currentSlide = hovered ? 1 : 0;
    }
  }

  toggleMobileQuickAdd(): void {
    this.mobileQuickAddExpanded = !this.mobileQuickAddExpanded;
    if (!this.mobileQuickAddExpanded) this.selectedSize = null;
  }

  goToSlide(index: number): void {
    if (this.product.images?.length) this.currentSlide = index;
  }

  getDotCount(): number[] {
    return this.product.images?.length
      ? Array.from({ length: this.product.images.length }, (_, i) => i)
      : [];
  }

  scrollColors(direction: number): void {
    this.colorScrollIndex = Math.max(
      0,
      Math.min(this.colorScrollIndex + direction, this.maxColorScrollIndex)
    );
    this.updateVisibleColors();
  }

  scrollSizes(direction: number): void {
    this.sizeScrollIndex = Math.max(
      0,
      Math.min(this.sizeScrollIndex + direction, this.maxSizeScrollIndex)
    );
    this.updateVisibleSizes();
  }

  private updateVisibleColors(): void {
    this.maxColorScrollIndex = Math.max(
      0,
      Math.ceil(this.colorOptions.length / this.colorsPerPage) - 1
    );
    const start = this.colorScrollIndex * this.colorsPerPage;
    this.visibleColors = this.colorOptions.slice(start, start + this.colorsPerPage);
  }

  private updateVisibleSizes(): void {
    this.maxSizeScrollIndex = Math.max(
      0,
      Math.ceil(this.uniqueSizes.length / this.sizesPerPage) - 1
    );
    const start = this.sizeScrollIndex * this.sizesPerPage;
    this.visibleSizes = this.uniqueSizes.slice(start, start + this.sizesPerPage);
  }

  onAddToCartWithOptions(): void {
    if (this.isAddToCartDisabled()) return;
    let productToAdd: Product = { ...this.product };
    let variationId: number | undefined;

    if (this.variations.length > 0) {
      const selectedVariation = this.variations.find((variation) => {
        const colorAttr = variation.attributes?.find(
          (attr: any) => attr.name === 'Color'
        );
        const sizeAttr = variation.attributes?.find(
          (attr: any) => attr.name === 'Size'
        );
        const matchColor =
          !this.hasColors() ||
          (colorAttr && colorAttr.option === this.selectedColor);
        const matchSize =
          !this.hasSizes() || (sizeAttr && sizeAttr.option === this.selectedSize);
        return matchColor && matchSize;
      });

      if (selectedVariation) {
        variationId = selectedVariation.id;
      }
    }

    this.cartService.addProductToCart(this.product);
    if (typeof _learnq !== 'undefined') {
      _learnq.push([
        'track',
        'Added to Cart',
        {
          ProductID: productToAdd.id,
          ProductName: productToAdd.name,
          Price: productToAdd.price,
          VariationID: variationId || null,
          Color: this.selectedColor || null,
          Size: this.selectedSize || null,
          Brand: this.getBrandName() || '',
          Categories: productToAdd.categories?.map((cat) => cat.name) || [],
        },
      ]);
      console.log('Klaviyo: Added to Cart tracked');
    }

    if (this.isMobile) {
      this.mobileQuickAddExpanded = false;
    }
  }

  isAddToCartDisabled(): boolean {
    const needsSize = this.hasSizes() && !this.selectedSize;
    const needsColor = this.hasColors() && !this.selectedColor;
    return needsSize || needsColor;
  }

  hasColors(): boolean {
    return this.colorOptions.length > 0;
  }

  hasSizes(): boolean {
    return this.uniqueSizes.length > 0;
  }

  getBrandName(): string | null {
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
    const brandAttr = this.product?.attributes?.find(
      (attr: any) => attr.name === 'Brand'
    );
    const option = brandAttr?.options?.[0];
    return option && typeof option !== 'string' ? option.slug || null : null;
  }

  private updateSelectedVariation(): void {
    if (this.variations.length > 0) {
      this.selectedVariation = this.variations.find((variation) => {
        const colorAttr = variation.attributes?.find(
          (attr: any) => attr.name === 'Color'
        );
        const sizeAttr = variation.attributes?.find(
          (attr: any) => attr.name === 'Size'
        );
        const matchColor =
          !this.hasColors() ||
          (colorAttr && colorAttr.option === this.selectedColor);
        const matchSize =
          !this.hasSizes() || (sizeAttr && sizeAttr.option === this.selectedSize);
        return matchColor && matchSize;
      });

      if (this.selectedVariation && !this.selectedVariation.quantity_limits) {
        this.selectedVariation.quantity_limits = this.product.quantity_limits;
      }
      if (!this.selectedVariation && this.selectedColor) {
        this.selectedVariation =
          this.variations.find((variation) =>
            variation.attributes?.some(
              (attr: any) => attr.name === 'Color' && attr.option === this.selectedColor
            )
          ) || null;
      }
    }
  }
}