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
  updateCartStockStatusAction,
  updateProductOfUserCartAction,
} from '../actions/cart.action';
import { json } from 'stream/consumers';
import { fetchCouponsAction } from '../actions/checkout.action';
import { ProductService } from '../../core/services/product.service';

export class CartEffect {
  private actions$ = inject(Actions);
  private store = inject(Store<StoreInterface>);
  private router = inject(Router);
  private httpClient = inject(HttpClient);
  private cartService = inject(CartService);
  private productService = inject(ProductService);
  private destroyRef = inject(DestroyRef);

  // initUserCart = createEffect(
  //   () =>
  //     this.actions$.pipe(
  //       ofType(initUserCartAction),
  //       switchMap(() =>
  //         this.cartService.savedCartOfLS$.pipe(
  //           map((cart) => cart.products || []),
  //           filter((products) => products.length !== 0),
  //           concatMap((products: Product[]) =>
  //             from(products).pipe(
  //               concatMap((product: Product) =>
  //                 this.httpClient
  //                   .post('https://ecommerce.routemisr.com/api/v1/cart', {
  //                     productId: product.id,
  //                   })
  //                   .pipe(
  //                     tap(() =>
  //                       console.log(`✅ ADDED Product ID: ${product.id}`)
  //                     ),
  //                     filter(() => product.count! > 1),
  //                     concatMap(() =>
  //                       this.httpClient.put(
  //                         `https://ecommerce.routemisr.com/api/v1/cart/${product.id}`,
  //                         {
  //                           count: product.count,
  //                         }
  //                       )
  //                     )
  //                   )
  //               ),
  //               toArray(),
  //               tap(() => {
  //                 localStorage.removeItem('Cart');
  //               })
  //             )
  //           )
  //         )
  //       )
  //     ),
  //   { dispatch: false }
  // );

  addProductToUserCart = createEffect(() =>
    this.actions$.pipe(
      ofType(addProductToUserCartAction),
      switchMap(({ product, isLoggedIn }) => {
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
              map(() => {
                console.log('ADDEDD');
                setTimeout(() => {
                  this.cartService.cartMode(true);
                }, 3000);
                return fetchUserCartAction({ isLoggedIn: true });
              }),
              catchError((error: any) => {
                console.log('ERRR', error);
                return EMPTY;
              })
            );
        } else {
          let {
            id,
            name,
            regular_price,
            price,
            sale_price,
            attributes,
            images,
            type,
            quantity_limits,
            stock_status,
          } = product;

          let selectedProduct = {
            id,
            name,
            quantity: 1,
            prices: {
              regular_price,
              price,
              sale_price,
            },
            attributes,
            images: {
              imageSrc: images[0].thumbnail,
              imageAlt: images[0].alt,
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
            (p: Product) => p.id === selectedProduct.id
          );

          if (productIndex !== -1) {
            loadedCart.items[productIndex].quantity += 1;
          } else {
            loadedCart.items.push(selectedProduct);
          }

          localStorage.setItem('Cart', JSON.stringify(loadedCart));
          this.cartService.fetchUserCart();
          setTimeout(() => {
            this.cartService.cartMode(true);
          }, 3000);
          return of();
        }
      })
    )
  );

  loadUserCart = createEffect(
    () =>
      this.actions$.pipe(
        ofType(fetchUserCartAction),
        switchMap(({ isLoggedIn }) => {
          if (isLoggedIn) {
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
                  const itemsObj = response.items.map((item: any) => {
                    return {
                      key: item.key,
                      id: item.id,
                      images: {
                        imageSrc: item.images[0].thumbnail,
                        imageAlt: item.images[0].alt,
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
                    };
                  });

                  const cartData = {
                    items: itemsObj,
                    payment_methods: response.payment_methods,
                    totals: response.totals,
                    coupons: response.coupons,
                  };
                  this.store.dispatch(
                    getUserCartAction({ userCart: cartData })
                  );
                }),
                catchError((error: any) => {
                  console.log('ERRRRRRRR', error);
                  return of();
                })
              );
          }
          return of();
        })
      ),
    { dispatch: false }
  );

  updateProductQuantityOfUserCart = createEffect(
    () =>
      this.actions$.pipe(
        ofType(updateProductOfUserCartAction),
        switchMap(
          ({
            product: selectedProduct,
            productQuantity: quantity,
            isLoggedIn,
          }) => {
            if (isLoggedIn) {
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
                      fetchUserCartAction({ isLoggedIn: true })
                    );
                  }),
                  catchError((error) => {
                    console.error('Update Error:', error);
                    return of();
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

              this.cartService.fetchUserCart();
            }
            return of();
          }
        )
      ),
    { dispatch: false }
  );

  deleteProductOfUserCart = createEffect(() =>
    this.actions$.pipe(
      ofType(deleteProductOfUserCarAction),
      switchMap(({ product: selectedProduct, isLoggedIn }) => {
        if (isLoggedIn) {
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
              map(() => {
                console.log('DELETED');
                return fetchUserCartAction({ isLoggedIn: true });
              }),
              catchError((error: any) => {
                console.log('ERRR', error);
                return EMPTY;
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
            this.cartService.fetchUserCart();
          }
          return of();
        }
      })
    )
  );

  updateCartStockStatusEffect = createEffect(
    () =>
      this.actions$.pipe(
        ofType(updateCartStockStatusAction),
        switchMap(({ productIds, coupon }) => {
          const requests = productIds.map((productId) =>
            this.productService.getProductById(Number(productId)).pipe(
              map((product) => ({
                productId,
                stockStatus: product.stock_status,
              })),
              catchError((error) =>
                of({ productId, stockStatus: 'unknown', error })
              )
            )
          );

          return forkJoin(requests).pipe(
            map((updatedProducts: any) => {
              this.updateLocalStorage(coupon, updatedProducts);
            }),
            catchError((error) => {
              console.error('Error updating stock status:', error);
              return of(error);
            })
          );
        })
      ),
    { dispatch: false }
  );

  private updateLocalStorage(
    validCoupon: any,
    updatedProducts: { productId: string; stockStatus: string }[]
  ) {
    let cart = JSON.parse(localStorage.getItem('Cart') || '{}');
    if (cart.items) {
      cart.items = cart.items.map((item: any) => {
        const updatedProduct = updatedProducts?.find(
          (p) => p.productId === item.id
        );
        if (updatedProduct) {
          return { ...item, stock_status: updatedProduct.stockStatus };
        }
        return item;
      });
    }
    cart = this.cartService.calcCartPrice(cart.items, validCoupon);

    localStorage.setItem('Cart', JSON.stringify(cart));

    this.store.dispatch(getUserCartAction({ userCart: cart }));
  }
}
