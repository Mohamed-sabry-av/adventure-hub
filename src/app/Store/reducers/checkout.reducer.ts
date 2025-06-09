import { createReducer, on } from '@ngrx/store';
import {
  getCouponAction,
  getCouponDataAction,
  getCouponStatusAction,
  getOrderDataAction,
} from '../actions/checkout.action';
export interface State {
  couponStatus: { success: string | null; error: string | null };
  coupondData: any;
  orderaData: any;
}
const initialState: State = {
  couponStatus: { success: null, error: null },
  coupondData: {},
  orderaData: null,
};
export const checkoutReducer = createReducer(
  initialState,
  on(getCouponStatusAction, (state, action) => {

    return {
      ...state,
      couponStatus: { error: action.errorMsg, success: action.successMsg },
    };
  }),
  on(getCouponDataAction, (state, action) => {
    return { ...state, coupondData: action.coupon };
  }),
  on(getOrderDataAction, (state, action) => {
    return { ...state, orderaData: action.orderDetails };
  })
);

