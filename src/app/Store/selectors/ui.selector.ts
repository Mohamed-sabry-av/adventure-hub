import { StoreInterface } from '../store';

export const spinnerOfUiSelector = (state: StoreInterface) => {
  return state.ui.isLoading;
};

export const errorOfUiSelector = (state: StoreInterface) => {
  return state.ui.error;
};

// ------------------------------------------------

export const spinnerOfCouponSelector = (state: StoreInterface) => {
  return state.ui.isCouponLoading;
};

// ------------------------------------------------

export const spinnerOfOrderSelector = (state: StoreInterface) => {
  return state.ui.isOrderLoading;
};
