import { Component, DestroyRef, inject, Input } from '@angular/core';
import { OrderMetaDataComponent } from '../../components/order-meta-data/order-meta-data.component';
import { OrderMainDataComponent } from '../../components/order-main-data/order-main-data.component';
import { AppContainerComponent } from '../../../../shared/components/app-container/app-container.component';
import { ServiceHighlightsComponent } from '../../../../shared/components/service-highlights/service-highlights.component';
import { OrderService } from '../../services/order.service';
import { Observable } from 'rxjs';
import { AsyncPipe } from '@angular/common';
import { UIService } from '../../../../shared/services/ui.service';
import { HandleErrorsService } from '../../../../core/services/handel-errors.service';
import { DialogErrorComponent } from '../../../../shared/components/dialog-error/dialog-error.component';

@Component({
  selector: 'app-order-page',
  imports: [
    OrderMetaDataComponent,
    OrderMainDataComponent,
    AppContainerComponent,
    ServiceHighlightsComponent,
    AsyncPipe,
    DialogErrorComponent,
  ],
  templateUrl: './order-page.component.html',
  styleUrl: './order-page.component.css',
})
export class OrderPageComponent {
  private orderService = inject(OrderService);
  private uiService = inject(UIService);
  private destroyRef = inject(DestroyRef);
  private handleErrorService = inject(HandleErrorsService);

  @Input({ required: true }) orderId!: string;
  isOrderLoading$: Observable<any> = this.uiService.isOrderLoading$;

  ngOnInit() {
    const subscription = this.orderService.loadedOrder$.subscribe(
      (res: any) => {
        if (res === null) {
          this.orderService.fetchOrderData(this.orderId);
        }
      }
    );

    this.destroyRef.onDestroy(() => subscription.unsubscribe());
  }

  isError$: Observable<any> = this.uiService.isLoading$;
}
