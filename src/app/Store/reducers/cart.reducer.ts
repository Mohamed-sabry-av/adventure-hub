import { createReducer, on } from '@ngrx/store';
import { getUserCartAction } from '../actions/cart.action';

export interface State {
  userCart: any;
}

const initialState: State = {
  userCart: [],
};

export const cartReducer = createReducer(
  initialState,
  on(getUserCartAction, (state, action) => {
    return { ...state, userCart: action.userCart };
  })
);
