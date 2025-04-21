import { inject, Injectable } from '@angular/core';
import { Store } from '@ngrx/store';
import {
  errorOfUiSelector,
  spinnerOfCouponSelector,
  spinnerOfOrderSelector,
  spinnerOfUiSelector,
} from '../../Store/selectors/ui.selector';
import { BehaviorSubject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class UIService {
  private store = inject(Store);

  isLoading$ = this.store.select(spinnerOfUiSelector);
  uiFailure$ = this.store.select(errorOfUiSelector);
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

  // ------------------------------------------------------
  isCouponLoading$ = this.store.select(spinnerOfCouponSelector);
  // ------------------------------------------------------

  isOrderLoading$ = this.store.select(spinnerOfOrderSelector);
}
