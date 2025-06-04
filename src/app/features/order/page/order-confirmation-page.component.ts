import { Component, DestroyRef, inject, Input, OnInit, PLATFORM_ID } from '@angular/core';
import { AsyncPipe, isPlatformBrowser } from '@angular/common';
import { Observable, BehaviorSubject } from 'rxjs';

import { OrderConfirmationHeaderComponent } from '../components/order-confirmation-header/order-confirmation-header.component';
import { OrderConfirmationDetailsComponent } from '../components/order-confirmation-details/order-confirmation-details.component';
import { OrderConfirmationAddressesComponent } from '../components/order-confirmation-addresses/order-confirmation-addresses.component';
import { ServiceHighlightsComponent } from '../../../shared/components/service-highlights/service-highlights.component';
import { AppContainerComponent } from '../../../shared/components/app-container/app-container.component';
import { OrderConfirmationSkeletonComponent } from '../components/order-confirmation-skeleton/order-confirmation-skeleton.component';
import { UIService } from '../../../shared/services/ui.service';
import { OrderConfirmationService } from '../services/order-confirmation.service';
import { CheckoutProgressMapComponent } from '../../shared/components/checkout-progress-map/checkout-progress-map.component';
import { KlaviyoTrackingService } from '../../../shared/services/klaviyo-tracking.service';

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
  private klaviyoTracking = inject(KlaviyoTrackingService);
  private platformId = inject(PLATFORM_ID);

  @Input({ required: true }) orderId!: string;

  isLoading$: Observable<boolean> = this.uiService.isOrderLoading$;
  isError$ = new BehaviorSubject<boolean>(false);
  dataLoaded$ = new BehaviorSubject<boolean>(false);
  private orderTracked = false;

  ngOnInit() {
    const subscription = this.orderConfirmationService.confirmedOrder$.subscribe(
      (order: any) => {
        if (order === null) {
          this.dataLoaded$.next(false);
          this.orderConfirmationService.fetchOrderConfirmation(this.orderId);
        } else {
          // Track order in Klaviyo if not already tracked
          if (isPlatformBrowser(this.platformId) && !this.orderTracked && order?.id) {
            this.klaviyoTracking.trackOrderCompleted(order);
            this.orderTracked = true;
          }
          
          // Add a short delay to show skeleton even when data loads quickly
          setTimeout(() => {
            this.dataLoaded$.next(true);
          }, 500);
        }
      }
    );

    this.destroyRef.onDestroy(() => subscription.unsubscribe());
  }
}
