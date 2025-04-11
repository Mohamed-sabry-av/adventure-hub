import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, Input, OnDestroy, OnInit } from '@angular/core';
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
    MobileQuickAddComponent
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

  private resizeSubscription?: Subscription;
  private clickOutsideSubscription?: Subscription;

  constructor(
    private productService: ProductService,
    private cartService: CartService,
    private cdr: ChangeDetectorRef
  ) {this.modifiedProduct = {} as Product;}

  ngOnInit(): void {
    if (!this.product) return;
    this.fetchVariations();
    this.checkIfMobile();
    this.modifiedProduct = { ...this.product };
    this.setupResizeListener();
    this.setupClickOutsideListener();
  }

  ngOnDestroy(): void {
    this.resizeSubscription?.unsubscribe();
    this.clickOutsideSubscription?.unsubscribe();
  }

  private setupResizeListener(): void {
    this.resizeSubscription = fromEvent(window, 'resize')
      .pipe(debounceTime(200))
      .subscribe(() => {
        this.checkIfMobile();
        this.updateVisibleColors();
        this.updateVisibleSizes();
      });
  }

  private setupClickOutsideListener(): void {
    // Close the mobile quick add dropdown when clicking outside
    this.clickOutsideSubscription = fromEvent(document, 'click')
      .subscribe((event: Event) => {
        if (this.mobileQuickAddExpanded) {
          // Check if the click target is inside the quick add component
          const target = event.target as HTMLElement;
          const quickAddEl = document.querySelector('.mobile-quick-add-section');
          const sizeOverlayEl = document.querySelector('.mobile-size-selector-overlay');

          if (quickAddEl && sizeOverlayEl) {
            if (!quickAddEl.contains(target) && !sizeOverlayEl.contains(target)) {
              this.mobileQuickAddExpanded = false;
            }
          }
        }
      });
  }

  private checkIfMobile(): void {
    this.isMobile = window.innerWidth < 768;
    // Reset mobile expand state when switching between mobile and desktop
    if (!this.isMobile) {
      this.mobileQuickAddExpanded = false;
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
      }
    });
  }

  private getColorOptions(): { color: string; image: string; inStock: boolean }[] {
    if (!this.variations) return [];
    const colorMap = new Map<string, { image: string; inStock: boolean }>();
    this.variations.forEach((v) => {
      const colorAttr = v.attributes?.find((attr: any) => attr.name === 'Color');
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
      inStock: data.inStock
    }));
    return options.length > 0 ? options : [];
  }

  private getSizesForColor(color: string): { size: string; inStock: boolean }[] {
    if (!this.variations) return [];
    const sizesMap = new Map<string, boolean>();
    const filteredVariations = color
      ? this.variations.filter((v) => v.attributes?.some((attr: any) => attr.name === 'Color' && attr.option === color))
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
      return;
    }
  
    const defaultColor = this.product.default_attributes?.find((attr: any) => attr.name === 'Color')?.option;
  
    if (defaultColor && this.colorOptions.length > 0) {
      const matchingColor = this.colorOptions.find((opt) => opt.color.toLowerCase() === defaultColor.toLowerCase());
      if (matchingColor) {
        this.selectColor(matchingColor.color, matchingColor.image); 
      }
    } else if (this.colorOptions.length > 0) {
      this.selectColor(this.colorOptions[0].color, this.colorOptions[0].image);
    }
  
    this.updateSelectedVariation();
  }

  selectColor(color: string, image: string): void {
    this.selectedColor = color;
    this.displayedImages = this.variations 
         ?.filter((v) => v.attributes?.some((attr: any) => attr.name === 'Color' && attr.option === color))
      .map((v) => ({ src: v.image?.src || image })) || [];
    this.currentSlide = 0;
    this.uniqueSizes = this.getSizesForColor(color);
    this.selectedSize = null;
    this.updateVisibleSizes();
    this.cdr.detectChanges()
  
    this.updateSelectedVariation();
  }

  selectSize(size: string): void {
    this.selectedSize = size;
    this.updateSelectedVariation();

    // If on desktop with both color and size, auto-add to cart when both are selected
    if (!this.isMobile && this.hasColors() && this.hasSizes() && this.selectedColor && size) {
      this.onAddToCartWithOptions();
    }
  }

  onSelectSize(size: string): void {
    this.selectSize(size);
  }

  onHover(hovered: boolean): void {
    this.isHovered = hovered;
    // For products with images but no color variations, cycle through images on hover
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
    return this.product.images?.length ? Array.from({ length: this.product.images.length }, (_, i) => i) : [];
  }



  scrollColors(direction: number): void {
    this.colorScrollIndex = Math.max(
      0,
      Math.min(this.colorScrollIndex + direction, this.maxColorScrollIndex)
    );
    this.updateVisibleColors();
  }

  scrollSizes(direction: number): void {
    this.sizeScrollIndex = Math.max(0, Math.min(this.sizeScrollIndex + direction, this.maxSizeScrollIndex));
    this.updateVisibleSizes();
  }

  private updateVisibleColors(): void {
    this.maxColorScrollIndex = Math.max(0, Math.ceil(this.colorOptions.length / this.colorsPerPage) - 1);
    const start = this.colorScrollIndex * this.colorsPerPage;
    this.visibleColors = this.colorOptions.slice(start, start + this.colorsPerPage);
  }

  private updateVisibleSizes(): void {
    this.maxSizeScrollIndex = Math.max(0, Math.ceil(this.uniqueSizes.length / this.sizesPerPage) - 1);
    const start = this.sizeScrollIndex * this.sizesPerPage;
    this.visibleSizes = this.uniqueSizes.slice(start, start + this.sizesPerPage);
  }

  onAddToCartWithOptions(): void {
    if (this.isAddToCartDisabled()) return;
    let productToAdd: Product = { ...this.product }; 
    let variationId: number | undefined;
    
    if(this.variations.length>0){
      const selectedVariation = this.variations.find((variation)=>{
        const colorAttr = variation.attributes?.find((attr:any)=> attr.name ==='Color')
        const sizeAttr = variation.attributes?.find((attr:any)=> attr.name ==='Size')
        const matchColor =!this.hasColors() || (colorAttr && colorAttr.option === this.selectedColor)
        const matchSize =!this.hasSizes() || (sizeAttr && sizeAttr.option === this.selectedSize)
        return matchColor && matchSize
        
      })


  
      
      // if(selectedVariation){
      //   this.cartService.addProductToCart(this.product, selectedVariation.id);
      // }else{
        
      // }
    }

    // console.log('Adding to cart:', {
    //   product: this.product,
    //   color: this.selectedColor,
    //   size: this.selectedSize
    // });

    this.cartService.addProductToCart(this.product);

    // Reset selection after adding to cart
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
    const brandAttr = this.product?.attributes?.find((attr:any) => attr.name === 'Brand');
    const option = brandAttr?.options?.[0];
    return option ? (typeof option === 'string' ? option : option.name || option.value || null) : null;
  }

  getBrandSlug(): string | null {
    const brandAttr = this.product?.attributes?.find((attr:any) => attr.name === 'Brand');
    const option = brandAttr?.options?.[0];
    return option && typeof option !== 'string' ? option.slug || null : null;
  }

  private updateSelectedVariation(): void {
    if (this.variations.length > 0) {
      this.selectedVariation = this.variations.find((variation) => {
        const colorAttr = variation.attributes?.find((attr: any) => attr.name === 'Color');
        const sizeAttr = variation.attributes?.find((attr: any) => attr.name === 'Size');
        const matchColor = !this.hasColors() || (colorAttr && colorAttr.option === this.selectedColor);
        const matchSize = !this.hasSizes() || (sizeAttr && sizeAttr.option === this.selectedSize);
        return matchColor && matchSize;
      });
  
      if (this.selectedVariation && !this.selectedVariation.quantity_limits) {
        this.selectedVariation.quantity_limits = this.product.quantity_limits;
      }
            if (!this.selectedVariation && this.selectedColor) {
        this.selectedVariation = this.variations.find((variation) =>
          variation.attributes?.some((attr: any) => attr.name === 'Color' && attr.option === this.selectedColor)
        ) || null;
      }
  
      console.log('Selected Variation:', this.selectedVariation);
    }
  }
}
