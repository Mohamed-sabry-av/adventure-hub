import { createAction, props } from '@ngrx/store';

export const fetchUserCartAction = createAction(
  '[Cart] Fetch User Cart',
  props<{ isLoggedIn: boolean }>()
);

export const getUserCartAction = createAction(
  '[Cart] Get User Cart',
  props<{ userCart: any }>()
);

export const addProductToUserCartAction = createAction(
  '[Cart] Add Product To User Cart',
  props<{ product: any; isLoggedIn: boolean }>()
);

export const updateProductOfUserCartAction = createAction(
  '[Cart] Update Product Quantity To User Cart',
  props<{ product: any; productQuantity: number; isLoggedIn: boolean }>()
);

export const deleteProductOfUserCarAction = createAction(
  '[Cart] Delete Product From User Cart ',
  props<{ product: any; isLoggedIn: boolean }>()
);

// // --------------------------------------------

// export const fetchPaymentDataAction = createAction(
//   '[Payment] Fetch Payment Deatils',
//   props<{ customerInfo: DeliveryDetails; paymentMethod: string }>()
// );

// export const getPaymentDataAction = createAction(
//   '[Payment] Get Payment Details',
//   props<{ paymentData: PaymentDetails }>()
// );
