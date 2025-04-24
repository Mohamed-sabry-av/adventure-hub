import { DestroyRef, inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { Store } from '@ngrx/store';
import { StoreInterface } from '../store';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';

import { Router } from '@angular/router';
import { CartService } from '../../features/cart/service/cart.service';
import { Product } from '../../interfaces/product';
import {
  catchError,
  EMPTY,
  forkJoin,
  map,
  of,
  switchMap,
  take,
  tap,
} from 'rxjs';
import {
  addProductToUserCartAction,
  deleteProductOfUserCarAction,
  fetchUserCartAction,
  getUserCartAction,
  syncCartAction,
  updateCartStockStatusAction,
  updateProductOfUserCartAction,
} from '../actions/cart.action';
import { getCouponDataAction } from '../actions/checkout.action';
import { ProductService } from '../../core/services/product.service';
import {
  cartStatusAction,
  startLoadingAction,
  startLoadingCartAction,
  stopLoadingAction,
  stopLoadingCartAction,
  dialogFailureAction,
} from '../actions/ui.action';
import { UIService } from '../../shared/services/ui.service';
import { at } from 'lodash';

export class CartEffect {
  private actions$ = inject(Actions);
  private store = inject(Store<StoreInterface>);
  private httpClient = inject(HttpClient);
  private cartService = inject(CartService);
  private productService = inject(ProductService);
  private uiService = inject(UIService);

  syncOfflineCartToLive = createEffect(() =>
    this.actions$.pipe(
      ofType(syncCartAction),
      switchMap(({ authToken, items }) => {
        const body = { products: items };
        console.log(body);
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
            map((response: any) => {
              console.log(response.cart.items);
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
      switchMap(({ product, isLoggedIn }) => {
        console.log('From Effect', product);

        if (isLoggedIn) {
          let authToken: any = localStorage.getItem('auth_token');
          authToken = authToken ? JSON.parse(authToken) : '';

          const headers = new HttpHeaders({
            Authorization: `Bearer ${authToken.value}`,
          });

          const body = {
            product_id: product.id,
          };

          return this.httpClient
            .post(
              'https://adventures-hub.com/wp-json/custom/v1/cart/add',
              body,
              { headers }
            )
            .pipe(
              map((response: any) => {
                console.log('Product Added To Online Cart');
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
                this.cartService.cartMode(true);
                return getUserCartAction({ userCart: updatedCart });
              }),
              catchError((error: any) => {
                console.log('Error in adding product to online cart:', error);
                this.uiService.showError('Failed to Add Product');
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
          console.log('Adding product to local cart:', product);
          let {
            id,
            name,
            regular_price,
            price,
            sale_price,
            attributes,
            image,
            images,
            type,
            quantity_limits,
            stock_status,
            additional_images,
            permalink,
          } = product;

          const updatedAttributes =
            type === 'variation'
              ? attributes
              : attributes.map((attribute: any) => {
                  return {
                    name: attribute.name,
                    option: attribute.options[0].name,
                  };
                });

          let selectedProduct = {
            permalink,
            id,
            name,
            quantity: 1,
            prices: {
              regular_price,
              price,
              sale_price,
            },
            attributes: updatedAttributes,
            images: {
              imageSrc:
                type === 'variation' ? image.thumbnail : images[0].thumbnail,
              imageAlt:
                type === 'variation'
                  ? additional_images?.alt || 'product-image'
                  : images[0].alt,
            },
            type,
            quantity_limits,
            stock_status,
            totals: {},
          };

          const productTotals: number =
            selectedProduct.prices.price * selectedProduct.quantity;

          (selectedProduct as any).totals.line_total = productTotals;

          let loadedCart: any = localStorage.getItem('Cart');
          loadedCart = loadedCart
            ? JSON.parse(loadedCart)
            : { items: [], coupons: {}, totals: {} };

          const productIndex = loadedCart.items.findIndex(
            (p: any) => p.id === selectedProduct.id
          );

          if (productIndex !== -1) {
            loadedCart.items[productIndex].quantity += 1;
          } else {
            loadedCart.items.push(selectedProduct);
          }

          localStorage.setItem('Cart', JSON.stringify(loadedCart));
          this.cartService.fetchUserCart({
            mainPageLoading: false,
            sideCartLoading: false,
          });
          this.cartService.cartMode(true);

          return of(
            getUserCartAction({
              userCart: loadedCart,
            })
          );
        }
      })
    )
  );

  loadUserCart = createEffect(() =>
    this.actions$.pipe(
      ofType(fetchUserCartAction),
      tap(() =>
        this.store.dispatch(
          cartStatusAction({
            mainPageLoading: true,
            sideCartLoading: false,
            error: null,
          })
        )
      ),
      switchMap(() => {
        let authToken: any = localStorage.getItem('auth_token');
        authToken = authToken ? JSON.parse(authToken) : '';

        const options = {
          headers: new HttpHeaders({
            Authorization: `Bearer ${authToken.value}`,
          }),
          params: new HttpParams().set(
            '_fields',
            'items,totals,payment_methods,coupons'
          ),
        };

        return this.httpClient
          .get('https://adventures-hub.com/wp-json/custom/v1/cart', options)
          .pipe(
            map((response: any) => {
              console.log(response);

              const itemsObj = response.items.map((item: any) => {
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

              const cartData = {
                items: itemsObj,
                payment_methods: response.payment_methods,
                totals: response.totals,
                coupons: response.coupons,
              };

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

              return getUserCartAction({ userCart: cartData });
            }),
            catchError((error: any) => {
              console.log(error);

              this.uiService.showError(
                `Something went wrong fetching the available data. Please try again later.`
              );

              return of(
                cartStatusAction({
                  mainPageLoading: false,
                  sideCartLoading: false,
                  error:
                    error.message ||
                    'Something went wrong fetching the available data. Please try again later.',
                })
              );
            })
          );
      })
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
          if (isLoggedIn) {
            this.store.dispatch(
              cartStatusAction({
                mainPageLoading: false,
                sideCartLoading: true,
                error: null,
              })
            );
            let authToken: any = localStorage.getItem('auth_token');
            authToken = authToken ? JSON.parse(authToken) : '';

            const headers = new HttpHeaders({
              Authorization: `Bearer ${authToken.value}`,
            });

            const body = {
              product_id: selectedProduct.id,
              quantity: quantity,
            };

            console.log(body);

            return this.httpClient
              .put(
                'https://adventures-hub.com/wp-json/custom/v1/cart/update',
                body,
                { headers }
              )
              .pipe(
                map((response: any) => {
                  console.log('Update Success:', response);
                  this.store.dispatch(
                    cartStatusAction({
                      mainPageLoading: false,
                      sideCartLoading: false,
                      error: null,
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
                  return getUserCartAction({ userCart: updatedCart });
                }),
                catchError((error) => {
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

          if (!isLoggedIn) {
            let loadedCart: any = localStorage.getItem('Cart');
            loadedCart = loadedCart ? JSON.parse(loadedCart) : [];

            const updatedCart = loadedCart.items.map((product: any) =>
              product.id === selectedProduct.id
                ? {
                    ...product,
                    quantity,
                    totals: {
                      line_total: quantity * selectedProduct.prices.price,
                    },
                  }
                : product
            );

            loadedCart.items = updatedCart;
            localStorage.setItem('Cart', JSON.stringify(loadedCart));

            this.cartService.fetchUserCart({
              mainPageLoading: false,
              sideCartLoading: true,
            });
          }
          return of();
        }
      )
    )
  );

  deleteProductOfUserCart = createEffect(() =>
    this.actions$.pipe(
      ofType(deleteProductOfUserCarAction),
      switchMap(({ product: selectedProduct, isLoggedIn }) => {
        if (isLoggedIn) {
          this.store.dispatch(
            cartStatusAction({
              mainPageLoading: false,
              sideCartLoading: true,
              error: null,
            })
          );
          let authToken: any = localStorage.getItem('auth_token');
          authToken = authToken ? JSON.parse(authToken) : '';

          const headers = new HttpHeaders({
            Authorization: `Bearer ${authToken.value}`,
          });

          const body = {
            product_id: selectedProduct.id,
          };

          return this.httpClient
            .post(
              'https://adventures-hub.com/wp-json/custom/v1/cart/remove',
              body,
              { headers }
            )
            .pipe(
              map((response: any) => {
                console.log('DELETED');
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
                this.uiService.showError('Failed to Delete Product');

                return of(
                  cartStatusAction({
                    mainPageLoading: false,
                    sideCartLoading: false,
                    error: error.message || 'Failed to Delete Product',
                  })
                );
              })
            );
        } else {
          let loadedCart: any = localStorage.getItem('Cart');
          loadedCart = loadedCart
            ? JSON.parse(loadedCart)
            : { items: [], coupons: {}, totals: {} };

          if (!loadedCart.items) {
            loadedCart.items = [];
          }

          const updatedProducts = loadedCart.items.filter(
            (product: Product) => product.id !== selectedProduct.id
          );

          loadedCart.items = updatedProducts;

          if (loadedCart.items.length === 0) {
            localStorage.removeItem('Cart');
            this.store.dispatch(
              getUserCartAction({
                userCart: { items: [], coupons: {}, totals: {} },
              })
            );
          } else {
            localStorage.setItem('Cart', JSON.stringify(loadedCart));
            this.cartService.fetchUserCart({
              mainPageLoading: false,
              sideCartLoading: true,
            });
          }
          return of();
        }
      })
    )
  );

  updateCartStockStatusEffect = createEffect(() =>
    this.actions$.pipe(
      ofType(updateCartStockStatusAction),
      switchMap(({ productIds, coupon }) => {
        const requests = productIds.map((productId) =>
          this.productService.getProductById(Number(productId)).pipe(
            map((product) => ({
              productId,
              stockStatus: product.stock_status,
              permalink: product.permalink,
            })),
            catchError((error) => {
              this.uiService.showError('Failed to Update Product Stock');

              return of({ productId, stockStatus: 'unknown', error });
            })
          )
        );

        if (requests.length === 0) {
          this.updateLocalStorage(coupon, []);
          return of(
            cartStatusAction({
              mainPageLoading: false,
              sideCartLoading: false,
              error: null,
            })
          );
        }

        return forkJoin(requests).pipe(
          map((updatedProducts: any) => {
            this.updateLocalStorage(coupon, updatedProducts);
            return cartStatusAction({
              mainPageLoading: false,
              sideCartLoading: false,
              error: null,
            });
          }),
          catchError((error) => {
            this.uiService.showError('Failed to Update Product Stock');

            return of(
              cartStatusAction({
                mainPageLoading: false,
                sideCartLoading: false,
                error: error.message || 'Failed to update stock status',
              })
            );
          })
        );
      })
    )
  );

  private updateLocalStorage(
    validCoupon: any,
    updatedProducts: {
      productId: string;
      stockStatus: string;
      permalink: string;
    }[]
  ) {
    let cart = JSON.parse(localStorage.getItem('Cart') || '[]');
    if (cart.items) {
      cart.items = cart.items.map((item: any) => {
        const updatedProduct = updatedProducts?.find(
          (p) => p.productId === item.id
        );
        if (updatedProduct) {
          return {
            ...item,
            stock_status: updatedProduct.stockStatus,
            permalink: updatedProduct.permalink,
          };
        }
        return item;
      });
    }

    if (cart?.items?.length > 0) {
      cart = this.cartService.calcCartPrice(cart.items, validCoupon);
      localStorage.setItem('Cart', JSON.stringify(cart));
    }

    this.store.dispatch(getUserCartAction({ userCart: cart }));
  }
}
