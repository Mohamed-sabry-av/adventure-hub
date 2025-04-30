import { Component, DestroyRef, inject, Input, OnInit } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { Observable } from 'rxjs';

import { OrderConfirmationHeaderComponent } from '../components/order-confirmation-header/order-confirmation-header.component';
import { OrderConfirmationDetailsComponent } from '../components/order-confirmation-details/order-confirmation-details.component';
import { OrderConfirmationAddressesComponent } from '../components/order-confirmation-addresses/order-confirmation-addresses.component';
import { ServiceHighlightsComponent } from '../../../shared/components/service-highlights/service-highlights.component';
import { DialogErrorComponent } from '../../../shared/components/dialog-error/dialog-error.component';
import { AppContainerComponent } from '../../../shared/components/app-container/app-container.component';
import { UIService } from '../../../shared/services/ui.service';
import { OrderConfirmationService } from '../services/order-confirmation.service';

@Component({
  selector: 'app-order-confirmation-page',
  standalone: true,
  imports: [
    AsyncPipe,
    OrderConfirmationHeaderComponent,
    OrderConfirmationDetailsComponent,
    OrderConfirmationAddressesComponent,
    AppContainerComponent,
    ServiceHighlightsComponent,
    DialogErrorComponent
  ],
  templateUrl: './order-confirmation-page.component.html',
  styleUrl: './order-confirmation-page.component.css',
})
export class OrderConfirmationPageComponent implements OnInit {
  private orderConfirmationService = inject(OrderConfirmationService);
  private uiService = inject(UIService);
  private destroyRef = inject(DestroyRef);

  @Input({ required: true }) orderId!: string;

  isLoading$: Observable<boolean> = this.uiService.isOrderLoading$;
  isError$: Observable<any> = this.uiService.errorState$;

  ngOnInit() {
    const subscription = this.orderConfirmationService.confirmedOrder$.subscribe(
      (order: any) => {
        if (order === null) {
          this.orderConfirmationService.fetchOrderConfirmation(this.orderId);
        }
      }
    );

    this.destroyRef.onDestroy(() => subscription.unsubscribe());
  }
}
