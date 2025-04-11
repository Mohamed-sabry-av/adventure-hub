import { Component } from '@angular/core';
import { CheckoutFormComponent } from '../../component/checkout-form/checkout-form.component';
import { CheckoutSummaryComponent } from '../../component/checkout-summary/checkout-summary.component';

@Component({
  selector: 'app-checkout-page',
  imports: [CheckoutFormComponent, CheckoutSummaryComponent],
  templateUrl: './checkout-page.component.html',
  styleUrl: './checkout-page.component.css',
  host: { ngSkipHydration: '' },
})
export class CheckoutPageComponent {}
