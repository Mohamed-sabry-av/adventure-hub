import { timer } from 'rxjs';
import { StoreInterface } from '../store';
import { createSelector } from '@ngrx/store';

export const cartStateSelector = (state: StoreInterface) => state.cart;

export const savedCartOfLSSelector = createSelector(
  cartStateSelector,
  (cartState) => cartState.localStorageCart
);
// --------------------------------------------------------------------
export const savedUserCartSelector = createSelector(
  cartStateSelector,
  (cartState) => cartState.userCart
);

export const paymentDetailsSelector = createSelector(
  cartStateSelector,
  (cartState) => {
    return cartState.paymentData;
  }
);
