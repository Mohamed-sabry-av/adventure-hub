import { createAction, props } from '@ngrx/store';

export const fetchUserCartAction = createAction(
  '[Cart] Fetch User Cart',
  props<{
    isLoggedIn: boolean;
    mainPageLoading: boolean;
    sideCartLoading: boolean;
    buyItNow?: boolean;
    openSideCart?: boolean;
  }>()
);

export const getUserCartAction = createAction(
  '[Cart] Get User Cart',
  props<{ userCart: any }>()
);

export const addProductToUserCartAction = createAction(
  '[Cart] Add Product To User Cart',
  props<{ product: any; isLoggedIn: boolean; buyItNow?: boolean }>()
);

export const updateProductOfUserCartAction = createAction(
  '[Cart] Update Product Quantity To User Cart',
  props<{ product: any; productQuantity: number; isLoggedIn: boolean }>()
);

export const deleteProductOfUserCarAction = createAction(
  '[Cart] Delete Product From User Cart ',
  props<{ product: any; isLoggedIn: boolean }>()
);

export const updateCartStockStatusAction = createAction(
  '[Cart] Update Products Stock In Cart',
  props<{ productIds: string[]; coupon: any }>()
);

export const syncCartAction = createAction(
  '[Cart] Add Multiple Products To User Cart',
  props<{ authToken: string; items: any[] }>()
);
