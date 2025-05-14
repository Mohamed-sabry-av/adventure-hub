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

@Component({
  selector: 'app-mobile-quick-add',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './quick-add-btn.component.html',
  styleUrls: ['./quick-add-btn.component.css'],
  animations: [
    trigger('fadeInOut', [
      transition(':enter', [
        style({ opacity: 0 }),
        animate('300ms ease-in', style({ opacity: 1 })),
      ]),
      transition(':leave', [animate('300ms ease-out', style({ opacity: 0 }))]),
    ]),
  ],
})
export class MobileQuickAddComponent implements OnInit, OnDestroy {
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

  quantityValue: number = 1;
  addSuccess: boolean = false;
  showOutOfStockVariations: boolean = true;
  isLoading: boolean = false;
  loadingMap$: Observable<{ [key: string]: boolean }>;
  private loadingSubscription: Subscription | null = null;

  constructor(
    private cdr: ChangeDetectorRef,
    private router: Router,
    @Inject(PLATFORM_ID) private platformId: Object,
    private productService: ProductService,
    private sideOptionsService: SideOptionsService,
    private variationService: VariationService,
    private cartService: CartService,
    private uiService: UIService
  ) {
    this.loadingMap$ = this.uiService.loadingMap$;
  }

  ngOnInit() {
    this.quantityValue = this.quantity || 1;
    
    // Subscribe to loading state changes
    this.loadingSubscription = this.loadingMap$.subscribe(loadingMap => {
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
    });
  }

  ngOnDestroy() {
    if (this.loadingSubscription) {
      this.loadingSubscription.unsubscribe();
    }
  }

  onAddToCart() {
    if (!this.product) {
      console.error('No product provided');
      return;
    }

    if (this.product.type === 'variable' && !this.selectedVariation) {
      console.error('No variation selected for variable product');
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
  }

  onToggleOptionsPanel() {
    if (!this.product) {
      console.error('No product provided');
      return;
    }

    // If it's a simple product, add directly to cart
    if (this.product.type === 'simple') {
      // Check if the product is in stock before adding
      if (this.product.stock_status === 'outofstock' || !this.product.purchasable) {
        // If out of stock, show a message using UIService
        this.uiService.showError('This product is currently out of stock');
        return;
      }
      
      this.isLoading = true;
      
      const cartProduct = this.variationService.prepareProductForCart(
        this.product,
        null,
        1 // Default quantity 1 for quick add
      );

      // The cart will open automatically from the effect
      this.cartService.addProductToCart(cartProduct);
      
      this.addToCart.emit({ quantity: 1 });
    } 
    // If it has variations, open the side options panel
    else {
      this.sideOptionsService.openSideOptions({
        product: this.product,
        variations: this.variations,
        selectedVariation: this.selectedVariation,
        uniqueSizes: this.uniqueSizes,
        selectedSize: this.selectedSize,
        colorOptions: this.colorOptions,
        selectedColor: this.selectedColor,
        visibleColors: this.visibleColors,
        isMobile: this.isMobile,
      });
    }
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
}
