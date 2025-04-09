import { Component } from '@angular/core';
import { OrderMetaDataComponent } from '../../components/order-meta-data/order-meta-data.component';
import { OrderMainDataComponent } from '../../components/order-main-data/order-main-data.component';
import { AppContainerComponent } from '../../../../shared/components/app-container/app-container.component';
import { ServiceHighlightsComponent } from '../../../../shared/components/service-highlights/service-highlights.component';

@Component({
  selector: 'app-order-page',
  imports: [
    OrderMetaDataComponent,
    OrderMainDataComponent,
    AppContainerComponent,
    ServiceHighlightsComponent,
  ],
  templateUrl: './order-page.component.html',
  styleUrl: './order-page.component.css',
})
export class OrderPageComponent {}
