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

      switchMap(
        ({
          enteredCouponValue,
          isLoggedIn: isLogged,
          mainPageLoading,
          sideCartLoading,
        }) => {
          this.store.dispatch(
            cartStatusAction({
              mainPageLoading: mainPageLoading!,
              sideCartLoading: sideCartLoading!,
              error: null,
            })
          );
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
              if (response?.length === 0) {
                this.store.dispatch(stopLoadingCouponAction());
              }
              this.store.dispatch(getCouponDataAction({ coupon: response[0] }));
              return getCouponAction({
                validCoupon: response.length !== 0 ? response : null,
                isLoggedIn: isLogged,
                invalidCoupon:
                  response.length === 0 ? enteredCouponValue : null,
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
        }
      )
    )
  );

  applyCouponEffect = createEffect(() =>
    this.actions$.pipe(
      ofType(getCouponAction),
      switchMap(({ validCoupon, isLoggedIn, invalidCoupon }) => {
        if (isLoggedIn) {
          if (validCoupon) {
            let authToken: any = localStorage.getItem('auth_token');
            authToken = authToken ? JSON.parse(authToken) : '';

            const headers = new HttpHeaders({
              Authorization: `Bearer ${authToken.value}`,
            });

            const body = {
              coupon_code: validCoupon[0].code,
              action: 'apply',
            };

            return this.httpClient
              .post(
                'https://adventures-hub.com/wp-json/custom/v1/cart/coupon',
                body,
                { headers }
              )
              .pipe(
                map((response: any) => {
                  this.store.dispatch(
                    getCouponStatusAction({
                      errorMsg: null,
                      successMsg: 'success',
                    })
                  );

                  const updatedItems = response.items.map((item: any) => {
                    return {
                      ...item,
                      images: {
                        imageSrc: item.images[0].thumbnail,
                        imageAlt: item.images[0].alt,
                      },
                    };
                  });

                  const updatedCart = {
                    items: updatedItems,
                    coupons: response.coupons,
                    payment_methods: response.payment_methods,
                    totals: response.totals,
                  };

                  this.store.dispatch(stopLoadingCouponAction());

                  return getUserCartAction({ userCart: updatedCart });
                }),
                catchError((error: any) => {
                  this.store.dispatch(stopLoadingCouponAction());
                  this.uiService.showError('Failed To Apply Coupon');

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
      })
    )
  );

  removeCouponEffect = createEffect(() =>
    this.actions$.pipe(
      ofType(removeCouponAction),
      tap(() => this.store.dispatch(startLoadingCouponAction())),
      switchMap(({ isLoggedIn, validCoupon }) => {
        if (isLoggedIn) {
          let authToken: any = localStorage.getItem('auth_token');
          authToken = authToken ? JSON.parse(authToken) : '';

          const headers = new HttpHeaders({
            Authorization: `Bearer ${authToken.value}`,
          });

          const body = {
            coupon_code: validCoupon,
            action: 'remove',
          };

          return this.httpClient
            .post(
              'https://adventures-hub.com/wp-json/custom/v1/cart/coupon',
              body,
              { headers }
            )
            .pipe(
              map((response: any) => {
                this.store.dispatch(stopLoadingCouponAction());

                const updatedItems = response.items.map((item: any) => {
                  return {
                    ...item,
                    images: {
                      imageSrc: item.images[0].thumbnail,
                      imageAlt: item.images[0].alt,
                    },
                  };
                });

                const updatedCart = {
                  items: updatedItems,
                  coupons: response.coupons,
                  payment_method: response.payment_method,
                  totals: response.totals,
                };

                return getUserCartAction({ userCart: updatedCart });
              }),
              catchError((error: any) => {
                this.store.dispatch(stopLoadingCouponAction());
                this.uiService.showError('Failed To Remove Coupon');

                return of(error);
              })
            );
        } else {
          this.store.dispatch(stopLoadingCouponAction());

          let loadedCart: any = localStorage.getItem('Cart');
          loadedCart = loadedCart ? JSON.parse(loadedCart) : [];
          loadedCart.coupons = {};
          localStorage.setItem('Cart', JSON.stringify(loadedCart));
          this.cartService.fetchUserCart({
            mainPageLoading: false,
            sideCartLoading: true,
          });
          return of();
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
