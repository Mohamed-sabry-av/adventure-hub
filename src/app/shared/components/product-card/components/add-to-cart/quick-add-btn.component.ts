import {
  Component,
  Input,
  Output,
  EventEmitter,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  OnInit,
  Inject,
  PLATFORM_ID,
  OnDestroy,
  ElementRef,
  HostListener,
  ViewChild,
  Renderer2,
  AfterViewInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { trigger, transition, style, animate } from '@angular/animations';
import { SizeSelectorComponent } from '../size-selector/size-selector.component';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ProductService } from '../../../../../core/services/product.service';
import { Product, Variation } from '../../../../../interfaces/product';
import { SideOptionsService } from '../../../../../core/services/side-options.service';
import { CartService } from '../../../../../features/cart/service/cart.service';
import { VariationService } from '../../../../../core/services/variation.service';
import { UIService } from '../../../../../shared/services/ui.service';
import { Observable, Subscription } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-mobile-quick-add',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './quick-add-btn.component.html',
  styleUrls: ['./quick-add-btn.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
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
        style({ transform: 'translateY(20px)', opacity: 0 }),
        animate('300ms ease-out', style({ transform: 'translateY(0)', opacity: 1 })),
      ]),
      transition(':leave', [
        animate('300ms ease-in', style({ transform: 'translateY(20px)', opacity: 0 })),
      ]),
    ]),
  ],
})
export class MobileQuickAddComponent implements OnInit, OnDestroy, AfterViewInit {
  @Input() uniqueSizes: { size: string; inStock: boolean }[] = [];
  @Input() selectedSize: string | null = null;
  @Input() colorOptions: { color: string; image: string; inStock: boolean }[] = [];
  @Input() selectedColor: string | null = null;
  @Input() mobileQuickAddExpanded: boolean = false;
  @Input() isMobile: boolean = false;
  @Input() isHovered: boolean = false;
  @Input() visibleColors: { color: string; image: string; inStock: boolean }[] = [];
  @Input() product: Product | null = null;
  @Input() selectedVariation: any | null = null;
  @Input() variations: Variation[] = [];
  @Input() quantity: number = 1;

  @Output() toggleMobileQuickAdd = new EventEmitter<void>();
  @Output() selectSize = new EventEmitter<string>();
  @Output() selectColor = new EventEmitter<{ color: string; image: string }>();
  @Output() addToCart = new EventEmitter<{ quantity: number }>();

  @ViewChild('optionsPanel') optionsPanel?: ElementRef;

  quantityValue: number = 1;
  addSuccess: boolean = false;
  showOutOfStockVariations: boolean = true;
  isLoading: boolean = false;
  loadingMap$: Observable<{ [key: string]: boolean }>;
  optionsVisible: boolean = false;
  private subscriptions: Subscription = new Subscription();
  private activeQuickAddSubscription: Subscription = new Subscription();

  constructor(
    private cdr: ChangeDetectorRef,
    private router: Router,
    @Inject(PLATFORM_ID) private platformId: Object,
    private productService: ProductService,
    private sideOptionsService: SideOptionsService,
    private variationService: VariationService,
    private cartService: CartService,
    private uiService: UIService,
    private elementRef: ElementRef,
    private renderer: Renderer2,
  ) {
    this.loadingMap$ = this.uiService.loadingMap$;
  }

  ngOnInit() {
    this.quantityValue = this.quantity || 1;
    
    // Debug - log product stock status
    if (this.product) {
      console.log('Product type:', this.product.type);
      console.log('Product stock status:', this.product.stock_status);
      console.log('Product purchasable:', this.product.purchasable);
    }
    
    // Debug - log color options
    if (this.colorOptions && this.colorOptions.length > 0) {
      console.log('Color options:', this.colorOptions);
    }
    
    // Subscribe to loading state changes
    this.subscriptions.add(
      this.loadingMap$.subscribe(loadingMap => {
        if (loadingMap && !loadingMap['add']) {
          // When loading finishes, show success indicator
          if (this.isLoading) {
            this.isLoading = false;
            this.addSuccess = true;
            setTimeout(() => {
              this.addSuccess = false;
              this.cdr.markForCheck();
            }, 2000);
          }
        }
      })
    );
    
    // Subscribe to active quick add panel changes
    this.activeQuickAddSubscription = this.uiService.activeQuickAddProductId$.subscribe(activeProductId => {
      // If another product's quick add panel became active and this one is open, close it
      if (activeProductId !== null && this.product && activeProductId !== this.product.id && this.optionsVisible) {
        this.optionsVisible = false;
        this.cdr.markForCheck();
      }
    });
  }

  ngOnDestroy() {
    // Clean up all subscriptions to prevent memory leaks
    this.subscriptions.unsubscribe();
    this.activeQuickAddSubscription.unsubscribe();
  }

  ngAfterViewInit() {
    // Add event listener for scroll to update panel position
    window.addEventListener('scroll', this.updatePanelPosition.bind(this), true);
    window.addEventListener('resize', this.updatePanelPosition.bind(this), true);
  }

  onToggleOptionsPanel() {
    if (this.product?.type === 'simple') {
      this.onAddToCart();
      return;
    }

    this.toggleOptions();
  }

  onAddToCart() {
    if (!this.product) {
      console.error('No product provided');
      return;
    }

    // For simple products, just add directly
    if (this.product.type === 'simple') {
      this.addSimpleProductToCart();
      return;
    }

    // For variable products, require both color and size selection if applicable
    if (this.product.type === 'variable' && !this.selectedVariation) {
      this.toggleOptions();
      return;
    }

    this.isLoading = true;
    
    const cartProduct = this.variationService.prepareProductForCart(
      this.product,
      this.selectedVariation,
      this.quantityValue
    );

    this.cartService.addProductToCart(cartProduct);
    this.addToCart.emit({ quantity: this.quantityValue });
    this.optionsVisible = false;
    // Clear active quick add when closing
    this.uiService.setActiveQuickAddProduct(null);
  }

  /**
   * Handle adding a simple product to cart
   */
  addSimpleProductToCart() {
    if (!this.product) return;

    // Double check product is in stock and purchasable
    if (this.product.stock_status !== 'instock' || this.product.purchasable === false) {
      this.uiService.showError('This product is currently out of stock');
      return;
    }
    
    this.isLoading = true;
    
    const cartProduct = this.variationService.prepareProductForCart(
      this.product,
      null,
      1 // Default quantity 1 for quick add
    );

    this.cartService.addProductToCart(cartProduct);
    this.addToCart.emit({ quantity: 1 });
  }

  /**
   * Toggle options panel for variable products
   */
  toggleOptions() {
    this.optionsVisible = !this.optionsVisible;
    
    // Update active quick add panel in service
    if (this.optionsVisible && this.product) {
      this.uiService.setActiveQuickAddProduct(this.product.id);
    } else {
      this.uiService.setActiveQuickAddProduct(null);
    }
    
    this.toggleMobileQuickAdd.emit();
  }

  isReadyToAddToCart(): boolean {
    if (!this.product) return false;
    
    // Simple products are always ready if in stock and purchasable
    if (this.product.type === 'simple') {
      return this.product.stock_status === 'instock' && this.product.purchasable !== false;
    }
    
    // Variable products need a selected variation that's in stock
    return !!this.selectedVariation && this.selectedVariation.stock_status === 'instock';
  }

  incrementQuantity() {
    const maxQty = this.selectedVariation?.stock_quantity || 10;
    if (this.quantityValue < maxQty) {
      this.quantityValue++;
    }
  }

  decrementQuantity() {
    if (this.quantityValue > 1) {
      this.quantityValue--;
    }
  }

  formatColorName(colorName: string): string {
    return this.variationService.formatColorName(colorName);
  }

  /**
   * Scroll sizes horizontally
   * @param container The size options container element
   * @param scrollAmount Amount to scroll in pixels (positive for right, negative for left)
   */
  scrollSizes(container: HTMLElement, scrollAmount: number): void {
    if (container) {
      const currentScroll = container.scrollLeft;
      container.scrollTo({
        left: currentScroll + scrollAmount,
        behavior: 'smooth'
      });
    }
  }

  setColorAndSize(color: string, size: string | null = null) {
    if (color) {
      this.selectColor.emit({ color, image: this.getImageForColor(color) });

      if (size) {
        this.selectSize.emit(size);
      } else {
        const sizesForColor = this.variationService.getSizesForColor(this.variations, color);
        const firstInStockSize = sizesForColor.find(s => s.inStock);
        if (firstInStockSize) {
          this.selectSize.emit(firstInStockSize.size);
        } else if (sizesForColor.length > 0 && this.showOutOfStockVariations) {
          this.selectSize.emit(sizesForColor[0].size);
        }
      }
    }
  }

  private getImageForColor(color: string): string {
    const colorOption = this.colorOptions.find(opt => opt.color === color);
    return colorOption?.image || '';
  }

  /**
   * Convert color names to valid CSS color values
   */
  getColorValue(colorName: string): string {
    // Handle common color names that may come as text
    const colorMap: {[key: string]: string} = {
      'black': '#000000',
      'white': '#FFFFFF',
      'red': '#FF0000',
      'blue': '#0000FF',
      'green': '#008000',
      'yellow': '#FFFF00',
      'purple': '#800080',
      'pink': '#FFC0CB',
      'orange': '#FFA500',
      'brown': '#A52A2A',
      'gray': '#808080',
      'grey': '#808080',
    };
    
    // If it's already a hex code or rgb value, return as is
    if (colorName.startsWith('#') || colorName.startsWith('rgb')) {
      return colorName;
    }
    
    // Check if we have a mapping for this color name
    const lowerColor = colorName.toLowerCase();
    if (colorMap[lowerColor]) {
      return colorMap[lowerColor];
    }
    
    // Otherwise, it might be a CSS color name
    return lowerColor;
  }

  private updatePanelPosition(): void {
    if (!this.optionsVisible || !this.optionsPanel) return;

    const panel = this.optionsPanel.nativeElement;
    const button = this.elementRef.nativeElement.querySelector('.circular-add-button');
    const card = this.elementRef.nativeElement.closest('.product-card');

    if (!panel || !button || !card) return;

    const panelRect = panel.getBoundingClientRect();
    const buttonRect = button.getBoundingClientRect();
    const cardRect = card.getBoundingClientRect();

    // Calculate available space
    const spaceAbove = buttonRect.top;
    const spaceBelow = window.innerHeight - buttonRect.bottom;
    
    // Set panel position
    if (spaceAbove > spaceBelow && spaceAbove >= 200) {
      // Show above if there's enough space
      this.renderer.removeClass(panel, 'show-below');
      this.renderer.setStyle(panel, '--panel-top-offset', `${spaceAbove}px`);
    } else {
      // Show below
      this.renderer.addClass(panel, 'show-below');
    }

    // Ensure panel stays within card boundaries horizontally
    const rightOverflow = panelRect.right - cardRect.right;
    if (rightOverflow > 0) {
      this.renderer.setStyle(panel, 'right', `${rightOverflow}px`);
    }
  }

  @HostListener('window:scroll', ['$event'])
  onScroll() {
    this.updatePanelPosition();
  }

  @HostListener('window:resize', ['$event'])
  onResize() {
    this.updatePanelPosition();
  }
}
