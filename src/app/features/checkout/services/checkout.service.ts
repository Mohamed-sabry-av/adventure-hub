import { DestroyRef, inject, Injectable } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { CartService } from '../../cart/service/cart.service';
import { BehaviorSubject, map, Observable } from 'rxjs';
import { Store } from '@ngrx/store';
import { StoreInterface } from '../../../Store/store';
import {
  fetchCouponsAction,
  createOrderAction,
  removeCouponAction,
} from '../../../Store/actions/checkout.action';
import { validCouponSelector } from '../../../Store/selectors/checkout.selector';
import { AccountAuthService } from '../../auth/account-auth.service';

@Injectable({ providedIn: 'root' })
export class CheckoutService {
  private cartService = inject(CartService);
  private destroyRef = inject(DestroyRef);
  private store = inject(Store<StoreInterface>);
  private accountAuthService = inject(AccountAuthService);

  selectedCountry$: BehaviorSubject<string> = new BehaviorSubject<string>('');

  appliedCoupon$: Observable<any> = this.store.select(validCouponSelector);

  applyCoupon(couponValue: string) {
    this.accountAuthService.isLoggedIn$.subscribe((isLoggedIn: boolean) => {
      if (isLoggedIn) {
        this.store.dispatch(
          fetchCouponsAction({
            enteredCouponValue: couponValue,
            isLoggedIn: true,
          })
        );
      } else {
        this.store.dispatch(
          fetchCouponsAction({
            enteredCouponValue: couponValue,
            isLoggedIn: false,
          })
        );
      }
    });
  }

  removeCoupon() {
    this.store.dispatch(removeCouponAction());
  }

  createOrder(
    addresses: { billing: any; shipping: any },
    paymentGateway: {
      payment_method: string;
      payment_method_title: string;
    },
    coupon: any,
    stripeToken?: string
  ) {
    const subscribtion = this.cartService.savedUserCart$
      .pipe(
        map((response: any) =>
          response.items.map((item: any) => {
            return { product_id: item.id, quantity: item.quantity };
          })
        )
      )
      .subscribe((loadedCartData: any) => {
        let customerId: number = 0;

        const subscribtion2 = this.accountAuthService.isLoggedIn$.subscribe(
          (isLoggedIn: boolean) => {
            if (isLoggedIn) {
              let loadedCustomerId: any = localStorage.getItem('customerid');
              loadedCustomerId = loadedCustomerId
                ? JSON.parse(loadedCustomerId)
                : 0;
              customerId = loadedCustomerId;
            }
          }
        );

        const couponData = coupon ? [{ code: coupon.code }] : [];

        const orderData: any = {
          ...paymentGateway,
          set_paid: false,
          billing: addresses.billing,
          shipping: addresses.shipping,
          line_items: loadedCartData,
          customer_id: customerId,
          coupon_lines: couponData,
        };

        console.log(orderData);

        if (stripeToken) {
          orderData.meta_data = [{ key: 'stripe_token', value: stripeToken }];
        }

        this.store.dispatch(createOrderAction({ orderDetails: orderData }));
      });

    this.destroyRef.onDestroy(() => {
      subscribtion.unsubscribe();
    });
  }

  getSelectedCountry(country: string) {
    this.selectedCountry$.next(country);
  }
}
