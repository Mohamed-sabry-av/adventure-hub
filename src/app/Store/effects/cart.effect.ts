import { DestroyRef, inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { Store } from '@ngrx/store';
import { StoreInterface } from '../store';
import { HttpClient, HttpHeaders } from '@angular/common/http';
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

export class CartEffect {
  private actions$ = inject(Actions);
  private store = inject(Store<StoreInterface>);
  private router = inject(Router);
  private httpClient = inject(HttpClient);
  private cartService = inject(CartService);
  private destroyRef = inject(DestroyRef);

  // // product-info هو البدايه هنا
  // addProductToCartLS = createEffect(
  //   () =>
  //     this.actions$.pipe(
  //       ofType(addProductToLSCartAction),
  //       map(() => {
  //         const subscribtion = this.store
  //           .select(selectedProductDataSelector)
  //           .pipe(take(1))
  //           .subscribe((selectedProduct) => {
  //             let updatedCart = [];
  //             let loadedProducts: any = localStorage.getItem('Cart');
  //             loadedProducts = loadedProducts
  //               ? JSON.parse(loadedProducts).products
  //               : [];

  //             const isProductExist = loadedProducts.some(
  //               (product: Product) => product.id === selectedProduct.id
  //             );

  //             const { id, count, price, imageCover, title } = selectedProduct;

  //             updatedCart = isProductExist
  //               ? loadedProducts
  //               : [
  //                   ...loadedProducts,
  //                   {
  //                     id,
  //                     count,
  //                     price,
  //                     imageCover,
  //                     title,
  //                   },
  //                 ];

  //             const cart = this.cartService.calcCartPrice(updatedCart);

  //             localStorage.setItem('Cart', JSON.stringify(cart));
  //           });
  //         this.destroyRef.onDestroy(() => subscribtion.unsubscribe());
  //       })
  //     ),
  //   { dispatch: false }
  // );

  // // cartPage البدايه من هنا
  // loadCartLS = createEffect(() =>
  //   this.actions$.pipe(
  //     ofType(fetchCartFromLSAction),
  //     switchMap(() => {
  //       let loadedCart: any = localStorage.getItem('Cart');
  //       loadedCart = loadedCart ? JSON.parse(loadedCart) : [];
  //       return of(getCartFromLSAction({ cart: loadedCart }));
  //     })
  //   )
  // );

  // // cart-products البدايه من هنا
  // updateCountOfProductInCartLS = createEffect(
  //   () =>
  //     this.actions$.pipe(
  //       ofType(updateCountOfProductInCartLSAction),
  //       map(({ count, selectedProduct }) => {
  //         let loadedCart: any = localStorage.getItem('Cart');
  //         loadedCart = loadedCart ? JSON.parse(loadedCart).products : [];

  //         const updatedCart = loadedCart.map((product: Product) =>
  //           product.id === selectedProduct.id
  //             ? { ...product, count: count }
  //             : product
  //         );
  //         const cart = this.cartService.calcCartPrice(updatedCart);

  //         localStorage.setItem('Cart', JSON.stringify(cart));
  //       })
  //     ),
  //   { dispatch: false }
  // );

  // // cart-products البدايه من هنا
  // deleteProductInCartLS = createEffect(
  //   () =>
  //     this.actions$.pipe(
  //       ofType(deleteProductInCartLSAction),
  //       map(({ selectedProduct }) => {
  //         let loadedProducts: any = localStorage.getItem('Cart');
  //         loadedProducts = loadedProducts
  //           ? JSON.parse(loadedProducts).products
  //           : [];
  //         const updatedProducts = loadedProducts.filter((product: Product) => {
  //           return product.id !== selectedProduct.id;
  //         });
  //         const cart = this.cartService.calcCartPrice(updatedProducts);
  //         localStorage.setItem('Cart', JSON.stringify(cart));
  //       })
  //     ),
  //   { dispatch: false }
  // );

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

  // updateProductCountOfUserCart = createEffect(
  //   () =>
  //     this.actions$.pipe(
  //       ofType(updateProductOfUserCartAction),
  //       switchMap(({ product, productCount }) =>
  //         this.httpClient.put(
  //           `https://ecommerce.routemisr.com/api/v1/cart/${product.id}`,
  //           { count: productCount }
  //         )
  //       ),
  //       tap(() => console.log('UPDATED'))
  //     ),
  //   { dispatch: false }
  // );

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

  // loadUserCart = createEffect(() =>
  //   this.actions$.pipe(
  //     ofType(fetchUserCartAction),
  //     switchMap(() => {
  //       return this.httpClient
  //         .get('https://ecommerce.routemisr.com/api/v1/cart')
  //         .pipe(
  //           take(1),
  //           map((response: any) => {
  //             return getUserCartAction({
  //               userCart: response,
  //             });
  //           })
  //         );
  //     })
  //   )
  // );

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
