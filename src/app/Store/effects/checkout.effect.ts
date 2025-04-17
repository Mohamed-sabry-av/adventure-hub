import { inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { Store } from '@ngrx/store';
import { StoreInterface } from '../store';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import {
  applyCouponAction,
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
import { fetchUserCartAction, getUserCartAction } from '../actions/cart.action';
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
      switchMap(({ enteredCouponValue, isLoggedIn }) => {
        console.log('COUPON IS HERE 1', enteredCouponValue);

        enteredCouponValue = enteredCouponValue?.code
          ? enteredCouponValue?.code
          : enteredCouponValue;

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
            console.log('COUPON IS HERE 2', response);
            console.log('RESPONSE OF COUPONSSSS 1');

            if (response && response?.length === 0) {
              return getCouponAction({
                validCoupon: null,
                isLoggedIn,
                invalidCoupon: enteredCouponValue,
              });
            } else {
              return getCouponAction({
                validCoupon: response[0],
                isLoggedIn,
                invalidCoupon: null,
              });
            }
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
      switchMap(({ validCoupon, isLoggedIn }) => {
        console.log('COUPON IS HERE 3', validCoupon);

        if (isLoggedIn) {
          const body = {
            coupon_code: validCoupon.code,
            action: 'apply',
          };

          return this.wooApiService.postRequest('cart/coupon', body).pipe(
            map((response) => {
              console.log(response);
              return this.store.dispatch(
                getUserCartAction({ userCart: response })
              );
            }),
            catchError((error: any) => {
              console.log('Coupon Error ', error);
              return of(error);
            })
          );
        } else {
          console.log('RESPONSE OF COUPNESS 2');
          let loadedCart: any = localStorage.getItem('Cart');
          loadedCart = loadedCart ? JSON.parse(loadedCart) : [];

          const productIds =
            loadedCart.items?.map((item: any) => item.productId) || [];

          console.log(productIds);

          const cart = this.cartService.calcCartPrice(
            loadedCart.items,
            validCoupon
          );

          localStorage.setItem('Cart', JSON.stringify(cart));
          console.log('RESPONSE OF COUPNESS 3');

          return of(getUserCartAction({ userCart: cart }));
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
