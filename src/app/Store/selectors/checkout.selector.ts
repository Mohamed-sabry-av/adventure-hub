import { StoreInterface } from '../store';

export const validCouponSelector = (state: StoreInterface) => {
  return state.checkout.coupon;
};
