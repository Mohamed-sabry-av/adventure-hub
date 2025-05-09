import { inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { Store } from '@ngrx/store';
import { StoreInterface } from '../store';
import { HttpClient, HttpHeaders } from '@angular/common/http';

import { CartService } from '../../features/cart/service/cart.service';
import { catchError, map, Observable, of, switchMap } from 'rxjs';
import {
  addProductToUserCartAction,
  deleteProductOfUserCarAction,
  clearUserCarAction,
  fetchUserCartAction,
  getUserCartAction,
  syncCartAction,
  updateProductOfUserCartAction,
} from '../actions/cart.action';
import { getCouponDataAction } from '../actions/checkout.action';
import {
  cartStatusAction,
  startLoadingSpinnerAction,
  stopLoadingSpinnerAction,
} from '../actions/ui.action';
import { UIService } from '../../shared/services/ui.service';
import { Router } from '@angular/router';
import { SideOptionsService } from '../../core/services/side-options.service';
import { ApiService } from '../../core/services/api.service';

export class CartEffect {
  private actions$ = inject(Actions);
  private store = inject(Store<StoreInterface>);
  private httpClient = inject(HttpClient);
  private cartService = inject(CartService);
  private apiService = inject(ApiService);
  private uiService = inject(UIService);
  private router = inject(Router);
  private sideOptionsService = inject(SideOptionsService);

  syncOfflineCartToLive = createEffect(() =>
    this.actions$.pipe(
      ofType(syncCartAction),
      switchMap(({ authToken }) => {
        const headers = new HttpHeaders({
          Authorization: `Bearer ${authToken}`,
        });

        const loadedCart = this.cartService.loadedDataFromLS(false).loadedCart;
        const body = { cart_id: loadedCart };

        return this.httpClient
          .post(
            'https://adventures-hub.com/wp-json/custom/v1/cart/bulk-add',
            body,
            { headers }
          )
          .pipe(
            map((response: any) => {
              localStorage.removeItem('cartId');
              return getUserCartAction({ userCart: response });
            }),
            catchError((error: any) => {
              this.uiService.showError(
                'Failed To Sync Cart Offline To Cart Online'
              );
              return of(error);
            })
          );
      })
    )
  );

  addProductToUserCart = createEffect(() =>
    this.actions$.pipe(
      ofType(addProductToUserCartAction),
      switchMap(({ product, isLoggedIn, buyItNow }) => {
        this.store.dispatch(
          startLoadingSpinnerAction({ buttonName: buyItNow ? 'buy' : 'add' })
        );

        const loadedData = this.cartService.loadedDataFromLS(isLoggedIn);

        if (isLoggedIn) {
          const body = {
            product_id: product.id,
          };

          return this.httpClient
            .post(
              'https://adventures-hub.com/wp-json/custom/v1/cart/add',
              body,
              {
                headers: loadedData.headers,
              }
            )
            .pipe(
              map((response: any) => {
                this.store.dispatch(
                  stopLoadingSpinnerAction({
                    buttonName: buyItNow ? 'buy' : 'add',
                  })
                );
                this.sideOptionsService.closeSideOptions();
                if (buyItNow) {
                  this.router.navigateByUrl('/checkout', { replaceUrl: true });
                  return getUserCartAction({ userCart: response });
                } else {
                  this.cartService.cartMode(true);
                  return getUserCartAction({ userCart: response });
                }
              }),
              catchError((error: any) => {
                this.store.dispatch(
                  stopLoadingSpinnerAction({
                    buttonName: buyItNow ? 'buy' : 'add',
                  })
                );

                this.uiService.showError(
                  error.error?.message
                    ? error.error.message
                    : `Failed to Add Product.`
                );
                return of(
                  cartStatusAction({
                    mainPageLoading: false,
                    sideCartLoading: false,
                    error: error.message || 'Failed to Add Product',
                  })
                );
              })
            );
        } else {
          const apiUrl = loadedData?.loadedCart
            ? 'https://adventures-hub.com/wp-json/custom/v1/cart/guest/add'
            : 'https://adventures-hub.com/wp-json/custom/v1/cart/guest';

          const body = {
            cart_id: loadedData.loadedCart ? loadedData.loadedCart : '',
            product_id: product.id,
          };

          return this.httpClient.post(apiUrl, body).pipe(
            map((response: any) => {
              this.store.dispatch(
                stopLoadingSpinnerAction({
                  buttonName: buyItNow ? 'buy' : 'add',
                })
              );
              this.sideOptionsService.closeSideOptions();
              localStorage.setItem('cartId', JSON.stringify(response.cart_id));
              if (buyItNow) {
                this.router.navigateByUrl('/checkout', { replaceUrl: true });
                return getUserCartAction({ userCart: response });
              } else {
                this.cartService.cartMode(true);
                return getUserCartAction({ userCart: response });
              }
            }),
            catchError((error: any) => {
              this.store.dispatch(
                stopLoadingSpinnerAction({
                  buttonName: buyItNow ? 'buy' : 'add',
                })
              );

              this.uiService.showError(
                error.error?.message
                  ? error.error.message
                  : `Failed to Add Product.`
              );
              return of(
                cartStatusAction({
                  mainPageLoading: false,
                  sideCartLoading: false,
                  error: error.message || 'Failed to Add Product',
                })
              );
            })
          );
        }
      })
    )
  );

  loadUserCart = createEffect(() =>
    this.actions$.pipe(
      ofType(fetchUserCartAction),
      switchMap(
        ({
          isLoggedIn,
          mainPageLoading,
          sideCartLoading,
          openSideCart,
          buyItNow,
        }) => {
          this.store.dispatch(
            cartStatusAction({
              mainPageLoading: mainPageLoading,
              sideCartLoading: sideCartLoading,
              error: null,
            })
          );
          const apiUrl = `https://adventures-hub.com/wp-json/custom/v1/cart${
            isLoggedIn ? '' : '/guest/load'
          }`;

          console.log(apiUrl);

          const loadedData = this.cartService.loadedDataFromLS(isLoggedIn);

          let requestMethod: Observable<any> = of();

          if (isLoggedIn) {
            const options = {
              headers: loadedData.headers,
              params: loadedData.params,
            };
            requestMethod = this.httpClient.get(apiUrl, options);
          }

          if (!isLoggedIn) {
            const body = {
              cart_id: loadedData.loadedCart,
            };

            requestMethod = this.httpClient.post(apiUrl, body, {
              params: loadedData.params,
            });
          }

          return requestMethod.pipe(
            map((response: any) => {
              response.items = response.items.map((item: any) => {
                return {
                  key: item.key,
                  id: item.id,
                  image: item.image,
                  name: item.name,
                  permalink: item.permalink,
                  type: item.type,
                  variation: item.variation,
                  prices: item.prices,
                  quantity: item.quantity,
                  quantity_limits: item.quantity_limits,
                  attributes: item.attributes,
                  totals: item.totals,
                  stock_status: item.stock_status,
                };
              });

              const coupons = response.coupons || {};
              const couponKeys = Object.keys(coupons);

              const couponData =
                couponKeys.length > 0 ? coupons[couponKeys[0]] : null;

              this.store.dispatch(getCouponDataAction({ coupon: couponData }));
              this.store.dispatch(
                cartStatusAction({
                  mainPageLoading: false,
                  sideCartLoading: false,
                  error: null,
                })
              );

              this.store.dispatch(
                stopLoadingSpinnerAction({
                  buttonName: buyItNow ? 'buy' : 'add',
                })
              );

              this.sideOptionsService.closeSideOptions();
              if (buyItNow) {
                this.router.navigateByUrl('/checkout', { replaceUrl: true });
              } else {
                this.cartService.cartMode(openSideCart ? openSideCart : false);
              }

              return getUserCartAction({ userCart: response });
            }),
            catchError((error: any) => {
              this.store.dispatch(
                stopLoadingSpinnerAction({
                  buttonName: buyItNow ? 'buy' : 'add',
                })
              );

              this.uiService.showError(
                error.error.message
                  ? error.error.message
                  : `Something went wrong fetching the available data. Please try again later.`
              );
              this.store.dispatch(
                cartStatusAction({
                  mainPageLoading: false,
                  sideCartLoading: false,
                  error: null,
                })
              );

              return of(
                cartStatusAction({
                  mainPageLoading: false,
                  sideCartLoading: false,
                  error:
                    error.error.message ||
                    'Something went wrong fetching the available data. Please try again later.',
                })
              );
            })
          );
        }
      )
    )
  );

  updateProductQuantityOfUserCart = createEffect(() =>
    this.actions$.pipe(
      ofType(updateProductOfUserCartAction),
      switchMap(
        ({
          product: selectedProduct,
          productQuantity: quantity,
          isLoggedIn,
        }) => {
          const loadedData = this.cartService.loadedDataFromLS(isLoggedIn);

          if (isLoggedIn) {
            this.store.dispatch(
              cartStatusAction({
                mainPageLoading: false,
                sideCartLoading: true,
                error: null,
              })
            );
            const body = {
              product_id: selectedProduct.id,
              quantity: quantity,
            };
            return this.httpClient
              .put(
                'https://adventures-hub.com/wp-json/custom/v1/cart/update',
                body,
                { headers: loadedData.headers }
              )
              .pipe(
                map((response: any) => {
                  this.store.dispatch(
                    cartStatusAction({
                      mainPageLoading: false,
                      sideCartLoading: false,
                      error: null,
                    })
                  );

                  return getUserCartAction({ userCart: response });
                }),
                catchError((error) => {
                  this.store.dispatch(
                    cartStatusAction({
                      mainPageLoading: false,
                      sideCartLoading: false,
                      error: null,
                    })
                  );
                  this.uiService.showError('Failed to Update Product');
                  return of(
                    cartStatusAction({
                      mainPageLoading: false,
                      sideCartLoading: false,
                      error: error.message || 'Failed to Update Product',
                    })
                  );
                })
              );
          } else {
            this.store.dispatch(
              cartStatusAction({
                mainPageLoading: false,
                sideCartLoading: true,
                error: null,
              })
            );
            const body = {
              cart_id: loadedData.loadedCart,
              product_id: selectedProduct.id,
              quantity: quantity,
            };
            return this.httpClient
              .post(
                'https://adventures-hub.com/wp-json/custom/v1/cart/guest/update',
                body,
                { headers: loadedData.headers }
              )
              .pipe(
                map((response: any) => {
                  this.store.dispatch(
                    cartStatusAction({
                      mainPageLoading: false,
                      sideCartLoading: false,
                      error: null,
                    })
                  );

                  return getUserCartAction({ userCart: response });
                }),
                catchError((error) => {
                  this.store.dispatch(
                    cartStatusAction({
                      mainPageLoading: false,
                      sideCartLoading: false,
                      error: null,
                    })
                  );
                  this.uiService.showError('Failed to Update Product');
                  return of(
                    cartStatusAction({
                      mainPageLoading: false,
                      sideCartLoading: false,
                      error: error.message || 'Failed to Update Product',
                    })
                  );
                })
              );
          }
        }
      )
    )
  );

  deleteProductOfUserCart = createEffect(() =>
    this.actions$.pipe(
      ofType(deleteProductOfUserCarAction),
      switchMap(({ product: selectedProduct, isLoggedIn, openSideCart }) => {
        const loadedData = this.cartService.loadedDataFromLS(isLoggedIn);

        if (isLoggedIn) {
          this.store.dispatch(
            cartStatusAction({
              mainPageLoading: false,
              sideCartLoading: true,
              error: null,
            })
          );

          const body = {
            product_id: selectedProduct.id,
          };

          return this.httpClient
            .post(
              'https://adventures-hub.com/wp-json/custom/v1/cart/remove',
              body,
              { headers: loadedData.headers }
            )
            .pipe(
              map((response: any) => {
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
                this.uiService.showError(
                  error?.error?.message
                    ? error.error.message
                    : 'Failed to Delete Product'
                );

                return of(
                  cartStatusAction({
                    mainPageLoading: false,
                    sideCartLoading: false,
                    error: error?.error?.message || 'Failed to Delete Product',
                  })
                );
              })
            );
        } else {
          this.store.dispatch(
            cartStatusAction({
              mainPageLoading: false,
              sideCartLoading: true,
              error: null,
            })
          );

          const body = {
            cart_id: loadedData.loadedCart,
            product_id: selectedProduct.id,
          };

          return this.httpClient
            .post(
              'https://adventures-hub.com/wp-json/custom/v1/cart/guest/remove',
              body
            )
            .pipe(
              map((response: any) => {
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
                this.uiService.showError(
                  error?.error?.message
                    ? error.error.message
                    : 'Failed to Delete Product'
                );

                return of(
                  cartStatusAction({
                    mainPageLoading: false,
                    sideCartLoading: false,
                    error: error?.error?.message || 'Failed to Delete Product',
                  })
                );
              })
            );
        }
      })
    )
  );

  clearUserCart = createEffect(() =>
    this.actions$.pipe(
      ofType(clearUserCarAction),
      switchMap(({ isLoggedIn }) => {
        if (isLoggedIn) {
          const loadedData = this.cartService.loadedDataFromLS(isLoggedIn);

          return this.httpClient
            .post(
              'https://adventures-hub.com/wp-json/custom/v1/cart/clear',
              {},
              { headers: loadedData.headers }
            )
            .pipe(
              map((res) => {
                return fetchUserCartAction({
                  isLoggedIn: true,
                  mainPageLoading: true,
                  sideCartLoading: false,
                });
              }),
              catchError((error: any) => {
                this.uiService.showError(
                  error?.error?.message
                    ? error.error.message
                    : 'Failed to Delete Product'
                );

                return of(
                  cartStatusAction({
                    mainPageLoading: false,
                    sideCartLoading: false,
                    error: error?.error?.message || 'Failed to Delete Product',
                  })
                );
              })
            );
        } else {
          localStorage.removeItem('cartId');

          return of(
            fetchUserCartAction({
              isLoggedIn: false,
              mainPageLoading: true,
              sideCartLoading: false,
            })
          );
        }
      })
    )
  );
}
