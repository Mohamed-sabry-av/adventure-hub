import { inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { Store } from '@ngrx/store';
import { StoreInterface } from '../store';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import {
  createOrderAction,
  fetchCouponsAction,
  fetchOrderDataAction,
  getCouponAction,
  getCouponDataAction,
  getCouponStatusAction,
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
import {
  cartStatusAction,
  startLoadingCartAction,
  startLoadingCouponAction,
  startLoadingOrderAction,
  stopLoadingCartAction,
  stopLoadingCouponAction,
  stopLoadingOrderAction,
  dialogFailureAction,
} from '../actions/ui.action';
import { UIService } from '../../shared/services/ui.service';
import { HandleErrorsService } from '../../core/services/handel-errors.service';

export class CheckoutEffect {
  private actions$ = inject(Actions);
  private store = inject(Store<StoreInterface>);
  private wooApiService = inject(ApiService);
  private httpClient = inject(HttpClient);
  private cartService = inject(CartService);
  private router = inject(Router);
  private uiService = inject(UIService);
  private handleError = inject(HandleErrorsService);

  fetchCouponsEffect = createEffect(() =>
    this.actions$.pipe(
      ofType(fetchCouponsAction),
      tap(() => this.store.dispatch(startLoadingCouponAction())),

      switchMap(({ enteredCouponValue, isLoggedIn }) => {
        enteredCouponValue = enteredCouponValue?.code
          ? enteredCouponValue.code
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
            console.log('Coupon Is Loaded', response);
            if (response?.length === 0) {
              this.store.dispatch(stopLoadingCouponAction());
            }
            this.store.dispatch(getCouponDataAction({ coupon: response[0] }));
            return getCouponAction({
              validCoupon: response.length !== 0 ? response : null,
              isLoggedIn,
              invalidCoupon: response.length === 0 ? enteredCouponValue : null,
            });
          }),
          catchError((error: any) => {
            this.store.dispatch(stopLoadingCouponAction());
            this.uiService.showError('Failed To Fetch Coupons');

            return of(
              cartStatusAction({
                mainPageLoading: false,
                sideCartLoading: false,
              })
            );
          })
        );
      })
    )
  );

  applyCouponEffect = createEffect(() =>
    this.actions$.pipe(
      ofType(getCouponAction),
      switchMap(({ validCoupon, isLoggedIn, invalidCoupon }) => {
        const loadedData = this.cartService.loadedDataFromLS(isLoggedIn);
        if (isLoggedIn) {
          console.log('LOGGGEDD');
          if (validCoupon) {
            const body = {
              coupon_code: validCoupon[0].code,
              action: 'apply',
            };

            return this.httpClient
              .post(
                'https://adventures-hub.com/wp-json/custom/v1/cart/coupon',
                body,
                { headers: loadedData.headers, params: loadedData.params }
              )
              .pipe(
                map((response: any) => {
                  this.store.dispatch(
                    getCouponStatusAction({
                      errorMsg: null,
                      successMsg: 'success',
                    })
                  );

                  response.items = response.items.map((item: any) => {
                    return {
                      ...item,
                      images: {
                        imageSrc: item.images[0].thumbnail,
                        imageAlt: item.images[0].alt,
                      },
                    };
                  });

                  this.store.dispatch(stopLoadingCouponAction());

                  return getUserCartAction({ userCart: response });
                }),
                catchError((error: any) => {
                  this.store.dispatch(stopLoadingCouponAction());
                  this.uiService.showError(
                    error.error.data.data.reason || 'Failed To Apply Coupon'
                  );

                  return of(
                    getCouponStatusAction({
                      errorMsg:
                        error.error.data.data.reason ||
                        'Failed To Apply Coupon',
                      successMsg: null,
                    })
                  );
                })
              );
          } else {
            this.store.dispatch(stopLoadingCouponAction());
            this.uiService.showError(`Coupon ${invalidCoupon} does not exist!`);

            return of(
              getCouponStatusAction({
                errorMsg: `Coupon ${invalidCoupon} does not exist!`,
                successMsg: null,
              })
            );
          }
        } else {
          this.store.dispatch(stopLoadingCouponAction());
          if (invalidCoupon) {
            return of(
              getCouponStatusAction({
                errorMsg: `Coupon ${invalidCoupon} does not exist!`,
                successMsg: null,
              })
            );
          }

          this.store.dispatch(
            getCouponStatusAction({
              errorMsg: null,
              successMsg: 'success',
            })
          );

          const coupon = { coupon_code: validCoupon[0].code };

          const isCouponExists = loadedData.loadedCart.coupons.some(
            (c: any) => c.code === coupon.coupon_code
          );

          if (!isCouponExists) {
            loadedData.loadedCart.coupons.push(coupon);
            localStorage.setItem('Cart', JSON.stringify(loadedData.loadedCart));
          }

          return of(
            fetchUserCartAction({
              isLoggedIn: false,
              mainPageLoading: false,
              sideCartLoading: true,
            })
          );
        }
      })
    )
  );

  removeCouponEffect = createEffect(() =>
    this.actions$.pipe(
      ofType(removeCouponAction),
      tap(() => this.store.dispatch(startLoadingCouponAction())),
      switchMap(({ isLoggedIn, validCoupon }) => {
        const loadedData = this.cartService.loadedDataFromLS(isLoggedIn);
        if (isLoggedIn) {
          const body = {
            coupon_code: validCoupon,
            action: 'remove',
          };

          return this.httpClient
            .post(
              'https://adventures-hub.com/wp-json/custom/v1/cart/coupon',
              body,
              { headers: loadedData.headers, params: loadedData.params }
            )
            .pipe(
              map((response: any) => {
                this.store.dispatch(stopLoadingCouponAction());

                response.items = response.items.map((item: any) => {
                  return {
                    ...item,
                    images: {
                      imageSrc: item.images[0].thumbnail,
                      imageAlt: item.images[0].alt,
                    },
                  };
                });

                return getUserCartAction({ userCart: response });
              }),
              catchError((error: any) => {
                this.store.dispatch(stopLoadingCouponAction());
                this.uiService.showError('Failed To Remove Coupon');

                return of(error);
              })
            );
        } else {
          this.store.dispatch(stopLoadingCouponAction());

          loadedData.loadedCart.coupons = [];
          localStorage.setItem('Cart', JSON.stringify(loadedData.loadedCart));

          return of(
            fetchUserCartAction({
              mainPageLoading: false,
              sideCartLoading: true,
              isLoggedIn: false,
            })
          );
        }
      })
    )
  );

  createOrderEffect = createEffect(() =>
    this.actions$.pipe(
      ofType(createOrderAction),
      tap(() => this.store.dispatch(startLoadingOrderAction())),

      switchMap(({ orderDetails }) => {
        return this.wooApiService.postRequest('orders', orderDetails).pipe(
          map((res: any) => {
            const orderId = res.id;
            const orderKey = res.order_key;
            this.router.navigate([`/order-received/${orderId}`], {
              queryParams: { key: orderKey },
            });
            this.store.dispatch(stopLoadingOrderAction());
            return fetchOrderDataAction({ orderId: orderId });
          }),

          catchError((error: any) => {
            this.store.dispatch(stopLoadingOrderAction());
            this.uiService.showError('Failed To Create Order');

            return this.handleError.handelError(error);
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
            this.uiService.showError('Failed To Retrive Order Data');
            return of();
          })
        );
      })
    )
  );
}
