import { Component, DestroyRef, inject, Input } from '@angular/core';
import { filter, map, Observable } from 'rxjs';
import { CartService } from '../../../cart/service/cart.service';
import { AsyncPipe, CurrencyPipe } from '@angular/common';
import { CheckoutService } from '../../services/checkout.service';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-checkout-summary',
  imports: [FormsModule, AsyncPipe, CurrencyPipe],
  templateUrl: './checkout-summary.component.html',
  styleUrl: './checkout-summary.component.css',
})
export class CheckoutSummaryComponent {
  private cartService = inject(CartService);
  private checkoutService = inject(CheckoutService);
  private destroyRef = inject(DestroyRef);
  @Input({ required: true }) isVisible$!: Observable<boolean>;

  selectedCountry$: Observable<string> = this.checkoutService.selectedCountry$;
  loadedCart$: Observable<any> = this.cartService.savedUserCart$;
  appliedCouponStatus$: Observable<any> =
    this.checkoutService.appliedCouponStatus$;

  totalItemsLength: number = 0;
  couponValue: string = '';
  haveCoupon: boolean = false;

  ngOnInit() {
    const subscribtion = this.loadedCart$
      .pipe(
        filter((response: any) => response?.items?.length > 0),
        map((res: any) => {
          const coupons = res.coupons || {};
          const couponKeys = Object.keys(coupons);

          const couponData =
            couponKeys.length > 0 ? coupons[couponKeys[0]] : null;

          console.log(couponData);

          if (couponData !== null) {
            this.haveCoupon = true;
          } else {
            this.haveCoupon = false;
          }

          this.couponValue = couponData?.code || '';
          this.totalItemsLength = 0;
          return res.items;
        })
      )
      .subscribe((response: any) => {
        response.map((item: any) => {
          this.totalItemsLength += item.quantity;
        });
      });

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
