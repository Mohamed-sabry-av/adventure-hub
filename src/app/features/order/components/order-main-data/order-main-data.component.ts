import {
  ChangeDetectionStrategy,
  Component,
  inject,
  Input,
} from '@angular/core';
import { OrderService } from '../../services/order.service';
import { Observable } from 'rxjs';
import { AsyncPipe, CurrencyPipe } from '@angular/common';
@Component({
  selector: 'app-order-main-data',
  imports: [AsyncPipe, CurrencyPipe],
  templateUrl: './order-main-data.component.html',
  styleUrl: './order-main-data.component.css',
})
export class OrderMainDataComponent {
  private orderService = inject(OrderService);
  loadedOrder$: Observable<any> = this.orderService.loadedOrder$;
}

