import { DestroyRef, inject, Injectable } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { CartService } from '../../cart/service/cart.service';
import { BehaviorSubject, combineLatest, map, Observable } from 'rxjs';
import { Store } from '@ngrx/store';
import { StoreInterface } from '../../../Store/store';
import {
  fetchCouponsAction,
  createOrderAction,
  removeCouponAction,
} from '../../../Store/actions/checkout.action';
import {
  copuponDataSelector,
  copuponStatusSelector,
} from '../../../Store/selectors/checkout.selector';
import { AccountAuthService } from '../../auth/account-auth.service';
import { take } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class CheckoutService {
  private cartService = inject(CartService);
  private destroyRef = inject(DestroyRef);
  private store = inject(Store<StoreInterface>);
  private accountAuthService = inject(AccountAuthService);

  selectedCountry$: BehaviorSubject<string> = new BehaviorSubject<string>('');
  emailIsUsed$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);
  productsOutStock$: BehaviorSubject<any> = new BehaviorSubject<any>(null);
  appliedCouponStatus$: Observable<any> = this.store.select(
    copuponStatusSelector
  );

  appliedCouponValue$: Observable<any> = this.store.select(copuponDataSelector);
  applyCoupon(couponValue: string) {
    couponValue = couponValue.trim();
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

  removeCoupon(couponValue: string) {
    this.accountAuthService.isLoggedIn$.subscribe((isLoggedIn: boolean) => {
      if (isLoggedIn) {
        this.store.dispatch(
          removeCouponAction({ validCoupon: couponValue, isLoggedIn: true })
        );
      } else {
        this.store.dispatch(
          removeCouponAction({ validCoupon: couponValue, isLoggedIn: false })
        );
      }
    });
  }

  getSelectedCountry(country: string) {
    this.selectedCountry$.next(country);
  }

  private getPaymentMethodTitle(paymentMethod: string): string {
    switch (paymentMethod) {
      case 'cod':
        return 'Cash on delivery';
      case 'stripe':
        return 'Credit Card (Stripe)';
      case 'googlePay':
        return 'Google Pay';
      case 'applePay':
        return 'Apple Pay';
      case 'walletPayment':
        return 'Wallet Payment (Stripe)';
      case 'tabby':
        return 'Tabby Installments';
      default:
        return 'Unknown Payment Method';
    }
  }

  private getSetPaid(paymentMethod: string): boolean {
    switch (paymentMethod) {
      case 'cod':
        return false;
      case 'stripe':
      case 'googlePay':
      case 'applePay':
      case 'walletPayment':
      case 'tabby':
        return true;
      default:
        return false;
    }
  }

  private getCartItems(): Observable<any[]> {
    return this.cartService.savedUserCart$.pipe(
      map((response: any) =>
        response.items.map((item: any) => ({
          product_id: item.id,
          quantity: item.quantity,
        }))
      )
    );
  }

  private getCoupons(
    form: FormGroup
  ): Observable<{ isValid: boolean; coupon: any[] }> {
    return this.appliedCouponValue$.pipe(
      map((response: any) => {
        console.log(response);
        if (response?.code) {
          const coupon = [{ code: response.code }];
          console.log(coupon);
          const isUsed = response.used_by?.includes(form.value.email);
          console.log(isUsed);
          this.emailIsUsed$.next(isUsed);
          return { isValid: !isUsed, coupon };
        }
        this.emailIsUsed$.next(false);
        return { isValid: true, coupon: [] };
      })
    );
  }

  private getCustomerId(): Observable<number> {
    return this.accountAuthService.isLoggedIn$.pipe(
      map((isLoggedIn: boolean) => {
        if (isLoggedIn) {
          let loadedCustomerId: any = localStorage.getItem('customerId');
          return loadedCustomerId ? JSON.parse(loadedCustomerId).value : 0;
        }
        return 0;
      })
    );
  }

  createOrder(forms: {
    billingForm: FormGroup;
    shippingForm: FormGroup;
    isShippingDifferent: boolean;
  }, paymentToken?: string) {
    const subscription = this.cartService.savedUserCart$
      .pipe(take(1))
      .subscribe((cart) => {
        const outOfStockItems =
          cart?.items?.filter((item: any) => {
            return item.stock_status !== 'instock';
          }) || [];

        if (outOfStockItems.length > 0) {
          const outOfStockProducts = outOfStockItems.map((item: any) => ({
            productId: item.id,
            name: item.name || `Product ${item.id}`,
          }));
          this.productsOutStock$.next(outOfStockProducts);
          console.warn(
            'Cannot create order: Some products are out of stock:',
            outOfStockProducts
          );
          return;
        } else {
          const subscription2 = combineLatest([
            this.getCartItems(),
            this.getCoupons(forms.billingForm),
            this.getCustomerId(),
          ])
            .pipe(take(1))
            .subscribe(([lineItems, couponData, customerId]) => {
              const billingAddress = {
                first_name: forms.billingForm.get('firstName')?.value,
                last_name: forms.billingForm.get('lastName')?.value,
                address_1: forms.billingForm.get('address')?.value,
                city: forms.billingForm.get('city')?.value,
                state: forms.billingForm.get('state')?.value,
                postcode: `${forms.billingForm.get('postCode')?.value}`,
                country: forms.billingForm.get('countrySelect')?.value,
                email: forms.billingForm.get('email')?.value,
                phone: `${forms.billingForm.get('phone')?.value}`,
              };
              const shippingAddress = forms.isShippingDifferent
                ? {
                    first_name: forms.shippingForm.get('firstName')?.value,
                    last_name: forms.shippingForm.get('lastName')?.value,
                    address_1: forms.shippingForm.get('address')?.value,
                    city: forms.shippingForm.get('city')?.value,
                    state: forms.shippingForm.get('state')?.value,
                    postcode: `${forms.billingForm.get('postCode')?.value}`,
                    country: forms.shippingForm.get('countrySelect')?.value,
                  }
                : { ...billingAddress };

              const paymentMethod = forms.billingForm.get('paymentMethod')?.value || 'cod';

              const orderData: any = {
                payment_method: paymentMethod,
                payment_method_title: this.getPaymentMethodTitle(paymentMethod),
                set_paid: this.getSetPaid(paymentMethod),
                billing: billingAddress,
                shipping: shippingAddress,
                line_items: [{ product_id: 132940, quantity: 1 }],
                coupon_lines: couponData.coupon || [],
                customer_id: customerId || 0,
              };

              // إضافة معلومات الدفع إذا كان هناك token
              if (paymentToken) {
                orderData.payment_token = paymentToken;
                orderData.payment_details = {
                  method_id: paymentMethod,
                  token: paymentToken
                };
              }

              if (couponData.isValid || couponData.coupon.length === 0) {
                console.log(orderData);
                this.store.dispatch(
                  createOrderAction({ orderDetails: orderData })
                );
              } else {
                alert('Coupon already used. Order not created.');
              }
            });
          this.destroyRef.onDestroy(() => subscription2.unsubscribe());
        }
      });
    this.destroyRef.onDestroy(() => subscription.unsubscribe());
  }
}
