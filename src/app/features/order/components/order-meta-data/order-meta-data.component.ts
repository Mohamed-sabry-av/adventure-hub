import { Component, inject, Input } from '@angular/core';
import { OrderService } from '../../services/order.service';
import { Observable } from 'rxjs';
import { AsyncPipe, CurrencyPipe, DatePipe } from '@angular/common';

@Component({
  selector: 'app-order-meta-data',
  imports: [DatePipe, AsyncPipe, CurrencyPipe],
  templateUrl: './order-meta-data.component.html',
  styleUrl: './order-meta-data.component.css',
})
export class OrderMetaDataComponent {
  private orderService = inject(OrderService);

  loadedOrder$: Observable<any> = this.orderService.loadedOrder$;
}
