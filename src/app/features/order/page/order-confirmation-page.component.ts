import { Component, DestroyRef, inject, Input, OnInit } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { Observable, BehaviorSubject } from 'rxjs';

import { OrderConfirmationHeaderComponent } from '../components/order-confirmation-header/order-confirmation-header.component';
import { OrderConfirmationDetailsComponent } from '../components/order-confirmation-details/order-confirmation-details.component';
import { OrderConfirmationAddressesComponent } from '../components/order-confirmation-addresses/order-confirmation-addresses.component';
import { ServiceHighlightsComponent } from '../../../shared/components/service-highlights/service-highlights.component';
import { DialogErrorComponent } from '../../../shared/components/dialog-error/dialog-error.component';
import { AppContainerComponent } from '../../../shared/components/app-container/app-container.component';
import { OrderConfirmationSkeletonComponent } from '../components/order-confirmation-skeleton/order-confirmation-skeleton.component';
import { UIService } from '../../../shared/services/ui.service';
import { OrderConfirmationService } from '../services/order-confirmation.service';
import { CheckoutProgressMapComponent } from '../../shared/components/checkout-progress-map/checkout-progress-map.component';

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
    DialogErrorComponent,
    OrderConfirmationSkeletonComponent,
    CheckoutProgressMapComponent
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
  dataLoaded$ = new BehaviorSubject<boolean>(false);

  ngOnInit() {
    const subscription = this.orderConfirmationService.confirmedOrder$.subscribe(
      (order: any) => {
        if (order === null) {
          this.dataLoaded$.next(false);
          this.orderConfirmationService.fetchOrderConfirmation(this.orderId);
        } else {
          // إضافة تأخير قصير لإظهار skeleton حتى عند تحميل البيانات بسرعة
          setTimeout(() => {
            this.dataLoaded$.next(true);
          }, 500);
        }
      }
    );

    this.destroyRef.onDestroy(() => subscription.unsubscribe());
  }
}
