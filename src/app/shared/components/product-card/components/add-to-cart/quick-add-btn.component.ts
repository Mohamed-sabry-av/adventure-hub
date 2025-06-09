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
        style({ opacity: 0 }),
        animate('200ms ease-out', style({ opacity: 1 })),
      ]),
      transition(':leave', [
        animate('200ms ease-in', style({ opacity: 0 })),
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

  // Bound event handlers to properly remove listeners
  private boundUpdatePanelPosition: any;
  private boundHandleTouchStart: any;
  private boundHandleTouchMove: any;
  private boundHandleTouchEnd: any;
  private boundHandleOutsideClick: any;

  constructor(
    private cdr: ChangeDetectorRef,
    private router: Router,
    @Inject(PLATFORM_ID) private platformId: Object,
    private productService: ProductService,
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
      // 
      // 
      // 
    }
    
    // Debug - log color options
    if (this.colorOptions && this.colorOptions.length > 0) {
      // 
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
    
    // Remove event listeners
    window.removeEventListener('scroll', this.boundUpdatePanelPosition);
    window.removeEventListener('resize', this.boundUpdatePanelPosition);
    document.removeEventListener('click', this.boundHandleOutsideClick);
    
    if (this.optionsPanel) {
      const panelElement = this.optionsPanel.nativeElement;
      panelElement.removeEventListener('touchstart', this.boundHandleTouchStart);
      panelElement.removeEventListener('touchmove', this.boundHandleTouchMove);
      panelElement.removeEventListener('touchend', this.boundHandleTouchEnd);
    }
  }

  ngAfterViewInit() {
    // Create bound methods for event listeners
    this.boundUpdatePanelPosition = this.updatePanelPosition.bind(this);
    this.boundHandleTouchStart = this.handleTouchStart.bind(this);
    this.boundHandleTouchMove = this.handleTouchMove.bind(this);
    this.boundHandleTouchEnd = this.handleTouchEnd.bind(this);
    this.boundHandleOutsideClick = this.handleOutsideClick.bind(this);
    
    // Add event listener for scroll to update panel position
    window.addEventListener('scroll', this.boundUpdatePanelPosition, {passive: true});
    window.addEventListener('resize', this.boundUpdatePanelPosition, {passive: true});
    
    // Add touch event listeners for better mobile experience
    if (this.optionsPanel) {
      const panelElement = this.optionsPanel.nativeElement;
      panelElement.addEventListener('touchstart', this.boundHandleTouchStart, {passive: true});
      panelElement.addEventListener('touchmove', this.boundHandleTouchMove, {passive: false});
      panelElement.addEventListener('touchend', this.boundHandleTouchEnd, {passive: true});
    }
    
    // Add document click listener to detect clicks outside the panel
    document.addEventListener('click', this.boundHandleOutsideClick);
  }

  onToggleOptionsPanel() {
    if (this.product?.type === 'simple') {
      // 
      this.onAddToCart();
      return;
    }

    // Always open options panel for variable products
    // 
    this.toggleOptions();
    this.cdr.markForCheck();
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

    // For products with only colors, if a color is selected, add to cart
    if (this.hasOnlyColors() && this.selectedColor) {
      this.isLoading = true;
      
      // Make sure we have the correct variation for this color
      if (!this.selectedVariation || 
          !this.selectedVariation.attributes?.some((attr:any) => 
            attr.name === 'Color' && attr.option === this.selectedColor)) {
        this.selectedVariation = this.findColorVariation(this.selectedColor);
      }
      
      const cartProduct = this.variationService.prepareProductForCart(
        this.product,
        this.selectedVariation,
        this.quantityValue
      );

      this.cartService.addProductToCart(cartProduct);
      this.addToCart.emit({ quantity: this.quantityValue });
      this.optionsVisible = false;
      this.uiService.setActiveQuickAddProduct(null);
      return;
    }

    // For variable products with both color and size, require both selections
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
   * Toggle the options panel visibility and handle associated state
   */
  toggleOptions() {
    this.optionsVisible = !this.optionsVisible;
    
    // Update active quick add panel in service
    if (this.optionsVisible && this.product) {
      this.uiService.setActiveQuickAddProduct(this.product.id);
      
      // Set a short timeout to allow the panel to render before positioning it
      setTimeout(() => {
        if (this.optionsPanel && this.optionsVisible) {
          const panel = this.optionsPanel.nativeElement;
          const isMobileView = window.innerWidth < 768;
          
          // Reset any previously applied styles that might affect positioning
          if (!isMobileView) {
            this.renderer.removeStyle(panel, 'top');
            this.renderer.removeStyle(panel, 'transform');
          }
          
          // Position the panel within the card
          const cardElement = this.elementRef.nativeElement.closest('.product-card');
          if (cardElement) {
            const cardRect = cardElement.getBoundingClientRect();
            
            // Ensure panel stays within card boundaries
            if (isMobileView) {
              // For mobile, use fixed positioning
              this.renderer.setStyle(panel, 'bottom', '80px');
              this.renderer.setStyle(panel, 'right', '8px');
              this.renderer.setStyle(panel, 'max-height', '250px');
              this.renderer.setStyle(panel, 'transform', 'none');
            } else {
              // For desktop, ensure it fits within the card height
              this.renderer.setStyle(panel, 'max-height', `${cardRect.height - 100}px`);
            }
          }
          
          // Update panel position after it's visible
          this.updatePanelPosition();
        }
      }, 10);
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
    
    // For variable products, we need both color and size selected (if applicable)
    if (this.colorOptions && this.colorOptions.length > 0) {
      // Color is required
      if (!this.selectedColor) return false;
    }
    
    if (this.uniqueSizes && this.uniqueSizes.length > 0) {
      // Size is required
      if (!this.selectedSize) return false;
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
    if (!colorName) return '';
    // Convert slug format to readable format
    return colorName
      .replace(/-/g, ' ')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }
  
  formatSizeName(size: string): string {
    if (!size) return '';
    // Convert dash format to dot format (e.g., "1-l" to "1.L")
    const formattedSize = size.replace(/-/g, '.').toUpperCase();
    return formattedSize;
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
    // For color, use provided value or keep existing
    if (color) {
      const image = this.getImageForColor(color);
      this.selectColor.emit({ color, image });
    }
    
    // For size, use provided value or keep existing
    if (size) {
      this.selectSize.emit(size);
    } else if (!this.hasOnlyColors() && color) {
      // For products with both colors and sizes, try to select a size automatically when color changes
      const sizesForColor = this.variationService.getSizesForColor(this.variations, color);
      const firstInStockSize = sizesForColor.find(s => s.inStock);
      if (firstInStockSize) {
        this.selectSize.emit(firstInStockSize.size);
      } else if (sizesForColor.length > 0 && this.showOutOfStockVariations) {
        this.selectSize.emit(sizesForColor[0].size);
      }
    }

    // For products with only colors, find the matching variation automatically
    if (this.hasOnlyColors() && color) {
      this.selectedVariation = this.findColorVariation(color);
    }

    this.cdr.markForCheck();
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

  /**
   * Update options panel position to ensure it stays within boundaries
   * during scrolling and viewport changes
   */
  private updatePanelPosition(): void {
    if (!this.optionsVisible || !this.optionsPanel) return;

    const panel = this.optionsPanel.nativeElement;
    const button = this.elementRef.nativeElement.querySelector('.circular-add-button');
    const card = this.elementRef.nativeElement.closest('.product-card');

    if (!panel || !button || !card) return;

    // Get necessary measurements
    const panelRect = panel.getBoundingClientRect();
    const buttonRect = button.getBoundingClientRect();
    const cardRect = card.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;

    // Check if we're on mobile
    const isMobileView = window.innerWidth < 768;

    // Make sure panel doesn't extend outside the card
    this.renderer.setStyle(panel, 'max-width', `${Math.min(230, cardRect.width - 20)}px`);
    
    if (isMobileView) {
      // On mobile, position panel at a fixed position relative to the button
      // This ensures it's always visible and doesn't move around unexpectedly
      this.renderer.setStyle(panel, 'bottom', '80px');
      this.renderer.setStyle(panel, 'right', '8px');
      this.renderer.setStyle(panel, 'transform', 'none');
      
      // Close panel only if card is completely out of view
      if (cardRect.bottom < 0 || cardRect.top > viewportHeight) {
        this.optionsVisible = false;
        this.cdr.markForCheck();
        return;
      }
    } else {
      // On desktop, position panel inside the card
      const spaceAbove = buttonRect.top - cardRect.top;
      const spaceBelow = cardRect.bottom - buttonRect.bottom;
      
      // Position relative to button and ensure it stays within card
      if (spaceBelow >= panelRect.height + 10) {
        // Enough space below, position panel below the button
        this.renderer.setStyle(panel, 'bottom', '35px');
        this.renderer.setStyle(panel, 'right', '10px');
      } else if (spaceAbove >= panelRect.height + 10) {
        // Enough space above, position panel above the button
        this.renderer.setStyle(panel, 'bottom', `${buttonRect.height + spaceBelow + 10}px`);
        this.renderer.setStyle(panel, 'right', '10px');
      } else {
        // Not enough space above or below, position panel to overlap as little as possible
        this.renderer.setStyle(panel, 'bottom', `${Math.max(35, spaceBelow + 35)}px`);
        this.renderer.setStyle(panel, 'right', '10px');
      }
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

  /**
   * Find the appropriate variation for a product with only colors
   */
  private findColorVariation(color: string): Variation | null {
    if (!this.variations || !color) return null;
    
    // First try to find an in-stock variation with the selected color
    const inStockVariation = this.variations.find(v => 
      v.attributes?.some((attr:any) => attr.name === 'Color' && attr.option === color) && 
      v.stock_status === 'instock'
    );
    
    if (inStockVariation) return inStockVariation;
    
    // If no in-stock variation found, find any variation with the selected color
    const anyVariation = this.variations.find(v => 
      v.attributes?.some((attr:any) => attr.name === 'Color' && attr.option === color)
    );
    
    return anyVariation || null;
  }

  /**
   * Check if the product has only colors and no sizes
   */
  hasOnlyColors(): boolean {
    // Always return false to force the options panel to open
    return false;
    // Original code: return this.colorOptions && this.colorOptions.length > 0 && 
    //        (!this.uniqueSizes || this.uniqueSizes.length === 0);
  }

  // Touch event handlers for better mobile scrolling experience
  private touchStartY: number = 0;
  private touchStartX: number = 0;
  private isScrolling: boolean = false;

  private handleTouchStart(event: TouchEvent) {
    if (event.touches.length === 1) {
      this.touchStartY = event.touches[0].clientY;
      this.touchStartX = event.touches[0].clientX;
      this.isScrolling = false;
    }
  }

  private handleTouchMove(event: TouchEvent) {
    if (!this.isScrolling && event.touches.length === 1) {
      const touchY = event.touches[0].clientY;
      const touchX = event.touches[0].clientX;
      const deltaY = this.touchStartY - touchY;
      const deltaX = this.touchStartX - touchX;
      
      // Determine if user is scrolling vertically or swiping horizontally
      if (Math.abs(deltaY) > Math.abs(deltaX)) {
        this.isScrolling = true;
        // If panel is already at the top and user is pulling down, prevent default to avoid page scroll
        const panel = event.currentTarget as HTMLElement;
        if (panel.scrollTop <= 0 && deltaY < 0) {
          event.preventDefault();
        }
        // If panel is at the bottom and user is pulling up, prevent default
        else if (panel.scrollTop + panel.clientHeight >= panel.scrollHeight && deltaY > 0) {
          event.preventDefault();
        }
      }
    }
  }

  private handleTouchEnd(event: TouchEvent) {
    this.isScrolling = false;
  }

  private handleOutsideClick(event: MouseEvent) {
    if (!this.optionsVisible) return;
    
    // Check if the click is outside the options panel and the add button
    const panel = this.optionsPanel?.nativeElement;
    const addButton = this.elementRef.nativeElement.querySelector('.circular-add-button');
    const productCard = this.elementRef.nativeElement.closest('.product-card');
    
    if (panel && addButton && productCard) {
      const clickedElement = event.target as HTMLElement;
      
      // If click is outside the product card, close the panel
      if (!productCard.contains(clickedElement)) {
        this.optionsVisible = false;
        this.uiService.setActiveQuickAddProduct(null);
        this.cdr.markForCheck();
      }
    }
  }

  /**
   * Check if the product has colors and sizes, but all colors have the same size options
   */
  allColorsHaveSameSizes(): boolean {
    if (!this.colorOptions || this.colorOptions.length <= 1 || !this.uniqueSizes || this.uniqueSizes.length === 0) {
      return false;
    }

    // 
    // 
    // 

    // Get all available sizes for each color
    const sizesByColor = new Map<string, Set<string>>();
    
    // For each color, find all available sizes
    for (const color of this.colorOptions) {
      const sizesForColor = this.variationService.getSizesForColor(this.variations, color.color);
      const sizeSet = new Set<string>(sizesForColor.map(s => s.size));
      sizesByColor.set(color.color, sizeSet);
      // );
    }
    
    // If we have only one color, no need to compare
    if (sizesByColor.size <= 1) {
      // 
      return false;
    }
    
    // Compare all size sets to see if they're identical
    const firstColorSizes = Array.from(sizesByColor.values())[0];
    const firstColorSizesArray = Array.from(firstColorSizes);
    // 
    
    // Check if all colors have the same set of sizes
    let allSame = true;
    for (const [color, sizeSet] of sizesByColor.entries()) {
      // If the size count is different, they're not the same
      if (sizeSet.size !== firstColorSizes.size) {
        // `);
        allSame = false;
        break;
      }
      
      // Check if all sizes from the first color exist in this color's sizes
      for (const size of firstColorSizesArray) {
        if (!sizeSet.has(size)) {
          // 
          allSame = false;
          break;
        }
      }
      
      if (!allSame) break;
    }
    
    // All colors have the same sizes
    // 
    return allSame;
  }
}

