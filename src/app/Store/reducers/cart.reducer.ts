import { createReducer, on } from '@ngrx/store';
import { getUserCartAction } from '../actions/cart.action';

export interface State {
  userCart: any;
  isCartLoaded: boolean; // New property
}

const initialState: State = {
  userCart: [],
  isCartLoaded: false,
};

export const cartReducer = createReducer(
  initialState,
  on(getUserCartAction, (state, action) => {
    console.log(action.userCart);
    return { ...state, userCart: action.userCart, isCartLoaded: true };
  })
);
