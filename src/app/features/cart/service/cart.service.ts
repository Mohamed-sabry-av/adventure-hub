import { inject, Injectable } from '@angular/core';
import { Store } from '@ngrx/store';
import { BehaviorSubject, Observable } from 'rxjs';
import {
  addProductToLSCartAction,
  deleteProductInCartLSAction,
  fetchCartFromLSAction,
  fetchUserCartAction,
  updateCountOfProductInCartLSAction,
  updateProductOfUserCartAction,
} from '../../../Store/actions/cart.action';
import {
  savedCartOfLSSelector,
  savedUserCartSelector,
} from '../../../Store/selectors/cart.selector';
import { Product } from '../../../interfaces/product';
import { AccountAuthService } from '../../auth/account-auth.service';

@Injectable({ providedIn: 'root' })
export class CartService {
  private accountAuthService = inject(AccountAuthService);
  private store = inject(Store);
  cartIsVisible$ = new BehaviorSubject<boolean>(false);
  savedUserCart$: Observable<any> = this.store.select(savedUserCartSelector);

  cartMode(isVisible: boolean) {
    this.cartIsVisible$.next(isVisible);
  }

  calcCartPrice(products: any) {
    const subTotal = [...products].reduce((acc, ele) => {
      return acc + +ele.quantity! * ele.prices.price;
    }, 0);

    return {
      items: [...products],
      payment_methods: ['stripe', 'tabby_installments'],
      totals: {
        subTotal,
        currency_code: 'AED',
        total_fees: subTotal < 100 ? 20 : 0,
        total_price: subTotal < 100 ? subTotal + 20 : subTotal,
      },
    };
  }

  fetchUserCart() {
    this.store.dispatch(fetchUserCartAction({ isLoggedIn: true }));
  }
  // اللوجيك الصح

  // fetchUserCart() {
  //   this.accountAuthService.isLoggedIn$.subscribe((isLoggedIn: boolean) => {
  //     if (isLoggedIn) {
  //       this.store.dispatch(fetchUserCartAction({ isLoggedIn: true }));
  //     } else {
  //       this.store.dispatch(fetchUserCartAction({ isLoggedIn: false }));
  //     }
  //   });
  // }
  // savedUserCart$: Observable<any> = this.store.select(savedUserCartSelector);

  updateQuantityOfProductInCart(
    selectedProductQuantity: number,
    selectedProduct: Product
  ) {
    this.store.dispatch(
      updateProductOfUserCartAction({
        product: selectedProduct,
        productQuantity: selectedProductQuantity,
        isLoggedIn: true,
      })
    );
  }

  // اللوجيك الصح
  // updateQuantityOfProductInCart(
  //   selectedProductQuantity: number,
  //   selectedProduct: Product
  // ) {
  //   this.accountAuthService.isLoggedIn$.subscribe((isLoggedIn: boolean) => {
  //     if (isLoggedIn) {
  //       this.store.dispatch(
  //         updateProductOfUserCartAction({
  //           product: selectedProduct,
  //           productQuantity: selectedProductQuantity,
  //           isLoggedIn: true,
  //         })
  //       );
  //     } else {
  //       this.store.dispatch(
  //         updateProductOfUserCartAction({
  //           product: selectedProduct,
  //           productQuantity: selectedProductQuantity,
  //           isLoggedIn: false,
  //         })
  //       );
  //     }
  //   });
  // }

  x = 0;
  // -----------------------------------------------------------------------------------------

  addProductToCart(selectedProduct: Product) {
    this.store.dispatch(addProductToLSCartAction({ product: selectedProduct }));

    // this.checkAuth().subscribe((token) => {
    //   if (token) {
    //     this.store.dispatch(
    //       addProductToUserCartAction({ product: selectedProduct })
    //     );
    //   } else {
    //     this.savedCartOfLS$.pipe(take(1)).subscribe((response: any) => {
    //       this.store.dispatch(addProductToLSCartAction());
    //       this.fetchCartFromLS();
    //     });
    //   }
    // });
  }

  deleteProductFromCart(selectedProduct: Product) {
    console.log(selectedProduct);
    this.store.dispatch(
      deleteProductInCartLSAction({ selectedProduct: selectedProduct })
    );
    // this.checkAuth().subscribe((token) => {
    //   if (token) {
    //     this.store.dispatch(
    //       deleteProductOfUserCartAction({ product: selectedProduct })
    //     );
    //   } else {
    //     this.store.dispatch(
    //       deleteProductInCartLSAction({ selectedProduct: selectedProduct })
    //     );
    //     this.store.dispatch(fetchCartFromLSAction());
    //   }
    // });
  }
}
