import { DestroyRef, inject, Injectable } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { CartService } from '../../cart/service/cart.service';
import {
  BehaviorSubject,
  catchError,
  combineLatest,
  map,
  Observable,
  of,
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
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { GeoLocationService } from '../../../shared/services/geo-location.service';
import { ApiService } from '../../../core/services/api.service';

export interface PaymentIntentRequest {
  amount: number;
  currency: string;
  orderData: {
    billing: any;
    shipping: any;
    line_items: any[];
    coupon_lines?: any[];
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
  private geoLocationService = inject(GeoLocationService);
  private apiService = inject(ApiService);

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
  walletPaymentAvailable$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);

  private billingForm: FormGroup | null = null;

  setBillingForm(form: FormGroup) {
    this.billingForm = form;
  }

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
        switchMap((countries: any[]) => {
          // First check if we have a detected country from localStorage
          const savedLocation = localStorage.getItem('user_location');
          if (savedLocation) {
            try {
              const location = JSON.parse(savedLocation);
              if (location && location.country_code) {
                // Find the detected country in the list
                const detectedCountry = countries.find(c => c.code === location.country_code);
                
                if (detectedCountry) {
                  // Create a copy of the countries array without the detected country
                  const otherCountries = countries.filter(c => c.code !== location.country_code);
                  
                  // Return the detected country first, followed by all other countries
                  return of([
                    { ...detectedCountry, name: `${detectedCountry.name} (Detected)` }, // Mark as detected
                    ...otherCountries
                  ]);
                } else {
                  // If the detected country is not in the list, add it to the list
                  // This handles the case of countries not included in the WooCommerce allowed list

                  // Get country name from separate API or use country code as name
                  return this.getCountryNameForCode(location.country_code).pipe(
                    map(countryName => {
                      const newCountry = {
                        code: location.country_code,
                        name: countryName || location.country_name || location.country_code,
                        states: [],
                        payment_methods: []
                      };
                      
                      // Add to the beginning of the list with (Detected) label
                      return [
                        { ...newCountry, name: `${newCountry.name} (Detected)` },
                        ...countries
                      ];
                    })
                  );
                }
              }
            } catch (e) {
              console.error('Error parsing saved location:', e);
            }
          }
          
          // If no detected country or error, return the original list
          return of(countries);
        }),
        catchError((error: any) => {
          console.error('Error fetching countries:', error);
          return throwError(() => new Error(error.error?.message || 'Failed to fetch countries'));
        })
      );
  }
  
  // Helper method to get country name for a country code
  private getCountryNameForCode(countryCode: string): Observable<string | null> {
    // Try to fetch from the full list of world countries, not just allowed ones
    return this.apiService.getExternalRequest<any>('https://adventures-hub.com/wp-json/wc/v3/data/countries').pipe(
      map((countries: any) => {
        const country = countries.find((c: any) => c.code === countryCode);
        return country ? country.name : null;
      }),
      catchError(error => {
        console.error('Error fetching world countries:', error);
        return of(null);
      })
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

  getCountryNameByCode(code: string): string {
    let countryName = '';
    this.avaliableCountries$.pipe(take(1)).subscribe(countries => {
      const country = countries.find((c: any) => c.code === code);
      if (country) {
        countryName = country.name;
      }
    });
    return countryName || code;
  }

  private getPaymentMethodTitle(paymentMethod: string): string {
    switch (paymentMethod) {
      case 'cod': return 'Cash on delivery';
      case 'stripe': return 'Credit Card (Stripe)';
      case 'googlePay': return 'Google Pay';
      case 'applePay': return 'Apple Pay';
      case 'walletPayment': return 'Wallet Payment';
      case 'tabby': return 'Tabby Installments';
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
        response?.userCart?.items.map((item: any) => {
          const lineItem: any = {
            product_id: parseInt(item.id, 10),
            quantity: parseInt(item.quantity, 10),
          };
          if (item.variation_id) {
            const variationId = parseInt(item.variation_id, 10);
            if (!isNaN(variationId)) {
              lineItem.variation_id = variationId;
            }
          }
          return lineItem;
        })
      )
    );
  }

  getCartTotalPrice(): Observable<{ total: number; currency: string }> {
    return this.cartService.savedUserCart$.pipe(
      map((response: any) => {

        const totals = response?.userCart?.totals;
        if (!totals) {
          throw new Error('Cart totals are not available');
        }

        return {
          total: totals.total_price,
          currency: totals.currency_code || 'AED',
        };
      })
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
    orderData: { billing: any; shipping: any; line_items?: any[] }
  ): Observable<PaymentIntentResponse> {
    // إذا كان فيه billingForm، نفّذ التحقق من الكوبونات
    const couponObservable = this.billingForm
      ? this.getCoupons(this.billingForm)
      : of({ isValid: true, coupon: [] });

    return couponObservable.pipe(
      switchMap((couponData) => {
        if (!couponData.isValid && couponData.coupon.length > 0) {
          return throwError(() => new Error('Coupon already used'));
        }

        // استخدم line_items من orderData إذا كانت موجودة وغير فاضية، وإلا استخدم getCartItems
        const lineItemsObservable = orderData.line_items && orderData.line_items.length > 0
          ? of(orderData.line_items)
          : this.getCartItems();

        return lineItemsObservable.pipe(
          switchMap((lineItems) => {
            const payload: PaymentIntentRequest = {
              amount,
              currency,
              orderData: {
                ...orderData,
                line_items: lineItems,
                coupon_lines: couponData.coupon || [],
              },
            };

            return this.httpClient.post<PaymentIntentResponse>(`${this.BACKEND_URL}/api/payment/create-intent`, payload).pipe(
              map(response => {

                if (response.success && response.clientSecret) {
                  this.paymentIntentClientSecret$.next(response.clientSecret);
                  this.paymentIntentId$.next(response.paymentIntentId || null);
                  return response;
                }
                throw new Error(response.error || 'Failed to create payment intent');
              }),
              catchError((error: HttpErrorResponse) => {
                console.error('Error creating payment intent:', {
                  status: error.status,
                  statusText: error.statusText,
                  message: error.message,
                  error: error.error,
                  response: error.error ? JSON.stringify(error.error, null, 2) : 'No error details'
                });
                const errorMessage = error.error?.error || error.message || 'Payment system error';
                this.paymentError$.next(errorMessage);
                return throwError(() => new Error(errorMessage));
              })
            );
          })
        );
      })
    );
  }

  checkOrderStatus(paymentIntentId: string): Observable<any> {
    if (!paymentIntentId) {
      return throwError(() => new Error('Missing payment intent ID'));
    }

    return this.httpClient.get(`${this.BACKEND_URL}/api/order/status/${paymentIntentId}`).pipe(
      catchError((error: HttpErrorResponse) => {
        console.error('Error checking order status:', {
          status: error.status,
          statusText: error.statusText,
          message: error.message,
          error: error.error
        });
        return throwError(() => new Error('Failed to check order status'));
      })
    );
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
            const billingFirstName = forms.billingForm.get('firstName')?.value || 
                                    forms.billingForm.get('email')?.value?.split('@')[0] || 'Customer';
            const billingLastName = forms.billingForm.get('lastName')?.value || '';

            const billingAddress = {
              first_name: billingFirstName,
              last_name: billingLastName,
              address_1: forms.billingForm.get('address')?.value || '',
              city: forms.billingForm.get('city')?.value || '',
              state: forms.billingForm.get('state')?.value || '',
              postcode: '', // Empty string for postcode
              country: forms.billingForm.get('countrySelect')?.value || '',
              email: forms.billingForm.get('email')?.value || '',
              phone: `${forms.billingForm.get('phone')?.value || ''}`,
            };

            const shippingAddress = forms.isShippingDifferent
              ? {
                  first_name: forms.shippingForm.get('firstName')?.value || billingFirstName,
                  last_name: forms.shippingForm.get('lastName')?.value || billingLastName,
                  address_1: forms.shippingForm.get('address')?.value || '',
                  city: forms.shippingForm.get('city')?.value || '',
                  state: forms.shippingForm.get('state')?.value || '',
                  postcode: '', // Empty string for postcode
                  country: forms.shippingForm.get('countrySelect')?.value || '',
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
              payment_token: paymentToken,
              meta_data: paymentToken ? [{ key: '_payment_intent_id', value: paymentToken }] : [],
            };

            if (!couponData.isValid && couponData.coupon.length > 0) {
              return throwError(() => new Error('Coupon already used. Order not created.'));
            }

            return this.httpClient.post<OrderResponse>(`${this.BACKEND_URL}/api/orders`, orderData, {
              headers: { 'Content-Type': 'application/json' }
            }).pipe(
              map((response) => {

                return response;
              }),
              catchError((error: HttpErrorResponse) => {
                console.error('Error creating order:', {
                  status: error.status,
                  statusText: error.statusText,
                  message: error.message,
                  response: typeof error.error === 'string' ? error.error.substring(0, 200) : error.error
                });
                let errorMessage = 'Failed to create order';
                if (error.error?.message?.includes('coupon')) {
                  errorMessage = 'Error applying coupon: ' + (error.error.message || 'Invalid coupon');
                } else if (error.status === 0) {
                  errorMessage = 'Network error: Unable to reach the server';
                } else if (error.error instanceof ErrorEvent) {
                  errorMessage = `Client-side error: ${error.error.message}`;
                } else if (typeof error.error === 'string' && error.error.includes('<!DOCTYPE')) {
                  errorMessage = `Server returned an unexpected HTML response. Status: ${error.status} ${error.statusText}`;
                  console.error('HTML response content:', error.error.substring(0, 200));
                } else {
                  errorMessage = error.error?.message || `Server error: ${error.status} - ${error.message}`;
                }
                this.uiService.showError(errorMessage);
                this.paymentError$.next(errorMessage);
                return throwError(() => new Error(errorMessage));
              })
            );
          })
        );
      })
    );
  }

  setDefaultCountryBasedOnGeolocation() {
    // First check if we already have location data saved
    const savedLocation = localStorage.getItem('user_location');
    if (savedLocation) {
      try {
        const location = JSON.parse(savedLocation);
        if (location && location.country_code) {
          this.selectedBillingCountry$.next(location.country_code);
          this.selectedShippingCountry$.next(location.country_code);

          return; // No need to fetch again
        }
      } catch (e) {
        console.error('Error parsing saved location:', e);
      }
    }

    // If no saved location, fetch from API
    this.geoLocationService.getUserLocation().subscribe(
      (location) => {
        if (location) {
          const countryCode = location.country_code;
          if (countryCode) {
            this.selectedBillingCountry$.next(countryCode);
            this.selectedShippingCountry$.next(countryCode);

            // Save location for future visits
            this.geoLocationService.saveUserLocation(location);
          }
        }
      },
      (error) => {
        console.error('Error getting geolocation:', error);
      }
    );
  }
}
