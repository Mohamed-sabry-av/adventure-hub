import { inject, Injectable } from '@angular/core';
import { Store } from '@ngrx/store';
import {
  BehaviorSubject,
  combineLatest,
  map,
  Observable,
  shareReplay,
  of,
} from 'rxjs';
import {
  addProductToUserCartAction,
  deleteProductOfUserCarAction,
  clearUserCarAction,
  fetchUserCartAction,
  syncCartAction,
  updateCartStockStatusAction,
  updateProductOfUserCartAction,
  getUserCartAction,
} from '../../../Store/actions/cart.action';
import { savedUserCartSelector } from '../../../Store/selectors/cart.selector';
import { Product } from '../../../interfaces/product';
import { AccountAuthService } from '../../auth/account-auth.service';
import { fetchCouponsAction } from '../../../Store/actions/checkout.action';
import { HttpHeaders, HttpParams } from '@angular/common/http';
import { PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

@Injectable({ providedIn: 'root' })
export class CartService {
  private accountAuthService = inject(AccountAuthService);
  private store = inject(Store);
  private platformId = inject(PLATFORM_ID);
  cartIsVisible$ = new BehaviorSubject<boolean>(false);
  // New empty cart structure for quicker UI rendering
  private emptyCartStructure = {
    cartIsLoaded: true,
    userCart: {
      items: [],
      totals: {
        sub_total: 0,
        total_price: 0
      },
      items_count: 0
    }
  };
  
  // Combine saved cart with initial structure for faster loading
  savedUserCart$: Observable<any> = combineLatest([
    this.store.select(savedUserCartSelector),
    of(this.emptyCartStructure)
  ]).pipe(
    map(([storeCart, emptyStructure]) => {
      // If cart is loading, return empty structure for faster UI rendering
      if (!storeCart?.cartIsLoaded && !storeCart?.userCart) {
        return { ...emptyStructure, cartIsLoaded: false };
      }
      return storeCart;
    }),
    shareReplay(1)
  );

  cartMode(isVisible: boolean) {
    this.cartIsVisible$.next(isVisible);
  }

  // Create a method to handle empty guest carts by dispatching a valid empty cart
  handleEmptyGuestCart() {
    const emptyCart = {
      cartIsLoaded: true,
      userCart: {
        items: [],
        totals: {
          sub_total: 0,
          total_price: 0
        },
        items_count: 0
      }
    };
    
    // Use the getUserCartAction to update the store with an empty cart
    this.store.dispatch(getUserCartAction({ userCart: emptyCart.userCart }));
  }

  loadedDataFromLS(isLoggedIn: boolean) {
    const params = new HttpParams().set(
      '_fields',
      'items,totals,payment_methods,coupons,errors,items_count'
    );

    if (isLoggedIn) {
      let authToken: any = '';
      
      if (isPlatformBrowser(this.platformId)) {
        authToken = localStorage.getItem('auth_token');
        authToken = authToken ? JSON.parse(authToken) : '';
      }

      const headers = new HttpHeaders({
        Authorization: `Bearer ${authToken?.value}`,
      });

      return { headers, params };
    } else {
      let loadedCart: any = '';
      
      if (isPlatformBrowser(this.platformId)) {
        loadedCart = localStorage.getItem('cartId');
        loadedCart = loadedCart ? JSON.parse(loadedCart) : '';
      }

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
        let loadedCart: any = { items: [], coupons: [] };
        
        if (isPlatformBrowser(this.platformId)) {
          const storedCart = localStorage.getItem('Cart');
          loadedCart = storedCart ? JSON.parse(storedCart) : { items: [], coupons: [] };
        }
        
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
      if (isLoggedIn && isPlatformBrowser(this.platformId)) {
        const loadedCart = this.loadedDataFromLS(false).loadedCart;

        let authToken: any = localStorage.getItem('auth_token');
        authToken = authToken ? JSON.parse(authToken) : '';

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

