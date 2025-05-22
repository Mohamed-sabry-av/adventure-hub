import { inject, Injectable } from '@angular/core';
import { Store } from '@ngrx/store';
import {
  cartStatusSelector,
  loadingMapSelector,
  spinnerOfCouponSelector,
  spinnerOfOrderSelector,
  spinnerOfUiSelector,
} from '../../Store/selectors/ui.selector';
import { BehaviorSubject, Observable } from 'rxjs';
import { CartStatus } from '../../features/cart/model/cart.model';

@Injectable({ providedIn: 'root' })
export class UIService {
  private store = inject(Store);

  private errorState = new BehaviorSubject<{
    isVisible: boolean;
    message: string;
  }>({ isVisible: false, message: '' });
  errorState$ = this.errorState.asObservable();

  private successState = new BehaviorSubject<{
    isVisible: boolean;
    message: string;
  }>({ isVisible: false, message: '' });
  successState$ = this.successState.asObservable();

  private infoState = new BehaviorSubject<{
    isVisible: boolean;
    message: string;
  }>({ isVisible: false, message: '' });
  infoState$ = this.infoState.asObservable();

  private warningState = new BehaviorSubject<{
    isVisible: boolean;
    message: string;
  }>({ isVisible: false, message: '' });
  warningState$ = this.warningState.asObservable();

  // Active quick add panel tracking
  private activeQuickAddProductId = new BehaviorSubject<number | null>(null);
  activeQuickAddProductId$ = this.activeQuickAddProductId.asObservable();

  /**
   * Set the currently active quick add product panel
   * @param productId ID of the product whose quick add panel is open
   */
  setActiveQuickAddProduct(productId: number | null) {
    this.activeQuickAddProductId.next(productId);
  }
  
  /**
   * Check if a product's quick add panel is the active one
   * @param productId ID of the product to check
   * @returns boolean indicating if this product has the active quick add panel
   */
  isActiveQuickAddProduct(productId: number): boolean {
    return this.activeQuickAddProductId.value === productId;
  }

  showError(message: string) {
    this.errorState.next({ isVisible: true, message });
    setTimeout(() => {
      this.hideError();
    }, 5000);
  }

  hideError() {
    this.errorState.next({ isVisible: false, message: '' });
  }

  showSuccess(message: string) {
    this.successState.next({ isVisible: true, message });
    setTimeout(() => {
      this.hideSuccess();
    }, 3000);
  }

  hideSuccess() {
    this.successState.next({ isVisible: false, message: '' });
  }

  showWarning(message: string) {
    this.warningState.next({ isVisible: true, message });
    setTimeout(() => {
      this.hideWarning();
    }, 4000);
  }

  hideWarning() {
    this.warningState.next({ isVisible: false, message: '' });
  }

  showInfo(message: string) {
    this.infoState.next({ isVisible: true, message });
    setTimeout(() => {
      this.hideInfo();
    }, 4000);
  }

  hideInfo() {
    this.infoState.next({ isVisible: false, message: '' });
  }

  // --------------------------------------------------------------
  isSpinnerLoading$: Observable<boolean> =
    this.store.select(spinnerOfUiSelector);

  // Add spinner control
  private spinnerLoadingState = new BehaviorSubject<boolean>(false);
  spinnerLoading$ = this.spinnerLoadingState.asObservable();

  setSpinnerLoading(isLoading: boolean) {
    this.spinnerLoadingState.next(isLoading);
  }

  loadingMap$: Observable<{ [key: string]: boolean }> =
    this.store.select(loadingMapSelector);
  // ------------------------------------------------------
  isCouponLoading$ = this.store.select(spinnerOfCouponSelector);

  // ------------------------------------------------------
  isOrderLoading$ = this.store.select(spinnerOfOrderSelector);

  // ------------------------------------------------------ Done

  cartStatus$: Observable<CartStatus> = this.store.select(cartStatusSelector);
}
