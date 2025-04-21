import { createAction, props } from '@ngrx/store';

export const startLoadingAction = createAction('[UI] Start Loading');
export const stopLoadingAction = createAction('[UI] Stop Loading');

export const uiFailureAction = createAction(
  '[ERROR] Error Occurred',
  props<{ error: boolean }>()
);

// -----------------------------------------------------------------------------

export const startLoadingCouponAction = createAction('[Coupon] Start Loading');
export const stopLoadingCouponAction = createAction('[Coupon] Stop Loading');

// -----------------------------------------------------------------------------

export const startLoadingOrderAction = createAction('[Order] Start Loading');
export const stopLoadingOrderAction = createAction('[Order] Stop Loading');
