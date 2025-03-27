import { createAction, props } from '@ngrx/store';
// import { Product } from '../../Shared/models/product.model';
// import {
//   DeliveryDetails,
//   PaymentDetails,
// } from '../../Features/placeorders/models/payment.model';

export const fetchCartFromLSAction = createAction(
  '[CartLS] Fetch Cart From LocalStorage'
);

export const getCartFromLSAction = createAction(
  '[CartLS] Get Cart From LocalStorage',
  props<{ cart: any }>()
);

export const addProductToLSCartAction = createAction(
  '[CartLS] Add Product To Cart LocalStorage',
  props<{ product: any }>()
);

export const updateCountOfProductInCartLSAction = createAction(
  '[CartLS] Update Count Of Product In Cart LocalStorage',
  props<{ count: number; selectedProduct: any }>()
);

export const deleteProductInCartLSAction = createAction(
  '[CartLS] Delete Product From Cart LocalStorage',
  props<{ selectedProduct: any }>()
);

// --------------------------------------------------------------

// export const initUserCartAction = createAction(
//   '[Cart] Add Products From LocalStorage To User Cart'
// );

// export const addProductToUserCartAction = createAction(
//   '[Cart] Add Product To User Cart',
//   props<{ product: Product }>()
// );

// export const updateProductOfUserCartAction = createAction(
//   '[Cart] Update Product Count To User Cart',
//   props<{ product: Product; productCount: number }>()
// );

// export const deleteProductOfUserCartAction = createAction(
//   '[Cart] delete Product Of User Cart',
//   props<{ product: Product }>()
// );

export const fetchUserCartAction = createAction('[Cart] Fetch User Cart');

export const getUserCartAction = createAction(
  '[Cart] Get User Cart',
  props<{ userCart: any }>()
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
