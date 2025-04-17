import { StoreInterface } from '../store';

export const validCouponSelector = (state: StoreInterface) => {
  return state.checkout.coupon;
};

export const orderDetailsSelector = (state: StoreInterface) => {
  return state.checkout.orderaData;
};
