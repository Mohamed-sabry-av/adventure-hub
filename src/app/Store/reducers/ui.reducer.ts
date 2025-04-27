import { createReducer, on } from '@ngrx/store';
import {
  startLoadingCouponAction,
  stopLoadingCouponAction,
  stopLoadingOrderAction,
  startLoadingOrderAction,
  cartStatusAction,
} from '../actions/ui.action';
import { CartStatus } from '../../features/cart/model/cart.model';

export interface State {
  isCouponLoading: boolean;
  isOrderLoading: boolean;
  cartStatus: CartStatus;
}

const initialState: State = {
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

  // -------------------------------------------------
  on(startLoadingCouponAction, (state) => {
    return { ...state, isCouponLoading: true };
  }),
  on(stopLoadingCouponAction, (state) => {
    return { ...state, isCouponLoading: false };
  }),

  // -------------------------------------------------

  on(stopLoadingOrderAction, (state) => {
    return { ...state, isOrderLoading: false };
  }),
  on(startLoadingOrderAction, (state) => {
    return { ...state, isOrderLoading: true };
  }),

  // ------------------------------------------------ Done
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
