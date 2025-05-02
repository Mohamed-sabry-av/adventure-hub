import {
  trigger,
  state,
  style,
  transition,
  animate,
} from '@angular/animations';
import { AsyncPipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Observable } from 'rxjs';
import { CartService } from '../../service/cart.service';
import { CurrencySvgPipe } from '../../../../shared/pipes/currency.pipe';

@Component({
  selector: 'app-cart-checkout',
  imports: [RouterLink, AsyncPipe, CurrencySvgPipe],
  templateUrl: './cart-checkout.component.html',
  styleUrl: './cart-checkout.component.css',

  animations: [
    trigger('toggleTextarea', [
      state(
        'hidden',
        style({
          height: '0px',
          opacity: 0,
          overflow: 'hidden',
          padding: '0px',
        })
      ),
      state(
        'visible',
        style({
          height: '96px',
          opacity: 1,
          padding: '8px',
        })
      ),
      transition('hidden <=> visible', animate('0.3s ease-in-out')),
    ]),
  ],
})
export class CartCheckoutComponent {
  private cartService = inject(CartService);

  loadedCart$: Observable<any> = this.cartService.savedUserCart$;

  isTextareaVisible = false;

  toggleTextarea() {
    this.isTextareaVisible = !this.isTextareaVisible;
  }
}
