import { Component, inject } from '@angular/core';
import { CheckoutFormComponent } from '../../component/checkout-form/checkout-form.component';
import { CheckoutSummaryComponent } from '../../component/checkout-summary/checkout-summary.component';
import { CartService } from '../../../cart/service/cart.service';
import { Observable } from 'rxjs';
import { RouterLink } from '@angular/router';
import { AsyncPipe } from '@angular/common';
import { CheckoutService } from '../../services/checkout.service';

@Component({
  selector: 'app-checkout-page',
  imports: [
    CheckoutFormComponent,
    CheckoutSummaryComponent,
    RouterLink,
    AsyncPipe,
  ],
  templateUrl: './checkout-page.component.html',
  styleUrl: './checkout-page.component.css',
  host: { ngSkipHydration: '' },
})
export class CheckoutPageComponent {
  private cartService = inject(CartService);
  private checkoutService = inject(CheckoutService);

  loadedCart$: Observable<any> = this.cartService.savedUserCart$;
  productsOutOfStock$: Observable<any> = this.checkoutService.productsOutStock$;

  ngOnInit() {
    this.cartService.fetchUserCart();
  }
}
