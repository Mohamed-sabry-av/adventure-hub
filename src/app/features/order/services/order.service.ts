import { inject, Injectable } from '@angular/core';
import { Store } from '@ngrx/store';
import { Observable } from 'rxjs';
import { orderDetailsSelector } from '../../../Store/selectors/checkout.selector';
import { fetchOrderDataAction } from '../../../Store/actions/checkout.action';

@Injectable({ providedIn: 'root' })
export class OrderService {
  private store = inject(Store);

  loadedOrder$: Observable<any> = this.store.select(orderDetailsSelector);

  fetchOrderData(order: string) {
    this.store.dispatch(fetchOrderDataAction({ orderId: order }));
  }
}
