import { DestroyRef, inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { Store } from '@ngrx/store';
import { StoreInterface } from '../store';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
// import {
//   combineLatest,
//   concatMap,
//   exhaustMap,
//   filter,
//   finalize,
//   from,
//   map,
//   mergeMap,
//   of,
//   switchMap,
//   take,
//   tap,
//   toArray,
// } from 'rxjs';
// import {
//   addProductToLSCartAction,
//   initUserCartAction,
//   deleteProductInCartLSAction,
//   getCartFromLSAction,
//   fetchUserCartAction,
//   fetchCartFromLSAction,
//   updateCountOfProductInCartLSAction,
//   getUserCartAction,
//   updateProductOfUserCartAction,
//   deleteProductOfUserCartAction,
//   addProductToUserCartAction,
//   getPaymentDataAction,
//   fetchPaymentDataAction,
// } from '../actions/cart.action';
// import { Product } from '../../Shared/models/product.model';
// import { selectedProductDataSelector } from '../selectors/product.selector';
// import { CartService } from '../../Features/cart/services/cart.service';
// import { Cart } from '../../Features/cart/models/cart.model';
// import { PaymentDetails } from '../../Features/placeorders/models/payment.model';
// import { savedUserCartSelector } from '../selectors/cart.selector';
import { Router } from '@angular/router';
import { CartService } from '../../features/cart/service/cart.service';
import { Product } from '../../interfaces/product';
import { catchError, map, of, switchMap, take, tap } from 'rxjs';
import {
  addProductToLSCartAction,
  deleteProductInCartLSAction,
  fetchCartFromLSAction,
  fetchUserCartAction,
  getCartFromLSAction,
  getUserCartAction,
  updateCountOfProductInCartLSAction,
  updateProductOfUserCartAction,
} from '../actions/cart.action';

export class CartEffect {
  private actions$ = inject(Actions);
  private store = inject(Store<StoreInterface>);
  private router = inject(Router);
  private httpClient = inject(HttpClient);
  private cartService = inject(CartService);
  private destroyRef = inject(DestroyRef);

  updateCountOfProductInCartLS = createEffect(
    () =>
      this.actions$.pipe(
        ofType(updateCountOfProductInCartLSAction),
        map(({ quantity, selectedProduct }) => {
          let loadedCart: any = localStorage.getItem('Cart');
          loadedCart = loadedCart ? JSON.parse(loadedCart).products : [];

          const updatedCart = loadedCart.map((product: Product) =>
            product.id === selectedProduct.id
              ? { ...product, quantity }
              : product
          );

          const cart = this.cartService.calcCartPrice(updatedCart);

          localStorage.setItem('Cart', JSON.stringify(cart));
          this.store.dispatch(fetchCartFromLSAction());
        })
      ),
    { dispatch: false }
  );

  deleteProductInCartLS = createEffect(
    () =>
      this.actions$.pipe(
        ofType(deleteProductInCartLSAction),
        map(({ selectedProduct }) => {
          let loadedProducts: any = localStorage.getItem('Cart');
          loadedProducts = loadedProducts
            ? JSON.parse(loadedProducts).products
            : [];
          const updatedProducts = loadedProducts.filter((product: Product) => {
            return product.id !== selectedProduct.id;
          });
          const cart = this.cartService.calcCartPrice(updatedProducts);
          localStorage.setItem('Cart', JSON.stringify(cart));
          this.store.dispatch(fetchCartFromLSAction()); // New
        })
      ),
    { dispatch: false }
  );

  // -------------------------------------------------------------------

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

  // addProductToUserCart = createEffect(
  //   () =>
  //     this.actions$.pipe(
  //       ofType(addProductToUserCartAction),
  //       switchMap(({ product }) => {
  //         return this.httpClient
  //           .post('https://ecommerce.routemisr.com/api/v1/cart', {
  //             productId: product.id,
  //           })
  //           .pipe(
  //             tap(() => {
  //               this.cartService.fetchUserCart();
  //               console.log(`✅ ADDED Product ID: ${product.id}`);
  //             })
  //           );
  //       })
  //     ),
  //   { dispatch: false }
  // );

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
              const headers = new HttpHeaders({
                Cookie:
                  'wordpress_logged_in_49c1619234a131a188f12fea295ed5ea=ameenelnaggar|1743244195|Yq5foLIFL0v3IjgHGfjGAcL4gZhwu4PaE2Djw9iXk0Q|b7729c053f46cf588b52e700086f44822ece1f6b3f19b6b75a5334ba5dd3e143;',
                'X-WC-Store-API-Nonce': '51ce0d3a8a',
                'Content-Type': 'application/json',
              });

              const body = {
                key: selectedProduct.key,
                quantity: quantity,
              };

              return this.httpClient
                .post(
                  'https://adventures-hub.com/wp-json/wc/store/v1/cart/update-item',
                  body,
                  { headers }
                )
                .pipe(
                  map((response: any) => {
                    console.log('Update Success:', response);
                    return fetchUserCartAction({ isLoggedIn: true }); // رجع Action بدل Dispatch مباشرة
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

  // deleteProductOfUserCart = createEffect(
  //   () =>
  //     this.actions$.pipe(
  //       ofType(deleteProductOfUserCartAction),
  //       switchMap(({ product }) =>
  //         this.httpClient.delete(
  //           `https://ecommerce.routemisr.com/api/v1/cart/${product.id}`
  //         )
  //       ),
  //       tap(() => {
  //         this.cartService.fetchUserCart();
  //         console.log('DELETED');
  //       })
  //     ),
  //   { dispatch: false }
  // );

  loadUserCart = createEffect(() =>
    this.actions$.pipe(
      ofType(fetchUserCartAction),
      switchMap(({ isLoggedIn }) => {
        if (isLoggedIn) {
          const options = {
            headers: new HttpHeaders({
              Cookie:
                'wordpress_logged_in_49c1619234a131a188f12fea295ed5ea=ameenelnaggar|1743244195|Yq5foLIFL0v3IjgHGfjGAcL4gZhwu4PaE2Djw9iXk0Q|b7729c053f46cf588b52e700086f44822ece1f6b3f19b6b75a5334ba5dd3e143;',
            }),
            params: new HttpParams().set(
              '_fields',
              'items,totals,payment_methods'
            ),
          };

          return this.httpClient
            .get(
              'https://adventures-hub.com//wp-json/wc/store/v1/cart',
              options
            )
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
                  };
                });

                const cartData = {
                  items: itemsObj,
                  payment_methods: response.payment_methods,
                  totals: response.totals,
                };

                return getUserCartAction({ userCart: cartData });
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

  // paymentUserCart = createEffect(() =>
  //   this.actions$.pipe(
  //     ofType(fetchPaymentDataAction),
  //     switchMap(({ customerInfo, paymentMethod }) => {
  //       return this.cartService.savedUserCart$.pipe(
  //         filter((response) => response.cartId),
  //         switchMap(({ cartId }) => {
  //           let url = 'https://ecommerce.routemisr.com/api/v1/orders/';

  //           if (paymentMethod === 'cod') {
  //             url = url + cartId;
  //           } else {
  //             url = `${url}checkout-session/${cartId}?url=http://localhost:3000`;
  //           }

  //           return this.httpClient
  //             .post(url, {
  //               shippingAddress: customerInfo,
  //             })
  //             .pipe(
  //               map((response: any) => {
  //                 console.log(response);
  //                 return getPaymentDataAction({ paymentData: response });
  //               }),
  //               tap(() => {
  //                 if (paymentMethod === 'cod') {
  //                   this.router.navigate(['/allorders'], { replaceUrl: true });
  //                 }
  //               })
  //             );
  //         })
  //       );
  //     })
  //   )
  // );
}
