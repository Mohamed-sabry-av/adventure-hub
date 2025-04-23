import { createReducer, on } from '@ngrx/store';
import {
  dialogFailureAction,
  startLoadingAction,
  stopLoadingAction,
  startLoadingCouponAction,
  stopLoadingCouponAction,
  stopLoadingOrderAction,
  startLoadingOrderAction,
  stopLoadingCartAction,
  startLoadingCartAction,
  cartErrorAction,
  cartStatusAction,
} from '../actions/ui.action';
import { CartStatus } from '../../features/cart/model/cart.model';

export interface State {
  isLoading: boolean;
  dialogError: string;
  isCouponLoading: boolean;
  isOrderLoading: boolean;
  cartStatus: CartStatus;
}

const initialState: State = {
  isLoading: false,
  dialogError: '',
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

  on(startLoadingAction, (state, action) => {
    return { ...state, isLoading: true };
  }),

  on(stopLoadingAction, (state, action) => {
    return { ...state, isLoading: false };
  }),

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
  }),
  on(dialogFailureAction, (state, action) => {
    // console.log(action.error);
    return { ...state, error: action.error };
  })
);
