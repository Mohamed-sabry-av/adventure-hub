import { Component, inject } from '@angular/core';
import { AsyncPipe, CurrencyPipe } from '@angular/common';
import { Observable } from 'rxjs';
import { OrderConfirmationService } from '../../services/order-confirmation.service';
@Component({
  selector: 'app-order-confirmation-details',
  standalone: true,
  imports: [AsyncPipe, CurrencyPipe],
  templateUrl: './order-confirmation-details.component.html',
  styleUrl: './order-confirmation-details.component.css'
})
export class OrderConfirmationDetailsComponent {
  private orderConfirmationService = inject(OrderConfirmationService);
  // Observable to get the confirmed order data
  confirmedOrder$: Observable<any> = this.orderConfirmationService.confirmedOrder$;
}

