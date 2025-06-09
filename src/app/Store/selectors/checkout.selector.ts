import { StoreInterface } from '../store';
export const copuponStatusSelector = (state: StoreInterface) => {
  return state.checkout.couponStatus;
};
export const copuponDataSelector = (state: StoreInterface) => {
  return state.checkout.coupondData;
};
export const orderDetailsSelector = (state: StoreInterface) => {
  return state.checkout.orderaData;
};

