import { DestroyRef, inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { Store } from '@ngrx/store';
import { StoreInterface } from '../store';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';

import { Router } from '@angular/router';
import { CartService } from '../../features/cart/service/cart.service';
import { Product } from '../../interfaces/product';
import { catchError, map, of, switchMap, take, tap } from 'rxjs';
import {
  addProductToUserCartAction,
  deleteProductOfUserCarAction,
  fetchUserCartAction,
  getUserCartAction,
  updateProductOfUserCartAction,
} from '../actions/cart.action';

export class CartEffect {
  private actions$ = inject(Actions);
  private store = inject(Store<StoreInterface>);
  private router = inject(Router);
  private httpClient = inject(HttpClient);
  private cartService = inject(CartService);
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

  addProductToUserCart = createEffect(
    () =>
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
                  this.store.dispatch(
                    fetchUserCartAction({ isLoggedIn: true })
                  );
                  console.log('ADDEDD');
                }),
                catchError((error: any) => {
                  console.log('ERRR', error);
                  return of();
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
              image,
              type,
            } = product;

            image = image.src;

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
              images: image,
              type,
            };

            let loadedProducts: any = localStorage.getItem('Cart');
            loadedProducts = loadedProducts
              ? JSON.parse(loadedProducts).items
              : [];

            const productIndex = loadedProducts.findIndex(
              (p: Product) => p.id === selectedProduct.id
            );

            if (productIndex !== -1) {
              loadedProducts[productIndex].quantity += 1;
            } else {
              loadedProducts.push(selectedProduct);
            }

            const cart = this.cartService.calcCartPrice(loadedProducts);
            localStorage.setItem('Cart', JSON.stringify(cart));

            this.store.dispatch(fetchUserCartAction({ isLoggedIn: false }));
            return '';
          }
        })
      ),
    { dispatch: false }
  );

  loadUserCart = createEffect(() =>
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
              'items,totals,payment_methods'
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
                    images: item.images[0].src,
                    name: item.name,
                    permalink: item.permalink,
                    type: item.type,
                    variation: item.variation,
                    prices: item.prices,
                    quantity: item.quantity,
                    quantity_limits: item.quantity_limits,
                    attributes: item.attributes,
                  };
                });

                const cartData = {
                  items: itemsObj,
                  payment_methods: response.payment_methods,
                  totals: response.totals,
                };

                return getUserCartAction({ userCart: cartData });
              }),
              catchError((error: any) => {
                console.log('ERRRRRRRR', error);
                return of();
              })
            );
        } else {
          let loadedCart: any = localStorage.getItem('Cart');
          loadedCart = loadedCart ? JSON.parse(loadedCart) : [];
          return of(getUserCartAction({ userCart: loadedCart }));
        }
      })
    )
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
              loadedCart = loadedCart ? JSON.parse(loadedCart).items : [];

              const updatedCart = loadedCart.map((product: Product) =>
                product.id === selectedProduct.id
                  ? { ...product, quantity }
                  : product
              );

              const cart = this.cartService.calcCartPrice(updatedCart);
              console.log(cart);

              localStorage.setItem('Cart', JSON.stringify(cart));
              this.store.dispatch(fetchUserCartAction({ isLoggedIn: false }));
            }
            return '';
          }
        )
      ),
    { dispatch: false }
  );

  deleteProductOfUserCart = createEffect(
    () =>
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
                  this.store.dispatch(
                    fetchUserCartAction({ isLoggedIn: true })
                  );
                  console.log('DELETED');
                }),
                catchError((error: any) => {
                  console.log('ERRR', error);
                  return of();
                })
              );
          } else {
            let loadedProducts: any = localStorage.getItem('Cart');
            loadedProducts = loadedProducts
              ? JSON.parse(loadedProducts).items
              : [];

            console.log(loadedProducts);
            const updatedProducts = loadedProducts.filter(
              (product: Product) => {
                return product.id !== selectedProduct.id;
              }
            );
            const cart = this.cartService.calcCartPrice(updatedProducts);
            localStorage.setItem('Cart', JSON.stringify(cart));
            this.store.dispatch(fetchUserCartAction({ isLoggedIn: false }));
            return '';
          }
        })
      ),
    { dispatch: false }
  );
}
