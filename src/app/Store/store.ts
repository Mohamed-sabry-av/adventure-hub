import { ActionReducerMap } from '@ngrx/store';

import * as fromCart from './reducers/cart.reducer';
import * as fromCheckout from './reducers/checkout.reducer';

export interface StoreInterface {
  cart: fromCart.State;
  checkout: fromCheckout.State;
}

export const reducers: ActionReducerMap<StoreInterface> = {
  cart: fromCart.cartReducer,
  checkout: fromCheckout.checkoutReducer,
};
