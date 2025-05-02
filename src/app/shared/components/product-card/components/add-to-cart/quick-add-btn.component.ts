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
export class MobileQuickAddComponent implements OnInit {
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

  constructor(
    private cdr: ChangeDetectorRef,
    private router: Router,
    @Inject(PLATFORM_ID) private platformId: Object,
    private productService: ProductService,
    private sideOptionsService: SideOptionsService,
    private variationService: VariationService,
    private cartService: CartService
  ) {}

  ngOnInit() {
    this.quantityValue = this.quantity || 1;
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

    const cartProduct = this.variationService.prepareProductForCart(
      this.product,
      this.selectedVariation,
      this.quantityValue
    );

    this.cartService.addProductToCart(cartProduct);

    this.addSuccess = true;
    setTimeout(() => {
      this.addSuccess = false;
      this.cdr.markForCheck();
    }, 2000);

    this.addToCart.emit({ quantity: this.quantityValue });
  }

  onToggleOptionsPanel() {
    console.log('options Start Open');
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
