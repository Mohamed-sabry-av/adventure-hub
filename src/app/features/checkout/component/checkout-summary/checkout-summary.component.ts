import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  Input,
  OnInit,
} from '@angular/core';
import { filter, map, Observable, tap } from 'rxjs';
import { CartService } from '../../../cart/service/cart.service';
import { AsyncPipe } from '@angular/common';
import { CheckoutService } from '../../services/checkout.service';
import { FormsModule } from '@angular/forms';
import { UIService } from '../../../../shared/services/ui.service';
import { CartStatus } from '../../../cart/model/cart.model';
import { CurrencySvgPipe } from '../../../../shared/pipes/currency.pipe';
import { TrustSymbolsComponent } from '../trust-symbols/trust-symbols.component';
import { DeliveryEstimationService, DeliveryEstimate } from '../../../../shared/services/delivery-estimation.service';

@Component({
  selector: 'app-checkout-summary',
  imports: [FormsModule, AsyncPipe, CurrencySvgPipe, TrustSymbolsComponent],
  templateUrl: './checkout-summary.component.html',
  styleUrl: './checkout-summary.component.css',
})
export class CheckoutSummaryComponent implements OnInit {
  private cartService = inject(CartService);
  private checkoutService = inject(CheckoutService);
  private destroyRef = inject(DestroyRef);
  private uiService = inject(UIService);
  private deliveryService = inject(DeliveryEstimationService);
  
  @Input({ required: true }) isVisible$!: Observable<boolean>;

  selectedCountry$: Observable<string> =
    this.checkoutService.selectedShippingCountry$;
  loadedCart$: Observable<any> = this.cartService.savedUserCart$;
  appliedCouponStatus$: Observable<any> =
    this.checkoutService.appliedCouponStatus$;
  isCouponLoading$: Observable<boolean> = this.uiService.isCouponLoading$;
  cartStatus$: Observable<CartStatus> = this.uiService.cartStatus$;

  couponValue: string = '';
  haveCoupon: boolean = false;
  
  // Delivery estimation properties
  deliveryEstimate: DeliveryEstimate | null = null;
  formattedDeliveryDate: string = '';
  isUAE: boolean = true;

  ngOnInit() {
    // Get initial delivery estimate
    this.updateDeliveryEstimate();
    
    // Subscribe to country changes
    const countrySubscription = this.selectedCountry$.subscribe(country => {
      this.isUAE = country === 'AE';
      if (this.isUAE) {
        this.updateDeliveryEstimate();
      }
    });
    
    const subscribtion = this.loadedCart$
      .pipe(
        filter((response: any) => response?.userCart?.coupons),
        map((res: any) => {
          const coupons = res.userCart.coupons || {};
          const couponKeys = Object.keys(coupons);

          const couponData =
            couponKeys.length > 0 ? coupons[couponKeys[0]] : null;

          if (couponData !== null) {
            this.haveCoupon = true;
          } else {
            this.haveCoupon = false;
          }

          this.couponValue = couponData?.code || '';
          return res.userCart;
        })
      )
      .subscribe();

    this.destroyRef.onDestroy(() => {
      subscribtion.unsubscribe();
      countrySubscription.unsubscribe();
    });
  }

  onApplyCoupon() {
    this.checkoutService.applyCoupon(this.couponValue);
  }
  
  onRemoveCoupon() {
    this.checkoutService.removeCoupon(this.couponValue);
  }

  // Get formatted delivery date based on estimate
  updateDeliveryEstimate() {
    this.deliveryEstimate = this.deliveryService.getDeliveryEstimate();
    this.formattedDeliveryDate = this.getFormattedDeliveryDate(this.deliveryEstimate.estimatedDelivery);
  }
  
  getFormattedDeliveryDate(estimatedDelivery: string): string {
    const now = new Date();
    let deliveryDate = new Date();
    
    if (estimatedDelivery === 'Tomorrow') {
      deliveryDate.setDate(now.getDate() + 1);
    } else if (estimatedDelivery === 'in 2 days') {
      deliveryDate.setDate(now.getDate() + 2);
    } else if (estimatedDelivery === 'in 1-2 working days') {
      // Pick the later date to be safe
      deliveryDate.setDate(now.getDate() + 2);
    } else if (estimatedDelivery === 'in 2-3 working days') {
      // Pick the later date to be safe
      deliveryDate.setDate(now.getDate() + 3);
    } else if (estimatedDelivery === 'in 2 working days') {
      deliveryDate.setDate(now.getDate() + 2);
    } else {
      // Default to 3 days if we don't recognize the format
      deliveryDate.setDate(now.getDate() + 3);
    }
    
    // Skip weekends for working days estimates
    if (estimatedDelivery.includes('working')) {
      // Skip weekend days if needed
      while (deliveryDate.getDay() === 5 || deliveryDate.getDay() === 6) { // Friday or Saturday in UAE
        deliveryDate.setDate(deliveryDate.getDate() + 1);
      }
    }
    
    // Format date as "Weekday, Day Month"
    const weekday = deliveryDate.toLocaleDateString('en-US', { weekday: 'long' });
    const day = deliveryDate.getDate();
    const month = deliveryDate.toLocaleDateString('en-US', { month: 'long' });
    
    // Add suffix to day (1st, 2nd, 3rd, etc.)
    const dayWithSuffix = day + this.getDaySuffix(day);
    
    return `${weekday}, ${dayWithSuffix} ${month}`;
  }
  
  getDaySuffix(day: number): string {
    if (day > 3 && day < 21) return 'th';
    switch (day % 10) {
      case 1: return 'st';
      case 2: return 'nd';
      case 3: return 'rd';
      default: return 'th';
    }
  }

  // --------------------------------------------------------------------

  isUsed$: Observable<boolean> = this.checkoutService.emailIsUsed$;
}
