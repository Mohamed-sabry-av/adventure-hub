import { inject, Injectable } from '@angular/core';
import { Store } from '@ngrx/store';
import { Observable } from 'rxjs';
import { orderDetailsSelector } from '../../../Store/selectors/checkout.selector';
import { fetchOrderDataAction } from '../../../Store/actions/checkout.action';
import { environment } from '../../../../environments/environment';
import { HttpClient } from '@angular/common/http';

@Injectable({ providedIn: 'root' })
export class OrderService {
  private store = inject(Store);
  private http = inject(HttpClient);

  loadedOrder$: Observable<any> = this.store.select(orderDetailsSelector);

  fetchOrderData(order: string) {
    this.store.dispatch(fetchOrderDataAction({ orderId: order }));
  }

  createOrder(orderData: any): Observable<any> {
    return this.http.post(`${environment.apiUrl}/orders`, orderData);
  }
}
