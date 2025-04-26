import { createAction, props } from '@ngrx/store';

export const fetchCouponsAction = createAction(
  '[Coupon] Fetch Coupons',
  props<{
    enteredCouponValue: any;
    isLoggedIn: boolean;
  }>()
);

export const getCouponAction = createAction(
  '[Coupon] Get Coupon Value',
  props<{
    validCoupon: any;
    isLoggedIn: boolean;
    invalidCoupon: any;
  }>()
);

export const getCouponStatusAction = createAction(
  '[Coupon] Get Coupon Staus',
  props<{ errorMsg: any; successMsg: any }>()
);

export const getCouponDataAction = createAction(
  '[Coupon] Get Coupon Used By List',
  props<{ coupon: any }>()
);

export const removeCouponAction = createAction(
  '[Coupon] Remove Coupon',
  props<{
    validCoupon: string;
    isLoggedIn: boolean;
  }>()
);

export const createOrderAction = createAction(
  '[Checkout] Create Order',
  props<{ orderDetails: any }>()
);

export const fetchOrderDataAction = createAction(
  '[Checkout] Fetch Order Data',
  props<{ orderId: string }>()
);

export const getOrderDataAction = createAction(
  '[Checkout] Get Order Data',
  props<{ orderDetails: any }>()
);
