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

export class CartEffect {
  private actions$ = inject(Actions);
  private store = inject(Store<StoreInterface>);
  private httpClient = inject(HttpClient);
  private cartService = inject(CartService);
  private uiService = inject(UIService);
  private router = inject(Router);
  private sideOptionsService = inject(SideOptionsService);

  syncOfflineCartToLive = createEffect(() =>
    this.actions$.pipe(
      ofType(syncCartAction),
      switchMap(({ authToken, items }) => {
        const body = { products: items };

        const headers = new HttpHeaders({
          Authorization: `Bearer ${authToken}`,
        });

        return this.httpClient
          .post(
            'https://adventures-hub.com/wp-json/custom/v1/cart/add_multiple',
            body,
            { headers }
          )
          .pipe(
            map(() => {
              console.log('cart Synceed');
              localStorage.removeItem('Cart');
              return fetchUserCartAction({
                isLoggedIn: true,
                mainPageLoading: true,
                sideCartLoading: false,
              });
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
        console.log('From Effect', product);
        this.store.dispatch(
          startLoadingSpinnerAction({ buttonName: buyItNow ? 'buy' : 'add' })
        );

        const apiUrl = isLoggedIn
          ? 'https://adventures-hub.com/wp-json/custom/v1/cart/add'
          : `https://adventures-hub.com/wp-json/custom/v1/product/${product.id}/status`;

        const loadedData = this.cartService.loadedDataFromLS(isLoggedIn);
        let requestMethod: Observable<any> = of();

        if (isLoggedIn) {
          const body = {
            product_id: product.id,
          };
          requestMethod = this.httpClient.post(apiUrl, body, {
            headers: loadedData.headers,
          });
        }

        if (!isLoggedIn) {
          requestMethod = this.httpClient.get(apiUrl);
        }

        return requestMethod.pipe(
          map((response: any) => {
            if (isLoggedIn) {
              console.log('Product Added To Cart Online');
              response.items = response.items.map((item: any) => {
                return {
                  ...item,
                  images: {
                    imageSrc: item.images[0].thumbnail,
                    imageAlt: item.images[0].alt,
                  },
                };
              });

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
            } else {
              const stockQuantity = response.stock_quantity || 0;
              const quantityLimits = response.quantity_limits || {
                minimum: 1,
                maximum: null,
                multiple_of: 1,
              };
              const minQuantity = quantityLimits.minimum || 1;
              const maxQuantity = quantityLimits.maximum || null;

              let selectedProduct = {
                product_id: product.id,
                quantity: 1,
              };

              const loadedCart = loadedData.loadedCart.items;
              const productIndex = loadedCart.findIndex(
                (p: any) => p.product_id === selectedProduct.product_id
              );

              let newQuantity = 1;
              if (productIndex !== -1) {
                newQuantity = loadedCart[productIndex].quantity + 1;
              }

              if (newQuantity < minQuantity) {
                this.uiService.showError(
                  `Minimum quantity for "${response.name}" is ${minQuantity}.`
                );
                return cartStatusAction({
                  mainPageLoading: false,
                  sideCartLoading: false,
                  error: `Minimum quantity for "${response.name}" is ${minQuantity}.`,
                });
              }

              if (maxQuantity !== null && newQuantity > maxQuantity) {
                this.uiService.showError(
                  `Maximum quantity for "${response.name}" is ${maxQuantity}.`
                );
                return cartStatusAction({
                  mainPageLoading: false,
                  sideCartLoading: false,
                  error: `Maximum quantity for "${response.name}" is ${maxQuantity}.`,
                });
              }

              if (newQuantity > stockQuantity) {
                this.uiService.showError(
                  `Cannot add more of "${response.name}" to the cart. Only ${stockQuantity} remaining in stock.`
                );
                return cartStatusAction({
                  mainPageLoading: false,
                  sideCartLoading: false,
                  error: `Cannot add more of "${response.name}". Only ${stockQuantity} remaining in stock.`,
                });
              }

              if (productIndex !== -1) {
                loadedCart[productIndex].quantity = newQuantity;
              } else {
                loadedCart.push(selectedProduct);
              }

              localStorage.setItem(
                'Cart',
                JSON.stringify(loadedData.loadedCart)
              );

              if (buyItNow) {
                return fetchUserCartAction({
                  isLoggedIn: false,
                  mainPageLoading: false,
                  sideCartLoading: false,
                  openSideCart: false,
                  buyItNow,
                });
              }

              return fetchUserCartAction({
                isLoggedIn: false,
                mainPageLoading: false,
                sideCartLoading: false,
                openSideCart: true,
                buyItNow,
              });
            }
          }),
          catchError((error: any) => {
            this.store.dispatch(
              stopLoadingSpinnerAction({ buttonName: buyItNow ? 'buy' : 'add' })
            );

            console.log('Error in adding product to cart:', error);
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
            isLoggedIn ? '' : '/guest'
          }`;

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
              products: loadedData.loadedCart.items,
              coupons: loadedData.loadedCart.coupons,
            };

            console.log(body);
            requestMethod = this.httpClient.post(apiUrl, body, {
              params: loadedData.params,
            });
          }

          return requestMethod.pipe(
            map((response: any) => {
              console.log(response);

              response.items = response.items.map((item: any) => {
                return {
                  key: item.key,
                  id: item.id,
                  images: {
                    imageSrc: item.images[0]?.thumbnail || '',
                    imageAlt: item.images[0]?.alt || 'product-image',
                  },
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
              console.log(error);

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
                  console.log('Update Success In Online Cart:', response);
                  this.store.dispatch(
                    cartStatusAction({
                      mainPageLoading: false,
                      sideCartLoading: false,
                      error: null,
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
                  return getUserCartAction({ userCart: response });
                }),
                catchError((error) => {
                  console.log(error);
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
            loadedData.loadedCart.items = loadedData.loadedCart.items.map(
              (product: any) =>
                product.product_id === selectedProduct.id
                  ? {
                      ...product,
                      quantity,
                    }
                  : product
            );

            localStorage.setItem('Cart', JSON.stringify(loadedData.loadedCart));

            return of(
              fetchUserCartAction({
                isLoggedIn: false,
                mainPageLoading: false,
                sideCartLoading: true,
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
      switchMap(({ product: selectedProduct, isLoggedIn }) => {
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
                console.log('DELETED From Online Cart');
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
                this.store.dispatch(
                  cartStatusAction({
                    mainPageLoading: false,
                    sideCartLoading: false,
                    error: null,
                  })
                );
                return getUserCartAction({ userCart: updatedCart });
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
          if (!loadedData.loadedCart.items) {
            loadedData.loadedCart.items = [];
          }

          loadedData.loadedCart.items = loadedData.loadedCart.items.filter(
            (product: any) => product.product_id !== selectedProduct.id
          );

          if (loadedData.loadedCart.items.length === 0) {
            localStorage.removeItem('Cart');
            this.store.dispatch(
              getUserCartAction({
                userCart: { items: [], coupons: {}, totals: {} },
              })
            );
          } else {
            localStorage.setItem('Cart', JSON.stringify(loadedData.loadedCart));
          }
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
                console.log('CART IS EMPTY');
                console.log(res);

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
          localStorage.removeItem('Cart');
          console.log('CART IS EMPTY');

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
