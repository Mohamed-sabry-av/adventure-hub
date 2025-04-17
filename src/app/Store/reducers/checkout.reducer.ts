import { createReducer, on } from '@ngrx/store';
import {
  getCouponAction,
  getOrderDataAction,
} from '../actions/checkout.action';

export interface State {
  coupon: any;
  orderaData: any;
}

const initialState: State = {
  coupon: {
    validCoupon: null,
    invalidCoupon: null,
  },
  orderaData: null,
};

export const checkoutReducer = createReducer(
  initialState,
  on(getCouponAction, (state, action) => {
    return {
      ...state,
      coupon: {
        validCoupon: action.validCoupon,
        invalidCoupon: action.invalidCoupon,
      },
    };
  }),
  on(getOrderDataAction, (state, action) => {
    return { ...state, orderaData: action.orderDetails };
  })
);
