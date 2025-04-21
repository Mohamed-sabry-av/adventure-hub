import { createReducer, on } from '@ngrx/store';
import {
  uiFailureAction,
  startLoadingAction,
  stopLoadingAction,
  startLoadingCouponAction,
  stopLoadingCouponAction,
  stopLoadingOrderAction,
  startLoadingOrderAction,
} from '../actions/ui.action';

export interface State {
  isLoading: boolean;
  error: boolean;
  isCouponLoading: boolean;
  isOrderLoading: boolean;
}

const initialState: State = {
  isLoading: true,
  error: false,
  isCouponLoading: false,
  isOrderLoading: false,
};

export const uiReducer = createReducer(
  initialState,

  on(startLoadingAction, (state, action) => {
    return { ...state, isLoading: true };
  }),

  on(stopLoadingAction, (state, action) => {
    return { ...state, isLoading: false };
  }),

  on(uiFailureAction, (state, action) => {
    return { ...state, error: action.error };
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
  })
);
