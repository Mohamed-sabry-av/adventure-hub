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
  fetchUserCartAction,
  updateCartStockStatusAction,
  updateProductOfUserCartAction,
} from '../../../Store/actions/cart.action';
import { savedUserCartSelector } from '../../../Store/selectors/cart.selector';
import { Product } from '../../../interfaces/product';
import { AccountAuthService } from '../../auth/account-auth.service';
import { fetchCouponsAction } from '../../../Store/actions/checkout.action';
import { cartStatusSelector } from '../../../Store/selectors/ui.selector';

@Injectable({ providedIn: 'root' })
export class CartService {
  private accountAuthService = inject(AccountAuthService);
  private store = inject(Store);
  cartIsVisible$ = new BehaviorSubject<boolean>(false);

  cartMode(isVisible: boolean) {
    this.cartIsVisible$.next(isVisible);
  }

  calcCartPrice(products: any, coupon?: any) {
    const subTotal = [...products].reduce((acc, ele) => {
      return acc + +ele.quantity! * ele.prices.price;
    }, 0);

    let totalDiscount: number = 0;
    let totalPrice: number = subTotal;
    let coupons: any = {};

    if (coupon) {
      coupon = coupon[0];
      const minAmount = parseFloat(coupon.minimum_amount || '0');
      const maxAmount = parseFloat(coupon.maximum_amount || '0');

      const isAboveMin = subTotal >= minAmount;
      const isBelowMax = maxAmount === 0 || subTotal <= maxAmount;

      if (isAboveMin && isBelowMax) {
        if (coupon.discount_type === 'fixed_cart') {
          totalDiscount = parseFloat(coupon.amount);
          totalPrice = Math.max(subTotal - totalDiscount, 0);
        } else if (coupon.discount_type === 'percent') {
          totalDiscount = subTotal * (parseFloat(coupon.amount) / 100);

          totalPrice = Math.max(subTotal - totalDiscount, 0);
        }

        const couponCode = coupon.code;
        coupons = {
          [couponCode]: {
            code: couponCode,
            discount_type: coupon.discount_type,
            totals: {
              total_discount: totalDiscount.toString(),
            },
          },
        };
      } else {
        console.log('Coupon not applicable: subtotal is outside allowed range');
      }
    }

    return {
      items: [...products],
      payment_methods: ['stripe', 'tabby_installments'],
      totals: {
        sub_total: subTotal,
        currency_code: 'AED',
        total_discount: totalDiscount,
        total_price: totalPrice,
      },
      coupons,
    };
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
        loadedCart = loadedCart ? JSON.parse(loadedCart) : [];
        const coupons = loadedCart.coupons || {};
        const couponKeys = Object.keys(coupons);

        const couponData =
          couponKeys.length > 0 ? coupons[couponKeys[0]] : null;

        this.store.dispatch(
          fetchCouponsAction({
            enteredCouponValue: couponData,
            isLoggedIn: false,
            sideCartLoading: cartMode.sideCartLoading,
            mainPageLoading: cartMode.mainPageLoading,
          })
        );
      }
    });
  }
  savedUserCart$: Observable<any> = this.store.select(savedUserCartSelector);
  // .pipe(shareReplay(1));

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

  addProductToCart(selectedProduct: any) {
    console.log(selectedProduct);

    this.accountAuthService.isLoggedIn$.subscribe((isLoggedIn: boolean) => {
      if (isLoggedIn) {
        this.store.dispatch(
          addProductToUserCartAction({
            product: selectedProduct,
            isLoggedIn: true,
          })
        );
      } else {
        this.store.dispatch(
          addProductToUserCartAction({
            product: selectedProduct,
            isLoggedIn: false,
          })
        );
      }
    });
  }

  deleteProductFromCart(selectedProduct: Product) {
    this.accountAuthService.isLoggedIn$.subscribe((isLoggedIn: boolean) => {
      if (isLoggedIn) {
        this.store.dispatch(
          deleteProductOfUserCarAction({
            product: selectedProduct,
            isLoggedIn: true,
          })
        );
      } else {
        this.store.dispatch(
          deleteProductOfUserCarAction({
            product: selectedProduct,
            isLoggedIn: false,
          })
        );
      }
    });
  }
}
