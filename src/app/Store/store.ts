import { ActionReducerMap } from '@ngrx/store';

import * as fromCart from './reducers/cart.reducer';

export interface StoreInterface {
  cart: fromCart.State;
}

export const reducers: ActionReducerMap<StoreInterface> = {
  cart: fromCart.cartReducer,
};
