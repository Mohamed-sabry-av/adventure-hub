import { createReducer, on } from '@ngrx/store';
import { getCartFromLSAction, getUserCartAction } from '../actions/cart.action';
// import { Product } from '../../Shared/models/product.model';
// import {
//   getCartFromLSAction,
//   getPaymentDataAction,
//   getUserCartAction,
// } from '../actions/cart.action';
// import { Cart } from '../../Features/cart/models/cart.model';
// import { PaymentDetails } from '../../Features/placeorders/models/payment.model';

export interface State {
  localStorageCart: any;
  userCart: any;
  paymentData: any;
}

const initialState: State = {
  localStorageCart: {
    products: [],
    cartTotalPrice: { subTotal: 0, shippingFee: 0, totalPrice: 0 },
  },
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
