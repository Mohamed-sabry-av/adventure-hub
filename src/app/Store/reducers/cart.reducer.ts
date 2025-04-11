import { createReducer, on } from '@ngrx/store';
import { getUserCartAction } from '../actions/cart.action';

export interface State {
  userCart: any;
  paymentData: any;
}

const initialState: State = {
  userCart: [],
  paymentData: {
    status: '',
    session: { cancel_url: '', success_url: '', url: '' },
  },
};

export const cartReducer = createReducer(
  initialState,
  on(getUserCartAction, (state, action) => {
    return { ...state, userCart: action.userCart };
  })
  // on(getPaymentDataAction, (state, action) => {
  //   return { ...state, paymentData: action.paymentData };
  // })
);
