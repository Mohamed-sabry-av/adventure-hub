import { createAction, props } from '@ngrx/store';

export const fetchCouponsAction = createAction(
  '[Coupon] Fetch Coupons',
  props<{ enteredCouponValue: any; isLoggedIn: boolean }>()
);

export const getCouponAction = createAction(
  '[Coupon] Get Coupon',
  props<{ validCoupon: any; isLoggedIn: boolean; invalidCoupon?: any }>()
);

export const applyCouponAction = createAction(
  '[Coupon] Apply Coupon',
  props<{ coupon: any; isLoggedIn: boolean }>()
);

export const removeCouponAction = createAction('[Coupon] Remove Coupon');

export const createOrderAction = createAction(
  '[Checkout] Create Order',
  props<{ orderDetails: any }>()
);
