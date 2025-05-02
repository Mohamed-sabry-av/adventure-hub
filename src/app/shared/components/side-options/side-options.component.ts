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
import { CartService } from '../../../features/cart/service/cart.service';
import { animate, style, transition, trigger } from '@angular/animations';
import { map, Observable, Subject, takeUntil } from 'rxjs';
import { UIService } from '../../services/ui.service';

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
  };

  quantity: number = 1;
  addSuccess: boolean = false;
  private destroy$ = new Subject<void>();
  private uiService = inject(UIService);
  private sideOptionsService = inject(SideOptionsService);

  spinnerIsLoading$: Observable<any> = this.uiService.loadingMap$;

  constructor(
    private cartService: CartService,
    private cdr: ChangeDetectorRef,
    private router: Router,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  ngOnInit(): void {
    this.sideOptionsService.state$
      .pipe(takeUntil(this.destroy$))
      .subscribe((state) => {
        this.state = state;
        if (state.product?.default_attributes?.length) {
          state.product.default_attributes.forEach((attr: any) => {
            if (attr.name === 'Color') {
              this.selectColor(attr.option, '');
            } else if (attr.name === 'Size') {
              this.selectSize(attr.option);
            }
          });
        }
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
    if (this.isAddToCartDisabled()) return;

    if (!this.state.product) return;

    const productToAdd = {
      id: this.state.selectedVariation
        ? this.state.selectedVariation.id
        : this.state.product.id,
      name: this.state.product.name,
      quantity: this.quantity,
      price: this.state.selectedVariation
        ? this.state.selectedVariation.price
        : this.state.product.price,
      image:
        this.state.selectedVariation?.image?.src ??
        this.state.product.images?.[0]?.src,
    };

    // Call addProductToCart
    this.cartService.addProductToCart(productToAdd, buyItNow);

    // Show success indication
    this.addSuccess = true;
    setTimeout(() => {
      this.addSuccess = false;
      this.cdr.markForCheck();
    }, 2000);
  }

  isAddToCartDisabled(): boolean {
    // Check if required selections are missing
    const needsSize = this.hasSizes() && !this.state.selectedSize;
    const needsColor = this.hasColors() && !this.state.selectedColor;

    if (needsSize || needsColor) {
      return true;
    }

    if (
      this.hasSizes() &&
      this.hasColors() &&
      this.state.selectedSize &&
      this.state.selectedColor
    ) {
      const selectedSizeObj = this.state.uniqueSizes.find(
        (size) => size.size === this.state.selectedSize
      );
      return !selectedSizeObj?.inStock;
    }

    if (this.hasSizes() && this.state.selectedSize) {
      const selectedSizeObj = this.state.uniqueSizes.find(
        (size) => size.size === this.state.selectedSize
      );
      return !selectedSizeObj?.inStock;
    }

    if (this.hasColors() && this.state.selectedColor) {
      const selectedColorObj = this.state.colorOptions.find(
        (color) => color.color === this.state.selectedColor
      );
      return !selectedColorObj?.inStock;
    }

    return false;
  }

  hasSizes(): boolean {
    return this.state.uniqueSizes.length > 0;
  }

  hasColors(): boolean {
    return this.state.colorOptions.length > 0;
  }

  // Quantity functions
  decreaseQuantity() {
    if (this.quantity > 1) {
      this.quantity--;
      this.cdr.markForCheck();
    }
  }

increaseQuantity() {
  const max = this.state.product?.quantity_limits?.maximum || Infinity;
  if (this.quantity < max) {
    this.quantity++;
    this.cdr.markForCheck();
  }
}

onQuantityChange(event: Event) {
  const input = event.target as HTMLInputElement;
  const value = parseInt(input.value);
  const max = this.state.product?.quantity_limits?.maximum || Infinity;

  if (!isNaN(value) && value > 0 && value <= max) {
    this.quantity = value;
  } else {
    this.quantity = 1;
    input.value = '1';
  }
  this.cdr.markForCheck();
}

  // Information getters
  getProductName(): string {
    return this.state.product?.name || '';
  }

  getSKU(): string {
    return this.state.product?.sku || '';
  }

  getCurrentPrice(): string {
    const product = this.state.product;
    if (!product) return '';

    if (product.on_sale && product.sale_price) {
      return `${product.currency || 'AED'} ${product.sale_price}`;
    }

    return `${product.currency || 'AED'} ${product.price}`;
  }

  getOldPrice(): string {
    const product = this.state.product;
    if (!product || !product.on_sale) return '';

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
      this.router.navigate(['/product', this.state.product.id]);
      this.closeSideOptions();
    }
  }

  onBuyItNow() {
    const buyItNow = true;
    this.onAddToCart(buyItNow);
  }
}
