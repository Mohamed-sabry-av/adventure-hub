import {
  trigger,
  state,
  style,
  transition,
  animate,
} from '@angular/animations';
import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-cart-checkout',
  imports: [RouterLink],
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
  isTextareaVisible = false;

  toggleTextarea() {
    this.isTextareaVisible = !this.isTextareaVisible;
  }
}
