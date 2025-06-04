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
import { ToastService } from '../../core/services/toast.service';

@Injectable({ providedIn: 'root' })
export class UIService {
  private store = inject(Store);
  private toastService = inject(ToastService);

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

  /**
   * Show error message
   * @param message Error message to display
   */
  showError(message: string) {
    this.toastService.error(message);
  }

  /**
   * Show success message
   * @param message Success message to display
   */
  showSuccess(message: string) {
    this.toastService.success(message);
  }

  /**
   * Show warning message
   * @param message Warning message to display
   */
  showWarning(message: string) {
    this.toastService.warning(message);
  }

  /**
   * Show info message
   * @param message Info message to display
   */
  showInfo(message: string) {
    this.toastService.info(message);
  }

  // --------------------------------------------------------------
  // UI State Observables - NGRX Selectors
  // --------------------------------------------------------------
  
  // Cart status
  cartStatus$: Observable<CartStatus> = this.store.select(cartStatusSelector);
  
  // Loading indicators
  isSpinnerLoading$: Observable<boolean> = this.store.select(spinnerOfUiSelector);
  isCouponLoading$: Observable<boolean> = this.store.select(spinnerOfCouponSelector);
  isOrderLoading$: Observable<boolean> = this.store.select(spinnerOfOrderSelector);
  loadingMap$: Observable<{ [key: string]: boolean }> = this.store.select(loadingMapSelector);
  
  // Spinner manual control
  private spinnerLoadingState = new BehaviorSubject<boolean>(false);
  spinnerLoading$ = this.spinnerLoadingState.asObservable();

  setSpinnerLoading(isLoading: boolean) {
    this.spinnerLoadingState.next(isLoading);
  }
}
