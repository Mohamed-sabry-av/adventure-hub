import { inject, Injectable } from '@angular/core';
import { Store } from '@ngrx/store';
import {
  cartStatusSelector,
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

  showError(message: string) {
    this.errorState.next({ isVisible: true, message });
    setTimeout(() => {
      this.hideError();
    }, 5000);
  }

  hideError() {
    this.errorState.next({ isVisible: false, message: '' });
  }

  // --------------------------------------------------------------
  isSpinnerLoading$: Observable<boolean> =
    this.store.select(spinnerOfUiSelector);
  // ------------------------------------------------------
  isCouponLoading$ = this.store.select(spinnerOfCouponSelector);

  // ------------------------------------------------------
  isOrderLoading$ = this.store.select(spinnerOfOrderSelector);

  // ------------------------------------------------------ Done

  cartStatus$: Observable<CartStatus> = this.store.select(cartStatusSelector);
}
