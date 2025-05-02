import { Component, inject } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { Observable } from 'rxjs';
import { OrderConfirmationService } from '../../services/order-confirmation.service';

@Component({
  selector: 'app-order-confirmation-addresses',
  standalone: true,
  imports: [AsyncPipe],
  templateUrl: './order-confirmation-addresses.component.html',
  styleUrl: './order-confirmation-addresses.component.css'
})
export class OrderConfirmationAddressesComponent {
  private orderConfirmationService = inject(OrderConfirmationService);

  // Observable to get the confirmed order data
  confirmedOrder$: Observable<any> = this.orderConfirmationService.confirmedOrder$;
}
