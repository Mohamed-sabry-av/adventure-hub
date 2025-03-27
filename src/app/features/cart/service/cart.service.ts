import { inject, Injectable } from '@angular/core';
import { Store } from '@ngrx/store';
import { BehaviorSubject, Observable } from 'rxjs';
import {
  addProductToLSCartAction,
  deleteProductInCartLSAction,
  fetchCartFromLSAction,
  fetchUserCartAction,
  updateCountOfProductInCartLSAction,
} from '../../../Store/actions/cart.action';
import { savedCartOfLSSelector } from '../../../Store/selectors/cart.selector';
import { Product } from '../../../interfaces/product';
import { AccountAuthService } from '../../auth/account-auth.service';

@Injectable({ providedIn: 'root' })
export class CartService {
  private accountAuthService = inject(AccountAuthService);
  private store = inject(Store);
  cartIsVisible$ = new BehaviorSubject<boolean>(false);

  cartMode(isVisible: boolean) {
    this.cartIsVisible$.next(isVisible);
  }

  fetchCartFromLS() {
    this.store.dispatch(fetchCartFromLSAction());
  }
  savedCartOfLS$: Observable<any> = this.store.select(savedCartOfLSSelector);

  fetchUserCart() {
    this.store.dispatch(fetchUserCartAction());
    // this.accountAuthService.isLoggedIn$.subscribe((response: boolean) => {
    //   if (response) {
    //   } else {
    //     this.store.dispatch(fetchCartFromLSAction());
    //   }
    // });
  }
  // savedUserCart$: Observable<any> = this.store.select(savedUserCartSelector);

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

  updateCountOfProductInCart(
    selectedProductCount: number,
    selectedProduct: Product
  ) {
    this.store.dispatch(
      updateCountOfProductInCartLSAction({
        count: selectedProductCount,
        selectedProduct: selectedProduct,
      })
    );

    // this.checkAuth().subscribe((token) => {
    //   if (token) {
    //     this.store.dispatch(
    //       updateProductOfUserCartAction({
    //         product: selectedProduct,
    //         productCount: selectedProductCount,
    //       })
    //     );
    //   } else {
    //     this.store.dispatch(
    //       updateCountOfProductInCartLSAction({
    //         count: selectedProductCount,
    //         selectedProduct: selectedProduct,
    //       })
    //     );
    //     this.fetchCartFromLS();
    //   }
    // });
  }

  calcCartPrice(products: any) {
    const subTotal = [...products].reduce((acc, ele) => {
      return acc + +ele.count! * ele.price;
    }, 0);

    return {
      products: [...products],
      cartTotalPrice: {
        subTotal,
        shippingFee: subTotal ? 10 : 0,
        totalPrice: subTotal ? subTotal + 10 : 0,
      },
    };
  }
}
