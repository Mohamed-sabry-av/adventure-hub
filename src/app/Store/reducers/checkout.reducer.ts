import { createReducer, on } from '@ngrx/store';
import { getCouponAction } from '../actions/checkout.action';

export interface State {
  coupon: any;
}

const initialState: State = {
  coupon: {
    validCoupon: null,
    invalidCoupon: null,
  },
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
  })
);
