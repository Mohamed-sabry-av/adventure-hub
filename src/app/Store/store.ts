import { ActionReducerMap } from '@ngrx/store';
import * as fromCart from './reducers/cart.reducer';
import * as fromCheckout from './reducers/checkout.reducer';
import * as fromUi from './reducers/ui.reducer';
export interface StoreInterface {
  cart: fromCart.State;
  checkout: fromCheckout.State;
  ui: fromUi.State;
}
export const reducers: ActionReducerMap<StoreInterface> = {
  cart: fromCart.cartReducer,
  checkout: fromCheckout.checkoutReducer,
  ui: fromUi.uiReducer,
};

