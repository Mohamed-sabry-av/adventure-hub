import { createAction, props } from '@ngrx/store';

export const startLoadingAction = createAction('[UI] Start Loading');
export const stopLoadingAction = createAction('[UI] Stop Loading');

// -----------------------------------------------------------------------------

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

export const startLoadingCartAction = createAction(
  '[Cart] Start Loading',
  props<{ mainPageLoading: boolean; sideCartLoading: boolean }>()
);
export const stopLoadingCartAction = createAction(
  '[Cart] Stop Loading',
  props<{ mainPageLoading: boolean; sideCartLoading: boolean }>()
);
export const cartErrorAction = createAction(
  '[Cart] Error',
  props<{
    error: string | any;
  }>()
);

// ------------------------------------------------ Done

export const cartStatusAction = createAction(
  '[Cart Status] Status Mode',
  props<{
    mainPageLoading: boolean;
    sideCartLoading: boolean;
    error?: string | null;
  }>()
);
export const dialogFailureAction = createAction(
  '[ERROR] Error Occurred',
  props<{ error: string }>()
);
