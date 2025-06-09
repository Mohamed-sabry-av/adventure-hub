import { createReducer, on } from '@ngrx/store';
import {
  startLoadingCouponAction,
  stopLoadingCouponAction,
  stopLoadingOrderAction,
  startLoadingOrderAction,
  cartStatusAction,
  startLoadingSpinnerAction,
  stopLoadingSpinnerAction,
} from '../actions/ui.action';
import { CartStatus } from '../../features/cart/model/cart.model';
export interface State {
  isSpinnerLoading: boolean;
  loadingMap: { [key: string]: boolean };
  isCouponLoading: boolean;
  isOrderLoading: boolean;
  cartStatus: CartStatus;
}
const initialState: State = {
  isSpinnerLoading: false,
  loadingMap: {},
  isCouponLoading: false,
  isOrderLoading: false,
  cartStatus: {
    mainPageLoading: false,
    sideCartLoading: false,
    error: null,
  },
};
export const uiReducer = createReducer(
  initialState,
  on(startLoadingSpinnerAction, (state, action) => {
    return {
      ...state,
      loadingMap: { ...state.loadingMap, [action.buttonName!]: true },
      isSpinnerLoading: true,
    };
  }),
  on(stopLoadingSpinnerAction, (state, action) => {
    return {
      ...state,
      loadingMap: { ...state.loadingMap, [action.buttonName!]: false },
      isSpinnerLoading: false,
    };
  }),
  on(startLoadingCouponAction, (state) => {
    return { ...state, isCouponLoading: true };
  }),
  on(stopLoadingCouponAction, (state) => {
    return { ...state, isCouponLoading: false };
  }),
  on(stopLoadingOrderAction, (state) => {
    return { ...state, isOrderLoading: false };
  }),
  on(startLoadingOrderAction, (state) => {
    return { ...state, isOrderLoading: true };
  }),
  on(cartStatusAction, (state, action) => {
    return {
      ...state,
      cartStatus: {
        mainPageLoading: action.mainPageLoading,
        sideCartLoading: action.sideCartLoading,
        error: action.error,
      },
    };
  })
);

