import { inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { Store } from '@ngrx/store';
import { StoreInterface } from '../store';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import {
  // applyCouponAction,
  createOrderAction,
  fetchCouponsAction,
  fetchOrderDataAction,
  getCouponAction,
  getOrderDataAction,
  removeCouponAction,
} from '../actions/checkout.action';
import { catchError, map, of, switchMap, tap } from 'rxjs';
import { ApiService } from '../../core/services/api.service';
import { CartService } from '../../features/cart/service/cart.service';
import {
  fetchUserCartAction,
  getUserCartAction,
  updateCartStockStatusAction,
} from '../actions/cart.action';
import { Router } from '@angular/router';

export class CheckoutEffect {
  private actions$ = inject(Actions);
  private store = inject(Store<StoreInterface>);
  private wooApiService = inject(ApiService);
  private httpClient = inject(HttpClient);
  private cartService = inject(CartService);
  private router = inject(Router);

  fetchCouponsEffect = createEffect(() =>
    this.actions$.pipe(
      ofType(fetchCouponsAction),
      switchMap(({ enteredCouponValue, isLoggedIn: isLogged }) => {
        const options = {
          params: new HttpParams()
            .set('status', 'publish')
            .set('per_page', '100'),
        };
        return this.wooApiService.getRequest('coupons', options).pipe(
          map((response: any) =>
            response.filter((item: any) => {
              const currentDate = new Date();
              const couponExpiry = item.date_expires
                ? new Date(item.date_expires)
                : null;

              return (
                item.code === enteredCouponValue &&
                (couponExpiry === null || couponExpiry > currentDate)
              );
            })
          ),
          map((response: any) => {
            return getCouponAction({
              validCoupon: response ? response : null,
              isLoggedIn: isLogged,
              invalidCoupon: response ? null : enteredCouponValue,
            });
          }),
          catchError((error: any) => {
            console.log('Error Happened Before Get LS Cart', error);
            return of(error.message);
          })
        );
      })
    )
  );

  applyCouponEffect = createEffect(() =>
    this.actions$.pipe(
      ofType(getCouponAction),
      switchMap(({ validCoupon, isLoggedIn, invalidCoupon }) => {
        if (validCoupon) {
          if (isLoggedIn) {
            let authToken: any = localStorage.getItem('auth_token');
            authToken = authToken ? JSON.parse(authToken) : '';

            const headers = new HttpHeaders({
              Authorization: `Bearer ${authToken.value}`,
            });

            const body = {
              coupon_code: validCoupon,
              action: 'apply',
            };

            return this.httpClient
              .post(
                'https://adventures-hub.com/wp-json/custom/v1/cart/coupon',
                body,
                { headers }
              )
              .pipe(
                map((response) => {
                  console.log(response);
                  // return getUserCartAction({ userCart: response });
                }),
                catchError((error: any) => {
                  return of(
                    getCouponAction({
                      validCoupon: null,
                      isLoggedIn: isLoggedIn,
                      invalidCoupon: error.error.data.data.coupon_code,
                      errorMsg: error.error.data.data.reason,
                    })
                  );

                  return of(error);
                })
              );
          } else {
            let loadedCart: any = localStorage.getItem('Cart');
            loadedCart = loadedCart ? JSON.parse(loadedCart) : [];

            const productsIds =
              loadedCart.items?.map((item: any) => item.id) || [];

            return of(
              updateCartStockStatusAction({
                productIds: productsIds,
                coupon: validCoupon,
              })
            );
          }
        } else {
          return of(
            getCouponAction({
              isLoggedIn: isLoggedIn,
              validCoupon: null,
              invalidCoupon: invalidCoupon,
            })
          );
        }
      })
    )
  );

  removeCouponEffect = createEffect(
    () =>
      this.actions$.pipe(
        ofType(removeCouponAction),
        switchMap(() => {
          let loadedCart: any = localStorage.getItem('Cart');
          loadedCart = loadedCart ? JSON.parse(loadedCart) : [];

          loadedCart.coupons = {};

          localStorage.setItem('Cart', JSON.stringify(loadedCart));

          this.cartService.fetchUserCart();

          return of();
        })
      ),
    { dispatch: false }
  );

  createOrderEffect = createEffect(() =>
    this.actions$.pipe(
      ofType(createOrderAction),
      switchMap(({ orderDetails }) => {
        return this.wooApiService.postRequest('orders', orderDetails).pipe(
          map((res: any) => {
            console.log('Order Created Successfully:', res);
            const orderId = res.id;
            const orderKey = res.order_key;
            this.router.navigate([`/order-received/${orderId}`], {
              queryParams: { key: orderKey },
            });
          }),

          catchError((error: any) => {
            console.error('Order Creation Error:', error);
            return of(error);
          })
        );
      })
    )
  );

  getOrderDataEffect = createEffect(() =>
    this.actions$.pipe(
      ofType(fetchOrderDataAction),
      switchMap(({ orderId }) => {
        return this.wooApiService.getRequest(`orders/${orderId}`).pipe(
          map((res: any) => {
            console.log('Order Retrived Successfully:', res);
            return getOrderDataAction({ orderDetails: res });
          }),

          catchError((error: any) => {
            console.error('Order Retrived Error:', error);
            return of(error);
          })
        );
      })
    )
  );
}
