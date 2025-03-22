import { CommonModule } from '@angular/common';
import { Component, Input, OnInit, OnDestroy, ElementRef } from '@angular/core';
import { ProductService } from '../../../../core/services/product.service';
import { Product, Variation } from '../../../../interfaces/product';
import { CardImageSliderComponent } from '../components/card-image-slider/card-image-slider.component';
import { CardDetailsComponent } from '../components/card-details/card-details.component';
import { ColorSwatchesComponent } from '../components/color-swatches/color-swatches.component';
import { SizeSelectorComponent } from '../components/size-selector/size-selector.component';
import { AnimationBuilder, AnimationFactory, animate, style, transition, trigger } from '@angular/animations';
import { Subscription, fromEvent } from 'rxjs';
import { debounceTime } from 'rxjs/operators';

@Component({
  selector: 'app-product-card',
  standalone: true,
  imports: [
    CommonModule,
    CardImageSliderComponent,
    CardDetailsComponent,
    ColorSwatchesComponent,
    SizeSelectorComponent,
  ],
  templateUrl: './product-card.component.html',
  styleUrls: ['./product-card.component.css'],
  animations: [
    trigger('fadeInOut', [
      transition(':enter', [
        style({ opacity: 0 }),
        animate('300ms ease-in', style({ opacity: 1 })),
      ]),
      transition(':leave', [
        animate('300ms ease-out', style({ opacity: 0 }))
      ])
    ]),
    trigger('slideUpDown', [
      transition(':enter', [
        style({ transform: 'translateY(100%)', opacity: 0 }),
        animate('300ms ease-out', style({ transform: 'translateY(0)', opacity: 1 })),
      ]),
      transition(':leave', [
        animate('300ms ease-in', style({ transform: 'translateY(100%)', opacity: 0 }))
      ])
    ])
  ]
})
export class ProductCardComponent implements OnInit, OnDestroy {
  @Input() product!: Product;

  variations: Variation[] = [];
  colorOptions: { color: string; image: string; inStock: boolean }[] = [];
  uniqueSizes: { size: string; inStock: boolean }[] = [];
  selectedColor: string | null = null;
  currentSlide: number = 0;
  isHovered: boolean = false;
  selectedSize: string | null = null;
  sizeScrollIndex: number = 0;
  visibleSizes: { size: string; inStock: boolean }[] = [];
  maxScrollIndex: number = 0;

  // Auto image slider related properties
  private autoSlideInterval: any;
  private resizeSubscription?: Subscription;
  private mouseEnterSubscription?: Subscription;
  private mouseLeaveSubscription?: Subscription;

  constructor(
    private productService: ProductService,
    private el: ElementRef,
    private animationBuilder: AnimationBuilder
  ) {}

  ngOnInit(): void {
    console.log('Product Data:', this.product);
    this.fetchVariations();
    this.setupEventListeners();
  }

  ngOnDestroy(): void {
    this.stopAutoSlide();
    this.resizeSubscription?.unsubscribe();
    this.mouseEnterSubscription?.unsubscribe();
    this.mouseLeaveSubscription?.unsubscribe();
  }

  private setupEventListeners(): void {
    // Window resize listener to update visible sizes
    this.resizeSubscription = fromEvent(window, 'resize')
      .pipe(debounceTime(200))
      .subscribe(() => {
        this.updateVisibleSizes();
      });
  }



  private stopAutoSlide(): void {
    if (this.autoSlideInterval) {
      clearInterval(this.autoSlideInterval);
    }
  }

  private fetchVariations(): void {
    this.productService.getProductVariations(this.product.id).subscribe({
      next: (variations: Variation[]) => {
        this.variations = variations || [];
        this.colorOptions = this.getColorOptions();
        if (this.colorOptions.length > 0) {
          this.selectColor(this.colorOptions[0].color, this.colorOptions[0].image);
        } else {
          this.uniqueSizes = this.getSizesForColor('');
          this.updateVisibleSizes();
        }
      },
      error: (error: any) => {
        console.error('Error fetching variations:', error);
      },
    });
  }

  private getColorOptions(): { color: string; image: string; inStock: boolean }[] {
    const colorMap = new Map<string, { image: string; inStock: boolean }>();
    this.variations.forEach((v) => {
      const colorAttr = v.attributes.find((attr: any) => attr.name === 'Color');
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
    return options.length > 1 ? options : [];
  }

  private getSizesForColor(color: string): { size: string; inStock: boolean }[] {
    const sizesMap = new Map<string, boolean>();
    const filteredVariations = color
      ? this.variations.filter((v) => v.attributes.some((attr: any) => attr.name === 'Color' && attr.option === color))
      : this.variations;

    filteredVariations.forEach((v) => {
      const sizeAttr = v.attributes.find((attr: any) => attr.name === 'Size');
      if (sizeAttr) {
        const inStock = v.stock_status === 'instock';
        if (!sizesMap.has(sizeAttr.option) || inStock) {
          sizesMap.set(sizeAttr.option, inStock);
        }
      }
    });

    const sizesArray = Array.from(sizesMap, ([size, inStock]) => ({ size, inStock }));
    return sizesArray.sort((a, b) => {
      // Available sizes first
      if (a.inStock && !b.inStock) return -1;
      if (!a.inStock && b.inStock) return 1;

      // Try to parse as numbers for numerical sorting
      const aNum = Number(a.size);
      const bNum = Number(b.size);

      // If both are valid numbers, sort numerically
      if (!isNaN(aNum) && !isNaN(bNum)) {
        return aNum - bNum;
      }

      // Otherwise, sort alphabetically
      return a.size.localeCompare(b.size);
    });
  }

  selectColor(color: string, image: string): void {
    this.selectedColor = color;
    const selectedColorImages = this.variations
      .filter((v) => v.attributes.some((attr: any) => attr.name === 'Color' && attr.option === color))
      .map((v) => ({ src: v.image?.src || image }));

    if (selectedColorImages.length > 0) {
      this.product.images = selectedColorImages;
      this.currentSlide = 0;
    }
    this.uniqueSizes = this.getSizesForColor(color);
    this.selectedSize = null;
    this.updateVisibleSizes();

    // Apply a fade animation when changing color
    const fadeAnimation: AnimationFactory = this.animationBuilder.build([
      style({ opacity: 0.7 }),
      animate('300ms ease-in', style({ opacity: 1 })),
    ]);

    const player = fadeAnimation.create(this.el.nativeElement.querySelector('.slide img'));
    player.play();
  }

  onHover(hovered: boolean): void {
    this.isHovered = hovered;
    if (this.colorOptions.length === 0 && this.product.images?.length > 1) {
      this.currentSlide = hovered ? 1 : 0;
    }
  }

  selectSize(size: string): void {
    this.selectedSize = size;

    // Apply a pulse animation when selecting a size
    const pulseAnimation: AnimationFactory = this.animationBuilder.build([
      style({ transform: 'scale(1)' }),
      animate('150ms ease-in', style({ transform: 'scale(1.1)' })),
      animate('150ms ease-out', style({ transform: 'scale(1)' })),
    ]);

    const button = Array.from(this.el.nativeElement.querySelectorAll('.size-btn'))
      .find((el: any) => el.textContent.trim() === size);

    if (button) {
      const player = pulseAnimation.create(button);
      player.play();
    }
  }

  getBrandName(): string | null {
    const brandAttr = this.product?.attributes?.find((attr) => attr.name === 'Brand');
    if (brandAttr?.options?.length) {
      const option = brandAttr.options[0];
      return typeof option === 'string' ? option : option?.name || option.value || null;
    }
    return null;
  }

  getBrandSlug(): string | null {
    const brandAttr = this.product?.attributes?.find((attr) => attr.name === 'Brand');
    if (brandAttr?.options?.length) {
      const option = brandAttr.options[0];
      return typeof option === 'string' ? null : option?.slug || null;
    }
    return null;
  }

  goToSlide(index: number): void {
    if (this.product.images?.length > 0) {
      this.currentSlide = index;
    }
  }

  getDotCount(): number[] {
    return this.product?.images?.length ? Array.from({ length: this.product.images.length }, (_, i) => i) : [];
  }

  scrollSizes(direction: number): void {
    const sizesPerPage = 5;
    this.sizeScrollIndex = Math.max(0, Math.min(this.sizeScrollIndex + direction, this.maxScrollIndex));
    this.updateVisibleSizes();
  }

  private updateVisibleSizes(): void {
    const sizesPerPage = 5;
    this.maxScrollIndex = Math.max(0, Math.ceil(this.uniqueSizes.length / sizesPerPage) - 1);
    const start = this.sizeScrollIndex * sizesPerPage;
    this.visibleSizes = this.uniqueSizes.slice(start, start + sizesPerPage);
  }

  onAddToCart(product: any): void {
    console.log('Product added to cart:', product);

    // Create a ripple effect animation
    const button = this.el.nativeElement.querySelector('.add-to-cart-btn');
    if (button) {
      const rect = button.getBoundingClientRect();
      const ripple = document.createElement('span');
      ripple.className = 'ripple';
      ripple.style.position = 'absolute';
      ripple.style.width = '5px';
      ripple.style.height = '5px';
      ripple.style.background = 'rgba(255, 255, 255, 0.7)';
      ripple.style.borderRadius = '50%';
      ripple.style.transform = 'scale(0)';
      ripple.style.left = '50%';
      ripple.style.top = '50%';

      button.appendChild(ripple);

      // Animation
      ripple.animate(
        [
          { transform: 'scale(0)', opacity: 1 },
          { transform: 'scale(40)', opacity: 0 }
        ],
        {
          duration: 600,
          easing: 'ease-out'
        }
      ).onfinish = () => ripple.remove();
    }
  }
}
