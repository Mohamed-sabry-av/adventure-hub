import { Component, inject } from '@angular/core';
import { AsyncPipe, CurrencyPipe, DatePipe } from '@angular/common';
import { Observable } from 'rxjs';
import { OrderConfirmationService } from '../../services/order-confirmation.service';

@Component({
  selector: 'app-order-confirmation-header',
  standalone: true,
  imports: [AsyncPipe, DatePipe, CurrencyPipe],
  templateUrl: './order-confirmation-header.component.html',
  styleUrl: './order-confirmation-header.component.css'
})
export class OrderConfirmationHeaderComponent {
  private orderConfirmationService = inject(OrderConfirmationService);

  // Observable to get the confirmed order data
  confirmedOrder$: Observable<any> = this.orderConfirmationService.confirmedOrder$;
}
