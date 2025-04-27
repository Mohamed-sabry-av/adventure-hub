import { StoreInterface } from '../store';

export const spinnerOfCouponSelector = (state: StoreInterface) => {
  return state.ui.isCouponLoading;
};

// ------------------------------------------------

export const spinnerOfOrderSelector = (state: StoreInterface) => {
  return state.ui.isOrderLoading;
};

// ------------------------------------------------ Done

export const cartStatusSelector = (state: StoreInterface) => {
  return state.ui.cartStatus;
};
