import { DestroyRef, inject, Injectable } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { CartService } from '../../cart/service/cart.service';
import {
  BehaviorSubject,
  catchError,
  combineLatest,
  map,
  Observable,
  switchMap,
  take,
  throwError,
} from 'rxjs';
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
import { UIService } from '../../../shared/services/ui.service';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';

export interface PaymentIntentRequest {
  amount: number;
  currency: string;
  orderData: {
    billing: any;
    shipping: any;
    line_items: any[];
  };
}

export interface PaymentIntentResponse {
  success: boolean;
  clientSecret?: string;
  paymentIntentId?: string;
  error?: string;
}

export interface OrderResponse {
  id: string;
  status: string;
  [key: string]: any;
}

@Injectable({ providedIn: 'root' })
export class CheckoutService {
  private cartService = inject(CartService);
  private destroyRef = inject(DestroyRef);
  private store = inject(Store<StoreInterface>);
  private accountAuthService = inject(AccountAuthService);
  private uiService = inject(UIService);
  private httpClient = inject(HttpClient);

  private readonly BACKEND_URL = environment.apiUrl;

  paymentIntentClientSecret$: BehaviorSubject<string | null> = new BehaviorSubject<string | null>(null);
  paymentIntentId$: BehaviorSubject<string | null> = new BehaviorSubject<string | null>(null);
  paymentProcessing$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);
  paymentError$: BehaviorSubject<string | null> = new BehaviorSubject<string | null>(null);

  selectedShippingCountry$: BehaviorSubject<string> = new BehaviorSubject<string>('');
  selectedBillingCountry$: BehaviorSubject<string> = new BehaviorSubject<string>('');
  emailIsUsed$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);
  productsOutStock$: BehaviorSubject<any> = new BehaviorSubject<any>(null);
  appliedCouponStatus$: Observable<any> = this.store.select(copuponStatusSelector);
  appliedCouponValue$: Observable<any> = this.store.select(copuponDataSelector);

  applyCoupon(couponValue: string) {
    couponValue = couponValue.trim();
    this.accountAuthService.isLoggedIn$.pipe(take(1)).subscribe((isLoggedIn: boolean) => {
      this.store.dispatch(fetchCouponsAction({ enteredCouponValue: couponValue, isLoggedIn }));
    });
  }

  removeCoupon(couponValue: string) {
    this.accountAuthService.isLoggedIn$.pipe(take(1)).subscribe((isLoggedIn: boolean) => {
      this.store.dispatch(removeCouponAction({ validCoupon: couponValue, isLoggedIn }));
    });
  }

  getAvaliableCountries(): Observable<any> {
    return this.httpClient
      .get('https://adventures-hub.com/wp-json/custom/v1/shipping-countries-with-states')
      .pipe(
        map((response: any) => response),
        catchError((error: any) => throwError(() => new Error(error.error?.message || 'Failed to fetch countries')))
      );
  }

  avaliableCountries$ = this.getAvaliableCountries();

  availablePaymentMethods$ = combineLatest([
    this.avaliableCountries$,
    this.selectedBillingCountry$,
  ]).pipe(
    map(([countries, selectedCountryCode]) => {
      const selectedCountry = countries.find((country: any) => country.code === selectedCountryCode);
      return selectedCountry && selectedCountry.payment_methods
        ? selectedCountry.payment_methods.map((method: any) => method.id)
        : [];
    })
  );

  getSelectedShippingCountry(country: string) {
    this.selectedShippingCountry$.next(country);
  }

  getSelectedBillingCountry(country: string) {
    this.selectedBillingCountry$.next(country);
  }

  private getPaymentMethodTitle(paymentMethod: string): string {
    switch (paymentMethod) {
      case 'cod': return 'Cash on delivery';
      case 'stripe': return 'Credit Card (Stripe)';
      case 'googlePay': return 'Google Pay';
      case 'applePay': return 'Apple Pay';
      case 'walletPayment':  case 'tabby': return 'Tabby Installments';
      default: return 'Unknown Payment Method';
    }
  }

  private getSetPaid(paymentMethod: string): boolean {
    switch (paymentMethod) {
      case 'cod': return false;
      case 'stripe':
      case 'googlePay':
      case 'applePay':
      case 'walletPayment':
      case 'tabby': return true;
      default: return false;
    }
  }

  getCartItems(): Observable<any[]> {
    return this.cartService.savedUserCart$.pipe(
      map((response: any) =>
        response?.userCart?.items.map((item: any) => ({
          product_id: item.id,
          quantity: item.quantity,
        }))
      )
    );
  }

  getCartTotalPrice(): Observable<{ total: number; currency: string }> {
    return this.cartService.savedUserCart$.pipe(
      map((response: any) => ({
        total: response.userCart.totals.total_price,
        currency: response.userCart.totals.currency_code,
      }))
    );
  }

  private getCoupons(form: FormGroup): Observable<{ isValid: boolean; coupon: any[] }> {
    return this.appliedCouponValue$.pipe(
      take(1),
      map((response: any) => {
        if (response?.code) {
          const coupon = [{ code: response.code }];
          const isUsed = response.used_by?.includes(form.value.email);
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
      take(1),
      map((isLoggedIn: boolean) => {
        if (isLoggedIn) {
          const loadedCustomerId: any = localStorage.getItem('customerId');
          return loadedCustomerId ? JSON.parse(loadedCustomerId).value : 0;
        }
        return 0;
      })
    );
  }

  createPaymentIntent(
    amount: number,
    currency: string,
    orderData: { billing: any; shipping: any; line_items: any[] }
  ): Observable<PaymentIntentResponse> {
    const payload: PaymentIntentRequest = { amount, currency, orderData };

    return this.httpClient.post<PaymentIntentResponse>(`${this.BACKEND_URL}/api/payment/create-intent`, payload).pipe(
      map(response => {
        if (response.success && response.clientSecret) {
          this.paymentIntentClientSecret$.next(response.clientSecret);
          this.paymentIntentId$.next(response.paymentIntentId || null);
          return response;
        }
        throw new Error(response.error || 'Failed to create payment intent');
      }),
      catchError(error => {
        const errorMessage = error.error?.error || error.message || 'Payment system error';
        this.paymentError$.next(errorMessage);
        return throwError(() => new Error(errorMessage));
      })
    );
  }

  checkOrderStatus(paymentIntentId: string): Observable<any> {
    if (!paymentIntentId) {
      return throwError(() => new Error('Missing payment intent ID'));
    }

    return this.httpClient.get(`${this.BACKEND_URL}/api/order/status/${paymentIntentId}`).pipe(
      catchError(error => {
        console.error('Error checking order status:', error);
        return throwError(() => error);
      })
    );
  }

  prepareOrderData(forms: {
    billingForm: FormGroup;
    shippingForm: FormGroup;
    isShippingDifferent: boolean;
  }): { billing: any; shipping: any; line_items: any[] } {
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

    return {
      billing: billingAddress,
      shipping: shippingAddress,
      line_items: [], // Fetch actual cart items in createOrder
    };
  }

  createOrder(
    forms: {
      billingForm: FormGroup;
      shippingForm: FormGroup;
      isShippingDifferent: boolean;
    },
    paymentToken?: string
  ): Observable<OrderResponse> {
    return this.cartService.savedUserCart$.pipe(
      take(1),
      switchMap((cart) => {
        const outOfStockItems = cart?.items?.filter((item: any) => item.stock_status !== 'instock') || [];

        if (outOfStockItems.length > 0) {
          const outOfStockProducts = outOfStockItems.map((item: any) => ({
            productId: item.id,
            name: item.name || `Product ${item.id}`,
          }));
          this.productsOutStock$.next(outOfStockProducts);
          return throwError(() => new Error('Cannot create order: Some products are out of stock'));
        }

        return combineLatest([
          this.getCartItems(),
          this.getCoupons(forms.billingForm),
          this.getCustomerId(),
          this.getCartTotalPrice(),
        ]).pipe(
          switchMap(([lineItems, couponData, customerId, cartTotals]) => {
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

            const orderData = {
              payment_method: paymentMethod,
              payment_method_title: this.getPaymentMethodTitle(paymentMethod),
              set_paid: this.getSetPaid(paymentMethod),
              billing: billingAddress,
              shipping: shippingAddress,
              line_items: lineItems,
              coupon_lines: couponData.coupon || [],
              customer_id: customerId || 0,
              payment_token: paymentToken, // Include payment token
            };

            const orderDetailsByPayment = {
              amount: Number(cartTotals.total),
              currency: cartTotals.currency,
              orderData: {
                billing: billingAddress,
                shipping: shippingAddress,
                line_items: lineItems,
              },
            };

            if (!couponData.isValid && couponData.coupon.length > 0) {
              return throwError(() => new Error('Coupon already used. Order not created.'));
            }

            // For Stripe/Google Pay/Apple Pay, create a payment intent
            if (['stripe', 'googlePay', 'applePay', 'walletPayment'].includes(paymentMethod)) {
              if (!paymentToken) {
                return throwError(() => new Error('Payment token is required for this payment method'));
              }
              return this.httpClient.post<OrderResponse>(`${this.BACKEND_URL}/api/orders`, orderData).pipe(
                catchError(error => {
                  const errorMessage = error.error?.message || 'Failed to create order';
                  this.uiService.showError(errorMessage);
                  return throwError(() => new Error(errorMessage));
                })
              );
            } else {
              // For other payment methods (e.g., cod, tabby), create the order directly
              return this.httpClient.post<OrderResponse>(`${this.BACKEND_URL}/api/orders`, orderData).pipe(
                catchError(error => {
                  const errorMessage = error.error?.message || 'Failed to create order';
                  this.uiService.showError(errorMessage);
                  return throwError(() => new Error(errorMessage));
                })
              );
            }
          })
        );
      })
    );
  }
}