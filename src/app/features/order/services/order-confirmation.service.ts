import { inject, Injectable } from '@angular/core';
import { Store } from '@ngrx/store';
import { Observable } from 'rxjs';
import { orderDetailsSelector } from '../../../Store/selectors/checkout.selector';
import { fetchOrderDataAction } from '../../../Store/actions/checkout.action';
@Injectable({ providedIn: 'root' })
export class OrderConfirmationService {
  private store = inject(Store);
  // Observable to get the order data from the store
  confirmedOrder$: Observable<any> = this.store.select(orderDetailsSelector);
  // Method to fetch order data using the order ID
  fetchOrderConfirmation(orderId: string) {
    this.store.dispatch(fetchOrderDataAction({ orderId }));
  }
}

