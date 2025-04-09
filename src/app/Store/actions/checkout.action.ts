import { createAction, props } from '@ngrx/store';

export const createOrderAction = createAction(
  '[Checkout] Create Order',
  props<{ orderDetails: any }>()
);
