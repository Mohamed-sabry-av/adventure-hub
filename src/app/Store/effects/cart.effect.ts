import { DestroyRef, inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { Store } from '@ngrx/store';
import { StoreInterface } from '../store';
import { HttpClient } from '@angular/common/http';
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
import { map, of, switchMap, take } from 'rxjs';
import {
  addProductToLSCartAction,
  deleteProductInCartLSAction,
  fetchCartFromLSAction,
  getCartFromLSAction,
  updateCountOfProductInCartLSAction,
} from '../actions/cart.action';

export class CartEffect {
  private actions$ = inject(Actions);
  private store = inject(Store<StoreInterface>);
  private router = inject(Router);
  private httpClient = inject(HttpClient);
  private cartService = inject(CartService);
  private destroyRef = inject(DestroyRef);

  addProductToCartLS = createEffect(
    () =>
      this.actions$.pipe(
        ofType(addProductToLSCartAction),
        map(({ product }) => {
          console.log(product);
          let {
            id,
            name,
            regular_price,
            price,
            sale_price,
            attributes,
            images,
          } = product;

          const firstImage = images[0]?.src || '';

          const brand = attributes.find(
            (attribute: any) => attribute.name === 'Brand'
          );
          const size = attributes.find(
            (attribute: any) => attribute.name === 'Size'
          );
          const color = attributes.find(
            (attribute: any) => attribute.name === 'Color'
          );

          attributes = { brand, color, size };

          let selectedProduct = {
            id,
            name,
            count: 1,
            regular_price,
            price,
            sale_price,
            attributes,
            firstImage,
          };

          let loadedProducts: any = localStorage.getItem('Cart');
          loadedProducts = loadedProducts
            ? JSON.parse(loadedProducts).products
            : [];

          const productIndex = loadedProducts.findIndex(
            (p: Product) => p.id === selectedProduct.id
          );

          if (productIndex !== -1) {
            loadedProducts[productIndex].count += 1;
          } else {
            loadedProducts.push(selectedProduct);
          }

          const cart = this.cartService.calcCartPrice(loadedProducts);
          localStorage.setItem('Cart', JSON.stringify(cart));

          this.store.dispatch(fetchCartFromLSAction()); // New
        })
      ),
    { dispatch: false }
  );

  loadCartLS = createEffect(() =>
    this.actions$.pipe(
      ofType(fetchCartFromLSAction),
      switchMap(() => {
        let loadedCart: any = localStorage.getItem('Cart');
        loadedCart = loadedCart ? JSON.parse(loadedCart) : [];
        return of(getCartFromLSAction({ cart: loadedCart }));
      })
    )
  );

  updateCountOfProductInCartLS = createEffect(
    () =>
      this.actions$.pipe(
        ofType(updateCountOfProductInCartLSAction),
        map(({ count, selectedProduct }) => {
          let loadedCart: any = localStorage.getItem('Cart');
          loadedCart = loadedCart ? JSON.parse(loadedCart).products : [];

          const updatedCart = loadedCart.map((product: Product) =>
            product.id === selectedProduct.id ? { ...product, count } : product
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
