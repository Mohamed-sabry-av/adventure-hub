import { inject, Injectable } from '@angular/core';
import { Store } from '@ngrx/store';
import {
  BehaviorSubject,
  combineLatest,
  map,
  Observable,
  shareReplay,
} from 'rxjs';
import {
  addProductToUserCartAction,
  deleteProductOfUserCarAction,
  clearUserCarAction,
  fetchUserCartAction,
  syncCartAction,
  updateCartStockStatusAction,
  updateProductOfUserCartAction,
} from '../../../Store/actions/cart.action';
import { savedUserCartSelector } from '../../../Store/selectors/cart.selector';
import { Product } from '../../../interfaces/product';
import { AccountAuthService } from '../../auth/account-auth.service';
import { fetchCouponsAction } from '../../../Store/actions/checkout.action';
import { HttpHeaders, HttpParams } from '@angular/common/http';

@Injectable({ providedIn: 'root' })
export class CartService {
  private accountAuthService = inject(AccountAuthService);
  private store = inject(Store);
  cartIsVisible$ = new BehaviorSubject<boolean>(false);

  cartMode(isVisible: boolean) {
    this.cartIsVisible$.next(isVisible);
  }

  loadedDataFromLS(isLoggedIn: boolean) {
    const params = new HttpParams().set(
      '_fields',
      'items,totals,payment_methods,coupons,errors,items_count'
    );

    if (isLoggedIn) {
      let authToken: any = localStorage.getItem('auth_token');
      authToken = authToken ? JSON.parse(authToken) : '';

      const headers = new HttpHeaders({
        Authorization: `Bearer ${authToken?.value}`,
      });

      return { headers, params };
    } else {
      let loadedCart: any = localStorage.getItem('cartId');
      loadedCart = loadedCart ? JSON.parse(loadedCart) : '';

      return { loadedCart, params };
    }
  }

  fetchUserCart(cartMode: {
    mainPageLoading: boolean;
    sideCartLoading: boolean;
  }) {
    this.accountAuthService.isLoggedIn$.subscribe((isLoggedIn: boolean) => {
      if (isLoggedIn) {
        this.store.dispatch(
          fetchUserCartAction({
            isLoggedIn: true,
            sideCartLoading: cartMode.sideCartLoading,
            mainPageLoading: cartMode.mainPageLoading,
          })
        );
      } else {
        let loadedCart: any = localStorage.getItem('Cart');
        loadedCart = loadedCart
          ? JSON.parse(loadedCart)
          : { items: [], coupons: [] };
        const coupons = loadedCart.coupons || {};
        const couponKeys = Object.keys(coupons);

        const couponData =
          couponKeys.length > 0 ? coupons[couponKeys[0]] : null;

        // If a coupon exists in local storage, apply it
        if (couponData) {
          this.store.dispatch(
            fetchCouponsAction({
              enteredCouponValue: couponData.code,
              isLoggedIn: false,
            })
          );
        }

        this.store.dispatch(
          fetchUserCartAction({
            isLoggedIn: false,
            sideCartLoading: cartMode.sideCartLoading,
            mainPageLoading: cartMode.mainPageLoading,
          })
        );
      }
    });
  }

  savedUserCart$: Observable<any> = this.store.select(savedUserCartSelector);

  updateQuantityOfProductInCart(
    selectedProductQuantity: number,
    selectedProduct: Product
  ) {
    this.accountAuthService.isLoggedIn$.subscribe((isLoggedIn: boolean) => {
      if (isLoggedIn) {
        this.store.dispatch(
          updateProductOfUserCartAction({
            product: selectedProduct,
            productQuantity: selectedProductQuantity,
            isLoggedIn: true,
          })
        );
      } else {
        this.store.dispatch(
          updateProductOfUserCartAction({
            product: selectedProduct,
            productQuantity: selectedProductQuantity,
            isLoggedIn: false,
          })
        );
      }
    });
  }

  addProductToCart(selectedProduct: any, buyItNow?: boolean) {
    this.accountAuthService.isLoggedIn$.subscribe((isLoggedIn: boolean) => {
      if (isLoggedIn) {
        this.store.dispatch(
          addProductToUserCartAction({
            product: selectedProduct,
            isLoggedIn: true,
            buyItNow: buyItNow,
          })
        );
      } else {
        this.store.dispatch(
          addProductToUserCartAction({
            product: selectedProduct,
            isLoggedIn: false,
            buyItNow: buyItNow,
          })
        );
      }
    });
  }

  deleteProductFromCart(selectedProduct: Product, openSideCart?: boolean) {
    this.accountAuthService.isLoggedIn$.subscribe((isLoggedIn: boolean) => {
      if (isLoggedIn) {
        this.store.dispatch(
          deleteProductOfUserCarAction({
            product: selectedProduct,
            isLoggedIn: true,
            openSideCart: openSideCart ? true : false,
          })
        );
      } else {
        this.store.dispatch(
          deleteProductOfUserCarAction({
            product: selectedProduct,
            isLoggedIn: false,
            openSideCart: openSideCart ? true : false,
          })
        );
      }
    });
  }

  syncUserCart() {
    this.accountAuthService.isLoggedIn$.subscribe((isLoggedIn: boolean) => {
      if (isLoggedIn) {
        const loadedCart = this.loadedDataFromLS(false).loadedCart;

        let authToken: any = localStorage.getItem('auth_token');
        authToken = authToken ? JSON.parse(authToken) : '';

        console.log(loadedCart);

        if (loadedCart) {
          this.store.dispatch(
            syncCartAction({
              authToken: authToken.value,
            })
          );
        } else {
          console.warn('No Loaded Items In Offline Cart');
        }
      }
    });
  }

  clearUserCart() {
    this.accountAuthService.isLoggedIn$.subscribe((isLoggedIn: boolean) => {
      if (isLoggedIn) {
        this.store.dispatch(
          clearUserCarAction({
            isLoggedIn: true,
          })
        );
      } else {
        this.store.dispatch(
          clearUserCarAction({
            isLoggedIn: false,
          })
        );
      }
    });
  }
}
