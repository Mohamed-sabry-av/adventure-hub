import { Component, inject } from '@angular/core';
import { AppContainerComponent } from '../../../../shared/components/app-container/app-container.component';
import { CartProductsComponent } from '../../components/cart-products/cart-products.component';
import { CartCheckoutComponent } from '../../components/cart-checkout/cart-checkout.component';
import { CartService } from '../../service/cart.service';
import { ServiceHighlightsComponent } from '../../../../shared/components/service-highlights/service-highlights.component';
import { Observable } from 'rxjs';
import { AsyncPipe } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-cart-page',
  imports: [
    AppContainerComponent,
    CartProductsComponent,
    CartCheckoutComponent,
    ServiceHighlightsComponent,
    AsyncPipe,
    RouterLink,
  ],
  templateUrl: './cart-page.component.html',
  styleUrl: './cart-page.component.css',
})
export class CartPageComponent {
  private cartService = inject(CartService);
  loadedCart$: Observable<any> = this.cartService.savedUserCart$;

  ngOnInit() {
    // this.cartService.fetchCartFromLS();
    this.cartService.fetchUserCart();
  }
}
