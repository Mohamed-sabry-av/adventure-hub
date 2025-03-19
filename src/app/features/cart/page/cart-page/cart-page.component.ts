import { Component } from '@angular/core';
import { AppContainerComponent } from '../../../../shared/components/app-container/app-container.component';
import { CartProductsComponent } from '../../components/cart-products/cart-products.component';
import { CartCheckoutComponent } from '../../components/cart-checkout/cart-checkout.component';

@Component({
  selector: 'app-cart-page',
  imports: [
    AppContainerComponent,
    CartProductsComponent,
    CartCheckoutComponent,
  ],
  templateUrl: './cart-page.component.html',
  styleUrl: './cart-page.component.css',
})
export class CartPageComponent {}
