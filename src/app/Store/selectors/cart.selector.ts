import { StoreInterface } from '../store';
import { createSelector } from '@ngrx/store';

export const cartStateSelector = (state: StoreInterface) => state.cart;

export const savedUserCartSelector = createSelector(
  cartStateSelector,
  (cartState) => {
    const cartData = {
      userCart: cartState.userCart,
      cartIsLoaded: cartState.isCartLoaded,
    };
    return cartData;
  }
);
