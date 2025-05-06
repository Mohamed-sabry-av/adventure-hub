import {
  Component,
  OnInit,
  OnDestroy,
  ChangeDetectorRef,
  Inject,
  PLATFORM_ID,
  ChangeDetectionStrategy,
  inject,
} from '@angular/core';
import { AsyncPipe, CommonModule, isPlatformBrowser } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import {
  SideOptionsService,
  SideOptionsState,
} from '../../../core/services/side-options.service';
import { animate, style, transition, trigger } from '@angular/animations';
import { map, Observable, Subject, takeUntil, distinctUntilChanged } from 'rxjs';
import { UIService } from '../../services/ui.service';
import { VariationService } from '../../../core/services/variation.service';
import { CartService } from '../../../features/cart/service/cart.service';

@Component({
  selector: 'app-side-options',
  standalone: true,
  imports: [CommonModule, FormsModule, AsyncPipe],
  templateUrl: './side-options.component.html',
  styleUrls: ['./side-options.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [
    trigger('slideInFromRight', [
      transition(':enter', [
        style({ transform: 'translateX(100%)', opacity: 0 }),
        animate(
          '300ms ease-out',
          style({ transform: 'translateX(0)', opacity: 1 })
        ),
      ]),
      transition(':leave', [
        animate(
          '300ms ease-in',
          style({ transform: 'translateX(100%)', opacity: 0 })
        ),
      ]),
    ]),
    trigger('slideUpFromBottom', [
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
    trigger('fadeInOut', [
      transition(':enter', [
        style({ opacity: 0 }),
        animate('300ms ease-in', style({ opacity: 1 })),
      ]),
      transition(':leave', [animate('300ms ease-out', style({ opacity: 0 }))]),
    ]),
  ],
})
export class SideOptionsComponent implements OnInit, OnDestroy {
  state: SideOptionsState = {
    isOpen: false,
    product: null,
    selectedVariation: null,
    uniqueSizes: [],
    selectedSize: null,
    colorOptions: [],
    selectedColor: null,
    visibleColors: [],
    isMobile: false,
    variations: [],
    showOutOfStockVariations: true,
  };

  quantity: number = 1;
  addSuccess: boolean = false;
  errorMessage: string | null = null;
  private destroy$ = new Subject<void>();
  private uiService = inject(UIService);
  private sideOptionsService = inject(SideOptionsService);
  private variationService = inject(VariationService);

  spinnerIsLoading$: Observable<any> = this.uiService.loadingMap$;

  constructor(
    private cartService: CartService,
    private cdr: ChangeDetectorRef,
    private router: Router,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  ngOnInit(): void {
    this.sideOptionsService.state$
      .pipe(
        takeUntil(this.destroy$),
        distinctUntilChanged((prev, curr) => JSON.stringify(prev) === JSON.stringify(curr)) // Prevent unnecessary updates
      )
      .subscribe((state) => {
        this.state = state;
        this.cdr.markForCheck();
      });
  }

  stateIsOpen$: Observable<any> = this.sideOptionsService.state$.pipe(
    map((response: SideOptionsState) => {
      return { isOpen: response.isOpen, isMobile: response.isMobile };
    })
  );

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  closeSideOptions(): void {
    this.sideOptionsService.closeSideOptions();
  }

  selectSize(size: string): void {
    this.sideOptionsService.selectSize(size);
  }

  selectColor(color: string, image: string): void {
    this.sideOptionsService.selectColor(color, image);
  }

  onAddToCart(buyItNow?: boolean): void {
    if (this.isAddToCartDisabled()) {
      this.showError('Please select a valid variation or the selected variation is out of stock');
      return;
    }

    if (!this.state.product) {
      this.showError('No product provided');
      return;
    }

    const productToAdd = this.variationService.prepareProductForCart(
      this.state.product,
      this.state.selectedVariation,
      this.quantity
    );

    if (!productToAdd) {
      this.showError('Unable to add product to cart');
      return;
    }

    this.cartService.addProductToCart(productToAdd, buyItNow);
    // this.uiService.showMessage('Product added to cart!', true);

    this.addSuccess = true;
    setTimeout(() => {
      this.addSuccess = false;
      this.cdr.markForCheck();
    }, 2000);
  }

  isAddToCartDisabled(): boolean {
    if (!this.state.product) return true;

    if (this.state.product.type === 'simple') {
      return this.state.product.stock_status !== 'instock';
    }

    const needsSize = this.hasSizes() && !this.state.selectedSize;
    const needsColor = this.hasColors() && !this.state.selectedColor;

    if (needsSize || needsColor) {
      return true;
    }

    return !this.state.selectedVariation?.stock_status || 
           this.state.selectedVariation.stock_status !== 'instock';
  }

  hasSizes(): boolean {
    return this.state.uniqueSizes.length > 0;
  }

  hasColors(): boolean {
    return this.state.colorOptions.length > 0;
  }

  decreaseQuantity() {
    if (this.quantity > 1) {
      this.quantity--;
      this.cdr.markForCheck();
    }
  }

  increaseQuantity() {
    const max = this.state.selectedVariation?.stock_quantity || 
                this.state.product?.quantity_limits?.maximum || 10;
    if (this.quantity < max) {
      this.quantity++;
      this.cdr.markForCheck();
    }
  }

  onQuantityChange(event: Event) {
    const input = event.target as HTMLInputElement;
    const value = parseInt(input.value);
    const max = this.state.selectedVariation?.stock_quantity || 
                this.state.product?.quantity_limits?.maximum || 10;

    if (!isNaN(value) && value > 0 && value <= max) {
      this.quantity = value;
    } else {
      this.quantity = 1;
      input.value = '1';
    }
    this.cdr.markForCheck();
  }

  getProductName(): string {
    return this.state.product?.name || '';
  }

  getSKU(): string {
    return this.state.product?.sku || '';
  }

  getCurrentPrice(): string {
    const product = this.state.product;
    const variation = this.state.selectedVariation;
    if (!product) return '';

    if (variation && this.state.product.type === 'variable') {
      return `${product.currency || 'AED'} ${variation.price}`;
    }

    if (product.on_sale && product.sale_price) {
      return `${product.currency || 'AED'} ${product.sale_price}`;
    }

    return `${product.currency || 'AED'} ${product.price}`;
  }

  getOldPrice(): string {
    const product = this.state.product;
    const variation = this.state.selectedVariation;
    if (!product || !product.on_sale) return '';

    if (variation && this.state.product.type === 'variable') {
      return variation.regular_price && variation.regular_price !== variation.price
        ? `${product.currency || 'AED'} ${variation.regular_price}`
        : '';
    }

    return `${product.currency || 'AED'} ${product.regular_price}`;
  }

  getSelectedColorImage(): string {
    if (!this.state.selectedColor || this.state.colorOptions.length === 0) {
      return this.state.product?.images?.[0]?.src || '';
    }

    const selectedColorOption = this.state.colorOptions.find(
      (option) => option.color === this.state.selectedColor
    );

    return (
      selectedColorOption?.image || this.state.product?.images?.[0]?.src || ''
    );
  }

  viewProductDetails() {
    if (this.state.product?.id) {
      this.router.navigate(['/product', this.state.product.slug]);
      this.closeSideOptions();
    }
  }

  onBuyItNow() {
    this.onAddToCart(true);
  }

  private showError(message: string) {
    this.errorMessage = message;
    // this.uiService.showMessage(message, false);
    setTimeout(() => {
      this.errorMessage = null;
      this.cdr.markForCheck();
    }, 3000);
  }
}