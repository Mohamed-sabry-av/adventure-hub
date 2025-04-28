import { createAction, props } from '@ngrx/store';

export const startLoadingCouponAction = createAction('[Coupon] Start Loading');
export const stopLoadingCouponAction = createAction('[Coupon] Stop Loading');

// -----------------------------------------------------------------------------

export const startLoadingOrderAction = createAction('[Order] Start Loading');
export const stopLoadingOrderAction = createAction('[Order] Stop Loading');
export const orderErrorAction = createAction(
  '[Order] Error',
  props<{ error: string | any }>()
);

// -----------------------------------------------------------------------------

// ------------------------------------------------ Done

export const cartStatusAction = createAction(
  '[Cart Status] Status Mode',
  props<{
    mainPageLoading: boolean;
    sideCartLoading: boolean;
    error?: string | null;
  }>()
);
