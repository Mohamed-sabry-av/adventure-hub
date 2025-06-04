import { inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { Store } from '@ngrx/store';
import { StoreInterface } from '../store';
import { HttpClient, HttpParams } from '@angular/common/http';
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
import { fetchUserCartAction, getUserCartAction } from '../actions/cart.action';
import { Router } from '@angular/router';
import {
  cartStatusAction,
  startLoadingCouponAction,
  startLoadingOrderAction,
  stopLoadingCouponAction,
  stopLoadingOrderAction,
} from '../actions/ui.action';
import { UIService } from '../../shared/services/ui.service';
import { HandleErrorsService } from '../../core/services/handel-errors.service';
import { environment } from '../../../environments/environment';

const CUSTOM_API_URL = environment.customApiUrl;

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
            console.log('Coupons loaded:', response);
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
            console.error('Error fetching coupons:', error);
            this.store.dispatch(stopLoadingCouponAction());
            this.uiService.showError('Failed to fetch coupons');
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
      tap(() =>
        this.store.dispatch(
          cartStatusAction({
            mainPageLoading: false,
            sideCartLoading: true,
            error: null,
          })
        )
      ),
      switchMap(({ validCoupon, isLoggedIn, invalidCoupon }) => {
        const loadedData = this.cartService.loadedDataFromLS(isLoggedIn);
        if (isLoggedIn) {
          console.log('Applying coupon for logged-in user');
          if (validCoupon) {
            const body = {
              coupon_code: validCoupon[0].code,
              action: 'apply',
            };

            return this.httpClient
              .post(
                `${CUSTOM_API_URL}/cart/coupon`,
                body,
                { headers: loadedData.headers, params: loadedData.params }
              )
              .pipe(
                map((response: any) => {
                  this.store.dispatch(
                    getCouponStatusAction({
                      errorMsg: null,
                      successMsg: 'Coupon applied successfully',
                    })
                  );

                  response.items = response.items.map((item: any) => ({
                    ...item,
                    images: {
                      imageSrc: item.images[0].thumbnail,
                      imageAlt: item.images[0].alt,
                    },
                  }));

                  this.store.dispatch(stopLoadingCouponAction());
                  this.store.dispatch(
                    cartStatusAction({
                      mainPageLoading: false,
                      sideCartLoading: false,
                      error: null,
                    })
                  );
                  return getUserCartAction({ userCart: response });
                }),
                catchError((error: any) => {
                  console.error('Error applying coupon:', error);
                  this.store.dispatch(stopLoadingCouponAction());
                  const errorMessage =
                    error.error?.data?.data?.reason || 'Failed to apply coupon';
                  this.uiService.showError(errorMessage);
                  this.store.dispatch(
                    cartStatusAction({
                      mainPageLoading: false,
                      sideCartLoading: false,
                      error: null,
                    })
                  );
                  return of(
                    getCouponStatusAction({
                      errorMsg: errorMessage,
                      successMsg: null,
                    })
                  );
                })
              );
          } else {
            this.store.dispatch(stopLoadingCouponAction());
            const errorMessage = `Coupon ${invalidCoupon} does not exist`;
            this.uiService.showError(errorMessage);
            this.store.dispatch(
              cartStatusAction({
                mainPageLoading: false,
                sideCartLoading: false,
                error: null,
              })
            );
            return of(
              getCouponStatusAction({
                errorMsg: errorMessage,
                successMsg: null,
              })
            );
          }
        } else {
          if (validCoupon) {
            const body = {
              cart_id: loadedData.loadedCart,
              coupon_code: validCoupon[0].code,
              action: 'apply',
            };

            return this.httpClient
              .post(
                `${CUSTOM_API_URL}/cart/guest/coupon`,
                body
              )
              .pipe(
                map((response: any) => {
                  console.log(response);
                  this.store.dispatch(
                    getCouponStatusAction({
                      errorMsg: null,
                      successMsg: 'Coupon applied successfully',
                    })
                  );

                  response.items = response.items.map((item: any) => ({
                    ...item,
                    images: {
                      imageSrc: item.image.thumbnail,
                      imageAlt: item.image.alt,
                    },
                  }));

                  this.store.dispatch(stopLoadingCouponAction());
                  this.store.dispatch(
                    cartStatusAction({
                      mainPageLoading: false,
                      sideCartLoading: false,
                      error: null,
                    })
                  );
                  return getUserCartAction({ userCart: response });
                }),
                catchError((error: any) => {
                  console.error('Error applying coupon:', error);
                  this.store.dispatch(stopLoadingCouponAction());
                  const errorMessage =
                    error.error?.data?.data?.reason || 'Failed to apply coupon';
                  this.uiService.showError(errorMessage);
                  this.store.dispatch(
                    cartStatusAction({
                      mainPageLoading: false,
                      sideCartLoading: false,
                      error: null,
                    })
                  );
                  return of(
                    getCouponStatusAction({
                      errorMsg: errorMessage,
                      successMsg: null,
                    })
                  );
                })
              );
          } else {
            this.store.dispatch(stopLoadingCouponAction());
            const errorMessage = `Coupon ${invalidCoupon} does not exist`;
            this.uiService.showError(errorMessage);
            this.store.dispatch(
              cartStatusAction({
                mainPageLoading: false,
                sideCartLoading: false,
                error: null,
              })
            );
            return of(
              getCouponStatusAction({
                errorMsg: errorMessage,
                successMsg: null,
              })
            );
          }
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
              `${CUSTOM_API_URL}/cart/coupon`,
              body,
              { headers: loadedData.headers, params: loadedData.params }
            )
            .pipe(
              map((response: any) => {
                console.log('Coupon removed successfully:', response);
                this.store.dispatch(stopLoadingCouponAction());
                response.items = response.items.map((item: any) => ({
                  ...item,
                  images: {
                    imageSrc: item.images[0].thumbnail,
                    imageAlt: item.images[0].alt,
                  },
                }));
                return getUserCartAction({ userCart: response });
              }),
              catchError((error: any) => {
                console.error('Error removing coupon:', error);
                this.store.dispatch(stopLoadingCouponAction());
                this.uiService.showError('Failed to remove coupon');
                return of(error);
              })
            );
        } else {
          const body = {
            cart_id: loadedData.loadedCart,
            coupon_code: validCoupon,
            action: 'remove',
          };

          return this.httpClient
            .post(
              `${CUSTOM_API_URL}/cart/guest/coupon`,
              body
            )
            .pipe(
              map((response: any) => {
                console.log('Coupon removed successfully:', response);
                this.store.dispatch(stopLoadingCouponAction());
                response.items = response.items.map((item: any) => ({
                  ...item,
                  images: {
                    imageSrc: item.image.thumbnail,
                    imageAlt: item.image.alt,
                  },
                }));
                return getUserCartAction({ userCart: response });
              }),
              catchError((error: any) => {
                console.error('Error removing coupon:', error);
                this.store.dispatch(stopLoadingCouponAction());
                this.uiService.showError('Failed to remove coupon');
                return of(error);
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
        return this.httpClient
          .post(`${environment.apiUrl}/api/orders`, orderDetails, {
            headers: { 'Content-Type': 'application/json' },
          })
          .pipe(
            map((res: any) => {
              console.log('Order created successfully:', res);
              const orderId = res.id;
              const orderKey = res.order_key;
              this.router.navigate([`/order-received/${orderId}`], {
                queryParams: { key: orderKey },
              });
              this.store.dispatch(stopLoadingOrderAction());
              return fetchOrderDataAction({ orderId });
            }),
            catchError((error: any) => {
              console.error('Error creating order:', {
                status: error.status,
                statusText: error.statusText,
                message: error.message,
                response:
                  typeof error.error === 'string'
                    ? error.error.substring(0, 200)
                    : error.error,
              });
              this.store.dispatch(stopLoadingOrderAction());
              this.uiService.showError('Failed to create order');
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
            console.log('Order retrieved successfully:', res);
            return getOrderDataAction({ orderDetails: res });
          }),
          catchError((error: any) => {
            console.error('Error retrieving order:', error);
            this.uiService.showError('Failed to retrieve order data');
            return of();
          })
        );
      })
    )
  );
}
