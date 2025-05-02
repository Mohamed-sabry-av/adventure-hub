import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  Input,
} from '@angular/core';
import { filter, map, Observable } from 'rxjs';
import { CartService } from '../../../cart/service/cart.service';
import { AsyncPipe } from '@angular/common';
import { CheckoutService } from '../../services/checkout.service';
import { FormsModule } from '@angular/forms';
import { UIService } from '../../../../shared/services/ui.service';
import { CartStatus } from '../../../cart/model/cart.model';
import { CurrencySvgPipe } from '../../../../shared/pipes/currency.pipe';

@Component({
  selector: 'app-checkout-summary',
  imports: [FormsModule, AsyncPipe, CurrencySvgPipe],
  templateUrl: './checkout-summary.component.html',
  styleUrl: './checkout-summary.component.css',
})
export class CheckoutSummaryComponent {
  private cartService = inject(CartService);
  private checkoutService = inject(CheckoutService);
  private destroyRef = inject(DestroyRef);
  private uiService = inject(UIService);
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

  ngOnInit() {
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
    });
  }

  onApplyCoupon() {
    this.checkoutService.applyCoupon(this.couponValue);
  }
  onRemoveCoupon() {
    this.checkoutService.removeCoupon(this.couponValue);
  }

  // --------------------------------------------------------------------

  isUsed$: Observable<boolean> = this.checkoutService.emailIsUsed$;
}
